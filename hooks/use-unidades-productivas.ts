import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from './use-toast'

export interface UnidadProductiva {
  id: number
  codigo: string
  nombre: string
  descripcion: string | null
  tipo: string | null
  ubicacion: string | null
  responsable_id: number | null
  activa: boolean
  created_at: Date
  updated_at: Date
  responsable?: {
    id: number
    nombre: string
    apellido: string
    email: string
  }
  _count?: {
    productos: number
    lotes_productos: number
  }
}

export interface CreateUnidadData {
  codigo: string
  nombre: string
  descripcion?: string
  tipo?: string
  ubicacion?: string
  responsable_id?: number
}

export interface UpdateUnidadData extends Partial<CreateUnidadData> {
  activa?: boolean
}

/**
 * Hook para obtener todas las unidades productivas
 */
export function useUnidadesProductivas() {
  return useQuery<UnidadProductiva[]>({
    queryKey: ['unidades-productivas'],
    queryFn: async () => {
      const response = await fetch('/api/unidades-productivas')
      if (!response.ok) {
        throw new Error('Error al cargar unidades productivas')
      }
      const data = await response.json()
      return data.data
    },
  })
}

/**
 * Hook para obtener una unidad productiva por ID
 */
export function useUnidadProductiva(id: number | null) {
  return useQuery<UnidadProductiva>({
    queryKey: ['unidad-productiva', id],
    queryFn: async () => {
      if (!id) throw new Error('ID requerido')
      
      const response = await fetch(`/api/unidades-productivas/${id}`)
      if (!response.ok) {
        throw new Error('Error al cargar unidad productiva')
      }
      const data = await response.json()
      return data.data
    },
    enabled: !!id,
  })
}

/**
 * Hook para crear, actualizar y eliminar unidades productivas
 */
export function useUnidadesMutations() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const createUnidad = useMutation({
    mutationFn: async (data: CreateUnidadData) => {
      const response = await fetch('/api/unidades-productivas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al crear unidad productiva')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unidades-productivas'] })
      toast({
        title: '✅ Unidad Productiva Creada',
        description: 'La unidad productiva se creó exitosamente',
      })
    },
    onError: (error: Error) => {
      toast({
        title: '❌ Error al Crear',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const updateUnidad = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateUnidadData }) => {
      const response = await fetch(`/api/unidades-productivas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al actualizar unidad productiva')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unidades-productivas'] })
      queryClient.invalidateQueries({ queryKey: ['unidad-productiva'] })
      toast({
        title: '✅ Unidad Actualizada',
        description: 'Los cambios se guardaron exitosamente',
      })
    },
    onError: (error: Error) => {
      toast({
        title: '❌ Error al Actualizar',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const deleteUnidad = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/unidades-productivas/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || error.error || 'Error al desactivar unidad productiva')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unidades-productivas'] })
      toast({
        title: '✅ Unidad Desactivada',
        description: 'La unidad productiva se desactivó exitosamente',
      })
    },
    onError: (error: Error) => {
      toast({
        title: '❌ Error al Desactivar',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  return {
    createUnidad: createUnidad.mutate,
    updateUnidad: updateUnidad.mutate,
    deleteUnidad: deleteUnidad.mutate,
    isCreating: createUnidad.isPending,
    isUpdating: updateUnidad.isPending,
    isDeleting: deleteUnidad.isPending,
  }
}
