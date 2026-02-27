/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // ← OBLIGATORIO PARA CPANEL

  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },

  turbopack: {},

  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || []
      config.externals.push({
        serialport: 'commonjs serialport',
        '@serialport/bindings-cpp': 'commonjs @serialport/bindings-cpp',
        escpos: 'commonjs escpos',
      })
    }
    return config
  },

  serverExternalPackages: [
    'serialport',
    'escpos',
    '@serialport/bindings-cpp',
  ],
}

export default nextConfig
