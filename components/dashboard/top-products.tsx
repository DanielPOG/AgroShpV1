import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface TopProductsProps {
  productos: Array<{
    id: number
    nombre: string
    cantidad: number
    ingresos: number
  }>
}

export function TopProducts({ productos }: TopProductsProps) {
  return (
    <Card>
      <CardHeader className="p-4 xs:p-5 sm:p-6">
        <CardTitle className="text-base xs:text-lg sm:text-xl">Productos Más Vendidos</CardTitle>
        <CardDescription className="text-xs xs:text-sm">Top 5 de la semana</CardDescription>
      </CardHeader>
      <CardContent className="p-4 xs:p-5 sm:p-6 pt-0">
        {productos.length > 0 ? (
          <div className="space-y-3 xs:space-y-4">
            {productos.map((producto, index) => (
              <div key={producto.id} className="flex items-center justify-between gap-2 xs:gap-3">
                <div className="flex items-center gap-2 xs:gap-3 flex-1 min-w-0">
                  <div className="flex items-center justify-center h-7 w-7 xs:h-8 xs:w-8 rounded-lg bg-primary/10 text-primary font-bold text-xs xs:text-sm flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-xs xs:text-sm text-foreground truncate">{producto.nombre}</p>
                    <p className="text-[10px] xs:text-xs text-muted-foreground truncate">
                      {producto.cantidad} unidades
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-semibold text-xs xs:text-sm whitespace-nowrap">
                    ${producto.ingresos.toLocaleString("es-CO")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-6 xs:py-8 text-xs xs:text-sm">
            No hay datos de productos disponibles
          </div>
        )}
      </CardContent>
    </Card>
  )
}
