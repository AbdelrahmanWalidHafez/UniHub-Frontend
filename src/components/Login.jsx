import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '../utils/auth'
import { authGet } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import { ENABLE_LOGGING } from '../utils/config'
import { ROUTES } from '../constants/routes'

export default function Login({ onLoginSuccess }) {
	const { setAccessToken } = useAuth()
	const [form, setForm] = useState({ email: '', password: '' })
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [showPassword, setShowPassword] = useState(false)
	const navigate = useNavigate()

	function handleNavTo(path) {
		setTimeout(() => navigate(path), 380)
	}

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

	async function fetchUserInfo() {
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
			// Login now stores the access token in the auth context automatically
			// and refresh token is in HttpOnly cookie
			setForm({ email: '', password: '' })

			const userInfo = await fetchUserInfo()
			localStorage.setItem('userInfo', JSON.stringify(userInfo))

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
					{/* floating orbs */}
					<div className="ll-orb ll-orb-1" />
					<div className="ll-orb ll-orb-2" />
					<div className="ll-orb ll-orb-3" />

					<div className="ll-content">
						{/* logo badge */}
						<div className="ll-badge">
							<img src="/logo.png" alt="UniHub" className="ll-badge-img" />
							<span className="ll-badge-name">UniHub Platform</span>
						</div>

						{/* headline */}
						<div className="ll-headline">
							<div className="ll-headline-line">Your campus,</div>
							<div className="ll-headline-line ll-headline-lime">reimagined.</div>
						</div>

						<p className="ll-tagline">One platform. Every tool your university needs — from classrooms to conversations.</p>

						{/* feature grid */}
						<div className="ll-features">
							<div className="ll-feat">
								<div className="ll-feat-dot" />
								<span>Messages that hit different — rooms, threads &amp; vibes</span>
							</div>
							<div className="ll-feat">
								<div className="ll-feat-dot" />
								<span>See your professor's face, not just their slides</span>
							</div>
							<div className="ll-feat">
								<div className="ll-feat-dot" />
								<span>Lumos knows the answer before you finish typing</span>
							</div>
							<div className="ll-feat">
								<div className="ll-feat-dot" />
								<span>Deadlines don't stand a chance against this dashboard</span>
							</div>
						</div>

						{/* stats */}
						<div className="ll-stats">
							<div className="ll-stat">
								<div className="ll-stat-val">50K+</div>
								<div className="ll-stat-lbl">Students</div>
							</div>
							<div className="ll-stat-div" />
							<div className="ll-stat">
								<div className="ll-stat-val">200+</div>
								<div className="ll-stat-lbl">Universities</div>
							</div>
							<div className="ll-stat-div" />
							<div className="ll-stat">
								<div className="ll-stat-val">99%</div>
								<div className="ll-stat-lbl">Uptime</div>
							</div>
						</div>
					</div>
				</div>

				<div className="login-right">
					<div className="ll-right-orb ll-right-orb-1" />
					<div className="ll-right-orb ll-right-orb-2" />
					<div className="login-form-container">
						<div className="ll-right-logo-wrap">
							<img src="/logo.png" alt="UniHub" className="ll-right-logo" />
						</div>
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

							<label style={{ display: 'block' }}>
								Password
								<div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
									<input
										name="password"
										type={showPassword ? 'text' : 'password'}
										value={form.password}
										onChange={handleChange}
										placeholder="password"
										aria-invalid={form.password.trim() === ''}
										style={{ paddingRight: 44, width: '100%', boxSizing: 'border-box', minHeight: 44, lineHeight: 'normal', display: 'block' }}
									/>
									<button
										type="button"
										onClick={(e) => { e.preventDefault(); setShowPassword((v) => !v); }}
										style={{
											marginLeft: -38,
											background: 'none',
											border: 'none',
											cursor: 'pointer',
											padding: 0,
											color: '#555',
											fontSize: 18,
											display: 'flex',
											alignItems: 'center',
											height: 44,
											width: 34,
											justifyContent: 'center',
											zIndex: 2
										}}
										aria-label={showPassword ? 'Hide password' : 'Show password'}
									>
										{showPassword ? (
										  <img src="/hidden.png" alt="Hide password" width={22} height={22} style={{ display: 'block' }} />
										) : (
										  <img src="/eye.png" alt="Show password" width={22} height={22} style={{ display: 'block' }} />
										)}
									</button>
								</div>
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

						<div className="login-forgot">
						Is your account active? <Link to={ROUTES.ACTIVATE_ACCOUNT} className="change-password-link">Activate here</Link>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
