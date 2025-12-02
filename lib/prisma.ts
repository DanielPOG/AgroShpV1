import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// WORKAROUND: Turbopack en Next.js 16 no carga process.env correctamente
// Hardcodeamos temporalmente la URL de conexión
const DATABASE_URL = 'postgresql://postgres:root@localhost:5432/AgroShop'

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: DATABASE_URL,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
