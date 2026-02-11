import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { ExtractedMessage, NormalizedConfig } from "./types";

const CACHE_DIR = ".interceptor";
const CACHE_FILE = "extractor-cache.json";
const CACHE_VERSION = 2;

export interface ExtractionCacheEntry {
  mtimeMs: number;
  size: number;
  hash: string;
  messages: ExtractedMessage[];
}

export interface ExtractionCache {
  version: number;
  key: string;
  files: Record<string, ExtractionCacheEntry>;
}

export function getExtractionCachePath(rootDir: string): string {
  return path.join(rootDir, CACHE_DIR, CACHE_FILE);
}

export function buildExtractionCacheKey(config: NormalizedConfig): string {
  const payload = {
    include: config.include,
    exclude: config.exclude,
    extractor: config.extractor
  };
  return createHash("sha1").update(JSON.stringify(payload)).digest("hex");
}

export async function loadExtractionCache(
  config: NormalizedConfig
): Promise<ExtractionCache> {
  const cachePath = getExtractionCachePath(config.rootDir);
  try {
    const raw = await fs.readFile(cachePath, "utf8");
    const parsed = JSON.parse(raw) as ExtractionCache;
    const key = buildExtractionCacheKey(config);
    if (!parsed || parsed.version !== CACHE_VERSION || parsed.key !== key) {
      return createEmptyCache(key);
    }
    return parsed;
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      return createEmptyCache(buildExtractionCacheKey(config));
    }
    return createEmptyCache(buildExtractionCacheKey(config));
  }
}

export async function saveExtractionCache(
  config: NormalizedConfig,
  cache: ExtractionCache
): Promise<void> {
  const cachePath = getExtractionCachePath(config.rootDir);
  const dir = path.dirname(cachePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(cachePath, JSON.stringify(cache), "utf8");
}

export function createEmptyCache(key: string): ExtractionCache {
  return {
    version: CACHE_VERSION,
    key,
    files: {}
  };
}
