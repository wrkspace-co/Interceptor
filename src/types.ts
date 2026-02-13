export type LlmProvider =
  | "openai"
  | "openai-compatible"
  | "google"
  | "anthropic"
  | "mistral"
  | "cohere"
  | "groq"
  | "deepseek";
export type I18nProvider = "react-intl";

export interface ReactIntlExtractorConfig {
  formatMessage?: boolean;
  formattedMessage?: boolean;
  defineMessages?: boolean;
}

export interface I18nextExtractorConfig {
  enabled?: boolean;
  functions?: string[];
  memberFunctions?: string[];
  objects?: string[];
  useDefaultValue?: boolean;
  keyAsDefault?: boolean;
  transComponent?: boolean;
}

export interface VueI18nExtractorConfig {
  enabled?: boolean;
  functions?: string[];
  memberFunctions?: string[];
  objects?: string[];
  keyAsDefault?: boolean;
}

export interface ExtractorConfig {
  functions?: string[];
  taggedTemplates?: string[];
  reactIntl?: ReactIntlExtractorConfig;
  i18next?: I18nextExtractorConfig;
  vueI18n?: VueI18nExtractorConfig;
}

export interface NormalizedExtractorConfig {
  functions: string[];
  taggedTemplates: string[];
  reactIntl: {
    formatMessage: boolean;
    formattedMessage: boolean;
    defineMessages: boolean;
  };
  i18next: {
    enabled: boolean;
    functions: string[];
    memberFunctions: string[];
    objects: string[];
    useDefaultValue: boolean;
    keyAsDefault: boolean;
    transComponent: boolean;
  };
  vueI18n: {
    enabled: boolean;
    functions: string[];
    memberFunctions: string[];
    objects: string[];
    keyAsDefault: boolean;
  };
}

export interface I18nConfig {
  provider?: I18nProvider;
  messagesPath?: string;
  messagesDir?: string;
  localeFilePattern?: string;
  resolveMessagesFile?: (locale: string) => string;
}

export interface LlmConfig {
  provider: LlmProvider;
  model: string;
  apiKeyEnv?: string;
  baseUrl?: string;
  temperature?: number;
  fallbacks?: LlmFallbackConfig[];
  retries?: number;
  retryDelayMs?: number;
  retryMaxDelayMs?: number;
}

export interface LlmFallbackConfig {
  provider: LlmProvider;
  model?: string;
  apiKeyEnv?: string;
  baseUrl?: string;
  temperature?: number;
}

export interface BatchConfig {
  size?: number;
  delayMs?: number;
  localeConcurrency?: number;
}

export interface BudgetConfig {
  maxTokensPerRun?: number;
  maxTokensPerLocale?: number;
}

export interface WatcherConfig {
  debounceMs?: number;
}

export interface CleanupConfig {
  removeUnused?: boolean;
  transientKeyWindowMs?: number;
}

export interface InterceptorConfig {
  rootDir?: string;
  include?: string[];
  exclude?: string[];
  locales: string[];
  defaultLocale: string;
  extractor?: ExtractorConfig;
  i18n?: I18nConfig;
  llm: LlmConfig;
  batch?: BatchConfig;
  watcher?: WatcherConfig;
  cleanup?: CleanupConfig;
  budget?: BudgetConfig;
}

export type ExtractedMessageOrigin =
  | "function"
  | "tag"
  | "formatMessage"
  | "formattedMessage"
  | "defineMessages"
  | "i18next"
  | "vueI18n"
  | "trans";

export interface ExtractedMessage {
  key: string;
  source: string;
  origin: ExtractedMessageOrigin;
}

export interface NormalizedConfig {
  rootDir: string;
  include: string[];
  exclude: string[];
  locales: string[];
  defaultLocale: string;
  extractor: NormalizedExtractorConfig;
  i18n: Required<Omit<I18nConfig, "resolveMessagesFile">> & {
    resolveMessagesFile?: (locale: string) => string;
  };
  llm: {
    provider: LlmProvider;
    model: string;
    apiKeyEnv: string;
    baseUrl?: string;
    temperature?: number;
    fallbacks: Array<Required<Omit<LlmFallbackConfig, "baseUrl" | "temperature">> & {
      baseUrl?: string;
      temperature?: number;
    }>;
    retries: number;
    retryDelayMs: number;
    retryMaxDelayMs: number;
  };
  batch: Required<BatchConfig>;
  watcher: Required<WatcherConfig>;
  cleanup: Required<CleanupConfig>;
  budget: Required<BudgetConfig>;
}

export type CompileMode = "write" | "dry-run" | "check";

export interface LocaleDiffReport {
  locale: string;
  file: string;
  addedKeys: string[];
  removedKeys: string[];
  addedCount: number;
  removedCount: number;
  changed: boolean;
  preview?: string;
}

export interface CompileReport {
  mode: CompileMode;
  extractedCount: number;
  updatedLocales: string[];
  skippedLocales: string[];
  locales: LocaleDiffReport[];
  summary: {
    filesChanged: number;
    keysAdded: number;
    keysRemoved: number;
  };
  generatedAt: string;
}

export interface CompileResult {
  extractedCount: number;
  updatedLocales: string[];
  skippedLocales: string[];
  report?: CompileReport;
}

export interface Logger {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
}
