import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { LlmProvider, NormalizedConfig } from "./types";

const CACHE_DIR = ".interceptor";
const CACHE_FILE = "translation-cache.json";
const CACHE_VERSION = 1;

export interface TranslationCache {
  version: number;
  items: Record<string, string>;
}

export function getTranslationCachePath(rootDir: string): string {
  return path.join(rootDir, CACHE_DIR, CACHE_FILE);
}

export function buildTranslationCacheKey(params: {
  source: string;
  sourceLocale: string;
  targetLocale: string;
  provider: LlmProvider;
  model: string;
  baseUrl?: string;
  temperature?: number;
}): string {
  const payload = {
    source: params.source,
    sourceLocale: params.sourceLocale,
    targetLocale: params.targetLocale,
    provider: params.provider,
    model: params.model,
    baseUrl: params.baseUrl ?? null,
    temperature: params.temperature ?? null
  };
  return createHash("sha1").update(JSON.stringify(payload)).digest("hex");
}

export async function loadTranslationCache(
  config: NormalizedConfig
): Promise<TranslationCache> {
  const cachePath = getTranslationCachePath(config.rootDir);
  try {
    const raw = await fs.readFile(cachePath, "utf8");
    const parsed = JSON.parse(raw) as TranslationCache;
    if (!parsed || parsed.version !== CACHE_VERSION || !parsed.items) {
      return createEmptyCache();
    }
    return parsed;
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      return createEmptyCache();
    }
    return createEmptyCache();
  }
}

export async function saveTranslationCache(
  config: NormalizedConfig,
  cache: TranslationCache
): Promise<void> {
  const cachePath = getTranslationCachePath(config.rootDir);
  const dir = path.dirname(cachePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(cachePath, JSON.stringify(cache), "utf8");
}

export function createEmptyCache(): TranslationCache {
  return {
    version: CACHE_VERSION,
    items: {}
  };
}
