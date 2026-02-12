import React from 'react'

/**
 * Error boundary to catch React render errors and display a fallback UI.
 * Prevents the entire app from unmounting on component tree errors.
 */
export default class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            padding: '2rem',
            maxWidth: '480px',
            margin: '2rem auto',
            textAlign: 'center',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Something went wrong</h1>
          <p style={{ color: '#666', marginBottom: '1.5rem' }}>
            We're sorry. Please try refreshing the page or come back later.
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '1rem',
              cursor: 'pointer',
              background: '#007bff',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
            }}
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
