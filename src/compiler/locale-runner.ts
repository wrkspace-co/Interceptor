import { translateBatchWithFallback } from "../translator"
import { chunk, delay, writeJsonFile } from "../utils"
import { buildTranslationCacheKey } from "../translation-cache"
import type { CompileMode, Logger, NormalizedConfig } from "../types"
import type { LocalePlan, LocaleRunResult } from "./types"
import { applyBudget } from "./budget"
import { buildLocaleDiff } from "./diff"

// Execute a locale plan: translate, prune, write, and return diff info.
export async function runLocalePlan(params: {
  plan: LocalePlan
  normalized: NormalizedConfig
  sourceLocale: string
  logger: Logger
  mode: CompileMode
  includePreview: boolean
  diffLimit: number
}): Promise<LocaleRunResult> {
  const { plan, normalized, sourceLocale, logger, mode, includePreview, diffLimit } = params

  if (plan.missing.length === 0 && !plan.shouldPrune) {
    return {
      locale: plan.locale,
      updated: false,
      cacheUpdates: {},
      addedEntries: {},
      diff: {
        locale: plan.locale,
        file: plan.messagesFile,
        addedKeys: [],
        removedKeys: [],
        addedCount: 0,
        removedCount: 0,
        changed: false
      }
    }
  }

  const updated: Record<string, string> = { ...plan.existing }
  const cacheUpdates: Record<string, string> = {}

  if (plan.locale === sourceLocale) {
    for (const message of plan.missing) {
      updated[message.key] = message.source
    }
  } else {
    for (const [index, value] of plan.cachedTranslations.entries()) {
      const fallbackKey = plan.missing[index]?.key
      if (fallbackKey) {
        updated[fallbackKey] = value
      }
    }

    const { allowed, skipped, usedTokens } = applyBudget(
      plan.toTranslate,
      plan.budgetTokens
    )

    if (skipped.length > 0) {
      logger.warn(
        `Interceptor: budget limit reached for ${plan.locale}. Translated ${allowed.length} of ${plan.toTranslate.length} strings.`
      )
    }

    const batches = chunk(allowed, normalized.batch.size)
    for (let index = 0; index < batches.length; index += 1) {
      const batch = batches[index]
      if (batch.length === 0) continue
      logger.info(
        `Interceptor: translating ${batch.length} strings (${index + 1}/${batches.length}) for ${plan.locale}.`
      )

      const { translations, provider, model, baseUrl, temperature } =
        await translateBatchWithFallback(
          batch.map((item) => item.source),
          normalized.llm,
          { sourceLocale, targetLocale: plan.locale }
        )

      for (let i = 0; i < batch.length; i += 1) {
        const item = batch[i]
        const translated = translations[i]
        const key = plan.missing[item.index]?.key
        if (key && translated) {
          updated[key] = translated
        }
        const cacheKey = buildTranslationCacheKey({
          source: item.source,
          sourceLocale,
          targetLocale: plan.locale,
          provider,
          model,
          baseUrl,
          temperature
        })
        cacheUpdates[cacheKey] = translated ?? item.source
      }

      if (normalized.batch.delayMs > 0 && index < batches.length - 1) {
        await delay(normalized.batch.delayMs)
      }
    }

    if (usedTokens === 0 && plan.toTranslate.length > 0 && plan.budgetTokens <= 0) {
      logger.warn(
        `Interceptor: translation budget is zero for ${plan.locale}. Skipping ${plan.toTranslate.length} strings.`
      )
    }
  }

  if (plan.shouldPrune) {
    for (const key of plan.unusedKeys) {
      delete updated[key]
    }
    for (const key of plan.transientKeys) {
      delete updated[key]
    }
  }

  const diff = buildLocaleDiff({
    locale: plan.locale,
    file: plan.messagesFile,
    existing: plan.existing,
    updated,
    includePreview,
    diffLimit
  })

  if (diff.changed && mode === "write") {
    await writeJsonFile(plan.messagesFile, updated)
  }

  const addedEntries: Record<string, string> = {}
  for (const key of diff.addedKeys) {
    addedEntries[key] = updated[key]
  }

  return {
    locale: plan.locale,
    updated: diff.changed,
    cacheUpdates,
    diff,
    addedEntries
  }
}
