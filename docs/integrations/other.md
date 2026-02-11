# Other Frameworks

Interceptor integrates at the build tool level, so most modern stacks are supported.

## Vite-based frameworks
Use the Vite plugin for:
- Nuxt 3
- SvelteKit
- SolidStart
- Astro

Example:
```ts
import { defineConfig } from "vite";
import { interceptorVitePlugin } from "@wrkspace-co/interceptor/vite";

export default defineConfig({
  plugins: [interceptorVitePlugin({ configPath: "interceptor.config.ts" })]
});
```

## Webpack-based frameworks
Use the Webpack plugin for:
- Create React App
- Gatsby
- Next.js (Pages + App Router)
- React Server Components

Example:
```js
const { InterceptorWebpackPlugin } = require("@wrkspace-co/interceptor/webpack");

module.exports = {
  plugins: [new InterceptorWebpackPlugin({ configPath: "interceptor.config.ts" })]
};
```
