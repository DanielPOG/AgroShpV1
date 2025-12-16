import { useState } from 'react'

export interface ArqueoHistoryDetail {
  arqueo: {
    id: number
    tipo_arqueo: string
    fecha_arqueo: Date
    total_contado: number
    total_esperado: number
    diferencia: number
    observaciones: string | null
    realizador: {
      nombre: string
      apellido: string
      email: string
    }
  }
  sesion: {
    id: number
    fecha_apertura: Date
    fecha_cierre: Date | null
    fondo_inicial: number
    responsable: {
      nombre: string
      apellido: string
      email: string
    }
    tienda: {
      id: number
      nombre: string
    }
  }
  turnos: Array<{
    turno: {
      id: number
      fecha_inicio: Date
      fecha_fin: Date | null
      tipo_relevo: string
      efectivo_inicial: number
      efectivo_final: number | null
      cajero: {
        nombre: string
        apellido: string
        email: string
      }
      observaciones: string | null
    }
    operaciones: {
      ventas: Array<{
        id: number
        fecha_venta: Date
        subtotal: number
        descuento: number
        total: number
        metodo_pago: string
        estado_venta: string
      }>
      retiros: Array<{
        id: number
        fecha_retiro: Date
        monto: number
        motivo: string
        autorizado_por_nombre: string
      }>
      gastos: Array<{
        id: number
        fecha_gasto: Date
        monto: number
        metodo_pago: string
        categoria: string
        descripcion: string
      }>
      movimientos: Array<{
        id: number
        fecha_movimiento: Date
        tipo_movimiento: string
        metodo_pago: string
        monto: number
        motivo: string
        descripcion: string | null
      }>
    }
    totales: {
      porMetodo: Record<string, {
        ventas: number
        retiros?: number
        gastos: number
        ingresos: number
        egresos: number
      }>
      saldos: Record<string, number>
      cantidades: {
        ventas: number
        retiros: number
        gastos: number
        movimientos: number
      }
    }
  }>
  totalesGenerales: {
    porMetodo: Record<string, {
      ventas: number
      retiros?: number
      gastos: number
      ingresos: number
      egresos: number
    }>
    cantidades: {
      turnos: number
      ventas: number
      retiros: number
      gastos: number
      movimientos: number
    }
  }
}

export function useArqueoHistory() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ArqueoHistoryDetail | null>(null)

  const fetchHistory = async (arqueoId: number) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/arqueos/${arqueoId}/history`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al obtener historial')
      }

      const historial = await response.json()
      setData(historial)
      
      return historial
    } catch (err: any) {
      const errorMessage = err.message || 'Error al cargar el historial'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setData(null)
    setError(null)
    setLoading(false)
  }

  return {
    data,
    loading,
    error,
    fetchHistory,
    reset,
  }
}
