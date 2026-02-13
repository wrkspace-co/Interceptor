import type { InterceptorConfig } from "./src/types";

const config: InterceptorConfig = {
  locales: ["en", "es"],
  defaultLocale: "en",
  llm: {
    provider: "openai", // openai | openai-compatible | google | anthropic | mistral | cohere | groq | deepseek
    model: "gpt-4o-mini",
    apiKeyEnv: "OPENAI_API_KEY",
    fallbacks: [
      {
        provider: "anthropic",
        model: "claude-3-5-sonnet-20240620",
        apiKeyEnv: "ANTHROPIC_API_KEY"
      },
      {
        provider: "google",
        model: "gemini-1.5-pro",
        apiKeyEnv: "GEMINI_API_KEY"
      }
    ],
    retries: 2,
    retryDelayMs: 500,
    retryMaxDelayMs: 4000
  },
  i18n: {
    messagesPath: "src/locales/{locale}.json"
  },
  extractor: {
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
  },
  batch: {
    size: 20,
    delayMs: 0,
    localeConcurrency: 2
  },
  budget: {
    maxTokensPerRun: 6000,
    maxTokensPerLocale: 2000
  },
  cleanup: {
    removeUnused: false,
    transientKeyWindowMs: 5 * 60 * 1000
  }
};

export default config;
