import type { InterceptorConfig } from "@wrkspace-co/interceptor";

const config: InterceptorConfig = {
  locales: ["en", "es"],
  defaultLocale: "en",
  llm: {
    provider: "google",
    model: "gemini-2.5-flash-lite",
    apiKeyEnv: "GOOGLEAI_API_KEY"
  },
  i18n: {
    messagesPath: "src/locales/{locale}.json"
  },
  extractor: {
    functions: [],
    taggedTemplates: [],
    reactIntl: {
      formatMessage: false,
      formattedMessage: false,
      defineMessages: false
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
    size: 10,
    delayMs: 0
  }
};

export default config;
