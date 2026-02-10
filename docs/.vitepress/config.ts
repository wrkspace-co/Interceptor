import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Interceptor",
  description: "On-demand translation compiler for i18n message files",
  base: "/Interceptor/",
  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide/overview" },
      { text: "Integrations", link: "/integrations/vite" }
    ],
    sidebar: {
      "/guide/": [
        { text: "Overview", link: "/guide/overview" },
        { text: "How It Works", link: "/guide/how-it-works" },
        { text: "Configuration", link: "/guide/configuration" },
        { text: "LLM Providers", link: "/guide/llm-providers" },
        { text: "Changelog", link: "/guide/changelog" },
        { text: "CLI", link: "/guide/cli" }
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
