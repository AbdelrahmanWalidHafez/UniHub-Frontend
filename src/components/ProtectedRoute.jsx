import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { ROUTES } from '../constants/routes'
import { isAuthenticated, getUser } from '../utils/auth'
import { getRoleName, ROLES } from '../constants/roles'

/**
 * Protects routes by requiring authentication and optionally role checks.
 * - If not authenticated → redirect to login (with return URL in state).
 * - allowedRoles: if set, only these roles can access; others redirect to role-specific default.
 * - disallowedRoles: if set, these roles are redirected away (e.g. dashboard disallows customer service).
 */
export default function ProtectedRoute({ children, allowedRoles = null, disallowedRoles = null }) {
  const location = useLocation()
  const authenticated = isAuthenticated()
  const user = getUser()
  const roleName = getRoleName(user)

  if (!authenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location.pathname }} replace />
  }

  if (Array.isArray(disallowedRoles) && disallowedRoles.includes(roleName)) {
    if (roleName === ROLES.CUSTOMER_SERVICE) {
      return <Navigate to={ROUTES.CUSTOMER_SERVICE} replace />
    }
    return <Navigate to={ROUTES.DASHBOARD} replace />
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0 && !allowedRoles.includes(roleName)) {
    if (roleName === ROLES.CUSTOMER_SERVICE) {
      return <Navigate to={ROUTES.CUSTOMER_SERVICE} replace />
    }
    return <Navigate to={ROUTES.DASHBOARD} replace />
  }

  return children
}
