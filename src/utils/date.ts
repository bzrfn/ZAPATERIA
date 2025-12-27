export function nowISO() {
  return new Date().toISOString()
}

export function formatDT(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('es-MX', { hour12: true })
}

export function todayISODate() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
