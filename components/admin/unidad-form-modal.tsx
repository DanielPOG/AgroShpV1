"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useUnidadesMutations, type UnidadProductiva } from "@/hooks/use-unidades-productivas"
import { useQuery } from "@tanstack/react-query"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Loader2 } from "lucide-react"

const unidadSchema = z.object({
  codigo: z.string().min(1, "Código es requerido").max(20, "Máximo 20 caracteres"),
  nombre: z.string().min(1, "Nombre es requerido").max(100, "Máximo 100 caracteres"),
  descripcion: z.string().optional(),
  tipo: z.string().optional(),
  ubicacion: z.string().max(200, "Máximo 200 caracteres").optional(),
  responsable_id: z.string().optional(),
  activa: z.boolean().default(true),
})

type UnidadFormValues = z.infer<typeof unidadSchema>

interface UnidadFormModalProps {
  open: boolean
  onClose: () => void
  unidad: UnidadProductiva | null
}

export function UnidadFormModal({ open, onClose, unidad }: UnidadFormModalProps) {
  const { createUnidad, updateUnidad, isCreating, isUpdating } = useUnidadesMutations()

  // Cargar usuarios para el select de responsable
  const { data: usuarios } = useQuery<any[]>({
    queryKey: ['usuarios-activos'],
    queryFn: async () => {
      const response = await fetch('/api/usuarios?activo=true')
      if (!response.ok) throw new Error('Error al cargar usuarios')
      const data = await response.json()
      return data.data || []
    },
    enabled: open,
  })

  const form = useForm<UnidadFormValues>({
    resolver: zodResolver(unidadSchema),
    defaultValues: {
      codigo: "",
      nombre: "",
      descripcion: "",
      tipo: "",
      ubicacion: "",
      responsable_id: "sin-asignar",
      activa: true,
    },
  })

  // Cargar datos cuando se edita
  useEffect(() => {
    if (unidad) {
      form.reset({
        codigo: unidad.codigo,
        nombre: unidad.nombre,
        descripcion: unidad.descripcion || "",
        tipo: unidad.tipo || "",
        ubicacion: unidad.ubicacion || "",
        responsable_id: unidad.responsable_id?.toString() || "sin-asignar",
        activa: unidad.activa,
      })
    } else {
      form.reset({
        codigo: "",
        nombre: "",
        descripcion: "",
        tipo: "",
        ubicacion: "",
        responsable_id: "sin-asignar",
        activa: true,
      })
    }
  }, [unidad, form])

  const onSubmit = (data: UnidadFormValues) => {
    const payload = {
      ...data,
      responsable_id: data.responsable_id && data.responsable_id !== "sin-asignar" 
        ? Number(data.responsable_id) 
        : undefined,
    }

    if (unidad) {
      updateUnidad({ id: unidad.id, data: payload })
    } else {
      createUnidad(payload)
    }

    onClose()
  }

  const tiposUnidad = [
    "Huerta",
    "Granja",
    "Panadería",
    "Procesamiento",
    "Lácteos",
    "Porcinos",
    "Avícola",
    "Bovinos",
    "Otro"
  ]

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {unidad ? "Editar Unidad Productiva" : "Nueva Unidad Productiva"}
          </DialogTitle>
          <DialogDescription>
            {unidad
              ? "Actualiza la información de la unidad productiva"
              : "Crea una nueva unidad productiva en el sistema"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {/* Código */}
              <FormField
                control={form.control}
                name="codigo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código *</FormLabel>
                    <FormControl>
                      <Input placeholder="UP-001" {...field} />
                    </FormControl>
                    <FormDescription>Código único de la unidad</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tipo */}
              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tiposUnidad.map((tipo) => (
                          <SelectItem key={tipo} value={tipo}>
                            {tipo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>Tipo de unidad productiva</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Nombre */}
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre *</FormLabel>
                  <FormControl>
                    <Input placeholder="Huerta Orgánica" {...field} />
                  </FormControl>
                  <FormDescription>Nombre descriptivo de la unidad</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Descripción */}
            <FormField
              control={form.control}
              name="descripcion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descripción detallada de la unidad productiva..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Información adicional sobre la unidad</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Ubicación */}
              <FormField
                control={form.control}
                name="ubicacion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ubicación</FormLabel>
                    <FormControl>
                      <Input placeholder="Sector Norte, Lote 3" {...field} />
                    </FormControl>
                    <FormDescription>Ubicación física</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Responsable */}
              <FormField
                control={form.control}
                name="responsable_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsable</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === "sin-asignar" ? "" : value)} 
                      value={field.value || "sin-asignar"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sin asignar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="sin-asignar">Sin asignar</SelectItem>
                        {usuarios?.map((usuario: any) => (
                          <SelectItem key={usuario.id} value={usuario.id.toString()}>
                            {usuario.nombre} {usuario.apellido} ({usuario.rol?.nombre})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>Usuario responsable</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Estado Activa */}
            {unidad && (
              <FormField
                control={form.control}
                name="activa"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Estado Activo</FormLabel>
                      <FormDescription>
                        Unidad productiva activa y operativa
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isCreating || isUpdating}>
                {(isCreating || isUpdating) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {unidad ? "Guardar Cambios" : "Crear Unidad"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
