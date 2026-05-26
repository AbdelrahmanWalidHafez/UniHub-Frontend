import React, { useState, useEffect } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { getUser } from '../utils/auth'
import { ROLES, getRoleName } from '../constants/roles'
import { get, getFileAsBlob } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import FileViewerModal from './FileViewerModal'
import { formatInCairo, parseAsCairo } from '../utils/timezone'
import Pricing from './Pricing'
import './universityAdmin.css'

export default function UniversitySystemAdmin() {
  const user = getUser()
  const navigate = useNavigate()
  const { universityData: rawData, universityLoading: loading, logoUrl } = useOutletContext() || {}
  const [university, setUniversity] = useState(null)
  const [showAccModal, setShowAccModal] = useState(false)
  const [expandedPlanView, setExpandedPlanView] = useState(false)
  const [planDetails, setPlanDetails] = useState(null)
  const [planLoading, setPlanLoading] = useState(false)
  const [planError, setPlanError] = useState('')
  const [animatingExit, setAnimatingExit] = useState(false)

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
    if (!rawData) return
    const data = rawData
    setUniversity({
      ...data,
      uniId: data?.university_id || data?.uniId || data?.id,
      universityName: data?.university_name || data?.universityName || data?.name,
      universityEmail: data?.university_email || data?.universityEmail,
      universityWebsiteUrl: data?.website_url || data?.universityWebsiteUrl || data?.websiteUrl,
      universityDomain: data?.university_domain || data?.universityDomain,
      contactNumber: data?.contact_number || data?.contactNumber,
      country: data?.country,
      city: data?.city,
      logo_key: data?.logo_key || data?.universityLogo || data?.university_logo || data?.logoKey,
      accreditation_key: data?.accreditation_key || data?.accreditationKey,
      subscriptionPlanNormalized: data?.subscription_plan ? {
        record_id: data.subscription_plan.record_id || data.subscription_plan.recordId || data.subscription_plan.id,
        plan_id: data.subscription_plan.plan_id || data.subscription_plan.planId || data.subscription_plan.pid,
        start_date: data.subscription_plan.start_date || data.subscription_plan.startDate,
        end_date: data.subscription_plan.end_date || data.subscription_plan.endDate,
      } : null,
    })
  }, [rawData])

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
    <section className="univ-details-card">
      {expandedPlanView ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            aria-label="Back"
            onClick={() => { setAnimatingExit(true); setTimeout(() => { setAnimatingExit(false); setExpandedPlanView(false) }, 640) }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 20, padding: '4px 6px', lineHeight: 1 }}
          >‹</button>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Current Subscription Plan</h2>
        </div>
      ) : (
        <h2>University Details</h2>
      )}

      {expandedPlanView ? (
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%', padding: '12px 0' }}>
          <div className={animatingExit ? 'expanded-exit' : 'expanded-anim'} style={{ width: '100%', maxWidth: 980 }}>
            {planLoading ? (
              <div style={{ padding: 20 }}>Loading plan...</div>
            ) : (
              <div>
                <div className="card" style={{ marginBottom: 18, padding: '14px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <div style={{ width: 4, height: 18, background: '#9DD957', borderRadius: 2 }} />
                    <div style={{ fontSize: 16, fontWeight: 800 }}>Subscribed Plan</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {university?.subscriptionPlanNormalized ? (
                        isSubscriptionActive() ? null : <img src="/redwarning.png" alt="warning" style={{ width: 28, height: 28 }} />
                      ) : (
                        <img src="/yellowwarning.png" alt="warning" style={{ width: 28, height: 28 }} />
                      )}
                    </div>
                    <div style={{ color: '#000', fontSize: 14, fontWeight: 700, lineHeight: '1.3' }}>
                      {university?.subscriptionPlanNormalized ? (
                        isSubscriptionActive() ? (
                          <div>You're currently on the <span style={{ color: '#0369A1' }}>{planDetails?.subscription_plan_name || 'Pro Plan'}</span>, billed at {planDetails?.subscription_plan_currency || 'USD'} {planDetails?.subscription_plan_price ? Number(planDetails.subscription_plan_price).toFixed(2) : '—'} per year.</div>
                        ) : (
                          <div>Your current subscription to the <span style={{ color: '#0369A1' }}>{planDetails?.subscription_plan_name || 'Pro Plan'}</span> is expired, please upgrade.</div>
                        )
                      ) : (
                        <div>You're currently not subscribed to any plan, please subscribe to be able to use our system functionalities.</div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="pricing-compact">
                  {(() => {
                    const isSysAdmin = getRoleName(user) === ROLES.SYSTEM_ADMIN
                    let buyText = university?.subscriptionPlanNormalized
                      ? (isSubscriptionActive() ? 'Upgrade' : (isSysAdmin ? 'Renew' : 'Buy'))
                      : 'Buy'
                    const handleSelectPlan = (plan) => {
                      const pid = plan.subscription_plan_id
                      if (pid) navigate(`/system-admin/subscription-plan/${pid}`)
                    }
                    return <Pricing hideHeader={true} buyButtonText={buyText} onSelectPlan={handleSelectPlan} subscribedPlanId={university?.subscriptionPlanNormalized?.plan_id} />
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className={animatingExit ? 'expanded-exit' : 'expanded-anim'}>
          <div className="cards-row">
            <div className="card info-card">
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
                  <div style={{ width: 120, height: 120, borderRadius: '50%', background: '#E6F7FF', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0369A1', fontSize: 28, fontWeight: 700, boxShadow: '0 6px 18px rgba(0,0,0,0.08)' }}>
                    {(university?.universityName || '?').charAt(0).toUpperCase()}
                  </div>
                )}
                {university?.accreditation_key && (
                  <button
                    onClick={() => setShowAccModal(true)}
                    style={{ padding: '12px 24px', backgroundColor: 'white', border: '1.5px solid #E5E7EB', borderRadius: '10px', color: '#374151', cursor: 'pointer', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#9DD957'; e.currentTarget.style.borderColor = '#9DD957'; e.currentTarget.style.color = '#000'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.color = '#374151'; e.currentTarget.style.transform = 'translateY(0)' }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    View Accreditation
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="subscription-card" style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ marginRight: 4 }}>Subscription Plan</span>
                  <button
                    aria-label="Open subscription view"
                    onClick={async (e) => {
                      e.stopPropagation()
                      setAnimatingExit(true)
                      const pid = university?.subscriptionPlanNormalized?.plan_id
                      setTimeout(async () => {
                        setExpandedPlanView(true)
                        setAnimatingExit(false)
                        if (pid) await fetchPlanDetails(pid)
                      }, 640)
                    }}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 20, padding: '4px 6px', lineHeight: 1 }}
                  >›</button>
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

      {showAccModal && university?.accreditation_key && (
        <FileViewerModal fileKey={university.accreditation_key} onClose={() => setShowAccModal(false)} title="Accreditation Document" />
      )}
    </section>
  )
}
