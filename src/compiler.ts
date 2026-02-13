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
import { resolveProviderChain } from "./llm";
import { translateBatchWithFallback } from "./translator";
import {
  buildTranslationCacheKey,
  loadTranslationCache,
  saveTranslationCache
} from "./translation-cache";
import {
  chunk,
  delay,
  estimateTokens,
  estimateTokensForStrings,
  readJsonFile,
  runWithConcurrency,
  writeJsonFile
} from "./utils";
import {
  CompileMode,
  CompileReport,
  CompileResult,
  ExtractedMessage,
  InterceptorConfig,
  LocaleDiffReport,
  Logger
} from "./types";

const FILE_CONCURRENCY = Math.max(2, Math.min(os.cpus().length, 8));
const DEFAULT_DIFF_LIMIT = 60;

export interface CompileOptions {
  cwd?: string;
  logger?: Logger;
  files?: string[];
  mode?: CompileMode;
  diffPreview?: boolean;
  diffLimit?: number;
}

export async function compileOnce(
  config: InterceptorConfig,
  options: CompileOptions = {}
): Promise<CompileResult> {
  const normalized = normalizeConfig(config, options.cwd);
  const logger = options.logger ?? console;
  const mode = options.mode ?? "write";
  const isWrite = mode === "write";
  const includePreview = options.diffPreview ?? mode !== "write";
  const diffLimit = options.diffLimit ?? DEFAULT_DIFF_LIMIT;

  const files = options.files ?? (await scanFiles(normalized));
  const { messages: extracted, cache } = await extractMessagesIncremental(
    files,
    normalized,
    logger
  );
  if (isWrite) {
    await saveExtractionCache(normalized, cache);
  }
  const uniqueMessages = dedupeMessages(extracted, logger);

  if (uniqueMessages.length === 0) {
    logger.info("Interceptor: no strings found.");
    return {
      extractedCount: 0,
      updatedLocales: [],
      skippedLocales: normalized.locales,
      report: buildReport({
        mode,
        extractedCount: 0,
        updatedLocales: [],
        skippedLocales: normalized.locales,
        locales: normalized.locales.map((locale) => ({
          locale,
          file: resolveMessagesFile(normalized, locale),
          addedKeys: [],
          removedKeys: [],
          addedCount: 0,
          removedCount: 0,
          changed: false
        }))
      })
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
  const translationCache = await loadTranslationCache(normalized);
  const providerChain = resolveProviderChain(normalized.llm);

  const localePlans = await Promise.all(
    normalized.locales.map(async (locale) => {
      const messagesFile = resolveMessagesFile(normalized, locale);
      const existing = await readJsonFile(messagesFile);
      const missing = uniqueMessages.filter(
        (message) => existing[message.key] === undefined
      );
      const unusedKeys = normalized.cleanup.removeUnused
        ? Object.keys(existing).filter((key) => !usedKeys.has(key))
        : [];
      const shouldPrune = unusedKeys.length > 0;

      const plan = {
        locale,
        messagesFile,
        existing,
        missing,
        missingSources: [] as string[],
        cachedTranslations: new Map<number, string>(),
        toTranslate: [] as Array<{ index: number; source: string }>,
        unusedKeys,
        shouldPrune,
        budgetTokens: Number.POSITIVE_INFINITY
      };

      if (locale === sourceLocale) {
        return plan;
      }

      plan.missingSources = missing.map(
        (message) => sourceByKey.get(message.key) ?? message.source
      );

      for (let i = 0; i < plan.missingSources.length; i += 1) {
        const source = plan.missingSources[i];
        let cachedValue: string | undefined;
        for (const provider of providerChain) {
          const cacheKey = buildTranslationCacheKey({
            source,
            sourceLocale,
            targetLocale: locale,
            provider: provider.provider,
            model: provider.model,
            baseUrl: provider.baseUrl,
            temperature: provider.temperature
          });
          const cached = translationCache.items[cacheKey];
          if (cached) {
            cachedValue = cached;
            break;
          }
        }
        if (cachedValue) {
          plan.cachedTranslations.set(i, cachedValue);
        } else {
          plan.toTranslate.push({ index: i, source });
        }
      }

      return plan;
    })
  );

  let remainingTokens = normalized.budget.maxTokensPerRun;
  for (const plan of localePlans) {
    if (plan.locale === sourceLocale) {
      plan.budgetTokens = Number.POSITIVE_INFINITY;
      continue;
    }
    const requiredTokens = estimateTokensForStrings(
      plan.toTranslate.map((item) => item.source)
    );
    const localeCap = normalized.budget.maxTokensPerLocale;
    const allowed = Math.min(requiredTokens, localeCap, remainingTokens);
    plan.budgetTokens = allowed;
    remainingTokens = Math.max(0, remainingTokens - allowed);
  }

  const localeTasks = localePlans.map((plan) => async () => {
    if (plan.missing.length === 0 && !plan.shouldPrune) {
      return {
        locale: plan.locale,
        updated: false,
        cacheUpdates: {} as Record<string, string>,
        diff: {
          locale: plan.locale,
          file: plan.messagesFile,
          addedKeys: [],
          removedKeys: [],
          addedCount: 0,
          removedCount: 0,
          changed: false
        } satisfies LocaleDiffReport
      };
    }

    const updated: Record<string, string> = { ...plan.existing };
    const cacheUpdates: Record<string, string> = {};

    if (plan.locale === sourceLocale) {
      for (const message of plan.missing) {
        updated[message.key] = message.source;
      }
    } else {
      for (const [index, value] of plan.cachedTranslations.entries()) {
        const fallbackKey = plan.missing[index]?.key;
        if (fallbackKey) {
          updated[fallbackKey] = value;
        }
      }

      const { allowed, skipped, usedTokens } = applyBudget(
        plan.toTranslate,
        plan.budgetTokens
      );

      if (skipped.length > 0) {
        logger.warn(
          `Interceptor: budget limit reached for ${plan.locale}. Translated ${allowed.length} of ${plan.toTranslate.length} strings.`
        );
      }

      const batches = chunk(allowed, normalized.batch.size);
      for (let index = 0; index < batches.length; index += 1) {
        const batch = batches[index];
        if (batch.length === 0) continue;
        logger.info(
          `Interceptor: translating ${batch.length} strings (${index + 1}/${batches.length}) for ${plan.locale}.`
        );

        const { translations, provider, model, baseUrl, temperature } =
          await translateBatchWithFallback(
          batch.map((item) => item.source),
          normalized.llm,
          { sourceLocale, targetLocale: plan.locale }
        );

        for (let i = 0; i < batch.length; i += 1) {
          const item = batch[i];
          const translated = translations[i];
          const key = plan.missing[item.index]?.key;
          if (key && translated) {
            updated[key] = translated;
          }
          const cacheKey = buildTranslationCacheKey({
            source: item.source,
            sourceLocale,
            targetLocale: plan.locale,
            provider,
            model,
            baseUrl,
            temperature
          });
          cacheUpdates[cacheKey] = translated ?? item.source;
        }

        if (normalized.batch.delayMs > 0 && index < batches.length - 1) {
          await delay(normalized.batch.delayMs);
        }
      }

      if (usedTokens === 0 && plan.toTranslate.length > 0 && plan.budgetTokens <= 0) {
        logger.warn(
          `Interceptor: translation budget is zero for ${plan.locale}. Skipping ${plan.toTranslate.length} strings.`
        );
      }
    }

    if (plan.shouldPrune) {
      for (const key of plan.unusedKeys) {
        delete updated[key];
      }
    }

    const addedKeys = Object.keys(updated)
      .filter((key) => plan.existing[key] === undefined)
      .sort((a, b) => a.localeCompare(b));
    const removedKeys = Object.keys(plan.existing)
      .filter((key) => updated[key] === undefined)
      .sort((a, b) => a.localeCompare(b));
    const changed = addedKeys.length > 0 || removedKeys.length > 0;

    if (changed && isWrite) {
      await writeJsonFile(plan.messagesFile, updated);
    }

    const diffPreview = includePreview
      ? formatDiffPreview({
          addedKeys,
          removedKeys,
          updated,
          existing: plan.existing,
          limit: diffLimit
        })
      : undefined;

    return {
      locale: plan.locale,
      updated: changed,
      cacheUpdates,
      diff: {
        locale: plan.locale,
        file: plan.messagesFile,
        addedKeys,
        removedKeys,
        addedCount: addedKeys.length,
        removedCount: removedKeys.length,
        changed,
        preview: diffPreview
      } satisfies LocaleDiffReport
    };
  });

  const localeResults = await runWithConcurrency(
    localeTasks,
    normalized.batch.localeConcurrency
  );

  let cacheDirty = false;
  const diffs: LocaleDiffReport[] = [];
  for (const result of localeResults) {
    if (result.updated) {
      updatedLocales.push(result.locale);
    } else {
      skippedLocales.push(result.locale);
    }
    diffs.push(result.diff);
    const updates = result.cacheUpdates;
    if (updates && Object.keys(updates).length > 0) {
      cacheDirty = true;
      Object.assign(translationCache.items, updates);
    }
  }

  if (cacheDirty && isWrite) {
    await saveTranslationCache(normalized, translationCache);
  }

  const report = buildReport({
    mode,
    extractedCount: uniqueMessages.length,
    updatedLocales,
    skippedLocales,
    locales: diffs
  });

  return {
    extractedCount: uniqueMessages.length,
    updatedLocales,
    skippedLocales,
    report
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

function applyBudget<T extends { source: string }>(
  items: T[],
  budgetTokens: number
): { allowed: T[]; skipped: T[]; usedTokens: number } {
  if (!Number.isFinite(budgetTokens)) {
    return {
      allowed: items,
      skipped: [],
      usedTokens: estimateTokensForStrings(items.map((item) => item.source))
    };
  }

  let used = 0;
  const allowed: T[] = [];
  const skipped: T[] = [];

  for (const item of items) {
    const cost = estimateTokens(item.source);
    if (used + cost <= budgetTokens) {
      allowed.push(item);
      used += cost;
    } else {
      skipped.push(item);
    }
  }

  return { allowed, skipped, usedTokens: used };
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

function formatDiffPreview(params: {
  addedKeys: string[];
  removedKeys: string[];
  updated: Record<string, string>;
  existing: Record<string, string>;
  limit: number;
}): string | undefined {
  const { addedKeys, removedKeys, updated, existing, limit } = params;
  const lines: string[] = [];

  for (const key of removedKeys) {
    lines.push(`- "${key}": ${JSON.stringify(existing[key])}`);
  }
  for (const key of addedKeys) {
    lines.push(`+ "${key}": ${JSON.stringify(updated[key])}`);
  }

  if (lines.length === 0) return undefined;
  if (lines.length <= limit) {
    return lines.join("\n");
  }

  const visible = lines.slice(0, limit);
  visible.push(`… ${lines.length - limit} more`);
  return visible.join("\n");
}

function buildReport(params: {
  mode: CompileMode;
  extractedCount: number;
  updatedLocales: string[];
  skippedLocales: string[];
  locales: LocaleDiffReport[];
}): CompileReport {
  const keysAdded = params.locales.reduce((sum, item) => sum + item.addedCount, 0);
  const keysRemoved = params.locales.reduce(
    (sum, item) => sum + item.removedCount,
    0
  );
  const filesChanged = params.locales.filter((item) => item.changed).length;

  return {
    mode: params.mode,
    extractedCount: params.extractedCount,
    updatedLocales: params.updatedLocales,
    skippedLocales: params.skippedLocales,
    locales: params.locales,
    summary: {
      filesChanged,
      keysAdded,
      keysRemoved
    },
    generatedAt: new Date().toISOString()
  };
}
