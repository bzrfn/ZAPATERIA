import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react'
import type { AppState } from './types'
import { reducer, type Action } from './reducer'
import { initialState } from './seed'
import { loadState, saveState } from '../utils/storage'

type Ctx = {
  state: AppState
  dispatch: React.Dispatch<Action>
}

const AppCtx = createContext<Ctx | null>(null)

// ✅ Init lazy: carga LocalStorage UNA sola vez (no en cada render)
function init(): AppState {
  const persisted = loadState<AppState>()
  return persisted ?? initialState()
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined as any, init)

  // ✅ Debounce + idle save (evita freezes/parpadeos)
  const tRef = useRef<number | null>(null)
  const idleRef = useRef<number | null>(null)

  useEffect(() => {
    // limpia timers previos
    if (tRef.current) window.clearTimeout(tRef.current)
    if (idleRef.current && 'cancelIdleCallback' in window) {
      ;(window as any).cancelIdleCallback(idleRef.current)
      idleRef.current = null
    }

    // debounce: espera un poquito antes de guardar
    tRef.current = window.setTimeout(() => {
      // si existe requestIdleCallback, guarda cuando el browser esté libre
      if ('requestIdleCallback' in window) {
        idleRef.current = (window as any).requestIdleCallback(() => {
          saveState(state)
        }, { timeout: 1200 })
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

  const value = useMemo(() => ({ state, dispatch }), [state])

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}

export function useApp() {
  const ctx = useContext(AppCtx)
  if (!ctx) throw new Error('AppContext missing')
  return ctx
}
