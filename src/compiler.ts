import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { normalizeConfig, resolveMessagesFile } from "./config";
import { extractMessagesFromContent } from "./extractor";
import { scanFiles } from "./file-scanner";
import {
  createEmptyCache,
  loadExtractionCache,
  saveExtractionCache,
  type ExtractionCacheEntry
} from "./extraction-cache";
import { translateBatch } from "./translator";
import { chunk, delay, readJsonFile, runWithConcurrency, writeJsonFile } from "./utils";
import { CompileResult, ExtractedMessage, InterceptorConfig, Logger } from "./types";

const FILE_CONCURRENCY = Math.max(2, Math.min(os.cpus().length, 8));

export async function compileOnce(
  config: InterceptorConfig,
  options: { cwd?: string; logger?: Logger; files?: string[] } = {}
): Promise<CompileResult> {
  const normalized = normalizeConfig(config, options.cwd);
  const logger = options.logger ?? console;

  const files = options.files ?? (await scanFiles(normalized));
  const { messages: extracted, cache } = await extractMessagesIncremental(
    files,
    normalized,
    logger
  );
  await saveExtractionCache(normalized, cache);
  const uniqueMessages = dedupeMessages(extracted, logger);

  if (uniqueMessages.length === 0) {
    logger.info("Interceptor: no strings found.");
    return {
      extractedCount: 0,
      updatedLocales: [],
      skippedLocales: normalized.locales
    };
  }

  const updatedLocales: string[] = [];
  const skippedLocales: string[] = [];
  const sourceLocale = normalized.defaultLocale;
  const sourceMessages = await readJsonFile(
    resolveMessagesFile(normalized, sourceLocale)
  );
  const sourceByKey = buildSourceMap(uniqueMessages, sourceMessages);
  const usedKeys = new Set(uniqueMessages.map((message) => message.key));

  const localeTasks = normalized.locales.map((locale) => async () => {
    const messagesFile = resolveMessagesFile(normalized, locale);
    const existing = await readJsonFile(messagesFile);
    const missing = uniqueMessages.filter(
      (message) => existing[message.key] === undefined
    );
    const unusedKeys = normalized.cleanup.removeUnused
      ? Object.keys(existing).filter((key) => !usedKeys.has(key))
      : [];
    const shouldPrune = unusedKeys.length > 0;

    if (missing.length === 0 && !shouldPrune) {
      return { locale, updated: false };
    }

    const updated: Record<string, string> = { ...existing };

    if (locale === sourceLocale) {
      for (const message of missing) {
        updated[message.key] = message.source;
      }
    } else {
      const missingSources = missing.map(
        (message) => sourceByKey.get(message.key) ?? message.source
      );
      const translations = await translateMissing(
        missingSources,
        normalized,
        locale,
        sourceLocale,
        logger
      );
      for (let i = 0; i < missing.length; i += 1) {
        const fallback = missingSources[i] ?? missing[i].source;
        updated[missing[i].key] = translations[i] ?? fallback;
      }
    }

    if (shouldPrune) {
      for (const key of unusedKeys) {
        delete updated[key];
      }
    }

    await writeJsonFile(messagesFile, updated);
    return { locale, updated: true };
  });

  const localeResults = await runWithConcurrency(
    localeTasks,
    normalized.batch.localeConcurrency
  );

  for (const result of localeResults) {
    if (result.updated) {
      updatedLocales.push(result.locale);
    } else {
      skippedLocales.push(result.locale);
    }
  }

  return {
    extractedCount: uniqueMessages.length,
    updatedLocales,
    skippedLocales
  };
}

async function extractMessagesIncremental(
  files: string[],
  config: ReturnType<typeof normalizeConfig>,
  logger: Logger
): Promise<{ messages: ExtractedMessage[]; cache: ReturnType<typeof createEmptyCache> }> {
  const cache = await loadExtractionCache(config);
  const nextCache = createEmptyCache(cache.key);

  const tasks = files.map((filePath) => async () => {
    const relative = path.relative(config.rootDir, filePath);
    let stat: { mtimeMs: number; size: number };
    try {
      const fsStat = await fs.stat(filePath);
      stat = { mtimeMs: fsStat.mtimeMs, size: fsStat.size };
    } catch {
      return null;
    }

    try {
      const cached = cache.files[relative];
      if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
        return { relative, entry: cached, messages: cached.messages };
      }

      const content = await fs.readFile(filePath, "utf8");
      const hash = createHash("sha1").update(content).digest("hex");
      if (cached && cached.hash === hash) {
        const entry: ExtractionCacheEntry = {
          ...cached,
          mtimeMs: stat.mtimeMs,
          size: stat.size,
          hash
        };
        return { relative, entry, messages: cached.messages };
      }

      const messages = extractMessagesFromContent(content, filePath, config);
      const entry: ExtractionCacheEntry = {
        mtimeMs: stat.mtimeMs,
        size: stat.size,
        hash,
        messages
      };
      return { relative, entry, messages };
    } catch (error) {
      logger.warn(
        `Interceptor: failed to extract ${filePath} - ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return null;
    }
  });

  const results = await runWithConcurrency(tasks, FILE_CONCURRENCY);
  const extracted: ExtractedMessage[] = [];

  for (const result of results) {
    if (!result) continue;
    nextCache.files[result.relative] = result.entry;
    extracted.push(...result.messages);
  }

  return { messages: extracted, cache: nextCache };
}

async function translateMissing(
  missing: string[],
  config: ReturnType<typeof normalizeConfig>,
  targetLocale: string,
  sourceLocale: string,
  logger: Logger
): Promise<string[]> {
  const batches = chunk(missing, config.batch.size);
  const results: string[] = [];

  for (let index = 0; index < batches.length; index += 1) {
    const batch = batches[index];
    logger.info(
      `Interceptor: translating ${batch.length} strings (${index + 1}/${batches.length}) for ${targetLocale}.`
    );

    const translated = await translateBatch(batch, config.llm, {
      sourceLocale,
      targetLocale
    });

    results.push(...translated);

    if (config.batch.delayMs > 0 && index < batches.length - 1) {
      await delay(config.batch.delayMs);
    }
  }

  return results;
}

function dedupeMessages(messages: ExtractedMessage[], logger: Logger): ExtractedMessage[] {
  const map = new Map<string, ExtractedMessage>();

  for (const message of messages) {
    if (!message.key || !message.source) continue;
    const existing = map.get(message.key);
    if (!existing) {
      map.set(message.key, message);
      continue;
    }
    if (existing.source !== message.source) {
      logger.warn(
        `Interceptor: duplicate key \"${message.key}\" with different source. Using first occurrence.`
      );
    }
  }

  return Array.from(map.values());
}

function buildSourceMap(
  messages: ExtractedMessage[],
  sourceMessages: Record<string, string>
): Map<string, string> {
  const map = new Map<string, string>();

  for (const message of messages) {
    const existing = sourceMessages[message.key];
    if (existing && typeof existing === "string") {
      map.set(message.key, existing);
      continue;
    }
    map.set(message.key, message.source);
  }

  return map;
}
