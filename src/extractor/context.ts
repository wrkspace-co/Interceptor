import traverseModule, { type NodePath } from "@babel/traverse"
import * as t from "@babel/types"
import type { ExtractedMessageOrigin, NormalizedConfig } from "../types"
import {
  extractPropertyKey,
  extractObjectPropertyLocalName,
  getCalleeName,
  getImportSpecifierName,
  unwrapAwait
} from "./helpers"

const traverse =
  (traverseModule as unknown as { default?: typeof traverseModule }).default ??
  traverseModule

type ReactIntlContext = {
  formatMessage: boolean
  formattedMessage: boolean
  defineMessages: boolean
  formatMessageAliases: Set<string>
  defineMessagesAliases: Set<string>
  formattedMessageAliases: Set<string>
}

type I18nextContext = {
  enabled: boolean
  functions: Set<string>
  memberFunctions: Set<string>
  objects: Set<string>
  useDefaultValue: boolean
  keyAsDefault: boolean
  transComponent: boolean
  transAliases: Set<string>
}

type VueI18nContext = {
  enabled: boolean
  functions: Set<string>
  memberFunctions: Set<string>
  objects: Set<string>
  keyAsDefault: boolean
}

export type ExtractionContext = {
  functionNames: Set<string>
  taggedNames: Set<string>
  reactIntl: ReactIntlContext
  i18next: I18nextContext
  vueI18n: VueI18nContext
  objectFactoryOrigins: Map<string, "i18next" | "vue">
  functionFactoryOrigins: Map<string, ExtractedMessageOrigin>
}

const DEFAULT_OBJECT_FACTORIES: Array<[string, "i18next" | "vue"]> = [
  ["useTranslation", "i18next"],
  ["useI18n", "vue"]
]

const DEFAULT_FUNCTION_FACTORIES: Array<[string, ExtractedMessageOrigin]> = [
  ["useTranslations", "function"],
  ["getTranslations", "function"],
  ["getFixedT", "i18next"]
]

// Build the extractor context with configured defaults.
export function createExtractionContext(config: NormalizedConfig): ExtractionContext {
  const functionNames = new Set([
    ...config.extractor.functions,
    ...config.extractor.i18next.functions,
    ...config.extractor.vueI18n.functions
  ])

  const taggedNames = new Set(config.extractor.taggedTemplates)

  const reactIntl: ReactIntlContext = {
    formatMessage: config.extractor.reactIntl.formatMessage,
    formattedMessage: config.extractor.reactIntl.formattedMessage,
    defineMessages: config.extractor.reactIntl.defineMessages,
    formatMessageAliases: new Set(),
    defineMessagesAliases: new Set(),
    formattedMessageAliases: new Set()
  }

  const i18next: I18nextContext = {
    enabled: config.extractor.i18next.enabled,
    functions: new Set(config.extractor.i18next.functions),
    memberFunctions: new Set(config.extractor.i18next.memberFunctions),
    objects: new Set(config.extractor.i18next.objects),
    useDefaultValue: config.extractor.i18next.useDefaultValue,
    keyAsDefault: config.extractor.i18next.keyAsDefault,
    transComponent: config.extractor.i18next.transComponent,
    transAliases: new Set()
  }

  const vueI18n: VueI18nContext = {
    enabled: config.extractor.vueI18n.enabled,
    functions: new Set(config.extractor.vueI18n.functions),
    memberFunctions: new Set(config.extractor.vueI18n.memberFunctions),
    objects: new Set(config.extractor.vueI18n.objects),
    keyAsDefault: config.extractor.vueI18n.keyAsDefault
  }

  const objectFactoryOrigins = new Map<string, "i18next" | "vue">(
    DEFAULT_OBJECT_FACTORIES
  )
  const functionFactoryOrigins = new Map<string, ExtractedMessageOrigin>(
    DEFAULT_FUNCTION_FACTORIES
  )

  return {
    functionNames,
    taggedNames,
    reactIntl,
    i18next,
    vueI18n,
    objectFactoryOrigins,
    functionFactoryOrigins
  }
}

// Collect alias mappings for imports, factory functions, and hooks.
export function collectAliases(ast: t.File, context: ExtractionContext): void {
  traverse(ast, {
    ImportDeclaration(path: NodePath<t.ImportDeclaration>) {
      for (const specifier of path.node.specifiers) {
        if (!t.isImportSpecifier(specifier)) {
          continue
        }

        const importedName = getImportSpecifierName(specifier.imported)
        const localName = specifier.local.name
        if (!importedName) continue

        if (importedName === "formatMessage") {
          context.reactIntl.formatMessageAliases.add(localName)
        }
        if (importedName === "defineMessages") {
          context.reactIntl.defineMessagesAliases.add(localName)
        }
        if (importedName === "FormattedMessage") {
          context.reactIntl.formattedMessageAliases.add(localName)
        }
        if (importedName === "Trans") {
          context.i18next.transAliases.add(localName)
        }

        if (context.functionNames.has(importedName)) {
          context.functionNames.add(localName)
        }
        if (context.i18next.functions.has(importedName)) {
          context.i18next.functions.add(localName)
        }
        if (context.vueI18n.functions.has(importedName)) {
          context.vueI18n.functions.add(localName)
        }

        if (context.objectFactoryOrigins.has(importedName)) {
          context.objectFactoryOrigins.set(
            localName,
            context.objectFactoryOrigins.get(importedName) as "i18next" | "vue"
          )
        }
        if (context.functionFactoryOrigins.has(importedName)) {
          context.functionFactoryOrigins.set(
            localName,
            context.functionFactoryOrigins.get(importedName) as ExtractedMessageOrigin
          )
        }
      }
    },
    VariableDeclarator(path: NodePath<t.VariableDeclarator>) {
      if (!path.node.init) return
      const init = unwrapAwait(path.node.init)
      if (!t.isCallExpression(init)) return

      const calleeName = getCalleeName(init.callee)
      if (!calleeName) return

      if (context.functionFactoryOrigins.has(calleeName)) {
        const origin = context.functionFactoryOrigins.get(calleeName) as ExtractedMessageOrigin
        addFunctionAliasFromPattern(path.node.id, context, origin)
      }

      if (context.objectFactoryOrigins.has(calleeName)) {
        const origin = context.objectFactoryOrigins.get(calleeName) as "i18next" | "vue"
        addObjectAliasesFromPattern(path.node.id, context, origin)
      }
    }
  })
}

// Register function aliases (t, translate, etc.) from destructuring patterns.
function addFunctionAliasFromPattern(
  pattern: t.LVal | t.VoidPattern,
  context: ExtractionContext,
  origin: ExtractedMessageOrigin
): void {
  if (t.isVoidPattern(pattern)) {
    return
  }
  if (t.isIdentifier(pattern)) {
    context.functionNames.add(pattern.name)
    if (origin === "i18next") {
      context.i18next.functions.add(pattern.name)
    }
    return
  }
  if (t.isObjectPattern(pattern)) {
    for (const prop of pattern.properties) {
      if (!t.isObjectProperty(prop)) continue
      const keyName = extractPropertyKey(prop.key)
      if (keyName !== "t") continue
      const localName = extractObjectPropertyLocalName(prop.value)
      if (!localName) continue
      context.functionNames.add(localName)
      if (origin === "i18next") {
        context.i18next.functions.add(localName)
      }
    }
  }
  if (t.isArrayPattern(pattern)) {
    const first = pattern.elements[0]
    if (!first) return
    if (t.isIdentifier(first)) {
      context.functionNames.add(first.name)
      if (origin === "i18next") {
        context.i18next.functions.add(first.name)
      }
    } else if (t.isAssignmentPattern(first) && t.isIdentifier(first.left)) {
      context.functionNames.add(first.left.name)
      if (origin === "i18next") {
        context.i18next.functions.add(first.left.name)
      }
    }
  }
}

// Register object aliases (i18n, vue-i18n objects) from patterns.
function addObjectAliasesFromPattern(
  pattern: t.LVal | t.VoidPattern,
  context: ExtractionContext,
  origin: "i18next" | "vue"
): void {
  if (t.isVoidPattern(pattern)) {
    return
  }
  if (t.isIdentifier(pattern)) {
    if (origin === "i18next") {
      context.i18next.objects.add(pattern.name)
    }
    if (origin === "vue") {
      context.vueI18n.objects.add(pattern.name)
    }
    return
  }
  if (t.isArrayPattern(pattern)) {
    const first = pattern.elements[0]
    if (!first) return
    if (t.isIdentifier(first)) {
      context.functionNames.add(first.name)
      if (origin === "i18next") {
        context.i18next.functions.add(first.name)
      }
      if (origin === "vue") {
        context.vueI18n.functions.add(first.name)
      }
    } else if (t.isAssignmentPattern(first) && t.isIdentifier(first.left)) {
      context.functionNames.add(first.left.name)
      if (origin === "i18next") {
        context.i18next.functions.add(first.left.name)
      }
      if (origin === "vue") {
        context.vueI18n.functions.add(first.left.name)
      }
    }
    return
  }
  if (!t.isObjectPattern(pattern)) return

  for (const prop of pattern.properties) {
    if (!t.isObjectProperty(prop)) continue
    const keyName = extractPropertyKey(prop.key)
    if (!keyName) continue
    const localName = extractObjectPropertyLocalName(prop.value)
    if (!localName) continue

    if (keyName === "t") {
      context.functionNames.add(localName)
      if (origin === "i18next") {
        context.i18next.functions.add(localName)
      }
      if (origin === "vue") {
        context.vueI18n.functions.add(localName)
      }
    }

    if (origin === "i18next" && keyName === "i18n") {
      context.i18next.objects.add(localName)
    }
  }
}
