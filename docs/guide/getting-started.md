# Quick Start

This guide gets Interceptor running in a typical JavaScript or TypeScript project.

## 1. Install
```bash
pnpm add -D @wrkspace-co/interceptor
```

## 2. Add environment variables
Create a `.env` in your project root:
```bash
OPENAI_API_KEY=sk-your-real-key
```

If you use another provider, set the corresponding env var. See [LLM Providers](/guide/llm-providers).

## 3. Create a config
```ts
import type { InterceptorConfig } from "@wrkspace-co/interceptor";

const config: InterceptorConfig = {
  locales: ["en", "fr"],
  defaultLocale: "en",
  llm: {
    provider: "openai",
    model: "gpt-4o-mini",
    apiKeyEnv: "OPENAI_API_KEY"
  },
  i18n: {
    messagesPath: "src/locales/{locale}.json"
  }
};

export default config;
```

Save as `interceptor.config.ts` in your project root.

## 4. Run
```bash
pnpm interceptor
```

Interceptor will scan your code and update locale files at the configured path.

## 5. Integrate with your build
- For Vite projects, see [Vite Integration](/integrations/vite).
- For Webpack and Next.js, see [Webpack Integration](/integrations/webpack) and [Next.js Integration](/integrations/next).

## Troubleshooting
- If no strings are found, confirm your `include` patterns and extractor settings.
- If translations are missing, verify the locale file paths and `.env` keys.
