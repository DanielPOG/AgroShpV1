import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'

export interface AdminRole {
  id: number
  nombre: string
  descripcion: string | null
  permisos: Record<string, boolean>
  created_at?: string
  updated_at?: string
  _count?: {
    usuarios: number
  }
}

export interface AdminUser {
  id: number
  nombre: string
  apellido: string
  email: string
  activo: boolean
  rol_id: number | null
  created_at?: string
  updated_at?: string
  ultimo_acceso?: string | null
  rol?: {
    id: number
    nombre: string
  } | null
}

export interface CreateAdminUserPayload {
  nombre: string
  apellido: string
  email: string
  password: string
  rol_id: number
  activo?: boolean
}

export interface UpdateAdminUserPayload {
  nombre?: string
  apellido?: string
  email?: string
  password?: string
  rol_id?: number
  activo?: boolean
}

export interface CreateRolePayload {
  nombre: string
  descripcion?: string | null
  permisos?: Record<string, boolean>
}

export interface UpdateRolePayload {
  nombre?: string
  descripcion?: string | null
  permisos?: Record<string, boolean>
}

function normalizeApiError(errorBody: unknown, fallback: string): string {
  if (!errorBody || typeof errorBody !== 'object') return fallback
  const body = errorBody as { error?: string }
  return body.error || fallback
}

export function useAdminUsers() {
  return useQuery<AdminUser[]>({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const response = await fetch('/api/usuarios')
      const data = await response.json()
      if (!response.ok) {
        throw new Error(normalizeApiError(data, 'Error al cargar usuarios'))
      }
      return data.data || []
    },
  })
}

export function useAdminRoles() {
  return useQuery<AdminRole[]>({
    queryKey: ['admin', 'roles'],
    queryFn: async () => {
      const response = await fetch('/api/roles')
      const data = await response.json()
      if (!response.ok) {
        throw new Error(normalizeApiError(data, 'Error al cargar roles'))
      }
      return data.data || []
    },
  })
}

export function useAdminUsersMutations() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const createUser = useMutation({
    mutationFn: async (payload: CreateAdminUserPayload) => {
      const response = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(normalizeApiError(data, 'Error al crear usuario'))
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast({ title: 'Usuario creado', description: 'El usuario se creo exitosamente' })
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const updateUser = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: UpdateAdminUserPayload }) => {
      const response = await fetch(`/api/usuarios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(normalizeApiError(data, 'Error al actualizar usuario'))
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast({ title: 'Usuario actualizado', description: 'Los cambios se guardaron correctamente' })
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const disableUser = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/usuarios/${id}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(normalizeApiError(data, 'Error al deshabilitar usuario'))
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast({ title: 'Usuario deshabilitado', description: 'El usuario no podra iniciar sesion' })
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  return {
    createUser: createUser.mutate,
    updateUser: updateUser.mutate,
    disableUser: disableUser.mutate,
    isCreatingUser: createUser.isPending,
    isUpdatingUser: updateUser.isPending,
    isDisablingUser: disableUser.isPending,
    createUserError: createUser.error,
    updateUserError: updateUser.error,
    resetCreateUser: createUser.reset,
    resetUpdateUser: updateUser.reset,
  }
}

export function useAdminRolesMutations() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const createRole = useMutation({
    mutationFn: async (payload: CreateRolePayload) => {
      const response = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(normalizeApiError(data, 'Error al crear rol'))
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] })
      toast({ title: 'Rol creado', description: 'El rol se creo exitosamente' })
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const updateRole = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: UpdateRolePayload }) => {
      const response = await fetch(`/api/roles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(normalizeApiError(data, 'Error al actualizar rol'))
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] })
      toast({ title: 'Rol actualizado', description: 'Los cambios se guardaron correctamente' })
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const deleteRole = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/roles/${id}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(normalizeApiError(data, 'Error al eliminar rol'))
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast({ title: 'Rol eliminado', description: 'El rol se elimino exitosamente' })
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  return {
    createRole: createRole.mutate,
    updateRole: updateRole.mutate,
    deleteRole: deleteRole.mutate,
    isCreatingRole: createRole.isPending,
    isUpdatingRole: updateRole.isPending,
    isDeletingRole: deleteRole.isPending,
    createRoleError: createRole.error,
    updateRoleError: updateRole.error,
    resetCreateRole: createRole.reset,
    resetUpdateRole: updateRole.reset,
  }
}
