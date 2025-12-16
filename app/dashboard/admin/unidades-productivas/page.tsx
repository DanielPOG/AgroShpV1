"use client"

import { useState } from "react"
import { useUnidadesProductivas, useUnidadesMutations } from "@/hooks/use-unidades-productivas"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Leaf, Plus, Search, MoreVertical, Edit, Trash2, UserCheck, MapPin, Package } from "lucide-react"
import { UnidadFormModal } from "@/components/admin/unidad-form-modal"
import type { UnidadProductiva } from "@/hooks/use-unidades-productivas"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

type FilterStatus = 'all' | 'active' | 'inactive'

export default function UnidadesProductivasPage() {
  const { data: unidades, isLoading } = useUnidadesProductivas()
  const { deleteUnidad, updateUnidad, isDeleting } = useUnidadesMutations()

  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedUnidad, setSelectedUnidad] = useState<UnidadProductiva | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)

  // Filtrar unidades por búsqueda y estado
  const filteredUnidades = unidades?.filter(
    (unidad) => {
      const matchesSearch = unidad.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        unidad.codigo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        unidad.tipo?.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'active' && unidad.activa) ||
        (filterStatus === 'inactive' && !unidad.activa)
      
      return matchesSearch && matchesStatus
    }
  )

  const handleEdit = (unidad: UnidadProductiva) => {
    setSelectedUnidad(unidad)
    setIsFormOpen(true)
  }

  const handleCreate = () => {
    setSelectedUnidad(null)
    setIsFormOpen(true)
  }

  const handleDelete = (id: number) => {
    setDeleteConfirmId(id)
  }

  const handleReactivate = (id: number) => {
    updateUnidad({ id, data: { activa: true } })
  }

  const confirmDelete = () => {
    if (deleteConfirmId) {
      deleteUnidad(deleteConfirmId)
      setDeleteConfirmId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Leaf className="h-8 w-8 text-primary" />
            Unidades Productivas
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestiona las unidades de producción del centro
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Unidad
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Unidades</CardTitle>
            <Leaf className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unidades?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Unidades registradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activas</CardTitle>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {unidades?.filter((u) => u.activa).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">En operación</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactivas</CardTitle>
            <Package className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {unidades?.filter((u) => !u.activa).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Desactivadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Búsqueda y Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Buscar Unidades</CardTitle>
          <CardDescription>Filtra por nombre, código o tipo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar unidades..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Tabs value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
            <TabsList>
              <TabsTrigger value="all">Todas ({unidades?.length || 0})</TabsTrigger>
              <TabsTrigger value="active">Activas ({unidades?.filter(u => u.activa).length || 0})</TabsTrigger>
              <TabsTrigger value="inactive">Inactivas ({unidades?.filter(u => !u.activa).length || 0})</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Tabla de Unidades */}
      <Card>
        <CardHeader>
          <CardTitle>Unidades Productivas</CardTitle>
          <CardDescription>
            {filteredUnidades?.length || 0} unidades encontradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Cargando unidades...</p>
            </div>
          ) : filteredUnidades && filteredUnidades.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead>Responsable</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUnidades.map((unidad) => (
                    <TableRow key={unidad.id}>
                      <TableCell className="font-mono">{unidad.codigo}</TableCell>
                      <TableCell className="font-medium">{unidad.nombre}</TableCell>
                      <TableCell>
                        {unidad.tipo ? (
                          <Badge variant="outline">{unidad.tipo}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {unidad.ubicacion ? (
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {unidad.ubicacion}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {unidad.responsable ? (
                          <div className="flex items-center gap-1 text-sm">
                            <UserCheck className="h-3 w-3 text-muted-foreground" />
                            {unidad.responsable.nombre} {unidad.responsable.apellido}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Sin asignar</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {unidad.activa ? (
                          <Badge className="bg-green-500 hover:bg-green-600">Activa</Badge>
                        ) : (
                          <Badge variant="destructive">Inactiva</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleEdit(unidad)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            {unidad.activa ? (
                              <DropdownMenuItem
                                onClick={() => handleDelete(unidad.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Desactivar
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => handleReactivate(unidad.id)}
                                className="text-green-600"
                              >
                                <UserCheck className="h-4 w-4 mr-2" />
                                Reactivar
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No se encontraron unidades</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Formulario */}
      <UnidadFormModal
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setSelectedUnidad(null)
        }}
        unidad={selectedUnidad}
      />

      {/* Diálogo de Confirmación de Eliminación */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción desactivará la unidad productiva. Solo se puede desactivar si no tiene productos activos o lotes disponibles.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? "Desactivando..." : "Desactivar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
