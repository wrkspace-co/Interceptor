import fs from "node:fs/promises";
import path from "node:path";
import { parse } from "@babel/parser";
import traverseModule, { type NodePath } from "@babel/traverse";
import * as t from "@babel/types";
import { ExtractedMessage, NormalizedConfig, ExtractedMessageOrigin } from "./types";

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

type ReactIntlContext = {
  formatMessage: boolean;
  formattedMessage: boolean;
  defineMessages: boolean;
  formatMessageAliases: Set<string>;
  defineMessagesAliases: Set<string>;
  formattedMessageAliases: Set<string>;
};

type I18nextContext = {
  enabled: boolean;
  functions: Set<string>;
  memberFunctions: Set<string>;
  objects: Set<string>;
  useDefaultValue: boolean;
  keyAsDefault: boolean;
  transComponent: boolean;
  transAliases: Set<string>;
};

type VueI18nContext = {
  enabled: boolean;
  functions: Set<string>;
  memberFunctions: Set<string>;
  objects: Set<string>;
  keyAsDefault: boolean;
};

type ExtractionContext = {
  functionNames: Set<string>;
  taggedNames: Set<string>;
  reactIntl: ReactIntlContext;
  i18next: I18nextContext;
  vueI18n: VueI18nContext;
  objectFactoryOrigins: Map<string, "i18next" | "vue">;
  functionFactoryOrigins: Map<string, ExtractedMessageOrigin>;
};

const DEFAULT_OBJECT_FACTORIES: Array<[string, "i18next" | "vue"]> = [
  ["useTranslation", "i18next"],
  ["useI18n", "vue"]
];

const DEFAULT_FUNCTION_FACTORIES: Array<[string, ExtractedMessageOrigin]> = [
  ["useTranslations", "function"],
  ["getTranslations", "function"],
  ["getFixedT", "i18next"]
];

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
  return extractMessagesFromContent(content, filePath, config);
}

export function extractMessagesFromContent(
  content: string,
  filePath: string,
  config: NormalizedConfig
): ExtractedMessage[] {
  const extracted: ExtractedMessage[] = [];
  const ext = path.extname(filePath).toLowerCase();

  if (!content.trim()) {
    return extracted;
  }

  const context = createExtractionContext(config);

  if (ext === ".vue") {
    const scriptSource = extractVueScriptContent(content);
    const scriptAst = parseSource(scriptSource);
    if (scriptAst) {
      collectAliases(scriptAst, context);
      extracted.push(...extractMessagesFromAst(scriptAst, context));
    }

    const templateSource = extractVueTemplateContent(content);
    const templateExpressions = extractVueTemplateExpressions(templateSource);
    for (const expression of templateExpressions) {
      extracted.push(...extractMessagesFromExpression(expression, context));
    }

    extracted.push(...extractMessagesFromVueI18nBlocks(content, config));
    return extracted;
  }

  if (ext === ".svelte") {
    const scriptBlocks = extractSvelteScriptBlocks(content);
    const templateSource = stripSvelteScriptBlocks(content);
    const scriptAsts = scriptBlocks
      .map((source) => parseSource(source))
      .filter((ast): ast is t.File => Boolean(ast));

    for (const ast of scriptAsts) {
      collectAliases(ast, context);
    }
    for (const ast of scriptAsts) {
      extracted.push(...extractMessagesFromAst(ast, context));
    }

    const expressions = extractBraceExpressions(templateSource).map(normalizeTemplateExpression);
    for (const expression of expressions) {
      if (!expression) continue;
      extracted.push(...extractMessagesFromExpression(expression, context));
    }

    return extracted;
  }

  if (ext === ".astro") {
    const { frontmatter, template } = extractAstroFrontmatter(content);
    const frontmatterAst = parseSource(frontmatter);
    if (frontmatterAst) {
      collectAliases(frontmatterAst, context);
      extracted.push(...extractMessagesFromAst(frontmatterAst, context));
    }

    const expressions = extractBraceExpressions(template).map(normalizeTemplateExpression);
    for (const expression of expressions) {
      if (!expression) continue;
      extracted.push(...extractMessagesFromExpression(expression, context));
    }

    return extracted;
  }

  const ast = parseSource(content);
  if (!ast) {
    return extracted;
  }

  collectAliases(ast, context);
  extracted.push(...extractMessagesFromAst(ast, context));

  return extracted;
}

function createExtractionContext(config: NormalizedConfig): ExtractionContext {
  const functionNames = new Set([
    ...config.extractor.functions,
    ...config.extractor.i18next.functions,
    ...config.extractor.vueI18n.functions
  ]);

  const taggedNames = new Set(config.extractor.taggedTemplates);

  const reactIntl: ReactIntlContext = {
    formatMessage: config.extractor.reactIntl.formatMessage,
    formattedMessage: config.extractor.reactIntl.formattedMessage,
    defineMessages: config.extractor.reactIntl.defineMessages,
    formatMessageAliases: new Set(),
    defineMessagesAliases: new Set(),
    formattedMessageAliases: new Set()
  };

  const i18next: I18nextContext = {
    enabled: config.extractor.i18next.enabled,
    functions: new Set(config.extractor.i18next.functions),
    memberFunctions: new Set(config.extractor.i18next.memberFunctions),
    objects: new Set(config.extractor.i18next.objects),
    useDefaultValue: config.extractor.i18next.useDefaultValue,
    keyAsDefault: config.extractor.i18next.keyAsDefault,
    transComponent: config.extractor.i18next.transComponent,
    transAliases: new Set()
  };

  const vueI18n: VueI18nContext = {
    enabled: config.extractor.vueI18n.enabled,
    functions: new Set(config.extractor.vueI18n.functions),
    memberFunctions: new Set(config.extractor.vueI18n.memberFunctions),
    objects: new Set(config.extractor.vueI18n.objects),
    keyAsDefault: config.extractor.vueI18n.keyAsDefault
  };

  const objectFactoryOrigins = new Map<string, "i18next" | "vue">(
    DEFAULT_OBJECT_FACTORIES
  );
  const functionFactoryOrigins = new Map<string, ExtractedMessageOrigin>(
    DEFAULT_FUNCTION_FACTORIES
  );

  return {
    functionNames,
    taggedNames,
    reactIntl,
    i18next,
    vueI18n,
    objectFactoryOrigins,
    functionFactoryOrigins
  };
}

function collectAliases(ast: t.File, context: ExtractionContext): void {
  traverse(ast, {
    ImportDeclaration(path: NodePath<t.ImportDeclaration>) {
      for (const specifier of path.node.specifiers) {
        if (t.isImportSpecifier(specifier)) {
          const importedName = getImportSpecifierName(specifier.imported);
          const localName = specifier.local.name;
          if (!importedName) continue;

          if (importedName === "formatMessage") {
            context.reactIntl.formatMessageAliases.add(localName);
          }
          if (importedName === "defineMessages") {
            context.reactIntl.defineMessagesAliases.add(localName);
          }
          if (importedName === "FormattedMessage") {
            context.reactIntl.formattedMessageAliases.add(localName);
          }
          if (importedName === "Trans") {
            context.i18next.transAliases.add(localName);
          }

          if (context.functionNames.has(importedName)) {
            context.functionNames.add(localName);
          }
          if (context.i18next.functions.has(importedName)) {
            context.i18next.functions.add(localName);
          }
          if (context.vueI18n.functions.has(importedName)) {
            context.vueI18n.functions.add(localName);
          }

          if (context.objectFactoryOrigins.has(importedName)) {
            context.objectFactoryOrigins.set(
              localName,
              context.objectFactoryOrigins.get(importedName) as "i18next" | "vue"
            );
          }
          if (context.functionFactoryOrigins.has(importedName)) {
            context.functionFactoryOrigins.set(
              localName,
              context.functionFactoryOrigins.get(importedName) as ExtractedMessageOrigin
            );
          }
        }
      }
    },
    VariableDeclarator(path: NodePath<t.VariableDeclarator>) {
      if (!path.node.init) return;
      const init = unwrapAwait(path.node.init);
      if (!t.isCallExpression(init)) return;

      const calleeName = getCalleeName(init.callee);
      if (!calleeName) return;

      if (context.functionFactoryOrigins.has(calleeName)) {
        const origin = context.functionFactoryOrigins.get(calleeName) as ExtractedMessageOrigin;
        addFunctionAliasFromPattern(path.node.id, context, origin);
      }

      if (context.objectFactoryOrigins.has(calleeName)) {
        const origin = context.objectFactoryOrigins.get(calleeName) as "i18next" | "vue";
        addObjectAliasesFromPattern(path.node.id, context, origin);
      }
    }
  });
}

function addFunctionAliasFromPattern(
  pattern: t.LVal | t.VoidPattern,
  context: ExtractionContext,
  origin: ExtractedMessageOrigin
): void {
  if (t.isVoidPattern(pattern)) {
    return;
  }
  if (t.isIdentifier(pattern)) {
    context.functionNames.add(pattern.name);
    if (origin === "i18next") {
      context.i18next.functions.add(pattern.name);
    }
    return;
  }
  if (t.isObjectPattern(pattern)) {
    for (const prop of pattern.properties) {
      if (!t.isObjectProperty(prop)) continue;
      const keyName = extractPropertyKey(prop.key);
      if (keyName !== "t") continue;
      const localName = extractObjectPropertyLocalName(prop.value);
      if (!localName) continue;
      context.functionNames.add(localName);
      if (origin === "i18next") {
        context.i18next.functions.add(localName);
      }
    }
  }
  if (t.isArrayPattern(pattern)) {
    const first = pattern.elements[0];
    if (!first) return;
    if (t.isIdentifier(first)) {
      context.functionNames.add(first.name);
      if (origin === "i18next") {
        context.i18next.functions.add(first.name);
      }
    } else if (t.isAssignmentPattern(first) && t.isIdentifier(first.left)) {
      context.functionNames.add(first.left.name);
      if (origin === "i18next") {
        context.i18next.functions.add(first.left.name);
      }
    }
  }
}

function addObjectAliasesFromPattern(
  pattern: t.LVal | t.VoidPattern,
  context: ExtractionContext,
  origin: "i18next" | "vue"
): void {
  if (t.isVoidPattern(pattern)) {
    return;
  }
  if (t.isIdentifier(pattern)) {
    if (origin === "i18next") {
      context.i18next.objects.add(pattern.name);
    }
    if (origin === "vue") {
      context.vueI18n.objects.add(pattern.name);
    }
    return;
  }
  if (t.isArrayPattern(pattern)) {
    const first = pattern.elements[0];
    if (!first) return;
    if (t.isIdentifier(first)) {
      context.functionNames.add(first.name);
      if (origin === "i18next") {
        context.i18next.functions.add(first.name);
      }
      if (origin === "vue") {
        context.vueI18n.functions.add(first.name);
      }
    } else if (t.isAssignmentPattern(first) && t.isIdentifier(first.left)) {
      context.functionNames.add(first.left.name);
      if (origin === "i18next") {
        context.i18next.functions.add(first.left.name);
      }
      if (origin === "vue") {
        context.vueI18n.functions.add(first.left.name);
      }
    }
    return;
  }
  if (!t.isObjectPattern(pattern)) return;

  for (const prop of pattern.properties) {
    if (!t.isObjectProperty(prop)) continue;
    const keyName = extractPropertyKey(prop.key);
    if (!keyName) continue;
    const localName = extractObjectPropertyLocalName(prop.value);
    if (!localName) continue;

    if (keyName === "t") {
      context.functionNames.add(localName);
      if (origin === "i18next") {
        context.i18next.functions.add(localName);
      }
      if (origin === "vue") {
        context.vueI18n.functions.add(localName);
      }
    }

    if (origin === "i18next" && keyName === "i18n") {
      context.i18next.objects.add(localName);
    }
  }
}

function extractMessagesFromAst(
  ast: t.File,
  context: ExtractionContext
): ExtractedMessage[] {
  const extracted: ExtractedMessage[] = [];

  const functionNames = context.functionNames;
  const taggedNames = context.taggedNames;
  const reactIntl = context.reactIntl;
  const i18next = context.i18next;
  const vueI18n = context.vueI18n;

  traverse(ast, {
    CallExpression(path: NodePath<t.CallExpression>) {
      const callee = path.node.callee;

      if (
        reactIntl.defineMessages &&
        isIdentifierNamed(callee, "defineMessages", reactIntl.defineMessagesAliases)
      ) {
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

      if (reactIntl.formatMessage && isFormatMessageCallee(callee, reactIntl.formatMessageAliases)) {
        const arg = path.node.arguments[0];
        if (t.isObjectExpression(arg)) {
          const message = extractMessageDescriptor(arg, "formatMessage");
          if (message) {
            extracted.push(message);
          }
        }
        return;
      }

      const factoryOrigin = getFactoryOriginFromCallee(callee, context.functionFactoryOrigins);
      if (factoryOrigin) {
        const key = extractLiteral(path.node.arguments[0]);
        if (key) {
          extracted.push({ key, source: key, origin: factoryOrigin });
        }
        return;
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
        const key = extractLiteral(path.node.arguments[0]);
        const source = key && vueI18n.keyAsDefault ? key : null;
        if (key && source) {
          extracted.push({ key, source, origin: "vueI18n" });
        }
        return;
      }

      if (vueI18n.enabled && t.isIdentifier(callee) && vueI18n.functions.has(callee.name)) {
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
      let tagName: string | null = null;

      if (t.isIdentifier(tag)) {
        tagName = tag.name;
      } else if (t.isMemberExpression(tag)) {
        tagName = getMemberPropertyName(tag.property);
        if (
          tagName &&
          !isMemberFunctionCallee(
            tag,
            new Set([tagName]),
            new Set(),
            context.objectFactoryOrigins
          )
        ) {
          tagName = null;
        }
      }

      if (!tagName) return;
      if (!taggedNames.has(tagName) && !functionNames.has(tagName)) {
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

      if (
        reactIntl.formattedMessage &&
        (name === "FormattedMessage" ||
          (name !== null && reactIntl.formattedMessageAliases.has(name)))
      ) {
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

      if (
        i18next.enabled &&
        i18next.transComponent &&
        (name === "Trans" || (name !== null && i18next.transAliases.has(name)))
      ) {
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

function extractMessagesFromExpression(
  expression: string,
  context: ExtractionContext
): ExtractedMessage[] {
  const wrapped = `(${expression})`;
  const ast = parseSource(wrapped);
  if (!ast) return [];
  return extractMessagesFromAst(ast, context);
}

function parseSource(source: string): t.File | null {
  if (!source.trim()) return null;
  try {
    return parse(source, {
      sourceType: "unambiguous",
      plugins: PARSER_PLUGINS
    });
  } catch {
    return null;
  }
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

function isIdentifierNamed(
  node: t.Expression | t.Super | t.V8IntrinsicIdentifier,
  name: string,
  aliases?: Set<string>
): boolean {
  return (t.isIdentifier(node) && node.name === name) ||
    (aliases ? t.isIdentifier(node) && aliases.has(node.name) : false);
}

function isFormatMessageCallee(
  callee: t.Expression | t.Super | t.V8IntrinsicIdentifier,
  aliases: Set<string>
): boolean {
  if (t.isIdentifier(callee)) {
    return callee.name === "formatMessage" || aliases.has(callee.name);
  }
  if (t.isMemberExpression(callee) && t.isIdentifier(callee.property)) {
    return callee.property.name === "formatMessage" || aliases.has(callee.property.name);
  }
  return false;
}

function isI18nextCallee(
  callee: t.Expression | t.Super | t.V8IntrinsicIdentifier,
  functions: Set<string>,
  memberFunctions: Set<string>,
  objects: Set<string>,
  objectFactoryOrigins: Map<string, "i18next" | "vue">
): boolean {
  if (t.isIdentifier(callee) && functions.has(callee.name)) {
    return true;
  }
  return isMemberFunctionCallee(callee, memberFunctions, objects, objectFactoryOrigins, "i18next");
}

function isMemberFunctionCallee(
  callee: t.Expression | t.Super | t.V8IntrinsicIdentifier,
  memberFunctions: Set<string>,
  objects: Set<string>,
  objectFactoryOrigins: Map<string, "i18next" | "vue">,
  origin?: "i18next" | "vue"
): boolean {
  if (!t.isMemberExpression(callee)) {
    return false;
  }
  const propertyName = getMemberPropertyName(callee.property);
  if (!propertyName || !memberFunctions.has(propertyName)) {
    return false;
  }
  if (objects.size === 0) {
    return true;
  }
  const root = getMemberRootName(callee.object);
  if (root && objects.has(root)) {
    return true;
  }

  if (t.isCallExpression(callee.object)) {
    const calleeName = getCalleeName(callee.object.callee);
    if (!calleeName) return false;
    const mappedOrigin = objectFactoryOrigins.get(calleeName);
    if (!mappedOrigin) return false;
    if (origin && mappedOrigin !== origin) return false;
    return true;
  }

  return false;
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

function getCalleeName(
  callee: t.Expression | t.Super | t.V8IntrinsicIdentifier
): string | null {
  if (t.isIdentifier(callee)) {
    return callee.name;
  }
  if (t.isMemberExpression(callee) && t.isIdentifier(callee.property)) {
    return callee.property.name;
  }
  return null;
}

function getFactoryOriginFromCallee(
  callee: t.Expression | t.Super | t.V8IntrinsicIdentifier,
  factoryOrigins: Map<string, ExtractedMessageOrigin>
): ExtractedMessageOrigin | null {
  if (!t.isCallExpression(callee)) return null;
  const name = getCalleeName(callee.callee);
  if (!name) return null;
  return factoryOrigins.get(name) ?? null;
}

function extractJsxName(
  name: t.JSXIdentifier | t.JSXMemberExpression | t.JSXNamespacedName
): string | null {
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

function extractObjectPropertyLocalName(value: t.ObjectProperty["value"]): string | null {
  if (t.isIdentifier(value)) {
    return value.name;
  }
  if (t.isAssignmentPattern(value) && t.isIdentifier(value.left)) {
    return value.left.name;
  }
  return null;
}

function unwrapAwait(node: t.Expression): t.Expression {
  if (t.isAwaitExpression(node)) {
    return node.argument as t.Expression;
  }
  return node;
}

function getImportSpecifierName(node: t.ImportSpecifier["imported"]): string | null {
  if (t.isIdentifier(node)) {
    return node.name;
  }
  if (t.isStringLiteral(node)) {
    return node.value;
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

function extractVueTemplateContent(content: string): string {
  const blocks = Array.from(
    content.matchAll(/<template\b[^>]*>([\s\S]*?)<\/template>/gi)
  );
  if (blocks.length === 0) return "";
  return blocks.map((match) => match[1]).join("\n");
}

function extractVueTemplateExpressions(template: string): string[] {
  const expressions: string[] = [];
  if (!template.trim()) return expressions;

  const moustacheRegex = /\{\{([\s\S]*?)\}\}/g;
  let match: RegExpExecArray | null;
  while ((match = moustacheRegex.exec(template))) {
    const expr = match[1]?.trim();
    if (expr) expressions.push(expr);
  }

  const attrRegex = /(?:^|\s)(?:v-[\w:-]+|[:@][\w:-]+)\s*=\s*("([\s\S]*?)"|'([\s\S]*?)')/g;
  while ((match = attrRegex.exec(template))) {
    const expr = (match[2] ?? match[3] ?? "").trim();
    if (expr) expressions.push(expr);
  }

  return expressions;
}

function extractMessagesFromVueI18nBlocks(
  content: string,
  config: NormalizedConfig
): ExtractedMessage[] {
  const extracted: ExtractedMessage[] = [];
  const blocks = Array.from(
    content.matchAll(/<i18n\b[^>]*>([\s\S]*?)<\/i18n>/gi)
  );
  if (blocks.length === 0) return extracted;

  for (const match of blocks) {
    const raw = match[1]?.trim();
    if (!raw) continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }

    if (!parsed || typeof parsed !== "object") continue;

    const locales = new Set(config.locales);
    const parsedObj = parsed as Record<string, unknown>;
    const hasLocaleKeys = Object.keys(parsedObj).some((key) => locales.has(key));

    let messages: Record<string, unknown> | null = null;
    if (hasLocaleKeys) {
      const localeKey =
        (config.defaultLocale in parsedObj && typeof parsedObj[config.defaultLocale] === "object")
          ? config.defaultLocale
          : Object.keys(parsedObj).find((key) => locales.has(key));
      if (localeKey && parsedObj[localeKey] && typeof parsedObj[localeKey] === "object") {
        messages = parsedObj[localeKey] as Record<string, unknown>;
      }
    } else {
      messages = parsedObj as Record<string, unknown>;
    }

    if (!messages) continue;

    const flattened = flattenMessages(messages);
    for (const [key, value] of flattened) {
      extracted.push({ key, source: value, origin: "vueI18n" });
    }
  }

  return extracted;
}

function flattenMessages(
  obj: Record<string, unknown>,
  prefix = ""
): Array<[string, string]> {
  const entries: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      entries.push([fullKey, value]);
      continue;
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      entries.push(...flattenMessages(value as Record<string, unknown>, fullKey));
    }
  }
  return entries;
}

function extractSvelteScriptBlocks(content: string): string[] {
  const blocks = Array.from(
    content.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)
  );
  return blocks.map((match) => match[1]);
}

function stripSvelteScriptBlocks(content: string): string {
  return content.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
}

function extractAstroFrontmatter(content: string): { frontmatter: string; template: string } {
  const match = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/);
  if (!match) {
    return { frontmatter: "", template: content };
  }
  const frontmatter = match[1] ?? "";
  const template = content.slice(match[0].length);
  return { frontmatter, template };
}

function extractBraceExpressions(content: string): string[] {
  const expressions: string[] = [];
  let depth = 0;
  let start = -1;
  let quote: "'" | '"' | "`" | null = null;
  let escaped = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === "'" || char === '"' || char === "`") {
      quote = char;
      continue;
    }

    if (char === "{") {
      if (depth === 0) {
        start = i + 1;
      }
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        expressions.push(content.slice(start, i).trim());
        start = -1;
      }
    }
  }

  return expressions;
}

function normalizeTemplateExpression(expression: string): string {
  const trimmed = expression.trim();
  if (!trimmed) return "";

  const directiveMatch = trimmed.match(/^([@#:][\w-]+)\s+([\s\S]*)$/);
  if (directiveMatch) {
    return directiveMatch[2].trim();
  }

  return trimmed;
}
