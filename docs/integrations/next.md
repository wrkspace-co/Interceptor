# Next.js

Next.js uses Webpack under the hood, so you can integrate Interceptor with the Webpack plugin in `next.config.js`.

## Install
```bash
pnpm add -D interceptor
```

## Configure
```js
const { InterceptorWebpackPlugin } = require("interceptor/webpack");

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config, { dev }) {
    config.plugins.push(
      new InterceptorWebpackPlugin({
        configPath: "interceptor.config.ts",
        watch: dev
      })
    );
    return config;
  }
};

module.exports = nextConfig;
```

## Notes
- The plugin loads `.env` from your project root.
- `watch: dev` keeps translations up to date during local development.
