import { LlmConfig } from "../types";
import { sanitizeJsonArray } from "../utils";

interface TranslateOptions {
  sourceLocale: string;
  targetLocale: string;
}

export async function translateBatchGoogle(
  input: string[],
  llm: LlmConfig,
  options: TranslateOptions
): Promise<string[]> {
  const apiKeyEnv = llm.apiKeyEnv ?? "GEMINI_API_KEY";
  const apiKey = process.env[apiKeyEnv];
  if (!apiKey) {
    throw new Error(`Missing Google AI API key in env: ${apiKeyEnv}`);
  }

  const baseUrl = llm.baseUrl ?? "https://generativelanguage.googleapis.com/v1beta";
  const model = llm.model;
  if (!model) {
    throw new Error("Google AI model is required.");
  }

  const url = `${baseUrl.replace(/\/$/, "")}/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const temperature = llm.temperature ?? 0.2;

  const systemPrompt =
    "You are a professional translator. Return ONLY a JSON array of translated strings, with the same length and order as the input array. Do not add extra commentary.";
  const userPrompt = JSON.stringify({
    sourceLocale: options.sourceLocale,
    targetLocale: options.targetLocale,
    strings: input,
    notes: "Preserve placeholders like {name}, %s, {{count}} exactly as written."
  });

  const body: Record<string, any> = {
    systemInstruction: {
      parts: [{ text: systemPrompt }]
    },
    contents: [
      {
        role: "user",
        parts: [{ text: userPrompt }]
      }
    ],
    generationConfig: {
      temperature
    }
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Google AI request failed: ${response.status} ${response.statusText} - ${text}`
    );
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const content = parts.map((part) => part.text ?? "").join("");
  const parsed = sanitizeJsonArray(content);

  if (parsed.length !== input.length) {
    throw new Error(
      `Google AI returned ${parsed.length} items for ${input.length} inputs.`
    );
  }

  return parsed.map((value) => String(value));
}
