// Forzar runtime de Node.js para soportar serialport
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth.server'
import { getPrinter } from '@/lib/printer/escpos-printer'

/**
 * POST /api/caja/abrir-cajon
 * Abre el cajón de dinero sin imprimir ticket
 * 
 * Roles permitidos: Admin, Cajero
 * Uso: Presionar F4 o botón manual en el POS
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await auth()
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'No autorizado. Debe iniciar sesión.' },
        { status: 401 }
      )
    }

    // Verificar rol
    const userRole = session.user.role
    if (userRole !== 'Admin' && userRole !== 'Administrador' && userRole !== 'Cajero') {
      return NextResponse.json(
        {
          error: 'Acceso denegado. Solo Admin y Cajero pueden abrir el cajón.',
        },
        { status: 403 }
      )
    }

    console.log(`🔓 Usuario ${session.user.name} abriendo cajón manualmente`)

    // Abrir cajón
    try {
      const printer = getPrinter()
      await printer.openDrawerOnly()
      
      console.log(`✅ Cajón abierto exitosamente`)
      
      return NextResponse.json(
        { 
          success: true, 
          message: 'Cajón abierto exitosamente' 
        },
        { status: 200 }
      )
    } catch (printerError) {
      console.error('⚠️ Error al abrir cajón:', printerError)
      
      return NextResponse.json(
        { 
          error: 'No se pudo abrir el cajón',
          details: printerError instanceof Error ? printerError.message : 'Error desconocido'
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error en POST /api/caja/abrir-cajon:', error)

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
