import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    proxy: {
      '/api/v1/auth': {
        target: 'http://34.58.11.82:8083',
        changeOrigin: true,
        cookieDomainRewrite: 'localhost',
      },
      '/api/v1/roles': {
        target: 'http://34.58.11.82:8083',
        changeOrigin: true,
        cookieDomainRewrite: 'localhost',
      },
      '/api/v1/account-management': {
        target: 'http://34.58.11.82:8083',
        changeOrigin: true,
        cookieDomainRewrite: 'localhost',
      }
    }
  }
})
