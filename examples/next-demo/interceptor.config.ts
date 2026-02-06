import type { InterceptorConfig } from "interceptor";

const config: InterceptorConfig = {
  locales: ["en", "es"],
  defaultLocale: "en",
  include: ["app/**/*.{ts,tsx,js,jsx}", "src/**/*.{ts,tsx,js,jsx}"],
  llm: {
    provider: "google",
    model: "gemini-2.5-flash-lite",
    apiKeyEnv: "GOOGLEAI_API_KEY"
  },
  i18n: {
    messagesPath: "src/locales/{locale}.json"
  },
  extractor: {
    functions: ["t"],
    taggedTemplates: [],
    reactIntl: {
      formatMessage: false,
      formattedMessage: false,
      defineMessages: false
    },
    i18next: {
      enabled: true,
      functions: ["t"],
      memberFunctions: ["t"],
      objects: ["i18n", "i18next"],
      useDefaultValue: true,
      keyAsDefault: true,
      transComponent: true
    }
  },
  batch: {
    size: 10,
    delayMs: 0
  }
};

export default config;
