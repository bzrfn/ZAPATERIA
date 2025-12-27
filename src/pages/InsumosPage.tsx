import React, { useMemo, useState } from 'react'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import { useApp } from '../state/AppContext'
import type { Supply, Unit } from '../state/types'

const UNITS: Unit[] = ['par', 'pz', 'kg', 'm', 'lt', 'caja', 'otro']
const QUICK = [1, 5, 10, 25, 50]

export default function InsumosPage() {
  const { state, dispatch } = useApp()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<Supply | null>(null)

  const [adjustOpen, setAdjustOpen] = useState(false)
  const [adjustItem, setAdjustItem] = useState<Supply | null>(null)

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()
    return state.supplies.filter(s =>
      !qq || s.nombre.toLowerCase().includes(qq) || s.key.toLowerCase().includes(qq),
    )
  }, [state.supplies, q])

  function openCreate() {
    setEdit(null)
    setOpen(true)
  }

  function openEdit(s: Supply) {
    setEdit(s)
    setOpen(true)
  }

  function remove(id: string) {
    if (!confirm('¿Eliminar insumo? (No se permite si está asignado a algún pedido)')) return
    dispatch({ type: 'SUPPLY_DELETE', id })
  }

  function openAdjust(s: Supply) {
    setAdjustItem(s)
    setAdjustOpen(true)
  }

  return (
    <div className="card">
      <div className="row" style={{ alignItems: 'center' }}>
        <div className="col">
          <h2>Insumos de fabricación</h2>
          <div className="small">CRUD + ajuste de stock con mejor UX (botones rápidos, validación, modal).</div>
        </div>
        <div className="actions">
          <input className="input" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn" onClick={openCreate}>Nuevo insumo</button>
        </div>
      </div>

      <hr className="sep" />

      <table className="table">
        <thead>
          <tr>
            <th>Insumo</th>
            <th>Unidad</th>
            <th>Stock</th>
            <th>Mínimo</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(s => {
            const tone = s.stock <= s.minStock ? (s.stock === 0 ? 'bad' : 'warn') : 'good'
            return (
              <tr key={s.id}>
                <td>
                  <div style={{ fontWeight: 900 }}>{s.nombre}</div>
                  <div className="small">{s.key}</div>
                </td>
                <td>{s.unidad}</td>
                <td><Badge tone={tone as any}>{s.stock}</Badge></td>
                <td>{s.minStock}</td>
                <td>
                  <div className="actions">
                    <button className="btn btn--soft" onClick={() => openAdjust(s)}>Agregar / Restar</button>
                    <button className="btn btn--ghost" onClick={() => openEdit(s)}>Editar</button>
                    <button className="btn btn--danger" onClick={() => remove(s.id)}>Eliminar</button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <InsumoModal
        open={open}
        onClose={() => setOpen(false)}
        edit={edit}
        onSave={(payload) => {
          if (edit) dispatch({ type: 'SUPPLY_UPDATE', id: edit.id, payload })
          else dispatch({ type: 'SUPPLY_CREATE', payload: payload as any })
          setOpen(false)
        }}
      />

      <AjusteStockModal
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        item={adjustItem}
      />
    </div>
  )
}

function InsumoModal({
  open, onClose, edit, onSave,
}: {
  open: boolean
  onClose: () => void
  edit: Supply | null
  onSave: (payload: Partial<Supply>) => void
}) {
  const [nombre, setNombre] = useState(edit?.nombre ?? '')
  const [unidad, setUnidad] = useState<Unit>(edit?.unidad ?? 'pz')
  const [key, setKey] = useState(edit?.key ?? 'PIEL')
  const [minStock, setMinStock] = useState<number>(edit?.minStock ?? 0)
  const [costoUnitario, setCostoUnitario] = useState<number>(edit?.costoUnitario ?? 0)
  const [notas, setNotas] = useState(edit?.notas ?? '')

  React.useEffect(() => {
    if (!open) return
    setNombre(edit?.nombre ?? '')
    setUnidad(edit?.unidad ?? 'pz')
    setKey(edit?.key ?? 'PIEL')
    setMinStock(edit?.minStock ?? 0)
    setCostoUnitario(edit?.costoUnitario ?? 0)
    setNotas(edit?.notas ?? '')
  }, [open, edit])

  return (
    <Modal
      title={edit ? 'Editar insumo' : 'Nuevo insumo'}
      open={open}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="btn" onClick={() => onSave({ nombre, unidad, key, minStock, costoUnitario, notas })}>
            Guardar
          </button>
        </>
      }
    >
      <div className="row">
        <div className="col">
          <div className="field">
            <div className="label">Nombre</div>
            <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
        </div>
        <div className="col">
          <div className="field">
            <div className="label">Clave (tipo de insumo)</div>
            <select className="select" value={key} onChange={(e) => setKey(e.target.value as any)}>
              <option value="SUELA_CUERO">SUELA_CUERO</option>
              <option value="SUELA_TRACTOR">SUELA_TRACTOR</option>
              <option value="SUELA_RODEO">SUELA_RODEO</option>
              <option value="PIEL">PIEL</option>
              <option value="FORRO">FORRO</option>
              <option value="RESORTE">RESORTE</option>
              <option value="CLAVOS">CLAVOS</option>
              <option value="RESISTOL">RESISTOL</option>
              <option value="ACTIVADOR_CORTE">ACTIVADOR_CORTE</option>
            </select>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col">
          <div className="field">
            <div className="label">Unidad</div>
            <select className="select" value={unidad} onChange={(e) => setUnidad(e.target.value as Unit)}>
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>
        <div className="col">
          <div className="field">
            <div className="label">Stock mínimo (alerta)</div>
            <input className="input" type="number" min={0} value={minStock} onChange={(e) => setMinStock(Number(e.target.value))} />
          </div>
        </div>
        <div className="col">
          <div className="field">
            <div className="label">Costo unitario (opcional)</div>
            <input className="input" type="number" min={0} value={costoUnitario} onChange={(e) => setCostoUnitario(Number(e.target.value))} />
          </div>
        </div>
      </div>

      <div className="field">
        <div className="label">Notas</div>
        <textarea className="textarea" value={notas} onChange={(e) => setNotas(e.target.value)} />
      </div>
    </Modal>
  )
}

function AjusteStockModal({ open, onClose, item }: { open: boolean, onClose: () => void, item: Supply | null }) {
  const { dispatch } = useApp()
  const [qty, setQty] = useState<number>(1)

  React.useEffect(() => {
    if (!open) return
    setQty(1)
  }, [open])

  if (!item) return null

  function add(n: number) {
    dispatch({ type: 'SUPPLY_ADJUST', id: item.id, delta: n })
  }

  function sub(n: number) {
    dispatch({ type: 'SUPPLY_ADJUST', id: item.id, delta: -n })
  }

  return (
    <Modal
      title={`Ajuste de stock — ${item.nombre}`}
      open={open}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose}>Cerrar</button>
        </>
      }
    >
      <div className="row">
        <div className="col">
          <div className="card" style={{ background: 'rgba(0,0,0,0.02)', borderStyle: 'dashed', boxShadow: 'none' }}>
            <div style={{ fontWeight: 900, fontSize: 24 }}>{item.stock} <span className="small">{item.unidad}</span></div>
            <div className="small">Stock actual</div>
          </div>
        </div>
        <div className="col">
          <div className="field">
            <div className="label">Cantidad</div>
            <input className="input" type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value)))} />
            <div className="small">Usa botones rápidos o aplica la cantidad manual.</div>
          </div>
          <div className="actions">
            <button className="btn btn--soft" onClick={() => add(qty)}>+ Agregar</button>
            <button className="btn btn--soft" onClick={() => sub(qty)}>- Restar</button>
          </div>
        </div>
      </div>

      <hr className="sep" />

      <div style={{ fontWeight: 900, marginBottom: 8 }}>Atajos</div>
      <div className="actions">
        {QUICK.map(n => (
          <button key={n} className="btn btn--soft" onClick={() => add(n)}>+{n}</button>
        ))}
        {QUICK.map(n => (
          <button key={`s-${n}`} className="btn btn--soft" onClick={() => sub(n)}>-{n}</button>
        ))}
      </div>

      <div className="small" style={{ marginTop: 10 }}>
        Nota: el sistema no permite stock negativo (si restas más de lo que hay, queda en 0).
      </div>
    </Modal>
  )
}
