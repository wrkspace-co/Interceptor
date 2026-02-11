import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import { interceptorVitePlugin } from "@wrkspace-co/interceptor/vite";

export default defineConfig({
  plugins: [
    solid(),
    interceptorVitePlugin({
      configPath: "interceptor.config.ts"
    })
  ]
});
