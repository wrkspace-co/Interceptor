# Configuration

Interceptor loads `interceptor.config.ts/js/cjs/mjs/json` from the current directory or any parent directory.

## Full example
```ts
import type { InterceptorConfig } from "@wrkspace-co/interceptor";

const config: InterceptorConfig = {
  rootDir: ".",
  include: ["src/**/*.{ts,tsx,js,jsx,vue,svelte,astro}"],
  exclude: ["**/node_modules/**", "**/dist/**"],
  locales: ["en", "fr"],
  defaultLocale: "en",
  llm: {
    provider: "openai",
    model: "gpt-4o-mini",
    apiKeyEnv: "OPENAI_API_KEY"
  },
  i18n: {
    messagesPath: "src/locales/{locale}.json"
  },
  extractor: {
    functions: ["t"],
    taggedTemplates: [],
    reactIntl: {
      formatMessage: true,
      formattedMessage: true,
      defineMessages: true
    },
    i18next: {
      enabled: true,
      functions: ["t"],
      memberFunctions: ["t"],
      objects: ["i18n", "i18next"],
      useDefaultValue: true,
      keyAsDefault: true,
      transComponent: true
    },
    vueI18n: {
      enabled: true,
      functions: ["$t"],
      memberFunctions: ["t", "$t"],
      objects: ["i18n", "$i18n", "i18nGlobal", "i18nInstance", "this"],
      keyAsDefault: true
    }
  },
  batch: {
    size: 20,
    delayMs: 0,
    localeConcurrency: 2
  },
  watcher: {
    debounceMs: 200
  },
  cleanup: {
    removeUnused: false
  }
};

export default config;
```

## Core options
Required:
- `locales`: List of locale codes.
- `defaultLocale`: Locale used as the source language.
- `llm.provider`: LLM provider name.
- `llm.model`: Model identifier for the chosen provider.

Optional:
- `rootDir`: Base directory for resolving paths.
- `include`: Glob patterns to scan.
- `exclude`: Glob patterns to ignore.

## Config reference
### Top-level
| Field | Purpose | Required | Default |
| --- | --- | --- | --- |
| `rootDir` | Base directory for resolving paths. | No | `.` |
| `include` | Glob patterns to scan. | No | `["src/**/*.{js,jsx,ts,tsx,vue,svelte,astro}"]` |
| `exclude` | Glob patterns to ignore. | No | `["**/node_modules/**", "**/dist/**", "**/build/**", "**/.next/**", "**/coverage/**"]` |
| `locales` | List of target locales. | Yes | — |
| `defaultLocale` | Source locale used for translation. | Yes | — |
| `extractor` | Extraction behavior overrides. | No | Defaults in "Extractor" table |
| `i18n` | Locale file resolution settings. | No | Defaults in "i18n" table |
| `llm` | LLM provider and model settings. | Yes | Defaults in "LLM" table |
| `batch` | Batch sizing and concurrency. | No | Defaults in "Batch" table |
| `watcher` | Watch mode tuning. | No | Defaults in "Watcher" table |
| `cleanup` | Remove unused keys after extraction. | No | Defaults in "Cleanup" table |
| `budget` | Token budget guardrails. | No | Defaults in "Budget" table |

### LLM
| Field | Purpose | Required | Default |
| --- | --- | --- | --- |
| `llm.provider` | Primary LLM provider. | Yes | — |
| `llm.model` | Primary model identifier. | Yes | — |
| `llm.apiKeyEnv` | Env var for provider API key. | No | Provider default (see LLM Providers) |
| `llm.baseUrl` | Override API base URL. | No | Provider default (OpenAI-compatible required) |
| `llm.temperature` | Sampling temperature. | No | `0.2` |
| `llm.fallbacks` | Ordered list of fallback providers. | No | `[]` |
| `llm.fallbacks[].provider` | Fallback provider. | Yes (if fallbacks) | — |
| `llm.fallbacks[].model` | Fallback model. | No | Primary `llm.model` |
| `llm.fallbacks[].apiKeyEnv` | Fallback API key env var. | No | Provider default |
| `llm.fallbacks[].baseUrl` | Fallback base URL override. | No | Provider default |
| `llm.fallbacks[].temperature` | Fallback temperature override. | No | Primary `llm.temperature` |
| `llm.retries` | Retry attempts per provider. | No | `2` |
| `llm.retryDelayMs` | Initial retry delay. | No | `500` |
| `llm.retryMaxDelayMs` | Max backoff delay. | No | `4000` |

### i18n
| Field | Purpose | Required | Default |
| --- | --- | --- | --- |
| `i18n.provider` | i18n integration type. | No | `"react-intl"` |
| `i18n.messagesPath` | Locale path template. | No | `"src/locales/{locale}.json"` |
| `i18n.messagesDir` | Base locale directory. | No | `"src/locales"` |
| `i18n.localeFilePattern` | Locale filename pattern. | No | `"{locale}.json"` |
| `i18n.resolveMessagesFile` | Custom resolver function. | No | — |

### Extractor
| Field | Purpose | Required | Default |
| --- | --- | --- | --- |
| `extractor.functions` | Global translation functions. | No | `["t"]` |
| `extractor.taggedTemplates` | Tagged template extractors. | No | `[]` |
| `extractor.reactIntl.formatMessage` | Extract `intl.formatMessage`. | No | `true` |
| `extractor.reactIntl.formattedMessage` | Extract `<FormattedMessage />`. | No | `true` |
| `extractor.reactIntl.defineMessages` | Extract `defineMessages()`. | No | `true` |
| `extractor.i18next.enabled` | Enable i18next extraction. | No | `true` |
| `extractor.i18next.functions` | i18next function names. | No | `["t"]` |
| `extractor.i18next.memberFunctions` | i18next member function names. | No | `["t"]` |
| `extractor.i18next.objects` | i18next object names. | No | `["i18n", "i18next"]` |
| `extractor.i18next.useDefaultValue` | Use defaultValue as source. | No | `true` |
| `extractor.i18next.keyAsDefault` | Use key when no default. | No | `true` |
| `extractor.i18next.transComponent` | Extract `<Trans>` content. | No | `true` |
| `extractor.vueI18n.enabled` | Enable vue-i18n extraction. | No | `true` |
| `extractor.vueI18n.functions` | vue-i18n function names. | No | `["$t"]` |
| `extractor.vueI18n.memberFunctions` | vue-i18n member function names. | No | `["t", "$t"]` |
| `extractor.vueI18n.objects` | vue-i18n object names. | No | `["i18n", "$i18n", "i18nGlobal", "i18nInstance", "this"]` |
| `extractor.vueI18n.keyAsDefault` | Use key when no default. | No | `true` |

### Batch
| Field | Purpose | Required | Default |
| --- | --- | --- | --- |
| `batch.size` | Strings per LLM request. | No | `20` |
| `batch.delayMs` | Delay between batches. | No | `0` |
| `batch.localeConcurrency` | Parallel locale translations. | No | `2` |

### Watcher
| Field | Purpose | Required | Default |
| --- | --- | --- | --- |
| `watcher.debounceMs` | Debounce for file changes. | No | `200` |

### Cleanup
| Field | Purpose | Required | Default |
| --- | --- | --- | --- |
| `cleanup.removeUnused` | Remove keys not in source. | No | `false` |

### Budget
| Field | Purpose | Required | Default |
| --- | --- | --- | --- |
| `budget.maxTokensPerRun` | Cap tokens per run. | No | `Infinity` |
| `budget.maxTokensPerLocale` | Cap tokens per locale. | No | `Infinity` |

## i18n file locations
Use a template path with `{locale}`:
```ts
i18n: {
  messagesPath: "src/locales/{locale}.json"
}
```

Or use a resolver:
```ts
i18n: {
  resolveMessagesFile: (locale) => `src/i18n/${locale}/messages.json`
}
```

## LLM configuration
```ts
llm: {
  provider: "openai",
  model: "gpt-4o-mini",
  apiKeyEnv: "OPENAI_API_KEY",
  baseUrl: "https://api.example.com/v1",
  temperature: 0.2,
  fallbacks: [
    {
      provider: "anthropic",
      model: "claude-3-5-sonnet-20240620",
      apiKeyEnv: "ANTHROPIC_API_KEY"
    },
    {
      provider: "google",
      model: "gemini-1.5-pro",
      apiKeyEnv: "GEMINI_API_KEY"
    }
  ],
  retries: 2,
  retryDelayMs: 500,
  retryMaxDelayMs: 4000
}
```

## Budget guardrails
Control maximum translation volume per run and per locale. Budgets are approximate and based on string length.
```ts
budget: {
  maxTokensPerRun: 6000,
  maxTokensPerLocale: 2000
}
```

## Extraction configuration
- `functions`: Global function names like `t`.
- `taggedTemplates`: Tagged templates like ``t`key` ``.
- `reactIntl`: Enable react-intl extraction.
- `i18next`: Enable i18next extraction and default value handling.
- `vueI18n`: Enable vue-i18n extraction for scripts and templates.

## Batch configuration
```ts
batch: {
  size: 20,
  delayMs: 0,
  localeConcurrency: 2
}
```
`localeConcurrency` controls how many locales are translated in parallel.

## Watcher configuration
```ts
watcher: {
  debounceMs: 200
}
```

## Cleanup unused keys
```ts
cleanup: {
  removeUnused: true
}
```
