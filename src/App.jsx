import React, { useEffect, useState, useCallback, lazy, Suspense } from 'react'
import { Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom'
import NavBar from './components/NavBar'
import About from './components/About'
import Solutions from './components/Solutions'
import Contact from './components/Contact'
import SuccessPartners from './components/SuccessPartners'
import ErrorBoundary from './components/ErrorBoundary'
import ProtectedRoute from './components/ProtectedRoute'

const Pricing = lazy(() => import('./components/Pricing'))
const Login = lazy(() => import('./components/Login'))
const CustomerServiceLanding = lazy(() => import('./components/CustomerServiceLanding'))
const AddPlan = lazy(() => import('./components/AddPlan'))
const SubscriptionRequest = lazy(() => import('./components/SubscriptionRequest'))
const ForgotPassword = lazy(() => import('./components/ForgotPassword'))
const ActivateAccount = lazy(() => import('./components/ActivateAccount'))
const RequestDetails = lazy(() => import('./components/RequestDetails'))
const SubscriptionPlanDetails = lazy(() => import('./components/SubscriptionPlanDetails'))
const SubscriptionRequests = lazy(() => import('./components/SubscriptionRequests'))
const InquiryDetails = lazy(() => import('./components/InquiryDetails'))
const UniversityDetails = lazy(() => import('./components/UniversityDetails'))
const UniversitySystemAdmin = lazy(() => import('./components/UniversitySystemAdmin'))
const AdminLayout = lazy(() => import('./components/AdminLayout'))
const Colleges = lazy(() => import('./components/Colleges'))
const Users = lazy(() => import('./components/Users'))
const Usage = lazy(() => import('./components/Usage'))
const UniHubLayout = lazy(() => import('./components/UniHubLayout'))
const UserDetail = lazy(() => import('./components/UserDetail'))
const Account = lazy(() => import('./components/Account'))
const CheckoutSuccess = lazy(() => import('./components/CheckoutSuccess'))
const CheckoutFailure = lazy(() => import('./components/CheckoutFailure'))
const LumosAI = lazy(() => import('./components/LumosAI'))
const ClassroomDetail = lazy(() => import('./components/ClassroomDetail'))
const Classroom = lazy(() => import('./components/Classroom'))
import { ROUTES } from './constants/routes'
import { ROLES, getRoleName } from './constants/roles'
import { logout } from './utils/auth'
import { useAuth } from './contexts/AuthContext'

// Page transition wrapper component
const PageTransition = ({ children, className = 'page-transition-wrapper' }) => {
  const location = useLocation()
  return (
    <div key={location.pathname} className={className}>
      {children}
    </div>
  )
}

export default function App() {
  const { user, setUser, accessToken, clearAuth } = useAuth()
  const authenticated = !!accessToken
  const navigate = useNavigate()
  const showLumos = ['student', 'instructor'].some(r => String(getRoleName(user)).toLowerCase().includes(r))
  const roleName = getRoleName(user)
  const isSystemAdmin = roleName === ROLES.SYSTEM_ADMIN
  const showDashboard = isSystemAdmin || ['student', 'instructor', 'secretary'].some(r => String(roleName).toLowerCase().includes(r))
  const dashboardRoute = isSystemAdmin ? ROUTES.UNIVERSITY_ADMIN : ROUTES.DASHBOARD

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
      try { await logout() } finally { clearAuth(); navigate(ROUTES.LOGIN) }
    } else {
      navigate(ROUTES.LOGIN)
    }
  }

  const handleLoginSuccess = (userData) => {
    setUser(userData)
    const roleName = getRoleName(userData)
    if (roleName === ROLES.CUSTOMER_SERVICE) {
      navigate(ROUTES.CUSTOMER_SERVICE)
    } else if (roleName === ROLES.SYSTEM_ADMIN) {
      navigate(ROUTES.UNIVERSITY_ADMIN)
    } else {
      navigate(ROUTES.DASHBOARD)
    }
  }

  const handleLogout = () => {
    clearAuth()
    navigate(ROUTES.HOME)
  }

  const goToSubscriptionRequest = useCallback(() => {
    navigate(ROUTES.SUBSCRIPTION_REQUEST)
  }, [navigate])

  const goToSubscriptionRequestWithPlan = useCallback((plan) => {
    navigate(ROUTES.SUBSCRIPTION_REQUEST, { state: { selectedPlan: plan } })
  }, [navigate])

  return (
    <Suspense fallback={null}>
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
              showLumos={showLumos}
              showDashboard={showDashboard}
              dashboardRoute={dashboardRoute}
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
        path="/"
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
              showLumos={showLumos}
              showDashboard={showDashboard}
              dashboardRoute={dashboardRoute}
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
        path={ROUTES.LUMOS_AI}
        element={(
          <ProtectedRoute allowedRoles={['ROLE_STUDENT', 'ROLE_INSTRUCTOR']}>
            <PageTransition>
              <LumosAI />
            </PageTransition>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.LOGIN}
        element={(
          authenticated
            ? (() => {
              const roleName = getRoleName(user)
              if (roleName === ROLES.CUSTOMER_SERVICE) return <Navigate to={ROUTES.CUSTOMER_SERVICE} replace />
              if (roleName === ROLES.SYSTEM_ADMIN) return <Navigate to={ROUTES.UNIVERSITY_ADMIN} replace />
              return <Navigate to={ROUTES.DASHBOARD} replace />
            })()
            : <Login onLoginSuccess={handleLoginSuccess} />
        )}
      />
      <Route
        path={ROUTES.FORGOT_PASSWORD}
        element={<ForgotPassword />}
      />
      <Route
        path={ROUTES.ACTIVATE_ACCOUNT}
        element={<ActivateAccount />}
      />
      <Route
        path={ROUTES.CUSTOMER_SERVICE}
        element={(
          <ProtectedRoute allowedRoles={[ROLES.CUSTOMER_SERVICE]}>
            <PageTransition>
              <CustomerServiceLanding onLogout={handleLogout} />
            </PageTransition>
          </ProtectedRoute>
        )}
      />

      <Route
        path={ROUTES.UNIVERSITY_ADMIN}
        element={(
          <ProtectedRoute allowedRoles={[ROLES.SYSTEM_ADMIN]}>
            <AdminLayout />
          </ProtectedRoute>
        )}
      >
        <Route index element={<Navigate to="university" replace />} />
        <Route path="university" element={<PageTransition><UniversitySystemAdmin /></PageTransition>} />
        <Route path="users" element={<PageTransition><Users /></PageTransition>} />
        <Route path="colleges" element={<PageTransition><Colleges /></PageTransition>} />
        <Route path="usage" element={<PageTransition><Usage /></PageTransition>} />
      </Route>
      <Route
        path="/university-admin/users/new"
        element={(
          <ProtectedRoute allowedRoles={[ROLES.SYSTEM_ADMIN]}>
            <PageTransition className="page-transition-slide">
              <UserDetail />
            </PageTransition>
          </ProtectedRoute>
        )}
      />
      <Route
        path="/university-admin/users/:id"
        element={(
          <ProtectedRoute allowedRoles={[ROLES.SYSTEM_ADMIN]}>
            <PageTransition className="page-transition-slide">
              <UserDetail />
            </PageTransition>
          </ProtectedRoute>
        )}
      />
      <Route
        path="/system-admin/subscription-plan/:id"
        element={(
          <ProtectedRoute allowedRoles={[ROLES.SYSTEM_ADMIN]}>
            <PageTransition className="page-transition-up">
              <SubscriptionPlanDetails />
            </PageTransition>
          </ProtectedRoute>
        )}
      />
      <Route path="/success" element={<CheckoutSuccess />} />
      <Route path="/failure" element={<CheckoutFailure />} />
      <Route path="/cancel" element={<CheckoutFailure />} />
      <Route
        path="/customer-service/request/:id"
        element={(
          <ProtectedRoute allowedRoles={[ROLES.CUSTOMER_SERVICE]}>
            <PageTransition className="page-transition-slide">
              <RequestDetails />
            </PageTransition>
          </ProtectedRoute>
        )}
      />

      <Route
        path="/customer-service/inquiry/:id"
        element={(
          <ProtectedRoute allowedRoles={[ROLES.CUSTOMER_SERVICE]}>
            <PageTransition className="page-transition-slide">
              <InquiryDetails />
            </PageTransition>
          </ProtectedRoute>
        )}
      />

      <Route
        path="/customer-service/university/:id"
        element={(
          <ProtectedRoute allowedRoles={[ROLES.CUSTOMER_SERVICE]}>
            <PageTransition className="page-transition-slide">
              <UniversityDetails />
            </PageTransition>
          </ProtectedRoute>
        )}
      />

      <Route
        path="/customer-service/subscription-plan/:id"
        element={
          <ProtectedRoute allowedRoles={[ROLES.CUSTOMER_SERVICE]}>
            <PageTransition className="page-transition-up">
              <SubscriptionPlanDetails />
            </PageTransition>
          </ProtectedRoute>
        }
      />

<Route 
  path="/customer-service/requests" 
  element={
    <ProtectedRoute allowedRoles={[ROLES.CUSTOMER_SERVICE]}>
      <PageTransition>
        <SubscriptionRequests />
      </PageTransition>
    </ProtectedRoute>
  } 
/>
      <Route 
        path={ROUTES.ADD_PLAN} 
        element={
          <ProtectedRoute allowedRoles={[ROLES.CUSTOMER_SERVICE]}>
            <PageTransition className="page-transition-up">
              <AddPlan />
            </PageTransition>
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.DASHBOARD}
        element={(
          <ProtectedRoute allowedRoles={[ 'ROLE_SECRETARY', 'ROLE_INSTRUCTOR', 'ROLE_STUDENT' ]}>
            <PageTransition>
              <UniHubLayout />
            </PageTransition>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.ACCOUNT}
        element={(
          <ProtectedRoute>
            <PageTransition>
              <Account />
            </PageTransition>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.CLASSROOM}
        element={(
          <ProtectedRoute allowedRoles={['ROLE_SECRETARY', 'ROLE_INSTRUCTOR', 'ROLE_STUDENT']}>
            <PageTransition>
              <ClassroomDetail />
            </PageTransition>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.CLASSROOM_MATERIAL}
        element={(
          <ProtectedRoute allowedRoles={['ROLE_SECRETARY', 'ROLE_INSTRUCTOR', 'ROLE_STUDENT']}>
            <PageTransition>
              <ClassroomDetail />
            </PageTransition>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.CLASSROOM_CALENDAR}
        element={(
          <ProtectedRoute allowedRoles={['ROLE_SECRETARY', 'ROLE_INSTRUCTOR', 'ROLE_STUDENT']}>
            <PageTransition>
              <ClassroomDetail forceTab="calendar" />
            </PageTransition>
          </ProtectedRoute>
        )}
      />
      <Route
        path="/classroom-list"
        element={(
          <ProtectedRoute allowedRoles={['ROLE_SECRETARY', 'ROLE_INSTRUCTOR', 'ROLE_STUDENT']}>
            <PageTransition>
              <Classroom />
            </PageTransition>
          </ProtectedRoute>
        )}
      />
    </Routes>
    </Suspense>
  )
}

