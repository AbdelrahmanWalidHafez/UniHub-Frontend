import React, { useState } from 'react'
import { login } from '../utils/auth'
import { authGet } from '../utils/api'

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

	const valid = form.email && isValidEmail(form.email) && form.password.length >= 6

	async function fetchUserInfo(accessToken) {
		try {
			// Use authGet which calls http://localhost:8083/api/v1/auth/user-info
			const userInfo = await authGet('user-info')
			return userInfo
		} catch (err) {
			console.error('Failed to fetch user info:', err)
			throw err
		}
	}

	async function handleSubmit(e) {
		e.preventDefault()
		if (!valid || loading) return
		setLoading(true)
		setError('')

		try {
			// Step 1: Login and get JWT tokens
			const result = await login(form.email, form.password)
			const accessToken = result.tokens.accessToken
			
			console.log('Login successful, token obtained')
			setForm({ email: '', password: '' })

			// Step 2: Fetch user info using the access token (now it's in localStorage via setTokens)
			const userInfo = await fetchUserInfo(accessToken)
			console.log('User info fetched - Full object:', JSON.stringify(userInfo, null, 2))
			console.log('User info keys:', Object.keys(userInfo))

			// Step 3: Save user info to localStorage for future use
			localStorage.setItem('userInfo', JSON.stringify(userInfo))
			localStorage.setItem('user', JSON.stringify(userInfo))

			// Step 4: Call onLoginSuccess to handle redirect
			if (onLoginSuccess) onLoginSuccess(userInfo)
		} catch (err) {
			console.error('Login error:', err)
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
									aria-invalid={form.email && !isValidEmail(form.email)}
								/>
								<div className="field-help">
									{form.email && !isValidEmail(form.email) ? 'Enter a valid email address' : ''}
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
									aria-invalid={form.password && form.password.length < 6}
								/>
								<div className="field-help">
									{form.password && form.password.length < 6 ? 'Password must be at least 6 characters' : ''}
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
							By signing in, you agree to our Terms of Service and Privacy Policy
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
