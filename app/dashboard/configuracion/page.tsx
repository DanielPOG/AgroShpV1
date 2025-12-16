"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Save, Settings, Store, Mail, Phone, MapPin, Hash, Calendar, Package } from "lucide-react"
import { invalidateClientConfigCache } from "@/hooks/use-config"

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

  useEffect(() => {
    loadConfiguracion()
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
