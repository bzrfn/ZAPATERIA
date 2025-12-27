import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import Layout from './components/Layout'
import DashboardPage from './pages/DashboardPage'
import InsumosPage from './pages/InsumosPage'
import PersonalPage from './pages/PersonalPage'
import PedidosPage from './pages/PedidosPage'
import CatalogosPage from './pages/CatalogosPage'
import ExportImportPage from './pages/ExportImportPage'
import UsuariosPage from './pages/UsuariosPage'
import { useApp } from './state/AppContext'
import { hasRole } from './utils/roles'

function Protected({ children }: { children: React.ReactNode }) {
  const { state } = useApp()
  if (!state.session.userId) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RoleGate({ allow, children }: { allow: Array<'ADMIN' | 'SUPERADMIN'>, children: React.ReactNode }) {
  const { state } = useApp()
  const u = state.users.find(x => x.id === state.session.userId)
  const ok = !!u && allow.some(r => hasRole(u.role, r))
  if (!ok) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="insumos" element={<InsumosPage />} />
        <Route path="personal" element={<PersonalPage />} />
        <Route path="pedidos" element={<PedidosPage />} />
        <Route path="catalogos" element={<CatalogosPage />} />
        <Route path="exportar-importar" element={<ExportImportPage />} />
        <Route
          path="usuarios"
          element={
            <RoleGate allow={['SUPERADMIN']}>
              <UsuariosPage />
            </RoleGate>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
