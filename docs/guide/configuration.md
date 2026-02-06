# Configuration

Interceptor loads `interceptor.config.ts/js/cjs/mjs/json` from the current directory or any parent directory.

## Core options
```ts
import type { InterceptorConfig } from "interceptor";

const config: InterceptorConfig = {
  rootDir: ".",
  include: ["src/**/*.{ts,tsx,js,jsx}"],
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
      functions: [],
      memberFunctions: ["t", "$t"],
      objects: ["i18n", "$i18n", "i18nGlobal", "i18nInstance", "this"],
      keyAsDefault: true
    }
  },
  batch: {
    size: 20,
    delayMs: 0
  },
  watcher: {
    debounceMs: 200
  }
};

export default config;
```

## LLM providers
OpenAI:
```ts
llm: {
  provider: "openai",
  model: "gpt-4o-mini",
  apiKeyEnv: "OPENAI_API_KEY"
}
```

Google AI (Gemini):
```ts
llm: {
  provider: "google",
  model: "gemini-1.5-flash",
  apiKeyEnv: "GEMINI_API_KEY"
}
```

## Custom locale paths
Use `i18n.messagesPath` with `{locale}` placeholder:
```ts
i18n: {
  messagesPath: "src/i18n/{locale}.json"
}
```

Or use a resolver for complete control:
```ts
i18n: {
  resolveMessagesFile: (locale) => `src/i18n/${locale}/messages.json`
}
```

## Vue SFC notes
For `.vue` files, Interceptor currently parses only `<script>` blocks. Template-only strings are not extracted yet.
