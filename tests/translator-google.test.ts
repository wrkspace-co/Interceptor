import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { translateBatch } from "../src/translator";
import type { LlmConfig } from "../src/types";

const envKey = "GEMINI_API_KEY";

beforeEach(() => {
  process.env[envKey] = "test-key";
});

afterEach(() => {
  delete process.env[envKey];
  vi.restoreAllMocks();
});

describe("translateBatch (google)", () => {
  it("parses Google AI response and returns translations", async () => {
    const llm: LlmConfig = {
      provider: "google",
      model: "gemini-1.5-flash",
      apiKeyEnv: envKey
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, options?: any) => {
        expect(url).toContain("generativelanguage.googleapis.com");
        expect(url).toContain(encodeURIComponent(llm.model));
        expect(url).toContain(`key=${encodeURIComponent(process.env[envKey] ?? "")}`);

        const body = JSON.parse(options.body);
        const userContent = body.contents[0].parts[0].text;
        const payload = JSON.parse(userContent);

        expect(payload.sourceLocale).toBe("en");
        expect(payload.targetLocale).toBe("es");
        expect(payload.strings).toEqual(["Hello"]);

        return {
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [{ text: "[\"Hola\"]" }]
                }
              }
            ]
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
});
