import path from "node:path";
import process from "node:process";
import fs from "node:fs/promises";
import { cac } from "cac";
import dotenv from "dotenv";
import { compileOnce } from "./compiler";
import { loadConfig } from "./config";
import { watchAndCompile } from "./watcher";
import type { CompileReport, CompileMode } from "./types";

interface RunOptions {
  config?: string;
  cwd?: string;
  mode?: CompileMode;
  reportPath?: string;
  diffPreview?: boolean;
}

// Run a single compile cycle with optional reporting.
async function runCompile(options: RunOptions = {}) {
  const cwd = options.cwd ? path.resolve(options.cwd) : process.cwd();
  dotenv.config({ path: path.join(cwd, ".env") });
  const config = await loadConfig(options.config, cwd);
  const mode = options.mode ?? "write";
  const result = await compileOnce(config, {
    cwd,
    mode,
    diffPreview: options.diffPreview
  });

  const shouldPrintReport =
    mode !== "write" || options.diffPreview || Boolean(options.reportPath);

  if (result.report && shouldPrintReport) {
    printReport(result.report, { cwd });
  }

  if (options.reportPath && result.report) {
    const reportPath = path.resolve(cwd, options.reportPath);
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(result.report, null, 2), "utf8");
  }

  if (mode === "check" && result.report?.summary.filesChanged) {
    process.exit(1);
  }
}

// Start watch mode and re-run compiles on file changes.
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
cli.option("--dry-run", "Run without writing locale files");
cli.option("--diff", "Show per-file diff preview");
cli.option("--report <path>", "Write a JSON report to the given path");

cli
  .command("compile", "Scan and translate once")
  .action(async (options) => {
    await runCompile({
      config: options?.config,
      cwd: options?.cwd,
      mode: options?.dryRun ? "dry-run" : "write",
      diffPreview: options?.diff,
      reportPath: options?.report
    });
  });

cli
  .command("watch", "Watch files and translate on change")
  .action(async (options) => {
    await runWatch(options ?? {});
  });

cli
  .command("check", "Diff-only run for CI (no files written)")
  .action(async (options) => {
    await runCompile({
      config: options?.config,
      cwd: options?.cwd,
      mode: "check",
      diffPreview: options?.diff ?? true,
      reportPath: options?.report
    });
  });

cli
  .command("", "Scan and translate once")
  .action(async (options) => {
    await runCompile({
      config: options?.config,
      cwd: options?.cwd,
      mode: options?.dryRun ? "dry-run" : "write",
      diffPreview: options?.diff,
      reportPath: options?.report
    });
  });

cli.help();
cli.parse();

// Render a human-friendly report to stdout.
function printReport(report: CompileReport, options: { cwd: string }) {
  const color = createColor();
  const { summary } = report;
  const changed = summary.filesChanged > 0;

  if (report.mode === "check") {
    const headline = changed
      ? color.red("Interceptor check failed.")
      : color.green("Interceptor check passed.");
    console.log(headline);
  } else if (report.mode === "dry-run") {
    console.log(color.yellow("Interceptor dry run complete (no files written)."));
  }

  if (!changed) {
    console.log(color.green("No locale changes detected."));
    return;
  }

  console.log(
    color.yellow(
      `Pending changes: ${summary.filesChanged} file(s), +${summary.keysAdded} -${summary.keysRemoved}`
    )
  );

  for (const locale of report.locales) {
    if (!locale.changed) continue;
    const relativePath = path.relative(options.cwd, locale.file);
    const header = `${locale.locale} · ${relativePath}`;
    console.log(color.cyan(header));
    console.log(
      `  +${locale.addedCount} -${locale.removedCount}`
    );

    if (locale.preview) {
      const lines = locale.preview.split("\n");
      for (const line of lines) {
        console.log(`  ${colorizeDiffLine(line, color)}`);
      }
    }
  }

  if (report.mode === "check") {
    console.log(color.yellow('Run "pnpm interceptor" to apply changes.'));
  } else if (report.mode === "dry-run") {
    console.log(color.yellow('Run "pnpm interceptor" to apply changes.'));
  }
}

// Build ANSI color helpers with NO_COLOR support.
function createColor() {
  const enabled = process.stdout.isTTY && process.env.NO_COLOR !== "1";
  const wrap = (code: number) => (value: string) =>
    enabled ? `\u001b[${code}m${value}\u001b[0m` : value;

  return {
    red: wrap(31),
    green: wrap(32),
    yellow: wrap(33),
    cyan: wrap(36),
    gray: wrap(90)
  };
}

// Apply color to diff preview lines.
function colorizeDiffLine(
  line: string,
  color: ReturnType<typeof createColor>
): string {
  if (line.startsWith("+")) return color.green(line);
  if (line.startsWith("-")) return color.red(line);
  if (line.startsWith("…")) return color.gray(line);
  return line;
}
