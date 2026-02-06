import path from "node:path";
import type { Plugin } from "vite";
import dotenv from "dotenv";
import { compileOnce } from "../compiler";
import { loadConfig } from "../config";
import { watchAndCompile, WatchHandle } from "../watcher";

export interface InterceptorVitePluginOptions {
  configPath?: string;
  cwd?: string;
  watch?: boolean;
}

export function interceptorVitePlugin(
  options: InterceptorVitePluginOptions = {}
): Plugin {
  let watcher: WatchHandle | null = null;
  let command: "serve" | "build" = "build";
  let resolvedCwd = options.cwd ?? process.cwd();

  const runOnce = async () => {
    dotenv.config({ path: path.join(resolvedCwd, ".env") });
    const config = await loadConfig(options.configPath, resolvedCwd);
    await compileOnce(config, { cwd: resolvedCwd });
  };

  const startWatch = async () => {
    if (watcher) return;
    dotenv.config({ path: path.join(resolvedCwd, ".env") });
    const config = await loadConfig(options.configPath, resolvedCwd);
    watcher = await watchAndCompile(config, { cwd: resolvedCwd });
  };

  return {
    name: "interceptor",
    configResolved(config) {
      command = config.command;
      resolvedCwd = options.cwd ?? config.root ?? process.cwd();
    },
    async buildStart() {
      if (command === "build") {
        await runOnce();
      }
    },
    async configureServer(server) {
      if (options.watch === false) {
        return;
      }
      await startWatch();
      server.httpServer?.once("close", () => {
        void watcher?.close();
        watcher = null;
      });
    },
    async closeBundle() {
      if (watcher) {
        await watcher.close();
        watcher = null;
      }
    }
  };
}
