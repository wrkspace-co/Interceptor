import { LlmConfig } from "../types";
import { translateBatchOpenAI } from "./openai";
import { translateBatchGoogle } from "./google";

export async function translateBatch(
  input: string[],
  llm: LlmConfig,
  options: { sourceLocale: string; targetLocale: string }
): Promise<string[]> {
  switch (llm.provider ?? "openai") {
    case "openai":
      return translateBatchOpenAI(input, llm, options);
    case "google":
      return translateBatchGoogle(input, llm, options);
    default:
      throw new Error(`Unsupported LLM provider: ${llm.provider}`);
  }
}
