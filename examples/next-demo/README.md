# Interceptor Next.js Demo

This is a minimal Next.js + i18next demo to test Interceptor.

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

Google AI:
```bash
GEMINI_API_KEY=your-google-ai-key
```

If you prefer OpenAI, change `interceptor.config.ts` to use `provider: "openai"` and set:
```bash
OPENAI_API_KEY=sk-your-real-key
```

## Run Interceptor
```bash
pnpm interceptor
```

This will update `src/locales/es.json` with missing keys.

## Run the app
```bash
pnpm dev
```

## Routes
- `/` uses i18next in a client component.
- `/server` is a server component to validate RSC extraction.
