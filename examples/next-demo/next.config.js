const { InterceptorWebpackPlugin } = require("@wrkspace-co/interceptor/webpack");

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
