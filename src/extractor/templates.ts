// Extract brace expressions from template-like content.
export function extractBraceExpressions(content: string): string[] {
  const expressions: string[] = []
  let depth = 0
  let start = -1
  let quote: "'" | '"' | "`" | null = null
  let escaped = false

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i]

    if (quote) {
      if (escaped) {
        escaped = false
        continue
      }
      if (char === "\\") {
        escaped = true
        continue
      }
      if (char === quote) {
        quote = null
      }
      continue
    }

    if (char === "'" || char === '"' || char === "`") {
      quote = char
      continue
    }

    if (char === "{") {
      if (depth === 0) {
        start = i + 1
      }
      depth += 1
      continue
    }

    if (char === "}") {
      depth -= 1
      if (depth === 0 && start >= 0) {
        expressions.push(content.slice(start, i).trim())
        start = -1
      }
    }
  }

  return expressions
}

// Normalize template expressions by trimming directive prefixes.
export function normalizeTemplateExpression(expression: string): string {
  const trimmed = expression.trim()
  if (!trimmed) return ""

  const directiveMatch = trimmed.match(/^([@#:][\w-]+)\s+([\s\S]*)$/)
  if (directiveMatch) {
    return directiveMatch[2].trim()
  }

  return trimmed
}
