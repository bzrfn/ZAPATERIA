import React, { useMemo, useState } from 'react'
import { useApp } from '../state/AppContext'
import { formatDT, nowISO } from '../utils/date'
import Badge from '../components/Badge'

export default function PersonalPage() {
  const { state, dispatch } = useApp()
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<'ENTRADA' | 'SALIDA'>('ENTRADA')
  const [notas, setNotas] = useState('')

  const grouped = useMemo(() => {
    const by: Record<string, number> = {}
    for (const c of state.checks) {
      by[c.empleadoNombre] = (by[c.empleadoNombre] ?? 0) + 1
    }
    return Object.entries(by).sort((a, b) => b[1] - a[1])
  }, [state.checks])

  function add() {
    const n = nombre.trim()
    if (!n) return

    const notasTrim = notas.trim()

    dispatch({
      type: 'CHECK_ADD',
      payload: {
        empleadoNombre: n,
        tipo,
        timestamp: nowISO(),
        notas: notasTrim ? notasTrim : undefined,
      },
    })

    setNombre('')
    setNotas('')
  }

  function del(id: string) {
    if (!confirm('¿Eliminar registro?')) return
    dispatch({ type: 'CHECK_DELETE', id })
  }

  const checksSorted = useMemo(() => {
    // Si quieres que lo más nuevo salga arriba:
    return [...state.checks].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
  }, [state.checks])

  return (
    <div className="row">
      <div className="col">
        <div className="card">
          <h2>Chequeo de personal</h2>
          <div className="small">
            Registro de entrada y salida (fecha y hora). Ideal para piso de producción.
          </div>
          <hr className="sep" />

          <div className="row">
            <div className="col">
              <div className="label">Empleado</div>
              <input
                className="input"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre del empleado"
              />
            </div>
            <div className="col">
              <div className="label">Tipo</div>
              <select
                className="select"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as any)}
              >
                <option value="ENTRADA">ENTRADA</option>
                <option value="SALIDA">SALIDA</option>
              </select>
            </div>
          </div>

          <div className="field">
            <div className="label">Notas</div>
            <input
              className="input"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Opcional"
            />
          </div>

          <button className="btn" onClick={add}>
            Registrar
          </button>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <h3>Registros recientes</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Empleado</th>
                <th>Tipo</th>
                <th>Fecha/Hora</th>
                <th>Notas</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {checksSorted.map((c) => (
                <tr key={c.id}>
                  <td>{c.empleadoNombre}</td>
                  <td>
                    <Badge tone={c.tipo === 'ENTRADA' ? 'good' : 'warn'}>{c.tipo}</Badge>
                  </td>
                  <td>{formatDT(c.timestamp)}</td>
                  <td className="notesCell">
                    {c.notas ? <span className="notesText">{c.notas}</span> : <span className="muted">—</span>}
                  </td>
                  <td>
                    <button className="btn btn--danger" onClick={() => del(c.id)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {checksSorted.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted" style={{ padding: 12 }}>
                    Sin registros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="col">
        <div className="card">
          <h3>Actividad por empleado</h3>
          <div className="small">Conteo rápido de registros.</div>
          <hr className="sep" />
          {grouped.length === 0 ? (
            <div className="small">Sin registros.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Empleado</th>
                  <th>Registros</th>
                </tr>
              </thead>
              <tbody>
                {grouped.map(([emp, count]) => (
                  <tr key={emp}>
                    <td>{emp}</td>
                    <td>{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
