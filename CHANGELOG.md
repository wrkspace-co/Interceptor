# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.5] - 2026-02-12
### Added
- Per-provider fallback configuration for models and API key envs.
- `interceptor check` for diff-only CI validation with JSON reports.
- Dry-run mode with per-file diff previews and colored CLI output.
- Smart transient key pruning to avoid partial-save translations.
### Changed
- `defaultLocale` and `llm.provider` are now required config fields.
- `llm.fallbacks[].model` is optional and defaults to the primary model.
- Translation cache across runs, retry/backoff handling, and fallback provider order.
- Budget guardrails for max tokens per run and per locale.
- Refactored compiler, extractor, config, and utils internals for maintainability.

## [0.1.4] - 2026-02-11
### Added
- Vue SFC `<template>` and `<i18n>` block extraction.
- Framework coverage for Svelte, Solid, Astro, Next.js App Router, and React Server Components.
- Expanded static analysis for alias imports, destructured `t`, nested calls, and tagged templates.
- Incremental extraction cache with file hashing and cached file lists for faster scans.
- Parallel locale translations with configurable concurrency limits (`batch.localeConcurrency`).
- New examples for Svelte, Solid, Astro, and a Next.js server component route.

### Changed
- Docs reorganized into a structured enterprise guide with new pages for Quick Start and Extraction.

## [0.1.3] - 2026-02-10
### Changed
- Application version for NPM normalization

## [0.1.2] - 2026-02-10
### Added
- Cleanup option to remove unused keys from locale files (`cleanup.removeUnused`).
- LLM provider support for Anthropic (Claude), Mistral, Cohere, Groq, DeepSeek, and OpenAI-compatible endpoints.
- Docs pages for LLM providers and changelog.

### Changed
- Docs and examples updated to reference new LLM providers.

## [0.1.1] - 2026-02-06
### Added
- Google AI (Gemini) provider.
- i18next and vue-i18n extraction support.
- Example apps for React, Next.js, and Vue.
- GitHub Pages documentation site.

## [0.1.0] - 2026-02-03
### Added
- Initial release.
