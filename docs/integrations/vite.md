# Vite

Use the Vite plugin to run Interceptor during build and in dev watch mode.

## Install
```bash
pnpm add -D @wrkspace-co/interceptor
```

## Configure
```ts
import { defineConfig } from "vite";
import { interceptorVitePlugin } from "@wrkspace-co/interceptor/vite";

export default defineConfig({
  plugins: [interceptorVitePlugin({ configPath: "interceptor.config.ts" })]
});
```

## Notes
- The plugin loads `.env` from your project root.
- In dev mode it watches files and re-runs on changes.
