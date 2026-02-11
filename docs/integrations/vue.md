# Vue

If your Vue app uses Vite, integrate Interceptor through the Vite plugin.

## Install
```bash
pnpm add -D @wrkspace-co/interceptor
```

## Configure
```ts
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { interceptorVitePlugin } from "@wrkspace-co/interceptor/vite";

export default defineConfig({
  plugins: [
    vue(),
    interceptorVitePlugin({
      configPath: "interceptor.config.ts"
    })
  ]
});
```

## Notes
- The plugin loads `.env` from your project root.
- Vue SFCs are scanned across `<script>`, `<template>`, and `<i18n>` blocks.
- Interceptor outputs flat JSON keys, so set `flatJson: true` in `createI18n` if you use dotted keys.
