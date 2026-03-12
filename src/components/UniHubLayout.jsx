import React, { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { logout } from '../utils/auth'
import { getRoleName, ROLES } from '../constants/roles'
import { get, getFileAsBlob } from '../utils/api'
import AnnouncementPage from './AnnouncementPage'
import './universityAdmin.css'
import './unihub.css'

function stringToColor(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const c = (hash & 0x00ffffff).toString(16).toUpperCase()
  return '#' + '00000'.substring(0, 6 - c.length) + c
}

export default function UniHubLayout() {
  const { user, clearAuth } = useAuth()
  const firstName = user?.first_name || user?.firstName || user?.name || user?.email || 'U'
  const initial = (firstName && firstName[0]) || 'U'
  const avatarColor = useMemo(() => {
    const palette = ['#0369A1', '#0EA5E9', '#7C3AED', '#059669', '#D946EF', '#F59E0B']
    return palette[Math.floor(Math.random() * palette.length)]
  }, [])

  // University logo state
  const [universityLogoUrl, setUniversityLogoUrl] = useState(null)
  const [universityName, setUniversityName] = useState('')

  // Fetch university logo for secretary/instructor/student
  useEffect(() => {
    let isMounted = true
    async function fetchUniversityLogo() {
      if (!user) return
      // Only for secretary, instructor, student
      const roleName = getRoleName(user)
      const allowedRoles = ['secretary', 'instructor', 'student']
      const isRelevantRole = allowedRoles.some(r => String(roleName).toLowerCase().includes(r))
      if (!isRelevantRole) return
      // Get university id
      const universityId = user.university_id || user.universityId || (user.university && (user.university.tid || user.university.uid || user.universityId))
      if (!universityId) return
      try {
        const data = await get(`universitymanagement/api/v1/get-university/${universityId}`)
        const logoKey = data?.logo_key || data?.universityLogo || data?.university_logo || data?.logoKey
        if (isMounted && (data?.university_name || data?.universityName)) {
          setUniversityName(data.university_name || data.universityName)
        }
        if (logoKey) {
          const blob = await getFileAsBlob(`s3/api/v1/get-file/${logoKey}`)
          const url = URL.createObjectURL(blob)
          if (isMounted) setUniversityLogoUrl(url)
        }
      } catch (err) {
        // ignore logo errors
      }
    }
    fetchUniversityLogo()
    return () => { isMounted = false }
  }, [user])

  const [menuOpen, setMenuOpen] = useState(false)
  const [activeNav, setActiveNav] = useState('announcements')
  const [sidenavHidden, setSidenavHidden] = useState(false)
  const roleName = getRoleName(user)
  const isSystemAdmin = roleName === ROLES.SYSTEM_ADMIN
  const isSecretary = String(roleName || '').toLowerCase().includes('secretary') || roleName === 'ROLE_SECRETARY'
  const menuRef = useRef(null)
  const avatarRef = useRef(null)
  const navigate = useNavigate()

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
    try {
      await logout()
    } finally {
      clearAuth()
      setMenuOpen(false)
      navigate('/')
    }
  }

  return (
    <div className={`uni-admin-root unihub-root ${sidenavHidden ? 'sidenav-hidden' : ''}`}>
      <aside className="uni-admin-sidenav">

        <nav className="nav-links sidenav-links" aria-label="Main navigation" style={{ marginTop: 120, position: 'relative' }}>
          <button aria-label="toggle-sidenav" onClick={() => setSidenavHidden((s) => !s)} style={{ position: 'absolute', top: - 40, right: 8, background: 'transparent', border: 'none', cursor: 'pointer', padding: 2 , lineHeight: 0 }}>
            <img src="/slider.png" alt="Toggle navigation" style={{ width: 18, height: 18, display: 'block' }} />
          </button>
          {isSystemAdmin ? (
            // System admin sees admin nav options
            <>
              <button onClick={() => setActiveNav('university')} className={`snav-item ${activeNav === 'university' ? 'active' : ''}`}>University</button>
              <button onClick={() => setActiveNav('users')} className={`snav-item ${activeNav === 'users' ? 'active' : ''}`}>Users</button>
              <button onClick={() => setActiveNav('colleges')} className={`snav-item ${activeNav === 'colleges' ? 'active' : ''}`}>Colleges</button>
              <button onClick={() => setActiveNav('usage')} className={`snav-item ${activeNav === 'usage' ? 'active' : ''}`}>Usage</button>
              <button onClick={() => setActiveNav('task-manager')} className={`snav-item ${activeNav === 'task-manager' ? 'active' : ''}`}>Task Manager</button>
              <button onClick={() => setActiveNav('calendar')} className={`snav-item ${activeNav === 'calendar' ? 'active' : ''}`}>Calendar</button>
              <button onClick={() => setActiveNav('chats')} className={`snav-item ${activeNav === 'chats' ? 'active' : ''}`}>Chats</button>
              <button onClick={() => setActiveNav('video-chats')} className={`snav-item ${activeNav === 'video-chats' ? 'active' : ''}`}>Video Chats</button>
              <button onClick={() => setActiveNav('announcements')} className={`snav-item ${activeNav === 'announcements' ? 'active' : ''}`}>Announcements</button>
            </>
          ) : (
            // Students/Instructors see limited nav
            <>
              <button onClick={() => setActiveNav('announcements')} className={`snav-item ${activeNav === 'announcements' ? 'active' : ''}`}>Announcement</button>
              {isSecretary ? (
                <button onClick={() => setActiveNav('activity-management')} className={`snav-item ${activeNav === 'activity-management' ? 'active' : ''}`}>Activity Management</button>
              ) : (
                <button onClick={() => setActiveNav('classroom')} className={`snav-item ${activeNav === 'classroom' ? 'active' : ''}`}>Classroom</button>
              )}
              {/* <button onClick={() => setActiveNav('lumos')} className={`snav-item ${activeNav === 'lumos' ? 'active' : ''}`}>Lumos AI</button> */}
              <button onClick={() => setActiveNav('task-manager')} className={`snav-item ${activeNav === 'task-manager' ? 'active' : ''}`}>Task Manager</button>
              <button onClick={() => setActiveNav('calendar')} className={`snav-item ${activeNav === 'calendar' ? 'active' : ''}`}>Calendar</button>
              <button onClick={() => setActiveNav('chats')} className={`snav-item ${activeNav === 'chats' ? 'active' : ''}`}>Chats</button>
              <button onClick={() => setActiveNav('video-chats')} className={`snav-item ${activeNav === 'video-chats' ? 'active' : ''}`}>Video Chats</button>
            </>
          )}
        </nav>
      </aside>

      <div className="uni-admin-main">
          <header className="uni-admin-header">
              <div className="header-left">
                {universityLogoUrl ? (
                  <img
                    src={universityLogoUrl}
                    alt="University logo"
                    className="header-univ-logo"
                    onClick={() => setSidenavHidden(false)}
                    style={{ cursor: 'pointer', width: 40, height: 40, borderRadius: '50%' }}
                    aria-label="Show navigation"
                  />
                ) : (
                  <div
                    className="sidenav-logo-placeholder"
                    style={{ backgroundColor: '#9CA3AF', color: '#fff', cursor: 'pointer', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800 }}
                    onClick={() => setSidenavHidden(false)}
                    aria-label="Show navigation"
                  >
                    {(universityName || user?.university_name || user?.universityName || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                  <div className="active-page-label">{activeNav.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</div>
                </div>
                <div className="header-center">UniHub</div>
              <div className="header-right" style={{ alignItems: 'center', gap: 12, display: 'flex' }}>
                <div
                  className="user-avatar"
                  style={{ backgroundColor: avatarColor, color: '#fff', cursor: 'pointer' }}
                  title={firstName}
                  onClick={() => setMenuOpen((s) => !s)}
                  ref={avatarRef}
                  aria-haspopup="true"
                  aria-expanded={menuOpen}
                >
                  {initial.toUpperCase()}
                </div>

            {menuOpen ? (
              <div className="user-menu" ref={menuRef} role="menu">
                <button type="button" className="user-menu-item" onClick={() => { setMenuOpen(false); navigate('/account') }}>
                  <span className="user-menu-icon"><img src="/user.png" alt="Account"/></span>
                  <span>Account</span>
                </button>

                <button type="button" className="user-menu-item" onClick={handleLogout}>
                  <span className="user-menu-icon"><img src="/logout.png" alt="Logout"/></span>
                  <span>Logout</span>
                </button>
              </div>
            ) : null}
          </div>
        </header>

        <main className="uni-admin-content">
          <section className="univ-details-card" style={{ position: 'relative' }}>
            {activeNav === 'announcements' || activeNav === 'activity-management' ? (
              <div className="page-transition-up" style={{ paddingTop: 8 }}>
                <AnnouncementPage secretary={activeNav === 'activity-management'} />
              </div>
            ) : (
              <div className="card" style={{ minHeight: 140 }}>
                <h2 style={{ margin: 0, fontWeight: 800, fontSize: 18, marginBottom: 8 }}>{activeNav.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</h2>
                <p style={{ color: '#6B7280' }}>This section is under construction.</p>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  )
}
