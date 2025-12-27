import React, { useMemo, useRef, useState } from 'react'
import { useApp } from '../state/AppContext'
import type { AppState } from '../state/types'
import Modal from '../components/Modal'
import { exportStateAsJSON, importStateFromJSON, clearState } from '../utils/storage'

function downloadTextFile(filename: string, content: string, mime = 'application/json') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()

  URL.revokeObjectURL(url)
}

export default function RespaldoPage() {
  const { state, dispatch } = useApp()

  const fileRef = useRef<HTMLInputElement | null>(null)
  const [importModal, setImportModal] = useState(false)
  const [importText, setImportText] = useState('')
  const [busy, setBusy] = useState(false)

  const meta = useMemo(() => {
    const users = state.users?.length ?? 0
    const supplies = state.supplies?.length ?? 0
    const models = state.shoeModels?.length ?? 0
    const orders = state.orders?.length ?? 0
    const checks = state.checks?.length ?? 0
    return { users, supplies, models, orders, checks }
  }, [state])

  function exportNow() {
    const json = exportStateAsJSON<AppState>(state as any)

    const filename = `zapateria_backup_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`
    downloadTextFile(filename, json)
  }

  function clickPickFile() {
    fileRef.current?.click()
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return

    try {
      setBusy(true)
      const txt = await f.text()
      setImportText(txt)
      setImportModal(true)
    } catch (err: any) {
      console.error(err)
      alert(`No pude leer el archivo: ${err?.message ?? String(err)}`)
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function doRestoreFromText(txt: string) {
    try {
      const parsed = importStateFromJSON<AppState>(txt)

      // ✅ el reducer normaliza y completa campos faltantes
      dispatch({ type: 'STATE_REPLACE', payload: parsed as any })

      setImportModal(false)
      setImportText('')
      alert('✅ Respaldo restaurado correctamente.')
    } catch (err: any) {
      console.error(err)
      alert(`❌ JSON inválido o incompleto: ${err?.message ?? String(err)}`)
    }
  }

  function resetAll() {
    const ok = window.confirm(
      '¿Seguro que quieres borrar TODOS los datos?\n\nTip: antes exporta un respaldo.'
    )
    if (!ok) return

    // Borra localStorage y recarga (o puedes dispatch a un initial state si tienes acción)
    clearState()
    window.location.reload()
  }

  return (
    <div className="card">
      <div className="row" style={{ alignItems: 'center' }}>
        <div className="col">
          <h2>Respaldo y restauración</h2>
          <div className="small">
            Guarda tus datos “para siempre” sin base de datos: exporta un JSON y podrás restaurarlo en cualquier PC/navegador.
          </div>
        </div>

        <div className="actions">
          <button className="btn btn--soft" type="button" onClick={exportNow} disabled={busy}>
            Exportar JSON
          </button>

          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            onChange={onPickFile}
            style={{ display: 'none' }}
          />

          <button className="btn" type="button" onClick={clickPickFile} disabled={busy}>
            Importar JSON
          </button>

          <button className="btn btn--danger" type="button" onClick={resetAll} disabled={busy}>
            Reset total
          </button>
        </div>
      </div>

      <hr className="sep" />

      <div className="backupGrid">
        <div className="backupCard">
          <div className="backupTitle">Contenido actual</div>
          <div className="backupStats">
            <div className="backupStat">
              <div className="backupNum">{meta.users}</div>
              <div className="small">Usuarios</div>
            </div>
            <div className="backupStat">
              <div className="backupNum">{meta.supplies}</div>
              <div className="small">Insumos</div>
            </div>
            <div className="backupStat">
              <div className="backupNum">{meta.models}</div>
              <div className="small">Modelos</div>
            </div>
            <div className="backupStat">
              <div className="backupNum">{meta.orders}</div>
              <div className="small">Pedidos</div>
            </div>
            <div className="backupStat">
              <div className="backupNum">{meta.checks}</div>
              <div className="small">Eventos</div>
            </div>
          </div>

          <div className="small" style={{ marginTop: 10 }}>
            ⚠️ LocalStorage guarda aunque cierres el navegador, pero si se borra cache/datos del sitio o cambias de PC,
            se pierde. Por eso este respaldo es tu “seguro”.
          </div>
        </div>

        <div className="backupCard">
          <div className="backupTitle">Tips</div>
          <ul className="backupList">
            <li>Exporta un JSON cada vez que hagas cambios importantes.</li>
            <li>Guárdalo en Google Drive/OneDrive/USB.</li>
            <li>Para migrar a otra PC: abre la app y usa “Importar JSON”.</li>
          </ul>
        </div>
      </div>

      {/* MODAL IMPORT */}
      <Modal
        title="Restaurar respaldo"
        open={importModal}
        onClose={() => setImportModal(false)}
        footer={
          <>
            <button className="btn btn--ghost" type="button" onClick={() => setImportModal(false)}>
              Cancelar
            </button>
            <button className="btn" type="button" onClick={() => doRestoreFromText(importText)}>
              Restaurar
            </button>
          </>
        }
      >
        <div className="small">
          Pega aquí el JSON o solo confirma si cargaste un archivo. Al restaurar, se reemplaza el estado actual.
        </div>

        <hr className="sep" />

        <textarea
          className="textarea backupTextarea"
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder='Pega aquí el JSON de respaldo...'
        />
      </Modal>
    </div>
  )
}
