import { defineConfig } from 'vite'

export default defineConfig({
  define: {
    // sockjs-client expects a Node-like `global`
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['sockjs-client'],
  },
  server: {
    proxy: {
      // API Gateway (REST) + Chat service routes under /unihub
      '/unihub': {
        target: 'http://34.58.11.82:8082',
        changeOrigin: true,
      },
      '/api/v1/auth': {
        target: 'http://34.136.140.99:8083',
        changeOrigin: true,
        cookieDomainRewrite: 'localhost',
      },
      '/api/v1/roles': {
        target: 'http://34.136.140.99:8083',
        changeOrigin: true,
        cookieDomainRewrite: 'localhost',
      },
      '/api/v1/account-management': {
        target: 'http://34.136.140.99:8083',
        changeOrigin: true,
        cookieDomainRewrite: 'localhost',
      },
      '/unihub/chat/ws': {
        target: 'http://34.58.11.82:8082',
        changeOrigin: true,
        ws: true,
      },
    }
  }
})
