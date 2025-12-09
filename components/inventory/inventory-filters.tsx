"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCategoriesSelect } from "@/hooks/use-categories"
import { useUnitsSelect } from "@/hooks/use-units"
import { Filter, X, Search } from "lucide-react"

export interface FilterState {
  search?: string
  categoria_id?: string
  unidad_productiva_id?: string
  tipo_medida?: string
  stock_status?: string
}

interface InventoryFiltersProps {
  onFilterChange: (filters: FilterState) => void
}

export function InventoryFilters({ onFilterChange }: InventoryFiltersProps) {
  const { categories, isLoading: loadingCategories } = useCategoriesSelect()
  const { units, isLoading: loadingUnits } = useUnitsSelect()
  
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    categoria_id: "all",
    unidad_productiva_id: "all",
    tipo_medida: "all",
    stock_status: "all",
  })

  const [searchInput, setSearchInput] = useState("")
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Debounce optimizado para búsqueda - espera 600ms sin escribir
  useEffect(() => {
    // Limpiar timer anterior si existe
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Solo crear nuevo timer si hay cambio real
    debounceTimerRef.current = setTimeout(() => {
      if (searchInput !== filters.search) {
        const newFilters = { ...filters, search: searchInput }
        setFilters(newFilters)
        onFilterChange(newFilters)
      }
    }, 600) // 600ms de espera

    // Cleanup: cancelar timer si el componente se desmonta o searchInput cambia
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [searchInput]) // Solo depende de searchInput

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const clearFilters = () => {
    const defaultFilters: FilterState = {
      search: "",
      categoria_id: "all",
      unidad_productiva_id: "all",
      tipo_medida: "all",
      stock_status: "all",
    }
    setSearchInput("")
    setFilters(defaultFilters)
    onFilterChange(defaultFilters)
  }

  const hasActiveFilters =
    filters.search ||
    (filters.categoria_id && filters.categoria_id !== "all") ||
    (filters.unidad_productiva_id && filters.unidad_productiva_id !== "all") ||
    (filters.tipo_medida && filters.tipo_medida !== "all") ||
    (filters.stock_status && filters.stock_status !== "all")

  return (
    <div className="space-y-3 flex-1 w-full">
      {/* Header con botón limpiar */}
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

      {/* Grid responsive de filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {/* Búsqueda - ocupa 2 columnas en pantallas grandes */}
        <div className="space-y-1.5 sm:col-span-2 xl:col-span-2">
          <label className="text-xs font-medium text-muted-foreground">Buscar</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Nombre o código..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {/* Categoría */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Categoría</label>
          <Select
            value={filters.categoria_id}
            onValueChange={(value) => handleFilterChange("categoria_id", value)}
            disabled={loadingCategories}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id.toString()}>
                  {cat.icono && `${cat.icono} `}
                  {cat.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Unidad Productiva */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Unidad Productiva</label>
          <Select
            value={filters.unidad_productiva_id}
            onValueChange={(value) => handleFilterChange("unidad_productiva_id", value)}
            disabled={loadingUnits}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {units.map((unit) => (
                <SelectItem key={unit.id} value={unit.id.toString()}>
                  {unit.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tipo de Medida */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Tipo</label>
          <Select value={filters.tipo_medida} onValueChange={(value) => handleFilterChange("tipo_medida", value)}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="unidad">Unidad</SelectItem>
              <SelectItem value="peso">Peso</SelectItem>
              <SelectItem value="volumen">Volumen</SelectItem>
              <SelectItem value="lote">Lote</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Estado de Stock */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Estado</label>
          <Select value={filters.stock_status} onValueChange={(value) => handleFilterChange("stock_status", value)}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="disponible">Disponible</SelectItem>
              <SelectItem value="bajo">Bajo Stock</SelectItem>
              <SelectItem value="agotado">Agotado</SelectItem>
              <SelectItem value="sobre_exceso">Sobre Exceso</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Active Filters Pills */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.search && (
            <Badge variant="secondary" className="gap-1">
              Búsqueda: {filters.search}
              <X className="h-3 w-3 cursor-pointer" onClick={() => handleFilterChange("search", "")} />
            </Badge>
          )}
          {filters.categoria_id && filters.categoria_id !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Categoría: {categories.find((c) => c.id.toString() === filters.categoria_id)?.nombre}
              <X className="h-3 w-3 cursor-pointer" onClick={() => handleFilterChange("categoria_id", "all")} />
            </Badge>
          )}
          {filters.unidad_productiva_id && filters.unidad_productiva_id !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Unidad: {units.find((u) => u.id.toString() === filters.unidad_productiva_id)?.nombre}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleFilterChange("unidad_productiva_id", "all")}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
