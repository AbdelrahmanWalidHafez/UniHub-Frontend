import { getAccessToken, refreshTokens, clearAuth, shouldRefreshToken } from './auth'
import { REQUEST_TIMEOUT, API_GATEWAY_BASE_URL, ENABLE_LOGGING } from './config'

export async function apiCall(url, options = {}) {
	const { public: isPublic = false, ...fetchOptions } = options

	let fullUrl = url
	if (!url.startsWith('http://') && !url.startsWith('https://')) {
		const cleanPath = url.startsWith('/') ? url.slice(1) : url
		const baseUrl = API_GATEWAY_BASE_URL.endsWith('/') ? API_GATEWAY_BASE_URL.slice(0, -1) : API_GATEWAY_BASE_URL
		fullUrl = `${baseUrl}/${cleanPath}`
	}

	const defaultHeaders = {}
	// Only set JSON content-type by default when body is not FormData
	try {
		if (!(fetchOptions && fetchOptions.body instanceof FormData)) {
			defaultHeaders['Content-Type'] = 'application/json'
		}
	} catch (e) {
		// in some environments fetchOptions.body may be a blob-like; default to JSON
		defaultHeaders['Content-Type'] = 'application/json'
	}

	if (!isPublic) {
		let accessToken = getAccessToken()
		if (accessToken && shouldRefreshToken()) {
			try {
				await refreshTokens()
				accessToken = getAccessToken()
			} catch (err) {
				if (ENABLE_LOGGING) {
					console.warn('Token refresh failed, continuing with current token:', err)
				}
			}
		}
		if (accessToken) {
			defaultHeaders['Authorization'] = `Bearer ${accessToken}`
		}
	}

	const finalOptions = {
		...fetchOptions,
		headers: {
			...defaultHeaders,
			...fetchOptions.headers,
		},
		credentials: 'include', // Include HttpOnly cookies
	}

	const controller = new AbortController()
	let timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

	try {
		let response = await fetch(fullUrl, {
			...finalOptions,
			signal: controller.signal,
		})

		clearTimeout(timeoutId)
		timeoutId = null

		if (response.status === 401 && !isPublic && getAccessToken()) {
			try {
				await refreshTokens()
				const newAccessToken = getAccessToken()
				if (newAccessToken) {
					finalOptions.headers['Authorization'] = `Bearer ${newAccessToken}`
					const retryController = new AbortController()
					const retryTimeoutId = setTimeout(() => retryController.abort(), REQUEST_TIMEOUT)
					try {
						response = await fetch(fullUrl, {
							...finalOptions,
							credentials: 'include',
							signal: retryController.signal,
						})
					} finally {
						clearTimeout(retryTimeoutId)
					}
				}
			} catch (err) {
				clearAuth()
				throw new Error('Session expired. Please login again.')
			}
		}

		let data = null
		let responseText = ''
		const contentType = response.headers.get('content-type') || ''
		try {
			responseText = await response.text()
		} catch (parseError) {
			if (ENABLE_LOGGING) {
				console.error('Failed to read response body:', parseError)
			}
		}

		if (responseText && contentType.includes('application/json')) {
			try {
				data = JSON.parse(responseText)
			} catch (parseError) {
				if (ENABLE_LOGGING) {
					console.error('Failed to parse JSON response:', parseError)
				}
			}
		}

		if (!response.ok) {
			const trimmedText = responseText ? responseText.trim() : ''
			const isHtmlText = trimmedText.startsWith('<!DOCTYPE') || trimmedText.startsWith('<html')
			const firstDetailedError = Array.isArray(data?.errors) && data.errors.length > 0
				? (data.errors[0]?.message || data.errors[0])
				: ''
			const errorMessage =
				firstDetailedError ||
				data?.message ||
				data?.error ||
				data?.details ||
				(!isHtmlText && trimmedText ? trimmedText : '') ||
				`API Error: ${response.status} ${response.statusText}`
			throw new Error(errorMessage)
		}

		return data
	} catch (error) {
		if (timeoutId) clearTimeout(timeoutId)
		if (error.name === 'AbortError') {
			throw new Error('Request timeout. Please check your connection.')
		}
		if (error instanceof TypeError && error.message.includes('fetch')) {
			throw new Error('Network error. Please check your connection.')
		}
		throw error
	}
}

export async function get(url, options = {}) {
	return apiCall(url, {
		...options,
		method: 'GET',
	})
}

export async function post(url, body, options = {}) {
	return apiCall(url, {
		...options,
		method: 'POST',
		body: JSON.stringify(body),
	})
}

// Use this helper for multipart/form-data posts (FormData)
export async function formPost(url, formData, options = {}) {
	return apiCall(url, {
		...options,
		method: 'POST',
		body: formData,
	})
}

export async function put(url, body, options = {}) {
	return apiCall(url, {
		...options,
		method: 'PUT',
		body: JSON.stringify(body),
	})
}

export async function patch(url, body, options = {}) {
	return apiCall(url, {
		...options,
		method: 'PATCH',
		body: JSON.stringify(body),
	})
}

export async function deleteRequest(url, options = {}) {
	return apiCall(url, {
		...options,
		method: 'DELETE',
	})
}

export async function subscriptionGet(endpoint, options = {}) {
	const { API_GATEWAY_BASE_URL } = await import('./config.js')
	const cleanPath = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
	const fullUrl = `${API_GATEWAY_BASE_URL}/${cleanPath}`
	return apiCall(fullUrl, {
		...options,
		method: 'GET',
	})
}

export async function subscriptionPost(endpoint, data, options = {}) {
	const { API_GATEWAY_BASE_URL } = await import('./config.js')
	const cleanPath = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
	const fullUrl = `${API_GATEWAY_BASE_URL}/${cleanPath}`
	return apiCall(fullUrl, {
		...options,
		method: 'POST',
		body: JSON.stringify(data),
	})
}

export async function authGet(endpoint, options = {}) {
	const { AUTH_API_BASE_URL } = await import('./config.js')
	const cleanPath = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
	const fullUrl = `${AUTH_API_BASE_URL}/${cleanPath}`
	return apiCall(fullUrl, {
		...options,
		method: 'GET',
	})
}

export async function authPost(endpoint, data, options = {}) {
	const { AUTH_API_BASE_URL } = await import('./config.js')
	const cleanPath = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
	const fullUrl = `${AUTH_API_BASE_URL}/${cleanPath}`
	return apiCall(fullUrl, {
		...options,
		method: 'POST',
		body: JSON.stringify(data),
	})
}
export async function authPatch(endpoint, data, options = {}) {
  const { AUTH_API_BASE_URL } = await import('./config.js')
  const cleanPath = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
  const fullUrl = `${AUTH_API_BASE_URL}/${cleanPath}`
  return apiCall(fullUrl, {
    ...options,
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}
// Streaming POST — calls onChunk(text) for each streamed chunk, returns when done
export async function streamPost(url, body, { onChunk, signal } = {}) {
  const { getAccessToken, shouldRefreshToken, refreshTokens } = await import('./auth')
  const { API_GATEWAY_BASE_URL } = await import('./config')

  let fullUrl = url
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    const cleanPath = url.startsWith('/') ? url.slice(1) : url
    const baseUrl = API_GATEWAY_BASE_URL.endsWith('/') ? API_GATEWAY_BASE_URL.slice(0, -1) : API_GATEWAY_BASE_URL
    fullUrl = `${baseUrl}/${cleanPath}`
  }

  const headers = {}
  let accessToken = getAccessToken()
  if (accessToken && shouldRefreshToken()) {
    try { await refreshTokens(); accessToken = getAccessToken() } catch (_) {}
  }
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`

  // body can be FormData (voice) or URLSearchParams (text)
  if (!(body instanceof FormData)) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
  }

  const response = await fetch(fullUrl, {
    method: 'POST',
    headers,
    body,
    credentials: 'include',
    signal,
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(text || `Error ${response.status}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    // SSE events are separated by double newline
    const events = buffer.split('\n\n')
    buffer = events.pop() // keep incomplete event in buffer
    for (const event of events) {
      for (const line of event.split('\n')) {
        if (line.startsWith('data:')) {
          const text = line.slice(5) // Spring sends "data: token" with a leading space
          if (text.trim() === '[DONE]') continue
          if (onChunk) onChunk(text)
        }
      }
    }
  }
  // flush remaining buffer
  if (buffer) {
    for (const line of buffer.split('\n')) {
      if (line.startsWith('data:')) {
        const text = line.slice(5)
        if (text.trim() !== '[DONE]' && onChunk) onChunk(text)
      }
    }
  }
}

export async function getFileAsBlob(url, options = {}) {
  const { public: isPublic = false, ...fetchOptions } = options

  let fullUrl = url
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    const cleanPath = url.startsWith('/') ? url.slice(1) : url
    const baseUrl = API_GATEWAY_BASE_URL.endsWith('/') ? API_GATEWAY_BASE_URL.slice(0, -1) : API_GATEWAY_BASE_URL
    fullUrl = `${baseUrl}/${cleanPath}`
  }

  const defaultHeaders = {}

  if (!isPublic) {
    let accessToken = getAccessToken()
    if (accessToken && shouldRefreshToken()) {
      try {
        await refreshTokens()
        accessToken = getAccessToken()
      } catch (err) {
        if (ENABLE_LOGGING) {
          console.warn('Token refresh failed, continuing with current token:', err)
        }
      }
    }
    if (accessToken) {
      defaultHeaders['Authorization'] = `Bearer ${accessToken}`
    }
  }

  const finalOptions = {
    ...fetchOptions,
    headers: {
      ...defaultHeaders,
      ...fetchOptions.headers,
    },
    credentials: 'include', // Include HttpOnly cookies
  }

  const controller = new AbortController()
  let timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

  try {
    const response = await fetch(fullUrl, {
      ...finalOptions,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    timeoutId = null

    if (response.status === 401 && !isPublic && getAccessToken()) {
      try {
        await refreshTokens()
        const newAccessToken = getAccessToken()
        if (newAccessToken) {
          finalOptions.headers['Authorization'] = `Bearer ${newAccessToken}`
          const retryController = new AbortController()
          const retryTimeoutId = setTimeout(() => retryController.abort(), REQUEST_TIMEOUT)
          try {
            const retryResponse = await fetch(fullUrl, {
              ...finalOptions,
              credentials: 'include',
              signal: retryController.signal,
            })
            return await retryResponse.blob()
          } finally {
            clearTimeout(retryTimeoutId)
          }
        }
      } catch (err) {
        clearAuth()
        throw new Error('Session expired. Please login again.')
      }
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.blob()
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error('Request timeout. Please check your connection.')
    }
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error. Please check your connection.')
    }
    throw error
  }
}
