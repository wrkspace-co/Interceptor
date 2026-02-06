import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts", "src/plugins/vite.ts", "src/plugins/webpack.ts"],
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    clean: true,
    splitting: false,
    target: "node18",
    outDir: "dist",
    outExtension: ({ format }) => ({ js: format === "cjs" ? ".cjs" : ".js" })
  },
  {
    entry: ["src/cli.ts"],
    format: ["esm"],
    dts: false,
    sourcemap: true,
    clean: false,
    splitting: false,
    target: "node18",
    outDir: "dist",
    banner: { js: "#!/usr/bin/env node" }
  }
]);
