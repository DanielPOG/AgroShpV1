/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Configuración para Turbopack (Next.js 16+)
  turbopack: {
    // Turbopack está habilitado por defecto
    // Los módulos nativos se manejan automáticamente
  },
  // Configuración de webpack para cuando se use explícitamente
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || []
      config.externals.push({
        'serialport': 'commonjs serialport',
        '@serialport/bindings-cpp': 'commonjs @serialport/bindings-cpp',
        'escpos': 'commonjs escpos',
      })
    }
    return config
  },
  // Marcar paquetes nativos como externos en el servidor
  serverExternalPackages: ['serialport', 'escpos', '@serialport/bindings-cpp'],
}

export default nextConfig
