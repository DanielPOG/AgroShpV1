"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { productiveUnits } from "@/lib/mock-data"
import { Filter, X } from "lucide-react"

interface InventoryFiltersProps {
  onFilterChange: (filters: FilterState) => void
}

export interface FilterState {
  category: string
  productiveUnit: string
  type: string
  status: string
}

const categories = ["Todas", "Hortalizas", "Lácteos", "Panadería", "Avícola", "Apícola"]
const types = ["Todos", "Líquido", "Sólido", "Lote"]
const statuses = ["Todos", "Disponible", "Bajo Stock", "Agotado", "Próximo a Vencer"]

export function InventoryFilters({ onFilterChange }: InventoryFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    category: "Todas",
    productiveUnit: "Todas",
    type: "Todos",
    status: "Todos",
  })

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const clearFilters = () => {
    const defaultFilters: FilterState = {
      category: "Todas",
      productiveUnit: "Todas",
      type: "Todos",
      status: "Todos",
    }
    setFilters(defaultFilters)
    onFilterChange(defaultFilters)
  }

  const hasActiveFilters = Object.values(filters).some((value) => value !== "Todas" && value !== "Todos")

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Filtros</h3>
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Limpiar
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Categoría</label>
          <Select value={filters.category} onValueChange={(value) => handleFilterChange("category", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Unidad Productiva</label>
          <Select value={filters.productiveUnit} onValueChange={(value) => handleFilterChange("productiveUnit", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todas">Todas</SelectItem>
              {productiveUnits.map((unit) => (
                <SelectItem key={unit.id} value={unit.id}>
                  {unit.icon} {unit.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Tipo</label>
          <Select value={filters.type} onValueChange={(value) => handleFilterChange("type", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {types.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Estado</label>
          <Select value={filters.status} onValueChange={(value) => handleFilterChange("status", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(filters).map(([key, value]) => {
            if (value !== "Todas" && value !== "Todos") {
              return (
                <Badge key={key} variant="secondary" className="gap-1">
                  {value}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() =>
                      handleFilterChange(
                        key as keyof FilterState,
                        key === "category" || key === "productiveUnit" ? "Todas" : "Todos",
                      )
                    }
                  />
                </Badge>
              )
            }
            return null
          })}
        </div>
      )}
    </div>
  )
}
