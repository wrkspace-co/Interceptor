import type {
  BatchConfig,
  I18nConfig,
  NormalizedExtractorConfig,
  WatcherConfig
} from "../types"

// Supported config file names.
export const DEFAULT_CONFIG_NAMES = [
  "interceptor.config.ts",
  "interceptor.config.js",
  "interceptor.config.cjs",
  "interceptor.config.mjs",
  "interceptor.config.json"
]

// Default file globbing rules.
export const DEFAULT_INCLUDE = ["src/**/*.{js,jsx,ts,tsx,vue,svelte,astro}"]
export const DEFAULT_EXCLUDE = [
  "**/node_modules/**",
  "**/dist/**",
  "**/build/**",
  "**/.next/**",
  "**/coverage/**"
]

// Default extractor behavior.
export const DEFAULT_EXTRACTOR: NormalizedExtractorConfig = {
  functions: ["t"],
  taggedTemplates: [],
  reactIntl: {
    formatMessage: true,
    formattedMessage: true,
    defineMessages: true
  },
  i18next: {
    enabled: true,
    functions: ["t"],
    memberFunctions: ["t"],
    objects: ["i18n", "i18next"],
    useDefaultValue: true,
    keyAsDefault: true,
    transComponent: true
  },
  vueI18n: {
    enabled: true,
    functions: ["$t"],
    memberFunctions: ["t", "$t"],
    objects: ["i18n", "$i18n", "i18nGlobal", "i18nInstance", "this"],
    keyAsDefault: true
  }
}

// Default i18n file resolution.
export const DEFAULT_I18N: Required<Omit<I18nConfig, "resolveMessagesFile">> = {
  provider: "react-intl",
  messagesPath: "src/locales/{locale}.json",
  messagesDir: "src/locales",
  localeFilePattern: "{locale}.json"
}

// Default batch sizing and throttling.
export const DEFAULT_BATCH: Required<BatchConfig> = {
  size: 20,
  delayMs: 0,
  localeConcurrency: 2
}

// Default watcher settings.
export const DEFAULT_WATCHER: Required<WatcherConfig> = {
  debounceMs: 200
}

// Default cleanup behavior.
export const DEFAULT_CLEANUP = {
  removeUnused: false
}

// Default token budget settings.
export const DEFAULT_BUDGET = {
  maxTokensPerRun: Number.POSITIVE_INFINITY,
  maxTokensPerLocale: Number.POSITIVE_INFINITY
}

// Provider -> env var mapping for API keys.
export const DEFAULT_LLM_API_KEY_ENV: Record<string, string> = {
  openai: "OPENAI_API_KEY",
  "openai-compatible": "OPENAI_COMPAT_API_KEY",
  google: "GEMINI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  mistral: "MISTRAL_API_KEY",
  cohere: "COHERE_API_KEY",
  groq: "GROQ_API_KEY",
  deepseek: "DEEPSEEK_API_KEY"
}
