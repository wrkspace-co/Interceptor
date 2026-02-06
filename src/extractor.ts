import fs from "node:fs/promises";
import { parse } from "@babel/parser";
import traverseModule, { type NodePath } from "@babel/traverse";
import * as t from "@babel/types";
import { ExtractedMessage, NormalizedConfig } from "./types";

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
];

const traverse =
  (traverseModule as unknown as { default?: typeof traverseModule }).default ??
  traverseModule;

export async function extractMessagesFromFiles(
  files: string[],
  config: NormalizedConfig
): Promise<ExtractedMessage[]> {
  const results: ExtractedMessage[] = [];

  for (const file of files) {
    const messages = await extractMessagesFromFile(file, config);
    results.push(...messages);
  }

  return results;
}

export async function extractMessagesFromFile(
  filePath: string,
  config: NormalizedConfig
): Promise<ExtractedMessage[]> {
  const content = await fs.readFile(filePath, "utf8");
  const extracted: ExtractedMessage[] = [];

  const source = filePath.endsWith(".vue") ? extractVueScriptContent(content) : content;
  if (!source.trim()) {
    return extracted;
  }

  const ast = parse(source, {
    sourceType: "unambiguous",
    plugins: PARSER_PLUGINS
  });

  const functionNames = new Set(config.extractor.functions);
  const taggedNames = new Set(config.extractor.taggedTemplates);
  const reactIntl = config.extractor.reactIntl;
  const i18next = config.extractor.i18next;
  const vueI18n = config.extractor.vueI18n;

  traverse(ast, {
    CallExpression(path: NodePath<t.CallExpression>) {
      const callee = path.node.callee;

      if (reactIntl.defineMessages && isIdentifierNamed(callee, "defineMessages")) {
        const arg = path.node.arguments[0];
        if (t.isObjectExpression(arg)) {
          for (const prop of arg.properties) {
            if (!t.isObjectProperty(prop) || !t.isObjectExpression(prop.value)) {
              continue;
            }
            const fallbackKey = extractPropertyKey(prop.key) ?? undefined;
            const message = extractMessageDescriptor(
              prop.value,
              "defineMessages",
              fallbackKey
            );
            if (message) {
              extracted.push(message);
            }
          }
        }
        return;
      }

      if (reactIntl.formatMessage && isFormatMessageCallee(callee)) {
        const arg = path.node.arguments[0];
        if (t.isObjectExpression(arg)) {
          const message = extractMessageDescriptor(arg, "formatMessage");
          if (message) {
            extracted.push(message);
          }
        }
        return;
      }

      if (i18next.enabled && isI18nextCallee(callee, i18next.functions, i18next.memberFunctions, i18next.objects)) {
        const key = extractLiteral(path.node.arguments[0]);
        if (!key) return;

        const defaultValue = i18next.useDefaultValue
          ? extractDefaultValue(path.node.arguments[1])
          : null;
        const source = defaultValue ?? (i18next.keyAsDefault ? key : null);

        if (source) {
          extracted.push({ key, source, origin: "i18next" });
        }
        return;
      }

      if (vueI18n.enabled && isMemberFunctionCallee(callee, vueI18n.memberFunctions, vueI18n.objects)) {
        const key = extractLiteral(path.node.arguments[0]);
        const source = key && vueI18n.keyAsDefault ? key : null;
        if (key && source) {
          extracted.push({ key, source, origin: "vueI18n" });
        }
        return;
      }

      if (vueI18n.enabled && t.isIdentifier(callee) && vueI18n.functions.includes(callee.name)) {
        const key = extractLiteral(path.node.arguments[0]);
        const source = key && vueI18n.keyAsDefault ? key : null;
        if (key && source) {
          extracted.push({ key, source, origin: "vueI18n" });
        }
        return;
      }

      if (t.isIdentifier(callee) && functionNames.has(callee.name)) {
        const firstArg = path.node.arguments[0];
        const extractedValue = extractLiteral(firstArg);
        if (extractedValue) {
          extracted.push({
            key: extractedValue,
            source: extractedValue,
            origin: "function"
          });
        }
      }
    },
    TaggedTemplateExpression(path: NodePath<t.TaggedTemplateExpression>) {
      const tag = path.node.tag;
      if (!t.isIdentifier(tag) || !taggedNames.has(tag.name)) {
        return;
      }

      const template = path.node.quasi;
      if (template.expressions.length > 0) {
        return;
      }

      const value = template.quasis[0]?.value.cooked ?? template.quasis[0]?.value.raw;
      if (value) {
        extracted.push({ key: value, source: value, origin: "tag" });
      }
    },
    JSXElement(path: NodePath<t.JSXElement>) {
      const opening = path.node.openingElement;
      const name = extractJsxName(opening.name);

      if (reactIntl.formattedMessage && name === "FormattedMessage") {
        const id = getJsxAttributeString(opening.attributes, "id");
        let defaultMessage = getJsxAttributeString(
          opening.attributes,
          "defaultMessage"
        );

        if (!defaultMessage) {
          defaultMessage = getJsxChildrenText(path.node.children);
        }

        const key = id ?? defaultMessage;
        const source = defaultMessage ?? key;

        if (key && source) {
          extracted.push({
            key,
            source,
            origin: "formattedMessage"
          });
        }
      }

      if (i18next.enabled && i18next.transComponent && name === "Trans") {
        const key = getJsxAttributeString(opening.attributes, "i18nKey");
        let defaultMessage = getJsxAttributeString(opening.attributes, "defaults");
        if (!defaultMessage) {
          defaultMessage = getJsxChildrenText(path.node.children);
        }

        const resolvedKey = key ?? defaultMessage;
        const source = defaultMessage ?? resolvedKey;
        if (resolvedKey && source) {
          extracted.push({
            key: resolvedKey,
            source,
            origin: "trans"
          });
        }
      }
    }
  });

  return extracted;
}

function extractMessageDescriptor(
  node: t.ObjectExpression,
  origin: ExtractedMessage["origin"],
  fallbackKey?: string
): ExtractedMessage | null {
  const id = getObjectStringProperty(node, "id");
  const defaultMessage = getObjectStringProperty(node, "defaultMessage");
  const key = id ?? fallbackKey ?? defaultMessage;
  const source = defaultMessage ?? key;

  if (!key || !source) {
    return null;
  }

  return {
    key,
    source,
    origin
  };
}

function getObjectStringProperty(
  node: t.ObjectExpression,
  name: string
): string | null {
  for (const prop of node.properties) {
    if (!t.isObjectProperty(prop) || prop.computed) {
      continue;
    }
    const keyName = extractPropertyKey(prop.key);
    if (keyName !== name) {
      continue;
    }
    return extractLiteral(prop.value as t.Expression | t.SpreadElement) ?? null;
  }
  return null;
}

function extractPropertyKey(key: t.ObjectProperty["key"]): string | null {
  if (t.isIdentifier(key)) {
    return key.name;
  }
  if (t.isStringLiteral(key)) {
    return key.value;
  }
  return null;
}

function isIdentifierNamed(node: t.Expression | t.Super | t.V8IntrinsicIdentifier, name: string): boolean {
  return t.isIdentifier(node) && node.name === name;
}

function isFormatMessageCallee(
  callee: t.Expression | t.Super | t.V8IntrinsicIdentifier
): boolean {
  if (t.isIdentifier(callee)) {
    return callee.name === "formatMessage";
  }
  if (t.isMemberExpression(callee) && t.isIdentifier(callee.property)) {
    return callee.property.name === "formatMessage";
  }
  return false;
}

function isI18nextCallee(
  callee: t.Expression | t.Super | t.V8IntrinsicIdentifier,
  functions: string[],
  memberFunctions: string[],
  objects: string[]
): boolean {
  if (t.isIdentifier(callee) && functions.includes(callee.name)) {
    return true;
  }
  return isMemberFunctionCallee(callee, memberFunctions, objects);
}

function isMemberFunctionCallee(
  callee: t.Expression | t.Super | t.V8IntrinsicIdentifier,
  memberFunctions: string[],
  objects: string[]
): boolean {
  if (!t.isMemberExpression(callee)) {
    return false;
  }
  const propertyName = getMemberPropertyName(callee.property);
  if (!propertyName || !memberFunctions.includes(propertyName)) {
    return false;
  }
  if (objects.length === 0) {
    return true;
  }
  const root = getMemberRootName(callee.object);
  if (!root) {
    return false;
  }
  return objects.includes(root);
}

function getMemberPropertyName(
  property: t.MemberExpression["property"]
): string | null {
  if (t.isIdentifier(property)) {
    return property.name;
  }
  if (t.isStringLiteral(property)) {
    return property.value;
  }
  return null;
}

function getMemberRootName(
  object: t.MemberExpression["object"]
): string | null {
  if (t.isIdentifier(object)) {
    return object.name;
  }
  if (t.isThisExpression(object)) {
    return "this";
  }
  if (t.isMemberExpression(object)) {
    return getMemberRootName(object.object);
  }
  return null;
}

function extractJsxName(name: t.JSXIdentifier | t.JSXMemberExpression | t.JSXNamespacedName): string | null {
  if (t.isJSXIdentifier(name)) {
    return name.name;
  }
  if (t.isJSXMemberExpression(name)) {
    return name.property.name;
  }
  return null;
}

function getJsxAttributeString(
  attributes: Array<t.JSXAttribute | t.JSXSpreadAttribute>,
  name: string
): string | null {
  for (const attr of attributes) {
    if (!t.isJSXAttribute(attr)) continue;
    const attrName = t.isJSXIdentifier(attr.name) ? attr.name.name : null;
    if (attrName !== name) continue;
    if (!attr.value) return null;
    if (t.isStringLiteral(attr.value)) return attr.value.value;
    if (t.isJSXExpressionContainer(attr.value)) {
      return extractLiteral(attr.value.expression as t.Expression) ?? null;
    }
  }
  return null;
}

function getJsxChildrenText(children: t.JSXElement["children"]): string | null {
  const textNodes = children.filter((child) => t.isJSXText(child));
  if (textNodes.length !== 1) return null;
  const value = textNodes[0].value.trim();
  return value.length > 0 ? value : null;
}

function extractDefaultValue(
  node?: t.Expression | t.SpreadElement | t.JSXNamespacedName | t.ArgumentPlaceholder | null
): string | null {
  const literal = extractLiteral(node as t.Expression | t.SpreadElement | null);
  if (literal) {
    return literal;
  }
  if (node && t.isObjectExpression(node)) {
    return getObjectStringProperty(node, "defaultValue");
  }
  return null;
}

function extractLiteral(
  node?:
    | t.Expression
    | t.SpreadElement
    | t.JSXNamespacedName
    | t.ArgumentPlaceholder
    | null
): string | null {
  if (!node) return null;
  if (t.isStringLiteral(node)) {
    return node.value;
  }
  if (t.isTemplateLiteral(node) && node.expressions.length === 0) {
    return node.quasis[0]?.value.cooked ?? node.quasis[0]?.value.raw ?? null;
  }
  return null;
}

function extractVueScriptContent(content: string): string {
  const blocks = Array.from(
    content.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)
  );
  if (blocks.length === 0) return "";
  return blocks.map((match) => match[1]).join("\n");
}
