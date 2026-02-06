import fg from "fast-glob";
import { normalizeConfig, resolveMessagesFile } from "./config";
import { extractMessagesFromFiles } from "./extractor";
import { translateBatch } from "./translator";
import { chunk, delay, readJsonFile, writeJsonFile } from "./utils";
import { CompileResult, ExtractedMessage, InterceptorConfig, Logger } from "./types";

export async function compileOnce(
  config: InterceptorConfig,
  options: { cwd?: string; logger?: Logger } = {}
): Promise<CompileResult> {
  const normalized = normalizeConfig(config, options.cwd);
  const logger = options.logger ?? console;

  const files = await fg(normalized.include, {
    cwd: normalized.rootDir,
    absolute: true,
    ignore: normalized.exclude
  });

  const extracted = await extractMessagesFromFiles(files, normalized);
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

  for (const locale of normalized.locales) {
    const messagesFile = resolveMessagesFile(normalized, locale);
    const existing = await readJsonFile(messagesFile);
    const missing = uniqueMessages.filter(
      (message) => existing[message.key] === undefined
    );

    if (missing.length === 0) {
      skippedLocales.push(locale);
      continue;
    }

    if (locale === sourceLocale) {
      for (const message of missing) {
        existing[message.key] = message.source;
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
        existing[missing[i].key] = translations[i] ?? fallback;
      }
    }

    await writeJsonFile(messagesFile, existing);
    updatedLocales.push(locale);
  }

  return {
    extractedCount: uniqueMessages.length,
    updatedLocales,
    skippedLocales
  };
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
