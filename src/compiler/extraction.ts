import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { createHash } from "node:crypto"
import { extractMessagesFromContent } from "../extractor"
import {
  createEmptyCache,
  loadExtractionCache,
  type ExtractionCacheEntry
} from "../extraction-cache"
import { runWithConcurrency } from "../utils"
import type { ExtractedMessage, Logger, NormalizedConfig } from "../types"

const FILE_CONCURRENCY = Math.max(2, Math.min(os.cpus().length, 8))

// Extract messages using a hash-based incremental cache.
export async function extractMessagesIncremental(
  files: string[],
  config: NormalizedConfig,
  logger: Logger
): Promise<{ messages: ExtractedMessage[]; cache: ReturnType<typeof createEmptyCache> }> {
  const cache = await loadExtractionCache(config)
  const nextCache = createEmptyCache(cache.key)

  const tasks = files.map((filePath) => async () => {
    const relative = path.relative(config.rootDir, filePath)
    let stat: { mtimeMs: number; size: number }
    try {
      const fsStat = await fs.stat(filePath)
      stat = { mtimeMs: fsStat.mtimeMs, size: fsStat.size }
    } catch {
      return null
    }

    try {
      const cached = cache.files[relative]
      if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
        return { relative, entry: cached, messages: cached.messages }
      }

      const content = await fs.readFile(filePath, "utf8")
      const hash = createHash("sha1").update(content).digest("hex")
      if (cached && cached.hash === hash) {
        const entry: ExtractionCacheEntry = {
          ...cached,
          mtimeMs: stat.mtimeMs,
          size: stat.size,
          hash
        }
        return { relative, entry, messages: cached.messages }
      }

      const messages = extractMessagesFromContent(content, filePath, config)
      const entry: ExtractionCacheEntry = {
        mtimeMs: stat.mtimeMs,
        size: stat.size,
        hash,
        messages
      }
      return { relative, entry, messages }
    } catch (error) {
      logger.warn(
        `Interceptor: failed to extract ${filePath} - ${
          error instanceof Error ? error.message : String(error)
        }`
      )
      return null
    }
  })

  const results = await runWithConcurrency(tasks, FILE_CONCURRENCY)
  const extracted: ExtractedMessage[] = []

  for (const result of results) {
    if (!result) continue
    nextCache.files[result.relative] = result.entry
    extracted.push(...result.messages)
  }

  return { messages: extracted, cache: nextCache }
}
