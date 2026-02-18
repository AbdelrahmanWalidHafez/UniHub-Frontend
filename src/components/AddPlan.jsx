import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { post } from '../utils/api'
import { ROUTES } from '../constants/routes'
import { logout } from '../utils/auth'

export default function AddPlan({ onGoBack }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({ planName: '', description: '', price: '', maxUsers: '' })
  const [warning, setWarning] = useState('')
  const [errors, setErrors] = useState({ planName: '', description: '', price: '', maxUsers: '' })
  const [loading, setLoading] = useState(false)

  const handleCancel = () => {
    if (onGoBack) return onGoBack()
    navigate(ROUTES.CUSTOMER_SERVICE)
  }

  const handleLogout = async () => {
    await logout()
    navigate(ROUTES.LOGIN)
  }

  function validateForm() {
    const next = { planName: '', description: '', price: '', maxUsers: '' }

    // planName: NotBlank, size 3-50, letters and spaces only
    const name = (form.planName || '').trim()
    if (!name) next.planName = 'Plan name must not be empty'
    else if (name.length < 3 || name.length > 50) next.planName = 'Plan name must be between 3 and 50 characters'
    else if (!/^[A-Za-z ]+$/.test(name)) next.planName = 'Plan name must contain letters and spaces only'

    
    const desc = (form.description || '').trim()
    if (!desc) next.description = 'Plan description must not be empty'
    else if (desc.length < 10 || desc.length > 200) next.description = 'Plan description must be between 10 and 200 characters'

    
    const priceVal = Number(form.price)
    if (form.price === '' || isNaN(priceVal)) next.price = 'Price is required and must be a number'
    else if (!Number.isInteger(priceVal)) next.price = 'Price must be an integer (smallest currency unit)'
    else if (priceVal < 1) next.price = 'Price must be at least 1'

    
    const maxVal = Number(form.maxUsers)
    if (form.maxUsers === '' || isNaN(maxVal)) next.maxUsers = 'Max users is required and must be a number'
    else if (!Number.isInteger(maxVal)) next.maxUsers = 'Max users must be an integer'
    else if (maxVal < 1) next.maxUsers = 'Max user amount must be at least 1'
    else if (maxVal > 1000000) next.maxUsers = 'Max user amount is too large'

    setErrors(next)
    return !next.planName && !next.description && !next.price && !next.maxUsers
  }

  const handleCreate = async () => {
    setWarning('')
    if (!validateForm()) return

    setLoading(true)
    try {
      const payload = {
        subscription_plan_name: form.planName.trim(),
        subscription_plan_description: form.description.trim(),
        price: Number(form.price),
        subscription_plan_max_user_amount: Number(form.maxUsers)
      }

      const res = await post('subscription/api/v1/subscription-plans/customer-service/create', payload)
      if (res && res.subscription_plan_id) {
        navigate(ROUTES.CUSTOMER_SERVICE, { state: { message: 'Subscription plan created' } })
      } else {
        setWarning(res?.warn || 'Created, but unexpected response')
      }
      } catch (err) {
      setWarning(err?.message || 'Failed to create plan')
    } finally {
      setLoading(false)
    }
  }

  const labelStyle = { fontSize: 13, color: '#6B7280', marginBottom: 8 }

  return (
    <>
      <header className="navbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 40px', borderBottom: '1px solid #e0e0e0' }}>
        <div style={{ flex: 1 }}></div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <button
            onClick={() => navigate(ROUTES.CUSTOMER_SERVICE)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <img src="/logo.png" alt="UniHub Logo" style={{ height: '40px' }} />
          </button>
        </div>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              color: '#666'
            }}
            title="Logout"
          >
            <img src="/logout.png" alt="Logout" style={{ width: 20, height: 20 }} />
          </button>
        </div>
      </header>

      <div className="subscription-request-page">
        <main className="subscription-request-main">
          <section className="subscription-request" aria-label="Add subscription plan">
            <div className="subscription-request-inner">
              <div className="subscription-header">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button onClick={() => (onGoBack ? onGoBack() : navigate(-1))} style={{ width: 40, height: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, border: '1px solid #e6e8f0', background: '#fff', cursor: 'pointer' }} aria-label="Back">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M15 18L9 12L15 6" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <h2 style={{ margin: 0 }}>Add subscription plan</h2>
                      <p style={{ margin: 0, color: '#667085' }}>Create a new subscription plan for your institution.</p>
                    </div>
                  </div>
                </div>
              </div>

              <form className="subscription-form" onSubmit={(e) => { e.preventDefault(); handleCreate() }}>
                {warning && (
                  <div className="form-error-message" style={{ background: '#FFFBEB', border: '1px solid #FDE68A', padding: 12, borderRadius: 8, color: '#92400E' }}>
                    {warning}
                  </div>
                )}

                <div className="form-section-group">
                  <h3 className="form-section-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ width: 4, height: 28, background: '#9DD957', borderRadius: 2, display: 'inline-block' }} />
                    <span>Plan details</span>
                  </h3>
                  <div className="subscription-grid" style={{ gridTemplateColumns: '1fr' }}>
                    <label>
                      Plan name
                      <input
                        name="planName"
                        value={form.planName}
                        onChange={(e) => setForm({ ...form, planName: e.target.value })}
                        placeholder="e.g. Professional Plan"
                      />
                      <div className="field-help">{errors.planName}</div>
                    </label>

                    <label>
                      Description
                      <textarea
                        name="description"
                        className="subscription-textarea"
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        rows={5}
                        placeholder="Short summary of the plan"
                      />
                      <div className="field-help">{errors.description}</div>
                    </label>

                    <label>
                      Price (yearly)
                      <input
                        name="price"
                        value={form.price}
                        onChange={(e) => setForm({ ...form, price: e.target.value })}
                        placeholder="0"
                      />
                      <div className="field-help">{errors.price}</div>
                    </label>

                    <label>
                      Max users
                      <input
                        name="maxUsers"
                        value={form.maxUsers}
                        onChange={(e) => setForm({ ...form, maxUsers: e.target.value })}
                        placeholder="e.g. 50"
                      />
                      <div className="field-help">{errors.maxUsers}</div>
                    </label>

                  </div>
                </div>

                <div className="subscription-actions">
                  <button
                    type="submit"
                    className={`submit-btn ${loading || !form.planName || isNaN(Number(form.price)) || isNaN(Number(form.maxUsers)) ? 'is-disabled' : ''} ${loading ? 'is-loading' : ''}`}
                    style={{ background: '#9DD957', color: '#fff' }}
                    disabled={loading || !form.planName || isNaN(Number(form.price)) || isNaN(Number(form.maxUsers))}
                  >
                    {loading ? <><span className="spinner"></span> Creating...</> : 'Create plan'}
                  </button>
                </div>
              </form>
            </div>
          </section>
        </main>
      </div>
    </>
  )
}
