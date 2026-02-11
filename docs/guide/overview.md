# Overview

Interceptor is an on-demand translation compiler. It scans your source code for translation calls, identifies missing keys, and writes translations into your locale files using an LLM. It is designed to integrate into build pipelines and stay out of the way once configured.

## Why teams use Interceptor
- Keep locale files synchronized with the source of truth in code
- Avoid overwriting manual edits or translator fixes
- Support multiple frameworks and i18n libraries in a single monorepo
- Automate translation safely with batching and rate-limit awareness
- Speed up builds with incremental extraction and cached file lists

## Supported coverage
### Frameworks
- Vite-based stacks: Vue, SvelteKit, SolidStart, Astro, Nuxt 3
- Webpack-based stacks: Next.js (Pages + App Router), CRA, Gatsby

### Files
- `.ts`, `.tsx`, `.js`, `.jsx`
- `.vue` SFCs (`<script>`, `<template>`, `<i18n>`)
- `.svelte` (script + template expressions)
- `.astro` (frontmatter + template expressions)

### Default extractors
- react-intl (`formatMessage`, `FormattedMessage`, `defineMessages`)
- i18next (`t`, `i18n.t`, `Trans`, `useTranslation`)
- vue-i18n (`t`, `$t` in script/template, SFC `<i18n>` blocks)
- next-intl (`useTranslations`, `getTranslations`)
- Custom `t()` calls and tagged templates

## Typical workflow
1. Configure locales, i18n file path, and LLM provider.
2. Run `interceptor` in CI or as part of your build.
3. Review updated locale files. Edit translations manually if needed.

## Next steps
- [Quick Start](/guide/getting-started)
- [Extraction & Coverage](/guide/extraction)
- [Configuration](/guide/configuration)
