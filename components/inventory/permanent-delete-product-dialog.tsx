"use client"

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
import { AlertTriangle } from "lucide-react"

interface PermanentDeleteProductDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  productName: string
  isDeleting: boolean
}

export function PermanentDeleteProductDialog({
  isOpen,
  onClose,
  onConfirm,
  productName,
  isDeleting,
}: PermanentDeleteProductDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            ⚠️ Eliminación Permanente
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p className="font-semibold text-foreground">
                Estás a punto de eliminar <span className="text-destructive">{productName}</span> de la base de datos.
              </p>
              <div className="rounded-lg bg-destructive/10 p-3 space-y-2">
                <p className="text-sm font-medium text-destructive">Esta acción:</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Es <strong>IRREVERSIBLE</strong></li>
                  <li>Elimina el producto permanentemente</li>
                  <li>Se registra en auditoría</li>
                  <li>Solo funciona si no tiene lotes o ventas asociadas</li>
                </ul>
              </div>
              <p className="text-sm">
                ¿Estás seguro de que deseas continuar?
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              onConfirm()
            }}
            disabled={isDeleting}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isDeleting ? "Eliminando..." : "Sí, Eliminar Permanentemente"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
