import React, { useState, useRef, useEffect, useMemo } from 'react'
import { getUser, logout } from '../utils/auth'
import { ROLES, getRoleName } from '../constants/roles'
import { Link, useNavigate } from 'react-router-dom'
import { ROUTES } from '../constants/routes'
import { get, getFileAsBlob, post } from '../utils/api'
import FileViewerModal from './FileViewerModal'
import { formatInCairo, parseAsCairo } from '../utils/timezone'
import Pricing from './Pricing'
import Colleges from './Colleges'
import Users from './Users'
import './universityAdmin.css'

function stringToColor(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const c = (hash & 0x00ffffff).toString(16).toUpperCase()
  return '#' + '00000'.substring(0, 6 - c.length) + c
}

export default function UniversitySystemAdmin() {
  const user = getUser()
  const firstName = user?.first_name || user?.firstName || user?.email || 'U'
  const initial = (firstName && firstName[0]) || 'U'
  const bg = stringToColor(firstName)
  // pick a random accent color for the avatar frame (stable for this mount)
  function pickRandomColor() {
    const palette = ['#0369A1', '#0EA5E9', '#7C3AED', '#059669', '#D946EF', '#F59E0B']
    return palette[Math.floor(Math.random() * palette.length)]
  }
  const avatarColor = useMemo(() => pickRandomColor(), [])
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const avatarRef = useRef(null)
  const navigate = useNavigate()
  const [university, setUniversity] = useState(null)
  const [loading, setLoading] = useState(false)
  const [logoUrl, setLogoUrl] = useState(null)
  const [showAccModal, setShowAccModal] = useState(false)
  const [expandedPlanView, setExpandedPlanView] = useState(false)
  const [planDetails, setPlanDetails] = useState(null)
  const [planLoading, setPlanLoading] = useState(false)
  const [planError, setPlanError] = useState('')
  const [animatingExit, setAnimatingExit] = useState(false)
  const [activeNav, setActiveNav] = useState('university')

  function formatDate(dateStr) {
      if (!dateStr) return ''
      try {
        return formatInCairo(dateStr, { month: 'short', day: 'numeric', year: 'numeric' })
      } catch (e) {
        return dateStr
      }
    }

  const InfoItem = ({ label, value }) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 15, color: '#111827', fontWeight: 600 }}>
        {loading && (value === null || value === undefined) ? (
          <div style={{ width: '56%', height: 14, background: '#EEF2F6', borderRadius: 6 }} />
        ) : (
          <span style={{ color: value ? '#111827' : '#D1D5DB' }}>{value || '—'}</span>
        )}
      </div>
    </div>
  )

  const maskId = (val) => {
    if (val === null || val === undefined || val === '') return '—'
    const s = String(val)
    if (s.length <= 12) return s
    return `${s.slice(0, 6)}...${s.slice(-4)}`
  }

  

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
      navigate(ROUTES.HOME)
      // force reload so App reads cleared auth state
      window.location.reload()
    }
  }

  useEffect(() => {
    async function fetchForAdmin() {
      if (!user || !user.university) return
      // use tenant id (tid) when available, fallback to uid
      const id = user.university.tid || user.university.uid || user.universityId
      setLoading(true)
      try {
        const data = await get(`universitymanagement/api/v1/get-university/${id}`)
        const u = {
          ...data,
          uniId: data?.university_id || data?.uniId || data?.id,
          universityName: data?.university_name || data?.universityName || data?.name,
          universityEmail: data?.university_email || data?.universityEmail,
          universityWebsiteUrl: data?.website_url || data?.universityWebsiteUrl || data?.websiteUrl,
          universityDomain: data?.university_domain || data?.universityDomain,
          contactNumber: data?.contact_number || data?.contactNumber,
          country: data?.country || data?.country,
          city: data?.city || data?.city,
          logo_key: data?.logo_key || data?.universityLogo || data?.university_logo || data?.logoKey,
          accreditation_key: data?.accreditation_key || data?.accreditationKey,
          subscriptionPlanNormalized: data?.subscription_plan ? {
            record_id: data.subscription_plan.record_id || data.subscription_plan.recordId || data.subscription_plan.id,
            plan_id: data.subscription_plan.plan_id || data.subscription_plan.planId || data.subscription_plan.pid,
            start_date: data.subscription_plan.start_date || data.subscription_plan.startDate,
            end_date: data.subscription_plan.end_date || data.subscription_plan.endDate
          } : null,
        }
        setUniversity(u)

        if (u.logo_key) {
          try {
            const blob = await getFileAsBlob(`s3/api/v1/get-file/${u.logo_key}`)
            const url = URL.createObjectURL(blob)
            setLogoUrl(url)
          } catch (err) {
            console.warn('logo load failed', err)
          }
        }
      } catch (err) {
        console.error('Failed to fetch university for admin', err)
      } finally {
        setLoading(false)
      }
    }
    fetchForAdmin()
    return () => { if (logoUrl) URL.revokeObjectURL(logoUrl) }
  }, [])

  const fetchPlanDetails = async (planId) => {
    if (!planId) return
    setPlanLoading(true)
    setPlanError('')
    try {
      const data = await get(`subscription/api/v1/subscription-plans/admin/${planId}`)
      setPlanDetails(data)
    } catch (err) {
      setPlanError(err.message || 'Failed to load plan')
      setPlanDetails(null)
    } finally {
      setPlanLoading(false)
    }
  }

  const isSubscriptionActive = () => {
    const s = university?.subscriptionPlanNormalized?.start_date
    const e = university?.subscriptionPlanNormalized?.end_date
    if (!s && !e) return false
    const now = Date.now()
    const start = s ? parseAsCairo(s) ?? 0 : 0
    const end = e ? parseAsCairo(e) ?? Infinity : Infinity
    return now >= start && now <= end
  }

  return (
    <div className="uni-admin-root">
      <aside className="uni-admin-sidenav">
        <div className="sidenav-top">
          {logoUrl ? (
            <img src={logoUrl} alt="University Logo" className="sidenav-logo" />
          ) : (
            <div
              className="sidenav-logo-placeholder"
              style={{ backgroundColor: '#E6F7FF', border: '2px solid transparent', color: '#0369A1' }}
            >
              {(university?.universityName || 'U').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="sidenav-title">Admin Dashboard</div>
        </div>
        <nav className="nav-links sidenav-links" aria-label="Admin navigation">
          <button 
            onClick={() => setActiveNav('university')}
            className={`snav-item ${activeNav === 'university' ? 'active' : ''}`}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            University
          </button>
          <button 
            onClick={() => setActiveNav('users')}
            className={`snav-item ${activeNav === 'users' ? 'active' : ''}`}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Users
          </button>
          <button 
            onClick={() => setActiveNav('colleges')}
            className={`snav-item ${activeNav === 'colleges' ? 'active' : ''}`}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Colleges
          </button>
          <button 
            onClick={() => setActiveNav('usage')}
            className={`snav-item ${activeNav === 'usage' ? 'active' : ''}`}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Usage
          </button>
          <button 
            onClick={() => setActiveNav('task-manager')}
            className={`snav-item ${activeNav === 'task-manager' ? 'active' : ''}`}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Task Manager
          </button>
          <button 
            onClick={() => setActiveNav('calendar')}
            className={`snav-item ${activeNav === 'calendar' ? 'active' : ''}`}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Calendar
          </button>
          <button 
            onClick={() => setActiveNav('chats')}
            className={`snav-item ${activeNav === 'chats' ? 'active' : ''}`}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Chats
          </button>
          <button 
            onClick={() => setActiveNav('video-chats')}
            className={`snav-item ${activeNav === 'video-chats' ? 'active' : ''}`}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Video Chats
          </button>
          <button 
            onClick={() => setActiveNav('announcements')}
            className={`snav-item ${activeNav === 'announcements' ? 'active' : ''}`}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Announcements
          </button>
        </nav>
      </aside>

      <div className="uni-admin-main">
        <header className="uni-admin-header">
          <div className="header-left"></div>
          <div className="header-center">UniHub</div>
          <div className="header-right">
            <nav className="nav-links header-api-docs">
              <a href="/api-docs" className="api-docs-link">API Docs</a>
            </nav>
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
                <button
                  type="button"
                  className="user-menu-item"
                  onClick={() => { setMenuOpen(false); navigate(ROUTES.DASHBOARD) }}
                >
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
          {activeNav === 'colleges' ? (
            <div key="colleges-tab" className="page-transition-up">
              <Colleges />
            </div>
          ) : activeNav === 'users' ? (
            <div key="users-tab" className="page-transition-up">
              <Users />
            </div>
          ) : (
            <div key={`university-tab-${activeNav}`} className="page-transition-up">
          <section className="univ-details-card">
            {expandedPlanView ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  aria-label="Back"
                  onClick={() => {
                    setAnimatingExit(true)
                    setTimeout(() => { setAnimatingExit(false); setExpandedPlanView(false) }, 640)
                  }}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 20, padding: '4px 6px', lineHeight: 1 }}
                >
                  ‹
                </button>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Current Subscription Plan</h2>
              </div>
            ) : (
              <h2>University Details</h2>
            )}
            {expandedPlanView ? (
                <div style={{ display: 'flex', justifyContent: 'center', width: '100%', padding: '12px 0' }}>
                <div className={animatingExit ? 'expanded-exit' : 'expanded-anim'} style={{ width: '100%', maxWidth: 980 }}>
                  <div>
                    {planLoading ? (
                      <div style={{ padding: 20 }}>Loading plan...</div>
                    ) : (
                      <div>
                        {/* Subscribed Plan area inside a card */}
                        <div className="card" style={{ marginBottom: 18, padding: '14px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                            <div style={{ width: 4, height: 18, background: '#9DD957', borderRadius: 2 }} />
                            <div style={{ fontSize: 16, fontWeight: 800 }}>Subscribed Plan</div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            {/* icon */}
                            <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {university?.subscriptionPlanNormalized ? (
                                isSubscriptionActive() ? (
                                  null
                                ) : (
                                  <img src="/redwarning.png" alt="warning" style={{ width: 28, height: 28 }} />
                                )
                              ) : (
                                <img src="/yellowwarning.png" alt="warning" style={{ width: 28, height: 28 }} />
                              )}
                            </div>

                            <div style={{ color: '#000', fontSize: 14, fontWeight: 700, lineHeight: '1.3' }}>
                              {university?.subscriptionPlanNormalized ? (
                                isSubscriptionActive() ? (
                                  <div>{`You're currently on the `}<span style={{ color: '#0369A1' }}>{planDetails?.subscription_plan_name || 'Pro Plan'}</span>{`, billed at ${planDetails?.subscription_plan_currency || 'USD'} ${planDetails?.subscription_plan_price ? (Number(planDetails.subscription_plan_price).toFixed ? Number(planDetails.subscription_plan_price).toFixed(2) : planDetails.subscription_plan_price) : '—'} per year.`}</div>
                                ) : (
                                  <div>{`Your current subscription to the `}<span style={{ color: '#0369A1' }}>{planDetails?.subscription_plan_name || 'Pro Plan'}</span>{` is expired, please upgrade.`}</div>
                                )
                              ) : (
                                <div>{"You're currently not subscribed to any plan, please subscribe to be able to use our system functionalities."}</div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Pricing list (compact) */}
                        <div className="pricing-compact">
                          {(() => {
                            const isSysAdmin = (getRoleName(user) === ROLES.SYSTEM_ADMIN) || (user?.roles && user.roles.includes && user.roles.includes(ROLES.SYSTEM_ADMIN))
                            let buyText = 'Buy'
                            if (university?.subscriptionPlanNormalized) {
                              if (isSubscriptionActive()) buyText = 'Upgrade'
                              else if (isSysAdmin) buyText = 'Renew'
                              else buyText = 'Buy'
                            } else {
                              buyText = 'Buy'
                            }

                            // navigate to system-admin plan detail page where buy triggers checkout
                            const handleSelectPlan = (plan) => {
                              const pid = plan.subscription_plan_id
                              if (!pid) return
                              navigate(`/system-admin/subscription-plan/${pid}`)
                            }

                            return <Pricing hideHeader={true} buyButtonText={buyText} onSelectPlan={handleSelectPlan} subscribedPlanId={university?.subscriptionPlanNormalized?.plan_id} />
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className={animatingExit ? 'expanded-exit' : 'expanded-anim'}>
                <div className="cards-row">
                  <div className="card info-card">
                    {/* University information - mimic CustomerService view */}
                    <div className="section-title">University information</div>
                    <div className="info-grid">
                      <InfoItem label="Name" value={university?.universityName} />
                      <InfoItem label="Email" value={university?.universityEmail} />

                      <InfoItem label="Website" value={university?.universityWebsiteUrl} />
                      <InfoItem label="Domain" value={university?.universityDomain} />

                      <InfoItem label="Contact" value={university?.contactNumber} />
                      <InfoItem label="City" value={university?.city} />

                      <InfoItem label="Country" value={university?.country} />
                    </div>
                  </div>

                  <div className="card docs-card">
                    <div className="section-title">Documents</div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                      {logoUrl ? (
                        <div style={{ width: 120, height: 120, borderRadius: '50%', padding: 4, background: '#F8FAFC', border: '1px solid #E5E7EB', boxShadow: '0 6px 18px rgba(0,0,0,0.08)' }}>
                          <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                        </div>
                      ) : (
                        <div style={{ width: 120, height: 120, borderRadius: '50%', background: '#E6F7FF', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0369A1', fontSize: 28, fontWeight: 700, boxShadow: '0 6px 18px rgba(0,0,0,0.08)' }}>{(university?.universityName || '?').charAt(0).toUpperCase()}</div>
                      )}

                      {university?.accreditation_key ? (
                        <button
                          onClick={() => setShowAccModal(true)}
                          style={{
                            padding: '12px 24px', backgroundColor: 'white',
                            border: '1.5px solid #E5E7EB', borderRadius: '10px',
                            color: '#374151', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                            display: 'flex', alignItems: 'center', gap: '8px',
                            transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#9DD957'
                            e.currentTarget.style.borderColor = '#9DD957'
                            e.currentTarget.style.color = '#000'
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(157,217,87,0.3)'
                            e.currentTarget.style.transform = 'translateY(-1px)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'white'
                            e.currentTarget.style.borderColor = '#E5E7EB'
                            e.currentTarget.style.color = '#374151'
                            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'
                            e.currentTarget.style.transform = 'translateY(0)'
                          }}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          View Accreditation
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="subscription-card" style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div className="section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 8 }}>
                        <span style={{ marginRight: 4 }}>Subscription Plan</span>
                        <button
                          aria-label={expandedPlanView ? 'Close subscription view' : 'Open subscription view'}
                          onClick={async (e) => {
                            e.stopPropagation()
                            const willOpen = !expandedPlanView
                            if (willOpen) {
                              setAnimatingExit(true)
                              const pid = university?.subscriptionPlanNormalized?.plan_id
                              setTimeout(async () => {
                                setExpandedPlanView(true)
                                setAnimatingExit(false)
                                if (pid) await fetchPlanDetails(pid)
                              }, 640)
                            } else {
                              // play exit animation then hide
                              setAnimatingExit(true)
                              setTimeout(() => { setAnimatingExit(false); setExpandedPlanView(false) }, 640)
                            }
                          }}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 20, padding: '4px 6px', lineHeight: 1 }}
                        >
                          {expandedPlanView ? '‹' : '›'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                      <InfoItem label="Record ID" value={maskId(university?.subscriptionPlanNormalized?.record_id)} />
                      <InfoItem label="Plan ID" value={maskId(university?.subscriptionPlanNormalized?.plan_id)} />
                      <InfoItem label="Start Date" value={formatDate(university?.subscriptionPlanNormalized?.start_date) || '—'} />
                      <InfoItem label="End Date" value={formatDate(university?.subscriptionPlanNormalized?.end_date) || '—'} />
                    </div>
                  </div>
                </div>

                <div className="metadata-card">
                  <div className="section-title">Metadata</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, paddingTop: 8 }}>
                    <InfoItem label="Created At" value={formatDate(university?.created_at || university?.createdAt) || '—'} />
                    <InfoItem label="Created By" value={university?.created_by || university?.createdBy || '—'} />
                    <InfoItem label="Updated At" value={formatDate(university?.updated_at || university?.updatedAt) || '—'} />
                    <InfoItem label="Updated By" value={university?.updated_by || university?.updatedBy || '—'} />
                  </div>
                </div>
              </div>
            )}
          </section>
            </div>
          )}
        </main>
        {showAccModal && university?.accreditation_key && (
          <FileViewerModal fileKey={university.accreditation_key} onClose={() => setShowAccModal(false)} title="Accreditation Document" />
        )}
      </div>
    </div>
  )
}
