import * as t from "@babel/types"
import type { ExtractedMessageOrigin } from "../types"

// Extract a string literal key from an object property key node.
export function extractPropertyKey(key: t.ObjectProperty["key"]): string | null {
  if (t.isIdentifier(key)) {
    return key.name
  }
  if (t.isStringLiteral(key)) {
    return key.value
  }
  return null
}

// Resolve local name from object destructuring properties.
export function extractObjectPropertyLocalName(
  value: t.ObjectProperty["value"]
): string | null {
  if (t.isIdentifier(value)) {
    return value.name
  }
  if (t.isAssignmentPattern(value) && t.isIdentifier(value.left)) {
    return value.left.name
  }
  return null
}

// Extract the literal string from a node when safe.
export function extractLiteral(
  node?:
    | t.Expression
    | t.SpreadElement
    | t.JSXNamespacedName
    | t.ArgumentPlaceholder
    | null
): string | null {
  if (!node) return null
  if (t.isStringLiteral(node)) {
    return node.value
  }
  if (t.isTemplateLiteral(node) && node.expressions.length === 0) {
    return node.quasis[0]?.value.cooked ?? node.quasis[0]?.value.raw ?? null
  }
  return null
}

// Extract default values from i18next-style calls.
export function extractDefaultValue(
  node?: t.Expression | t.SpreadElement | t.JSXNamespacedName | t.ArgumentPlaceholder | null
): string | null {
  const literal = extractLiteral(node as t.Expression | t.SpreadElement | null)
  if (literal) {
    return literal
  }
  if (node && t.isObjectExpression(node)) {
    return getObjectStringProperty(node, "defaultValue")
  }
  return null
}

// Fetch a string property from an object expression.
export function getObjectStringProperty(
  node: t.ObjectExpression,
  name: string
): string | null {
  for (const prop of node.properties) {
    if (!t.isObjectProperty(prop) || prop.computed) {
      continue
    }
    const keyName = extractPropertyKey(prop.key)
    if (keyName !== name) {
      continue
    }
    return extractLiteral(prop.value as t.Expression | t.SpreadElement) ?? null
  }
  return null
}

// Build an ExtractedMessage descriptor from a react-intl message object.
export function extractMessageDescriptor(
  node: t.ObjectExpression,
  origin: ExtractedMessageOrigin,
  fallbackKey?: string
): { key: string; source: string; origin: ExtractedMessageOrigin } | null {
  const id = getObjectStringProperty(node, "id")
  const defaultMessage = getObjectStringProperty(node, "defaultMessage")
  const key = id ?? fallbackKey ?? defaultMessage
  const source = defaultMessage ?? key

  if (!key || !source) {
    return null
  }

  return {
    key,
    source,
    origin
  }
}

// Resolve import specifier names for alias tracking.
export function getImportSpecifierName(
  node: t.ImportSpecifier["imported"]
): string | null {
  if (t.isIdentifier(node)) {
    return node.name
  }
  if (t.isStringLiteral(node)) {
    return node.value
  }
  return null
}

// Unwrap awaited expressions when analyzing alias factories.
export function unwrapAwait(node: t.Expression): t.Expression {
  if (t.isAwaitExpression(node)) {
    return node.argument as t.Expression
  }
  return node
}

// Check whether a callee matches an identifier or alias set.
export function isIdentifierNamed(
  node: t.Expression | t.Super | t.V8IntrinsicIdentifier,
  name: string,
  aliases?: Set<string>
): boolean {
  return (
    (t.isIdentifier(node) && node.name === name) ||
    (aliases ? t.isIdentifier(node) && aliases.has(node.name) : false)
  )
}

// Determine if a call looks like formatMessage.
export function isFormatMessageCallee(
  callee: t.Expression | t.Super | t.V8IntrinsicIdentifier,
  aliases: Set<string>
): boolean {
  if (t.isIdentifier(callee)) {
    return callee.name === "formatMessage" || aliases.has(callee.name)
  }
  if (t.isMemberExpression(callee) && t.isIdentifier(callee.property)) {
    return callee.property.name === "formatMessage" || aliases.has(callee.property.name)
  }
  return false
}

// Determine if a callee belongs to i18next patterns.
export function isI18nextCallee(
  callee: t.Expression | t.Super | t.V8IntrinsicIdentifier,
  functions: Set<string>,
  memberFunctions: Set<string>,
  objects: Set<string>,
  objectFactoryOrigins: Map<string, "i18next" | "vue">
): boolean {
  if (t.isIdentifier(callee) && functions.has(callee.name)) {
    return true
  }
  return isMemberFunctionCallee(callee, memberFunctions, objects, objectFactoryOrigins, "i18next")
}

// Check member expression calls, including factory-derived objects.
export function isMemberFunctionCallee(
  callee: t.Expression | t.Super | t.V8IntrinsicIdentifier,
  memberFunctions: Set<string>,
  objects: Set<string>,
  objectFactoryOrigins: Map<string, "i18next" | "vue">,
  origin?: "i18next" | "vue"
): boolean {
  if (!t.isMemberExpression(callee)) {
    return false
  }
  const propertyName = getMemberPropertyName(callee.property)
  if (!propertyName || !memberFunctions.has(propertyName)) {
    return false
  }
  if (objects.size === 0) {
    return true
  }
  const root = getMemberRootName(callee.object)
  if (root && objects.has(root)) {
    return true
  }

  if (t.isCallExpression(callee.object)) {
    const calleeName = getCalleeName(callee.object.callee)
    if (!calleeName) return false
    const mappedOrigin = objectFactoryOrigins.get(calleeName)
    if (!mappedOrigin) return false
    if (origin && mappedOrigin !== origin) return false
    return true
  }

  return false
}

// Get the property name from a member expression.
export function getMemberPropertyName(
  property: t.MemberExpression["property"]
): string | null {
  if (t.isIdentifier(property)) {
    return property.name
  }
  if (t.isStringLiteral(property)) {
    return property.value
  }
  return null
}

// Resolve the root name from a member expression chain.
export function getMemberRootName(
  object: t.MemberExpression["object"]
): string | null {
  if (t.isIdentifier(object)) {
    return object.name
  }
  if (t.isThisExpression(object)) {
    return "this"
  }
  if (t.isMemberExpression(object)) {
    return getMemberRootName(object.object)
  }
  return null
}

// Resolve the callee name for factory detection.
export function getCalleeName(
  callee: t.Expression | t.Super | t.V8IntrinsicIdentifier
): string | null {
  if (t.isIdentifier(callee)) {
    return callee.name
  }
  if (t.isMemberExpression(callee) && t.isIdentifier(callee.property)) {
    return callee.property.name
  }
  return null
}

// Map factory calls like getTranslations/useTranslations to their origin.
export function getFactoryOriginFromCallee(
  callee: t.Expression | t.Super | t.V8IntrinsicIdentifier,
  factoryOrigins: Map<string, ExtractedMessageOrigin>
): ExtractedMessageOrigin | null {
  if (!t.isCallExpression(callee)) return null
  const name = getCalleeName(callee.callee)
  if (!name) return null
  return factoryOrigins.get(name) ?? null
}

// Extract JSX element name text.
export function extractJsxName(
  name: t.JSXIdentifier | t.JSXMemberExpression | t.JSXNamespacedName
): string | null {
  if (t.isJSXIdentifier(name)) {
    return name.name
  }
  if (t.isJSXMemberExpression(name)) {
    return name.property.name
  }
  return null
}

// Read string attributes from JSX elements.
export function getJsxAttributeString(
  attributes: Array<t.JSXAttribute | t.JSXSpreadAttribute>,
  name: string
): string | null {
  for (const attr of attributes) {
    if (!t.isJSXAttribute(attr)) continue
    const attrName = t.isJSXIdentifier(attr.name) ? attr.name.name : null
    if (attrName !== name) continue
    if (!attr.value) return null
    if (t.isStringLiteral(attr.value)) return attr.value.value
    if (t.isJSXExpressionContainer(attr.value)) {
      return extractLiteral(attr.value.expression as t.Expression) ?? null
    }
  }
  return null
}

// Extract text children from JSX nodes.
export function getJsxChildrenText(children: t.JSXElement["children"]): string | null {
  const textNodes = children.filter((child) => t.isJSXText(child))
  if (textNodes.length !== 1) return null
  const value = textNodes[0].value.trim()
  return value.length > 0 ? value : null
}
