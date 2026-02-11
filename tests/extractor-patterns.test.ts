import { describe, it, expect } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { normalizeConfig } from "../src/config";
import { extractMessagesFromFile } from "../src/extractor";

async function createTempFile(filename: string, content: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "interceptor-extract-"));
  const filePath = path.join(dir, filename);
  await fs.writeFile(filePath, content, "utf8");
  return filePath;
}

function createConfig(rootDir: string) {
  return normalizeConfig({
    locales: ["en"],
    llm: { model: "gpt-4o-mini" },
    rootDir
  });
}

describe("extraction patterns", () => {
  it("handles alias imports, destructured t, nested calls, and tagged templates", async () => {
    const code = `
      import { t as translate } from "i18next";
      import { useTranslation } from "react-i18next";
      translate("alias.key");
      const { t: hookT, i18n: client } = useTranslation();
      hookT("hook.key");
      client.t("hook.member");
      useTranslation().t("hook.nested");
      const [tupleT] = useTranslation();
      tupleT("hook.array");
      t\`tag.key\`;
    `;

    const filePath = await createTempFile("patterns.tsx", code);
    const messages = await extractMessagesFromFile(filePath, createConfig(path.dirname(filePath)));
    const keys = new Set(messages.map((msg) => msg.key));

    expect(keys.has("alias.key")).toBe(true);
    expect(keys.has("hook.key")).toBe(true);
    expect(keys.has("hook.member")).toBe(true);
    expect(keys.has("hook.nested")).toBe(true);
    expect(keys.has("hook.array")).toBe(true);
    expect(keys.has("tag.key")).toBe(true);
  });

  it("extracts from Svelte and Astro templates", async () => {
    const svelteCode = `
      <script>
        import { t as translate } from "i18next";
      </script>
      <h1>{translate("svelte.title")}</h1>
      <p>{$t("svelte.store")}</p>
    `;

    const astroCode = `
      ---
      import { useTranslations } from "next-intl";
      const t = useTranslations("Home");
      ---
      <h1>{t("astro.title")}</h1>
    `;

    const svelteFile = await createTempFile("Component.svelte", svelteCode);
    const astroFile = await createTempFile("Page.astro", astroCode);

    const svelteMessages = await extractMessagesFromFile(
      svelteFile,
      createConfig(path.dirname(svelteFile))
    );
    const astroMessages = await extractMessagesFromFile(
      astroFile,
      createConfig(path.dirname(astroFile))
    );

    const svelteKeys = new Set(svelteMessages.map((msg) => msg.key));
    const astroKeys = new Set(astroMessages.map((msg) => msg.key));

    expect(svelteKeys.has("svelte.title")).toBe(true);
    expect(svelteKeys.has("svelte.store")).toBe(true);
    expect(astroKeys.has("astro.title")).toBe(true);
  });

  it("supports Next.js app router server translation helpers", async () => {
    const code = `
      import { getTranslations } from "next-intl/server";
      export default async function Page() {
        const t = await getTranslations("Home");
        return <h1>{t("next.title")}</h1>;
      }
    `;

    const filePath = await createTempFile("page.tsx", code);
    const messages = await extractMessagesFromFile(filePath, createConfig(path.dirname(filePath)));
    const keys = new Set(messages.map((msg) => msg.key));

    expect(keys.has("next.title")).toBe(true);
  });
});
