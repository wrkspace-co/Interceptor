import { defineConfig } from "astro/config";
import { interceptorVitePlugin } from "@wrkspace-co/interceptor/vite";

export default defineConfig({
  vite: {
    plugins: [interceptorVitePlugin({ configPath: "interceptor.config.ts" })]
  }
});
