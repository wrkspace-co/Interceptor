import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { compileOnce } from "../src/compiler";
import type { InterceptorConfig } from "../src/types";
import { getTranslationCachePath } from "../src/translation-cache";
import { getExtractionCachePath } from "../src/extraction-cache";

const logger = {
  info: () => {},
  warn: () => {},
  error: () => {}
};

async function createTempProject(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "interceptor-compile-"));
  await fs.mkdir(path.join(dir, "src"), { recursive: true });
  await fs.mkdir(path.join(dir, "locales"), { recursive: true });
  return dir;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

describe("compileOnce", () => {
  const envKey = "OPENAI_API_KEY";
  const originalKey = process.env[envKey];

  beforeEach(() => {
    process.env[envKey] = "test-key";
  });

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env[envKey];
    } else {
      process.env[envKey] = originalKey;
    }
    vi.restoreAllMocks();
  });

  it("only sends missing keys to the LLM and preserves existing translations", async () => {
    const rootDir = await createTempProject();
    const sourceFile = path.join(rootDir, "src", "App.tsx");
    await fs.writeFile(
      sourceFile,
      "t('Hello');\nt('World');\n",
      "utf8"
    );

    const frPath = path.join(rootDir, "locales", "fr.json");
    await fs.writeFile(frPath, JSON.stringify({ Hello: "Bonjour" }, null, 2));

    const seenPayloads: Array<{ targetLocale: string; strings: string[] }> = [];

    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, options?: any) => {
        const body = JSON.parse(options.body);
        const userContent = body.messages.find((msg: any) => msg.role === "user")
          .content;
        const payload = JSON.parse(userContent);
        seenPayloads.push({
          targetLocale: payload.targetLocale,
          strings: payload.strings
        });

        return {
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify(payload.strings.map((str: string) => `FR_${str}`))
                }
              }
            ]
          }),
          text: async () => ""
        } as any;
      })
    );

    const config: InterceptorConfig = {
      rootDir,
      include: ["src/**/*.{ts,tsx}"],
      locales: ["en", "fr"],
      defaultLocale: "en",
      llm: {
        provider: "openai",
        model: "gpt-4o-mini",
        apiKeyEnv: envKey
      },
      i18n: {
        messagesPath: "locales/{locale}.json"
      }
    };

    await compileOnce(config, { cwd: rootDir, logger });

    expect(seenPayloads.length).toBe(1);
    expect(seenPayloads[0]).toEqual({ targetLocale: "fr", strings: ["World"] });

    const enMessages = JSON.parse(
      await fs.readFile(path.join(rootDir, "locales", "en.json"), "utf8")
    );
    const frMessages = JSON.parse(
      await fs.readFile(path.join(rootDir, "locales", "fr.json"), "utf8")
    );

    expect(enMessages).toMatchObject({ Hello: "Hello", World: "World" });
    expect(frMessages).toMatchObject({ Hello: "Bonjour", World: "FR_World" });
  });

  it("uses default locale messages as translation source when available", async () => {
    const rootDir = await createTempProject();
    const sourceFile = path.join(rootDir, "src", "App.tsx");
    await fs.writeFile(sourceFile, "t('home.title');\n", "utf8");

    await fs.writeFile(
      path.join(rootDir, "locales", "en.json"),
      JSON.stringify({ "home.title": "Home Title" }, null, 2)
    );

    const seenPayloads: Array<{ targetLocale: string; strings: string[] }> = [];

    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, options?: any) => {
        const body = JSON.parse(options.body);
        const userContent = body.messages.find((msg: any) => msg.role === "user")
          .content;
        const payload = JSON.parse(userContent);
        seenPayloads.push({
          targetLocale: payload.targetLocale,
          strings: payload.strings
        });

        return {
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify(payload.strings.map((str: string) => `ES_${str}`))
                }
              }
            ]
          }),
          text: async () => ""
        } as any;
      })
    );

    const config: InterceptorConfig = {
      rootDir,
      include: ["src/**/*.{ts,tsx}"],
      locales: ["en", "es"],
      defaultLocale: "en",
      llm: {
        provider: "openai",
        model: "gpt-4o-mini",
        apiKeyEnv: envKey
      },
      i18n: {
        messagesPath: "locales/{locale}.json"
      }
    };

    await compileOnce(config, { cwd: rootDir, logger });

    expect(seenPayloads.length).toBe(1);
    expect(seenPayloads[0]).toEqual({
      targetLocale: "es",
      strings: ["Home Title"]
    });

    const esMessages = JSON.parse(
      await fs.readFile(path.join(rootDir, "locales", "es.json"), "utf8")
    );

    expect(esMessages).toMatchObject({ "home.title": "ES_Home Title" });
  });

  it("removes unused keys when cleanup.removeUnused is enabled", async () => {
    const rootDir = await createTempProject();
    const sourceFile = path.join(rootDir, "src", "App.tsx");
    await fs.writeFile(sourceFile, "t('Hello');\n", "utf8");

    await fs.writeFile(
      path.join(rootDir, "locales", "en.json"),
      JSON.stringify({ Hello: "Hello", Unused: "Unused" }, null, 2)
    );

    const config: InterceptorConfig = {
      rootDir,
      include: ["src/**/*.{ts,tsx}"],
      locales: ["en"],
      defaultLocale: "en",
      llm: {
        provider: "openai",
        model: "gpt-4o-mini",
        apiKeyEnv: envKey
      },
      i18n: {
        messagesPath: "locales/{locale}.json"
      },
      cleanup: {
        removeUnused: true
      }
    };

    await compileOnce(config, { cwd: rootDir, logger });

    const enMessages = JSON.parse(
      await fs.readFile(path.join(rootDir, "locales", "en.json"), "utf8")
    );

    expect(enMessages).toEqual({ Hello: "Hello" });
  });

  it("reuses translation cache across runs when locale files are reset", async () => {
    const rootDir = await createTempProject();
    const sourceFile = path.join(rootDir, "src", "App.tsx");
    await fs.writeFile(sourceFile, "t('Cached');\n", "utf8");

    let fetchCalls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, options?: any) => {
        fetchCalls += 1;
        const body = JSON.parse(options.body);
        const userContent = body.messages.find((msg: any) => msg.role === "user")
          .content;
        const payload = JSON.parse(userContent);

        return {
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify(payload.strings.map((str: string) => `ES_${str}`))
                }
              }
            ]
          }),
          text: async () => ""
        } as any;
      })
    );

    const config: InterceptorConfig = {
      rootDir,
      include: ["src/**/*.{ts,tsx}"],
      locales: ["en", "es"],
      defaultLocale: "en",
      llm: {
        provider: "openai",
        model: "gpt-4o-mini",
        apiKeyEnv: envKey
      },
      i18n: {
        messagesPath: "locales/{locale}.json"
      }
    };

    await compileOnce(config, { cwd: rootDir, logger });
    expect(fetchCalls).toBe(1);

    await fs.writeFile(path.join(rootDir, "locales", "es.json"), "{}", "utf8");
    await compileOnce(config, { cwd: rootDir, logger });

    expect(fetchCalls).toBe(1);
    const esMessages = JSON.parse(
      await fs.readFile(path.join(rootDir, "locales", "es.json"), "utf8")
    );
    expect(esMessages).toMatchObject({ Cached: "ES_Cached" });
  });

  it("respects per-locale token budget and allows partial results", async () => {
    const rootDir = await createTempProject();
    const sourceFile = path.join(rootDir, "src", "App.tsx");
    await fs.writeFile(sourceFile, "t('A');\nt('BBBBBBBB');\n", "utf8");

    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, options?: any) => {
        const body = JSON.parse(options.body);
        const userContent = body.messages.find((msg: any) => msg.role === "user")
          .content;
        const payload = JSON.parse(userContent);

        return {
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify(payload.strings.map((str: string) => `ES_${str}`))
                }
              }
            ]
          }),
          text: async () => ""
        } as any;
      })
    );

    const config: InterceptorConfig = {
      rootDir,
      include: ["src/**/*.{ts,tsx}"],
      locales: ["en", "es"],
      defaultLocale: "en",
      llm: {
        provider: "openai",
        model: "gpt-4o-mini",
        apiKeyEnv: envKey
      },
      i18n: {
        messagesPath: "locales/{locale}.json"
      },
      budget: {
        maxTokensPerLocale: 1
      }
    };

    await compileOnce(config, { cwd: rootDir, logger });

    const esMessages = JSON.parse(
      await fs.readFile(path.join(rootDir, "locales", "es.json"), "utf8")
    );

    expect(esMessages).toMatchObject({ A: "ES_A" });
    expect(esMessages["BBBBBBBB"]).toBeUndefined();
  });

  it("supports dry-run without writing locale files or caches", async () => {
    const rootDir = await createTempProject();
    const sourceFile = path.join(rootDir, "src", "App.tsx");
    await fs.writeFile(sourceFile, "t('Dry');\n", "utf8");

    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, options?: any) => {
        const body = JSON.parse(options.body);
        const userContent = body.messages.find((msg: any) => msg.role === "user")
          .content;
        const payload = JSON.parse(userContent);

        return {
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify(payload.strings.map((str: string) => `FR_${str}`))
                }
              }
            ]
          }),
          text: async () => ""
        } as any;
      })
    );

    const config: InterceptorConfig = {
      rootDir,
      include: ["src/**/*.{ts,tsx}"],
      locales: ["en", "fr"],
      defaultLocale: "en",
      llm: {
        provider: "openai",
        model: "gpt-4o-mini",
        apiKeyEnv: envKey
      },
      i18n: {
        messagesPath: "locales/{locale}.json"
      }
    };

    const result = await compileOnce(config, {
      cwd: rootDir,
      logger,
      mode: "dry-run",
      diffPreview: true
    });

    expect(result.report?.mode).toBe("dry-run");
    expect(result.report?.summary.filesChanged).toBeGreaterThan(0);
    const frReport = result.report?.locales.find((locale) => locale.locale === "fr");
    expect(frReport?.preview).toContain("+ \"Dry\"");

    expect(await fileExists(path.join(rootDir, "locales", "en.json"))).toBe(false);
    expect(await fileExists(path.join(rootDir, "locales", "fr.json"))).toBe(false);
    expect(await fileExists(getTranslationCachePath(rootDir))).toBe(false);
    expect(await fileExists(getExtractionCachePath(rootDir))).toBe(false);
  });

  it("check mode returns a report without writing files", async () => {
    const rootDir = await createTempProject();
    const sourceFile = path.join(rootDir, "src", "App.tsx");
    await fs.writeFile(sourceFile, "t('Check');\n", "utf8");

    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, options?: any) => {
        const body = JSON.parse(options.body);
        const userContent = body.messages.find((msg: any) => msg.role === "user")
          .content;
        const payload = JSON.parse(userContent);

        return {
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify(payload.strings.map((str: string) => `ES_${str}`))
                }
              }
            ]
          }),
          text: async () => ""
        } as any;
      })
    );

    const config: InterceptorConfig = {
      rootDir,
      include: ["src/**/*.{ts,tsx}"],
      locales: ["en", "es"],
      defaultLocale: "en",
      llm: {
        provider: "openai",
        model: "gpt-4o-mini",
        apiKeyEnv: envKey
      },
      i18n: {
        messagesPath: "locales/{locale}.json"
      }
    };

    const result = await compileOnce(config, {
      cwd: rootDir,
      logger,
      mode: "check",
      diffPreview: true
    });

    expect(result.report?.mode).toBe("check");
    expect(result.report?.summary.filesChanged).toBeGreaterThan(0);
    expect(await fileExists(path.join(rootDir, "locales", "es.json"))).toBe(false);
    expect(await fileExists(getTranslationCachePath(rootDir))).toBe(false);
    expect(await fileExists(getExtractionCachePath(rootDir))).toBe(false);
  });
});
