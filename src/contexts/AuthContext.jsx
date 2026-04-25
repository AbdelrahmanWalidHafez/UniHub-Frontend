import React, { createContext, useState, useContext, useEffect, useRef } from 'react'
import { initAuthFunctions, setSessionRestorePromise } from '../utils/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(null)
  const [isRestoringSession, setIsRestoringSession] = useState(true)
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user')
      return savedUser ? JSON.parse(savedUser) : null
    } catch {
      return null
    }
  })

  // Initialize auth functions once when provider mounts
  useEffect(() => {
    initAuthFunctions({
      getAccessToken: () => accessToken,
      setAccessToken: setAccessToken,
      getUser: () => user,
      setUser: setUser,
      clearAuth: () => {
        setAccessToken(null)
        setUser(null)
      }
    })
  }, [accessToken, user])

  // Attempt to restore session on mount using refresh token cookie
  useEffect(() => {
    let resolveSessionRestore
    const promise = new Promise(resolve => { resolveSessionRestore = resolve })
    setSessionRestorePromise(promise)

    async function restoreSession() {
      try {
        const { AUTH_API_BASE_URL } = await import('../utils/config')
        const { getAccessToken } = await import('../utils/auth')

        // Skip refresh if we already have a valid non-expired token
        const existingToken = getAccessToken()
        if (existingToken) {
          try {
            const parts = existingToken.split('.')
            if (parts.length === 3) {
              const payload = JSON.parse(atob(parts[1]))
              if (payload.exp && Date.now() < payload.exp * 1000) {
                return // token still valid, no need to refresh
              }
            }
          } catch {}
        }

        const response = await fetch(`${AUTH_API_BASE_URL}/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Send HttpOnly cookie
        })

        if (response.ok) {
          const data = await response.json()
          const accessTokenObj = data.access_token || data.accessToken
          if (accessTokenObj) {
            const token = accessTokenObj.access_token || accessTokenObj.accessToken
            if (token) {
              setAccessToken(token)
              if (data.user) {
                setUser(data.user)
              } else {
                // If refresh returned a token but not user payload, fetch user-info
                try {
                  const { getUserInfo } = await import('../utils/auth')
                  const info = await getUserInfo()
                  if (info) setUser(info)
                } catch (err) {
                  // ignore - user will be null until explicit login
                }
              }
            }
          }
        }
      } catch (error) {
        // Session restoration failed, user needs to login
        console.debug('Session restoration failed:', error.message)
      } finally {
        setIsRestoringSession(false)
        resolveSessionRestore()
        setSessionRestorePromise(null)
      }
    }

    restoreSession()
  }, [])

  // Persist user to localStorage when it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user))
    } else {
      localStorage.removeItem('user')
      localStorage.removeItem('userInfo')
    }
  }, [user])

  const clearAuth = () => {
    setAccessToken(null)
    setUser(null)
  }

  const value = {
    accessToken,
    setAccessToken,
    user,
    setUser,
    clearAuth,
    isRestoringSession
  }

  // Show nothing while restoring session to prevent flash of login page
  if (isRestoringSession) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontSize: '16px',
        color: '#666'
      }}>
        Loading...
      </div>
    )
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
