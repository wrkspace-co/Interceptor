# LLM Providers

Interceptor supports multiple LLM providers. Configure the provider in `llm.provider`, choose a model, and set the API key env var in `.env`.

## OpenAI
```ts
llm: {
  provider: "openai",
  model: "gpt-4o-mini",
  apiKeyEnv: "OPENAI_API_KEY"
}
```

## OpenAI-compatible
Use this provider with any OpenAI-compatible endpoint (e.g. hosted gateways or custom proxies).
```ts
llm: {
  provider: "openai-compatible",
  model: "your-model-name",
  apiKeyEnv: "OPENAI_COMPAT_API_KEY",
  baseUrl: "https://your-provider.com/v1"
}
```
`llm.baseUrl` is required for this provider.

## Google (Gemini)
```ts
llm: {
  provider: "google",
  model: "gemini-1.5-flash",
  apiKeyEnv: "GEMINI_API_KEY"
}
```

## Anthropic (Claude)
```ts
llm: {
  provider: "anthropic",
  model: "claude-3-5-sonnet-20240620",
  apiKeyEnv: "ANTHROPIC_API_KEY"
}
```

## Mistral
```ts
llm: {
  provider: "mistral",
  model: "mistral-small",
  apiKeyEnv: "MISTRAL_API_KEY"
}
```

## Cohere
```ts
llm: {
  provider: "cohere",
  model: "command-r",
  apiKeyEnv: "COHERE_API_KEY"
}
```

## Groq
```ts
llm: {
  provider: "groq",
  model: "llama-3.1-8b-instant",
  apiKeyEnv: "GROQ_API_KEY"
}
```

## DeepSeek
```ts
llm: {
  provider: "deepseek",
  model: "deepseek-chat",
  apiKeyEnv: "DEEPSEEK_API_KEY"
}
```

## Notes
- You can override endpoints with `llm.baseUrl`.
- Keep requests small by tuning `batch.size`.
