import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react'
import type { AppState } from './types'
import { reducer, type Action } from './reducer'
import { initialState } from './seed'
import { loadState, saveState } from '../utils/storage'

type Ctx = {
  state: AppState
  dispatch: React.Dispatch<Action>

  // ✅ extra: respaldo manual (para “para siempre” sin BD)
  exportBackup: () => void
  importBackup: (file: File) => Promise<void>
  resetAll: () => void
}

const AppCtx = createContext<Ctx | null>(null)

/** =========================================================
 * ✅ Normalización / Migración:
 * - Evita pantalla en blanco si hay datos viejos en LocalStorage
 * - Asegura campos nuevos: lineas[].done, modelo.pares, etc.
 * ========================================================= */
function normalizeState(raw: any): AppState | null {
  if (!raw || typeof raw !== 'object') return null

  const base = initialState()

  // Si falta algo clave, usa base para no romper
  const next: any = {
    ...base,
    ...raw,
  }

  // --- supplies ---
  if (!Array.isArray(next.supplies)) next.supplies = []

  // --- shoeModels ---
  if (!Array.isArray(next.shoeModels)) next.shoeModels = []
  next.shoeModels = next.shoeModels.map((m: any) => ({
    ...m,
    // ✅ NUEVO: pares en catálogo (si no existe, 0)
    pares: Number.isFinite(Number(m?.pares)) ? Number(m.pares) : 0,
    activo: typeof m?.activo === 'boolean' ? m.activo : true,
  }))

  // --- orders + lineas.done ---
  if (!Array.isArray(next.orders)) next.orders = []
  next.orders = next.orders.map((o: any) => ({
    ...o,
    asignaciones: o?.asignaciones && typeof o.asignaciones === 'object' ? o.asignaciones : {},
    lineas: Array.isArray(o?.lineas)
      ? o.lineas.map((l: any) => ({
          ...l,
          numero: l?.numero ?? '',
          color: l?.color ?? '',
          suela: l?.suela ?? '',
          modelo: l?.modelo ?? '',
          done: !!l?.done, // ✅ asegura boolean
        }))
      : [],
  }))

  return next as AppState
}

// ✅ Init lazy: carga LocalStorage UNA sola vez
function init(): AppState {
  try {
    const persisted = loadState<AppState>()
    const normalized = normalizeState(persisted)
    return normalized ?? initialState()
  } catch (e) {
    console.error('Error cargando estado, usando initialState()', e)
    return initialState()
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined as any, init)

  // ✅ Debounce + idle save (evita freezes)
  const tRef = useRef<number | null>(null)
  const idleRef = useRef<number | null>(null)

  useEffect(() => {
    if (tRef.current) window.clearTimeout(tRef.current)
    if (idleRef.current && 'cancelIdleCallback' in window) {
      ;(window as any).cancelIdleCallback(idleRef.current)
      idleRef.current = null
    }

    tRef.current = window.setTimeout(() => {
      if ('requestIdleCallback' in window) {
        idleRef.current = (window as any).requestIdleCallback(
          () => {
            saveState(state)
          },
          { timeout: 1200 }
        )
      } else {
        saveState(state)
      }
    }, 250)

    return () => {
      if (tRef.current) window.clearTimeout(tRef.current)
      if (idleRef.current && 'cancelIdleCallback' in window) {
        ;(window as any).cancelIdleCallback(idleRef.current)
      }
    }
  }, [state])

  /** =========================================================
   * ✅ Respaldo manual (para “para siempre” sin BD)
   * ========================================================= */
  function exportBackup() {
    try {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `zapateria_backup_${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
      alert('No se pudo exportar respaldo.')
    }
  }

  async function importBackup(file: File) {
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      const normalized = normalizeState(parsed)
      if (!normalized) {
        alert('Respaldo inválido.')
        return
      }

      // ✅ Importar = reemplazar todo el estado
      dispatch({ type: 'STATE_REPLACE', payload: normalized } as any)
      alert('Respaldo importado correctamente.')
    } catch (e) {
      console.error(e)
      alert('No se pudo importar respaldo (archivo inválido).')
    }
  }

  function resetAll() {
    const ok = window.confirm('¿Seguro? Esto borrará datos locales de este navegador.')
    if (!ok) return
    dispatch({ type: 'STATE_REPLACE', payload: initialState() } as any)
    // Opcional: guarda inmediato
    saveState(initialState())
  }

  const value = useMemo(
    () => ({ state, dispatch, exportBackup, importBackup, resetAll }),
    [state]
  )

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}

export function useApp() {
  const ctx = useContext(AppCtx)
  if (!ctx) throw new Error('AppContext missing')
  return ctx
}
