import { v4 as uuid } from 'uuid'
import type { AppState, Supply, ShoeModel, SupplyKey } from './types'
import { nowISO, todayISODate } from '../utils/date'

const supplySeed: Array<{ key: SupplyKey, nombre: string, unidad: Supply['unidad'] }> = [
  { key: 'SUELA_CUERO', nombre: 'Suelas de cuero', unidad: 'par' },
  { key: 'SUELA_TRACTOR', nombre: 'Suelas de tractor', unidad: 'par' },
  { key: 'SUELA_RODEO', nombre: 'Suelas de rodeo', unidad: 'par' },
  { key: 'PIEL', nombre: 'Piel', unidad: 'm' },
  { key: 'FORRO', nombre: 'Forro', unidad: 'm' },
  { key: 'RESORTE', nombre: 'Resorte', unidad: 'pz' },
  { key: 'CLAVOS', nombre: 'Clavos', unidad: 'caja' },
  { key: 'RESISTOL', nombre: 'Resistol', unidad: 'lt' },
  { key: 'ACTIVADOR_CORTE', nombre: 'Activador de corte', unidad: 'lt' },
]

function createSupplies(): Supply[] {
  const t = nowISO()
  return supplySeed.map(s => ({
    id: uuid(),
    key: s.key,
    nombre: s.nombre,
    unidad: s.unidad,
    stock: 0,
    minStock: 0,
    createdAt: t,
    updatedAt: t,
  }))
}

function createModels(): ShoeModel[] {
  const t = nowISO()
  const models: ShoeModel[] = []
  for (let i = 1; i <= 40; i++) {
    models.push({
      id: uuid(),
      codigo: `MOD-${String(i).padStart(2, '0')}`,
      nombre: `Modelo ${i}`,
      descripcion: '',
      activo: true,
      createdAt: t,
      updatedAt: t,
    })
  }
  return models
}

export function initialState(): AppState {
  const t = nowISO()
  return {
    version: 1,
    users: [
      { id: uuid(), username: 'superadmin', password: 'superadmin123', role: 'SUPERADMIN', createdAt: t },
      { id: uuid(), username: 'admin', password: 'admin123', role: 'ADMIN', createdAt: t },
    ],
    session: { userId: null, token: null },
    supplies: createSupplies(),
    shoeModels: createModels(),
    orders: [],
    checks: [],
  }
}

export const TEMPLATE_EXCEL_SHEETS = {
  supplies: 'Insumos',
  models: 'Modelos',
  orders: 'Pedidos',
  checks: 'Personal',
} as const

export const TEMPLATE_HINT = `Formato sugerido para pegar pedido (una línea por item):
numero | color | suela | modelo

Ejemplo:
12 | café | suela de cuero | MOD-01
13 | negro | suela tractor | MOD-02
`

export function defaultOrderText() {
  const d = todayISODate()
  return `Pedido WhatsApp — ${d}

12 | café | suela de cuero | MOD-01
13 | negro | suela tractor | MOD-02
`
}
