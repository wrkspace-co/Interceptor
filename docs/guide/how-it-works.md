# How It Works

Interceptor follows a simple pipeline every time it runs.

## 1. Scan
It parses your source files and extracts strings from configured patterns.

Default extractors:
- `t("...")`
- `intl.formatMessage({ id, defaultMessage })`
- `<FormattedMessage id="..." defaultMessage="..." />`
- `defineMessages({ key: { id, defaultMessage } })`
- `i18n.t("key", "Default")` and `t("key", { defaultValue })`
- `<Trans i18nKey="key">Default</Trans>` (react-i18next)

You can change or disable extractors via `extractor` in the config.

## 2. Diff
Interceptor loads your existing locale files and compares them with the extracted keys. It keeps all existing translations intact.

## 3. Translate
Only missing keys are sent to the LLM provider. If the default locale file already contains a value for a key, that value is used as the translation source. Strings are batched to reduce API load and rate-limit issues.

## 4. Write
The compiler writes the new keys into your locale files while preserving existing entries. For the default locale, the source string is used directly.

## Optional: Cleanup
If `cleanup.removeUnused` is enabled, Interceptor removes keys that are no longer referenced by your source code.
