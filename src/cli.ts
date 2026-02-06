import path from "node:path";
import process from "node:process";
import { cac } from "cac";
import dotenv from "dotenv";
import { compileOnce } from "./compiler";
import { loadConfig } from "./config";
import { watchAndCompile } from "./watcher";

async function runCompile(options: { config?: string; cwd?: string } = {}) {
  const cwd = options.cwd ? path.resolve(options.cwd) : process.cwd();
  dotenv.config({ path: path.join(cwd, ".env") });
  const config = await loadConfig(options.config, cwd);
  await compileOnce(config, { cwd });
}

async function runWatch(options: { config?: string; cwd?: string } = {}) {
  const cwd = options.cwd ? path.resolve(options.cwd) : process.cwd();
  dotenv.config({ path: path.join(cwd, ".env") });
  const config = await loadConfig(options.config, cwd);
  const handle = await watchAndCompile(config, { cwd });

  const shutdown = async () => {
    await handle.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

const cli = cac("interceptor");

cli.option("-c, --config <path>", "Path to interceptor config file");
cli.option("--cwd <path>", "Working directory");

cli
  .command("compile", "Scan and translate once")
  .action(async (options) => {
    await runCompile(options ?? {});
  });

cli
  .command("watch", "Watch files and translate on change")
  .action(async (options) => {
    await runWatch(options ?? {});
  });

cli
  .command("", "Scan and translate once")
  .action(async (options) => {
    await runCompile(options ?? {});
  });

cli.help();
cli.parse();
