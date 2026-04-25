import { AUTH_API_BASE_URL, AUTH_REQUEST_TIMEOUT, LOGOUT_TIMEOUT, TOKEN_REFRESH_BUFFER_MS, ENABLE_LOGGING } from './config'

let refreshPromise = null
let isRefreshing = false
let lastRefreshedAt = 0
let sessionRestorePromise = null

export function setSessionRestorePromise(p) {
	sessionRestorePromise = p
}

// Module-level storage for auth context functions (injected by AuthProvider)
let getAccessTokenFn = null
let setAccessTokenFn = null
let getUserFn = null
let setUserFn = null
let clearAuthFn = null

// Initialize auth functions from AuthContext
export function initAuthFunctions({ getAccessToken, setAccessToken, getUser, setUser, clearAuth }) {
	getAccessTokenFn = getAccessToken
	setAccessTokenFn = setAccessToken
	getUserFn = getUser
	setUserFn = setUser
	clearAuthFn = clearAuth
}

export function getAccessToken() {
	return getAccessTokenFn ? getAccessTokenFn() : null
}

export function setAccessToken(token) {
	if (setAccessTokenFn) {
		setAccessTokenFn(token)
	}
}

export function clearAuth() {
	if (clearAuthFn) {
		clearAuthFn()
	} else {
		// Fallback for edge cases
		localStorage.removeItem('user')
		localStorage.removeItem('userInfo')
	}
}

export function setUser(user) {
	if (setUserFn) {
		setUserFn(user)
	} else {
		// Fallback for edge cases
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
}

export function getUser() {
	if (getUserFn) {
		return getUserFn()
	}
	// Fallback for edge cases
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
			credentials: 'include', // Include HttpOnly cookies
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
			const firstError = Array.isArray(errorData?.errors) && errorData.errors.length > 0 ? errorData.errors[0] : null
			throw new Error(firstError || errorData.message || errorData.error || 'Login failed')
		}

		const data = await response.json()
		
		// Extract access token from nested structure
		// Response: { access_token: { access_token: "jwt", token_type: "Bearer", expires_in: 3600 } }
		const accessTokenObj = data.access_token || data.accessToken
		if (!accessTokenObj) {
			throw new Error('Invalid token response from server')
		}
		
		const accessToken = accessTokenObj.access_token || accessTokenObj.accessToken
		if (!accessToken) {
			throw new Error('Invalid token response from server')
		}

		// Store access token in context (refresh token is in HttpOnly cookie)
		setAccessToken(accessToken)
		
		if (data.user) {
			setUser(data.user)
		}

		return {
			accessToken,
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

export async function refreshTokens() {
	// Wait for session restore to finish first — prevents racing with restoreSession()
	if (sessionRestorePromise) {
		await sessionRestorePromise
	}

	if (isRefreshing && refreshPromise) {
		return refreshPromise
	}

	// If a refresh completed in the last 10 seconds, skip — token is already fresh
	if (Date.now() - lastRefreshedAt < 10000) {
		return { accessToken: getAccessToken() }
	}

	isRefreshing = true
	refreshPromise = (async () => {
		try {
			const refreshUrl = `${AUTH_API_BASE_URL}/refresh`
			const controller = new AbortController()
			const timeoutId = setTimeout(() => controller.abort(), AUTH_REQUEST_TIMEOUT)

			// Refresh token is sent automatically via HttpOnly cookie
			const response = await fetch(refreshUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				credentials: 'include', // Include HttpOnly cookies
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
			
			// Extract new access token from nested structure
			const accessTokenObj = data.access_token || data.accessToken
			if (!accessTokenObj) {
				clearAuth()
				throw new Error('Invalid token response from server')
			}
			
			const newAccessToken = accessTokenObj.access_token || accessTokenObj.accessToken
			if (!newAccessToken) {
				clearAuth()
				throw new Error('Invalid token response from server')
			}

			// Store new access token (refresh token is updated in HttpOnly cookie by backend)
			setAccessToken(newAccessToken)
			lastRefreshedAt = Date.now()

			if (data.user) {
				setUser(data.user)
			}

			return {
				accessToken: newAccessToken,
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
	const accessToken = getAccessToken()

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

		// Refresh token is sent automatically via HttpOnly cookie
		await fetch(logoutUrl, {
			method: 'POST',
			headers,
			credentials: 'include', // Include HttpOnly cookies
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
			credentials: 'include', // Include HttpOnly cookies
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
