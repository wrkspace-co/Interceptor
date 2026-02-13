import fs from "node:fs/promises"
import path from "node:path"
import * as t from "@babel/types"
import type { ExtractedMessage, NormalizedConfig } from "../types"
import { createExtractionContext, collectAliases } from "./context"
import {
  parseSource,
  extractMessagesFromAst,
  extractMessagesFromExpression
} from "./ast"
import {
  extractVueScriptContent,
  extractVueTemplateContent,
  extractVueTemplateExpressions,
  extractMessagesFromVueI18nBlocks
} from "./frameworks/vue"
import { extractSvelteScriptBlocks, stripSvelteScriptBlocks } from "./frameworks/svelte"
import { extractAstroFrontmatter } from "./frameworks/astro"
import { extractBraceExpressions, normalizeTemplateExpression } from "./templates"

// Extract messages from multiple files.
export async function extractMessagesFromFiles(
  files: string[],
  config: NormalizedConfig
): Promise<ExtractedMessage[]> {
  const results: ExtractedMessage[] = []

  for (const file of files) {
    const messages = await extractMessagesFromFile(file, config)
    results.push(...messages)
  }

  return results
}

// Extract messages from a single file path.
export async function extractMessagesFromFile(
  filePath: string,
  config: NormalizedConfig
): Promise<ExtractedMessage[]> {
  const content = await fs.readFile(filePath, "utf8")
  return extractMessagesFromContent(content, filePath, config)
}

// Extract messages directly from source content.
export function extractMessagesFromContent(
  content: string,
  filePath: string,
  config: NormalizedConfig
): ExtractedMessage[] {
  const extracted: ExtractedMessage[] = []
  const ext = path.extname(filePath).toLowerCase()

  if (!content.trim()) {
    return extracted
  }

  const context = createExtractionContext(config)

  if (ext === ".vue") {
    const scriptSource = extractVueScriptContent(content)
    const scriptAst = parseSource(scriptSource)
    if (scriptAst) {
      collectAliases(scriptAst, context)
      extracted.push(...extractMessagesFromAst(scriptAst, context))
    }

    const templateSource = extractVueTemplateContent(content)
    const templateExpressions = extractVueTemplateExpressions(templateSource)
    for (const expression of templateExpressions) {
      extracted.push(...extractMessagesFromExpression(expression, context))
    }

    extracted.push(...extractMessagesFromVueI18nBlocks(content, config))
    return extracted
  }

  if (ext === ".svelte") {
    const scriptBlocks = extractSvelteScriptBlocks(content)
    const templateSource = stripSvelteScriptBlocks(content)
    const scriptAsts = scriptBlocks
      .map((source) => parseSource(source))
      .filter(Boolean) as t.File[]

    for (const ast of scriptAsts) {
      collectAliases(ast, context)
    }
    for (const ast of scriptAsts) {
      extracted.push(...extractMessagesFromAst(ast, context))
    }

    const expressions = extractBraceExpressions(templateSource).map(normalizeTemplateExpression)
    for (const expression of expressions) {
      if (!expression) continue
      extracted.push(...extractMessagesFromExpression(expression, context))
    }

    return extracted
  }

  if (ext === ".astro") {
    const { frontmatter, template } = extractAstroFrontmatter(content)
    const frontmatterAst = parseSource(frontmatter)
    if (frontmatterAst) {
      collectAliases(frontmatterAst, context)
      extracted.push(...extractMessagesFromAst(frontmatterAst, context))
    }

    const expressions = extractBraceExpressions(template).map(normalizeTemplateExpression)
    for (const expression of expressions) {
      if (!expression) continue
      extracted.push(...extractMessagesFromExpression(expression, context))
    }

    return extracted
  }

  const ast = parseSource(content)
  if (!ast) {
    return extracted
  }

  collectAliases(ast, context)
  extracted.push(...extractMessagesFromAst(ast, context))

  return extracted
}
