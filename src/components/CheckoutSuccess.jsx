import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { post, put } from '../utils/api'
import { getUser, refreshTokens } from '../utils/auth'
import { ROLES, getRoleName } from '../constants/roles'
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

      const action = localStorage.getItem('checkout_action') || 'upgrade'

      try {
        if (action === 'set') {
          await post(`subscription/api/v1/subscription-plans/system-admin/set-university-subscription/${planId}`, {})
        } else {
          await put(`subscription/api/v1/subscription-plans/system-admin/upgrade-university-subscription/${planId}`, {})
        }
        if (cancelled) return
        localStorage.removeItem('checkout_plan_id')
        localStorage.removeItem('checkout_action')
        setMessage('Subscription successful! Redirecting to University Admin...')
        setTimeout(() => {
          (async () => {
            try {
              const usr = getUser()
              if (usr && getRoleName(usr) === ROLES.SYSTEM_ADMIN) {
                // refresh tokens so permissions take effect after payment
                await refreshTokens()
              }
            } catch (e) {
              console.warn('Token refresh after payment failed', e)
            } finally {
              navigate(ROUTES.UNIVERSITY_ADMIN)
            }
          })()
        }, 4000)
      } catch (err) {
        console.error('Failed to finalize subscription', err)
        // still clear stored keys to avoid stale state
        localStorage.removeItem('checkout_plan_id')
        localStorage.removeItem('checkout_action')
        setMessage('Subscription succeeded but finalization failed. Redirecting...')
        setTimeout(() => {
          (async () => {
            try {
              const usr = getUser()
              if (usr && getRoleName(usr) === ROLES.SYSTEM_ADMIN) {
                await refreshTokens()
              }
            } catch (e) {
              console.warn('Token refresh after payment failed', e)
            } finally {
              navigate(ROUTES.UNIVERSITY_ADMIN)
            }
          })()
        }, 4000)
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
