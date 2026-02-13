import { buildTranslationCacheKey } from "../translation-cache"
import { resolveMessagesFile } from "../config"
import { readJsonFile } from "../utils"
import type { ExtractedMessage, NormalizedConfig } from "../types"
import type { TranslationCache } from "../translation-cache"
import type { TranslationMetaCache } from "../translation-meta"
import type { ResolvedLlmProviderConfig } from "../llm"
import type { LocalePlan } from "./types"

// Build per-locale plans for missing keys, caches, and cleanup.
export async function buildLocalePlans(params: {
  normalized: NormalizedConfig
  uniqueMessages: ExtractedMessage[]
  sourceByKey: Map<string, string>
  translationCache: TranslationCache
  providerChain: ResolvedLlmProviderConfig[]
  translationMeta: TranslationMetaCache
}): Promise<LocalePlan[]> {
  const usedKeys = new Set(params.uniqueMessages.map((message) => message.key))
  const currentKeys = params.uniqueMessages.map((message) => message.key)
  const sourceLocale = params.normalized.defaultLocale
  const transientWindowMs = params.normalized.cleanup.transientKeyWindowMs

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
      const transientKeys = findTransientKeys({
        existing,
        usedKeys,
        currentKeys,
        locale,
        translationMeta: params.translationMeta,
        transientWindowMs
      })
      const shouldPrune = unusedKeys.length > 0 || transientKeys.length > 0

      const plan: LocalePlan = {
        locale,
        messagesFile,
        existing,
        missing,
        missingSources: [],
        cachedTranslations: new Map<number, string>(),
        toTranslate: [],
        unusedKeys,
        transientKeys,
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

function findTransientKeys(params: {
  existing: Record<string, string>
  usedKeys: Set<string>
  currentKeys: string[]
  locale: string
  translationMeta: TranslationMetaCache
  transientWindowMs?: number
}): string[] {
  const windowMs = params.transientWindowMs ?? 0
  if (windowMs <= 0) return []

  const metaByLocale = params.translationMeta.items[params.locale] ?? {}
  const now = Date.now()
  const transient: string[] = []

  for (const [key, value] of Object.entries(params.existing)) {
    if (params.usedKeys.has(key)) continue
    const meta = metaByLocale[key]
    if (!meta) continue
    if (meta.value !== value) continue
    if (now - meta.createdAt > windowMs) continue
    if (!hasReplacementKey(key, params.currentKeys)) continue
    transient.push(key)
  }

  return transient
}

function hasReplacementKey(oldKey: string, currentKeys: string[]): boolean {
  return currentKeys.some((key) => key.length > oldKey.length && key.startsWith(oldKey))
}
