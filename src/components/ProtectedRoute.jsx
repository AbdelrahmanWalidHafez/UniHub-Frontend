import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { ROUTES } from '../constants/routes'
import { useAuth } from '../contexts/AuthContext'
import { getRoleName, ROLES } from '../constants/roles'


export default function ProtectedRoute({ children, allowedRoles = null, disallowedRoles = null }) {
  const location = useLocation()
  const { accessToken, user, isRestoringSession } = useAuth()
  const authenticated = !!accessToken
  const roleName = getRoleName(user)

  // Don't redirect while checking for existing session
  if (isRestoringSession) {
    return null
  }

  if (!authenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location.pathname }} replace />
  }

  if (Array.isArray(disallowedRoles) && disallowedRoles.includes(roleName)) {
    if (roleName === ROLES.CUSTOMER_SERVICE) {
      return <Navigate to={ROUTES.CUSTOMER_SERVICE} replace />
    }
    if (roleName === ROLES.SYSTEM_ADMIN) {
      return <Navigate to={ROUTES.UNIVERSITY_ADMIN} replace />
    }
    return <Navigate to={ROUTES.DASHBOARD} replace />
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0 && !allowedRoles.includes(roleName)) {
    if (roleName === ROLES.CUSTOMER_SERVICE) {
      return <Navigate to={ROUTES.CUSTOMER_SERVICE} replace />
    }
    if (roleName === ROLES.SYSTEM_ADMIN) {
      return <Navigate to={ROUTES.UNIVERSITY_ADMIN} replace />
    }
    return <Navigate to={ROUTES.DASHBOARD} replace />
  }

  return children
}
