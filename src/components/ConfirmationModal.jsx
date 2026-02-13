import React from 'react'

export default function ConfirmationModal({ action, onConfirm, onCancel }) {
  const getActionDetails = () => {
    switch (action) {
      case 'approve':
        return {
          title: 'Approve Request',
          message: 'Are you sure you want to approve this subscription request?',
          confirmText: 'Approve',
          type: 'approve',
          iconPath: 'M20 6L9 17l-5-5',
          iconBg: '#D1FAE5',
          iconColor: '#059669',
          confirmBg: '#059669',
          confirmHover: '#047857',
          confirmShadow: 'rgba(5,150,105,0.35)',
          accentColor: '#10B981',
          badgeBg: 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)',
          badgeColor: '#064E3B',
          badgeBorder: '#10B981'
        }
      case 'reject':
        return {
          title: 'Reject Request',
          message: 'Are you sure you want to reject this subscription request?',
          confirmText: 'Reject',
          type: 'reject',
          iconPath: 'M18 6L6 18M6 6l12 12',
          iconBg: '#FEE2E2',
          iconColor: '#DC2626',
          confirmBg: '#DC2626',
          confirmHover: '#B91C1C',
          confirmShadow: 'rgba(220,38,38,0.35)',
          accentColor: '#EF4444',
          badgeBg: 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)',
          badgeColor: '#7F1D1D',
          badgeBorder: '#EF4444'
        }
      case 'delete':
        return {
          title: 'Delete Request',
          message: 'Are you sure you want to permanently delete this request? This action cannot be undone.',
          confirmText: 'Delete',
          type: 'delete',
          iconPath: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
          iconBg: '#FEE2E2',
          iconColor: '#DC2626',
          confirmBg: '#DC2626',
          confirmHover: '#B91C1C',
          confirmShadow: 'rgba(220,38,38,0.35)',
          accentColor: '#EF4444',
          badgeBg: 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)',
          badgeColor: '#7F1D1D',
          badgeBorder: '#EF4444'
        }
      default:
        return {
          title: 'Confirm Action',
          message: 'Are you sure you want to proceed?',
          confirmText: 'Confirm',
          type: 'default',
          iconPath: 'M12 9v4m0 4h.01',
          iconBg: '#E8ECF0',
          iconColor: '#3a4a52',
          confirmBg: '#3a4a52',
          confirmHover: '#2c3a40',
          confirmShadow: 'rgba(58,74,82,0.35)',
          accentColor: '#3a4a52',
          badgeBg: 'linear-gradient(135deg, #E8ECF0 0%, #D1D9DD 100%)',
          badgeColor: '#1a2a32',
          badgeBorder: '#3a4a52'
        }
    }
  }

  const d = getActionDetails()

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 30, 0.55)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
        animation: 'fadeInOverlay 0.2s ease'
      }}
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '18px',
          maxWidth: '420px',
          width: '100%',
          boxShadow: '0 24px 60px rgba(0,0,0,0.18), 0 8px 20px rgba(0,0,0,0.1)',
          overflow: 'hidden',
          animation: 'slideUpModal 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
          border: '1px solid #F3F4F6'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Colored top accent bar */}
        <div style={{
          height: '4px',
          background: `linear-gradient(90deg, ${d.accentColor}, ${d.accentColor}88)`,
          width: '100%'
        }} />

        {/* Body */}
        <div style={{ padding: '32px 32px 28px' }}>

          {/* Icon + Title row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
            {/* Icon circle */}
            <div style={{
              width: '48px', height: '48px', borderRadius: '14px',
              backgroundColor: d.iconBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d={d.iconPath} stroke={d.iconColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            <div style={{ paddingTop: '2px' }}>
              <h3 style={{
                margin: '0 0 6px 0',
                fontSize: '17px',
                fontWeight: '700',
                color: '#111827',
                lineHeight: 1.2
              }}>
                {d.title}
              </h3>
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: '#6B7280',
                lineHeight: '1.6'
              }}>
                {d.message}
              </p>
            </div>
          </div>

          {/* Destructive warning strip for delete */}
          {d.type === 'delete' && (
            <div style={{
              marginTop: '16px',
              padding: '10px 14px',
              backgroundColor: '#FFF5F5',
              border: '1px solid #FECACA',
              borderLeft: '3px solid #EF4444',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#991B1B',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              This action is permanent and cannot be reversed.
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '0 32px 28px',
          display: 'flex',
          gap: '10px',
          justifyContent: 'flex-end'
        }}>
          {/* Cancel */}
          <button
            onClick={onCancel}
            style={{
              padding: '10px 22px',
              backgroundColor: 'white',
              color: '#4B5563',
              border: '1.5px solid #E5E7EB',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              transition: 'all 0.2s',
              letterSpacing: '0.01em'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F9FAFB'
              e.currentTarget.style.borderColor = '#3a4a52'
              e.currentTarget.style.color = '#3a4a52'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white'
              e.currentTarget.style.borderColor = '#E5E7EB'
              e.currentTarget.style.color = '#4B5563'
            }}
          >
            Cancel
          </button>

          {/* Confirm */}
          <button
            onClick={onConfirm}
            style={{
              padding: '10px 24px',
              backgroundColor: d.confirmBg,
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '700',
              transition: 'all 0.2s',
              letterSpacing: '0.02em',
              boxShadow: `0 4px 12px ${d.confirmShadow}`,
              display: 'flex', alignItems: 'center', gap: '7px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = d.confirmHover
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = `0 6px 16px ${d.confirmShadow}`
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = d.confirmBg
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = `0 4px 12px ${d.confirmShadow}`
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d={d.iconPath} stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {d.confirmText}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeInOverlay {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideUpModal {
          from { opacity: 0; transform: translateY(24px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
      `}</style>
    </div>
  )
}