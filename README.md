# Interceptor

Interceptor is an on-demand translation compiler that scans your code for translation calls, translates missing strings via an LLM, and writes them into your i18n message files.

**Docs:** [https://wrkspace-co.github.io/Interceptor/](https://wrkspace-co.github.io/Interceptor/)

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
