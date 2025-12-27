const KEY = 'zapateria_inventario_state_v1'

export function loadState<T>(): T | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch (e) {
    console.error('loadState error:', e)
    return null
  }
}

export function saveState<T>(state: T) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch (e) {
    console.error('saveState error:', e)
  }
}

export function clearState() {
  try {
    localStorage.removeItem(KEY)
  } catch (e) {
    console.error('clearState error:', e)
  }
}

export function exportStateAsJSON<T>(state: T) {
  return JSON.stringify(state, null, 2)
}

export function importStateFromJSON<T>(json: string): T {
  return JSON.parse(json) as T
}
