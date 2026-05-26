import React, { createContext, useState, useEffect } from 'react'
import * as auth from '../utils/auth'

export const AuthContext = createContext({
    accessToken: null,
    setAccessToken: () => {},
    login: async () => {},
    logout: async () => {},
})

export function AuthProvider({ children }) {
    const [accessToken, setAccessTokenState] = useState(null)

    // keep auth util in-memory token in sync with React state
    function setAccessToken(token) {
        auth.setAccessToken(token)
        setAccessTokenState(token)
    }

    async function login(email, password) {
        const result = await auth.login(email, password)
        if (result && result.tokens && result.tokens.accessToken) {
            setAccessToken(result.tokens.accessToken)
        }
        return result
    }

    async function logout() {
        await auth.logout()
        setAccessToken(null)
    }

    // Try to refresh on mount if a refresh token exists
    useEffect(() => {
        let mounted = true
        async function tryRefresh() {
            const refreshToken = auth.getRefreshToken()
            if (!refreshToken) return
            try {
                const data = await auth.refreshTokens()
                if (mounted && data && data.tokens && data.tokens.accessToken) {
                    setAccessToken(data.tokens.accessToken)
                }
            } catch (err) {
                // fail silently; app can show login UI
                if (auth.ENABLE_LOGGING) {
                    console.error('Silent refresh failed:', err)
                }
            }
        }

        tryRefresh()
        return () => { mounted = false }
    }, [])

    return (
        <AuthContext.Provider value={{ accessToken, setAccessToken, login, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export default AuthProvider
