"use client"

import { useState } from "react"
import { Bell, ShoppingCart, Package, TrendingDown, AlertTriangle, History, Trash2, CheckSquare, Square, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserMenu } from "@/components/user-menu"
import { useNotificaciones } from "@/hooks/use-notificaciones"
import { LucideIcon } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
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

interface DashboardHeaderProps {
  title: string
  description?: string
}

/**
 * Mapear tipo de notificación a icono y color
 */
const getNotificationStyle = (tipo: string): { icon: LucideIcon; color: string } => {
  const styles: Record<string, { icon: LucideIcon; color: string }> = {
    sale: { icon: ShoppingCart, color: "text-primary" },
    movement: { icon: Package, color: "text-chart-4" },
    stock_agotado: { icon: AlertTriangle, color: "text-destructive" },
    stock_bajo: { icon: TrendingDown, color: "text-orange-accent" },
    stock_exceso: { icon: Package, color: "text-purple-500" },
    lote_vencimiento: { icon: AlertTriangle, color: "text-orange-accent" },
  }

  return styles[tipo] || { icon: Bell, color: "text-muted-foreground" }
}

/**
 * Formatear tiempo relativo (created_at → "Hace X min")
 */
const formatTimeAgo = (date: Date | string | null): string => {
  if (!date) return ""

  const now = new Date()
  const createdAt = new Date(date)
  const diffMs = now.getTime() - createdAt.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return "Justo ahora"
  if (diffMins < 60) return `Hace ${diffMins} min`
  if (diffHours < 24) return `Hace ${diffHours}h`
  return `Hace ${diffDays}d`
}

export function DashboardHeader({ title, description }: DashboardHeaderProps) {
  const { 
    notificaciones, 
    notificacionesLeidas,
    noLeidas, 
    isLoading,
    isLoadingLeidas,
    marcarLeida, 
    marcarTodasLeidas,
    eliminarSeleccionadas,
    eliminarTodasLeidas,
    refetchLeidas,
    selectedIds,
    toggleSelection,
    selectAll,
    deselectAll,
    filterProductoActivo,
    setFilterProductoActivo
  } = useNotificaciones()

  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("no-leidas")
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteAction, setDeleteAction] = useState<"selected" | "all" | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isCleaning, setIsCleaning] = useState(false)

  // Limpiar notificaciones duplicadas
  const handleLimpiarDuplicados = async () => {
    setIsCleaning(true)
    try {
      const response = await fetch('/api/notificaciones/limpiar-duplicados', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      console.log('📥 Respuesta de limpieza:', response.status, data)
      
      if (response.ok) {
        toast({
          title: "✅ Limpieza completada",
          description: data.eliminadas > 0 
            ? `${data.eliminadas} notificación(es) duplicada(s) eliminada(s)`
            : "No se encontraron notificaciones duplicadas",
        })
        // Refrescar listas solo si hubo eliminaciones
        if (data.eliminadas > 0) {
          refetch()
          refetchLeidas()
        }
      } else {
        console.error('❌ Error al limpiar:', data)
        toast({
          title: "Error",
          description: data.error || "No se pudo completar la limpieza",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('❌ Error en fetch:', error)
      toast({
        title: "Error",
        description: "No se pudieron limpiar las notificaciones duplicadas",
        variant: "destructive",
      })
    } finally {
      setIsCleaning(false)
    }
  }

  // Cargar notificaciones leídas cuando se cambia a la pestaña
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    if (value === "leidas" && notificacionesLeidas.length === 0) {
      refetchLeidas()
    }
    // Limpiar selección al cambiar de pestaña
    if (value === "no-leidas") {
      deselectAll()
    }
  }

  // Manejar confirmación de eliminación
  const handleDeleteConfirm = async () => {
    setIsDeleting(true)
    try {
      if (deleteAction === "selected") {
        const count = await eliminarSeleccionadas(selectedIds)
        if (count === 0) {
          toast({
            title: "No se eliminaron notificaciones",
            description: "Solo se pueden eliminar notificaciones con más de 24 horas de antigüedad. Esto evita que se recreen automáticamente.",
            variant: "default",
          })
        } else {
          toast({
            title: "Notificaciones eliminadas",
            description: `${count} notificación(es) eliminada(s) correctamente`,
          })
        }
      } else if (deleteAction === "all") {
        const count = await eliminarTodasLeidas()
        if (count === 0) {
          toast({
            title: "No se eliminaron notificaciones",
            description: "Solo se pueden eliminar notificaciones con más de 24 horas de antigüedad. Esto evita que se recreen automáticamente.",
            variant: "default",
          })
        } else {
          toast({
            title: "Notificaciones eliminadas",
            description: `${count} notificación(es) eliminada(s) correctamente`,
          })
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron eliminar las notificaciones",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
      setDeleteAction(null)
    }
  }

  // Abrir diálogo de confirmación
  const openDeleteDialog = (action: "selected" | "all") => {
    setDeleteAction(action)
    setShowDeleteDialog(true)
  }

  const renderNotificacion = (notificacion: any, showMarcarLeida: boolean = true, showCheckbox: boolean = false) => {
    const { icon: Icon, color } = getNotificationStyle(notificacion.tipo)
    const isSelected = selectedIds.includes(notificacion.id)
    
    return (
      <div
        key={notificacion.id}
        className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
          showMarcarLeida ? 'hover:bg-accent cursor-pointer' : 'opacity-60'
        } ${isSelected ? 'bg-accent' : ''}`}
      >
        {showCheckbox && (
          <div 
            className="flex-shrink-0 pt-1 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation()
              toggleSelection(notificacion.id)
            }}
          >
            {isSelected ? (
              <CheckSquare className="h-5 w-5 text-primary" />
            ) : (
              <Square className="h-5 w-5 text-muted-foreground hover:text-foreground" />
            )}
          </div>
        )}
        <div
          className="flex items-start gap-3 flex-1 min-w-0"
          onClick={() => showMarcarLeida && marcarLeida(notificacion.id)}
        >
          <div
            className={`h-8 w-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 ${color}`}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 space-y-1 min-w-0">
            <p className="text-sm font-medium text-foreground break-words">
              {notificacion.titulo}
            </p>
            <p className="text-xs text-muted-foreground break-words">
              {notificacion.mensaje}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatTimeAgo(notificacion.created_at)}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground text-balance">{title}</h1>
        {description && <p className="text-muted-foreground mt-1">{description}</p>}
      </div>
      <div className="flex items-center gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className="relative bg-transparent">
              <Bell className="h-4 w-4" />
              {noLeidas > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-orange-accent border-0">
                  {noLeidas}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96 p-0" align="end">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Notificaciones</h3>
                <p className="text-xs text-muted-foreground">
                  {noLeidas > 0 ? `${noLeidas} sin leer` : "Todo al día"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={handleLimpiarDuplicados}
                  disabled={isCleaning}
                  title="Limpiar notificaciones duplicadas"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  {isCleaning ? "Limpiando..." : "Limpiar"}
                </Button>
                {noLeidas > 0 && activeTab === "no-leidas" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={marcarTodasLeidas}
                  >
                    Marcar todas
                  </Button>
                )}
              </div>
            </div>
            
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <div className="px-4 pt-2">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="no-leidas" className="text-xs">
                    No leídas {noLeidas > 0 && `(${noLeidas})`}
                  </TabsTrigger>
                  <TabsTrigger value="leidas" className="text-xs">
                    <History className="h-3 w-3 mr-1" />
                    Leídas
                  </TabsTrigger>
                </TabsList>
                
                {/* Filtro por estado del producto */}
                <div className="mt-3">
                  <Select value={filterProductoActivo} onValueChange={setFilterProductoActivo}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Filtrar por estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los productos</SelectItem>
                      <SelectItem value="true">Solo productos activos</SelectItem>
                      <SelectItem value="false">Solo productos desactivados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <TabsContent value="no-leidas" className="mt-0">
                <ScrollArea className="h-80">
                  <div className="p-2">
                    {isLoading ? (
                      <div className="flex items-center justify-center p-4">
                        <p className="text-sm text-muted-foreground">Cargando...</p>
                      </div>
                    ) : notificaciones.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-8 text-center">
                        <Bell className="h-12 w-12 text-muted-foreground/40 mb-3" />
                        <p className="text-sm font-medium text-muted-foreground">No hay notificaciones</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Las alertas aparecerán aquí
                        </p>
                      </div>
                    ) : (
                      notificaciones.map((notificacion) => renderNotificacion(notificacion, true))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="leidas" className="mt-0">
                {/* Barra de controles para eliminar */}
                {notificacionesLeidas.length > 0 && (
                  <div className="px-3 py-2 border-b border-border flex items-center justify-between gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[10px] h-7 px-2"
                      onClick={() => selectedIds.length === notificacionesLeidas.length ? deselectAll() : selectAll()}
                    >
                      {selectedIds.length === notificacionesLeidas.length ? (
                        <>
                          <CheckSquare className="h-3 w-3 mr-1" />
                          <span className="hidden sm:inline">Deseleccionar</span>
                        </>
                      ) : (
                        <>
                          <Square className="h-3 w-3 mr-1" />
                          <span className="hidden sm:inline">Seleccionar todas</span>
                        </>
                      )}
                    </Button>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[10px] h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => openDeleteDialog("selected")}
                        disabled={selectedIds.length === 0}
                      >
                        <Trash2 className="h-3 w-3" />
                        <span className="ml-1">({selectedIds.length})</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[10px] h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => openDeleteDialog("all")}
                      >
                        <Trash2 className="h-3 w-3" />
                        <span className="ml-1 hidden sm:inline">Todas</span>
                      </Button>
                    </div>
                  </div>
                )}
                
                <ScrollArea className="h-80">
                  <div className="p-2">
                    {isLoadingLeidas ? (
                      <div className="flex items-center justify-center p-4">
                        <p className="text-sm text-muted-foreground">Cargando historial...</p>
                      </div>
                    ) : notificacionesLeidas.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-8 text-center">
                        <History className="h-12 w-12 text-muted-foreground/40 mb-3" />
                        <p className="text-sm font-medium text-muted-foreground">Sin historial</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Las notificaciones leídas aparecerán aquí
                        </p>
                      </div>
                    ) : (
                      notificacionesLeidas.map((notificacion) => renderNotificacion(notificacion, false, true))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </PopoverContent>
        </Popover>

        {/* Menú de usuario con logout */}
        <UserMenu />
      </div>

      {/* Diálogo de confirmación para eliminar */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar notificaciones?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteAction === "selected" 
                ? `Se eliminarán ${selectedIds.length} notificación(es) seleccionada(s). Esta acción no se puede deshacer.`
                : `Se eliminarán todas las notificaciones leídas (${notificacionesLeidas.length}). Esta acción no se puede deshacer.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
