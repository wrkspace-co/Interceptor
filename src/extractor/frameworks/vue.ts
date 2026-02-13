import type { ExtractedMessage, NormalizedConfig } from "../../types"

// Extract Vue <script> content for AST parsing.
export function extractVueScriptContent(content: string): string {
  const blocks = Array.from(
    content.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)
  )
  if (blocks.length === 0) return ""
  return blocks.map((match) => match[1]).join("\n")
}

// Extract Vue <template> markup for template analysis.
export function extractVueTemplateContent(content: string): string {
  const blocks = Array.from(
    content.matchAll(/<template\b[^>]*>([\s\S]*?)<\/template>/gi)
  )
  if (blocks.length === 0) return ""
  return blocks.map((match) => match[1]).join("\n")
}

// Extract moustache and directive expressions from Vue templates.
export function extractVueTemplateExpressions(template: string): string[] {
  const expressions: string[] = []
  if (!template.trim()) return expressions

  const moustacheRegex = /\{\{([\s\S]*?)\}\}/g
  let match: RegExpExecArray | null
  while ((match = moustacheRegex.exec(template))) {
    const expr = match[1]?.trim()
    if (expr) expressions.push(expr)
  }

  const attrRegex =
    /(?:^|\s)(?:v-[\w:-]+|[:@][\w:-]+)\s*=\s*("([\s\S]*?)"|'([\s\S]*?)')/g
  while ((match = attrRegex.exec(template))) {
    const expr = (match[2] ?? match[3] ?? "").trim()
    if (expr) expressions.push(expr)
  }

  return expressions
}

// Extract messages from Vue SFC <i18n> blocks.
export function extractMessagesFromVueI18nBlocks(
  content: string,
  config: NormalizedConfig
): ExtractedMessage[] {
  const extracted: ExtractedMessage[] = []
  const blocks = Array.from(
    content.matchAll(/<i18n\b[^>]*>([\s\S]*?)<\/i18n>/gi)
  )
  if (blocks.length === 0) return extracted

  for (const match of blocks) {
    const raw = match[1]?.trim()
    if (!raw) continue

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      continue
    }

    if (!parsed || typeof parsed !== "object") continue

    const locales = new Set(config.locales)
    const parsedObj = parsed as Record<string, unknown>
    const hasLocaleKeys = Object.keys(parsedObj).some((key) => locales.has(key))

    let messages: Record<string, unknown> | null = null
    if (hasLocaleKeys) {
      const localeKey =
        config.defaultLocale in parsedObj && typeof parsedObj[config.defaultLocale] === "object"
          ? config.defaultLocale
          : Object.keys(parsedObj).find((key) => locales.has(key))
      if (localeKey && parsedObj[localeKey] && typeof parsedObj[localeKey] === "object") {
        messages = parsedObj[localeKey] as Record<string, unknown>
      }
    } else {
      messages = parsedObj as Record<string, unknown>
    }

    if (!messages) continue

    const flattened = flattenMessages(messages)
    for (const [key, value] of flattened) {
      extracted.push({ key, source: value, origin: "vueI18n" })
    }
  }

  return extracted
}

// Flatten nested locale objects into dot-notation keys.
function flattenMessages(
  obj: Record<string, unknown>,
  prefix = ""
): Array<[string, string]> {
  const entries: Array<[string, string]> = []
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (typeof value === "string") {
      entries.push([fullKey, value])
      continue
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      entries.push(...flattenMessages(value as Record<string, unknown>, fullKey))
    }
  }
  return entries
}
