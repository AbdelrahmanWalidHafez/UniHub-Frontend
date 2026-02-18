import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { get, getFileAsBlob } from '../utils/api'
import { logout, getUser } from '../utils/auth'
import { formatDate } from './TableCommons'
import { ROUTES } from '../constants/routes'
import FileViewerModal from './FileViewerModal'

export default function UniversityDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = getUser()

  const [university, setUniversity] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [logoUrl, setLogoUrl] = useState(null)
  const [showLogoModal, setShowLogoModal] = useState(false)
  const [showAccModal, setShowAccModal] = useState(false)

  useEffect(() => { fetchUniversity() }, [id])

  // cleanup blob url
  useEffect(() => {
    return () => { if (logoUrl) URL.revokeObjectURL(logoUrl) }
  }, [logoUrl])

  const fetchUniversity = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await get(`universitymanagement/api/v1/get-university/${id}`)
      // normalize fields
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
        // map s3 keys (backend names may vary)
        logo_key: data?.logo_key || data?.universityLogo || data?.university_logo || data?.logoKey,
        accreditation_key: data?.accreditation_key || data?.accreditationKey,
        // keep nested objects if present
        // normalize subscription plan response (backend returns UniversitySubscriptionPlanResponse)
        subscriptionPlan: data?.subscription_plan || data?.subscriptionPlan || data?.subscription_plan,
        subscriptionPlanNormalized: data?.subscription_plan ? {
          record_id: data.subscription_plan.record_id || data.subscription_plan.recordId || data.subscription_plan.id,
          plan_id: data.subscription_plan.plan_id || data.subscription_plan.planId || data.subscription_plan.pid,
          start_date: data.subscription_plan.start_date || data.subscription_plan.startDate,
          end_date: data.subscription_plan.end_date || data.subscription_plan.endDate
        } : (data?.subscriptionPlan ? {
          record_id: data.subscriptionPlan.record_id || data.subscriptionPlan.recordId || data.subscriptionPlan.id,
          plan_id: data.subscriptionPlan.plan_id || data.subscriptionPlan.planId || data.subscriptionPlan.pid,
          start_date: data.subscriptionPlan.start_date || data.subscriptionPlan.startDate,
          end_date: data.subscriptionPlan.end_date || data.subscriptionPlan.endDate
        } : null),
        systemAdmin: data?.system_admin || data?.systemAdmin,
        created_at: data?.created_at || data?.createdAt,
        updated_at: data?.updated_at || data?.updatedAt,
        created_by: data?.created_by || data?.createdBy,
        updated_by: data?.updated_by || data?.updatedBy,
      }
      setUniversity(u)

      // fetch logo preview if available
      if (u.logo_key) {
        try {
          const blob = await getFileAsBlob(`s3/api/v1/get-file/${u.logo_key}`)
          const url = URL.createObjectURL(blob)
          setLogoUrl(url)
        } catch (err) {
          console.warn('Failed to load logo preview', err)
        }
      }
    } catch (err) {
      console.error('Failed to load university', err)
      setError(err.message || 'Failed to load university')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => { await logout(); navigate(ROUTES.HOME) }

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

  const SectionCard = ({ title, children, style }) => (
    <div style={{ backgroundColor: 'white', borderRadius: 14, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 2px 8px rgba(58,74,82,0.06)', marginBottom: 20, ...(style || {}) }}>
      <div style={{ padding: '12px 18px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 10, backgroundColor: '#FAFBFC' }}>
        <div style={{ width: 3, height: 16, backgroundColor: '#9DD957', borderRadius: 2 }} />
        <h3 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#000000', textTransform: 'uppercase' }}>{title}</h3>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  )

  

  return (
    <div style={{ backgroundColor: '#F4F6F8', minHeight: '100vh' }}>
      <header style={{ padding: '20px 60px', borderBottom: '1px solid #e0e0e0' }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button onClick={() => navigate(ROUTES.CUSTOMER_SERVICE)} style={{ background: 'transparent', border: 'none' }}><img src="/logo.png" alt="logo" style={{ height: 40 }} /></button>
        </div>
      </header>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '36px 28px' }}>
        {error && (
          <div style={{ marginBottom: 18, padding: '12px 16px', backgroundColor: '#FFF5F5', border: '1px solid #FECACA', borderLeft: '4px solid #EF4444', borderRadius: 10, color: '#991B1B' }}>
            {error}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <button onClick={() => navigate(-1)} style={{ width: 36, height:36, borderRadius: 10, border: '1px solid #E5E7EB', background: 'white', cursor: 'pointer' }}>‹</button>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#111827' }}>University Details</h1>
            <div style={{ fontFamily: 'monospace', color: '#6B7280', marginTop: 6 }}>#{String(university?.uniId || id)}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 28, alignItems: 'start' }}>
          {}
          <div>
            <SectionCard title="University Information">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '18px 24px' }}>
                <InfoItem label="Name" value={university?.universityName} />
                <InfoItem label="Email" value={university?.universityEmail} />
                <InfoItem label="Website" value={university?.universityWebsiteUrl} />
                <InfoItem label="Domain" value={university?.universityDomain} />
                <InfoItem label="Contact" value={university?.contactNumber} />
                <InfoItem label="City" value={university?.city} />
                <InfoItem label="Country" value={university?.country} />
              </div>
            </SectionCard>

            <SectionCard title="Subscription Plan">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 24px' }}>
                <div>
                  <InfoItem label="Record ID" value={university?.subscriptionPlanNormalized?.record_id} mono />
                  <div style={{ height: 12 }} />
                  <InfoItem label="Plan ID" value={university?.subscriptionPlanNormalized?.plan_id} mono />
                </div>
                <div>
                  <InfoItem label="Start Date" value={formatDate(university?.subscriptionPlanNormalized?.start_date)} />
                  <div style={{ height: 12 }} />
                  <InfoItem label="End Date" value={formatDate(university?.subscriptionPlanNormalized?.end_date)} />
                </div>
              </div>
            </SectionCard>

            {}
          </div>

          <div style={{ display: 'flex', alignItems: 'stretch' }}>
                <SectionCard title="Documents" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, minWidth: 120, marginLeft: '50px' }}>
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" style={{ width: 112, height: 112, borderRadius: '50%', objectFit: 'cover', boxShadow: '0 6px 18px rgba(0,0,0,0.08)' }} />
                    ) : (
                      <div style={{ width: 112, height: 112, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: 28, fontWeight: 700 }}>{(university?.universityName || '?').charAt(0).toUpperCase()}</div>
                    )}
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', width: '100%' }}>
                      {university?.accreditation_key && (
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
                      )}
                    </div>
                  </div>
                <div style={{ flex: 1 }}>
                  {}
                  <div style={{ height: '100%' }} />
                </div>
              </div>
            </SectionCard>
          </div>

          {}
          <div style={{ gridColumn: '1 / -1' }}>
            <SectionCard title="Metadata">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px 20px' }}>
                <InfoItem label="Created At" value={formatDate(university?.created_at || university?.createdAt)} />
                <InfoItem label="Created By" value={university?.created_by || university?.createdBy} />
                <InfoItem label="Updated At" value={formatDate(university?.updated_at || university?.updatedAt)} />
                <InfoItem label="Updated By" value={university?.updated_by || university?.updatedBy} />
              </div>
            </SectionCard>
          </div>
        </div>
        {}
        {showLogoModal && university?.logo_key && (
          <FileViewerModal fileKey={university.logo_key} onClose={() => setShowLogoModal(false)} title="University Logo" />
        )}
        {showAccModal && university?.accreditation_key && (
          <FileViewerModal fileKey={university.accreditation_key} onClose={() => setShowAccModal(false)} title="Accreditation Document" />
        )}
      </div>
    </div>
  )
}