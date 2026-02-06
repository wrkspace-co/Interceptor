import { describe, it, expect } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { normalizeConfig } from "../src/config";
import { extractMessagesFromFile } from "../src/extractor";

async function createTempFile(content: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "interceptor-extract-"));
  const filePath = path.join(dir, "App.tsx");
  await fs.writeFile(filePath, content, "utf8");
  return filePath;
}

describe("extractMessagesFromFile", () => {
  it("extracts t(), formatMessage, FormattedMessage, and defineMessages", async () => {
    const code = `
      import React from "react";
      import { FormattedMessage, defineMessages } from "react-intl";

      const messages = defineMessages({
        greeting: { id: "greeting", defaultMessage: "Hello" },
        fallback: { defaultMessage: "Hi" }
      });

      const App = () => (
        <div>
          <FormattedMessage id="home.title" defaultMessage="Home Title" />
          <FormattedMessage defaultMessage="Inline" />
        </div>
      );

      function demo(intl) {
        t('Hello');
        t("Template");
        intl.formatMessage({ id: "app.title", defaultMessage: "App Title" });
        formatMessage({ defaultMessage: "Just text" });
      }
    `;

    const filePath = await createTempFile(code);
    const normalized = normalizeConfig({
      locales: ["en"],
      llm: { model: "gpt-4o-mini" },
      rootDir: path.dirname(filePath)
    });

    const messages = await extractMessagesFromFile(filePath, normalized);
    const map = new Map(messages.map((msg) => [msg.key, msg.source]));

    expect(map.get("Hello")).toBe("Hello");
    expect(map.get("Template")).toBe("Template");
    expect(map.get("app.title")).toBe("App Title");
    expect(map.get("Just text")).toBe("Just text");
    expect(map.get("home.title")).toBe("Home Title");
    expect(map.get("Inline")).toBe("Inline");
    expect(map.get("greeting")).toBe("Hello");
    expect(map.get("fallback")).toBe("Hi");
  });
});
