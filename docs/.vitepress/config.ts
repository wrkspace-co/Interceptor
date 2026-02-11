import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Interceptor",
  description: "On-demand translation compiler for i18n message files",
  base: "/Interceptor/",
  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide/overview" },
      { text: "Integrations", link: "/integrations/vite" },
      { text: "Reference", link: "/guide/configuration" },
      { text: "Changelog", link: "/guide/changelog" }
    ],
    sidebar: {
      "/guide/": [
        {
          text: "Introduction",
          items: [
            { text: "Overview", link: "/guide/overview" },
            { text: "How It Works", link: "/guide/how-it-works" }
          ]
        },
        {
          text: "Getting Started",
          items: [{ text: "Quick Start", link: "/guide/getting-started" }]
        },
        {
          text: "Core Concepts",
          items: [
            { text: "Extraction & Coverage", link: "/guide/extraction" },
            { text: "Configuration", link: "/guide/configuration" }
          ]
        },
        {
          text: "Reference",
          items: [
            { text: "CLI", link: "/guide/cli" },
            { text: "LLM Providers", link: "/guide/llm-providers" },
            { text: "Changelog", link: "/guide/changelog" }
          ]
        }
      ],
      "/integrations/": [
        { text: "Next.js", link: "/integrations/next" },
        { text: "Vite", link: "/integrations/vite" },
        { text: "Vue", link: "/integrations/vue" },
        { text: "Webpack", link: "/integrations/webpack" },
        { text: "Other Frameworks", link: "/integrations/other" }
      ]
    },
    socialLinks: [
      { icon: "github", link: "https://github.com/wrkspace-co/interceptor" }
    ]
  }
});
