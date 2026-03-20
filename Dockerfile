# =====================================================
# AGROSHOP - DOCKERFILE
# Multi-stage build para Next.js con Prisma (pnpm)
# =====================================================

# Stage 1: Dependencias
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Copiar archivos de dependencias
COPY package.json pnpm-lock.yaml* ./
COPY prisma ./prisma/

# Instalar pnpm e instalar dependencias
RUN corepack enable pnpm
RUN pnpm install --frozen-lockfile

# Generar cliente Prisma
RUN npx prisma generate

# Stage 2: Build
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Copiar dependencias del stage anterior (incluyendo Prisma generado)
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variables de entorno para build (no sensibles)
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Habilitar pnpm
RUN corepack enable pnpm

# Build de la aplicación
RUN pnpm build

# Stage 3: Runner (producción)
FROM node:20-alpine AS runner
WORKDIR /app

# Instalar OpenSSL para Prisma
RUN apk add --no-cache openssl

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Crear usuario no-root para seguridad
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar archivos públicos
COPY --from=builder /app/public ./public

# Copiar archivos de standalone build (incluye node_modules necesarios)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/node_modules ./node_modules
# Copiar Prisma schema
COPY --from=builder /app/prisma ./prisma

# Copiar scripts de seed y constraints SQL
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/database ./database

# Crear directorio para uploads de productos y asignar permisos
RUN mkdir -p /app/public/productos && chown -R nextjs:nodejs /app/public/productos

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Comando de inicio
CMD ["node", "server.js"]
