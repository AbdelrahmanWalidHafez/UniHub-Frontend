import React, { useEffect, useState, useCallback } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import NavBar from './components/NavBar'
import About from './components/About'
import Solutions from './components/Solutions'
import Pricing from './components/Pricing'
import Contact from './components/Contact'
import SuccessPartners from './components/SuccessPartners'
import Login from './components/Login'
import CustomerServiceLanding from './components/CustomerServiceLanding'
import AddPlan from './components/AddPlan'
import SubscriptionRequest from './components/SubscriptionRequest'
import ErrorBoundary from './components/ErrorBoundary'
import ForgotPassword from './components/ForgotPassword'
import ProtectedRoute from './components/ProtectedRoute'
import RequestDetails from './components/RequestDetails'
import SubscriptionPlanDetails from './components/SubscriptionPlanDetails'
import SubscriptionRequests from './components/SubscriptionRequests'
import InquiryDetails from './components/InquiryDetails'
import UniversityDetails from './components/UniversityDetails'
import { ROUTES } from './constants/routes'
import { ROLES, getRoleName } from './constants/roles'
import { isAuthenticated, getUser, logout } from './utils/auth'

export default function App() {
  const [user, setUser] = useState(getUser())
  const [authenticated, setAuthenticated] = useState(isAuthenticated())
  const navigate = useNavigate()

  useEffect(() => {
    setUser(getUser())
    setAuthenticated(isAuthenticated())
  }, [])

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll('main > section'))
    if (!sections.length) return

    sections.forEach((s) => s.classList.add('reveal-on-scroll'))

    const obs = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view')
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.14 })

    sections.forEach((s) => obs.observe(s))
    const navLinks = Array.from(document.querySelectorAll('.nav-links a'))
    const navbarEl = document.querySelector('.navbar')
    const navClickHandlers = []
    navLinks.forEach((a) => {
      const handler = (e) => {
        // if nav is disabled (user authenticated) prevent returning to home sections
        const navRoot = a.closest('.nav-links')
        if (navRoot && navRoot.classList.contains('nav-disabled')) {
          e.preventDefault()
          return
        }

        const href = a.getAttribute('href')
        if (!href || !href.startsWith('#')) return
        const id = href.slice(1)
        const target = document.getElementById(id)
        if (!target) return
        e.preventDefault()
        const navHeight = navbarEl ? navbarEl.getBoundingClientRect().height : 0
        const rect = target.getBoundingClientRect()
        const scrollTop = window.scrollY + rect.top - navHeight - 12
        window.scrollTo({ top: Math.max(0, Math.floor(scrollTop)), behavior: 'smooth' })
        target.setAttribute('tabindex', '-1')
        target.focus({ preventScroll: true })
      }
      a.addEventListener('click', handler)
      navClickHandlers.push({ el: a, handler })
    })
    const spySections = Array.from(document.querySelectorAll('main > section[id]'))
    if (spySections.length) {
      const spy = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id
            navLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#${id}`))
          }
        })
      }, { threshold: 0.56 })
      spySections.forEach((s) => spy.observe(s))

      return () => {
        obs.disconnect()
        spy.disconnect()
        navClickHandlers.forEach(({ el, handler }) => el.removeEventListener('click', handler))
      }
    }

    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const bar = document.querySelector('.scroll-progress__bar')
    if (!bar) return
    let rafId = 0
    function update() {
      const doc = document.documentElement
      const scrollTop = window.scrollY || doc.scrollTop
      const scrollHeight = doc.scrollHeight - window.innerHeight
      const pct = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0
      bar.style.width = pct + '%'
      rafId = 0
    }
    function schedule() {
      if (rafId) return
      rafId = requestAnimationFrame(update)
    }
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    schedule()
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width:800px)').matches) return

    const els = Array.from(document.querySelectorAll('.parallax'))
    if (!els.length) return
    let rafId = 0

    function onFrame() {
      els.forEach((el) => {
        const speedAttr = el.getAttribute('data-speed') || '0.04'
        const speed = Math.max(0, Math.min(0.5, parseFloat(speedAttr)))
        const rect = el.getBoundingClientRect()
        const offset = -rect.top * speed
        el.style.transform = `translateY(${offset.toFixed(2)}px)`
      })
      rafId = 0
    }

    function schedule() {
      if (rafId) return
      rafId = requestAnimationFrame(onFrame)
    }

    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    schedule()
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (rafId) cancelAnimationFrame(rafId)
      els.forEach((el) => (el.style.transform = ''))
    }
  }, [])

  async function handleUserIconClick() {
    if (authenticated) {
      try {
        await logout()
        setUser(null)
        setAuthenticated(false)
        navigate(ROUTES.HOME)
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error('Logout failed', err)
        }
        try {
          window.alert('Logout failed. Please try again.')
        } catch (e) {
        }
      }
    } else {
      navigate(ROUTES.LOGIN)
    }
  }

  const handleLoginSuccess = (userData) => {
    setUser(userData)
    setAuthenticated(true)
    const roleName = getRoleName(userData)
    if (roleName === ROLES.CUSTOMER_SERVICE) {
      navigate(ROUTES.CUSTOMER_SERVICE)
    } else {
      navigate(ROUTES.DASHBOARD)
    }
  }

  const handleLogout = () => {
    setUser(null)
    setAuthenticated(false)
    navigate(ROUTES.HOME)
  }

  const goToSubscriptionRequest = useCallback(() => {
    navigate(ROUTES.SUBSCRIPTION_REQUEST)
  }, [navigate])

  const goToSubscriptionRequestWithPlan = useCallback((plan) => {
    navigate(ROUTES.SUBSCRIPTION_REQUEST, { state: { selectedPlan: plan } })
  }, [navigate])

  return (
    <Routes>
      <Route
        path={ROUTES.HOME}
        element={(
          <>
            <NavBar
              appName="unihub"
              logoSrc="/logo.png"
              onUserIconClick={handleUserIconClick}
              onLogoClick={() => window.scrollTo(0, 0)}
              cartTo={ROUTES.SUBSCRIPTION_REQUEST}
              onCartClick={goToSubscriptionRequest}
              isAuthenticated={authenticated}
            />
            <main>
              <About />
              <Solutions />
              <Pricing
                onSelectPlan={goToSubscriptionRequestWithPlan}
              />
              <SuccessPartners />
              <Contact />
            </main>
          </>
        )}
      />
      <Route
        path={ROUTES.SUBSCRIPTION_REQUEST}
        element={(
          <SubscriptionRequest
            onBackToLogin={() => navigate(ROUTES.HOME)}
          />
        )}
      />
      <Route
        path={ROUTES.LOGIN}
        element={<Login onLoginSuccess={handleLoginSuccess} />}
      />
      <Route
        path={ROUTES.FORGOT_PASSWORD}
        element={<ForgotPassword />}
      />
      <Route
        path={ROUTES.CUSTOMER_SERVICE}
        element={(
          <ProtectedRoute allowedRoles={[ROLES.CUSTOMER_SERVICE]}>
            <CustomerServiceLanding onLogout={handleLogout} />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/customer-service/request/:id"
        element={(
          <ProtectedRoute allowedRoles={[ROLES.CUSTOMER_SERVICE]}>
            <RequestDetails />
          </ProtectedRoute>
        )}
      />

      <Route
        path="/customer-service/inquiry/:id"
        element={(
          <ProtectedRoute allowedRoles={[ROLES.CUSTOMER_SERVICE]}>
            <InquiryDetails />
          </ProtectedRoute>
        )}
      />

      <Route
        path="/customer-service/university/:id"
        element={(
          <ProtectedRoute allowedRoles={[ROLES.CUSTOMER_SERVICE]}>
            <UniversityDetails />
          </ProtectedRoute>
        )}
      />

      <Route
        path="/customer-service/subscription-plan/:id"
        element={
          <ProtectedRoute allowedRoles={[ROLES.CUSTOMER_SERVICE]}>
            <SubscriptionPlanDetails />
          </ProtectedRoute>
        }
      />

<Route 
  path="/customer-service/requests" 
  element={
    <ProtectedRoute allowedRoles={[ROLES.CUSTOMER_SERVICE]}>
      <SubscriptionRequests />
    </ProtectedRoute>
  } 
/>
      <Route 
        path={ROUTES.ADD_PLAN} 
        element={
          <ProtectedRoute allowedRoles={[ROLES.CUSTOMER_SERVICE]}>
            <AddPlan />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.DASHBOARD}
        element={(
          <ProtectedRoute disallowedRoles={[ROLES.CUSTOMER_SERVICE]}>
            <div style={{ padding: '20px' }}>
              <h1>Dashboard</h1>
              <p>Welcome back, {user?.name || 'User'}!</p>
              <button type="button" onClick={handleLogout}>Logout</button>
            </div>
          </ProtectedRoute>
        )}
      />
    </Routes>
  )
}

