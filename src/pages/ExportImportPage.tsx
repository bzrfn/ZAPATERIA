import React, { useRef, useState } from 'react'
import { useApp } from '../state/AppContext'
import { exportExcel, exportPDF, importExcel } from '../utils/exportImport'
import { initialState, TEMPLATE_EXCEL_SHEETS } from '../state/seed'
import type { AppState } from '../state/types'
import { saveState } from '../utils/storage'

function genId() {
  // navegador moderno
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  // fallback simple
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function toBoolActivo(v: any, fallback = true) {
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v !== 0
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase()
    if (['si', 'sí', 'true', '1', 'activo', 'activa', 'yes'].includes(s)) return true
    if (['no', 'false', '0', 'inactivo', 'inactiva'].includes(s)) return false
  }
  return fallback
}

function toNum(v: any, fallback = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function cleanStr(v: any) {
  return (v ?? '').toString().trim()
}

function isValidImageDataUrl(x: any) {
  if (typeof x !== 'string') return false
  if (x.startsWith('blob:')) return false // ⚠️ se rompe al recargar/importar
  if (x.startsWith('data:image/')) return true
  if (x.startsWith('http://') || x.startsWith('https://')) return true
  return false
}

/**
 * ✅ Normaliza lo importado desde Excel a la forma que tu app espera.
 * Especialmente: shoeModels (código/nombre/pares/activo/id)
 */
function normalizeImported(partial: Partial<AppState>): Partial<AppState> {
  const out: Partial<AppState> = { ...partial }

  // --- supplies ---
  if (Array.isArray(partial.supplies)) {
    out.supplies = partial.supplies.map((s: any) => ({
      ...s,
      id: s?.id ?? genId(),
      key: s?.key ?? s?.Key ?? s?.KEY ?? s?.clave ?? s?.Clave,
      nombre: cleanStr(s?.nombre ?? s?.Nombre),
      unidad: s?.unidad ?? s?.Unidad ?? 'pz',
      stock: toNum(s?.stock ?? s?.Stock, 0),
      minStock: toNum(s?.minStock ?? s?.MinStock ?? s?.Minimo, 0),
      costoUnitario: s?.costoUnitario ?? s?.CostoUnitario ?? s?.Costo ?? undefined,
      notas: cleanStr(s?.notas ?? s?.Notas) || undefined,
      createdAt: s?.createdAt ?? s?.Creado ?? new Date().toISOString(),
      updatedAt: s?.updatedAt ?? s?.Actualizado ?? new Date().toISOString(),
    })) as any
  }

  // --- shoeModels (CATÁLOGO) ---
  if (Array.isArray(partial.shoeModels)) {
    out.shoeModels = partial.shoeModels.map((m: any) => {
      const codigo = cleanStr(m?.codigo ?? m?.Codigo ?? m?.CÓDIGO ?? m?.code)
      const nombre = cleanStr(m?.nombre ?? m?.Nombre ?? m?.name)
      const pares = toNum(m?.pares ?? m?.Pares ?? m?.pairs, 0)

      // si viene "Sí/No" o "true/false"
      const activo = toBoolActivo(m?.activo ?? m?.Activo ?? m?.ACTIVO, true)

      // imagen: Excel normalmente no la trae, pero si llegara:
      const image = m?.imageDataUrl ?? m?.Imagen ?? m?.imagen ?? m?.image
      const imageDataUrl = isValidImageDataUrl(image) ? String(image) : undefined

      return {
        ...m,
        id: m?.id ?? genId(),
        codigo,
        nombre,
        pares,
        activo,
        imageDataUrl,
        // conserva descripción si viene
        descripcion: m?.descripcion ?? m?.Descripcion ?? m?.DESCRIPCION ?? m?.Descripción,
        createdAt: m?.createdAt ?? m?.Creado ?? new Date().toISOString(),
        updatedAt: m?.updatedAt ?? m?.Actualizado ?? new Date().toISOString(),
      }
    }) as any
  }

  // --- orders ---
  if (Array.isArray(partial.orders)) {
    out.orders = partial.orders.map((o: any) => ({
      ...o,
      id: o?.id ?? genId(),
      folio: cleanStr(o?.folio ?? o?.Folio),
      textoOriginal: cleanStr(o?.textoOriginal ?? o?.TextoOriginal ?? o?.texto),
      fechaIngreso: o?.fechaIngreso ?? o?.FechaIngreso ?? new Date().toISOString(),
      fechaEntregaEstimada: o?.fechaEntregaEstimada ?? o?.FechaEntregaEstimada ?? new Date().toISOString(),
      estado: o?.estado ?? o?.Estado ?? 'REGISTRADO',
      asignaciones: o?.asignaciones && typeof o.asignaciones === 'object' ? o.asignaciones : {},
      lineas: Array.isArray(o?.lineas)
        ? o.lineas.map((l: any) => ({
            ...l,
            numero: cleanStr(l?.numero ?? l?.Numero),
            color: cleanStr(l?.color ?? l?.Color),
            suela: cleanStr(l?.suela ?? l?.Suela),
            modelo: cleanStr(l?.modelo ?? l?.Modelo),
            done: !!(l?.done ?? l?.Done),
          }))
        : [],
      createdAt: o?.createdAt ?? o?.Creado ?? new Date().toISOString(),
      updatedAt: o?.updatedAt ?? o?.Actualizado ?? new Date().toISOString(),
    })) as any
  }

  // --- checks ---
  if (Array.isArray(partial.checks)) {
    out.checks = partial.checks.map((c: any) => ({
      ...c,
      id: c?.id ?? genId(),
      empleadoNombre: cleanStr(c?.empleadoNombre ?? c?.Empleado ?? c?.empleado),
      tipo: (c?.tipo ?? c?.Tipo) === 'SALIDA' ? 'SALIDA' : 'ENTRADA',
      timestamp: c?.timestamp ?? c?.FechaHora ?? c?.fechaHora ?? new Date().toISOString(),
      notas: cleanStr(c?.notas ?? c?.Notas) || undefined,
    })) as any
  }

  return out
}

export default function ExportImportPage() {
  const { state, dispatch } = useApp()
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  function exportX() {
    exportExcel(state)
  }
  function exportP() {
    exportPDF(state)
  }

  async function importX() {
    const f = fileRef.current?.files?.[0]
    if (!f) return

    const partialRaw = await importExcel(f)
    const partial = normalizeImported(partialRaw)

    // merge to keep users/session
    const merged: AppState = {
      ...state,
      supplies: partial.supplies ?? state.supplies,
      shoeModels: partial.shoeModels ?? state.shoeModels,
      orders: partial.orders ?? state.orders,
      checks: partial.checks ?? state.checks,
      version: state.version,
      session: state.session,
      users: state.users,
    }

    // ✅ IMPORT_REPLACE_ALL ya pasa por normalizeAppState del reducer,
    // pero aquí ya garantizamos que catálogo llegue bien (codigo/nombre/pares/activo/id).
    dispatch({ type: 'IMPORT_REPLACE_ALL', payload: merged })

    setMsg('Importación completada. (Se conservaron usuarios y sesión)')
    if (fileRef.current) fileRef.current.value = ''
  }

  function resetDemo() {
    if (!confirm('Esto borrará TODO el inventario/pedidos/personal y volverá al demo inicial. ¿Continuar?')) return
    const seed = initialState()
    saveState(seed)
    location.reload()
  }

  return (
    <div className="card">
      <h2>Exportar / Importar</h2>
      <div className="small">
        Exporta a PDF/Excel, e importa desde Excel (misma estructura de hojas).
        <br />
        Hojas esperadas: <b>{Object.values(TEMPLATE_EXCEL_SHEETS).join(', ')}</b>
      </div>

      <hr className="sep" />

      <div className="actions">
        <button className="btn" onClick={exportP}>Exportar PDF</button>
        <button className="btn" onClick={exportX}>Exportar Excel</button>
      </div>

      <hr className="sep" />

      <div className="row">
        <div className="col">
          <div className="field">
            <div className="label">Importar desde Excel</div>
            <input ref={fileRef} className="input" type="file" accept=".xlsx,.xls" />
          </div>
          <button className="btn" onClick={importX}>Importar</button>
          {msg ? (
            <div style={{ marginTop: 10 }} className="small">
              <b>{msg}</b>
            </div>
          ) : null}
        </div>

        <div className="col">
          <div className="card" style={{ background: 'rgba(0,0,0,0.02)', borderStyle: 'dashed', boxShadow: 'none' }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Nota</div>
            <div className="small">
              La importación reemplaza: insumos, modelos, pedidos y personal.
              Usuarios y sesión no se tocan (por seguridad).
            </div>
          </div>
        </div>
      </div>

      <hr className="sep" />

      <div className="actions">
        <button className="btn btn--danger" onClick={resetDemo}>Restablecer demo</button>
      </div>
    </div>
  )
}
