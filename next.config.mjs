/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone", // ← OBLIGATORIO PARA CPANEL

  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },

  turbopack: {},

  // Rewrite para servir imágenes de productos dinámicamente
  // Necesario porque en modo standalone, Next.js no sirve
  // archivos subidos después del build desde /public
  async rewrites() {
    return [
      {
        source: "/productos/:path*",
        destination: "/api/productos-img/:path*",
      },
    ];
  },

  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        serialport: "commonjs serialport",
        "@serialport/bindings-cpp": "commonjs @serialport/bindings-cpp",
        escpos: "commonjs escpos",
      });
    }
    return config;
  },

  serverExternalPackages: ["serialport", "escpos", "@serialport/bindings-cpp"],
};

export default nextConfig;
