import React, { useEffect, useMemo, useRef, useState } from 'react'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import { useApp } from '../state/AppContext'
import type { Order } from '../state/types'
import { parseOrderText } from '../utils/orderParser'
import { nowISO, todayISODate } from '../utils/date'
import { defaultOrderText } from '../state/seed'
import { importOrdersFromExcel } from '../utils/ordersExcel'

type Linea = { numero: string; color: string; suela: string; modelo: string; done?: boolean }

export default function PedidosPage() {
  const { state, dispatch } = useApp()

  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<Order | null>(null)
  const [q, setQ] = useState('')

  const [assignOpen, setAssignOpen] = useState(false)
  const [assignOrder, setAssignOrder] = useState<Order | null>(null)

  const [expandedId, setExpandedId] = useState<string | null>(null)

  const importRef = useRef<HTMLInputElement | null>(null)
  const [importing, setImporting] = useState(false)
  const lastImportedFolioRef = useRef<string | null>(null)

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()
    return state.orders.filter((o) => {
      if (!qq) return true
      return (
        (o.folio ?? '').toLowerCase().includes(qq) ||
        (o.estado ?? '').toLowerCase().includes(qq) ||
        (o.textoOriginal ?? '').toLowerCase().includes(qq)
      )
    })
  }, [state.orders, q])

  // ✅ Auto-expand después del import
  useEffect(() => {
    const folio = lastImportedFolioRef.current
    if (!folio) return
    const created = state.orders.find((o) => o.folio === folio)
    if (!created) return

    lastImportedFolioRef.current = null
    setExpandedId(created.id)

    queueMicrotask(() => {
      document.getElementById(`order-row-${created.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [state.orders])

  function openCreate() {
    setEdit(null)
    setOpen(true)
  }

  function openEdit(o: Order) {
    setEdit(o)
    setOpen(true)
  }

  function del(id: string) {
    if (!window.confirm('¿Eliminar pedido?')) return
    setExpandedId((prev) => (prev === id ? null : prev))
    dispatch({ type: 'ORDER_DELETE', id })
  }

  function openAssign(o: Order) {
    setAssignOrder(o)
    setAssignOpen(true)
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  function clickImport() {
    if (importing) return
    importRef.current?.click()
  }

  async function onPickImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return

    try {
      setImporting(true)
      const imported = await importOrdersFromExcel(f)

      if (!imported || imported.length === 0) {
        alert('No se detectaron filas válidas en el Excel.')
        return
      }

      lastImportedFolioRef.current = imported[imported.length - 1]?.folio ?? null

      for (const imp of imported) {
        // ✅ aseguramos “done” presente aunque el Excel no lo tenga
        const lines: Linea[] = (imp.lineas ?? []).map((x: any) => ({
          numero: x.numero ?? '',
          color: x.color ?? '',
          suela: x.suela ?? '',
          modelo: x.modelo ?? '',
          done: !!x.done,
        }))

        dispatch({
          type: 'ORDER_CREATE',
          payload: {
            folio: imp.folio,
            textoOriginal: imp.textoOriginal ?? '',
            lineas: lines,
            fechaIngreso: imp.fechaIngreso || todayISODate(),
            fechaEntregaEstimada: imp.fechaEntregaEstimada || todayISODate(),
            estado: 'REGISTRADO',
            asignaciones: {},
          } as any,
        })
      }

      alert(`Importación completada: ${imported.length} pedido(s).`)
    } catch (err: any) {
      console.error(err)
      alert(`Error importando Excel: ${err?.message ?? String(err)}`)
    } finally {
      setImporting(false)
      if (importRef.current) importRef.current.value = ''
    }
  }

  /** =========================
   *  ✅ LÓGICA: CHECK POR LÍNEA
   *  ========================= */

  function normalizeLines(lines: any[]): Linea[] {
    return (Array.isArray(lines) ? lines : []).map((l: any) => ({
      numero: l?.numero ?? '',
      color: l?.color ?? '',
      suela: l?.suela ?? '',
      modelo: l?.modelo ?? '',
      done: !!l?.done,
    }))
  }

  function isAllDone(lines: Linea[]) {
    return lines.length > 0 && lines.every((l) => !!l.done)
  }

  function updateOrderLines(order: Order, nextLines: Linea[], opts?: { forceComplete?: boolean }) {
    const allDone = isAllDone(nextLines)
    const forceComplete = !!opts?.forceComplete

    const nextEstado: Order['estado'] = forceComplete || allDone ? 'ENTREGADO' : (order.estado ?? 'REGISTRADO')

    dispatch({
      type: 'ORDER_UPDATE',
      id: order.id,
      payload: {
        lineas: nextLines as any,
        estado: nextEstado,
        updatedAt: nowISO(),
      } as any,
    })
  }

  function toggleLineDone(order: Order, idx: number) {
    const safe = normalizeLines((order as any).lineas ?? [])
    if (idx < 0 || idx >= safe.length) return

    const next = safe.map((l, i) => (i === idx ? { ...l, done: !l.done } : l))
    updateOrderLines(order, next)
  }

  function setAllLinesDone(order: Order, done: boolean) {
    const safe = normalizeLines((order as any).lineas ?? [])
    const next = safe.map((l) => ({ ...l, done }))
    updateOrderLines(order, next)
  }

  function markOrderComplete(order: Order) {
    // ✅ “Completar de una”: marca todas las casillas y pone estado ENTREGADO
    const safe = normalizeLines((order as any).lineas ?? [])
    const next = safe.map((l) => ({ ...l, done: true }))
    updateOrderLines(order, next, { forceComplete: true })
  }

  return (
    <div className="card">
      <div className="ordersHeader">
        <div className="ordersHeader__left">
          <h2>Pedidos</h2>
          <div className="small">
            Importa desde Excel y el pedido se <b>abre automáticamente</b>.
          </div>
        </div>

        <div className="ordersHeader__actions">
          <input className="input" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />

          <input ref={importRef} type="file" accept=".xlsx,.xls" onChange={onPickImportFile} style={{ display: 'none' }} />

          <button className="btn btn--soft" type="button" onClick={clickImport} disabled={importing}>
            {importing ? 'Importando…' : 'Importar Excel'}
          </button>

          <button className="btn" type="button" onClick={openCreate}>
            Nuevo pedido
          </button>
        </div>
      </div>

      <hr className="sep" />

      <div className="tableWrap">
        <table className="table table--orders">
          <thead>
            <tr>
              <th>Folio</th>
              <th>Ingreso</th>
              <th>Entrega</th>
              <th>Estado</th>
              <th>Líneas</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((o) => {
              const isOpen = expandedId === o.id
              const safeLines = normalizeLines((o as any).lineas ?? [])
              const linesCount = safeLines.length
              const doneCount = safeLines.filter((l) => !!l.done).length
              const allDone = isAllDone(safeLines)

              return (
                <React.Fragment key={o.id}>
                  <tr id={`order-row-${o.id}`}>
                    <td className="ordersFolioCell">
                      <button type="button" className="ordersFolioBtn" onClick={() => toggleExpand(o.id)}>
                        <span className="ordersFolioCaret">{isOpen ? '▼' : '▶'}</span>
                        <span className="ordersFolioText">{o.folio}</span>
                      </button>
                      {linesCount > 0 ? <div className="small ordersProgressText">{doneCount}/{linesCount} listos</div> : null}
                    </td>

                    <td>{o.fechaIngreso}</td>
                    <td>{o.fechaEntregaEstimada}</td>
                    <td>
                      <Badge tone={tone(o.estado)}>{o.estado}</Badge>
                    </td>
                    <td>{linesCount}</td>

                    <td>
                      <div className="actions" style={{ justifyContent: 'flex-end' }}>
                        <button className="btn btn--soft" type="button" onClick={() => openAssign(o)}>
                          Asignar insumos
                        </button>
                        <button className="btn btn--ghost" type="button" onClick={() => openEdit(o)}>
                          Editar
                        </button>
                        <button className="btn btn--danger" type="button" onClick={() => del(o.id)}>
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>

                  {isOpen ? (
                    <tr className="orderExpandRow">
                      <td colSpan={6}>
                        <div className="orderExpandCard">
                          <div className="orderExpandTop">
                            <div>
                              <div className="orderExpandTitle">Pedido completo</div>
                              <div className="small">
                                Texto original + tabla (columna # + check por par).{' '}
                                {linesCount > 0 ? (
                                  <b className={allDone ? 'ordersDoneAll' : ''}>
                                    {doneCount}/{linesCount} listos
                                  </b>
                                ) : null}
                              </div>
                            </div>

                            <div className="actions">
                              <button className="btn btn--soft" type="button" onClick={() => openAssign(o)}>
                                Asignar insumos
                              </button>
                              <button className="btn btn--ghost" type="button" onClick={() => openEdit(o)}>
                                Editar
                              </button>
                              <button className="btn btn--ghost" type="button" onClick={() => setExpandedId(null)}>
                                Cerrar vista
                              </button>
                            </div>
                          </div>

                          <hr className="sep" />

                          <div className="orderExpandGrid">
                            <div>
                              <div className="label">Texto original</div>
                              <textarea className="textarea orderTextArea" value={o.textoOriginal ?? ''} readOnly />
                            </div>

                            <div>
                              <div className="label">Tabla</div>

                              <LinesGridView
                                title="Líneas"
                                lines={safeLines}
                                showIndex
                                showChecks
                                onToggleLine={(idx) => toggleLineDone(o, idx)}
                                onSetAll={(done) => setAllLinesDone(o, done)}
                                onMarkComplete={() => markOrderComplete(o)}
                              />

                              {linesCount === 0 ? (
                                <div className="small" style={{ marginTop: 8 }}>
                                  Este pedido no trae líneas.
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="small" style={{ marginTop: 10 }}>
        <b>Excel esperado (primera hoja):</b> columnas: <code>folio, fechaIngreso, fechaEntregaEstimada, numero, color, suela, modelo</code>.
      </div>

      <PedidoModal
        open={open}
        onClose={() => setOpen(false)}
        edit={edit}
        onSave={(payload) => {
          if (edit) dispatch({ type: 'ORDER_UPDATE', id: edit.id, payload })
          else dispatch({ type: 'ORDER_CREATE', payload: payload as any })
          setOpen(false)
        }}
      />

      <AsignarInsumosModal open={assignOpen} onClose={() => setAssignOpen(false)} order={assignOrder} />
    </div>
  )
}

function tone(estado: Order['estado']) {
  if (estado === 'ENTREGADO') return 'good'
  if (estado === 'CANCELADO') return 'bad'
  if (estado === 'EN_PRODUCCION') return 'warn'
  return 'neutral'
}

/* ---------------- MODAL EDIT FULLSCREEN + NO BORRA LINEAS ---------------- */

function PedidoModal({
  open,
  onClose,
  edit,
  onSave,
}: {
  open: boolean
  onClose: () => void
  edit: Order | null
  onSave: (payload: Partial<Order>) => void
}) {
  const [folio, setFolio] = useState(edit?.folio ?? `PED-${Math.floor(Math.random() * 9000 + 1000)}`)
  const [texto, setTexto] = useState(edit?.textoOriginal ?? defaultOrderText())
  const [fechaIngreso, setFechaIngreso] = useState(edit?.fechaIngreso ?? todayISODate())
  const [fechaEntrega, setFechaEntrega] = useState(edit?.fechaEntregaEstimada ?? todayISODate())
  const [estado, setEstado] = useState<Order['estado']>(edit?.estado ?? 'REGISTRADO')

  const [lineasLocal, setLineasLocal] = useState<Linea[]>(((edit as any)?.lineas ?? []) as any)
  const openedTextRef = useRef<string>('')

  function normalize(lines: any[]): Linea[] {
    return (Array.isArray(lines) ? lines : []).map((l: any) => ({
      numero: l?.numero ?? '',
      color: l?.color ?? '',
      suela: l?.suela ?? '',
      modelo: l?.modelo ?? '',
      done: !!l?.done,
    }))
  }

  function allDone(lines: Linea[]) {
    return lines.length > 0 && lines.every((l) => !!l.done)
  }

  useEffect(() => {
    if (!open) return

    const baseText = (edit?.textoOriginal ?? defaultOrderText()) || ''
    setFolio(edit?.folio ?? `PED-${Math.floor(Math.random() * 9000 + 1000)}`)
    setTexto(baseText)
    setFechaIngreso(edit?.fechaIngreso ?? todayISODate())
    setFechaEntrega(edit?.fechaEntregaEstimada ?? todayISODate())
    setEstado(edit?.estado ?? 'REGISTRADO')
    setLineasLocal(normalize(((edit as any)?.lineas ?? []) as any))

    openedTextRef.current = baseText.trim()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, (edit as any)?.id])

  function onTextChange(val: string) {
    setTexto(val)
  }

  function toggleLocalLine(idx: number) {
    setLineasLocal((prev) => {
      const safe = normalize(prev as any)
      if (idx < 0 || idx >= safe.length) return safe
      return safe.map((l, i) => (i === idx ? { ...l, done: !l.done } : l))
    })
  }

  function setAllLocal(done: boolean) {
    setLineasLocal((prev) => normalize(prev as any).map((l) => ({ ...l, done })))
  }

  function markCompleteLocal() {
    setLineasLocal((prev) => normalize(prev as any).map((l) => ({ ...l, done: true })))
    setEstado('ENTREGADO')
  }

  function save() {
    const trimmedText = (texto ?? '').trim()
    const safeLines = normalize(lineasLocal as any)
    const shouldAutoDelivered = allDone(safeLines)

    const payload: Partial<Order> = {
      folio,
      textoOriginal: trimmedText,
      fechaIngreso,
      fechaEntregaEstimada: fechaEntrega,
      estado: shouldAutoDelivered ? 'ENTREGADO' : estado,
      asignaciones: edit?.asignaciones ?? {},
      updatedAt: nowISO(),
      lineas: safeLines as any,
    }

    if (!edit && (safeLines?.length ?? 0) === 0) {
      const parsed = parseOrderText(trimmedText)
      payload.lineas = (parsed as any[]).map((x: any) => ({ ...x, done: false })) as any
    }

    onSave(payload)
  }

  return (
    <Modal
      title={edit ? `Editar pedido — ${edit.folio}` : 'Nuevo pedido'}
      open={open}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn--ghost" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn" type="button" onClick={save}>
            Guardar
          </button>
        </>
      }
    >
      <div className="pedidoModalWide">
        <div className="pedidoFull">
          <div className="pedidoFull__left">
            <div className="row">
              <div className="col">
                <div className="field">
                  <div className="label">Folio</div>
                  <input className="input" value={folio} onChange={(e) => setFolio(e.target.value)} />
                </div>
              </div>

              <div className="col">
                <div className="field">
                  <div className="label">Fecha de ingreso</div>
                  <input className="input" type="date" value={fechaIngreso} onChange={(e) => setFechaIngreso(e.target.value)} />
                </div>
              </div>

              <div className="col">
                <div className="field">
                  <div className="label">Entrega estimada</div>
                  <input className="input" type="date" value={fechaEntrega} onChange={(e) => setFechaEntrega(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="row">
              <div className="col">
                <div className="field">
                  <div className="label">Estado</div>
                  <select className="select" value={estado} onChange={(e) => setEstado(e.target.value as any)}>
                    <option value="REGISTRADO">REGISTRADO</option>
                    <option value="EN_PRODUCCION">EN_PRODUCCION</option>
                    <option value="ENTREGADO">ENTREGADO</option>
                    <option value="CANCELADO">CANCELADO</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="field">
              <div className="label">Comentarios del pedido</div>
              <textarea
                className="textarea pedidoTextEdit pedidoTextEdit--short"
                value={texto}
                onChange={(e) => onTextChange(e.target.value)}
                placeholder="Notas internas, indicaciones, observaciones…"
              />
              <div className="small">Aquí son comentarios (no afecta la tabla).</div>
            </div>
          </div>

          <div className="pedidoFull__right">
            <div className="field">
              <div className="label">Tabla (checks por par)</div>

              <LinesGridView
                title="Líneas"
                lines={lineasLocal}
                variant="modal"
                showIndex
                showChecks
                onToggleLine={(idx) => toggleLocalLine(idx)}
                onSetAll={(done) => setAllLocal(done)}
                onMarkComplete={() => markCompleteLocal()}
              />

              {(lineasLocal?.length ?? 0) === 0 ? (
                <div className="small" style={{ marginTop: 8 }}>
                  Este pedido no tiene líneas.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

/* ---------------- ASIGNAR INSUMOS (FIX TS18047) ---------------- */

function AsignarInsumosModal({
  open,
  onClose,
  order,
}: {
  open: boolean
  onClose: () => void
  order: Order | null
}) {
  const { state, dispatch } = useApp()
  const [local, setLocal] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!open || !order) return
    setLocal({ ...(order.asignaciones ?? {}) })
  }, [open, order?.id])

  if (!order) return null
  const o = order // ✅ FIX TS: ya no es null

  function save() {
    for (const s of state.supplies) {
      const qty = Number(local[s.id] ?? 0)
      dispatch({ type: 'ORDER_ASSIGN_SUPPLY', orderId: o.id, supplyId: s.id, qty })
    }
    onClose()
  }

  return (
    <Modal
      title={`Asignar insumos — ${o.folio}`}
      open={open}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn--ghost" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn" type="button" onClick={save}>
            Guardar asignación
          </button>
        </>
      }
    >
      <div className="small">
        Al aumentar una asignación, el sistema valida stock y descuenta del inventario (consumo/reserva). Si reduces la asignación, el
        stock se regresa.
      </div>

      <hr className="sep" />

      <div className="tableWrap tableWrap--inner">
        <table className="table">
          <thead>
            <tr>
              <th>Insumo</th>
              <th>Stock disponible</th>
              <th>Asignado a pedido</th>
            </tr>
          </thead>
          <tbody>
            {state.supplies.map((s) => (
              <tr key={s.id}>
                <td>
                  <div style={{ fontWeight: 900 }}>{s.nombre}</div>
                  <div className="small">{s.unidad}</div>
                </td>
                <td>
                  <Badge tone={s.stock <= s.minStock ? (s.stock === 0 ? 'bad' : 'warn') : 'good'}>{s.stock}</Badge>
                </td>
                <td>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    value={local[s.id] ?? 0}
                    onChange={(e) => setLocal((x) => ({ ...x, [s.id]: Number(e.target.value) }))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  )
}

/* ---------------- GRID “TABLA” + CHECKS ---------------- */

function LinesGridView({
  title,
  lines,
  variant,
  showIndex,
  showChecks,
  onToggleLine,
  onSetAll,
  onMarkComplete,
}: {
  title: string
  lines: Linea[]
  variant?: 'modal' | 'expand'
  showIndex?: boolean
  showChecks?: boolean
  onToggleLine?: (idx: number) => void
  onSetAll?: (done: boolean) => void
  onMarkComplete?: () => void
}) {
  const isModal = variant === 'modal'
  const safe = Array.isArray(lines) ? lines : []

  const doneCount = safe.filter((l) => !!l.done).length
  const total = safe.length
  const allDone = total > 0 && doneCount === total

  return (
    <div className="linesPanel">
      <div className="linesPanel__head linesPanel__head--checks">
        <div className="linesPanel__title">{title}</div>

        {total > 0 ? (
          <div className="linesPanel__meta">
            <span className={`linesProgress ${allDone ? 'linesProgress--done' : ''}`}>
              {doneCount}/{total} listos
            </span>

            {showChecks ? (
              <div className="linesPanel__actions">
                <button className="btn btn--ghost btn--xs" type="button" onClick={() => onSetAll?.(true)}>
                  Marcar todas
                </button>
                <button className="btn btn--ghost btn--xs" type="button" onClick={() => onSetAll?.(false)}>
                  Limpiar
                </button>
                <button className="btn btn--soft btn--xs" type="button" onClick={() => onMarkComplete?.()}>
                  Completar pedido
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className={`linesListScroll ${isModal ? 'linesListScroll--modal' : ''}`}>
        <div
          className={`linesGrid ${showIndex || showChecks ? 'linesGrid--withIndex' : ''} ${
            showChecks ? 'linesGrid--withChecks' : ''
          }`}
        >
          {showChecks ? <div className="linesGrid__hdr linesHdrCheck">✓</div> : null}
          {showIndex ? <div className="linesGrid__hdr linesHdrIndex">#</div> : null}

          <div className="linesGrid__hdr">Número</div>
          <div className="linesGrid__hdr">Color</div>
          <div className="linesGrid__hdr">Suela</div>
          <div className="linesGrid__hdr">Modelo</div>

          {safe.map((l, i) => {
            const rowDone = !!l.done
            return (
              <React.Fragment key={i}>
                {showChecks ? (
                  <div className={`linesCell linesCell--check ${rowDone ? 'is-done' : ''}`}>
                    <label className="linesCheck">
                      <input type="checkbox" checked={rowDone} onChange={() => onToggleLine?.(i)} />
                      <span className="linesCheck__ui" />
                    </label>
                  </div>
                ) : null}

                {showIndex ? (
                  <div className={`linesCell linesCell--index ${rowDone ? 'is-done' : ''}`}>{i + 1}</div>
                ) : null}

                <div className={`linesCell linesCell--strong ${rowDone ? 'is-done' : ''}`}>{l.numero}</div>
                <div className={`linesCell linesCell--muted ${rowDone ? 'is-done' : ''}`}>{l.color}</div>
                <div className={`linesCell linesCell--muted ${rowDone ? 'is-done' : ''}`}>{l.suela}</div>
                <div className={`linesCell linesCell--strong ${rowDone ? 'is-done' : ''}`}>{l.modelo}</div>
              </React.Fragment>
            )
          })}
        </div>
      </div>
    </div>
  )
}
