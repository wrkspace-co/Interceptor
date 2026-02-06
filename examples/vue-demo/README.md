# Interceptor Vue Demo

Minimal Vue 3 + vue-i18n example to test Interceptor.

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

OpenAI:
```bash
OPENAI_API_KEY=sk-your-real-key
```

Google AI:
```bash
GEMINI_API_KEY=your-google-ai-key
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
