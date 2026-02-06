import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { interceptorVitePlugin } from "interceptor/vite";

export default defineConfig({
  plugins: [
    vue(),
    interceptorVitePlugin({
      configPath: "interceptor.config.ts"
    })
  ]
});
