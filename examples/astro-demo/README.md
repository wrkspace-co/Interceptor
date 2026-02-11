# Interceptor Astro Demo

Minimal Astro example to test Interceptor.

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

## Run Interceptor
```bash
pnpm interceptor
```

This will generate `src/locales/es.json` with missing keys.

## Run the app
```bash
pnpm dev
```
