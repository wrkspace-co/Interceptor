import fs from "node:fs/promises";
import path from "node:path";
import jiti from "jiti";
import {
  InterceptorConfig,
  NormalizedConfig,
  BatchConfig,
  WatcherConfig,
  I18nConfig,
  NormalizedExtractorConfig
} from "./types";

const DEFAULT_CONFIG_NAMES = [
  "interceptor.config.ts",
  "interceptor.config.js",
  "interceptor.config.cjs",
  "interceptor.config.mjs",
  "interceptor.config.json"
];

const DEFAULT_INCLUDE = ["src/**/*.{js,jsx,ts,tsx,vue,svelte,astro}"];
const DEFAULT_EXCLUDE = [
  "**/node_modules/**",
  "**/dist/**",
  "**/build/**",
  "**/.next/**",
  "**/coverage/**"
];

const DEFAULT_EXTRACTOR: NormalizedExtractorConfig = {
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
};

const DEFAULT_I18N: Required<Omit<I18nConfig, "resolveMessagesFile">> = {
  provider: "react-intl",
  messagesPath: "src/locales/{locale}.json",
  messagesDir: "src/locales",
  localeFilePattern: "{locale}.json"
};

const DEFAULT_BATCH: Required<BatchConfig> = {
  size: 20,
  delayMs: 0,
  localeConcurrency: 2
};

const DEFAULT_WATCHER: Required<WatcherConfig> = {
  debounceMs: 200
};

const DEFAULT_CLEANUP = {
  removeUnused: false
};

const DEFAULT_BUDGET = {
  maxTokensPerRun: Number.POSITIVE_INFINITY,
  maxTokensPerLocale: Number.POSITIVE_INFINITY
};

export async function loadConfig(
  explicitPath?: string,
  cwd: string = process.cwd()
): Promise<InterceptorConfig> {
  const configPath = explicitPath
    ? path.resolve(cwd, explicitPath)
    : await findConfigFile(cwd);

  if (!configPath) {
    throw new Error(
      `No interceptor config found. Create one of: ${DEFAULT_CONFIG_NAMES.join(
        ", "
      )}`
    );
  }

  if (configPath.endsWith(".json")) {
    const raw = await fs.readFile(configPath, "utf8");
    return JSON.parse(raw) as InterceptorConfig;
  }

  const loader = jiti(configPath, { interopDefault: true, esmResolve: true });
  const loaded = loader(configPath) as InterceptorConfig | { default: InterceptorConfig };
  return (loaded as { default?: InterceptorConfig }).default ?? (loaded as InterceptorConfig);
}

export function normalizeConfig(
  config: InterceptorConfig,
  cwd: string = process.cwd()
): NormalizedConfig {
  if (!config || !Array.isArray(config.locales) || config.locales.length === 0) {
    throw new Error("config.locales is required and must be a non-empty array.");
  }
  if (!config.defaultLocale) {
    throw new Error("config.defaultLocale is required.");
  }
  if (!config.llm?.model) {
    throw new Error("config.llm.model is required.");
  }
  if (!config.llm?.provider) {
    throw new Error("config.llm.provider is required.");
  }

  const rootDir = path.resolve(cwd, config.rootDir ?? ".");
  const defaultLocale = config.defaultLocale;

  const extractor: NormalizedExtractorConfig = {
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
        config.extractor?.i18next?.keyAsDefault ?? DEFAULT_EXTRACTOR.i18next.keyAsDefault,
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
  };

  const i18n = {
    ...DEFAULT_I18N,
    ...(config.i18n ?? {})
  };

  const llmProvider = config.llm.provider;
  const defaultApiKeyEnv: Record<string, string> = {
    openai: "OPENAI_API_KEY",
    "openai-compatible": "OPENAI_COMPAT_API_KEY",
    google: "GEMINI_API_KEY",
    anthropic: "ANTHROPIC_API_KEY",
    mistral: "MISTRAL_API_KEY",
    cohere: "COHERE_API_KEY",
    groq: "GROQ_API_KEY",
    deepseek: "DEEPSEEK_API_KEY"
  };
  const fallbackConfigs = config.llm.fallbacks ?? [];
  let normalizedFallbacks = fallbackConfigs.map((fallback) => {
    if (!fallback?.provider) {
      throw new Error("config.llm.fallbacks must include a provider.");
    }
    const model = fallback.model ?? config.llm.model;
    return {
      provider: fallback.provider,
      model,
      apiKeyEnv: fallback.apiKeyEnv ?? defaultApiKeyEnv[fallback.provider],
      baseUrl: fallback.baseUrl,
      temperature: fallback.temperature
    };
  });

  const llm = {
    provider: llmProvider,
    model: config.llm.model,
    apiKeyEnv: config.llm.apiKeyEnv ?? defaultApiKeyEnv[llmProvider],
    baseUrl: config.llm.baseUrl,
    temperature: config.llm.temperature,
    fallbacks: normalizedFallbacks,
    retries: config.llm.retries ?? 2,
    retryDelayMs: config.llm.retryDelayMs ?? 500,
    retryMaxDelayMs: config.llm.retryMaxDelayMs ?? 4000
  };

  const batch = {
    ...DEFAULT_BATCH,
    ...(config.batch ?? {})
  };

  const watcher = {
    ...DEFAULT_WATCHER,
    ...(config.watcher ?? {})
  };

  const cleanup = {
    ...DEFAULT_CLEANUP,
    ...(config.cleanup ?? {})
  };

  const budget = {
    ...DEFAULT_BUDGET,
    ...(config.budget ?? {})
  };

  return {
    rootDir,
    include: config.include ?? DEFAULT_INCLUDE,
    exclude: config.exclude ?? DEFAULT_EXCLUDE,
    locales: config.locales,
    defaultLocale,
    extractor,
    i18n,
    llm,
    batch,
    watcher,
    cleanup,
    budget
  };
}

export function resolveMessagesFile(config: NormalizedConfig, locale: string): string {
  if (config.i18n.resolveMessagesFile) {
    return path.resolve(config.rootDir, config.i18n.resolveMessagesFile(locale));
  }

  const messagesPath = config.i18n.messagesPath
    ? config.i18n.messagesPath
    : path.join(config.i18n.messagesDir, config.i18n.localeFilePattern);

  const resolved = messagesPath.replace("{locale}", locale);
  return path.resolve(config.rootDir, resolved);
}

async function findConfigFile(startDir: string): Promise<string | undefined> {
  let dir = path.resolve(startDir);

  while (true) {
    for (const name of DEFAULT_CONFIG_NAMES) {
      const candidate = path.join(dir, name);
      if (await exists(candidate)) {
        return candidate;
      }
    }

    const parent = path.dirname(dir);
    if (parent === dir) {
      return undefined;
    }
    dir = parent;
  }
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
