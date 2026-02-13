import type { LocaleDiffReport } from "../types"

// Build a diff report for a locale file, with optional preview.
export function buildLocaleDiff(params: {
  locale: string
  file: string
  existing: Record<string, string>
  updated: Record<string, string>
  includePreview: boolean
  diffLimit: number
}): LocaleDiffReport {
  const addedKeys = Object.keys(params.updated)
    .filter((key) => params.existing[key] === undefined)
    .sort((a, b) => a.localeCompare(b))
  const removedKeys = Object.keys(params.existing)
    .filter((key) => params.updated[key] === undefined)
    .sort((a, b) => a.localeCompare(b))
  const changed = addedKeys.length > 0 || removedKeys.length > 0

  const preview = params.includePreview
    ? formatDiffPreview({
        addedKeys,
        removedKeys,
        updated: params.updated,
        existing: params.existing,
        limit: params.diffLimit
      })
    : undefined

  return {
    locale: params.locale,
    file: params.file,
    addedKeys,
    removedKeys,
    addedCount: addedKeys.length,
    removedCount: removedKeys.length,
    changed,
    preview
  }
}

// Format diff preview lines for a locale update.
export function formatDiffPreview(params: {
  addedKeys: string[]
  removedKeys: string[]
  updated: Record<string, string>
  existing: Record<string, string>
  limit: number
}): string | undefined {
  const { addedKeys, removedKeys, updated, existing, limit } = params
  const lines: string[] = []

  for (const key of removedKeys) {
    lines.push(`- "${key}": ${JSON.stringify(existing[key])}`)
  }
  for (const key of addedKeys) {
    lines.push(`+ "${key}": ${JSON.stringify(updated[key])}`)
  }

  if (lines.length === 0) return undefined
  if (lines.length <= limit) {
    return lines.join("\n")
  }

  const visible = lines.slice(0, limit)
  visible.push(`… ${lines.length - limit} more`)
  return visible.join("\n")
}
