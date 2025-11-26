import { Leaf, MapPin, Clock, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function CatalogHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2 sm:gap-3">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg sm:rounded-xl bg-primary flex items-center justify-center shrink-0">
              <Leaf className="h-5 w-5 sm:h-7 sm:w-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-foreground">AgroShop</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground hidden xs:block">SENA Centro Agropecuario</p>
            </div>
          </Link>

          <div className="hidden lg:flex items-center gap-4 xl:gap-6 text-xs xl:text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 xl:h-4 xl:w-4" />
              <span className="hidden xl:inline">Centro Agropecuario SENA</span>
              <span className="xl:hidden">SENA</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-3.5 w-3.5 xl:h-4 xl:w-4" />
              <span className="hidden xl:inline">Lun - Sáb: 8:00 AM - 6:00 PM</span>
              <span className="xl:hidden">8AM - 6PM</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-3.5 w-3.5 xl:h-4 xl:w-4" />
              <span>+57 300 123 4567</span>
            </div>
          </div>

          <Link href="/login">
            <Button size="sm" className="text-xs sm:text-sm">
              <span className="hidden xs:inline">Iniciar Sesión</span>
              <span className="xs:hidden">Login</span>
            </Button>
          </Link>
        </div>
      </div>
    </header>
  )
}
