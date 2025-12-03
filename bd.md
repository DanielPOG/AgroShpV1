# 1. Cambiar DATABASE_URL en .env
# 2. Ejecutar uno de estos:

# Opción A (desarrollo - más seguro):
npx prisma migrate dev      # Aplica migraciones + genera cliente
npm run db:seed             # Inserta datos

# Opción B (producción):
npx prisma migrate deploy   # Solo aplica migraciones
npx prisma generate         # Genera cliente
npm run db:seed             # Inserta datos

# Opción C (reseteo total):
npm run db:reset            # Hace todo automáticamente