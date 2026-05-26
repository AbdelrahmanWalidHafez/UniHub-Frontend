import React from 'react'
import { formatInCairo } from '../utils/timezone'

export function getSortIcon(field, currentField, dir) {
  if (currentField !== field) return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.4 }}>
      <path d="M7 15l5 5 5-5M7 9l5-5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
  return dir === 'asc' ? (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
      <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ) : (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export const SkeletonRow = ({ index, cols = 5 }) => (
  <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} style={{ padding: '18px 20px' }}>
        <div style={{
          height: '14px',
          borderRadius: '6px',
          backgroundColor: '#F3F4F6',
          width: i === cols - 1 ? '24px' : `${60 + (index * 7 + i * 13) % 30}%`,
          animation: 'shimmer 1.5s ease-in-out infinite',
          animationDelay: `${index * 0.07}s`
        }} />
      </td>
    ))}
  </tr>
)

export function formatDate(dateString) {
  if (!dateString) return '—'
  try {
    return formatInCairo(dateString, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return '—'
  }
}

export const EmptyState = ({ title = 'No items found', subtitle = '' }) => (
  <tr>
    <td colSpan={5} style={{ padding: '72px 24px', textAlign: 'center' }}>
      <div style={{ width: '56px', height: '56px', backgroundColor: '#F3F4F6', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4m8-4v4m0 0l-2-2m2 2l2-2" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <p style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: '600', color: '#374151' }}>{title}</p>
      <p style={{ margin: 0, fontSize: '13px', color: '#9CA3AF' }}>{subtitle}</p>
    </td>
  </tr>
)
