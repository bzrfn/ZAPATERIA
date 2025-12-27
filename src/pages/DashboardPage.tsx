import React, { useMemo } from 'react'
import { useApp } from '../state/AppContext'
import Badge from '../components/Badge'

export default function DashboardPage() {
  const { state } = useApp()

  const low = useMemo(() => state.supplies.filter(s => s.stock <= s.minStock), [state.supplies])
  const totalStock = useMemo(() => state.supplies.reduce((a, s) => a + s.stock, 0), [state.supplies])
  const pendingOrders = useMemo(() => state.orders.filter(o => o.estado !== 'ENTREGADO' && o.estado !== 'CANCELADO'), [state.orders])

  return (
    <div className="row">
      <div className="col">
        <div className="card">
          <h2>Resumen</h2>
          <div className="row">
            <div className="col">
              <div className="kpi">{state.orders.length}</div>
              <div className="small">Pedidos registrados</div>
            </div>
            <div className="col">
              <div className="kpi">{pendingOrders.length}</div>
              <div className="small">Pedidos abiertos</div>
            </div>
            <div className="col">
              <div className="kpi">{totalStock}</div>
              <div className="small">Stock total (sumatoria)</div>
            </div>
          </div>
          <hr className="sep" />
          <div className="small">
            Este sistema guarda todo en <b>LocalStorage</b>. Si recargas la página, la información permanece.
          </div>
        </div>
      </div>

      <div className="col">
        <div className="card">
          <h2>Alertas de inventario</h2>
          {low.length === 0 ? (
            <div className="small">Sin alertas por ahora.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Insumo</th>
                  <th>Stock</th>
                  <th>Mínimo</th>
                </tr>
              </thead>
              <tbody>
                {low.map(s => (
                  <tr key={s.id}>
                    <td>{s.nombre}</td>
                    <td><Badge tone={s.stock === 0 ? 'bad' : 'warn'}>{s.stock} {s.unidad}</Badge></td>
                    <td>{s.minStock}</td>
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
