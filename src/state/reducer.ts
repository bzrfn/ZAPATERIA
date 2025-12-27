import { v4 as uuid } from 'uuid'
import type { AppState, CheckEvent, Order, ShoeModel, Supply, User } from './types'
import { nowISO } from '../utils/date'

export type Action =
  | { type: 'LOGIN', username: string, password: string }
  | { type: 'LOGOUT' }
  | { type: 'USER_CREATE', payload: Omit<User, 'id' | 'createdAt'> }
  | { type: 'USER_UPDATE', id: string, payload: Partial<Omit<User, 'id' | 'createdAt'>> }
  | { type: 'USER_DELETE', id: string }
  | { type: 'SUPPLY_CREATE', payload: Omit<Supply, 'id' | 'createdAt' | 'updatedAt'> }
  | { type: 'SUPPLY_UPDATE', id: string, payload: Partial<Omit<Supply, 'id' | 'createdAt' | 'updatedAt'>> }
  | { type: 'SUPPLY_DELETE', id: string }
  | { type: 'SUPPLY_ADJUST', id: string, delta: number }
  | { type: 'MODEL_CREATE', payload: Omit<ShoeModel, 'id' | 'createdAt' | 'updatedAt'> }
  | { type: 'MODEL_UPDATE', id: string, payload: Partial<Omit<ShoeModel, 'id' | 'createdAt' | 'updatedAt'>> }
  | { type: 'MODEL_DELETE', id: string }
  | { type: 'CHECK_ADD', payload: Omit<CheckEvent, 'id'> }
  | { type: 'CHECK_DELETE', id: string }
  | { type: 'ORDER_CREATE', payload: Omit<Order, 'id' | 'createdAt' | 'updatedAt'> }
  | { type: 'ORDER_UPDATE', id: string, payload: Partial<Omit<Order, 'id' | 'createdAt' | 'updatedAt'>> }
  | { type: 'ORDER_DELETE', id: string }
  | { type: 'ORDER_ASSIGN_SUPPLY', orderId: string, supplyId: string, qty: number }
  | { type: 'IMPORT_REPLACE_ALL', payload: AppState }

function sanitizeNumber(n: unknown): number {
  const x = Number(n)
  if (Number.isNaN(x) || !Number.isFinite(x)) return 0
  return x
}

export function reducer(state: AppState, action: Action): AppState {
  const t = nowISO()
  switch (action.type) {
    case 'LOGIN': {
      const u = state.users.find(x => x.username === action.username && x.password === action.password)
      if (!u) return state
      return { ...state, session: { userId: u.id, token: uuid() } }
    }
    case 'LOGOUT':
      return { ...state, session: { userId: null, token: null } }

    case 'USER_CREATE': {
      const exists = state.users.some(u => u.username.toLowerCase() === action.payload.username.toLowerCase())
      if (exists) return state
      return { ...state, users: [{ id: uuid(), createdAt: t, ...action.payload }, ...state.users] }
    }
    case 'USER_UPDATE':
      return {
        ...state,
        users: state.users.map(u => u.id === action.id ? ({ ...u, ...action.payload }) : u),
      }
    case 'USER_DELETE': {
      // avoid deleting current session user
      if (state.session.userId === action.id) return state
      return { ...state, users: state.users.filter(u => u.id !== action.id) }
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
        supplies: state.supplies.map(s => s.id === action.id ? ({ ...s, ...action.payload, updatedAt: t }) : s),
      }
    }
    case 'SUPPLY_DELETE': {
      // avoid deleting supplies referenced by orders
      const used = state.orders.some(o => Object.keys(o.asignaciones).includes(action.id))
      if (used) return state
      return { ...state, supplies: state.supplies.filter(s => s.id !== action.id) }
    }
    case 'SUPPLY_ADJUST': {
      return {
        ...state,
        supplies: state.supplies.map(s => {
          if (s.id !== action.id) return s
          const newStock = Math.max(0, sanitizeNumber(s.stock) + sanitizeNumber(action.delta))
          return { ...s, stock: newStock, updatedAt: t }
        }),
      }
    }

    case 'MODEL_CREATE':
      return { ...state, shoeModels: [{ id: uuid(), createdAt: t, updatedAt: t, ...action.payload }, ...state.shoeModels] }
    case 'MODEL_UPDATE':
      return { ...state, shoeModels: state.shoeModels.map(m => m.id === action.id ? ({ ...m, ...action.payload, updatedAt: t }) : m) }
    case 'MODEL_DELETE': {
      // avoid deleting models referenced in orders
      const used = state.orders.some(o => o.lineas.some(l => l.modelo === state.shoeModels.find(m => m.id === action.id)?.codigo))
      if (used) return state
      return { ...state, shoeModels: state.shoeModels.filter(m => m.id !== action.id) }
    }

    case 'CHECK_ADD':
      return { ...state, checks: [{ id: uuid(), ...action.payload }, ...state.checks] }
    case 'CHECK_DELETE':
      return { ...state, checks: state.checks.filter(c => c.id !== action.id) }

    case 'ORDER_CREATE':
      return { ...state, orders: [{ id: uuid(), createdAt: t, updatedAt: t, ...action.payload }, ...state.orders] }
    case 'ORDER_UPDATE':
      return { ...state, orders: state.orders.map(o => o.id === action.id ? ({ ...o, ...action.payload, updatedAt: t }) : o) }
    case 'ORDER_DELETE':
      return { ...state, orders: state.orders.filter(o => o.id !== action.id) }

    case 'ORDER_ASSIGN_SUPPLY': {
      const { orderId, supplyId, qty } = action
      if (qty < 0) return state
      const order = state.orders.find(o => o.id === orderId)
      const supply = state.supplies.find(s => s.id === supplyId)
      if (!order || !supply) return state

      // If increasing assignment, ensure enough stock (simple validation)
      const current = sanitizeNumber(order.asignaciones[supplyId] ?? 0)
      const desired = sanitizeNumber(qty)
      const delta = desired - current
      if (delta > 0 && supply.stock < delta) return state

      // update supply stock (reserve/consume)
      const newSupplies = state.supplies.map(s => {
        if (s.id !== supplyId) return s
        return { ...s, stock: Math.max(0, s.stock - delta), updatedAt: t }
      })

      const newOrders = state.orders.map(o => {
        if (o.id !== orderId) return o
        return { ...o, asignaciones: { ...o.asignaciones, [supplyId]: desired }, updatedAt: t }
      })

      return { ...state, supplies: newSupplies, orders: newOrders }
    }

    case 'IMPORT_REPLACE_ALL':
      return action.payload

    default:
      return state
  }
}
