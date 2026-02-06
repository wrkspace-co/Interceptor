import path from "node:path";
import dotenv from "dotenv";
import { compileOnce } from "../compiler";
import { loadConfig } from "../config";
import { watchAndCompile, WatchHandle } from "../watcher";

export interface InterceptorWebpackPluginOptions {
  configPath?: string;
  cwd?: string;
  watch?: boolean;
}

export class InterceptorWebpackPlugin {
  private options: InterceptorWebpackPluginOptions;
  private watcher: WatchHandle | null = null;
  private compiling = false;

  constructor(options: InterceptorWebpackPluginOptions = {}) {
    this.options = options;
  }

  apply(compiler: any) {
    const getCwd = () => this.options.cwd ?? compiler.context ?? process.cwd();

    const runOnce = async () => {
      if (this.compiling) return;
      this.compiling = true;
      try {
        const cwd = getCwd();
        dotenv.config({ path: path.join(cwd, ".env") });
        const config = await loadConfig(this.options.configPath, cwd);
        await compileOnce(config, { cwd });
      } finally {
        this.compiling = false;
      }
    };

    const startWatch = async () => {
      if (this.watcher || this.options.watch === false) return;
      const cwd = getCwd();
      dotenv.config({ path: path.join(cwd, ".env") });
      const config = await loadConfig(this.options.configPath, cwd);
      this.watcher = await watchAndCompile(config, { cwd });
    };

    tapHook(compiler.hooks.beforeRun, "InterceptorWebpackPlugin", async () => {
      if (!compiler.watchMode) {
        await runOnce();
      }
    });

    tapHook(compiler.hooks.watchRun, "InterceptorWebpackPlugin", async () => {
      await startWatch();
    });

    const closeWatcher = async () => {
      if (this.watcher) {
        await this.watcher.close();
        this.watcher = null;
      }
    };

    if (compiler.hooks.watchClose) {
      tapHook(compiler.hooks.watchClose, "InterceptorWebpackPlugin", closeWatcher);
    }
    if (compiler.hooks.shutdown) {
      tapHook(compiler.hooks.shutdown, "InterceptorWebpackPlugin", closeWatcher);
    }
  }
}

function tapHook(
  hook: any,
  name: string,
  handler: () => Promise<void>
): void {
  if (!hook) return;
  const ctorName = hook.constructor?.name ?? "";
  const isAsync = ctorName.includes("Async");

  if (isAsync && typeof hook.tapPromise === "function") {
    hook.tapPromise(name, handler);
    return;
  }

  if (isAsync && typeof hook.tapAsync === "function") {
    hook.tapAsync(name, (_: any, callback: (error?: Error) => void) => {
      Promise.resolve(handler()).then(() => callback()).catch(callback);
    });
    return;
  }

  if (typeof hook.tap === "function") {
    hook.tap(name, () => {
      void handler();
    });
  }
}
