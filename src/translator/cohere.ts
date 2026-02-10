import { LlmConfig } from "../types";
import { sanitizeJsonArray } from "../utils";

interface TranslateOptions {
  sourceLocale: string;
  targetLocale: string;
}

export async function translateBatchCohere(
  input: string[],
  llm: LlmConfig,
  options: TranslateOptions
): Promise<string[]> {
  const apiKeyEnv = llm.apiKeyEnv ?? "COHERE_API_KEY";
  const apiKey = process.env[apiKeyEnv];
  if (!apiKey) {
    throw new Error(`Missing Cohere API key in env: ${apiKeyEnv}`);
  }

  const url = llm.baseUrl ?? "https://api.cohere.ai/v1/chat";
  const temperature = llm.temperature ?? 0.2;

  const systemPrompt =
    "You are a professional translator. Return ONLY a JSON array of translated strings, with the same length and order as the input array. Do not add extra commentary.";
  const userPrompt = JSON.stringify({
    sourceLocale: options.sourceLocale,
    targetLocale: options.targetLocale,
    strings: input,
    notes: "Preserve placeholders like {name}, %s, {{count}} exactly as written."
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: llm.model,
      message: userPrompt,
      preamble: systemPrompt,
      temperature
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Cohere request failed: ${response.status} ${response.statusText} - ${text}`);
  }

  const data = (await response.json()) as {
    text?: string;
    message?: { content?: Array<{ text?: string }> };
  };

  const content =
    data.text ??
    data.message?.content?.map((part) => part.text ?? "").join("") ??
    "";
  const parsed = sanitizeJsonArray(content);

  if (parsed.length !== input.length) {
    throw new Error(`Cohere returned ${parsed.length} items for ${input.length} inputs.`);
  }

  return parsed.map((value) => String(value));
}
