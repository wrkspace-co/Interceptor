# How It Works

Interceptor follows a deterministic pipeline on every run.

## 1. Scan
The extractor parses supported files and collects translation calls based on your configuration. Extraction is static and string-literal only. Interceptor caches file hashes so unchanged files are not re-parsed on subsequent runs.

## 2. Diff
Existing locale files are loaded and compared with extracted keys. Keys already present are never overwritten.

## 3. Translate
Only missing keys are sent to the configured LLM provider. Strings are batched to control costs and rate limits, with optional retries and a fallback provider chain. Translations are cached across runs to avoid re-requesting the same strings. If the default locale already has a value for a key, that value is used as the translation source.

## 4. Write
Locale files are updated with new keys. The default locale is populated with the source string. Other locales receive the translated value.

## Optional: Cleanup
If `cleanup.removeUnused` is enabled, keys not referenced by source code are removed from locale files.

## Guarantees
- Existing translations are preserved.
- Only missing keys are translated.
- File writes are deterministic and stable between runs.
