/**
 * EJEMPLO DE INTEGRACIÓN DEL HISTORIAL DETALLADO DE ARQUEOS
 * 
 * Este archivo muestra cómo integrar el componente ArqueoHistoryDialog
 * en la página de lista de arqueos.
 */

"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArqueoHistoryDialog } from '@/components/caja/arqueo-history-dialog'
import { FileText, Eye, Calendar, DollarSign } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { formatearMoneda } from '@/lib/utils'

// Tipo de ejemplo para un arqueo
interface Arqueo {
  id: number
  tipo_arqueo: string
  fecha_arqueo: Date
  total_contado: number
  total_esperado: number
  diferencia: number
  realizador: {
    nombre: string
  }
  sesion_caja: {
    id: number
    fecha_apertura: Date
    usuario: {
      nombre: string
    }
  }
}

export function ArqueosPageExample() {
  // Estado para el dialog de historial
  const [selectedArqueoId, setSelectedArqueoId] = useState<number | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)

  // Datos de ejemplo (en producción vendrían de una API)
  const arqueos: Arqueo[] = [
    {
      id: 1,
      tipo_arqueo: 'final',
      fecha_arqueo: new Date(),
      total_contado: 1500000,
      total_esperado: 1500000,
      diferencia: 0,
      realizador: { nombre: 'Juan Pérez' },
      sesion_caja: {
        id: 10,
        fecha_apertura: new Date(Date.now() - 8 * 60 * 60 * 1000),
        usuario: { nombre: 'María García' }
      }
    },
    // Más arqueos...
  ]

  // Función para abrir el historial detallado
  const handleVerHistorial = (arqueoId: number) => {
    setSelectedArqueoId(arqueoId)
    setHistoryOpen(true)
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Arqueos de Caja</h1>
          <p className="text-muted-foreground">
            Gestión y seguimiento de arqueos realizados
          </p>
        </div>
      </div>

      {/* Lista de arqueos */}
      <div className="grid gap-4">
        {arqueos.map((arqueo) => (
          <Card key={arqueo.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-lg">
                      Arqueo #{arqueo.id}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Sesión #{arqueo.sesion_caja.id} - {arqueo.sesion_caja.usuario.nombre}
                    </p>
                  </div>
                </div>
                <Badge variant={arqueo.diferencia === 0 ? 'default' : 'destructive'}>
                  {arqueo.tipo_arqueo}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Fecha
                  </p>
                  <p className="font-medium">
                    {format(arqueo.fecha_arqueo, "dd/MM/yyyy HH:mm", { locale: es })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Realizado por</p>
                  <p className="font-medium">{arqueo.realizador.nombre}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Total Contado
                  </p>
                  <p className="font-semibold">{formatearMoneda(arqueo.total_contado)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Total Esperado
                  </p>
                  <p className="font-semibold">{formatearMoneda(arqueo.total_esperado)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Diferencia</p>
                  <p className={`font-bold ${
                    arqueo.diferencia === 0 
                      ? 'text-green-600' 
                      : arqueo.diferencia > 0 
                      ? 'text-blue-600' 
                      : 'text-red-600'
                  }`}>
                    {formatearMoneda(arqueo.diferencia)}
                  </p>
                </div>
              </div>

              {/* Botón para ver historial detallado */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleVerHistorial(arqueo.id)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Historial Detallado
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog de historial detallado */}
      <ArqueoHistoryDialog
        arqueoId={selectedArqueoId}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />
    </div>
  )
}

/**
 * NOTAS DE IMPLEMENTACIÓN:
 * 
 * 1. Estado necesario:
 *    - selectedArqueoId: ID del arqueo seleccionado
 *    - historyOpen: Controla si el dialog está abierto
 * 
 * 2. El componente ArqueoHistoryDialog se encarga de:
 *    - Cargar los datos cuando se abre
 *    - Mostrar loading states
 *    - Manejar errores
 *    - Limpiar estado al cerrar
 * 
 * 3. No necesitas precargar datos:
 *    - El dialog carga los datos automáticamente cuando arqueoId cambia
 *    - Solo necesitas pasarle el ID y controlar open/onOpenChange
 * 
 * 4. Responsive:
 *    - El dialog ocupa 90vh en pantallas grandes
 *    - Se adapta automáticamente a móviles
 *    - Scroll interno para grandes cantidades de datos
 */
