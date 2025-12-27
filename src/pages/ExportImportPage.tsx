import React, { useRef, useState } from 'react'
import { useApp } from '../state/AppContext'
import { exportExcel, exportPDF, importExcel } from '../utils/exportImport'
import { initialState, TEMPLATE_EXCEL_SHEETS } from '../state/seed'
import type { AppState } from '../state/types'
import { saveState } from '../utils/storage'

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
    const partial = await importExcel(f)

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

    dispatch({ type: 'IMPORT_REPLACE_ALL', payload: merged })
    setMsg('Importación completada. (Se conservaron usuarios y sesión)')
    if (fileRef.current) fileRef.current.value = ''
  }

  function resetDemo() {
    if (!confirm('Esto borrará TODO el inventario/pedidos/personal y volverá al demo inicial. ¿Continuar?')) return
    const seed = initialState()
    // Guardar y forzar refresh de contexto
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
          {msg ? <div style={{ marginTop: 10 }} className="small"><b>{msg}</b></div> : null}
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
