import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { post } from '../utils/api'
import { ROUTES } from '../constants/routes'

export default function CheckoutSuccess() {
  const navigate = useNavigate()
  const [message, setMessage] = useState('Finalizing subscription...')

  useEffect(() => {
    const planId = localStorage.getItem('checkout_plan_id')
    let cancelled = false

    // prevent back navigation while on this page
    function onPop() { window.history.pushState(null, '', window.location.href) }
    window.history.pushState(null, '', window.location.href)
    window.addEventListener('popstate', onPop)

    async function finalize() {
        if (!planId) {
        setMessage('No checkout session found. Redirecting...')
        setTimeout(() => navigate(ROUTES.UNIVERSITY_ADMIN), 4000)
        return
      }

      try {
        await post(`subscription/api/v1/subscription-plans/system-admin/set-university-subscription/${planId}`, {})
        if (cancelled) return
        localStorage.removeItem('checkout_plan_id')
        setMessage('Subscription successful! Redirecting to University Admin...')
        setTimeout(() => navigate(ROUTES.UNIVERSITY_ADMIN), 4000)
      } catch (err) {
        console.error('Failed to set subscription', err)
        setMessage('Subscription succeeded but finalization failed. Redirecting...')
        setTimeout(() => navigate(ROUTES.UNIVERSITY_ADMIN), 4000)
      }
    }

    finalize()

    return () => {
      cancelled = true
      window.removeEventListener('popstate', onPop)
    }
  }, [navigate])

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 800, textAlign: 'center' }}>
        <h2>Payment Successful</h2>
        <p style={{ color: '#111', fontWeight: 600 }}>{message}</p>
        <p style={{ color: '#666' }}>You will be redirected to the dashboard shortly.</p>
      </div>
    </div>
  )
}
