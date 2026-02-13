import type { ExtractedMessage, LocaleDiffReport } from "../types"

export interface LocalePlan {
  locale: string
  messagesFile: string
  existing: Record<string, string>
  missing: ExtractedMessage[]
  missingSources: string[]
  cachedTranslations: Map<number, string>
  toTranslate: Array<{ index: number; source: string }>
  unusedKeys: string[]
  transientKeys: string[]
  shouldPrune: boolean
  budgetTokens: number
}

export interface LocaleRunResult {
  locale: string
  updated: boolean
  cacheUpdates: Record<string, string>
  diff: LocaleDiffReport
  addedEntries: Record<string, string>
}
