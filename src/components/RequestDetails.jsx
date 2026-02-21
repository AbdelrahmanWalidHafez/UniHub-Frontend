import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { get, patch, deleteRequest } from '../utils/api'
import { logout, getUser } from '../utils/auth'
import { ROUTES } from '../constants/routes'
import FileViewerModal from './FileViewerModal'
import ConfirmationModal from './ConfirmationModal'
import { formatInCairo } from '../utils/timezone'

export default function RequestDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = getUser()

  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')

  const [showLogoModal, setShowLogoModal] = useState(false)
  const [showAccreditationModal, setShowAccreditationModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchRequestDetails()
  }, [id])

  const fetchRequestDetails = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await get(`subscription/api/v1/customer-service/get-request/${id}`)
      setRequest(data)
    } catch (err) {
      setError(err.message || 'Failed to load request details')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate(ROUTES.HOME)
  }

  const formatDate = (dateString) => {
    return formatInCairo(dateString, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const handleStatusChange = (newStatus) => {
    setConfirmAction(newStatus === 'APPROVED' ? 'approve' : newStatus === 'REJECTED' ? 'reject' : null)
    setShowConfirmModal(true)
  }

  const handleDeleteClick = () => {
    setConfirmAction('delete')
    setShowConfirmModal(true)
  }

  const handleConfirmAction = async () => {
    setShowConfirmModal(false)
    setActionLoading(true)
    setWarning('')
    try {
      let response
      switch (confirmAction) {
        case 'approve':
          response = await patch(`subscription/api/v1/customer-service/update-request-status/${id}`, { status: 'APPROVED' })
          if (response?.warn) setWarning(response.warn)
          await fetchRequestDetails()
          break
        case 'reject':
          response = await patch(`subscription/api/v1/customer-service/update-request-status/${id}`, { status: 'REJECTED' })
          if (response?.warn) setWarning(response.warn)
          await fetchRequestDetails()
          break
        case 'delete':
          await deleteRequest(`subscription/api/v1/customer-service/delete-request/${id}`)
          navigate('/customer-service', { state: { message: 'Request deleted successfully' } })
          break
        default:
          break
      }
    } catch (err) {
      setError(err.message || `Failed to ${confirmAction} request`)
    } finally {
      setActionLoading(false)
      setConfirmAction(null)
    }
  }

  
  
  
  
  
  
  
  
  
  
  
  
  const getTabState = (tabValue, currentStatus) => {
    if (tabValue === currentStatus) return 'active'

    
    if (currentStatus === 'APPROVED') return 'locked'

    
    if (tabValue === 'PENDING') return 'locked'

    
    if (currentStatus === 'PENDING') return 'clickable'

    
    if (currentStatus === 'REJECTED' && tabValue === 'APPROVED') return 'clickable'

    return 'locked'
  }

  const tabs = [
    {
      value: 'PENDING',
      activeLabel: 'Pending',
      actionLabel: 'Pending',
      activeStyle: {
        background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
        color: '#78350F',
        border: '1.5px solid #F59E0B',
        shadow: '0 4px 12px rgba(245,158,11,0.25)'
      },
      hoverBg: '#FEF9EC',
      hoverColor: '#92400E',
      dot: '#F59E0B'
    },
    {
      value: 'APPROVED',
      activeLabel: 'Approved',
      actionLabel: 'Approve',
      activeStyle: {
        background: '#ECFDF5',
        color: '#064E3B',
        border: '1.5px solid #9DD957',
        shadow: 'none'
      },
      hoverBg: '#F0FDF8',
      hoverColor: '#065F46',
      dot: '#9DD957'
    },
    {
      value: 'REJECTED',
      activeLabel: 'Rejected',
      actionLabel: 'Reject',
      activeStyle: {
        background: 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)',
        color: '#7F1D1D',
        border: '1.5px solid #EF4444',
        shadow: '0 4px 12px rgba(239,68,68,0.25)'
      },
      hoverBg: '#FFF5F5',
      hoverColor: '#991B1B',
      dot: '#EF4444'
    }
  ]

  
  const getStatusHint = (currentStatus) => {
    switch (currentStatus) {
      case 'PENDING':
        return 'This request is awaiting review. You can approve or reject it.'
      case 'REJECTED':
        return 'This request was rejected. You can still approve it if needed.'
      case 'APPROVED':
        return 'This request has been approved and is now locked.'
      default:
        return ''
    }
  }

  // Lock icon SVG
  const LockIcon = () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.4, marginLeft: '2px', flexShrink: 0 }}>
      <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )

  
  const NavBar = () => (
    <header style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '0 40px', height: '64px', backgroundColor: 'white',
      borderBottom: '1px solid #E5E7EB', position: 'sticky', top: 0,
      zIndex: 100, boxShadow: '0 1px 3px rgba(58,74,82,0.08)'
    }}>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        <button onClick={() => navigate(ROUTES.CUSTOMER_SERVICE)}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
          <img src="/logo.png" alt="UniHub Logo" style={{ height: '36px' }} />
        </button>
      </div>
          <div style={{ flex: 1 }} />
    </header>
  )

  if (loading) {
    return (
      <div style={{ backgroundColor: '#F4F6F8', minHeight: '100vh' }}>
        <NavBar />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              display: 'inline-block', width: '44px', height: '44px',
              border: '3px solid #E5E7EB', borderTop: '3px solid #3a4a52',
              borderRadius: '50%', animation: 'spin 0.8s linear infinite'
            }} />
            <p style={{ marginTop: '16px', color: '#6B7280', fontSize: '14px', fontWeight: '500' }}>
              Loading request details...
            </p>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (error || !request) {
    return (
      <div style={{ backgroundColor: '#F4F6F8', minHeight: '100vh' }}>
        <NavBar />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)' }}>
          <div style={{
            padding: '40px', backgroundColor: 'white', borderRadius: '16px',
            maxWidth: '400px', textAlign: 'center',
            border: '1px solid #FECACA', boxShadow: '0 4px 24px rgba(0,0,0,0.06)'
          }}>
            <div style={{
              width: '48px', height: '48px', backgroundColor: '#FEE2E2', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                  stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600', color: '#111827' }}>Something went wrong</h3>
            <p style={{ margin: '0 0 24px 0', color: '#6B7280', fontSize: '14px' }}>{error || 'Request not found'}</p>
            <button
              onClick={() => navigate(-1)}
              style={{
                padding: '10px 28px', backgroundColor: '#3a4a52', color: 'white',
                border: 'none', borderRadius: '8px', cursor: 'pointer',
                fontSize: '14px', fontWeight: '500', transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#2c3a40'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#3a4a52'}
            >
              Go Back
            </button>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  const currentStatus = request.subscription_request_status

  
  const InfoItem = ({ label, value, isLink, mono }) => (
    <div>
      <div style={{
        fontSize: '11px', color: '#9CA3AF', marginBottom: '6px',
        fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em'
      }}>
        {label}
      </div>
      <div style={{
        fontSize: '14px', color: '#111827', fontWeight: '500',
        wordBreak: 'break-word', fontFamily: mono ? 'monospace' : 'inherit'
      }}>
        {isLink && value ? (
          <a
            href={value.startsWith('http') ? value : `https://${value}`}
            target="_blank" rel="noopener noreferrer"
            style={{ color: '#3a4a52', textDecoration: 'none', borderBottom: '1px dashed #94A3B8', paddingBottom: '1px', transition: 'all 0.2s' }}
            onMouseEnter={(e) => { e.target.style.borderBottomStyle = 'solid'; e.target.style.color = '#2c3a40' }}
            onMouseLeave={(e) => { e.target.style.borderBottomStyle = 'dashed'; e.target.style.color = '#3a4a52' }}
          >
            {value}
          </a>
        ) : (
          <span style={{ color: value ? '#111827' : '#D1D5DB' }}>{value || '—'}</span>
        )}
      </div>
    </div>
  )

  
  const SectionCard = ({ title, children, noBorder }) => (
    <div style={{
      backgroundColor: 'white', borderRadius: '14px',
      border: '1px solid #E5E7EB', overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(58,74,82,0.06)', marginBottom: '20px'
    }}>
      <div style={{
        padding: '16px 28px',
        borderBottom: noBorder ? 'none' : '1px solid #F3F4F6',
        display: 'flex', alignItems: 'center', gap: '10px',
        backgroundColor: '#FAFBFC'
      }}>
        <div style={{ width: '3px', height: '16px', backgroundColor: '#9DD957', borderRadius: '2px', flexShrink: 0 }} />
        <h2 style={{ margin: 0, fontSize: '11px', fontWeight: '700', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {title}
        </h2>
      </div>
      <div style={{ padding: '24px 28px' }}>{children}</div>
    </div>
  )

  return (
    <div style={{ backgroundColor: '#F4F6F8', minHeight: '100vh' }}>
      <NavBar />

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '32px 24px 60px' }}>

        {}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '28px', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              width: '36px', height: '36px', backgroundColor: 'white',
              border: '1px solid #E5E7EB', borderRadius: '10px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#6B7280', flexShrink: 0, transition: 'all 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#3a4a52'
              e.currentTarget.style.color = '#3a4a52'
              e.currentTarget.style.backgroundColor = '#F8FAFB'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#E5E7EB'
              e.currentTarget.style.color = '#6B7280'
              e.currentTarget.style.backgroundColor = 'white'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#111827', lineHeight: 1.2 }}>
              Subscription Request
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#9CA3AF', fontFamily: 'monospace' }}>
              #{request.request_id || id}
            </p>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
            {}
            {(() => {
              const tab = tabs.find(t => t.value === currentStatus)
              if (!tab) return null
              return (
                <span style={{
                  padding: '6px 14px', borderRadius: '20px',
                  fontSize: '12px', fontWeight: '700',
                  letterSpacing: '0.04em', textTransform: 'uppercase',
                  background: tab.activeStyle.background,
                  color: tab.activeStyle.color,
                  border: tab.activeStyle.border,
                  boxShadow: tab.activeStyle.shadow
                }}>
                  {tab.activeLabel}
                </span>
              )
            })()}

            {}
            <button
              onClick={handleDeleteClick}
              disabled={actionLoading}
              style={{
                padding: '8px 18px', backgroundColor: 'white', color: '#DC2626',
                border: '1px solid #FECACA', borderRadius: '8px',
                cursor: actionLoading ? 'not-allowed' : 'pointer',
                fontSize: '13px', fontWeight: '600',
                opacity: actionLoading ? 0.5 : 1, transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}
              onMouseEnter={(e) => {
                if (!actionLoading) {
                  e.currentTarget.style.backgroundColor = '#FEE2E2'
                  e.currentTarget.style.borderColor = '#EF4444'
                }
              }}
              onMouseLeave={(e) => {
                if (!actionLoading) {
                  e.currentTarget.style.backgroundColor = 'white'
                  e.currentTarget.style.borderColor = '#FECACA'
                }
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Delete
            </button>
          </div>
        </div>

        {}
        {warning && (
          <div style={{
            padding: '14px 18px', backgroundColor: '#FFFBEB',
            border: '1px solid #FDE68A', borderLeft: '4px solid #F59E0B',
            borderRadius: '10px', color: '#78350F', marginBottom: '20px',
            fontSize: '13px', fontWeight: '500',
            display: 'flex', alignItems: 'center', gap: '10px'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
              <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {warning}
          </div>
        )}

        {}
        <SectionCard title="Request Status" noBorder>

          {}
          <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#9CA3AF', fontWeight: '500' }}>
            {getStatusHint(currentStatus)}
          </p>

          <div style={{ display: 'flex', gap: '10px' }}>
            {tabs.map((tab) => {
              const tabState = getTabState(tab.value, currentStatus)
              
              
              

              
              if (tabState === 'active') {
                return (
                  <div
                    key={tab.value}
                    style={{
                      flex: 1, padding: '14px 20px', borderRadius: '10px',
                      fontSize: '13px', fontWeight: '600', textAlign: 'center',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      background: tab.activeStyle.background,
                      color: tab.activeStyle.color,
                      border: tab.activeStyle.border,
                      boxShadow: tab.activeStyle.shadow,
                      transform: 'translateY(-1px)',
                      cursor: 'default', userSelect: 'none'
                    }}
                  >
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: tab.dot, flexShrink: 0 }} />
                    {tab.activeLabel}
                  </div>
                )
              }

              
              if (tabState === 'locked') {
                return (
                  <div
                    key={tab.value}
                    style={{
                      flex: 1, padding: '14px 20px', borderRadius: '10px',
                      fontSize: '13px', fontWeight: '500', textAlign: 'center',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      backgroundColor: '#F9FAFB', color: '#D1D5DB',
                      border: '1.5px solid #F3F4F6',
                      cursor: 'not-allowed', userSelect: 'none'
                    }}
                  >
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#E5E7EB', flexShrink: 0 }} />
                    {tab.activeLabel}
                    <LockIcon />
                  </div>
                )
              }

              
              return (
                <button
                  key={tab.value}
                  onClick={() => !actionLoading && handleStatusChange(tab.value)}
                  disabled={actionLoading}
                  style={{
                    flex: 1, padding: '14px 20px', borderRadius: '10px',
                    fontSize: '13px', fontWeight: '600', textAlign: 'center',
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.25s ease',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    backgroundColor: 'white', color: '#9CA3AF',
                    border: '1.5px solid #E5E7EB', boxShadow: 'none',
                    transform: 'translateY(0)'
                  }}
                  onMouseEnter={(e) => {
                    if (!actionLoading) {
                      e.currentTarget.style.backgroundColor = tab.hoverBg
                      e.currentTarget.style.color = tab.hoverColor
                      e.currentTarget.style.borderColor = tab.dot
                      e.currentTarget.style.transform = 'translateY(-1px)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!actionLoading) {
                      e.currentTarget.style.backgroundColor = 'white'
                      e.currentTarget.style.color = '#9CA3AF'
                      e.currentTarget.style.borderColor = '#E5E7EB'
                      e.currentTarget.style.transform = 'translateY(0)'
                    }
                  }}
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#D1D5DB', flexShrink: 0, transition: 'background-color 0.2s' }} />
                  {tab.actionLabel}
                </button>
              )
            })}
          </div>
        </SectionCard>

        {}
        <SectionCard title="University Information">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px 40px' }}>
            <InfoItem label="University Name" value={request.university_name} />
            <InfoItem label="University Email" value={request.university_email} />
            <InfoItem label="Country" value={request.country} />
            <InfoItem label="City" value={request.city} />
            <InfoItem label="Contact Number" value={request.contact_number} />
            <InfoItem label="Website" value={request.website_url} isLink />
            <InfoItem label="Domain" value={request.university_domain} />
          </div>
        </SectionCard>

        {}
        {(request.logo_key || request.accreditation_key) && (
          <SectionCard title="Documents">
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {request.logo_key && (
                <button
                  onClick={() => setShowLogoModal(true)}
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
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="2"/>
                    <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  View Logo
                </button>
              )}
              {request.accreditation_key && (
                <button
                  onClick={() => setShowAccreditationModal(true)}
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
          </SectionCard>
        )}

        {}
        <SectionCard title="Request Metadata">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px 40px' }}>
            <InfoItem label="Request ID" value={request.request_id} mono />
            <InfoItem label="Created At" value={formatDate(request.created_at)} />
            <InfoItem label="Updated By" value={request.updated_by} />
            <InfoItem label="Updated At" value={formatDate(request.updated_at)} />
          </div>
        </SectionCard>

      </div>

      {}
      {showLogoModal && request.logo_key && (
        <FileViewerModal fileKey={request.logo_key} onClose={() => setShowLogoModal(false)} title="University Logo" />
      )}
      {showAccreditationModal && request.accreditation_key && (
        <FileViewerModal fileKey={request.accreditation_key} onClose={() => setShowAccreditationModal(false)} title="Accreditation Document" />
      )}
      {showConfirmModal && (
        <ConfirmationModal
          action={confirmAction}
          onConfirm={handleConfirmAction}
          onCancel={() => { setShowConfirmModal(false); setConfirmAction(null) }}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}