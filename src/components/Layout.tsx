import React from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useApp } from '../state/AppContext'
import { roleLabel } from '../utils/roles'
import './Layout.css'

export default function Layout() {
  const { state, dispatch } = useApp()
  const nav = useNavigate()
  const user = state.users.find(u => u.id === state.session.userId)

  function logout() {
    dispatch({ type: 'LOGOUT' })
    nav('/login')
  }

  return (
    <div className="layout">
      <header className="topbar">
        <div className="brand">
          <div className="brand__title">Gestor Zapatería</div>
          <div className="brand__subtitle">Inventarios · Pedidos · Personal</div>
        </div>

        <div className="userbox">
          <div className="userbox__meta">
            <div className="userbox__name">{user?.username ?? '—'}</div>
            <div className="userbox__role">{user ? roleLabel(user.role) : ''}</div>
          </div>
          <button className="btn btn--ghost" onClick={logout}>Cerrar sesión</button>
        </div>
      </header>

      <div className="body">
        <aside className="sidebar">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'nav nav--active' : 'nav'}>Inicio</NavLink>
          <NavLink to="/insumos" className={({ isActive }) => isActive ? 'nav nav--active' : 'nav'}>Insumos</NavLink>
          <NavLink to="/pedidos" className={({ isActive }) => isActive ? 'nav nav--active' : 'nav'}>Pedidos</NavLink>
          <NavLink to="/personal" className={({ isActive }) => isActive ? 'nav nav--active' : 'nav'}>Personal</NavLink>
          <NavLink to="/catalogos" className={({ isActive }) => isActive ? 'nav nav--active' : 'nav'}>Catálogos</NavLink>
          <NavLink to="/exportar-importar" className={({ isActive }) => isActive ? 'nav nav--active' : 'nav'}>Exportar / Importar</NavLink>
          {user?.role === 'SUPERADMIN' && (
            <NavLink to="/usuarios" className={({ isActive }) => isActive ? 'nav nav--active' : 'nav'}>Usuarios</NavLink>
          )}
        </aside>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
