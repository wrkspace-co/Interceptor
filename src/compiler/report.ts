import type { CompileMode, CompileReport } from "../types"
import type { LocaleDiffReport } from "../types"

// Build a report payload for CLI and CI consumers.
export function buildReport(params: {
  mode: CompileMode
  extractedCount: number
  updatedLocales: string[]
  skippedLocales: string[]
  locales: LocaleDiffReport[]
}): CompileReport {
  const keysAdded = params.locales.reduce((sum, item) => sum + item.addedCount, 0)
  const keysRemoved = params.locales.reduce((sum, item) => sum + item.removedCount, 0)
  const filesChanged = params.locales.filter((item) => item.changed).length

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
  }
}
