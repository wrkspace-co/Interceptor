import { LlmConfig } from "../types";
import { sanitizeJsonArray } from "../utils";

interface TranslateOptions {
  sourceLocale: string;
  targetLocale: string;
}

export async function translateBatchOpenAI(
  input: string[],
  llm: LlmConfig,
  options: TranslateOptions
): Promise<string[]> {
  const apiKeyEnv = llm.apiKeyEnv ?? "OPENAI_API_KEY";
  const apiKey = process.env[apiKeyEnv];
  if (!apiKey) {
    throw new Error(`Missing OpenAI API key in env: ${apiKeyEnv}`);
  }

  const url = llm.baseUrl ?? "https://api.openai.com/v1/chat/completions";
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
      temperature,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${response.statusText} - ${text}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content ?? "";
  const parsed = sanitizeJsonArray(content);

  if (parsed.length !== input.length) {
    throw new Error(
      `OpenAI returned ${parsed.length} items for ${input.length} inputs.`
    );
  }

  return parsed.map((value) => String(value));
}
