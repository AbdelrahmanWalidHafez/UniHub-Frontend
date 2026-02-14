import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { get } from '../utils/api'
import { logout, getUser } from '../utils/auth'
import { deleteRequest } from '../utils/api'
import ConfirmationModal from './ConfirmationModal'
import { formatDate } from './TableCommons'
import { ROUTES } from '../constants/routes'

export default function InquiryDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = getUser()

  const [inquiry, setInquiry] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // UI helpers reused from SubscriptionPlanDetails style (larger for denser layout)
  const InfoItem = ({ label, value, mono }) => (
    <div>
      <div style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      <div style={{ fontSize: '16px', color: '#111827', fontWeight: '600', wordBreak: 'break-word', fontFamily: mono ? 'monospace' : 'inherit' }}>{value || '—'}</div>
    </div>
  )

  const SectionCard = ({ title, children }) => (
    <div style={{ backgroundColor: 'white', borderRadius: '14px', border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 2px 12px rgba(58,74,82,0.08)', marginBottom: '24px' }}>
      <div style={{ padding: '20px 48px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#FAFBFC' }}>
        <div style={{ width: '4px', height: '18px', backgroundColor: '#3a4a52', borderRadius: '2px', flexShrink: 0 }} />
        <h2 style={{ margin: 0, fontSize: '12px', fontWeight: '800', color: '#3a4a52', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</h2>
      </div>
      <div style={{ padding: '36px 48px' }}>{children}</div>
    </div>
  )

  useEffect(() => {
    fetchInquiry()
  }, [id])

  const fetchInquiry = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await get(`subscription/api/v1/inquiries/customer-service/get-inquiry/${id}`)
      setInquiry(data)
    } catch (err) {
      console.error('Failed to load inquiry', err)
      setError(err.message || 'Failed to load inquiry')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const openEmail = (email = '', subject = '') => {
    const gmailUrl = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(email)}&su=${encodeURIComponent(subject)}`
    window.open(gmailUrl, '_blank')
  }

  const handleDeleteClick = () => {
    setShowConfirmModal(true)
  }

  const handleConfirmDelete = async () => {
    setShowConfirmModal(false)
    setActionLoading(true)
    setWarning('')
    try {
      await deleteRequest(`subscription/api/v1/inquiries/customer-service/delete-inquiry/${id}`)
      navigate('/customer-service', { state: { message: 'Inquiry deleted successfully' } })
    } catch (err) {
      setError(err.message || 'Failed to delete inquiry')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ backgroundColor: '#F4F6F8', minHeight: '100vh' }}>
        <header className="navbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 60px', borderBottom: '1px solid #e0e0e0' }}>
          <div style={{ flex: 1 }}></div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            <button 
              onClick={() => navigate(ROUTES.CUSTOMER_SERVICE)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <img src="/logo.png" alt="UniHub Logo" style={{ height: '40px' }} />
            </button>
          </div>

          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                color: '#666'
              }}
              title="Logout"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17 16L21 12M21 12L17 8M21 12H7M13 16C13 17.6569 11.6569 19 10 19H6C4.34315 19 3 17.6569 3 16V8C3 6.34315 4.34315 5 6 5H10C11.6569 5 13 6.34315 13 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </header>

        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 84px)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'inline-block', width: '44px', height: '44px', border: '3px solid #E5E7EB', borderTop: '3px solid #3a4a52', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ marginTop: '16px', color: '#6B7280', fontSize: '14px', fontWeight: '500' }}>Loading inquiry...</p>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (error || !inquiry) {
    return (
      <div style={{ backgroundColor: '#F4F6F8', minHeight: '100vh' }}>
        <header className="navbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 60px', borderBottom: '1px solid #e0e0e0' }}>
          <div style={{ flex: 1 }}></div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            <button 
              onClick={() => navigate(ROUTES.CUSTOMER_SERVICE)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <img src="/logo.png" alt="UniHub Logo" style={{ height: '40px' }} />
            </button>
          </div>

          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                color: '#666'
              }}
              title="Logout"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17 16L21 12M21 12L17 8M21 12H7M13 16C13 17.6569 11.6569 19 10 19H6C4.34315 19 3 17.6569 3 16V8C3 6.34315 4.34315 5 6 5H10C11.6569 5 13 6.34315 13 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </header>

        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 84px)' }}>
          <div style={{ padding: '40px', backgroundColor: 'white', borderRadius: '16px', maxWidth: '600px', textAlign: 'center', border: '1px solid #FECACA', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
            <div style={{ width: '48px', height: '48px', backgroundColor: '#FEE2E2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600', color: '#111827' }}>Inquiry not found</h3>
            <p style={{ margin: '0 0 24px 0', color: '#6B7280', fontSize: '14px' }}>{error || 'No inquiry data available'}</p>
            <button onClick={() => navigate(-1)} style={{ padding: '10px 28px', backgroundColor: '#3a4a52', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#2c3a40'} onMouseLeave={(e) => e.target.style.backgroundColor = '#3a4a52'}>Go Back</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: '#F4F6F8', minHeight: '100vh' }}>
      <header className="navbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 60px', borderBottom: '1px solid #e0e0e0' }}>
        <div style={{ flex: 1 }}></div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <button 
            onClick={() => navigate(ROUTES.CUSTOMER_SERVICE)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <img src="/logo.png" alt="UniHub Logo" style={{ height: '40px' }} />
          </button>
        </div>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              color: '#666'
            }}
            title="Logout"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17 16L21 12M21 12L17 8M21 12H7M13 16C13 17.6569 11.6569 19 10 19H6C4.34315 19 3 17.6569 3 16V8C3 6.34315 4.34315 5 6 5H10C11.6569 5 13 6.34315 13 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </header>

      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '60px 40px 100px' }}>

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '34px', gap: '16px', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              width: '36px', height: '36px', backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '10px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', flexShrink: 0, transition: 'all 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3a4a52'; e.currentTarget.style.color = '#3a4a52'; e.currentTarget.style.backgroundColor = '#F8FAFB' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.color = '#6B7280'; e.currentTarget.style.backgroundColor = 'white' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>

          <div>
            <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: '#111827', lineHeight: 1.1 }}>Inquiry</h1>
            <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#9CA3AF', fontFamily: 'monospace' }}>#{String(inquiry.id || inquiry.inquiry_id || id)}</p>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => openEmail(inquiry.customer_email || inquiry.customerEmail || '', inquiry.subject || '')}
              style={{ padding: '8px 16px', backgroundColor: '#3a4a52', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
            >
              Send email
            </button>

            <button
              onClick={handleDeleteClick}
              disabled={actionLoading}
              style={{ padding: '8px 18px', backgroundColor: 'white', color: '#DC2626', border: '1px solid #FECACA', borderRadius: '8px', cursor: actionLoading ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '600', display: 'flex', gap: 8, alignItems: 'center' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Delete
            </button>
          </div>
        </div>

        <SectionCard title="Inquiry Details">
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 360px', gap: '28px' }}>
            <div>
              <InfoItem label="Subject" value={inquiry.subject || '—'} />
              <div style={{ height: 16 }} />
              <InfoItem label="Message" value={(
                <div style={{ color: '#111827', whiteSpace: 'pre-wrap', fontWeight: 500, fontSize: '16px' }}>{inquiry.content || inquiry.body || 'No content'}</div>
              )} />
            </div>

            <div>
              <InfoItem label="From" value={inquiry.customer_email || inquiry.customerEmail || '—'} />
              <div style={{ height: 12 }} />
              <InfoItem label="Received" value={formatDate(inquiry.created_at || inquiry.createdAt)} />
            </div>
            {showConfirmModal && (
              <ConfirmationModal
                action="delete"
                onConfirm={handleConfirmDelete}
                onCancel={() => setShowConfirmModal(false)}
              />
            )}
          </div>
        </SectionCard>

      </div>
    </div>
  )
}
