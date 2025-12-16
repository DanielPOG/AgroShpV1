"use client"

import type React from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileSpreadsheet, FileText } from "lucide-react"
import type { LucideIcon } from "lucide-react"

interface ReportCardProps {
  title: string
  description: string
  icon: LucideIcon
  onDownloadPDF: () => void
  onDownloadExcel: () => void
  children?: React.ReactNode
}

export function ReportCard({
  title,
  description,
  icon: Icon,
  onDownloadPDF,
  onDownloadExcel,
  children,
}: ReportCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="p-3 sm:p-6">
        <div className="flex flex-col gap-3 sm:gap-4">
          {/* Icon y Título */}
          <div className="flex items-start gap-2 sm:gap-3">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm sm:text-base md:text-lg truncate">{title}</CardTitle>
              <CardDescription className="text-xs sm:text-sm line-clamp-2">{description}</CardDescription>
            </div>
          </div>
          
          {/* Botones de Exportación */}
          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onDownloadPDF}
              className="flex-1 sm:flex-none text-xs sm:text-sm h-8 sm:h-9"
            >
              <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              <span className="hidden xs:inline">PDF</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onDownloadExcel}
              className="flex-1 sm:flex-none text-xs sm:text-sm h-8 sm:h-9"
            >
              <FileSpreadsheet className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              <span className="hidden xs:inline">Excel</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      {children && <CardContent className="p-3 sm:p-6 pt-0">{children}</CardContent>}
    </Card>
  )
}
