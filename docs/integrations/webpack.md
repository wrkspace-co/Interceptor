# Webpack

Use the Webpack plugin to run Interceptor before builds and on watch.

## Install
```bash
pnpm add -D @wrkspace-co/interceptor
```

## Configure
```js
const { InterceptorWebpackPlugin } = require("@wrkspace-co/interceptor/webpack");

module.exports = {
  plugins: [new InterceptorWebpackPlugin({ configPath: "interceptor.config.ts" })]
};
```

## Notes
- When Webpack runs in watch mode, Interceptor runs in watch mode too.
- The plugin loads `.env` from your project root.
