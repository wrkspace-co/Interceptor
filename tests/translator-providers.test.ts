import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { translateBatch } from "../src/translator";
import type { LlmConfig } from "../src/types";

const envs: Record<string, string> = {
  OPENAI_COMPAT_API_KEY: "compat-key",
  ANTHROPIC_API_KEY: "anthropic-key",
  MISTRAL_API_KEY: "mistral-key",
  COHERE_API_KEY: "cohere-key",
  GROQ_API_KEY: "groq-key",
  DEEPSEEK_API_KEY: "deepseek-key"
};

beforeEach(() => {
  for (const [key, value] of Object.entries(envs)) {
    process.env[key] = value;
  }
});

afterEach(() => {
  for (const key of Object.keys(envs)) {
    delete process.env[key];
  }
  vi.restoreAllMocks();
});

describe("translateBatch providers", () => {
  it("anthropic", async () => {
    const llm: LlmConfig = { provider: "anthropic", model: "claude-3-haiku-20240307" };

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => ({
            content: [{ text: "[\"Bonjour\"]" }]
          }),
          text: async () => ""
        } as any;
      })
    );

    const result = await translateBatch(["Hello"], llm, {
      sourceLocale: "en",
      targetLocale: "fr"
    });

    expect(result).toEqual(["Bonjour"]);
  });

  it("openai-compatible", async () => {
    const llm: LlmConfig = {
      provider: "openai-compatible",
      model: "provider-model",
      baseUrl: "https://example.com/v1"
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        expect(url).toBe("https://example.com/v1/chat/completions");
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => ({
            choices: [{ message: { content: "[\"Salut\"]" } }]
          }),
          text: async () => ""
        } as any;
      })
    );

    const result = await translateBatch(["Hello"], llm, {
      sourceLocale: "en",
      targetLocale: "fr"
    });

    expect(result).toEqual(["Salut"]);
  });

  it("mistral", async () => {
    const llm: LlmConfig = { provider: "mistral", model: "mistral-small" };

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => ({
            choices: [{ message: { content: "[\"Hola\"]" } }]
          }),
          text: async () => ""
        } as any;
      })
    );

    const result = await translateBatch(["Hello"], llm, {
      sourceLocale: "en",
      targetLocale: "es"
    });

    expect(result).toEqual(["Hola"]);
  });

  it("cohere", async () => {
    const llm: LlmConfig = { provider: "cohere", model: "command-r" };

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => ({
            text: "[\"Ciao\"]"
          }),
          text: async () => ""
        } as any;
      })
    );

    const result = await translateBatch(["Hello"], llm, {
      sourceLocale: "en",
      targetLocale: "it"
    });

    expect(result).toEqual(["Ciao"]);
  });

  it("groq", async () => {
    const llm: LlmConfig = { provider: "groq", model: "llama-3.1-8b-instant" };

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => ({
            choices: [{ message: { content: "[\"Hallo\"]" } }]
          }),
          text: async () => ""
        } as any;
      })
    );

    const result = await translateBatch(["Hello"], llm, {
      sourceLocale: "en",
      targetLocale: "de"
    });

    expect(result).toEqual(["Hallo"]);
  });

  it("deepseek", async () => {
    const llm: LlmConfig = { provider: "deepseek", model: "deepseek-chat" };

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => ({
            choices: [{ message: { content: "[\"Salut\"]" } }]
          }),
          text: async () => ""
        } as any;
      })
    );

    const result = await translateBatch(["Hello"], llm, {
      sourceLocale: "en",
      targetLocale: "fr"
    });

    expect(result).toEqual(["Salut"]);
  });
});
