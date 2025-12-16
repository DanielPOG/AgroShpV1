"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import { Plus, Search, Edit, Trash2, MapPin, Layers, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { CajaModal } from "@/components/admin/caja-modal"
import type { cajas } from "@prisma/client"

interface CajaWithCount extends cajas {
  _count: {
    sesiones_caja: number
  }
}

export default function CajasPage() {
  const { toast } = useToast()
  const [cajas, setCajas] = useState<CajaWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCaja, setEditingCaja] = useState<cajas | null>(null)
  const [deletingCaja, setDeletingCaja] = useState<cajas | null>(null)

  const loadCajas = async () => {
    try {
      const response = await fetch(`/api/cajas?search=${searchTerm}`)
      const data = await response.json()
      setCajas(data.cajas || [])
    } catch (error) {
      console.error("Error al cargar cajas:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las cajas",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCajas()
  }, [searchTerm])

  const handleDelete = async () => {
    if (!deletingCaja) return

    try {
      const response = await fetch(`/api/cajas/${deletingCaja.id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al eliminar caja")
      }

      toast({
        title: "Caja eliminada",
        description: `La caja ${deletingCaja.nombre} ha sido desactivada`,
      })

      loadCajas()
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al eliminar caja",
        variant: "destructive",
      })
    } finally {
      setDeletingCaja(null)
    }
  }

  const handleEdit = (caja: cajas) => {
    setEditingCaja(caja)
    setModalOpen(true)
  }

  const handleModalClose = () => {
    setModalOpen(false)
    setEditingCaja(null)
  }

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case "principal":
        return "bg-blue-500"
      case "secundaria":
        return "bg-green-500"
      case "movil":
        return "bg-purple-500"
      default:
        return "bg-gray-500"
    }
  }

  const filteredCajas = cajas

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Layers className="h-8 w-8" />
            Gestión de Cajas
          </h1>
          <p className="text-muted-foreground mt-1">
            Administra las cajas registradoras del sistema
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} size="lg">
          <Plus className="mr-2 h-4 w-4" />
          Nueva Caja
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Cajas Registradas</CardTitle>
              <CardDescription>Lista de todas las cajas del sistema</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cajas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCajas.length === 0 ? (
            <div className="text-center py-8">
              <Box className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No hay cajas registradas</p>
              <Button onClick={() => setModalOpen(true)} className="mt-4" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Crear Primera Caja
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Sesiones</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCajas.map((caja) => (
                  <TableRow key={caja.id}>
                    <TableCell className="font-mono text-sm">{caja.codigo}</TableCell>
                    <TableCell className="font-medium">{caja.nombre}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {caja.ubicacion}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getTipoColor(caja.tipo || "")}>
                        {caja.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{caja._count.sesiones_caja} sesiones</Badge>
                    </TableCell>
                    <TableCell>
                      {caja.activa ? (
                        <Badge variant="default" className="bg-green-500">
                          Activa
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inactiva</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(caja)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingCaja(caja)}
                          disabled={!caja.activa}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CajaModal open={modalOpen} onClose={handleModalClose} onSuccess={loadCajas} caja={editingCaja} />

      <AlertDialog open={!!deletingCaja} onOpenChange={() => setDeletingCaja(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar caja?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas desactivar la caja <strong>{deletingCaja?.nombre}</strong>? Esta acción se puede
              revertir editando la caja.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Desactivar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
