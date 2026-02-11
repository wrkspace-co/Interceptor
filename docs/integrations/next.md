# Next.js

Interceptor works with both the Pages Router and App Router. Use the Webpack plugin in `next.config.js`.

## Install
```bash
pnpm add -D @wrkspace-co/interceptor
```

## Configure
```js
const { InterceptorWebpackPlugin } = require("@wrkspace-co/interceptor/webpack");

module.exports = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.plugins.push(
        new InterceptorWebpackPlugin({ configPath: "interceptor.config.ts" })
      );
    }
    return config;
  }
};
```

## App Router and RSC
- `getTranslations` and `useTranslations` calls are extracted.
- Server components are supported as long as keys are string literals.
