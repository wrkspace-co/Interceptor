import { LlmConfig } from "../types";
import { translateBatchOpenAI } from "./openai";
import { translateBatchOpenAICompatible } from "./openai-compatible";
import { translateBatchGoogle } from "./google";
import { translateBatchAnthropic } from "./anthropic";
import { translateBatchMistral } from "./mistral";
import { translateBatchCohere } from "./cohere";
import { translateBatchGroq } from "./groq";
import { translateBatchDeepSeek } from "./deepseek";

export async function translateBatch(
  input: string[],
  llm: LlmConfig,
  options: { sourceLocale: string; targetLocale: string }
): Promise<string[]> {
  switch (llm.provider ?? "openai") {
    case "openai":
      return translateBatchOpenAI(input, llm, options);
    case "openai-compatible":
      return translateBatchOpenAICompatible(input, llm, options);
    case "google":
      return translateBatchGoogle(input, llm, options);
    case "anthropic":
      return translateBatchAnthropic(input, llm, options);
    case "mistral":
      return translateBatchMistral(input, llm, options);
    case "cohere":
      return translateBatchCohere(input, llm, options);
    case "groq":
      return translateBatchGroq(input, llm, options);
    case "deepseek":
      return translateBatchDeepSeek(input, llm, options);
    default:
      throw new Error(`Unsupported LLM provider: ${llm.provider}`);
  }
}
