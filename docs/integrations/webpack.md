# Webpack

Interceptor integrates with Webpack via a plugin that runs the compiler before a build and in watch mode when Webpack watches.

## Install
```bash
pnpm add -D @wrkspace-co/interceptor
```

## Configure
```js
const { InterceptorWebpackPlugin } = require("@wrkspace-co/interceptor/webpack");

module.exports = {
  plugins: [
    new InterceptorWebpackPlugin({
      configPath: "interceptor.config.ts"
    })
  ]
};
```

## Notes
- The plugin will load `.env` from your project root.
- Set `watch: false` if you want to disable watch mode with Webpack watch.
