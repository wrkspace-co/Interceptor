import { LlmConfig } from "../types";
import { sanitizeJsonArray } from "../utils";

interface TranslateOptions {
  sourceLocale: string;
  targetLocale: string;
}

export async function translateBatchAnthropic(
  input: string[],
  llm: LlmConfig,
  options: TranslateOptions
): Promise<string[]> {
  const apiKeyEnv = llm.apiKeyEnv ?? "ANTHROPIC_API_KEY";
  const apiKey = process.env[apiKeyEnv];
  if (!apiKey) {
    throw new Error(`Missing Anthropic API key in env: ${apiKeyEnv}`);
  }

  const url = llm.baseUrl ?? "https://api.anthropic.com/v1/messages";
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
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: llm.model,
      max_tokens: 2048,
      temperature,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }]
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Anthropic request failed: ${response.status} ${response.statusText} - ${text}`);
  }

  const data = (await response.json()) as {
    content?: Array<{ text?: string }>;
  };

  const content = data.content?.map((item) => item.text ?? "").join("") ?? "";
  const parsed = sanitizeJsonArray(content);

  if (parsed.length !== input.length) {
    throw new Error(
      `Anthropic returned ${parsed.length} items for ${input.length} inputs.`
    );
  }

  return parsed.map((value) => String(value));
}
