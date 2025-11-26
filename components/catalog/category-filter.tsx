"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sparkles } from "lucide-react"

interface CategoryFilterProps {
  categories: string[]
  activeCategory: string
  onSelectCategory: (category: string) => void
}

export function CategoryFilter({ categories, activeCategory, onSelectCategory }: CategoryFilterProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <p className="text-sm font-medium text-muted-foreground">Filtrar por categoría:</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant={activeCategory === "Todas" ? "default" : "outline"}
          onClick={() => onSelectCategory("Todas")}
          className={`rounded-full transition-all duration-300 hover:scale-105 ${
            activeCategory === "Todas"
              ? "bg-gradient-to-r from-primary to-chart-4 shadow-lg animate-pulse-glow"
              : "hover:border-primary/50"
          }`}
        >
          Todas
          <Badge variant="secondary" className="ml-2 bg-white/20 text-white">
            {categories.length}
          </Badge>
        </Button>
        {categories.map((category, index) => (
          <Button
            key={category}
            variant={activeCategory === category ? "default" : "outline"}
            onClick={() => onSelectCategory(category)}
            className={`rounded-full transition-all duration-300 hover:scale-105 animate-slide-up ${
              activeCategory === category
                ? "bg-gradient-to-r from-primary to-chart-4 shadow-lg"
                : "hover:border-primary/50"
            }`}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            {category}
          </Button>
        ))}
      </div>
    </div>
  )
}
