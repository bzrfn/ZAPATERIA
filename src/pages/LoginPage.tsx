import React, { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useApp } from '../state/AppContext'
import './LoginPage.css'

export default function LoginPage() {
  const { state, dispatch } = useApp()
  const nav = useNavigate()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState<string | null>(null)

  const logged = useMemo(() => !!state.session.userId, [state.session.userId])
  if (logged) return <Navigate to="/" replace />

  function submit(e: React.FormEvent) {
    e.preventDefault()

    const ok = state.users.some(u => u.username === username && u.password === password)
    if (!ok) {
      setError('Usuario o contraseña incorrectos.')
      return
    }

    setError(null)
    dispatch({ type: 'LOGIN', username, password })
    nav('/')
  }

  return (
    <div className="loginWrap">
      <div className="loginCard">
        <h1>Gestor Zapatería</h1>
        <p className="small">Inventarios de fabricación · Pedidos · Personal</p>

        <hr className="sep" />

        <form onSubmit={submit}>
          <div className="field">
            <div className="label">Usuario</div>
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div className="field">
            <div className="label">Contraseña</div>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {error ? <div className="error">{error}</div> : null}

          <button className="btn" type="submit">Entrar</button>
        </form>

        <div className="hint">
          <div className="small"><b>Usuarios demo</b></div>
          <div className="small">superadmin / superadmin123</div>
          <div className="small">admin / admin123</div>
        </div>
      </div>
    </div>
  )
}
