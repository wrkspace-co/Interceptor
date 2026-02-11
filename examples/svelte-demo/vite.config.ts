import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { interceptorVitePlugin } from "@wrkspace-co/interceptor/vite";

export default defineConfig({
  plugins: [
    svelte(),
    interceptorVitePlugin({
      configPath: "interceptor.config.ts"
    })
  ]
});
