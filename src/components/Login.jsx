import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { login } from '../utils/auth'
import { authGet } from '../utils/api'
import { ENABLE_LOGGING } from '../utils/config'
import { ROUTES } from '../constants/routes'

export default function Login({ onLoginSuccess }) {
	const [form, setForm] = useState({ email: '', password: '' })
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')

	function handleChange(e) {
		const { name, value } = e.target
		setForm((s) => ({ ...s, [name]: value }))
		setError('')
	}

	function isValidEmail(v) {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
	}

	// Only require non-empty values for submission. Other format checks removed.
	const valid = form.email && form.email.trim() !== '' && form.password && form.password.trim() !== ''

	async function fetchUserInfo(accessToken) {
		try {
			const userInfo = await authGet('user-info')
			return userInfo
		} catch (err) {
			if (ENABLE_LOGGING) {
				console.error('Failed to fetch user info:', err)
			}
			throw err
		}
	}

	async function handleSubmit(e) {
		e.preventDefault()
		if (!valid || loading) return
		setLoading(true)
		setError('')

		try {
			const result = await login(form.email, form.password)
			const accessToken = result.tokens.accessToken
			setForm({ email: '', password: '' })

			const userInfo = await fetchUserInfo(accessToken)
			localStorage.setItem('userInfo', JSON.stringify(userInfo))
			localStorage.setItem('user', JSON.stringify(userInfo))

			if (ENABLE_LOGGING) {
				console.debug('Login success, user:', userInfo?.email ?? userInfo?.name)
			}
			if (onLoginSuccess) onLoginSuccess(userInfo)
		} catch (err) {
			setError(err.message || 'An error occurred during login. Please try again.')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="login-page-wrapper">
			<div className="login-page">
				<div className="login-left">
					<div className="login-logo-container">
						<img src="/logo.png" alt="UniHub Logo" className="login-logo" />
					</div>
					<div className="login-branding">
						<h1>UniHub</h1>
						<p>Connecting Knowledge, Empowering Minds.</p>
					</div>
				</div>

				<div className="login-right">
					<div className="login-form-container">
						<h2>Welcome Back</h2>
						<p className="login-subtitle">Sign in to your UniHub account</p>

						{error && (
							<div className="login-error">
								{error}
							</div>
						)}

						<form className="login-form" onSubmit={handleSubmit} noValidate>
							<label>
								Email Address
								<input
									name="email"
									type="email"
									value={form.email}
									onChange={handleChange}
									placeholder="email"
									aria-invalid={form.email.trim() === ''}
								/>
								<div className="field-help">
									{form.email.trim() === '' ? 'Email is required' : ''}
								</div>
							</label>

							<label>
								Password
								<input
									name="password"
									type="password"
									value={form.password}
									onChange={handleChange}
									placeholder="password"
									aria-invalid={form.password.trim() === ''}
								/>
								<div className="field-help">
									{form.password.trim() === '' ? 'Password is required' : ''}
								</div>
							</label>

							<button
								type="submit"
								className={`login-submit-btn ${loading ? 'is-loading' : ''}`}
								disabled={!valid || loading}
							>
								{loading ? (
									<span className="btn-loader" aria-hidden></span>
								) : null}
								<span>Log In</span>
							</button>
						</form>

						<div className="login-legal">
							By signing in, you agree to our Terms of Service and Privacy Policy.
						</div>

						<div className="login-forgot">
						Forgot your password? <Link to={ROUTES.FORGOT_PASSWORD} className="change-password-link">Change password</Link>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
