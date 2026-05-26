import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useLocation, Outlet, useOutletContext } from 'react-router-dom'
import { getUser, logout } from '../utils/auth'
import { useAuth } from '../contexts/AuthContext'
import { ROUTES } from '../constants/routes'
import { getCached, getFileAsBlob } from '../utils/api'
import './universityAdmin.css'

function stringToColor(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const c = (hash & 0x00ffffff).toString(16).toUpperCase()
  return '#' + '00000'.substring(0, 6 - c.length) + c
}

const NAV_ITEMS = [
  { label: 'University', route: ROUTES.UNIVERSITY_ADMIN_UNIVERSITY },
  { label: 'Users',      route: ROUTES.UNIVERSITY_ADMIN_USERS },
  { label: 'Colleges',   route: ROUTES.UNIVERSITY_ADMIN_COLLEGES },
  { label: 'Usage',      route: ROUTES.UNIVERSITY_ADMIN_USAGE },
]

export default function AdminLayout() {
  const { clearAuth } = useAuth()
  const user = getUser()
  const firstName = user?.first_name || user?.firstName || user?.email || 'U'
  const initial = (firstName && firstName[0]) || 'U'
  const avatarColor = useMemo(() => {
    const palette = ['#0369A1', '#0EA5E9', '#7C3AED', '#059669', '#D946EF', '#F59E0B']
    return palette[Math.floor(Math.random() * palette.length)]
  }, [])

  const [menuOpen, setMenuOpen] = useState(false)
  const [logoUrl, setLogoUrl] = useState(null)
  const [universityName, setUniversityName] = useState('')
  const [universityData, setUniversityData] = useState(null)
  const [universityLoading, setUniversityLoading] = useState(true)
  const menuRef = useRef(null)
  const avatarRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    async function fetchLogo() {
      if (!user?.university) return
      const id = user.university.tid || user.university.uid || user.universityId
      if (!id) return
      try {
        const data = await getCached(`universitymanagement/api/v1/get-university/${id}`)
        const name = data?.university_name || data?.universityName || ''
        setUniversityName(name)
        setUniversityData(data)
        const logoKey = data?.logo_key || data?.universityLogo || data?.university_logo || data?.logoKey
        if (logoKey) {
          const blob = await getFileAsBlob(`s3/api/v1/get-file/${logoKey}`)
          setLogoUrl(URL.createObjectURL(blob))
        }
      } catch (_) {}
      finally { setUniversityLoading(false) }
    }
    fetchLogo()
  }, [])

  useEffect(() => {
    function onDocClick(e) {
      if (menuOpen && menuRef.current && !menuRef.current.contains(e.target) && avatarRef.current && !avatarRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [menuOpen])


  async function handleLogout() {
    try { await logout() } finally {
      clearAuth()
      setMenuOpen(false)
      navigate(ROUTES.HOME, { replace: true })
    }
  }

  const activeRoute = location.pathname

  return (
    <div className="uni-admin-root">
      <aside className="uni-admin-sidenav">
        <div className="sidenav-top">
          {logoUrl ? (
            <img src={logoUrl} alt="University Logo" className="sidenav-logo" />
          ) : (
            <div className="sidenav-logo-placeholder" style={{ backgroundColor: '#E6F7FF', border: '2px solid transparent', color: '#0369A1' }}>
              {(universityName || 'U').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="sidenav-title">Admin Dashboard</div>
        </div>
        <nav className="nav-links sidenav-links" aria-label="Admin navigation">
          {NAV_ITEMS.map(({ label, route }) => (
            <button
              key={label}
              onClick={() => route && navigate(route)}
              className={`snav-item ${route && activeRoute.startsWith(route) ? 'active' : ''}`}
              style={{ background: 'none', border: 'none', cursor: route ? 'pointer' : 'not-allowed', opacity: route ? 1 : 0.4 }}
            >
              {label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="uni-admin-main">
        <header className="uni-admin-header">
          <div className="header-left" />
          <div className="header-center"><img src="/logo.png" alt="UniHub" style={{ width: 28, height: 28, objectFit: 'contain', verticalAlign: 'middle', marginRight: 8 }} />UniHub</div>
          <div className="header-right">
            <div
              className="user-avatar"
              style={{ backgroundColor: '#1E3A5F', color: '#fff', cursor: 'pointer' }}
              title={firstName}
              onClick={() => setMenuOpen(s => !s)}
              ref={avatarRef}
              aria-haspopup="true"
              aria-expanded={menuOpen}
            >
              {initial.toUpperCase()}
            </div>
            {menuOpen && (
              <div className="user-menu" ref={menuRef} role="menu">
                <button type="button" className="user-menu-item" onClick={() => { setMenuOpen(false); navigate(ROUTES.ACCOUNT) }}>
                  <span className="user-menu-icon"><img src="/user.png" alt="Account" /></span>
                  <span>Account</span>
                </button>
                <button type="button" className="user-menu-item" onClick={handleLogout}>
                  <span className="user-menu-icon"><img src="/logout.png" alt="Logout" /></span>
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="uni-admin-content">
          <Outlet context={useMemo(() => ({ universityData, universityLoading, logoUrl }), [universityData, universityLoading, logoUrl])} />
        </main>
      </div>
    </div>
  )
}
