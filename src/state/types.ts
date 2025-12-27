/* =========================================================
 * Roles y usuarios
 * ========================================================= */
export type Role = 'ADMIN' | 'SUPERADMIN'

export type User = {
  id: string
  username: string
  password: string // demo local-only
  role: Role
  createdAt: string
}

/* =========================================================
 * Insumos
 * ========================================================= */
export type SupplyKey =
  | 'SUELA_CUERO'
  | 'SUELA_TRACTOR'
  | 'SUELA_RODEO'
  | 'PIEL'
  | 'FORRO'
  | 'RESORTE'
  | 'CLAVOS'
  | 'RESISTOL'
  | 'ACTIVADOR_CORTE'

export type Unit = 'pz' | 'kg' | 'm' | 'lt' | 'par' | 'caja' | 'otro'

export type Supply = {
  id: string
  key: SupplyKey
  nombre: string
  unidad: Unit
  stock: number
  minStock: number
  costoUnitario?: number
  notas?: string
  createdAt: string
  updatedAt: string
}

/* =========================================================
 * Modelos de calzado
 * ========================================================= */
export type ShoeModel = {
  id: string
  codigo: string
  nombre: string
  descripcion?: string
  imageDataUrl?: string
  activo: boolean

  // ✅ NUEVO (ya usado en normalización y UI)
  pares?: number

  createdAt: string
  updatedAt: string
}

/* =========================================================
 * Pedidos
 * ========================================================= */
export type OrderLine = {
  numero: string
  color: string
  suela: string
  modelo: string

  // ✅ NUEVO: control interno de producción
  done?: boolean
}

export type Order = {
  id: string
  folio: string
  textoOriginal: string
  lineas: OrderLine[]
  fechaIngreso: string
  fechaEntregaEstimada: string
  estado: 'REGISTRADO' | 'EN_PRODUCCION' | 'ENTREGADO' | 'CANCELADO'

  // insumos asignados: supplyId -> cantidad
  asignaciones: Record<string, number>

  createdAt: string
  updatedAt: string
}

/* =========================================================
 * Control de personal
 * ========================================================= */
export type CheckEvent = {
  id: string
  empleadoNombre: string
  tipo: 'ENTRADA' | 'SALIDA'
  timestamp: string

  // ✅ Notas del empleado (opcional)
  notas?: string
}

/* =========================================================
 * Sesión
 * ========================================================= */
export type Session = {
  userId: string | null
  token: string | null
}

/* =========================================================
 * Estado global de la app
 * ========================================================= */
export type AppState = {
  // versión de estructura (útil para migraciones futuras)
  version: number

  users: User[]
  session: Session

  supplies: Supply[]
  shoeModels: ShoeModel[]
  orders: Order[]

  // ✅ Control de entradas/salidas con notas
  checks: CheckEvent[]
}
