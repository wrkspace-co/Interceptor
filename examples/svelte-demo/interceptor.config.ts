import type { InterceptorConfig } from "@wrkspace-co/interceptor";

const config: InterceptorConfig = {
  locales: ["en", "es"],
  defaultLocale: "en",
  llm: {
    provider: "google",
    model: "gemini-2.5-flash-lite",
    apiKeyEnv: "GEMINI_API_KEY"
  },
  i18n: {
    messagesPath: "src/locales/{locale}.json"
  },
  extractor: {
    functions: ["t"],
    taggedTemplates: []
  },
  batch: {
    size: 10,
    delayMs: 0,
    localeConcurrency: 2
  }
};

export default config;
