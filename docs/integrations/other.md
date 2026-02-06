# Other Frameworks

Interceptor works with most modern stacks because it integrates at the build tool level.

## Vite-based frameworks
Use the Vite plugin:
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
Use the Webpack plugin:
- Create React App
- Gatsby
- Older Next.js setups

Example:
```js
const { InterceptorWebpackPlugin } = require("@wrkspace-co/interceptor/webpack");

module.exports = {
  plugins: [new InterceptorWebpackPlugin({ configPath: "interceptor.config.ts" })]
};
```
