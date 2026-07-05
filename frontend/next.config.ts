import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    // Habilitar WebAssembly para tiny-secp256k1 (requerido por bitcoinjs-lib)
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    config.module.rules.push({
      test: /\.wasm$/,
      type: "webassembly/async",
    });
    return config;
  },
};

export default nextConfig;
