import React from 'react'
import { createPortal } from 'react-dom'

export default function PostDeleteModal({ open, onConfirm, onCancel, title = 'Delete Post', message = 'Are you sure you want to permanently delete this post? This action cannot be undone.' }) {
  if (!open) return null

  const modal = (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15,23,30,0.55)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2147483647,
        padding: 20
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 14,
          width: '100%',
          maxWidth: 520,
          boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
          border: '1px solid #F3F4F6',
          overflow: 'hidden'
        }}
      >
        <div style={{ height: 6, background: 'linear-gradient(90deg,#EF4444,#EF444488)' }} />
        <div style={{ padding: 24 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>{title}</h3>
              <p style={{ margin: '8px 0 0', color: '#6B7280', lineHeight: 1.5 }}>{message}</p>
              <div style={{ marginTop: 12, padding: '10px 12px', background: '#FFF5F5', border: '1px solid #FECACA', borderLeft: '3px solid #EF4444', borderRadius: 8, color: '#991B1B', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                This action is permanent and cannot be reversed.
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '0 24px 20px' }}>
          <button onClick={onCancel} style={{ padding: '10px 18px', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, cursor: 'pointer', color: '#374151', fontWeight: 600 }}>Cancel</button>
          <button onClick={onConfirm} style={{ padding: '10px 18px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>Delete</button>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
