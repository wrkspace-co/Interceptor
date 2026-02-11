# Extraction & Coverage

Interceptor extracts translation keys using static analysis. It does not execute your code.

## Supported patterns
### Common `t()` calls
- `t("key")`
- `i18n.t("key")`
- `useTranslation().t("key")`
- `const { t } = useTranslation(); t("key")`
- `const [t] = useTranslation(); t("key")`
- Alias imports like `import { t as translate } from "i18next"`
- Hooks returning `t` such as `useI18n()` in Solid or Vue

### Tagged templates
```ts
t`key`
```

### react-intl
- `intl.formatMessage({ id, defaultMessage })`
- `<FormattedMessage id="..." defaultMessage="..." />`
- `defineMessages({ key: { id, defaultMessage } })`

### i18next
- `t("key", "Default")`
- `i18n.t("key", { defaultValue: "Default" })`
- `<Trans i18nKey="key">Default</Trans>`

### vue-i18n
- `t("key")`, `$t("key")`
```vue
<template>{{ $t('key') }}</template>
<i18n>{ "en": { "key": "Value" } }</i18n>
```

### next-intl
- `useTranslations("Namespace")("key")`
- `await getTranslations("Namespace")("key")`

## Supported file types
- `.ts`, `.tsx`, `.js`, `.jsx`
- `.vue` SFCs (`<script>`, `<template>`, `<i18n>` blocks)
- `.svelte` (script + template expressions)
- `.astro` (frontmatter + template expressions)

## Vue SFC notes
- Template expressions and directive bindings are scanned.
- `<i18n>` blocks are parsed as JSON. YAML is not supported yet.

## Svelte and Astro notes
- Svelte template expressions inside `{}` are scanned.
- Astro frontmatter and template expressions are scanned.

## Limitations
- Only static string literals are extracted.
- Expressions like `t(foo)` or `t("prefix-" + key)` are ignored.
- Template expressions containing variables are ignored unless the key is a string literal.
