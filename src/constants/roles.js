/**
 * Role names returned by the auth backend.
 * Use these for RBAC (role-based access control) and route protection.
 */
export const ROLES = {
  CUSTOMER_SERVICE: 'ROLE_CUSTOMER_SERVICE',
  // Add other roles as your backend defines them, e.g.:
  // ADMIN: 'ROLE_ADMIN',
  // USER: 'ROLE_USER',
}

/**
 * Resolve the role string from the user object (supports role as string or { name }).
 * @param {Object} user - User object from auth (e.g. getUser())
 * @returns {string} Role name or empty string
 */
export function getRoleName(user) {
  if (!user) return ''
  return user?.role?.name || user?.role || ''
}
