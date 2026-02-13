import path from "node:path"
import type {
  InterceptorConfig,
  NormalizedConfig,
  NormalizedExtractorConfig,
  LlmFallbackConfig
} from "../types"
import {
  DEFAULT_BATCH,
  DEFAULT_BUDGET,
  DEFAULT_CLEANUP,
  DEFAULT_EXCLUDE,
  DEFAULT_EXTRACTOR,
  DEFAULT_I18N,
  DEFAULT_INCLUDE,
  DEFAULT_LLM_API_KEY_ENV,
  DEFAULT_WATCHER
} from "./defaults"

// Normalize user config into a fully-defined runtime configuration.
export function normalizeConfig(
  config: InterceptorConfig,
  cwd: string = process.cwd()
): NormalizedConfig {
  validateRequired(config)

  const rootDir = path.resolve(cwd, config.rootDir ?? ".")
  const defaultLocale = config.defaultLocale

  return {
    rootDir,
    include: config.include ?? DEFAULT_INCLUDE,
    exclude: config.exclude ?? DEFAULT_EXCLUDE,
    locales: config.locales,
    defaultLocale,
    extractor: buildExtractorConfig(config),
    i18n: buildI18nConfig(config),
    llm: buildLlmConfig(config),
    batch: { ...DEFAULT_BATCH, ...(config.batch ?? {}) },
    watcher: { ...DEFAULT_WATCHER, ...(config.watcher ?? {}) },
    cleanup: { ...DEFAULT_CLEANUP, ...(config.cleanup ?? {}) },
    budget: { ...DEFAULT_BUDGET, ...(config.budget ?? {}) }
  }
}

// Validate required config fields.
function validateRequired(config: InterceptorConfig): void {
  if (!config || !Array.isArray(config.locales) || config.locales.length === 0) {
    throw new Error("config.locales is required and must be a non-empty array.")
  }
  if (!config.defaultLocale) {
    throw new Error("config.defaultLocale is required.")
  }
  if (!config.llm?.model) {
    throw new Error("config.llm.model is required.")
  }
  if (!config.llm?.provider) {
    throw new Error("config.llm.provider is required.")
  }
}

// Build extractor defaults with user overrides.
function buildExtractorConfig(config: InterceptorConfig): NormalizedExtractorConfig {
  return {
    functions: config.extractor?.functions ?? DEFAULT_EXTRACTOR.functions,
    taggedTemplates: config.extractor?.taggedTemplates ?? DEFAULT_EXTRACTOR.taggedTemplates,
    reactIntl: {
      formatMessage:
        config.extractor?.reactIntl?.formatMessage ??
        DEFAULT_EXTRACTOR.reactIntl.formatMessage,
      formattedMessage:
        config.extractor?.reactIntl?.formattedMessage ??
        DEFAULT_EXTRACTOR.reactIntl.formattedMessage,
      defineMessages:
        config.extractor?.reactIntl?.defineMessages ??
        DEFAULT_EXTRACTOR.reactIntl.defineMessages
    },
    i18next: {
      enabled: config.extractor?.i18next?.enabled ?? DEFAULT_EXTRACTOR.i18next.enabled,
      functions: config.extractor?.i18next?.functions ?? DEFAULT_EXTRACTOR.i18next.functions,
      memberFunctions:
        config.extractor?.i18next?.memberFunctions ??
        DEFAULT_EXTRACTOR.i18next.memberFunctions,
      objects: config.extractor?.i18next?.objects ?? DEFAULT_EXTRACTOR.i18next.objects,
      useDefaultValue:
        config.extractor?.i18next?.useDefaultValue ??
        DEFAULT_EXTRACTOR.i18next.useDefaultValue,
      keyAsDefault:
        config.extractor?.i18next?.keyAsDefault ??
        DEFAULT_EXTRACTOR.i18next.keyAsDefault,
      transComponent:
        config.extractor?.i18next?.transComponent ??
        DEFAULT_EXTRACTOR.i18next.transComponent
    },
    vueI18n: {
      enabled: config.extractor?.vueI18n?.enabled ?? DEFAULT_EXTRACTOR.vueI18n.enabled,
      functions:
        config.extractor?.vueI18n?.functions ?? DEFAULT_EXTRACTOR.vueI18n.functions,
      memberFunctions:
        config.extractor?.vueI18n?.memberFunctions ??
        DEFAULT_EXTRACTOR.vueI18n.memberFunctions,
      objects: config.extractor?.vueI18n?.objects ?? DEFAULT_EXTRACTOR.vueI18n.objects,
      keyAsDefault:
        config.extractor?.vueI18n?.keyAsDefault ?? DEFAULT_EXTRACTOR.vueI18n.keyAsDefault
    }
  }
}

// Build i18n settings with defaults.
function buildI18nConfig(config: InterceptorConfig): NormalizedConfig["i18n"] {
  return {
    ...DEFAULT_I18N,
    ...(config.i18n ?? {})
  }
}

// Normalize LLM settings with defaults and fallbacks.
function buildLlmConfig(config: InterceptorConfig): NormalizedConfig["llm"] {
  const llmProvider = config.llm.provider
  const fallbackConfigs = config.llm.fallbacks ?? []

  const normalizedFallbacks = fallbackConfigs.map((fallback: LlmFallbackConfig) => {
    if (!fallback?.provider) {
      throw new Error("config.llm.fallbacks must include a provider.")
    }
    const model = fallback.model ?? config.llm.model
    return {
      provider: fallback.provider,
      model,
      apiKeyEnv: fallback.apiKeyEnv ?? DEFAULT_LLM_API_KEY_ENV[fallback.provider],
      baseUrl: fallback.baseUrl,
      temperature: fallback.temperature
    }
  })

  return {
    provider: llmProvider,
    model: config.llm.model,
    apiKeyEnv: config.llm.apiKeyEnv ?? DEFAULT_LLM_API_KEY_ENV[llmProvider],
    baseUrl: config.llm.baseUrl,
    temperature: config.llm.temperature,
    fallbacks: normalizedFallbacks,
    retries: config.llm.retries ?? 2,
    retryDelayMs: config.llm.retryDelayMs ?? 500,
    retryMaxDelayMs: config.llm.retryMaxDelayMs ?? 4000
  }
}
