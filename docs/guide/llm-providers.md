# LLM Providers

Interceptor supports multiple LLM providers. Configure one provider in `interceptor.config.ts` and set the matching API key in `.env`.

## Provider matrix
| Provider | Env var | Notes |
| --- | --- | --- |
| OpenAI | `OPENAI_API_KEY` | Official OpenAI API |
| OpenAI-compatible | `OPENAI_COMPAT_API_KEY` | Requires `baseUrl` |
| Google (Gemini) | `GEMINI_API_KEY` | Google AI Studio |
| Anthropic (Claude) | `ANTHROPIC_API_KEY` | Claude models |
| Mistral | `MISTRAL_API_KEY` | Mistral API |
| Cohere | `COHERE_API_KEY` | Cohere API |
| Groq | `GROQ_API_KEY` | Groq API |
| DeepSeek | `DEEPSEEK_API_KEY` | DeepSeek API |

## OpenAI
```ts
llm: {
  provider: "openai",
  model: "gpt-4o-mini",
  apiKeyEnv: "OPENAI_API_KEY"
}
```

## OpenAI-compatible
```ts
llm: {
  provider: "openai-compatible",
  model: "your-model-name",
  apiKeyEnv: "OPENAI_COMPAT_API_KEY",
  baseUrl: "https://your-provider.com/v1"
}
```

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
  model: "mistral-small-latest",
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
  model: "llama3-8b-8192",
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

## Custom env var name
If your key is stored under another environment variable, set `llm.apiKeyEnv` to that name.
