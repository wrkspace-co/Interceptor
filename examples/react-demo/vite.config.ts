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
