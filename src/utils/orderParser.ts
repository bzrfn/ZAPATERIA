import type { OrderLine } from '../state/types'

/**
 * Convierte texto plano de WhatsApp a líneas:
 * - separador principal: "|"
 * - ignora líneas vacías o con menos de 4 columnas
 */
export function parseOrderText(texto: string): OrderLine[] {
  const lines = texto
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)

  const parsed: OrderLine[] = []
  for (const l of lines) {
    // aceptar formatos "a|b|c|d" o "a - b - c - d" (fallback)
    let parts = l.includes('|') ? l.split('|') : l.split('-')
    parts = parts.map(p => p.trim()).filter(Boolean)
    if (parts.length < 4) continue
    const [numero, color, suela, modelo] = parts
    parsed.push({ numero, color, suela, modelo })
  }
  return parsed
}
