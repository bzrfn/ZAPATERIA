export type Role = 'ADMIN' | 'SUPERADMIN'

export type User = {
  id: string
  username: string
  password: string // demo local-only
  role: Role
  createdAt: string
}

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

export type ShoeModel = {
  id: string
  codigo: string
  nombre: string
  descripcion?: string
  imageDataUrl?: string
  activo: boolean
  createdAt: string
  updatedAt: string
}

export type OrderLine = {
  numero: string
  color: string
  suela: string
  modelo: string
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

export type CheckEvent = {
  id: string
  empleadoNombre: string
  tipo: 'ENTRADA' | 'SALIDA'
  timestamp: string
  notas?: string
}

export type Session = {
  userId: string | null
  token: string | null
}

export type AppState = {
  version: number
  users: User[]
  session: Session
  supplies: Supply[]
  shoeModels: ShoeModel[]
  orders: Order[]
  checks: CheckEvent[]
}
