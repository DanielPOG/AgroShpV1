"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Scan, Search } from "lucide-react"

interface BarcodeScannerProps {
  onScan: (barcode: string) => void
  autoFocus?: boolean
}

export function BarcodeScanner({ onScan, autoFocus = true }: BarcodeScannerProps) {
  const [barcode, setBarcode] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (barcode.trim()) {
      onScan(barcode.trim())
      setBarcode("")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit(e)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Label htmlFor="barcode" className="text-sm font-medium">
        Escáner de Código de Barras
      </Label>
      <div className="relative">
        <Scan className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
        <Input
          ref={inputRef}
          id="barcode"
          type="text"
          placeholder="Escanea o ingresa código de barras..."
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          onKeyDown={handleKeyDown}
          className="pl-10 pr-10 h-14 text-lg font-mono bg-secondary/50 border-2 border-primary/20 focus:border-primary"
        />
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-xs text-muted-foreground">
        Presiona <kbd className="px-1.5 py-0.5 rounded bg-muted border">Enter</kbd> para buscar o{" "}
        <kbd className="px-1.5 py-0.5 rounded bg-muted border">F2</kbd> para búsqueda manual
      </p>
    </form>
  )
}
