"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Info
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface MovimientosGuiaModalProps {
  open: boolean
  onClose: () => void
}

export function MovimientosGuiaModal({ open, onClose }: MovimientosGuiaModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Info className="h-6 w-6 text-blue-500" />
            Guía: Módulo de Movimientos de Caja
          </DialogTitle>
          <DialogDescription>
            Aprende cómo registrar entradas y salidas de efectivo adicionales
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* ¿Qué es este módulo? */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              ¿Para qué sirve este módulo?
            </h3>
            <Alert>
              <AlertDescription className="text-base">
                El módulo de <strong>Movimientos de Caja</strong> te permite registrar entradas y salidas 
                de efectivo que <strong>NO son ventas, retiros formales ni gastos operativos</strong>.
                Son movimientos adicionales que afectan el efectivo disponible en caja.
              </AlertDescription>
            </Alert>
          </div>

          {/* Tipos de Movimientos */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Tipos de Movimientos</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {/* Ingresos */}
              <Card className="border-green-200">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-green-100 p-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-green-700 mb-2">Ingresos Adicionales</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        Dinero que <strong>entra</strong> a la caja
                      </p>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• Devolución de préstamos</li>
                        <li>• Cobro de deudas antiguas</li>
                        <li>• Reembolsos de proveedores</li>
                        <li>• Ajustes positivos por conteo</li>
                        <li>• Donaciones o ingresos varios</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Egresos */}
              <Card className="border-red-200">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-red-100 p-2">
                      <TrendingDown className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-red-700 mb-2">Egresos Operativos</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        Dinero que <strong>sale</strong> de la caja
                      </p>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• Devoluciones a clientes</li>
                        <li>• Préstamos al personal</li>
                        <li>• Pagos menores no clasificados</li>
                        <li>• Ajustes negativos por conteo</li>
                        <li>• Reembolsos de clientes</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Diferencia con otros módulos */}
          <div>
            <h3 className="text-lg font-semibold mb-3">¿En qué se diferencia de otros módulos?</h3>
            <div className="space-y-3">
              <Alert className="border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription>
                  <strong>Retiros de Caja:</strong> Para sacar dinero grande (ej: depósitos bancarios, 
                  traslados a otra caja). Requieren autorización de supervisor.
                </AlertDescription>
              </Alert>
              <Alert className="border-purple-200">
                <AlertCircle className="h-4 w-4 text-purple-600" />
                <AlertDescription>
                  <strong>Gastos de Caja:</strong> Para gastos operativos del negocio con comprobante 
                  (servicios, materiales, etc.). Deben tener factura o recibo.
                </AlertDescription>
              </Alert>
              <Alert className="border-orange-200">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription>
                  <strong>Movimientos:</strong> Para cualquier otro movimiento de efectivo no categorizado. 
                  No requiere comprobante obligatorio, pero sí una descripción clara.
                </AlertDescription>
              </Alert>
            </div>
          </div>

          {/* Validaciones y Controles */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              Validaciones Automáticas
            </h3>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm">
                  <strong>Control de efectivo:</strong> No puedes registrar egresos en efectivo si no hay suficiente 
                  dinero físico disponible en caja. Pagos digitales no tienen esta restricción.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm">
                  <strong>Autorización automática:</strong> Movimientos mayores a $100,000 requieren 
                  aprobación de supervisor o administrador.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm">
                  <strong>Solo en sesión abierta:</strong> No puedes registrar movimientos si la sesión 
                  de caja está cerrada.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm">
                  <strong>Trazabilidad completa:</strong> Todos los movimientos quedan registrados con 
                  usuario, fecha, hora y descripción.
                </p>
              </div>
            </div>
          </div>

          {/* Cálculo de Efectivo Disponible */}
          <div>
            <h3 className="text-lg font-semibold mb-3">¿Cómo se calcula el efectivo en caja?</h3>
            <Card className="bg-slate-50">
              <CardContent className="pt-6">
                <div className="font-mono text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-green-600">Fondo Inicial:</span>
                    <span>+ $XXX</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-600">Ventas en Efectivo:</span>
                    <span>+ $XXX</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-600">Ingresos Adicionales (Efectivo):</span>
                    <span>+ $XXX</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Retiros de Caja:</span>
                    <span>- $XXX</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Gastos Operativos:</span>
                    <span>- $XXX</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Egresos Operativos (Efectivo):</span>
                    <span>- $XXX</span>
                  </div>
                  <div className="border-t-2 border-slate-300 pt-2 mt-2">
                    <div className="flex justify-between font-bold text-base">
                      <span>Efectivo en Caja:</span>
                      <span className="text-blue-600">= $XXX</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  ℹ️ Solo se consideran los movimientos en <strong>efectivo</strong>. 
                  Pagos digitales (Nequi, tarjeta) NO afectan el efectivo físico.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Ejemplos prácticos */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Ejemplos de Uso</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <TrendingUp className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm">Ejemplo de Ingreso:</p>
                  <p className="text-sm text-muted-foreground">
                    Un cliente pagó una deuda antigua de $50,000 en efectivo. Registras un 
                    <strong> Ingreso Adicional</strong> con descripción: "Pago deuda cliente Juan Pérez - Factura #123"
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                <TrendingDown className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm">Ejemplo de Egreso:</p>
                  <p className="text-sm text-muted-foreground">
                    Devolviste $30,000 a un cliente por un producto defectuoso. Registras un 
                    <strong> Egreso Operativo</strong> con descripción: "Devolución cliente María López - Producto defectuoso"
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Advertencias */}
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Importante:</strong> Una vez registrado un movimiento, solo puedes eliminarlo si 
              <strong> NO ha sido autorizado</strong> por un supervisor. Si el movimiento requiere autorización 
              y ya fue aprobado, quedará permanentemente en el historial.
            </AlertDescription>
          </Alert>

          {/* Botón de cerrar */}
          <div className="flex justify-end pt-4">
            <Button onClick={onClose} size="lg">
              Entendido
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
