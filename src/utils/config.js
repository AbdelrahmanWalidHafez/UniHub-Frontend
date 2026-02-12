// In production, set VITE_AUTH_API_BASE_URL and VITE_API_GATEWAY_BASE_URL in your environment.
export const AUTH_API_BASE_URL = import.meta.env.VITE_AUTH_API_BASE_URL || 'http://localhost:8083/api/v1/auth'

export const API_GATEWAY_BASE_URL = import.meta.env.VITE_API_GATEWAY_BASE_URL || 'http://localhost:8082/unihub'

export const REQUEST_TIMEOUT = parseInt(import.meta.env.VITE_REQUEST_TIMEOUT_MS || '30000', 10)

export const AUTH_REQUEST_TIMEOUT = parseInt(import.meta.env.VITE_AUTH_REQUEST_TIMEOUT_MS || '10000', 10)

export const LOGOUT_TIMEOUT = 5000

export const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000

export const MOUNT_ANIMATION_DELAY = 40

export const IS_DEVELOPMENT = import.meta.env.DEV
export const IS_PRODUCTION = import.meta.env.PROD

export const ENABLE_LOGGING = IS_DEVELOPMENT || import.meta.env.VITE_ENABLE_LOGGING === 'true'
