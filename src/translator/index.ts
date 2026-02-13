import { LlmConfig, LlmProvider } from "../types";
import { resolveProviderChain } from "../llm";
import { translateBatchOpenAI } from "./openai";
import { translateBatchOpenAICompatible } from "./openai-compatible";
import { translateBatchGoogle } from "./google";
import { translateBatchAnthropic } from "./anthropic";
import { translateBatchMistral } from "./mistral";
import { translateBatchCohere } from "./cohere";
import { translateBatchGroq } from "./groq";
import { translateBatchDeepSeek } from "./deepseek";
import { delay } from "../utils";

export async function translateBatch(
  input: string[],
  llm: LlmConfig,
  options: { sourceLocale: string; targetLocale: string }
): Promise<string[]> {
  const [primary] = resolveProviderChain(llm);
  const provider = primary?.provider ?? "openai";
  const attemptConfig: LlmConfig = {
    ...llm,
    provider,
    model: primary?.model ?? llm.model,
    apiKeyEnv: primary?.apiKeyEnv,
    baseUrl: primary?.baseUrl,
    temperature: primary?.temperature
  };

  return translateWithRetry(
    () => translateBatchByProvider(provider, input, attemptConfig, options),
    llm
  );
}

export async function translateBatchWithFallback(
  input: string[],
  llm: LlmConfig,
  options: { sourceLocale: string; targetLocale: string }
): Promise<{
  translations: string[];
  provider: LlmProvider;
  model: string;
  baseUrl?: string;
  temperature?: number;
}> {
  const providers = resolveProviderChain(llm);

  const errors: string[] = [];
  for (const providerConfig of providers) {
    try {
      const attemptConfig: LlmConfig = {
        ...llm,
        provider: providerConfig.provider,
        model: providerConfig.model,
        apiKeyEnv: providerConfig.apiKeyEnv,
        baseUrl: providerConfig.baseUrl,
        temperature: providerConfig.temperature
      };
      const translations = await translateWithRetry(
        () =>
          translateBatchByProvider(
            providerConfig.provider,
            input,
            attemptConfig,
            options
          ),
        llm
      );
      return {
        translations,
        provider: providerConfig.provider,
        model: providerConfig.model,
        baseUrl: providerConfig.baseUrl,
        temperature: providerConfig.temperature
      };
    } catch (error) {
      errors.push(
        `${providerConfig.provider}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  throw new Error(`All LLM providers failed. ${errors.join(" | ")}`);
}

async function translateBatchByProvider(
  provider: LlmProvider,
  input: string[],
  llm: LlmConfig,
  options: { sourceLocale: string; targetLocale: string }
): Promise<string[]> {
  switch (provider) {
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
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}

async function translateWithRetry<T>(
  fn: () => Promise<T>,
  llm: LlmConfig
): Promise<T> {
  const retries = llm.retries ?? 2;
  const baseDelay = llm.retryDelayMs ?? 500;
  const maxDelay = llm.retryMaxDelayMs ?? 4000;

  let attempt = 0;
  let wait = baseDelay;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= retries) {
        throw error;
      }
      const jitter = Math.round(Math.random() * Math.min(200, wait));
      await delay(Math.min(wait + jitter, maxDelay));
      wait = Math.min(wait * 2, maxDelay);
      attempt += 1;
    }
  }
}
