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

describe("i18next extraction", () => {
  it("extracts default values from i18next calls", async () => {
    const code = `
      import i18n from "i18next";
      t("app.title", "App Title");
      i18n.t("app.subtitle", { defaultValue: "Subtitle" });
    `;

    const filePath = await createTempFile("App.tsx", code);
    const normalized = normalizeConfig({
      locales: ["en"],
      llm: { model: "gpt-4o-mini" },
      rootDir: path.dirname(filePath)
    });

    const messages = await extractMessagesFromFile(filePath, normalized);
    const map = new Map(messages.map((msg) => [msg.key, msg.source]));

    expect(map.get("app.title")).toBe("App Title");
    expect(map.get("app.subtitle")).toBe("Subtitle");
  });

  it("extracts from <Trans> component", async () => {
    const code = `
      import { Trans } from "react-i18next";
      export const Demo = () => (
        <Trans i18nKey="home.title">Home Title</Trans>
      );
    `;

    const filePath = await createTempFile("Trans.tsx", code);
    const normalized = normalizeConfig({
      locales: ["en"],
      llm: { model: "gpt-4o-mini" },
      rootDir: path.dirname(filePath)
    });

    const messages = await extractMessagesFromFile(filePath, normalized);
    const map = new Map(messages.map((msg) => [msg.key, msg.source]));

    expect(map.get("home.title")).toBe("Home Title");
  });
});

describe("vue-i18n extraction", () => {
  it("extracts from <script setup> in .vue files", async () => {
    const code = `
      <template>
        <div>{{ $t('template.ignored') }}</div>
      </template>
      <script setup lang="ts">
      import { useI18n } from "vue-i18n";
      const { t } = useI18n();
      t("vue.welcome");
      </script>
      <script>
      export default {
        methods: {
          greet() {
            return this.$t("vue.greeting");
          }
        }
      }
      </script>
    `;

    const filePath = await createTempFile("Component.vue", code);
    const normalized = normalizeConfig({
      locales: ["en"],
      llm: { model: "gpt-4o-mini" },
      rootDir: path.dirname(filePath)
    });

    const messages = await extractMessagesFromFile(filePath, normalized);
    const keys = new Set(messages.map((msg) => msg.key));

    expect(keys.has("vue.welcome")).toBe(true);
    expect(keys.has("vue.greeting")).toBe(true);
  });
});
