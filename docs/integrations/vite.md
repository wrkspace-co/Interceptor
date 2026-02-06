# Vite

Interceptor integrates with Vite via a plugin that runs the compiler at build time and in dev watch mode.

## Install
```bash
pnpm add -D interceptor
```

## Configure
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { interceptorVitePlugin } from "interceptor/vite";

export default defineConfig({
  plugins: [
    react(),
    interceptorVitePlugin({
      configPath: "interceptor.config.ts"
    })
  ]
});
```

## Notes
- The plugin will load `.env` from your project root.
- Set `watch: false` if you want to disable watch mode in dev.
