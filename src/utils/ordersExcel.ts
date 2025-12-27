import * as XLSX from 'xlsx'
import type { OrderLine } from '../state/types'

type Row = {
  folio?: string
  fechaIngreso?: string
  fechaEntregaEstimada?: string
  numero?: string
  color?: string
  suela?: string
  modelo?: string
}

export type ImportedOrder = {
  folio: string
  fechaIngreso: string
  fechaEntregaEstimada: string
  lineas: OrderLine[]
  textoOriginal: string
}

function norm(s: any) {
  return String(s ?? '').trim()
}

function excelDateToISODate(v: any): string {
  // if already YYYY-MM-DD, keep it
  const s = norm(v)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  // try parse as date
  const d = new Date(v)
  if (!Number.isNaN(d.getTime())) {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }
  return s || new Date().toISOString().slice(0, 10)
}

export async function importOrdersFromExcel(file: File): Promise<ImportedOrder[]> {
  const data = await file.arrayBuffer()
  const wb = XLSX.read(data, { type: 'array' })
  const sheetName = wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<any>(ws)

  // expected columns (case-insensitive):
  // folio, fechaIngreso, fechaEntregaEstimada, numero, color, suela, modelo
  const parsed: Row[] = rows.map((r) => {
    const map: any = {}
    for (const k of Object.keys(r)) map[String(k).toLowerCase()] = r[k]
    return {
      folio: map['folio'] ?? map['pedido'] ?? map['orden'],
      fechaIngreso: map['fechaingreso'] ?? map['fecha_ingreso'] ?? map['ingreso'],
      fechaEntregaEstimada: map['fechaentregaestimada'] ?? map['fecha_entrega'] ?? map['entrega'],
      numero: map['numero'] ?? map['número'] ?? map['num'],
      color: map['color'],
      suela: map['suela'],
      modelo: map['modelo'],
    }
  })

  const groups = new Map<string, ImportedOrder>()
  const fallbackFolio = `PED-IMP-${Date.now()}`
  for (const r of parsed) {
    const folio = norm(r.folio) || fallbackFolio
    const fechaIngreso = excelDateToISODate(r.fechaIngreso)
    const fechaEntregaEstimada = excelDateToISODate(r.fechaEntregaEstimada)
    const line: OrderLine = {
      numero: norm(r.numero),
      color: norm(r.color),
      suela: norm(r.suela),
      modelo: norm(r.modelo),
    }
    if (!line.numero && !line.color && !line.suela && !line.modelo) continue

    if (!groups.has(folio)) {
      groups.set(folio, {
        folio,
        fechaIngreso,
        fechaEntregaEstimada,
        lineas: [],
        textoOriginal: `Importado desde Excel (${file.name})`,
      })
    }
    groups.get(folio)!.lineas.push(line)
    // keep latest dates if provided
    if (norm(r.fechaIngreso)) groups.get(folio)!.fechaIngreso = fechaIngreso
    if (norm(r.fechaEntregaEstimada)) groups.get(folio)!.fechaEntregaEstimada = fechaEntregaEstimada
  }

  return Array.from(groups.values())
}
