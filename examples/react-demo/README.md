# Interceptor React Demo

This is a minimal React + react-intl project to test Interceptor.

## Setup
From the root of the Interceptor repo:
```bash
pnpm build
```

Then in this demo folder:
```bash
pnpm install
```

## Add your API key
Create `.env` in this folder:
```bash
GEMINI_API_KEY=your-google-ai-key
```

If you prefer OpenAI, change `interceptor.config.ts` to use `provider: "openai"` and set:
```bash
OPENAI_API_KEY=sk-your-real-key
```

## Run Interceptor
From the demo folder:
```bash
pnpm interceptor
```

This will scan `src/` and update `src/locales/es.json` with translations for any missing keys.

## Run the app
```bash
pnpm dev
```

Open the Vite dev server URL in your browser.
