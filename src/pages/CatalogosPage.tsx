import React, { useEffect, useMemo, useRef, useState } from 'react'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import { useApp } from '../state/AppContext'
import type { ShoeModel } from '../state/types'
import { fileToDataUrl } from '../utils/file'

import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

type Preview = { src: string; title: string } | null
type ModalMode = { open: boolean; editId: string | null }
type ActiveFilter = 'ALL' | 'ACTIVE' | 'INACTIVE'

function formatYesNo(v: boolean) {
  return v ? 'Sí' : 'No'
}

function safeNum(v: any, fallback = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function isValidImageDataUrl(x: any) {
  if (typeof x !== 'string') return false
  // ⚠️ blob: se rompe al recargar/importar respaldo
  if (x.startsWith('blob:')) return false
  if (x.startsWith('data:image/')) return true
  if (x.startsWith('http://') || x.startsWith('https://')) return true
  return false
}

export default function CatalogosPage() {
  const { state, dispatch } = useApp()

  // filtros / búsqueda
  const [q, setQ] = useState('')
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('ALL')

  // paginación
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)

  // UI
  const [preview, setPreview] = useState<Preview>(null)

  // modal
  const [modal, setModal] = useState<ModalMode>({ open: false, editId: null })

  // lock anti doble apertura
  const isOpeningRef = useRef(false)

  // ✅ inputs pares (para no “pelear” con el render)
  const [pairsDraft, setPairsDraft] = useState<Record<string, string>>({})

  const editModel = useMemo(() => {
    if (!modal.editId) return null
    return state.shoeModels.find((m) => m.id === modal.editId) ?? null
  }, [modal.editId, state.shoeModels])

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()

    return state.shoeModels.filter((m) => {
      const codigo = (m.codigo ?? '').toLowerCase()
      const nombre = (m.nombre ?? '').toLowerCase()

      const byText = !qq || codigo.includes(qq) || nombre.includes(qq)

      const byActive =
        activeFilter === 'ALL' ||
        (activeFilter === 'ACTIVE' && !!m.activo) ||
        (activeFilter === 'INACTIVE' && !m.activo)

      return byText && byActive
    })
  }, [state.shoeModels, q, activeFilter])

  // reset page cuando cambien filtros
  useEffect(() => {
    setPage(1)
  }, [q, activeFilter, pageSize])

  // paginado
  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, safePage, pageSize])

  function openCreate() {
    if (isOpeningRef.current) return
    isOpeningRef.current = true
    setModal({ open: true, editId: null })
    queueMicrotask(() => (isOpeningRef.current = false))
  }

  function openEdit(id: string) {
    if (isOpeningRef.current) return
    isOpeningRef.current = true
    setModal({ open: true, editId: id })
    queueMicrotask(() => (isOpeningRef.current = false))
  }

  function closeModal() {
    setModal((m) => ({ ...m, open: false }))
  }

  function del(id: string) {
    const ok = window.confirm('¿Eliminar modelo? (No se permite si está usado en pedidos)')
    if (!ok) return
    dispatch({ type: 'MODEL_DELETE', id })
  }

  // ✅ Actualiza “Pares” por modelo (dispatch al perder foco / Enter)
  function commitPairs(modelId: string, value: string) {
    const next = Math.max(0, safeNum(value, 0))

    dispatch({
      type: 'MODEL_UPDATE',
      id: modelId,
      payload: {
        pares: next,
      } as any,
    })
  }

  // export (SIN imagen) + incluye Pares
  const exportRows = useMemo(() => {
    return filtered.map((m) => ({
      Codigo: m.codigo ?? '',
      Nombre: m.nombre ?? '',
      Descripcion: (m as any).descripcion ?? '',
      Activo: formatYesNo(!!m.activo),
      Pares: safeNum((m as any).pares ?? 0, 0),
      Creado: (m as any).createdAt ?? '',
      Actualizado: (m as any).updatedAt ?? '',
    }))
  }, [filtered])

  function exportExcel() {
    const ws = XLSX.utils.json_to_sheet(exportRows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Modelos')
    XLSX.writeFile(wb, `catalogo_modelos_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  function exportPDF() {
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(14)
    doc.text('Catálogo de modelos (sin imágenes)', 14, 12)

    autoTable(doc, {
      startY: 18,
      head: [['Código', 'Nombre', 'Descripción', 'Activo', 'Pares', 'Creado', 'Actualizado']],
      body: exportRows.map((r) => [r.Codigo, r.Nombre, r.Descripcion, r.Activo, String(r.Pares), r.Creado, r.Actualizado]),
      styles: { fontSize: 9 },
      headStyles: { fontStyle: 'bold' },
      margin: { left: 12, right: 12 },
    })

    doc.save(`catalogo_modelos_${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  return (
    <div className="card">
      {/* HEADER */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h2>Catálogo de modelos</h2>
          <div className="small">Búsqueda + filtro activo + paginación + export (Excel/PDF sin imágenes).</div>
        </div>

        <div className="actions">
          <button className="btn btn--soft" type="button" onClick={exportExcel}>
            Exportar Excel
          </button>
          <button className="btn btn--soft" type="button" onClick={exportPDF}>
            Exportar PDF
          </button>
          <button className="btn" type="button" onClick={openCreate}>
            Nuevo modelo
          </button>
        </div>
      </div>

      <hr className="sep" />

      {/* FILTROS */}
      <div className="row" style={{ alignItems: 'end' }}>
        <div className="col">
          <div className="field">
            <div className="label">Buscar (código o nombre)</div>
            <input className="input" placeholder="Ej: MOD-01 / Rodeo / Bota…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>

        <div className="col" style={{ minWidth: 240 }}>
          <div className="field">
            <div className="label">Activo</div>
            <select className="select" value={activeFilter} onChange={(e) => setActiveFilter(e.target.value as ActiveFilter)}>
              <option value="ALL">Todos</option>
              <option value="ACTIVE">Solo activos</option>
              <option value="INACTIVE">Solo inactivos</option>
            </select>
          </div>
        </div>

        <div className="col" style={{ minWidth: 220 }}>
          <div className="field">
            <div className="label">Por página</div>
            <select className="select" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={20}>20</option>
            </select>
          </div>
        </div>
      </div>

      {/* META + PAGINACIÓN TOP */}
      <div className="actions" style={{ justifyContent: 'space-between' }}>
        <div className="small">
          Mostrando <b>{pageItems.length}</b> de <b>{total}</b> resultados
        </div>

        <div className="actions">
          <button className="btn btn--ghost" type="button" onClick={() => setPage(1)} disabled={safePage === 1}>
            « Primero
          </button>
          <button className="btn btn--ghost" type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}>
            ‹ Anterior
          </button>

          <span className="badge badge--neutral">
            Página {safePage} / {totalPages}
          </span>

          <button
            className="btn btn--ghost"
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
          >
            Siguiente ›
          </button>
          <button className="btn btn--ghost" type="button" onClick={() => setPage(totalPages)} disabled={safePage === totalPages}>
            Último »
          </button>
        </div>
      </div>

      <hr className="sep" />

      {/* TABLA */}
      <div style={{ overflowX: 'auto' }}>
        <table className="table table--catalog">
          <thead>
            <tr>
              <th style={{ width: 200 }}>Imagen</th>
              <th style={{ width: 160 }}>Código</th>
              <th>Nombre</th>
              <th className="thPares">Pares</th>
              <th style={{ width: 140 }}>Activo</th>
              <th style={{ width: 280 }}></th>
            </tr>
          </thead>

          <tbody>
            {pageItems.map((m) => {
              const paresReal = safeNum((m as any).pares ?? 0, 0)
              const draft = pairsDraft[m.id]
              const showVal = draft !== undefined ? draft : String(paresReal)

              // ⚠️ Si por alguna razón se coló blob:, no lo mostramos (evita “imagen rota”)
              const imgOk = isValidImageDataUrl(m.imageDataUrl)

              return (
                <tr key={m.id}>
                  <td>
                    {imgOk ? (
                      <button
                        type="button"
                        className="thumbBtn"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setPreview({ src: m.imageDataUrl!, title: `${m.codigo} — ${m.nombre}` })
                        }}
                        title="Ver imagen"
                      >
                        <img src={m.imageDataUrl} alt={m.nombre} className="thumbImg thumbImg--xl" />
                      </button>
                    ) : (
                      <div className="thumbEmpty thumbEmpty--xl">Sin imagen</div>
                    )}
                  </td>

                  <td style={{ fontWeight: 950 }}>{m.codigo}</td>

                  <td>
                    <div style={{ fontWeight: 900 }}>{m.nombre}</div>
                    {(m as any).descripcion ? (
                      <div className="small" style={{ marginTop: 4 }}>
                        {(m as any).descripcion}
                      </div>
                    ) : null}
                  </td>

                  {/* ✅ Pares */}
                  <td>
                    <div className="pairsCell">
                      <input
                        className="pairsInput"
                        type="number"
                        min={0}
                        value={showVal}
                        onChange={(e) => setPairsDraft((x) => ({ ...x, [m.id]: e.target.value }))}
                        onBlur={() => {
                          const v = pairsDraft[m.id] ?? String(paresReal)
                          commitPairs(m.id, v)
                          setPairsDraft((x) => {
                            const { [m.id]: _, ...rest } = x
                            return rest
                          })
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const v = pairsDraft[m.id] ?? String(paresReal)
                            commitPairs(m.id, v)
                            setPairsDraft((x) => {
                              const { [m.id]: _, ...rest } = x
                              return rest
                            })
                            ;(e.target as HTMLInputElement).blur()
                          }
                        }}
                      />

                      <span className={`pairsBadge ${paresReal <= 0 ? 'pairsBadge--zero' : ''}`}>
                        {paresReal <= 0 ? 'Sin stock' : 'Stock OK'}
                      </span>
                    </div>
                  </td>

                  <td>
                    <Badge tone={m.activo ? 'good' : 'bad'}>{m.activo ? 'Sí' : 'No'}</Badge>
                  </td>

                  <td>
                    <div className="actions" style={{ justifyContent: 'flex-end' }}>
                      <button
                        className="btn btn--soft"
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          openEdit(m.id)
                        }}
                      >
                        Editar
                      </button>

                      <button
                        className="btn btn--danger"
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          del(m.id)
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}

            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="small">No hay modelos que coincidan con tu búsqueda/filtro.</div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      <ModeloModal
        key={modal.editId ?? 'create'}
        open={modal.open}
        onClose={closeModal}
        edit={editModel}
        onSave={(payload) => {
          if (modal.editId) dispatch({ type: 'MODEL_UPDATE', id: modal.editId, payload })
          else dispatch({ type: 'MODEL_CREATE', payload: payload as any })
          closeModal()
        }}
      />

      {/* LIGHTBOX */}
      {preview ? (
        <div className="imgLightbox" onMouseDown={() => setPreview(null)} role="dialog" aria-modal="true">
          <div className="imgLightbox__inner" onMouseDown={(e) => e.stopPropagation()}>
            <div className="imgLightbox__head">
              <div style={{ fontWeight: 950 }}>{preview.title}</div>
              <button className="btn btn--ghost" type="button" onClick={() => setPreview(null)}>
                Cerrar
              </button>
            </div>
            <div className="imgLightbox__body">
              <img src={preview.src} alt={preview.title} className="imgLightbox__img" />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ModeloModal({
  open,
  onClose,
  edit,
  onSave,
}: {
  open: boolean
  onClose: () => void
  edit: ShoeModel | null
  onSave: (payload: Partial<ShoeModel>) => void
}) {
  const fileRef = useRef<HTMLInputElement | null>(null)

  const [codigo, setCodigo] = useState(edit?.codigo ?? '')
  const [nombre, setNombre] = useState(edit?.nombre ?? '')
  const [descripcion, setDescripcion] = useState((edit as any)?.descripcion ?? '')
  const [activo, setActivo] = useState(edit?.activo ?? true)
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>(edit?.imageDataUrl)

  useEffect(() => {
    if (!open) return
    setCodigo(edit?.codigo ?? '')
    setNombre(edit?.nombre ?? '')
    setDescripcion((edit as any)?.descripcion ?? '')
    setActivo(edit?.activo ?? true)
    setImageDataUrl(edit?.imageDataUrl)
    if (fileRef.current) fileRef.current.value = ''
  }, [open, edit?.id])

  async function pickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    // ✅ Importante: fileToDataUrl debe devolver data:image/... base64 (NO blob:)
    // Usa compresión si tu util la soporta (el que te pasé)
    const url = await fileToDataUrl(f, { maxW: 900, maxH: 900, quality: 0.82, maxKB: 300 } as any)
    setImageDataUrl(url)
  }

  return (
    <Modal
      title={edit ? `Editar modelo: ${edit.codigo}` : 'Nuevo modelo'}
      open={open}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn--ghost" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn"
            type="button"
            onClick={() =>
              onSave({
                codigo: codigo.trim(),
                nombre: nombre.trim(),
                descripcion,
                activo,
                imageDataUrl: isValidImageDataUrl(imageDataUrl) ? imageDataUrl : undefined,
                // ✅ IMPORTANTÍSIMO: no perder pares al editar / y en alta default 0
                pares: (edit as any)?.pares ?? 0,
              } as any)
            }
          >
            Guardar
          </button>
        </>
      }
    >
      <div className="catalogEditGrid">
        <div>
          <div className="row">
            <div className="col">
              <div className="field">
                <div className="label">Código</div>
                <input className="input" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Ej: MOD-01" />
              </div>
            </div>

            <div className="col">
              <div className="field">
                <div className="label">Nombre</div>
                <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="field">
            <div className="label">Descripción</div>
            <textarea className="textarea" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          </div>

          <div className="field">
            <div className="label">Imagen del modelo</div>
            <input ref={fileRef} className="input" type="file" accept="image/*" onChange={pickImage} />
            <div className="small">Tip: imágenes ≤ 300 KB para mejor rendimiento.</div>
          </div>

          <div className="field">
            <label className="checkRow">
              <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
              <span style={{ fontWeight: 950 }}>Activo</span>
            </label>
          </div>
        </div>

        <div>
          <div className="field">
            <div className="label">Preview</div>
            {isValidImageDataUrl(imageDataUrl) ? (
              <>
                <img src={imageDataUrl} alt="preview" className="previewBig" />
                <div className="actions" style={{ marginTop: 10 }}>
                  <button className="btn btn--soft" type="button" onClick={() => setImageDataUrl(undefined)}>
                    Quitar imagen
                  </button>
                </div>
              </>
            ) : (
              <div className="previewEmpty">Sin imagen</div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
