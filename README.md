# Interceptor

Interceptor is an on-demand translation compiler that scans your code for translation calls, translates missing strings via an LLM, and writes them into your i18n message files.

## Features
- Auto scan code and translate strings using an LLM
- React-intl, i18next, and Vue i18n extraction (extensible)
- Never overwrite existing translations (your manual fixes stay intact)
- Configurable locales, model, and file layout
- ENV-based API key loading
- Batch translation to avoid overloads
- Watch mode for continuous compilation
- TypeScript-first

## Install
```bash
pnpm add -D @wrkspace-co/interceptor
```

## Environment
Create a `.env` file at the project root (same folder where you run the CLI or your bundler) and add your real API key.

OpenAI:
```bash
OPENAI_API_KEY=sk-your-real-key
```

Google AI (Gemini):
```bash
GEMINI_API_KEY=your-google-ai-key
```

If you use a different environment variable name, set `llm.apiKeyEnv` in the config and put that key name in `.env`.

## Quick start
1. Create `interceptor.config.ts`.
2. Run:
```bash
pnpm interceptor
```

## Example config
```ts
import type { InterceptorConfig } from "@wrkspace-co/interceptor";

const config: InterceptorConfig = {
  locales: ["en", "fr"],
  defaultLocale: "en",
  llm: {
    provider: "openai", // or "google"
    model: "gpt-4o-mini",
    apiKeyEnv: "OPENAI_API_KEY"
  },
  i18n: {
    // Align with your i18n messages path
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

## Config formats
Interceptor loads (in order) `interceptor.config.ts/js/cjs/mjs/json` from the current directory or any parent directory.

## LLM providers
Supported providers today:
- `openai`
- `google` (Gemini)

Example for Google AI:
```ts
llm: {
  provider: "google",
  model: "gemini-1.5-flash",
  apiKeyEnv: "GEMINI_API_KEY"
}
```

## CLI
```bash
interceptor               # run once
interceptor compile       # run once
interceptor watch         # watch and re-run on change
interceptor --config path/to/config.ts
interceptor --cwd path/to/project
```

## Vite
Interceptor’s Vite plugin runs the compiler at build time and (by default) in dev watch mode.
```ts
import { defineConfig } from "vite";
import { interceptorVitePlugin } from "@wrkspace-co/interceptor/vite";

export default defineConfig({
  plugins: [interceptorVitePlugin({ configPath: "interceptor.config.ts" })]
});
```

## Webpack
Interceptor’s Webpack plugin runs the compiler before build and in watch mode when Webpack runs with `watch`.
```js
const { InterceptorWebpackPlugin } = require("@wrkspace-co/interceptor/webpack");

module.exports = {
  plugins: [new InterceptorWebpackPlugin({ configPath: "interceptor.config.ts" })]
};
```

## How It Works
1. **Scan**: Interceptor parses your source files and collects translatable strings from:
   - `t("...")` calls (i18next, vue-i18n, or your custom function)
   - `intl.formatMessage({ id, defaultMessage })`
   - `<FormattedMessage id="..." defaultMessage="..." />`
   - `defineMessages({ key: { id, defaultMessage } })`
   - `i18n.t("key", "Default")` and `t("key", { defaultValue })`
   - `<Trans i18nKey="key">Default</Trans>` (react-i18next)
2. **Diff**: It reads your existing locale JSON files and keeps any keys already present.
3. **Translate**: Only missing keys are sent to the LLM (batched to avoid overload).
4. **Write**: It writes/updates the locale JSON files with new keys only (existing translations remain untouched).

## Notes
- Extraction is string-literal only (e.g. `t('Hello')` or `defaultMessage: "Hello"`).
- When an `id` is present, it becomes the translation key. Otherwise the `defaultMessage` is used as the key.
- Only missing keys are sent to the LLM; existing translations are left untouched.
- For non-default locales, Interceptor prefers the default-locale file value as the translation source when available.
- Interceptor writes flat JSON objects. Nested or namespaced formats are not supported in v0.1.
- For custom file layouts, set `i18n.messagesPath` or `i18n.resolveMessagesFile`.
- For `.vue` files, only `<script>` blocks are parsed (template extraction is not implemented yet).

## Roadmap ideas
- Pluralization-aware translation

**Credits**
Interceptor is a part of [Wrkspace Co.](https://wrkspace.co) &copy; group.
