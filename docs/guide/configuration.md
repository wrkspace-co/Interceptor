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
- `rootDir`: Base directory for resolving paths.
- `include`: Glob patterns to scan.
- `exclude`: Glob patterns to ignore.
- `locales`: List of locale codes.
- `defaultLocale`: Locale used as the source language.

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
  temperature: 0.2
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
