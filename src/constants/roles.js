
export const ROLES = {
  CUSTOMER_SERVICE: 'ROLE_CUSTOMER_SERVICE',
  SYSTEM_ADMIN: 'ROLE_SYSTEM_ADMIN',
}

export function getRoleName(user) {
  if (!user) return ''
  return user?.role?.name || user?.role || ''
}
