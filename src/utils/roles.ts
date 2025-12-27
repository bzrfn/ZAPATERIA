import type { Role } from '../state/types'

export function hasRole(userRole: Role, required: Role): boolean {
  if (required === 'ADMIN') return userRole === 'ADMIN' || userRole === 'SUPERADMIN'
  return userRole === 'SUPERADMIN'
}

export function roleLabel(role: Role) {
  return role === 'SUPERADMIN' ? 'Superadministrador' : 'Administrador'
}
