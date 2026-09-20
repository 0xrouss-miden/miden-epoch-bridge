import type { NextConfig } from "next";
import path from "node:path";
const config: NextConfig = {
  webpack(config, { isServer }) {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      topLevelAwait: true,
    };
    // Next also analyzes client-only chunks with Node export conditions. The
    // native SDK entry omits browser-only classes used by the wallet adapter.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@miden-sdk/miden-sdk$": path.resolve(
        process.cwd(),
        `node_modules/@miden-sdk/miden-sdk/dist/st/${isServer ? "index" : "eager"}.js`,
      ),
      // MetaMask's universal bundle references mobile-only storage. This web
      // app never executes its React Native branch.
      "@react-native-async-storage/async-storage": false,
    };
    config.output.environment = {
      ...config.output.environment,
      asyncFunction: true,
    };
    if (isServer) config.externals.push("pino-pretty");
    if (!isServer)
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    return config;
  },
};
export default config;
