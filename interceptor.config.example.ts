import type { InterceptorConfig } from "./src/types";

const config: InterceptorConfig = {
  locales: ["en", "es"],
  defaultLocale: "en",
  llm: {
    provider: "openai", // openai | openai-compatible | google | anthropic | mistral | cohere | groq | deepseek
    model: "gpt-4o-mini",
    apiKeyEnv: "OPENAI_API_KEY"
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
      functions: [],
      memberFunctions: ["t", "$t"],
      objects: ["i18n", "$i18n", "i18nGlobal", "i18nInstance", "this"],
      keyAsDefault: true
    }
  },
  batch: {
    size: 20,
    delayMs: 0
  },
  cleanup: {
    removeUnused: false
  }
};

export default config;
