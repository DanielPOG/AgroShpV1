import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

/**
 * GET /api/productos-img/[...path]
 * Sirve imágenes de productos dinámicamente
 * Esto es necesario porque en modo standalone, Next.js no sirve
 * archivos subidos después del build desde /public
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params
    const imagePath = path.join('/')
    
    // Validar que solo se acceda a archivos en la carpeta productos
    if (imagePath.includes('..') || imagePath.includes('//')) {
      return NextResponse.json({ error: 'Ruta no válida' }, { status: 400 })
    }

    // Construir ruta completa al archivo
    const filePath = join(process.cwd(), 'public', 'productos', imagePath)
    
    // Verificar que el archivo existe
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'Imagen no encontrada' }, { status: 404 })
    }

    // Leer el archivo
    const fileBuffer = await readFile(filePath)
    
    // Determinar el tipo MIME basado en la extensión
    const extension = imagePath.split('.').pop()?.toLowerCase()
    let contentType = 'application/octet-stream'
    
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        contentType = 'image/jpeg'
        break
      case 'png':
        contentType = 'image/png'
        break
      case 'webp':
        contentType = 'image/webp'
        break
      case 'gif':
        contentType = 'image/gif'
        break
      case 'svg':
        contentType = 'image/svg+xml'
        break
    }

    // Retornar la imagen con headers de cache
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Error al servir imagen:', error)
    return NextResponse.json({ error: 'Error al cargar imagen' }, { status: 500 })
  }
}
