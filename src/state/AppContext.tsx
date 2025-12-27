import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react'
import type { AppState } from './types'
import { reducer, type Action } from './reducer'
import { initialState } from './seed'
import { loadState, saveState } from '../utils/storage'

type Ctx = {
  state: AppState
  dispatch: React.Dispatch<Action>
  exportBackup: () => void
  importBackup: (file: File) => Promise<void>
  resetAll: () => void
}

const AppCtx = createContext<Ctx | null>(null)

function isValidImageDataUrl(x: any) {
  if (typeof x !== 'string') return false
  // ✅ Importante: NO guardamos blob: porque se rompe
  if (x.startsWith('blob:')) return false
  // data:image/... base64
  if (x.startsWith('data:image/')) return true
  // si en algún punto permites URL http(s), también vale:
  if (x.startsWith('http://') || x.startsWith('https://')) return true
  return false
}

function normalizeState(raw: any): AppState | null {
  if (!raw || typeof raw !== 'object') return null

  const base = initialState()

  const next: any = {
    ...base,
    ...raw,
  }

  if (!Array.isArray(next.supplies)) next.supplies = []

  // -------------------------------
  // ✅ shoeModels (CATÁLOGO) robusto
  // -------------------------------
  if (!Array.isArray(next.shoeModels)) next.shoeModels = []
  next.shoeModels = next.shoeModels.map((m: any) => {
    // Soporta respaldos “raros” donde venga con llaves tipo Excel:
    const codigo = (m?.codigo ?? m?.Codigo ?? m?.code ?? '').toString()
    const nombre = (m?.nombre ?? m?.Nombre ?? m?.name ?? '').toString()

    const paresRaw = m?.pares ?? m?.Pares ?? m?.pairs ?? 0
    const pares = Number.isFinite(Number(paresRaw)) ? Number(paresRaw) : 0

    const activoRaw = m?.activo ?? m?.Activo
    const activo =
      typeof activoRaw === 'boolean'
        ? activoRaw
        : typeof activoRaw === 'string'
          ? activoRaw.toLowerCase() === 'sí' || activoRaw.toLowerCase() === 'si' || activoRaw.toLowerCase() === 'true'
          : true

    const image = m?.imageDataUrl ?? m?.imagen ?? m?.Imagen ?? m?.image
    const imageDataUrl = isValidImageDataUrl(image) ? String(image) : undefined

    return {
      ...m,
      codigo,
      nombre,
      pares,
      activo,
      imageDataUrl,
      createdAt: m?.createdAt ?? m?.Creado ?? base.shoeModels?.[0]?.createdAt ?? new Date().toISOString(),
      updatedAt: m?.updatedAt ?? m?.Actualizado ?? m?.createdAt ?? new Date().toISOString(),
    }
  })

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
          done: !!l?.done,
        }))
      : [],
  }))

  // ✅ checks
  if (!Array.isArray(next.checks)) next.checks = []
  next.checks = next.checks.map((c: any) => ({
    ...c,
    id: c?.id ?? (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
    empleadoNombre: String(c?.empleadoNombre ?? ''),
    tipo: c?.tipo === 'SALIDA' ? 'SALIDA' : 'ENTRADA',
    timestamp: String(c?.timestamp ?? new Date().toISOString()),
    notas: typeof c?.notas === 'string' && c.notas.trim() ? c.notas.trim() : undefined,
  }))

  return next as AppState
}

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
          () => saveState(state),
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
