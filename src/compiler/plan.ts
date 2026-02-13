import { buildTranslationCacheKey } from "../translation-cache"
import { resolveMessagesFile } from "../config"
import { readJsonFile } from "../utils"
import type { ExtractedMessage, NormalizedConfig } from "../types"
import type { TranslationCache } from "../translation-cache"
import type { ResolvedLlmProviderConfig } from "../llm"
import type { LocalePlan } from "./types"

// Build per-locale plans for missing keys, caches, and cleanup.
export async function buildLocalePlans(params: {
  normalized: NormalizedConfig
  uniqueMessages: ExtractedMessage[]
  sourceByKey: Map<string, string>
  translationCache: TranslationCache
  providerChain: ResolvedLlmProviderConfig[]
}): Promise<LocalePlan[]> {
  const usedKeys = new Set(params.uniqueMessages.map((message) => message.key))
  const sourceLocale = params.normalized.defaultLocale

  return Promise.all(
    params.normalized.locales.map(async (locale) => {
      const messagesFile = resolveMessagesFile(params.normalized, locale)
      const existing = await readJsonFile(messagesFile)
      const missing = params.uniqueMessages.filter(
        (message) => existing[message.key] === undefined
      )
      const unusedKeys = params.normalized.cleanup.removeUnused
        ? Object.keys(existing).filter((key) => !usedKeys.has(key))
        : []
      const shouldPrune = unusedKeys.length > 0

      const plan: LocalePlan = {
        locale,
        messagesFile,
        existing,
        missing,
        missingSources: [],
        cachedTranslations: new Map<number, string>(),
        toTranslate: [],
        unusedKeys,
        shouldPrune,
        budgetTokens: Number.POSITIVE_INFINITY
      }

      if (locale === sourceLocale) {
        return plan
      }

      plan.missingSources = missing.map(
        (message) => params.sourceByKey.get(message.key) ?? message.source
      )

      for (let i = 0; i < plan.missingSources.length; i += 1) {
        const source = plan.missingSources[i]
        let cachedValue: string | undefined
        for (const provider of params.providerChain) {
          const cacheKey = buildTranslationCacheKey({
            source,
            sourceLocale,
            targetLocale: locale,
            provider: provider.provider,
            model: provider.model,
            baseUrl: provider.baseUrl,
            temperature: provider.temperature
          })
          const cached = params.translationCache.items[cacheKey]
          if (cached) {
            cachedValue = cached
            break
          }
        }
        if (cachedValue) {
          plan.cachedTranslations.set(i, cachedValue)
        } else {
          plan.toTranslate.push({ index: i, source })
        }
      }

      return plan
    })
  )
}
