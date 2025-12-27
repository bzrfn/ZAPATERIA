const KEY = 'zapateria_inventario_state_v1'

export function loadState<T>(): T | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function saveState<T>(state: T) {
  localStorage.setItem(KEY, JSON.stringify(state))
}

export function exportStateAsJSON<T>(state: T) {
  return JSON.stringify(state, null, 2)
}

export function importStateFromJSON<T>(json: string): T {
  return JSON.parse(json) as T
}
