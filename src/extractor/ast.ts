import { parse } from "@babel/parser"
import traverseModule, { type NodePath } from "@babel/traverse"
import * as t from "@babel/types"
import type { ExtractedMessage } from "../types"
import type { ExtractionContext } from "./context"
import {
  extractMessageDescriptor,
  extractLiteral,
  extractDefaultValue,
  extractPropertyKey,
  extractJsxName,
  getFactoryOriginFromCallee,
  getJsxAttributeString,
  getJsxChildrenText,
  getMemberPropertyName,
  isFormatMessageCallee,
  isI18nextCallee,
  isIdentifierNamed,
  isMemberFunctionCallee
} from "./helpers"

const PARSER_PLUGINS: Array<
  | "typescript"
  | "jsx"
  | "classProperties"
  | "classPrivateProperties"
  | "classPrivateMethods"
  | "decorators-legacy"
  | "dynamicImport"
  | "importMeta"
  | "topLevelAwait"
> = [
  "typescript",
  "jsx",
  "classProperties",
  "classPrivateProperties",
  "classPrivateMethods",
  "decorators-legacy",
  "dynamicImport",
  "importMeta",
  "topLevelAwait"
]

const traverse =
  (traverseModule as unknown as { default?: typeof traverseModule }).default ??
  traverseModule

// Parse a source string into a Babel AST.
export function parseSource(source: string): t.File | null {
  if (!source.trim()) return null
  try {
    return parse(source, {
      sourceType: "unambiguous",
      plugins: PARSER_PLUGINS
    })
  } catch {
    return null
  }
}

// Extract messages from an AST using the provided context.
export function extractMessagesFromAst(
  ast: t.File,
  context: ExtractionContext
): ExtractedMessage[] {
  const extracted: ExtractedMessage[] = []

  const functionNames = context.functionNames
  const taggedNames = context.taggedNames
  const reactIntl = context.reactIntl
  const i18next = context.i18next
  const vueI18n = context.vueI18n

  traverse(ast, {
    CallExpression(path: NodePath<t.CallExpression>) {
      const callee = path.node.callee

      if (
        reactIntl.defineMessages &&
        isIdentifierNamed(callee, "defineMessages", reactIntl.defineMessagesAliases)
      ) {
        const arg = path.node.arguments[0]
        if (t.isObjectExpression(arg)) {
          for (const prop of arg.properties) {
            if (!t.isObjectProperty(prop) || !t.isObjectExpression(prop.value)) {
              continue
            }
            const fallbackKey = extractPropertyKey(prop.key) ?? undefined
            const message = extractMessageDescriptor(
              prop.value,
              "defineMessages",
              fallbackKey
            )
            if (message) {
              extracted.push(message)
            }
          }
        }
        return
      }

      if (reactIntl.formatMessage && isFormatMessageCallee(callee, reactIntl.formatMessageAliases)) {
        const arg = path.node.arguments[0]
        if (t.isObjectExpression(arg)) {
          const message = extractMessageDescriptor(arg, "formatMessage")
          if (message) {
            extracted.push(message)
          }
        }
        return
      }

      const factoryOrigin = getFactoryOriginFromCallee(callee, context.functionFactoryOrigins)
      if (factoryOrigin) {
        const key = extractLiteral(path.node.arguments[0])
        if (key) {
          extracted.push({ key, source: key, origin: factoryOrigin })
        }
        return
      }

      if (
        i18next.enabled &&
        isI18nextCallee(
          callee,
          i18next.functions,
          i18next.memberFunctions,
          i18next.objects,
          context.objectFactoryOrigins
        )
      ) {
        const key = extractLiteral(path.node.arguments[0])
        if (!key) return

        const defaultValue = i18next.useDefaultValue
          ? extractDefaultValue(path.node.arguments[1])
          : null
        const source = defaultValue ?? (i18next.keyAsDefault ? key : null)

        if (source) {
          extracted.push({ key, source, origin: "i18next" })
        }
        return
      }

      if (
        vueI18n.enabled &&
        isMemberFunctionCallee(
          callee,
          vueI18n.memberFunctions,
          vueI18n.objects,
          context.objectFactoryOrigins,
          "vue"
        )
      ) {
        const key = extractLiteral(path.node.arguments[0])
        const source = key && vueI18n.keyAsDefault ? key : null
        if (key && source) {
          extracted.push({ key, source, origin: "vueI18n" })
        }
        return
      }

      if (vueI18n.enabled && t.isIdentifier(callee) && vueI18n.functions.has(callee.name)) {
        const key = extractLiteral(path.node.arguments[0])
        const source = key && vueI18n.keyAsDefault ? key : null
        if (key && source) {
          extracted.push({ key, source, origin: "vueI18n" })
        }
        return
      }

      if (t.isIdentifier(callee) && functionNames.has(callee.name)) {
        const firstArg = path.node.arguments[0]
        const extractedValue = extractLiteral(firstArg)
        if (extractedValue) {
          extracted.push({
            key: extractedValue,
            source: extractedValue,
            origin: "function"
          })
        }
      }
    },
    TaggedTemplateExpression(path: NodePath<t.TaggedTemplateExpression>) {
      const tag = path.node.tag
      let tagName: string | null = null

      if (t.isIdentifier(tag)) {
        tagName = tag.name
      } else if (t.isMemberExpression(tag)) {
        tagName = getMemberPropertyName(tag.property)
        if (
          tagName &&
          !isMemberFunctionCallee(
            tag,
            new Set([tagName]),
            new Set(),
            context.objectFactoryOrigins
          )
        ) {
          tagName = null
        }
      }

      if (!tagName) return
      if (!taggedNames.has(tagName) && !functionNames.has(tagName)) {
        return
      }

      const template = path.node.quasi
      if (template.expressions.length > 0) {
        return
      }

      const value = template.quasis[0]?.value.cooked ?? template.quasis[0]?.value.raw
      if (value) {
        extracted.push({ key: value, source: value, origin: "tag" })
      }
    },
    JSXElement(path: NodePath<t.JSXElement>) {
      const opening = path.node.openingElement
      const name = extractJsxName(opening.name)

      if (
        reactIntl.formattedMessage &&
        (name === "FormattedMessage" ||
          (name !== null && reactIntl.formattedMessageAliases.has(name)))
      ) {
        const id = getJsxAttributeString(opening.attributes, "id")
        let defaultMessage = getJsxAttributeString(opening.attributes, "defaultMessage")

        if (!defaultMessage) {
          defaultMessage = getJsxChildrenText(path.node.children)
        }

        const key = id ?? defaultMessage
        const source = defaultMessage ?? key

        if (key && source) {
          extracted.push({
            key,
            source,
            origin: "formattedMessage"
          })
        }
      }

      if (
        i18next.enabled &&
        i18next.transComponent &&
        (name === "Trans" || (name !== null && i18next.transAliases.has(name)))
      ) {
        const key = getJsxAttributeString(opening.attributes, "i18nKey")
        let defaultMessage = getJsxAttributeString(opening.attributes, "defaults")
        if (!defaultMessage) {
          defaultMessage = getJsxChildrenText(path.node.children)
        }

        const resolvedKey = key ?? defaultMessage
        const source = defaultMessage ?? resolvedKey
        if (resolvedKey && source) {
          extracted.push({
            key: resolvedKey,
            source,
            origin: "trans"
          })
        }
      }
    }
  })

  return extracted
}

// Extract messages from a single inline expression (template or attribute).
export function extractMessagesFromExpression(
  expression: string,
  context: ExtractionContext
): ExtractedMessage[] {
  const wrapped = `(${expression})`
  const ast = parseSource(wrapped)
  if (!ast) return []
  return extractMessagesFromAst(ast, context)
}
