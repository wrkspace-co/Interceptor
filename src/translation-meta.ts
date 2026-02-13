import fs from "node:fs/promises"
import path from "node:path"
import type { NormalizedConfig } from "./types"

const CACHE_DIR = ".interceptor"
const CACHE_FILE = "translation-meta.json"
const CACHE_VERSION = 1

export interface TranslationMetaEntry {
  value: string
  createdAt: number
}

export interface TranslationMetaCache {
  version: number
  items: Record<string, Record<string, TranslationMetaEntry>>
}

// Resolve the meta cache path on disk.
export function getTranslationMetaPath(rootDir: string): string {
  return path.join(rootDir, CACHE_DIR, CACHE_FILE)
}

// Load the translation meta cache from disk.
export async function loadTranslationMeta(
  config: NormalizedConfig
): Promise<TranslationMetaCache> {
  const cachePath = getTranslationMetaPath(config.rootDir)
  try {
    const raw = await fs.readFile(cachePath, "utf8")
    const parsed = JSON.parse(raw) as TranslationMetaCache
    if (!parsed || parsed.version !== CACHE_VERSION || !parsed.items) {
      return createEmptyMeta()
    }
    return parsed
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      return createEmptyMeta()
    }
    return createEmptyMeta()
  }
}

// Save the translation meta cache to disk.
export async function saveTranslationMeta(
  config: NormalizedConfig,
  cache: TranslationMetaCache
): Promise<void> {
  const cachePath = getTranslationMetaPath(config.rootDir)
  const dir = path.dirname(cachePath)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(cachePath, JSON.stringify(cache), "utf8")
}

// Initialize an empty meta cache.
export function createEmptyMeta(): TranslationMetaCache {
  return {
    version: CACHE_VERSION,
    items: {}
  }
}
