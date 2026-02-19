import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ROUTES } from '../constants/routes'

export default function ForgotPassword() {
  const [step, setStep] = useState('email') // 'email', 'code', or 'reset'
  const [email, setEmail] = useState('')
  const [code, setCode] = useState(Array(6).fill(''))
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  function handleEmailChange(e) {
    setEmail(e.target.value)
    setError('')
  }

  function isValidEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
  }

  const emailValid = email && isValidEmail(email.trim())

  async function handleEmailSubmit(e) {
    e.preventDefault()
    if (!emailValid || loading) return
    setLoading(true)
    setError('')

    try {
      // send email to server to request code
      console.log('requesting code for', email)
      await new Promise((r) => setTimeout(r, 500))
      setStep('code')
    } catch (err) {
      setError('Failed to send verification email. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleCodeChange(index, val) {
    if (!/^[0-9]?$/.test(val)) return
    const newCode = [...code]
    newCode[index] = val
    setCode(newCode)
    if (val && index < 5) {
      const next = document.getElementById(`code-${index + 1}`)
      if (next) next.focus()
    }
  }

  const codeFilled = code.every((d) => d !== '')

  async function handleCodeSubmit(e) {
    e.preventDefault()
    if (!codeFilled || loading) return
    setLoading(true)
    setError('')

    try {
      const entered = code.join('')
      console.log('verifying code', entered)
      await new Promise((r) => setTimeout(r, 500))
      // move to reset password step
      setStep('reset')
    } catch (err) {
      setError('Invalid code, please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="forgot-page-wrapper">
      <div className="forgot-content">
        <img src="/logo.png" alt="UniHub Logo" className="forgot-logo" />
        <div className="forgot-app-link">UniHub</div>
        {step === 'email' ? (
          <>
            <h2 className="forgot-title">Forgot your password?</h2>
            <p className="forgot-subtitle">No worries, we’ll send you reset instructions.</p>

            {error && <div className="login-error">{error}</div>}

            <form onSubmit={handleEmailSubmit} noValidate className="login-form">
              <label>
                Email address
                <input
                  name="email"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="email"
                  aria-invalid={email.trim() === '' || !isValidEmail(email)}
                />
                <div className="field-help">
                  {!email.trim()
                    ? 'Email is required'
                    : !isValidEmail(email)
                    ? 'Please enter a valid email'
                    : ''}
                </div>
              </label>

              <button
                type="submit"
                className={`login-submit-btn ${loading ? 'is-loading' : ''}`}
                disabled={!emailValid || loading}
              >
                {loading ? <span className="btn-loader" aria-hidden /> : null}
                <span>Reset Password</span>
              </button>
            </form>

            <div className="forgot-back">
              Go back to <Link to={ROUTES.LOGIN}>Login</Link> page 
            </div>
          </>
        ) : step === 'code' ? (
          <>
            <h2 className="forgot-title">Please enter your verification code</h2>
            <p className="forgot-subtitle">Check your email for a 6-digit code.</p>

            {error && <div className="login-error">{error}</div>}

            <form onSubmit={handleCodeSubmit} className="code-form">
              <div className="code-inputs">
                {code.map((digit, i) => (
                  <input
                    key={i}
                    id={`code-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(i, e.target.value)}
                    className="code-box"
                  />
                ))}
              </div>

              <button
                type="submit"
                className={`login-submit-btn ${loading ? 'is-loading' : ''}`}
                disabled={!codeFilled || loading}
              >
                {loading ? <span className="btn-loader" aria-hidden /> : null}
                <span>Send</span>
              </button>
            </form>

            <div className="forgot-back">
              If you didn't receive a code, <button type="button" className="link-button" onClick={() => setStep('email')}>Resend</button>
            </div>
          </>
        ) : (
          <>
            <div className="reset-container">
              <div className="reset-rules">
                <h2 className="forgot-title">Change Password</h2>
                <p className="forgot-subtitle">Password must contain</p>
                <div className="rule-gap" />
                <ul>
                  <li className={newPassword.length >= 8 ? 'valid' : ''}>
                    {newPassword ? (newPassword.length >= 8 ? '✔ ' : '') : ''}At least 8 characters long
                  </li>
                  <li className={/[A-Z]/.test(newPassword) ? 'valid' : ''}>
                    {newPassword ? (/[A-Z]/.test(newPassword) ? '✔ ' : '') : ''}At least 1 upper case letter (A–Z)
                  </li>
                  <li className={/[a-z]/.test(newPassword) ? 'valid' : ''}>
                    {newPassword ? (/[a-z]/.test(newPassword) ? '✔ ' : '') : ''}At least 1 lower case letter (a–z)
                  </li>
                  <li className={/[^A-Za-z0-9]/.test(newPassword) ? 'valid' : ''}>
                    {newPassword ? (/[^A-Za-z0-9]/.test(newPassword) ? '✔ ' : '') : ''}At least 1 special character
                  </li>
                  <li className={/[0-9]/.test(newPassword) ? 'valid' : ''}>
                    {newPassword ? (/[0-9]/.test(newPassword) ? '✔ ' : '') : ''}At least 1 digit (0–9)
                  </li>
                </ul>
              </div>
              <div className="reset-form">
                <form onSubmit={(e) => e.preventDefault()}>
                  <label>
                    New Password
                    <input
                      className="reset-input"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder=""
                    />
                  </label>
                  <label>
                    Confirm Password
                    <input
                      className="reset-input"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder=""
                    />
                  </label>
                  <button
                    type="button"
                    className="login-submit-btn"
                    disabled={
                      !(
                        newPassword === confirmPassword &&
                        newPassword.length >= 8 &&
                        /[A-Z]/.test(newPassword) &&
                        /[a-z]/.test(newPassword) &&
                        /[^A-Za-z0-9]/.test(newPassword) &&
                        /[0-9]/.test(newPassword)
                      )
                    }
                    onClick={() => {
                      // TODO: call API to update password
                      console.log('password changed to', newPassword)
                      navigate(ROUTES.LOGIN, { replace: true, state: { passwordChanged: true } })
                    }}
                  >
                    Reset Password
                  </button>

                  <div className="forgot-back" style={{marginTop:12}}>
                    Go back to <Link to={ROUTES.LOGIN}>Login</Link> page
                  </div>
                </form>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
