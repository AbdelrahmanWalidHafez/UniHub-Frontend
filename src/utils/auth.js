import { AUTH_API_BASE_URL, AUTH_REQUEST_TIMEOUT, LOGOUT_TIMEOUT, TOKEN_REFRESH_BUFFER_MS, ENABLE_LOGGING } from './config'

/**
 * Auth module: login, refresh, logout, and token/user storage.
 *
 * Storage: Access token, refresh token, and user object are stored in localStorage.
 * - Pros: Simple, works across tabs, survives refresh.
 * - Security: localStorage is readable by any script on the same origin (XSS). Mitigate by:
 *   (1) Sanitizing inputs and using CSP, (2) Short-lived access tokens and refresh rotation,
 *   (3) Backend enforcing auth on every request (never trust the client).
 * For higher security, consider httpOnly cookies for tokens (requires backend support).
 */

let refreshPromise = null
let isRefreshing = false

export function setTokens(accessToken, refreshToken) {
	try {
		if (!accessToken || !refreshToken) {
			throw new Error('Tokens cannot be null or undefined')
		}
		localStorage.setItem('accessToken', accessToken)
		localStorage.setItem('refreshToken', refreshToken)
	} catch (error) {
		if (ENABLE_LOGGING) {
			console.error('Failed to store tokens:', error)
		}
		throw new Error('Failed to store authentication tokens')
	}
}

export function getAccessToken() {
	try {
		return localStorage.getItem('accessToken')
	} catch (error) {
		if (ENABLE_LOGGING) {
			console.error('Failed to get access token:', error)
		}
		return null
	}
}

export function getRefreshToken() {
	try {
		return localStorage.getItem('refreshToken')
	} catch (error) {
		if (ENABLE_LOGGING) {
			console.error('Failed to get refresh token:', error)
		}
		return null
	}
}

export function clearAuth() {
	try {
		localStorage.removeItem('accessToken')
		localStorage.removeItem('refreshToken')
		localStorage.removeItem('user')
		localStorage.removeItem('userInfo')
	} catch (error) {
		if (ENABLE_LOGGING) {
			console.error('Failed to clear auth data:', error)
		}
	}
}

export function setUser(user) {
	try {
		if (user) {
			localStorage.setItem('user', JSON.stringify(user))
		}
	} catch (error) {
		if (ENABLE_LOGGING) {
			console.error('Failed to store user:', error)
		}
	}
}

export function getUser() {
	try {
		const user = localStorage.getItem('user')
		return user ? JSON.parse(user) : null
	} catch (error) {
		if (ENABLE_LOGGING) {
			console.error('Failed to get user:', error)
		}
		return null
	}
}

function extractToken(tokenObj) {
	if (!tokenObj) return null
	if (typeof tokenObj === 'string') return tokenObj
	if (tokenObj.token) return tokenObj.token
	if (tokenObj.access_token) return tokenObj.access_token
	if (tokenObj.refresh_token) return tokenObj.refresh_token
	return null
}

function isTokenExpired(token) {
	if (!token) return true
	try {
		const parts = token.split('.')
		if (parts.length !== 3) return false
		
		const payload = JSON.parse(atob(parts[1]))
		const exp = payload.exp * 1000
		return Date.now() >= exp
	} catch {
		return false
	}
}

export function shouldRefreshToken() {
	const token = getAccessToken()
	if (!token) return false
	
	try {
		const parts = token.split('.')
		if (parts.length !== 3) return false
		
		const payload = JSON.parse(atob(parts[1]))
		const exp = payload.exp * 1000
		return Date.now() >= (exp - TOKEN_REFRESH_BUFFER_MS)
	} catch {
		return false
	}
}

export async function login(email, password) {
	const loginUrl = `${AUTH_API_BASE_URL}/login`

	try {
		const controller = new AbortController()
		const timeoutId = setTimeout(() => controller.abort(), AUTH_REQUEST_TIMEOUT)

		const response = await fetch(loginUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				email,
				password,
			}),
			signal: controller.signal,
		})

		clearTimeout(timeoutId)

		if (!response.ok) {
			let errorData
			try {
				errorData = await response.json()
			} catch {
				errorData = { message: `HTTP ${response.status}: ${response.statusText}` }
			}
			throw new Error(errorData.message || errorData.error || 'Login failed')
		}

		const data = await response.json()
		const accessToken = extractToken(data.access_token)
		const refreshToken = extractToken(data.refresh_token)

		if (!accessToken || !refreshToken) {
			throw new Error('Invalid token response from server')
		}

		setTokens(accessToken, refreshToken)
		if (data.user) {
			setUser(data.user)
		}

		return {
			tokens: {
				accessToken,
				refreshToken,
			},
			user: data.user,
		}
	} catch (error) {
		if (error.name === 'AbortError') {
			throw new Error('Request timeout. Please check your connection.')
		}
		if (error instanceof TypeError && error.message.includes('fetch')) {
			throw new Error('Network error. Please check your connection.')
		}
		throw error
	}
}

/**
 * Refresh flow: Uses refresh_token to get new access + refresh tokens.
 * Deduplicates concurrent calls (multiple 401s or shouldRefreshToken) so only one refresh runs.
 * On success: stores new tokens (and user if returned). On failure: clears auth and throws.
 */
export async function refreshTokens() {
	if (isRefreshing && refreshPromise) {
		return refreshPromise
	}

	isRefreshing = true
	refreshPromise = (async () => {
		try {
			const refreshToken = getRefreshToken()
			if (!refreshToken) {
				throw new Error('No refresh token available')
			}

			const refreshUrl = `${AUTH_API_BASE_URL}/refresh`
			const controller = new AbortController()
			const timeoutId = setTimeout(() => controller.abort(), AUTH_REQUEST_TIMEOUT)

			const response = await fetch(refreshUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					refresh_token: refreshToken,
				}),
				signal: controller.signal,
			})

			clearTimeout(timeoutId)

			if (!response.ok) {
				let errorData
				try {
					errorData = await response.json()
				} catch {
					errorData = { message: `HTTP ${response.status}: ${response.statusText}` }
				}
				clearAuth()
				throw new Error(errorData.message || errorData.error || 'Token refresh failed')
			}

			const data = await response.json()
			const newAccessToken = extractToken(data.access_token)
			const newRefreshToken = extractToken(data.refresh_token)

			if (!newAccessToken || !newRefreshToken) {
				clearAuth()
				throw new Error('Invalid token response from server')
			}

			setTokens(newAccessToken, newRefreshToken)
			if (data.user) {
				setUser(data.user)
			}

			return {
				tokens: {
					accessToken: newAccessToken,
					refreshToken: newRefreshToken,
				},
				user: data.user,
			}
		} finally {
			isRefreshing = false
			refreshPromise = null
		}
	})()

	return refreshPromise
}

export async function logout() {
	const refreshToken = getRefreshToken()
	const accessToken = getAccessToken()

	if (!refreshToken) {
		clearAuth()
		return
	}

	try {
		const logoutUrl = `${AUTH_API_BASE_URL}/logout`
		const controller = new AbortController()
		const timeoutId = setTimeout(() => controller.abort(), LOGOUT_TIMEOUT)

		const headers = {
			'Content-Type': 'application/json',
		}

		if (accessToken) {
			headers['Authorization'] = `Bearer ${accessToken}`
		}

		await fetch(logoutUrl, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				refresh_token: refreshToken,
			}),
			signal: controller.signal,
		})

		clearTimeout(timeoutId)
	} catch (err) {
		if (ENABLE_LOGGING) {
			console.error('Logout error:', err)
		}
	} finally {
		clearAuth()
	}
}

export async function getUserInfo() {
	const accessToken = getAccessToken()

	if (!accessToken) {
		throw new Error('No access token available')
	}

	if (isTokenExpired(accessToken)) {
		try {
			await refreshTokens()
			const newToken = getAccessToken()
			if (!newToken) {
				throw new Error('Failed to refresh token')
			}
		} catch (err) {
			clearAuth()
			throw new Error('Session expired. Please login again.')
		}
	}

	try {
		const userInfoUrl = `${AUTH_API_BASE_URL}/user-info`
		const controller = new AbortController()
		const timeoutId = setTimeout(() => controller.abort(), AUTH_REQUEST_TIMEOUT)

		const currentToken = getAccessToken()
		const response = await fetch(userInfoUrl, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${currentToken}`,
			},
			signal: controller.signal,
		})

		clearTimeout(timeoutId)

		if (!response.ok) {
			let errorData
			try {
				errorData = await response.json()
			} catch {
				errorData = { message: `HTTP ${response.status}: ${response.statusText}` }
			}
			throw new Error(errorData.message || errorData.error || 'Failed to fetch user info')
		}

		const data = await response.json()
		setUser(data)
		return data
	} catch (error) {
		if (error.name === 'AbortError') {
			throw new Error('Request timeout. Please check your connection.')
		}
		if (error instanceof TypeError && error.message.includes('fetch')) {
			throw new Error('Network error. Please check your connection.')
		}
		throw error
	}
}

export function isAuthenticated() {
	const token = getAccessToken()
	return !!token && !isTokenExpired(token)
}
