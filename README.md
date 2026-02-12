# Interceptor

Interceptor is an on-demand translation compiler that scans your code for translation calls, translates missing strings via an LLM, and writes them into your i18n message files. It keeps translation management aligned with how teams actually ship software: by extracting from source, preserving manual edits, and generating only what’s missing.

**Docs:** [https://wrkspace-co.github.io/Interceptor/](https://wrkspace-co.github.io/Interceptor/)

## Benefits
- **Eliminate manual file edits.** As you code, Interceptor finds `t("...")` calls and fills in missing translations for each locale. You only review and refine the output, not copy‑paste strings across files.
- **Add languages without rework.** Have 300+ existing strings? Just add a new locale in the config. Interceptor will generate the new language from your source code and existing base locale.
- **Keep locale files clean.** Enable unused‑key cleanup to remove stale translations and avoid bloated message catalogs.

## Features
- Auto scan and translate missing keys with LLMs
- Works with popular i18n libraries (react-intl, i18next, vue-i18n) and custom `t()` calls
- Never overwrites existing translations
- Watch mode and batching
- TypeScript-first

## Install
```bash
pnpm add -D @wrkspace-co/interceptor
```

## Quick start
1. Create `interceptor.config.ts`:
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
2. Add `.env`:
```bash
OPENAI_API_KEY=sk-your-real-key
```
3. Run:
```bash
pnpm interceptor
```

## Examples
Vite:
```ts
import { defineConfig } from "vite";
import { interceptorVitePlugin } from "@wrkspace-co/interceptor/vite";

export default defineConfig({
  plugins: [interceptorVitePlugin({ configPath: "interceptor.config.ts" })]
});
```

Webpack:
```js
const { InterceptorWebpackPlugin } = require("@wrkspace-co/interceptor/webpack");

module.exports = {
  plugins: [new InterceptorWebpackPlugin({ configPath: "interceptor.config.ts" })]
};
```

## LLMs
Supports OpenAI, Gemini, Claude, Mistral, Cohere, Groq, DeepSeek, and OpenAI-compatible providers. See docs for configuration examples.

## Learn more
[Full documentation](https://wrkspace-co.github.io/Interceptor/)

**Credits**
Interceptor is a part of [Wrkspace Co.](https://wrkspace.co) &copy; group.
