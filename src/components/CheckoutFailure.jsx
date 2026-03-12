import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '../constants/routes'

export default function CheckoutFailure() {
  const navigate = useNavigate()

  useEffect(() => {
    // clear any pending checkout info
    localStorage.removeItem('checkout_plan_id')

    function onPop() { window.history.pushState(null, '', window.location.href) }
    window.history.pushState(null, '', window.location.href)
    window.addEventListener('popstate', onPop)

    const t = setTimeout(() => navigate(ROUTES.UNIVERSITY_ADMIN), 4000)
    return () => {
      clearTimeout(t)
      window.removeEventListener('popstate', onPop)
    }
  }, [navigate])

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 800, textAlign: 'center' }}>
        <h2>Payment Failed</h2>
        <p style={{ color: '#111', fontWeight: 600 }}>Your payment could not be completed.</p>
        <p style={{ color: '#666' }}>You will be redirected to the dashboard shortly.</p>
      </div>
    </div>
  )
}
