import type { LlmConfig, LlmProvider } from "./types";

export interface ResolvedLlmProviderConfig {
  provider: LlmProvider;
  model: string;
  apiKeyEnv?: string;
  baseUrl?: string;
  temperature?: number;
}

export function resolveProviderChain(llm: LlmConfig): ResolvedLlmProviderConfig[] {
  if (!llm?.model) {
    throw new Error("llm.model is required.");
  }
  if (!llm?.provider) {
    throw new Error("llm.provider is required.");
  }

  const primaryProvider = llm.provider;
  const chain: ResolvedLlmProviderConfig[] = [
    {
      provider: primaryProvider,
      model: llm.model,
      apiKeyEnv: llm.apiKeyEnv,
      baseUrl: llm.baseUrl,
      temperature: llm.temperature
    }
  ];

  if (llm.fallbacks && llm.fallbacks.length > 0) {
    for (const fallback of llm.fallbacks) {
      if (!fallback?.provider) {
        throw new Error("llm.fallbacks must include a provider.");
      }
      const model = fallback.model ?? llm.model;
      chain.push({
        provider: fallback.provider,
        model,
        apiKeyEnv: fallback.apiKeyEnv,
        baseUrl:
          fallback.baseUrl ??
          (fallback.provider === "openai-compatible" ? llm.baseUrl : undefined),
        temperature: fallback.temperature ?? llm.temperature
      });
    }
  }

  return chain;
}
