# Overview

Interceptor is a translation compiler that keeps your i18n message files up to date. It scans your source code, finds translation strings, translates missing keys using an LLM, and writes updates to your locale files.

## Installation
```bash
pnpm add -D @wrkspace-co/interceptor
```

## Quick start
1. Add a config file in your project root.
2. Add your LLM API key to `.env`.
3. Run the CLI or integrate with your build tool.

Example config:
```ts
import type { InterceptorConfig } from "@wrkspace-co/interceptor";

const config: InterceptorConfig = {
  locales: ["en", "es"],
  defaultLocale: "en",
  llm: {
    provider: "openai",
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
    }
  },
  batch: {
    size: 20,
    delayMs: 0
  }
};

export default config;
```

## Environment
Create a `.env` file in your project root:

OpenAI:
```bash
OPENAI_API_KEY=sk-your-real-key
```

Google AI (Gemini):
```bash
GEMINI_API_KEY=your-google-ai-key
```

If you use a different variable name, set `llm.apiKeyEnv` in the config. See the LLM Providers page for other keys.

## Supported frameworks
- Vite-based stacks (Vue, SvelteKit, SolidStart, Astro, Nuxt 3)
- Webpack-based stacks (Next.js, CRA, Gatsby)

## Supported extractors
- react-intl (`formatMessage`, `FormattedMessage`, `defineMessages`)
- i18next (`t`, `i18n.t`, `Trans`)
- vue-i18n (`t`, `$t` in script blocks)

## Supported LLMs
- OpenAI
- OpenAI-compatible
- Google (Gemini)
- Anthropic (Claude)
- Mistral
- Cohere
- Groq
- DeepSeek
