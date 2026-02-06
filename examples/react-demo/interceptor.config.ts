import type { InterceptorConfig } from "interceptor";

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
    functions: ["t"],
    taggedTemplates: [],
    reactIntl: {
      formatMessage: true,
      formattedMessage: true,
      defineMessages: true
    }
  },
  batch: {
    size: 10,
    delayMs: 0
  }
};

export default config;
