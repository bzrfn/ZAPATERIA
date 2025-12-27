import { v4 as uuid } from 'uuid'
import type { AppState, CheckEvent, Order, ShoeModel, Supply, User } from './types'
import { nowISO } from '../utils/date'

export type Action =
  | { type: 'LOGIN'; username: string; password: string }
  | { type: 'LOGOUT' }
  | { type: 'USER_CREATE'; payload: Omit<User, 'id' | 'createdAt'> }
  | { type: 'USER_UPDATE'; id: string; payload: Partial<Omit<User, 'id' | 'createdAt'>> }
  | { type: 'USER_DELETE'; id: string }
  | { type: 'SUPPLY_CREATE'; payload: Omit<Supply, 'id' | 'createdAt' | 'updatedAt'> }
  | { type: 'SUPPLY_UPDATE'; id: string; payload: Partial<Omit<Supply, 'id' | 'createdAt' | 'updatedAt'>> }
  | { type: 'SUPPLY_DELETE'; id: string }
  | { type: 'SUPPLY_ADJUST'; id: string; delta: number }
  | { type: 'MODEL_CREATE'; payload: Omit<ShoeModel, 'id' | 'createdAt' | 'updatedAt'> }
  | { type: 'MODEL_UPDATE'; id: string; payload: Partial<Omit<ShoeModel, 'id' | 'createdAt' | 'updatedAt'>> }
  | { type: 'MODEL_DELETE'; id: string }
  | { type: 'CHECK_ADD'; payload: Omit<CheckEvent, 'id'> }
  | { type: 'CHECK_DELETE'; id: string }
  | { type: 'ORDER_CREATE'; payload: Omit<Order, 'id' | 'createdAt' | 'updatedAt'> }
  | { type: 'ORDER_UPDATE'; id: string; payload: Partial<Omit<Order, 'id' | 'createdAt' | 'updatedAt'>> }
  | { type: 'ORDER_DELETE'; id: string }
  | { type: 'ORDER_ASSIGN_SUPPLY'; orderId: string; supplyId: string; qty: number }
  | { type: 'IMPORT_REPLACE_ALL'; payload: AppState } // compat
  | { type: 'STATE_REPLACE'; payload: AppState } // ✅ nuevo recomendado

function sanitizeNumber(n: unknown): number {
  const x = Number(n)
  if (Number.isNaN(x) || !Number.isFinite(x)) return 0
  return x
}

// ✅ Normaliza para evitar crashes por estados viejos/incompletos
function normalizeAppState(next: any): AppState {
  const safe: any = { ...(next ?? {}) }

  if (!safe.session || typeof safe.session !== 'object') safe.session = { userId: null, token: null }
  if (!Array.isArray(safe.users)) safe.users = []
  if (!Array.isArray(safe.supplies)) safe.supplies = []
  if (!Array.isArray(safe.shoeModels)) safe.shoeModels = []
  if (!Array.isArray(safe.checks)) safe.checks = []
  if (!Array.isArray(safe.orders)) safe.orders = []

  // shoeModels: agrega campo pares si existe en tu tipo (si no existe, no afecta)
  safe.shoeModels = safe.shoeModels.map((m: any) => ({
    ...m,
    activo: typeof m?.activo === 'boolean' ? m.activo : true,
    pares: Number.isFinite(Number(m?.pares)) ? Number(m.pares) : (m?.pares === 0 ? 0 : 0), // default 0
  }))

  // orders: asegura asignaciones y lineas
  safe.orders = safe.orders.map((o: any) => ({
    ...o,
    asignaciones: o?.asignaciones && typeof o.asignaciones === 'object' ? o.asignaciones : {},
    lineas: Array.isArray(o?.lineas)
      ? o.lineas.map((l: any) => ({
          ...l,
          numero: l?.numero ?? '',
          color: l?.color ?? '',
          suela: l?.suela ?? '',
          modelo: l?.modelo ?? '',
          done: !!l?.done, // ✅
        }))
      : [],
  }))

  return safe as AppState
}

export function reducer(state: AppState, action: Action): AppState {
  const t = nowISO()

  switch (action.type) {
    case 'LOGIN': {
      const u = state.users.find((x) => x.username === action.username && x.password === action.password)
      if (!u) return state
      return { ...state, session: { userId: u.id, token: uuid() } }
    }

    case 'LOGOUT':
      return { ...state, session: { userId: null, token: null } }

    case 'USER_CREATE': {
      const exists = state.users.some((u) => u.username.toLowerCase() === action.payload.username.toLowerCase())
      if (exists) return state
      return { ...state, users: [{ id: uuid(), createdAt: t, ...action.payload }, ...state.users] }
    }

    case 'USER_UPDATE':
      return {
        ...state,
        users: state.users.map((u) => (u.id === action.id ? { ...u, ...action.payload } : u)),
      }

    case 'USER_DELETE': {
      if (state.session.userId === action.id) return state
      return { ...state, users: state.users.filter((u) => u.id !== action.id) }
    }

    case 'SUPPLY_CREATE': {
      return {
        ...state,
        supplies: [{ id: uuid(), createdAt: t, updatedAt: t, ...action.payload }, ...state.supplies],
      }
    }

    case 'SUPPLY_UPDATE': {
      return {
        ...state,
        supplies: state.supplies.map((s) => (s.id === action.id ? { ...s, ...action.payload, updatedAt: t } : s)),
      }
    }

    case 'SUPPLY_DELETE': {
      const used = state.orders.some((o) => Object.keys(o.asignaciones ?? {}).includes(action.id))
      if (used) return state
      return { ...state, supplies: state.supplies.filter((s) => s.id !== action.id) }
    }

    case 'SUPPLY_ADJUST': {
      return {
        ...state,
        supplies: state.supplies.map((s) => {
          if (s.id !== action.id) return s
          const newStock = Math.max(0, sanitizeNumber(s.stock) + sanitizeNumber(action.delta))
          return { ...s, stock: newStock, updatedAt: t }
        }),
      }
    }

    case 'MODEL_CREATE':
      return {
        ...state,
        shoeModels: [{ id: uuid(), createdAt: t, updatedAt: t, ...action.payload }, ...state.shoeModels],
      }

    case 'MODEL_UPDATE':
      return {
        ...state,
        shoeModels: state.shoeModels.map((m) => (m.id === action.id ? { ...m, ...action.payload, updatedAt: t } : m)),
      }

    case 'MODEL_DELETE': {
      const targetCode = state.shoeModels.find((m) => m.id === action.id)?.codigo
      const used = !!targetCode && state.orders.some((o) => (o.lineas ?? []).some((l: any) => l?.modelo === targetCode))
      if (used) return state
      return { ...state, shoeModels: state.shoeModels.filter((m) => m.id !== action.id) }
    }

    case 'CHECK_ADD':
      return { ...state, checks: [{ id: uuid(), ...action.payload }, ...state.checks] }

    case 'CHECK_DELETE':
      return { ...state, checks: state.checks.filter((c) => c.id !== action.id) }

    case 'ORDER_CREATE':
      return { ...state, orders: [{ id: uuid(), createdAt: t, updatedAt: t, ...action.payload }, ...state.orders] }

    case 'ORDER_UPDATE':
      return {
        ...state,
        orders: state.orders.map((o) => (o.id === action.id ? { ...o, ...action.payload, updatedAt: t } : o)),
      }

    case 'ORDER_DELETE':
      return { ...state, orders: state.orders.filter((o) => o.id !== action.id) }

    case 'ORDER_ASSIGN_SUPPLY': {
      const { orderId, supplyId, qty } = action
      if (qty < 0) return state

      const order = state.orders.find((o) => o.id === orderId)
      const supply = state.supplies.find((s) => s.id === supplyId)
      if (!order || !supply) return state

      const current = sanitizeNumber(order.asignaciones?.[supplyId] ?? 0)
      const desired = sanitizeNumber(qty)
      const delta = desired - current

      if (delta > 0 && sanitizeNumber(supply.stock) < delta) return state

      const newSupplies = state.supplies.map((s) => {
        if (s.id !== supplyId) return s
        return { ...s, stock: Math.max(0, sanitizeNumber(s.stock) - delta), updatedAt: t }
      })

      const newOrders = state.orders.map((o) => {
        if (o.id !== orderId) return o
        return { ...o, asignaciones: { ...(o.asignaciones ?? {}), [supplyId]: desired }, updatedAt: t }
      })

      return { ...state, supplies: newSupplies, orders: newOrders }
    }

    // ✅ Compat: IMPORT_REPLACE_ALL
    case 'IMPORT_REPLACE_ALL':
      return normalizeAppState(action.payload)

    // ✅ Recomendado: STATE_REPLACE (para backups)
    case 'STATE_REPLACE':
      return normalizeAppState(action.payload)

    default:
      return state
  }
}
