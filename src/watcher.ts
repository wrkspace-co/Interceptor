import chokidar from "chokidar";
import { normalizeConfig } from "./config";
import { compileOnce } from "./compiler";
import { InterceptorConfig, Logger } from "./types";

export interface WatchHandle {
  close: () => Promise<void>;
}

export async function watchAndCompile(
  config: InterceptorConfig,
  options: { cwd?: string; logger?: Logger } = {}
): Promise<WatchHandle> {
  const logger = options.logger ?? console;
  const normalized = normalizeConfig(config, options.cwd);

  let debounceTimer: NodeJS.Timeout | null = null;
  let running = false;
  let pending = false;

  const runCompile = async () => {
    if (running) {
      pending = true;
      return;
    }

    running = true;
    try {
      await compileOnce(config, options);
    } catch (error) {
      logger.error(
        `Interceptor: compile failed - ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      running = false;
      if (pending) {
        pending = false;
        await runCompile();
      }
    }
  };

  const schedule = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      void runCompile();
    }, normalized.watcher.debounceMs);
  };

  const watcher = chokidar.watch(normalized.include, {
    cwd: normalized.rootDir,
    ignored: normalized.exclude,
    ignoreInitial: true
  });

  watcher.on("add", schedule);
  watcher.on("change", schedule);
  watcher.on("unlink", schedule);

  logger.info("Interceptor: watching for changes...");
  await runCompile();

  return {
    close: async () => {
      await watcher.close();
    }
  };
}
