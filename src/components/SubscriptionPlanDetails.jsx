import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { get, put, deleteRequest } from '../utils/api'
import { logout, getUser } from '../utils/auth'
import { getRoleName, ROLES } from '../constants/roles'
import { post } from '../utils/api'
import { parseAsCairo } from '../utils/timezone'
import { ROUTES } from '../constants/routes'
import ConfirmationModal from './ConfirmationModal'
import { formatInCairo } from '../utils/timezone'

export default function SubscriptionPlanDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = getUser()

  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [form, setForm] = useState({ planName: '', description: '', price: '', maxUsers: '' })

  useEffect(() => {
    fetchPlan()
  }, [id])

  async function fetchPlan() {
    setLoading(true)
    setError('')
    try {
      const data = await get(`subscription/api/v1/subscription-plans/admin/${id}`)
      setPlan(data)
      if (data) {
        setForm({
          planName: data.subscription_plan_name || '',
          description: data.subscription_plan_description || '',
          price: data.subscription_plan_price ?? '',
          maxUsers: data.subscription_plan_max_user_amount ?? ''
        })
        if (data.warn) setWarning(data.warn)
        else setWarning('')
      }
    } catch (err) {
      setError(err.message || 'Failed to load subscription plan')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate(ROUTES.HOME)
  }

  const userRole = getRoleName(user)
  const isSystemAdmin = userRole === ROLES.SYSTEM_ADMIN
  const [subscribedPlanId, setSubscribedPlanId] = useState(
    user?.university?.subscription_plan?.subscription_plan_id ||
    user?.university?.subscription_plan?.plan_id ||
    user?.university?.subscription_plan_id ||
    user?.university?.subscriptionPlanId ||
    user?.university?.current_subscription_plan_id ||
    null
  )
  const isCurrentPlan = subscribedPlanId && String(subscribedPlanId) === String(id)
  const [isSubscribedActive, setIsSubscribedActive] = useState(false)
  const isCurrentPlanActive = isCurrentPlan && isSubscribedActive

  useEffect(() => {
    async function fetchUniversitySubscription() {
      const uid = user?.university?.tid || user?.university?.uid || user?.universityId
      if (!uid) return
      try {
        const data = await get(`universitymanagement/api/v1/get-university/${uid}`)
        const pid = data?.subscription_plan?.plan_id || data?.subscription_plan?.planId || data?.subscription_plan_id || (data?.subscription_plan && (data.subscription_plan.record_id || data.subscription_plan.plan_id)) || data?.subscriptionPlanNormalized?.plan_id
        if (pid) setSubscribedPlanId(pid)
        const start = data?.subscription_plan?.start_date || data?.subscription_plan?.startDate || data?.subscriptionPlanNormalized?.start_date
        const end = data?.subscription_plan?.end_date || data?.subscription_plan?.endDate || data?.subscriptionPlanNormalized?.end_date
        const now = Date.now()
        const startTs = start ? (parseAsCairo(start) ?? 0) : 0
        const endTs = end ? (parseAsCairo(end) ?? Infinity) : Infinity
        setIsSubscribedActive(now >= startTs && now <= endTs)
      } catch (err) {
        // silently ignore
      }
    }
    fetchUniversitySubscription()
  }, [subscribedPlanId, user])

  const handleBuy = async () => {
    try {
      // store chosen plan id and action so success page can finalize
      localStorage.setItem('checkout_plan_id', id)
      // if university already has an active subscribed plan, treat as upgrade; otherwise it's a new set/renewal
      localStorage.setItem('checkout_action', (subscribedPlanId && isSubscribedActive) ? 'upgrade' : 'set')
      // call create-session endpoint
      const resp = await post(`subscription/api/v1/system-admin/stripe/create-session/${id}`, {})
      const sessionUrl = resp?.session_url || resp?.sessionUrl || resp?.session_id
      if (sessionUrl) {
        window.location.href = sessionUrl
      } else if (resp?.session_url) {
        window.location.href = resp.session_url
      } else {
        alert('Failed to start checkout session')
      }
    } catch (err) {
      console.error('Create session failed', err)
      alert(err.message || 'Failed to start checkout session')
    }
  }

  const formatDate = (dateString) => {
    return formatInCairo(dateString, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const handleDeleteClick = () => {
    setShowConfirmModal(true)
  }

  const handleConfirmDelete = async () => {
    setShowConfirmModal(false)
    setActionLoading(true)
    setWarning('')
    try {
      await deleteRequest(`subscription/api/v1/subscription-plans/customer-service/delete/${id}`)
      navigate('/customer-service', { state: { message: 'Subscription plan deleted successfully' } })
    } catch (err) {
      setError(err.message || 'Failed to delete plan')
    } finally {
      setActionLoading(false)
    }
  }

  const handleEditClick = () => {
    setShowEditModal(true)
    setWarning('')
  }

  const handleCancelEdit = () => {
    setShowEditModal(false)
    if (plan) {
      setForm({
        planName: plan.subscription_plan_name || '',
        description: plan.subscription_plan_description || '',
        price: plan.subscription_plan_price ?? '',
        maxUsers: plan.subscription_plan_max_user_amount ?? ''
      })
    }
  }

  const handleSave = async () => {
    // basic validation
    if (!form.planName || form.planName.trim() === '') {
      setWarning('Plan name is required')
      return
    }
    if (form.price === '' || isNaN(Number(form.price))) {
      setWarning('Price must be a number')
      return
    }
    if (form.maxUsers === '' || isNaN(Number(form.maxUsers))) {
      setWarning('Max users must be a number')
      return
    }

    setActionLoading(true)
    setWarning('')
    try {
      const body = {
        subscription_plan_name: form.planName,
        subscription_plan_description: form.description,
        price: Number(form.price),
        subscription_plan_max_user_amount: Number(form.maxUsers)
      }
      const response = await put(`subscription/api/v1/subscription-plans/customer-service/update/${id}`, body)
      if (response) {
        setPlan(response)
        if (response.warn) setWarning(response.warn)
        setShowEditModal(false)
      }
    } catch (err) {
      const msg = err?.message || 'Failed to update plan'
      setWarning(msg)
    } finally {
      setActionLoading(false)
    }
  }

  const InfoItem = ({ label, value, mono }) => (
    <div>
      <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '8px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      <div style={{ fontSize: '15px', color: '#111827', fontWeight: '600', wordBreak: 'break-word', fontFamily: mono ? 'monospace' : 'inherit' }}>{value || '—'}</div>
    </div>
  )

  const SectionCard = ({ title, children }) => (
    <div style={{ backgroundColor: 'white', borderRadius: '14px', border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 2px 8px rgba(58,74,82,0.06)', marginBottom: '20px' }}>
      <div style={{ padding: '18px 36px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#FAFBFC' }}>
        <div style={{ width: '4px', height: '18px', backgroundColor: '#9DD957', borderRadius: '2px', flexShrink: 0 }} />
        <h2 style={{ margin: 0, fontSize: '12px', fontWeight: '800', color: '#000', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</h2>
      </div>
      <div style={{ padding: '28px 36px' }}>{children}</div>
    </div>
  )

  if (loading) {
    return (
      <div style={{ backgroundColor: '#F4F6F8', minHeight: '100vh' }}>
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

          <div style={{ flex: 1 }} />
        </header>

        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'inline-block', width: '44px', height: '44px', border: '3px solid #E5E7EB', borderTop: '3px solid #3a4a52', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ marginTop: '16px', color: '#6B7280', fontSize: '14px', fontWeight: '500' }}>Loading plan details...</p>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (error || !plan) {
    return (
      <div style={{ backgroundColor: '#F4F6F8', minHeight: '100vh' }}>
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

          <div style={{ flex: 1 }} />
        </header>

        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)' }}>
          <div style={{ padding: '40px', backgroundColor: 'white', borderRadius: '16px', maxWidth: '600px', textAlign: 'center', border: '1px solid #FECACA', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
            <div style={{ width: '48px', height: '48px', backgroundColor: '#FEE2E2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600', color: '#111827' }}>Something went wrong</h3>
            <p style={{ margin: '0 0 24px 0', color: '#6B7280', fontSize: '14px' }}>{error || 'Subscription plan not found'}</p>
            <button onClick={() => navigate(-1)} style={{ padding: '10px 28px', backgroundColor: '#3a4a52', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#2c3a40'} onMouseLeave={(e) => e.target.style.backgroundColor = '#3a4a52'}>Go Back</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: '#F4F6F8', minHeight: '100vh' }}>
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

        <div style={{ flex: 1 }} />
      </header>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 28px 80px' }}>

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '28px', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              width: '36px', height: '36px', backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '10px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', flexShrink: 0, transition: 'all 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3a4a52'; e.currentTarget.style.color = '#3a4a52'; e.currentTarget.style.backgroundColor = '#F8FAFB' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.color = '#6B7280'; e.currentTarget.style.backgroundColor = 'white' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>

          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#111827', lineHeight: 1.2 }}>Subscription Plan</h1>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#9CA3AF', fontFamily: 'monospace' }}>#{plan.subscription_plan_id}</p>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isSystemAdmin ? (
              !isCurrentPlanActive ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                  <button
                    onClick={handleBuy}
                    disabled={actionLoading}
                    style={{
                      padding: '8px 16px', backgroundColor: '#9DD957', color: '#000',
                      border: 'none', borderRadius: '8px', cursor: actionLoading ? 'not-allowed' : 'pointer',
                      fontSize: '13px', fontWeight: '600', opacity: actionLoading ? 0.5 : 1, transition: 'all 0.2s'
                    }}
                  >
                    Buy
                  </button>
                  <div style={{ fontSize: 12, color: '#6B7280', textAlign: 'right' }}>
                    By purchasing this plan you agree to UniHub's Terms &amp; Services.
                  </div>
                </div>
              ) : null
            ) : (
              <>
                <button
                  onClick={handleEditClick}
                  disabled={actionLoading}
                  style={{
                    padding: '8px 16px', backgroundColor: '#9DD957', color: '#000',
                    border: 'none', borderRadius: '8px', cursor: actionLoading ? 'not-allowed' : 'pointer',
                    fontSize: '13px', fontWeight: '600', opacity: actionLoading ? 0.5 : 1, transition: 'all 0.2s'
                  }}
                >
                  Edit
                </button>

                <button
                  onClick={handleDeleteClick}
                  disabled={actionLoading}
                  style={{
                    padding: '8px 18px', backgroundColor: 'white', color: '#DC2626',
                    border: '1px solid #FECACA', borderRadius: '8px',
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    fontSize: '13px', fontWeight: '600',
                    opacity: actionLoading ? 0.5 : 1, transition: 'all 0.2s',
                    display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Delete
                </button>
              </>
            )}
          </div>
        </div>

        <SectionCard title="Plan Details">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div>
                <>
                  <InfoItem label="Plan name" value={plan.subscription_plan_name} />
                  <div style={{ height: 12 }} />
                  <InfoItem label="Description" value={plan.subscription_plan_description} />
                </>
            </div>

            <div>
              <>
                <InfoItem label="Price" value={`${plan.subscription_plan_currency} $${plan.subscription_plan_price?.toFixed ? plan.subscription_plan_price.toFixed(2) : plan.subscription_plan_price}`} />
                <div style={{ height: 12 }} />
                <InfoItem label="Max users" value={plan.subscription_plan_max_user_amount} />
              </>
            </div>
          </div>

          {plan.warn && (<div style={{ marginTop: 16, padding: 12, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, color: '#92400E' }}>{plan.warn}</div>)}
        </SectionCard>

        {/* Metadata removed per request */}

        {warning && (<div style={{ marginBottom: 12, padding: 12, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, color: '#92400E' }}>{warning}</div>)}

      </div>

      {showEditModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80 }}>
          <div style={{ width: '720px', maxWidth: '95%', background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 12px 40px rgba(2,6,23,0.24)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Edit subscription plan</h3>
              <button onClick={handleCancelEdit} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14, color: '#6B7280' }}>Close</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 6 }}>Plan name</div>
                  <input value={form.planName} onChange={(e) => setForm({ ...form, planName: e.target.value })} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E5E7EB' }} />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 6 }}>Description</div>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={6} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E5E7EB' }} />
                </div>
              </div>

              <div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 6 }}>Price</div>
                  <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E5E7EB' }} />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 6 }}>Max users</div>
                  <input value={form.maxUsers} onChange={(e) => setForm({ ...form, maxUsers: e.target.value })} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E5E7EB' }} />
                </div>
              </div>
            </div>

            {warning && (<div style={{ marginTop: 12, padding: 10, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, color: '#92400E' }}>{warning}</div>)}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button onClick={handleCancelEdit} disabled={actionLoading} style={{ padding: '8px 14px', background: 'white', border: '1px solid #E5E7EB', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSave} disabled={actionLoading || !form.planName || isNaN(Number(form.price)) || isNaN(Number(form.maxUsers))} style={{ padding: '8px 16px', backgroundColor: '#10B981', color: 'white', border: 'none', borderRadius: 8, cursor: actionLoading ? 'not-allowed' : 'pointer' }}>{actionLoading ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
      {showConfirmModal && (
        <ConfirmationModal action={'delete'} onConfirm={handleConfirmDelete} onCancel={() => setShowConfirmModal(false)} />
      )}
    </div>
  )
}
