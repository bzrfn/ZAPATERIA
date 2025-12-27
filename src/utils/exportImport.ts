import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { AppState } from '../state/types'
import { TEMPLATE_EXCEL_SHEETS } from '../state/seed'

function genId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function toNum(v: any, fallback = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function toBoolExcel(v: any, fallback = true) {
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v !== 0
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase()
    if (['si', 'sí', 'true', '1', 'yes', 'y', 'activo'].includes(s)) return true
    if (['no', 'false', '0', 'n', 'inactivo'].includes(s)) return false
  }
  return fallback
}

function cleanStr(v: any) {
  return (v ?? '').toString().trim()
}

function isValidImageDataUrl(x: any) {
  if (typeof x !== 'string') return false
  if (!x.trim()) return false
  // ⚠️ blob: se rompe al importar/recargar
  if (x.startsWith('blob:')) return false
  if (x.startsWith('data:image/')) return true
  if (x.startsWith('http://') || x.startsWith('https://')) return true
  return false
}

export function exportExcel(state: AppState) {
  const wb = XLSX.utils.book_new()

  const insumos = state.supplies.map((s) => ({
    id: s.id,
    key: s.key,
    nombre: s.nombre,
    unidad: s.unidad,
    stock: s.stock,
    minStock: s.minStock,
    costoUnitario: s.costoUnitario ?? '',
    notas: s.notas ?? '',
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(insumos), TEMPLATE_EXCEL_SHEETS.supplies)

  // ✅ MODELOS: incluye pares
  const modelos = state.shoeModels.map((m: any) => ({
    id: m.id,
    codigo: m.codigo,
    nombre: m.nombre,
    descripcion: m.descripcion ?? '',
    pares: Number.isFinite(Number(m.pares)) ? Number(m.pares) : 0, // ✅ nuevo
    activo: m.activo ? 'Sí' : 'No', // ✅ export amigable para Excel
    imageDataUrl: m.imageDataUrl ?? '',
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(modelos), TEMPLATE_EXCEL_SHEETS.models)

  const pedidos = state.orders.map((o) => ({
    id: o.id,
    folio: o.folio,
    fechaIngreso: o.fechaIngreso,
    fechaEntregaEstimada: o.fechaEntregaEstimada,
    estado: o.estado,
    textoOriginal: o.textoOriginal,
    lineas: JSON.stringify(o.lineas),
    asignaciones: JSON.stringify(o.asignaciones),
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pedidos), TEMPLATE_EXCEL_SHEETS.orders)

  const personal = state.checks.map((c) => ({
    id: c.id,
    empleadoNombre: c.empleadoNombre,
    tipo: c.tipo,
    timestamp: c.timestamp,
    notas: c.notas ?? '',
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(personal), TEMPLATE_EXCEL_SHEETS.checks)

  XLSX.writeFile(wb, 'zapateria_inventario_export.xlsx')
}

export function importExcel(file: File): Promise<Partial<AppState>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = new Uint8Array(reader.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })

        const out: Partial<AppState> = {}

        const s1 = wb.Sheets[TEMPLATE_EXCEL_SHEETS.supplies]
        if (s1) {
          const rows = XLSX.utils.sheet_to_json<any>(s1, { defval: '' })
          out.supplies = rows.map((r) => {
            const id = cleanStr(r.id) || genId()
            return {
              id,
              key: r.key ?? r.Key ?? r.KEY,
              nombre: cleanStr(r.nombre ?? r.Nombre),
              unidad: r.unidad ?? r.Unidad ?? 'pz',
              stock: Math.max(0, toNum(r.stock ?? r.Stock, 0)),
              minStock: Math.max(0, toNum(r.minStock ?? r.MinStock ?? r.Minimo, 0)),
              costoUnitario: cleanStr(r.costoUnitario) === '' ? undefined : toNum(r.costoUnitario, 0),
              notas: cleanStr(r.notas) === '' ? undefined : cleanStr(r.notas),
              createdAt: cleanStr(r.createdAt) || new Date().toISOString(),
              updatedAt: cleanStr(r.updatedAt) || new Date().toISOString(),
            }
          }) as any
        }

        const s2 = wb.Sheets[TEMPLATE_EXCEL_SHEETS.models]
        if (s2) {
          const rows = XLSX.utils.sheet_to_json<any>(s2, { defval: '' })

          out.shoeModels = rows.map((r) => {
            const id = cleanStr(r.id) || genId()

            const codigo = cleanStr(r.codigo ?? r.Codigo ?? r['Código'] ?? r['CÓDIGO'])
            const nombre = cleanStr(r.nombre ?? r.Nombre)
            const descripcion = cleanStr(r.descripcion ?? r.Descripcion ?? r['Descripción']) || undefined

            // ✅ pares (nuevo)
            const pares = Math.max(0, toNum(r.pares ?? r.Pares ?? r.pairs, 0))

            // ✅ activo (Sí/No, true/false, 1/0)
            const activo = toBoolExcel(r.activo ?? r.Activo ?? r.ACTIVO, true)

            // ✅ imagen estable (no blob:)
            const imgRaw = cleanStr(r.imageDataUrl ?? r.imagen ?? r.Imagen ?? r.image)
            const imageDataUrl = isValidImageDataUrl(imgRaw) ? imgRaw : undefined

            return {
              id,
              codigo,
              nombre,
              descripcion,
              pares,
              activo,
              imageDataUrl,
              createdAt: cleanStr(r.createdAt) || new Date().toISOString(),
              updatedAt: cleanStr(r.updatedAt) || new Date().toISOString(),
            }
          }) as any
        }

        const s3 = wb.Sheets[TEMPLATE_EXCEL_SHEETS.orders]
        if (s3) {
          const rows = XLSX.utils.sheet_to_json<any>(s3, { defval: '' })
          out.orders = rows.map((r) => {
            const id = cleanStr(r.id) || genId()
            return {
              id,
              folio: cleanStr(r.folio),
              fechaIngreso: cleanStr(r.fechaIngreso),
              fechaEntregaEstimada: cleanStr(r.fechaEntregaEstimada),
              estado: r.estado,
              textoOriginal: cleanStr(r.textoOriginal),
              lineas: safeJson(r.lineas, []),
              asignaciones: safeJson(r.asignaciones, {}),
              createdAt: cleanStr(r.createdAt) || new Date().toISOString(),
              updatedAt: cleanStr(r.updatedAt) || new Date().toISOString(),
            }
          }) as any
        }

        const s4 = wb.Sheets[TEMPLATE_EXCEL_SHEETS.checks]
        if (s4) {
          const rows = XLSX.utils.sheet_to_json<any>(s4, { defval: '' })
          out.checks = rows.map((r) => {
            const id = cleanStr(r.id) || genId()
            return {
              id,
              empleadoNombre: cleanStr(r.empleadoNombre ?? r.Empleado ?? r.empleado),
              tipo: (r.tipo ?? r.Tipo) === 'SALIDA' ? 'SALIDA' : 'ENTRADA',
              timestamp: cleanStr(r.timestamp) || new Date().toISOString(),
              notas: cleanStr(r.notas) === '' ? undefined : cleanStr(r.notas),
            }
          }) as any
        }

        resolve(out)
      } catch (e) {
        reject(e)
      }
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(file)
  })
}

function safeJson<T>(raw: any, fallback: T): T {
  try {
    if (!raw) return fallback
    if (typeof raw !== 'string') return raw as T
    const s = raw.trim()
    if (!s) return fallback
    return JSON.parse(s) as T
  } catch {
    return fallback
  }
}

export function exportPDF(state: AppState) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const title = 'Gestor Zapatería — Exportación'
  doc.setFontSize(16)
  doc.text(title, 40, 40)

  doc.setFontSize(12)
  doc.text(`Fecha: ${new Date().toLocaleString('es-MX')}`, 40, 60)

  // Insumos
  doc.setFontSize(14)
  doc.text('Insumos', 40, 90)
  autoTable(doc, {
    startY: 100,
    head: [['Nombre', 'Unidad', 'Stock', 'Mínimo']],
    body: state.supplies.map((s) => [s.nombre, s.unidad, String(s.stock), String(s.minStock)]),
    styles: { fontSize: 10 },
    theme: 'grid',
    margin: { left: 40, right: 40 },
  })

  // ✅ Modelos (incluye Pares y Activo)
  const yModels = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 30 : 140
  doc.setFontSize(14)
  doc.text('Catálogo de modelos', 40, yModels)
  autoTable(doc, {
    startY: yModels + 10,
    head: [['Código', 'Nombre', 'Pares', 'Activo']],
    body: (state.shoeModels as any[]).map((m) => [
      m.codigo ?? '',
      m.nombre ?? '',
      String(Number.isFinite(Number(m.pares)) ? Number(m.pares) : 0),
      m.activo ? 'Sí' : 'No',
    ]),
    styles: { fontSize: 10 },
    theme: 'grid',
    margin: { left: 40, right: 40 },
  })

  // Pedidos
  const y2 = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 30 : yModels + 120
  doc.setFontSize(14)
  doc.text('Pedidos', 40, y2)
  autoTable(doc, {
    startY: y2 + 10,
    head: [['Folio', 'Ingreso', 'Entrega', 'Estado', 'Líneas']],
    body: state.orders.map((o) => [o.folio, o.fechaIngreso, o.fechaEntregaEstimada, o.estado, String(o.lineas.length)]),
    styles: { fontSize: 10 },
    theme: 'grid',
    margin: { left: 40, right: 40 },
  })

  doc.save('zapateria_inventario_export.pdf')
}
