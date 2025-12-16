"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Save, Settings, Store, Mail, Phone, MapPin, Hash, Calendar, Package, Target, Plus, Trash2, Edit } from "lucide-react"
import { invalidateClientConfigCache } from "@/hooks/use-config"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"

interface ConfiguracionGlobal {
  nombre_tienda: string
  email_tienda: string
  telefono_tienda: string
  direccion_tienda: string
  ciudad_tienda: string
  iva_porcentaje: number
  stock_minimo_default: number
  dias_alerta_vencimiento: number
  version_sistema: string
}

interface MetaVenta {
  id: number
  nombre: string
  monto_objetivo: number
  anio: number
  activa: boolean
  created_at: Date
}

interface NuevaMetaForm {
  nombre: string
  monto_objetivo: string
  anio: number
}

export default function ConfiguracionPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState<ConfiguracionGlobal>({
    nombre_tienda: "",
    email_tienda: "",
    telefono_tienda: "",
    direccion_tienda: "",
    ciudad_tienda: "",
    iva_porcentaje: 19,
    stock_minimo_default: 10,
    dias_alerta_vencimiento: 7,
    version_sistema: "1.0.0",
  })

  // Estados para metas
  const [metas, setMetas] = useState<MetaVenta[]>([])
  const [loadingMetas, setLoadingMetas] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editandoMeta, setEditandoMeta] = useState<MetaVenta | null>(null)
  const [nuevaMeta, setNuevaMeta] = useState<NuevaMetaForm>({
    nombre: "",
    monto_objetivo: "",
    anio: new Date().getFullYear(),
  })

  useEffect(() => {
    loadConfiguracion()
    loadMetas()
  }, [])

  const loadConfiguracion = async () => {
    try {
      const response = await fetch("/api/configuracion")
      if (response.ok) {
        const data = await response.json()
        setConfig(data)
      }
    } catch (error) {
      console.error("Error cargando configuración:", error)
      toast({
        title: "Error",
        description: "No se pudo cargar la configuración",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadMetas = async () => {
    try {
      const response = await fetch("/api/metas")
      if (response.ok) {
        const { data } = await response.json()
        setMetas(data)
      }
    } catch (error) {
      console.error("Error cargando metas:", error)
    } finally {
      setLoadingMetas(false)
    }
  }

  const handleCrearMeta = async () => {
    if (!nuevaMeta.nombre || !nuevaMeta.monto_objetivo) {
      toast({
        title: "Error",
        description: "Complete todos los campos",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/metas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nuevaMeta.nombre,
          monto_objetivo: parseFloat(nuevaMeta.monto_objetivo),
          anio: nuevaMeta.anio,
        }),
      })

      if (response.ok) {
        toast({
          title: "✓ Meta creada",
          description: "La meta se creó exitosamente",
        })
        setDialogOpen(false)
        setNuevaMeta({
          nombre: "",
          monto_objetivo: "",
          anio: new Date().getFullYear(),
        })
        loadMetas()
      } else {
        throw new Error("Error al crear meta")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear la meta",
        variant: "destructive",
      })
    }
  }

  const handleEliminarMeta = async (id: number) => {
    try {
      const response = await fetch(`/api/metas/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "✓ Meta eliminada",
          description: "La meta se eliminó exitosamente",
        })
        loadMetas()
      } else {
        throw new Error("Error al eliminar meta")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la meta",
        variant: "destructive",
      })
    }
  }

  const handleActivarMeta = async (id: number) => {
    try {
      const response = await fetch(`/api/metas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activa: true }),
      })

      if (response.ok) {
        toast({
          title: "✓ Meta activada",
          description: "La meta se activó exitosamente",
        })
        loadMetas()
      } else {
        throw new Error("Error al activar meta")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo activar la meta",
        variant: "destructive",
      })
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch("/api/configuracion", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      })

      if (response.ok) {
        // ✅ CRÍTICO: Invalidar caché del cliente para que todos los componentes se actualicen
        invalidateClientConfigCache()
        
        toast({
          title: "✓ Configuración guardada",
          description: "Los cambios se aplicaron correctamente en todo el sistema",
        })
      } else {
        throw new Error("Error al guardar")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const updateField = (field: keyof ConfiguracionGlobal, value: string | number) => {
    setConfig((prev) => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Configuración del Sistema
          </h1>
          <p className="text-muted-foreground mt-1">
            Administra las variables globales que afectan todo el sistema
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Guardar Cambios
            </>
          )}
        </Button>
      </div>

      {/* Información de la Tienda */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Información de la Tienda
          </CardTitle>
          <CardDescription>Datos generales del negocio</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nombre_tienda">Nombre de la Tienda</Label>
              <div className="relative">
                <Store className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="nombre_tienda"
                  value={config.nombre_tienda}
                  onChange={(e) => updateField("nombre_tienda", e.target.value)}
                  className="pl-9"
                  placeholder="AgroShop SENA"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email_tienda">Email de Contacto</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email_tienda"
                  type="email"
                  value={config.email_tienda}
                  onChange={(e) => updateField("email_tienda", e.target.value)}
                  className="pl-9"
                  placeholder="agroshop@sena.edu.co"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefono_tienda">Teléfono de Contacto</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="telefono_tienda"
                  value={config.telefono_tienda}
                  onChange={(e) => updateField("telefono_tienda", e.target.value)}
                  className="pl-9"
                  placeholder="(601) 5461500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ciudad_tienda">Ciudad</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="ciudad_tienda"
                  value={config.ciudad_tienda}
                  onChange={(e) => updateField("ciudad_tienda", e.target.value)}
                  className="pl-9"
                  placeholder="Bogotá"
                />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="direccion_tienda">Dirección Física</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="direccion_tienda"
                  value={config.direccion_tienda}
                  onChange={(e) => updateField("direccion_tienda", e.target.value)}
                  className="pl-9"
                  placeholder="SENA Centro Agropecuario"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuración de Negocio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Parámetros de Negocio
          </CardTitle>
          <CardDescription>Valores que afectan cálculos y operaciones</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="iva_porcentaje">Porcentaje de IVA (%)</Label>
              <Input
                id="iva_porcentaje"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={config.iva_porcentaje}
                onChange={(e) => updateField("iva_porcentaje", parseFloat(e.target.value) || 0)}
                placeholder="19"
              />
              <p className="text-xs text-muted-foreground">
                IVA aplicado en ventas (Colombia: 19%)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock_minimo_default">Stock Mínimo por Defecto</Label>
              <div className="relative">
                <Package className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="stock_minimo_default"
                  type="number"
                  min="0"
                  value={config.stock_minimo_default}
                  onChange={(e) => updateField("stock_minimo_default", parseInt(e.target.value) || 0)}
                  className="pl-9"
                  placeholder="10"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Cantidad mínima para alertas de inventario
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dias_alerta_vencimiento">Días de Alerta de Vencimiento</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="dias_alerta_vencimiento"
                  type="number"
                  min="1"
                  value={config.dias_alerta_vencimiento}
                  onChange={(e) => updateField("dias_alerta_vencimiento", parseInt(e.target.value) || 7)}
                  className="pl-9"
                  placeholder="7"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Días antes del vencimiento para alertar
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metas de Ventas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Metas de Ventas
              </CardTitle>
              <CardDescription>Configure objetivos anuales de ventas</CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva Meta
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear Meta de Ventas</DialogTitle>
                  <DialogDescription>
                    Configure una nueva meta anual. Solo puede haber una meta activa por año.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="meta-nombre">Nombre de la Meta</Label>
                    <Input
                      id="meta-nombre"
                      placeholder="Ej: Meta Anual 2025"
                      value={nuevaMeta.nombre}
                      onChange={(e) => setNuevaMeta({ ...nuevaMeta, nombre: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="meta-monto">Monto Objetivo ($)</Label>
                    <Input
                      id="meta-monto"
                      type="number"
                      min="0"
                      step="1000"
                      placeholder="Ej: 100000000"
                      value={nuevaMeta.monto_objetivo}
                      onChange={(e) => setNuevaMeta({ ...nuevaMeta, monto_objetivo: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Total de ventas que desea alcanzar en el año
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="meta-anio">Año</Label>
                    <Input
                      id="meta-anio"
                      type="number"
                      min="2000"
                      max="2100"
                      value={nuevaMeta.anio}
                      onChange={(e) => setNuevaMeta({ ...nuevaMeta, anio: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCrearMeta}>
                    <Plus className="mr-2 h-4 w-4" />
                    Crear Meta
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loadingMetas ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : metas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No hay metas configuradas</p>
              <p className="text-sm">Crea una meta para comenzar a rastrear tus objetivos</p>
            </div>
          ) : (
            <div className="space-y-3">
              {metas.map((meta) => (
                <div
                  key={meta.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{meta.nombre}</h4>
                      {meta.activa && (
                        <Badge variant="default" className="text-xs">
                          Activa
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>
                        <strong>Objetivo:</strong> ${meta.monto_objetivo.toLocaleString('es-CO')}
                      </span>
                      <span>
                        <strong>Año:</strong> {meta.anio}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!meta.activa && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleActivarMeta(meta.id)}
                      >
                        Activar
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar meta?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminará permanentemente la meta "{meta.nombre}".
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleEliminarMeta(meta.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Información del Sistema */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Sistema</CardTitle>
          <CardDescription>Versión y detalles técnicos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm font-medium">Versión Actual</p>
              <p className="text-2xl font-bold">{config.version_sistema}</p>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p>Última actualización</p>
              <p>15 de diciembre de 2025</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
