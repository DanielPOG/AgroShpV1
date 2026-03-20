"use client"

import { useCallback, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Plus, Users, ShieldCheck, Search, UserX, Pencil, Trash2, AlertCircle } from 'lucide-react'
import {
  useAdminRoles,
  useAdminRolesMutations,
  useAdminUsers,
  useAdminUsersMutations,
  type AdminRole,
  type AdminUser,
} from '@/hooks/use-admin-users-roles'

type UserFormState = {
  nombre: string
  apellido: string
  email: string
  password: string
  rol_id: string
  activo: boolean
}

type RoleFormState = {
  nombre: string
  descripcion: string
  permisosJson: string
}

const defaultUserForm: UserFormState = {
  nombre: '',
  apellido: '',
  email: '',
  password: '',
  rol_id: '',
  activo: true,
}

const defaultRoleForm: RoleFormState = {
  nombre: '',
  descripcion: '',
  permisosJson: '{}',
}

function parsePermisos(permisosJson: string): Record<string, boolean> {
  try {
    const parsed = JSON.parse(permisosJson) as Record<string, unknown>
    const normalized: Record<string, boolean> = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'boolean') {
        normalized[key] = value
      }
    }
    return normalized
  } catch {
    return {}
  }
}

export default function AdminUsuariosRolesPage() {
  const { data: users = [], isLoading: isLoadingUsers } = useAdminUsers()
  const { data: roles = [], isLoading: isLoadingRoles } = useAdminRoles()

  const {
    createUser,
    updateUser,
    disableUser,
    isCreatingUser,
    isUpdatingUser,
    isDisablingUser,
    createUserError,
    updateUserError,
    resetCreateUser,
    resetUpdateUser,
  } = useAdminUsersMutations()

  const {
    createRole,
    updateRole,
    deleteRole,
    isCreatingRole,
    isUpdatingRole,
    isDeletingRole,
    createRoleError,
    updateRoleError,
    resetCreateRole,
    resetUpdateRole,
  } = useAdminRolesMutations()

  const [searchUsers, setSearchUsers] = useState('')
  const [searchRoles, setSearchRoles] = useState('')

  const [userDialogOpen, setUserDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [userForm, setUserForm] = useState<UserFormState>(defaultUserForm)

  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<AdminRole | null>(null)
  const [roleForm, setRoleForm] = useState<RoleFormState>(defaultRoleForm)

  const [disableUserId, setDisableUserId] = useState<number | null>(null)
  const [deleteRoleId, setDeleteRoleId] = useState<number | null>(null)

  const [userFormErrors, setUserFormErrors] = useState<string[]>([])
  const [roleFormErrors, setRoleFormErrors] = useState<string[]>([])

  const userMutationError = editingUser ? updateUserError : createUserError
  const roleMutationError = editingRole ? updateRoleError : createRoleError

  const filteredUsers = useMemo(() => {
    const term = searchUsers.trim().toLowerCase()
    if (!term) return users
    return users.filter((user) => {
      const fullName = `${user.nombre} ${user.apellido}`.toLowerCase()
      return fullName.includes(term) || user.email.toLowerCase().includes(term)
    })
  }, [users, searchUsers])

  const filteredRoles = useMemo(() => {
    const term = searchRoles.trim().toLowerCase()
    if (!term) return roles
    return roles.filter((role) => {
      return (
        role.nombre.toLowerCase().includes(term) ||
        (role.descripcion || '').toLowerCase().includes(term)
      )
    })
  }, [roles, searchRoles])

  const openCreateUser = () => {
    setEditingUser(null)
    setUserForm(defaultUserForm)
    setUserFormErrors([])
    resetCreateUser()
    setUserDialogOpen(true)
  }

  const openEditUser = (user: AdminUser) => {
    setEditingUser(user)
    setUserForm({
      nombre: user.nombre,
      apellido: user.apellido,
      email: user.email,
      password: '',
      rol_id: user.rol_id ? String(user.rol_id) : '',
      activo: user.activo,
    })
    setUserFormErrors([])
    resetUpdateUser()
    setUserDialogOpen(true)
  }

  const submitUserForm = useCallback(() => {
    const errors: string[] = []
    if (!userForm.nombre.trim()) errors.push('El nombre es obligatorio')
    if (!userForm.apellido.trim()) errors.push('El apellido es obligatorio')
    if (!userForm.email.trim()) errors.push('El correo es obligatorio')
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userForm.email)) errors.push('El formato del correo no es valido')
    if (!editingUser && !userForm.password) errors.push('La contrasena es obligatoria')
    if (userForm.password && userForm.password.length < 8) errors.push('La contrasena debe tener al menos 8 caracteres')
    if (!userForm.rol_id) errors.push('Debes seleccionar un rol')

    if (errors.length > 0) {
      setUserFormErrors(errors)
      return
    }
    setUserFormErrors([])

    const payload = {
      nombre: userForm.nombre.trim(),
      apellido: userForm.apellido.trim(),
      email: userForm.email.trim(),
      rol_id: Number(userForm.rol_id),
      activo: userForm.activo,
      ...(userForm.password ? { password: userForm.password } : {}),
    }

    const onSuccess = () => setUserDialogOpen(false)

    if (editingUser) {
      updateUser({ id: editingUser.id, payload }, { onSuccess })
    } else {
      createUser({ ...payload, password: userForm.password }, { onSuccess })
    }
  }, [userForm, editingUser, createUser, updateUser])

  const openCreateRole = () => {
    setEditingRole(null)
    setRoleForm(defaultRoleForm)
    setRoleFormErrors([])
    resetCreateRole()
    setRoleDialogOpen(true)
  }

  const openEditRole = (role: AdminRole) => {
    setEditingRole(role)
    setRoleForm({
      nombre: role.nombre,
      descripcion: role.descripcion || '',
      permisosJson: JSON.stringify(role.permisos || {}, null, 2),
    })
    setRoleFormErrors([])
    resetUpdateRole()
    setRoleDialogOpen(true)
  }

  const submitRoleForm = useCallback(() => {
    const errors: string[] = []
    if (!roleForm.nombre.trim()) errors.push('El nombre del rol es obligatorio')
    if (roleForm.nombre.trim().length < 3) errors.push('El nombre debe tener al menos 3 caracteres')

    let permisos: Record<string, boolean> = {}
    try {
      permisos = parsePermisos(roleForm.permisosJson)
      if (roleForm.permisosJson.trim() !== '{}' && roleForm.permisosJson.trim() !== '') {
        JSON.parse(roleForm.permisosJson)
      }
    } catch {
      errors.push('El JSON de permisos no es valido')
    }

    if (errors.length > 0) {
      setRoleFormErrors(errors)
      return
    }
    setRoleFormErrors([])

    const payload = {
      nombre: roleForm.nombre.trim(),
      descripcion: roleForm.descripcion || null,
      permisos,
    }

    const onSuccess = () => setRoleDialogOpen(false)

    if (editingRole) {
      updateRole({ id: editingRole.id, payload }, { onSuccess })
    } else {
      createRole(payload, { onSuccess })
    }
  }, [roleForm, editingRole, createRole, updateRole])

  const confirmDisableUser = () => {
    if (!disableUserId) return
    disableUser(disableUserId)
    setDisableUserId(null)
  }

  const confirmDeleteRole = () => {
    if (!deleteRoleId) return
    deleteRole(deleteRoleId)
    setDeleteRoleId(null)
  }

  const usersActive = users.filter((u) => u.activo).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Administracion de Usuarios y Roles</h1>
          <p className="text-muted-foreground">
            CRUD de seguridad del sistema con deshabilitacion logica de usuarios.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{usersActive}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roles.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="bg-muted/60 p-1">
          <TabsTrigger
            value="users"
            className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
          >
            <Users className="h-4 w-4" /> Usuarios
          </TabsTrigger>
          <TabsTrigger
            value="roles"
            className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
          >
            <ShieldCheck className="h-4 w-4" /> Roles
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Gestion de Usuarios</CardTitle>
                  <CardDescription>Crear, editar y deshabilitar usuarios del sistema.</CardDescription>
                </div>
                <Button onClick={openCreateUser}>
                  <Plus className="mr-2 h-4 w-4" /> Nuevo Usuario
                </Button>
              </div>
              <div className="relative pt-2">
                <Search className="absolute left-3 top-5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchUsers}
                  onChange={(e) => setSearchUsers(e.target.value)}
                  className="pl-10"
                  placeholder="Buscar por nombre o email"
                />
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingUsers ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.nombre} {user.apellido}
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.rol?.nombre || 'Sin rol'}</TableCell>
                          <TableCell>
                            {user.activo ? (
                              <Badge className="bg-green-500 hover:bg-green-600">Activo</Badge>
                            ) : (
                              <Badge variant="secondary">Inactivo</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => openEditUser(user)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              {user.activo && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => setDisableUserId(user.id)}
                                >
                                  <UserX className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Gestion de Roles</CardTitle>
                  <CardDescription>Crear, editar y eliminar roles no protegidos.</CardDescription>
                </div>
                <Button onClick={openCreateRole}>
                  <Plus className="mr-2 h-4 w-4" /> Nuevo Rol
                </Button>
              </div>
              <div className="relative pt-2">
                <Search className="absolute left-3 top-5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchRoles}
                  onChange={(e) => setSearchRoles(e.target.value)}
                  className="pl-10"
                  placeholder="Buscar por nombre o descripcion"
                />
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingRoles ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Descripcion</TableHead>
                        <TableHead>Usuarios</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRoles.map((role) => (
                        <TableRow key={role.id}>
                          <TableCell className="font-medium">{role.nombre}</TableCell>
                          <TableCell>{role.descripcion || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{role._count?.usuarios || 0}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => openEditRole(role)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setDeleteRoleId(role.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
            <DialogDescription>
              {editingUser
                ? 'Actualiza informacion del usuario seleccionado.'
                : 'Crea un usuario con credenciales y rol inicial.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Nombre"
                value={userForm.nombre}
                onChange={(e) => setUserForm((prev) => ({ ...prev, nombre: e.target.value }))}
              />
              <Input
                placeholder="Apellido"
                value={userForm.apellido}
                onChange={(e) => setUserForm((prev) => ({ ...prev, apellido: e.target.value }))}
              />
            </div>
            <Input
              placeholder="correo@dominio.com"
              type="email"
              value={userForm.email}
              onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))}
            />
            <Input
              placeholder={editingUser ? 'Nueva contrasena (opcional)' : 'Contrasena'}
              type="password"
              value={userForm.password}
              onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))}
            />
            <Select
              value={userForm.rol_id}
              onValueChange={(value) => setUserForm((prev) => ({ ...prev, rol_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar rol" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={String(role.id)}>
                    {role.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {editingUser && (
              <Select
                value={userForm.activo ? 'activo' : 'inactivo'}
                onValueChange={(value) => setUserForm((prev) => ({ ...prev, activo: value === 'activo' }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="inactivo">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          {(userFormErrors.length > 0 || userMutationError) && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <div className="text-sm text-destructive space-y-1">
                  {userFormErrors.map((err, i) => (
                    <p key={i}>{err}</p>
                  ))}
                  {userMutationError && <p>{userMutationError.message}</p>}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={submitUserForm}
              disabled={isCreatingUser || isUpdatingUser}
            >
              {(isCreatingUser || isUpdatingUser) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Editar Rol' : 'Nuevo Rol'}</DialogTitle>
            <DialogDescription>
              Define nombre, descripcion y un objeto JSON de permisos booleanos.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <Input
              placeholder="Nombre del rol"
              value={roleForm.nombre}
              onChange={(e) => setRoleForm((prev) => ({ ...prev, nombre: e.target.value }))}
            />
            <Input
              placeholder="Descripcion"
              value={roleForm.descripcion}
              onChange={(e) => setRoleForm((prev) => ({ ...prev, descripcion: e.target.value }))}
            />
            <Textarea
              rows={8}
              value={roleForm.permisosJson}
              onChange={(e) => setRoleForm((prev) => ({ ...prev, permisosJson: e.target.value }))}
              placeholder='{"dashboard": true, "usuarios": false}'
            />
          </div>
          {(roleFormErrors.length > 0 || roleMutationError) && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <div className="text-sm text-destructive space-y-1">
                  {roleFormErrors.map((err, i) => (
                    <p key={i}>{err}</p>
                  ))}
                  {roleMutationError && <p>{roleMutationError.message}</p>}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submitRoleForm} disabled={isCreatingRole || isUpdatingRole}>
              {(isCreatingRole || isUpdatingRole) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingRole ? 'Guardar Cambios' : 'Crear Rol'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={disableUserId !== null} onOpenChange={() => setDisableUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deshabilitar usuario</AlertDialogTitle>
            <AlertDialogDescription>
              El usuario no sera eliminado por trazabilidad de arqueos y movimientos. Solo se bloquea su acceso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDisableUser} disabled={isDisablingUser}>
              {isDisablingUser && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Deshabilitar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteRoleId !== null} onOpenChange={() => setDeleteRoleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar rol</AlertDialogTitle>
            <AlertDialogDescription>
              Solo se eliminan roles sin usuarios asignados y que no sean roles base del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteRole} disabled={isDeletingRole}>
              {isDeletingRole && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
