
export const ROLES = {
  CUSTOMER_SERVICE: 'ROLE_CUSTOMER_SERVICE',
}

export function getRoleName(user) {
  if (!user) return ''
  return user?.role?.name || user?.role || ''
}
