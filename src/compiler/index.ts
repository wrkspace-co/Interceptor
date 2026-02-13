import { normalizeConfig, resolveMessagesFile } from "../config"
import { saveExtractionCache } from "../extraction-cache"
import { extractMessagesIncremental } from "./extraction"
import { scanFiles } from "../file-scanner"
import { resolveProviderChain } from "../llm"
import { loadTranslationCache, saveTranslationCache } from "../translation-cache"
import { readJsonFile, runWithConcurrency } from "../utils"
import type { CompileMode, CompileResult, InterceptorConfig, Logger } from "../types"
import { buildReport } from "./report"
import { buildSourceMap, dedupeMessages } from "./messages"
import { buildLocalePlans } from "./plan"
import { applyBudgetsToPlans } from "./budget"
import { runLocalePlan } from "./locale-runner"

const DEFAULT_DIFF_LIMIT = 60

export interface CompileOptions {
  cwd?: string
  logger?: Logger
  files?: string[]
  mode?: CompileMode
  diffPreview?: boolean
  diffLimit?: number
}

// Compile once, optionally as a dry-run or CI check.
export async function compileOnce(
  config: InterceptorConfig,
  options: CompileOptions = {}
): Promise<CompileResult> {
  const normalized = normalizeConfig(config, options.cwd)
  const logger = options.logger ?? console
  const mode = options.mode ?? "write"
  const isWrite = mode === "write"
  const includePreview = options.diffPreview ?? mode !== "write"
  const diffLimit = options.diffLimit ?? DEFAULT_DIFF_LIMIT

  const files = options.files ?? (await scanFiles(normalized))
  const { messages: extracted, cache } = await extractMessagesIncremental(
    files,
    normalized,
    logger
  )

  if (isWrite) {
    await saveExtractionCache(normalized, cache)
  }

  const uniqueMessages = dedupeMessages(extracted, logger)

  if (uniqueMessages.length === 0) {
    const emptyLocales = normalized.locales.map((locale) => ({
      locale,
      file: resolveMessagesFile(normalized, locale),
      addedKeys: [],
      removedKeys: [],
      addedCount: 0,
      removedCount: 0,
      changed: false
    }))

    return {
      extractedCount: 0,
      updatedLocales: [],
      skippedLocales: normalized.locales,
      report: buildReport({
        mode,
        extractedCount: 0,
        updatedLocales: [],
        skippedLocales: normalized.locales,
        locales: emptyLocales
      })
    }
  }

  const sourceLocale = normalized.defaultLocale
  const sourceMessages = await readJsonFile(
    resolveMessagesFile(normalized, sourceLocale)
  )
  const sourceByKey = buildSourceMap(uniqueMessages, sourceMessages)
  const translationCache = await loadTranslationCache(normalized)
  const providerChain = resolveProviderChain(normalized.llm)

  const localePlans = await buildLocalePlans({
    normalized,
    uniqueMessages,
    sourceByKey,
    translationCache,
    providerChain
  })

  applyBudgetsToPlans(localePlans, sourceLocale, normalized.budget)

  const localeTasks = localePlans.map((plan) => async () =>
    runLocalePlan({
      plan,
      normalized,
      sourceLocale,
      logger,
      mode,
      includePreview,
      diffLimit
    })
  )

  const localeResults = await runWithConcurrency(
    localeTasks,
    normalized.batch.localeConcurrency
  )

  const updatedLocales: string[] = []
  const skippedLocales: string[] = []
  let cacheDirty = false
  for (const result of localeResults) {
    if (result.updated) {
      updatedLocales.push(result.locale)
    } else {
      skippedLocales.push(result.locale)
    }
    const updates = result.cacheUpdates
    if (updates && Object.keys(updates).length > 0) {
      cacheDirty = true
      Object.assign(translationCache.items, updates)
    }
  }

  if (cacheDirty && isWrite) {
    await saveTranslationCache(normalized, translationCache)
  }

  const report = buildReport({
    mode,
    extractedCount: uniqueMessages.length,
    updatedLocales,
    skippedLocales,
    locales: localeResults.map((result) => result.diff)
  })

  return {
    extractedCount: uniqueMessages.length,
    updatedLocales,
    skippedLocales,
    report
  }
}
