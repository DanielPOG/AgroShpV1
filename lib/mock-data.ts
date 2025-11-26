// Mock data for the application

export interface Product {
  id: string
  name: string
  category: string
  productiveUnit: string
  type: "liquido" | "solido" | "lote"
  stock: number
  price: number
  unit: string
  image: string
  barcode: string
  lowStockThreshold: number
  expirationDate?: string
  status: "disponible" | "bajo-stock" | "agotado" | "proximo-vencer"
}

export interface ProductiveUnit {
  id: string
  name: string
  description: string
  icon: string
}

export interface Movement {
  id: string
  productId: string
  productName: string
  from: string
  to: string
  quantity: number
  date: string
  user: string
  status: "completado" | "pendiente" | "cancelado"
}

export interface Sale {
  id: string
  items: { productId: string; productName: string; quantity: number; price: number }[]
  total: number
  paymentMethod: "efectivo" | "nequi" | "tarjeta" | "mixto"
  date: string
  cashier: string
}

export const productiveUnits: ProductiveUnit[] = [
  { id: "huerta", name: "Huerta Orgánica", description: "Vegetales y hortalizas", icon: "🥬" },
  { id: "lacteos", name: "Lácteos", description: "Productos lácteos", icon: "🥛" },
  { id: "panificacion", name: "Panificación", description: "Pan y productos horneados", icon: "🍞" },
  { id: "avicultura", name: "Avicultura", description: "Huevos y productos avícolas", icon: "🥚" },
  { id: "apicultura", name: "Apicultura", description: "Miel y derivados", icon: "🍯" },
]

export const mockProducts: Product[] = [
  {
    id: "1",
    name: "Tomate Chonto",
    category: "Hortalizas",
    productiveUnit: "huerta",
    type: "solido",
    stock: 45,
    price: 3500,
    unit: "kg",
    image: "/tomate-fresco.jpg",
    barcode: "7891234567890",
    lowStockThreshold: 10,
    status: "disponible",
  },
  {
    id: "2",
    name: "Lechuga Crespa",
    category: "Hortalizas",
    productiveUnit: "huerta",
    type: "solido",
    stock: 8,
    price: 2000,
    unit: "und",
    image: "/lechuga-crespa.jpg",
    barcode: "7891234567891",
    lowStockThreshold: 10,
    status: "bajo-stock",
  },
  {
    id: "3",
    name: "Leche Entera",
    category: "Lácteos",
    productiveUnit: "lacteos",
    type: "liquido",
    stock: 120,
    price: 4500,
    unit: "L",
    image: "/leche-fresca.jpg",
    barcode: "7891234567892",
    lowStockThreshold: 20,
    expirationDate: "2025-12-05",
    status: "proximo-vencer",
  },
  {
    id: "4",
    name: "Pan Integral",
    category: "Panadería",
    productiveUnit: "panificacion",
    type: "solido",
    stock: 30,
    price: 3000,
    unit: "und",
    image: "/pan-integral-artesanal.jpg",
    barcode: "7891234567893",
    lowStockThreshold: 15,
    status: "disponible",
  },
  {
    id: "5",
    name: "Huevos AA",
    category: "Avícola",
    productiveUnit: "avicultura",
    type: "lote",
    stock: 0,
    price: 500,
    unit: "und",
    image: "/huevos-frescos.jpg",
    barcode: "7891234567894",
    lowStockThreshold: 50,
    status: "agotado",
  },
  {
    id: "6",
    name: "Miel de Abeja",
    category: "Apícola",
    productiveUnit: "apicultura",
    type: "liquido",
    stock: 25,
    price: 15000,
    unit: "kg",
    image: "/miel-de-abeja-natural.jpg",
    barcode: "7891234567895",
    lowStockThreshold: 10,
    status: "disponible",
  },
  {
    id: "7",
    name: "Queso Campesino",
    category: "Lácteos",
    productiveUnit: "lacteos",
    type: "solido",
    stock: 18,
    price: 12000,
    unit: "kg",
    image: "/queso-campesino.jpg",
    barcode: "7891234567896",
    lowStockThreshold: 5,
    status: "disponible",
  },
  {
    id: "8",
    name: "Zanahoria",
    category: "Hortalizas",
    productiveUnit: "huerta",
    type: "solido",
    stock: 60,
    price: 2500,
    unit: "kg",
    image: "/zanahoria-fresca.jpg",
    barcode: "7891234567897",
    lowStockThreshold: 15,
    status: "disponible",
  },
]

export const mockMovements: Movement[] = [
  {
    id: "1",
    productId: "1",
    productName: "Tomate Chonto",
    from: "huerta",
    to: "lacteos",
    quantity: 10,
    date: "2025-11-20T10:30:00",
    user: "Juan Inventarista",
    status: "completado",
  },
  {
    id: "2",
    productId: "3",
    productName: "Leche Entera",
    from: "lacteos",
    to: "panificacion",
    quantity: 5,
    date: "2025-11-21T14:15:00",
    user: "Juan Inventarista",
    status: "completado",
  },
]

export const mockSales: Sale[] = [
  {
    id: "1",
    items: [
      { productId: "1", productName: "Tomate Chonto", quantity: 2, price: 3500 },
      { productId: "2", productName: "Lechuga Crespa", quantity: 1, price: 2000 },
    ],
    total: 9000,
    paymentMethod: "efectivo",
    date: "2025-11-25T09:15:00",
    cashier: "María Cajera",
  },
  {
    id: "2",
    items: [{ productId: "6", productName: "Miel de Abeja", quantity: 1, price: 15000 }],
    total: 15000,
    paymentMethod: "nequi",
    date: "2025-11-25T10:30:00",
    cashier: "María Cajera",
  },
]
