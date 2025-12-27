import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { AppState } from '../state/types'
import { TEMPLATE_EXCEL_SHEETS } from '../state/seed'

export function exportExcel(state: AppState) {
  const wb = XLSX.utils.book_new()

  const insumos = state.supplies.map(s => ({
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

  const modelos = state.shoeModels.map(m => ({
    id: m.id,
    codigo: m.codigo,
    nombre: m.nombre,
    descripcion: m.descripcion ?? '',
    imageDataUrl: m.imageDataUrl ?? '',
    activo: m.activo,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(modelos), TEMPLATE_EXCEL_SHEETS.models)

  const pedidos = state.orders.map(o => ({
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

  const personal = state.checks.map(c => ({
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
          const rows = XLSX.utils.sheet_to_json<any>(s1)
          out.supplies = rows.map(r => ({
            id: String(r.id ?? ''),
            key: r.key,
            nombre: r.nombre,
            unidad: r.unidad,
            stock: Number(r.stock ?? 0),
            minStock: Number(r.minStock ?? 0),
            costoUnitario: r.costoUnitario === '' ? undefined : Number(r.costoUnitario),
            notas: r.notas === '' ? undefined : String(r.notas),
            createdAt: String(r.createdAt ?? new Date().toISOString()),
            updatedAt: String(r.updatedAt ?? new Date().toISOString()),
          }))
        }

        const s2 = wb.Sheets[TEMPLATE_EXCEL_SHEETS.models]
        if (s2) {
          const rows = XLSX.utils.sheet_to_json<any>(s2)
          out.shoeModels = rows.map(r => ({
            id: String(r.id ?? ''),
            codigo: String(r.codigo ?? ''),
            nombre: String(r.nombre ?? ''),
            descripcion: r.descripcion === '' ? undefined : String(r.descripcion),
            imageDataUrl: r.imageDataUrl === '' ? undefined : String(r.imageDataUrl),
            activo: Boolean(r.activo),
            createdAt: String(r.createdAt ?? new Date().toISOString()),
            updatedAt: String(r.updatedAt ?? new Date().toISOString()),
          }))
        }

        const s3 = wb.Sheets[TEMPLATE_EXCEL_SHEETS.orders]
        if (s3) {
          const rows = XLSX.utils.sheet_to_json<any>(s3)
          out.orders = rows.map(r => ({
            id: String(r.id ?? ''),
            folio: String(r.folio ?? ''),
            fechaIngreso: String(r.fechaIngreso ?? ''),
            fechaEntregaEstimada: String(r.fechaEntregaEstimada ?? ''),
            estado: r.estado,
            textoOriginal: String(r.textoOriginal ?? ''),
            lineas: safeJson(r.lineas, []),
            asignaciones: safeJson(r.asignaciones, {}),
            createdAt: String(r.createdAt ?? new Date().toISOString()),
            updatedAt: String(r.updatedAt ?? new Date().toISOString()),
          }))
        }

        const s4 = wb.Sheets[TEMPLATE_EXCEL_SHEETS.checks]
        if (s4) {
          const rows = XLSX.utils.sheet_to_json<any>(s4)
          out.checks = rows.map(r => ({
            id: String(r.id ?? ''),
            empleadoNombre: String(r.empleadoNombre ?? ''),
            tipo: r.tipo,
            timestamp: String(r.timestamp ?? new Date().toISOString()),
            notas: r.notas === '' ? undefined : String(r.notas),
          }))
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
    return JSON.parse(raw) as T
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
    body: state.supplies.map(s => [s.nombre, s.unidad, String(s.stock), String(s.minStock)]),
    styles: { fontSize: 10 },
    theme: 'grid',
    margin: { left: 40, right: 40 },
  })

  // Pedidos
  const y2 = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 30 : 140
  doc.setFontSize(14)
  doc.text('Pedidos', 40, y2)
  autoTable(doc, {
    startY: y2 + 10,
    head: [['Folio', 'Ingreso', 'Entrega', 'Estado', 'Líneas']],
    body: state.orders.map(o => [o.folio, o.fechaIngreso, o.fechaEntregaEstimada, o.estado, String(o.lineas.length)]),
    styles: { fontSize: 10 },
    theme: 'grid',
    margin: { left: 40, right: 40 },
  })

  doc.save('zapateria_inventario_export.pdf')
}
