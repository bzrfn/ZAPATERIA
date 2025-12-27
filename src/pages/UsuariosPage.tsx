import React, { useMemo, useState } from 'react'
import Modal from '../components/Modal'
import { useApp } from '../state/AppContext'
import type { Role, User } from '../state/types'
import { roleLabel } from '../utils/roles'

export default function UsuariosPage() {
  const { state, dispatch } = useApp()
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<User | null>(null)
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()
    return state.users.filter(u => !qq || u.username.toLowerCase().includes(qq) || u.role.toLowerCase().includes(qq))
  }, [state.users, q])

  function openCreate() {
    setEdit(null)
    setOpen(true)
  }
  function openEdit(u: User) {
    setEdit(u)
    setOpen(true)
  }
  function del(id: string) {
    if (!confirm('¿Eliminar usuario?')) return
    dispatch({ type: 'USER_DELETE', id })
  }

  return (
    <div className="card">
      <div className="row" style={{ alignItems: 'center' }}>
        <div className="col">
          <h2>Usuarios y roles</h2>
          <div className="small">
            <b>Superadministrador</b>: administra usuarios. <b>Administrador</b>: opera inventarios/pedidos/personal.
          </div>
        </div>
        <div className="actions">
          <input className="input" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn" onClick={openCreate}>Nuevo usuario</button>
        </div>
      </div>

      <hr className="sep" />

      <table className="table">
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Rol</th>
            <th>Creado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(u => (
            <tr key={u.id}>
              <td style={{ fontWeight: 900 }}>{u.username}</td>
              <td>{roleLabel(u.role)}</td>
              <td className="small">{new Date(u.createdAt).toLocaleString('es-MX')}</td>
              <td>
                <div className="actions">
                  <button className="btn btn--ghost" onClick={() => openEdit(u)}>Editar</button>
                  <button className="btn btn--danger" onClick={() => del(u.id)}>Eliminar</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <UsuarioModal
        open={open}
        onClose={() => setOpen(false)}
        edit={edit}
        onSave={(payload) => {
          if (edit) dispatch({ type: 'USER_UPDATE', id: edit.id, payload })
          else dispatch({ type: 'USER_CREATE', payload: payload as any })
          setOpen(false)
        }}
      />
    </div>
  )
}

function UsuarioModal({
  open, onClose, edit, onSave,
}: {
  open: boolean
  onClose: () => void
  edit: User | null
  onSave: (payload: Partial<User>) => void
}) {
  const [username, setUsername] = useState(edit?.username ?? '')
  const [password, setPassword] = useState(edit?.password ?? '')
  const [role, setRole] = useState<Role>(edit?.role ?? 'ADMIN')

  React.useEffect(() => {
    if (!open) return
    setUsername(edit?.username ?? '')
    setPassword(edit?.password ?? '')
    setRole(edit?.role ?? 'ADMIN')
  }, [open, edit])

  return (
    <Modal
      title={edit ? 'Editar usuario' : 'Nuevo usuario'}
      open={open}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="btn" onClick={() => onSave({ username, password, role })}>Guardar</button>
        </>
      }
    >
      <div className="row">
        <div className="col">
          <div className="field">
            <div className="label">Usuario</div>
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
        </div>
        <div className="col">
          <div className="field">
            <div className="label">Contraseña</div>
            <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        </div>
        <div className="col">
          <div className="field">
            <div className="label">Rol</div>
            <select className="select" value={role} onChange={(e) => setRole(e.target.value as Role)}>
              <option value="ADMIN">Administrador</option>
              <option value="SUPERADMIN">Superadministrador</option>
            </select>
          </div>
        </div>
      </div>

      <div className="small">
        Nota: esto es un demo local (contraseñas en LocalStorage). Para producción real se recomienda backend + hashing + JWT.
      </div>
    </Modal>
  )
}
