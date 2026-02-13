import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { get } from '../utils/api'

export default function SubscriptionRequests() {
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const itemsPerPage = 5

  // Sorting
  const [sortField, setSortField] = useState('createdAt')
  const [sortDir, setSortDir] = useState('desc')

  async function fetchSubscriptionRequests() {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({
        page_num: page,
        page_size: itemsPerPage,
        sort_field: sortField,
        sort_dir: sortDir
      })
      const data = await get(`subscription/api/v1/customer-service/get-requests?${params.toString()}`)
      const requestsData = data?.['subscription-requests'] || (Array.isArray(data) ? data : []) || []
      setRequests(Array.isArray(requestsData) ? requestsData : [])
      setTotalPages(data?.total_pages || Math.ceil((data?.total_count || 0) / itemsPerPage) || 1)
      setTotalItems(data?.total_count || requestsData.length || 0)
      setHasMore(data?.has_more || page < (data?.total_pages || 1))
    } catch (err) {
      console.error('Failed to fetch subscription requests:', err)
      setError(err.message || 'Failed to load subscription requests')
      setRequests([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubscriptionRequests()
  }, [page, sortField, sortDir])

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir(field === 'createdAt' ? 'desc' : 'asc')
    }
    setPage(1)
  }

  const getSortIcon = (field) => {
    if (sortField !== field) return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.4 }}>
        <path d="M7 15l5 5 5-5M7 9l5-5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
    return sortDir === 'asc' ? (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
        <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ) : (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
        <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  }

  const handleRowClick = (requestId) => {
    navigate(`/customer-service/request/${requestId}`)
  }

  const getStatusConfig = (status) => {
    const s = (status || '').toUpperCase()
    switch (s) {
      case 'PENDING':
        return {
          bg: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
          color: '#78350F',
          border: '#F59E0B',
          dot: '#F59E0B',
          label: 'Pending'
        }
      case 'APPROVED':
        return {
          bg: 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)',
          color: '#064E3B',
          border: '#10B981',
          dot: '#10B981',
          label: 'Approved'
        }
      case 'REJECTED':
        return {
          bg: 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)',
          color: '#7F1D1D',
          border: '#EF4444',
          dot: '#EF4444',
          label: 'Rejected'
        }
      default:
        return {
          bg: '#F3F4F6',
          color: '#374151',
          border: '#D1D5DB',
          dot: '#9CA3AF',
          label: status || 'Unknown'
        }
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const columns = [
    { key: 'rid',            label: 'Request ID',  width: '18%' },
    { key: 'universityName', label: 'University',   width: '37%' },
    { key: 'status',         label: 'Status',       width: '18%' },
    { key: 'createdAt',      label: 'Created At',   width: '18%' },
    { key: null,             label: '',             width: '9%'  }
  ]

  const SkeletonRow = ({ index }) => (
    <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
      {[18, 37, 18, 18, 9].map((w, i) => (
        <td key={i} style={{ padding: '18px 20px' }}>
          <div style={{
            height: '14px',
            borderRadius: '6px',
            backgroundColor: '#F3F4F6',
            width: i === 4 ? '24px' : `${60 + (index * 7 + i * 13) % 30}%`,
            animation: 'shimmer 1.5s ease-in-out infinite',
            animationDelay: `${index * 0.07}s`
          }} />
        </td>
      ))}
    </tr>
  )

  return (
    <div style={{ padding: '36px 40px', maxWidth: '1200px', margin: '0 auto' }}>

      {/* ── Page Header ── */}
      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{
            margin: '0 0 6px',
            fontSize: '26px',
            fontWeight: '800',
            color: '#111827',
            letterSpacing: '-0.5px'
          }}>
            Subscription Requests
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#9CA3AF', fontWeight: '500' }}>
            Manage and review incoming university subscription requests
          </p>
        </div>

        {/* Stats pill */}
        {!loading && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 16px',
            backgroundColor: 'white',
            border: '1px solid #E5E7EB',
            borderRadius: '10px',
            boxShadow: '0 1px 3px rgba(58,74,82,0.06)',
            fontSize: '13px', color: '#6B7280', fontWeight: '500'
          }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3a4a52' }} />
            <span style={{ color: '#111827', fontWeight: '700' }}>{totalItems}</span>
            total &nbsp;·&nbsp; page&nbsp;
            <span style={{ color: '#111827', fontWeight: '700' }}>{page}</span>
            &nbsp;of&nbsp;
            <span style={{ color: '#111827', fontWeight: '700' }}>{totalPages}</span>
          </div>
        )}
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div style={{
          padding: '14px 18px',
          backgroundColor: '#FFF5F5',
          border: '1px solid #FECACA',
          borderLeft: '4px solid #EF4444',
          borderRadius: '10px',
          color: '#991B1B',
          marginBottom: '20px',
          fontSize: '13px',
          fontWeight: '500',
          display: 'flex', alignItems: 'center', gap: '10px'
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
            <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {error}
        </div>
      )}

      {/* ── Table Card ── */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        border: '1px solid #E5E7EB',
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(58,74,82,0.08)'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>

          {/* thead */}
          <thead>
            <tr style={{ backgroundColor: '#3a4a52' }}>
              {columns.map((col, i) => (
                <th
                  key={i}
                  onClick={() => col.key && handleSort(col.key)}
                  style={{
                    padding: '16px 20px',
                    textAlign: 'left',
                    fontSize: '11px',
                    fontWeight: '700',
                    color: col.key
                      ? (sortField === col.key ? 'white' : 'rgba(255,255,255,0.6)')
                      : 'transparent',
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    cursor: col.key ? 'pointer' : 'default',
                    userSelect: 'none',
                    width: col.width,
                    transition: 'color 0.15s',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => { if (col.key) e.currentTarget.style.color = 'white' }}
                  onMouseLeave={(e) => {
                    if (col.key) e.currentTarget.style.color = sortField === col.key
                      ? 'white'
                      : 'rgba(255,255,255,0.6)'
                  }}
                >
                  {col.key ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      {col.label}
                      <span style={{
                        display: 'inline-flex',
                        padding: '2px',
                        borderRadius: '4px',
                        backgroundColor: sortField === col.key ? 'rgba(255,255,255,0.15)' : 'transparent',
                        transition: 'background-color 0.15s'
                      }}>
                        {getSortIcon(col.key)}
                      </span>
                    </span>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>

          {/* tbody */}
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} index={i} />)

            ) : requests.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '72px 24px', textAlign: 'center' }}>
                  <div style={{
                    width: '56px', height: '56px',
                    backgroundColor: '#F3F4F6', borderRadius: '16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 16px'
                  }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                      <path d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4m8-4v4m0 0l-2-2m2 2l2-2" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <p style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: '600', color: '#374151' }}>
                    No requests found
                  </p>
                  <p style={{ margin: 0, fontSize: '13px', color: '#9CA3AF' }}>
                    Check back later for new subscription requests
                  </p>
                </td>
              </tr>

            ) : (
              requests.map((request, index) => {
                const status = getStatusConfig(request.status)
                const isLast = index === requests.length - 1
                return (
                  <tr
                    key={request.request_id || index}
                    onClick={() => handleRowClick(request.request_id)}
                    style={{
                      borderBottom: isLast ? 'none' : '1px solid #F3F4F6',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s',
                      backgroundColor: 'white'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#F8FAFB'
                      const arrow = e.currentTarget.querySelector('.row-arrow')
                      if (arrow) { arrow.style.opacity = '1'; arrow.style.transform = 'translateX(3px)' }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'white'
                      const arrow = e.currentTarget.querySelector('.row-arrow')
                      if (arrow) { arrow.style.opacity = '0'; arrow.style.transform = 'translateX(0)' }
                    }}
                  >
                    {/* Request ID */}
                    <td style={{ padding: '18px 20px' }}>
                      <span style={{
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        color: '#3a4a52',
                        fontWeight: '600',
                        backgroundColor: '#F0F4F6',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        letterSpacing: '0.03em'
                      }}>
                        {request.request_id
                          ? request.request_id.substring(0, 8) + '…'
                          : '—'}
                      </span>
                    </td>

                    {/* University */}
                    <td style={{ padding: '18px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '34px', height: '34px', borderRadius: '10px',
                          backgroundColor: '#E8ECF0', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '13px', fontWeight: '700', color: '#3a4a52'
                        }}>
                          {(request.university_name || '?').charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                          {request.university_name || '—'}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '18px 20px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        padding: '5px 11px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '700',
                        letterSpacing: '0.02em',
                        background: status.bg,
                        color: status.color,
                        border: `1px solid ${status.border}`
                      }}>
                        <span style={{
                          width: '6px', height: '6px', borderRadius: '50%',
                          backgroundColor: status.dot, flexShrink: 0
                        }} />
                        {status.label}
                      </span>
                    </td>

                    {/* Created At */}
                    <td style={{ padding: '18px 20px' }}>
                      <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>
                        {formatDate(request.created_at)}
                      </span>
                    </td>

                    {/* Chevron arrow */}
                    <td style={{ padding: '18px 20px', textAlign: 'right' }}>
                      <span
                        className="row-arrow"
                        style={{
                          display: 'inline-flex',
                          opacity: 0,
                          color: '#3a4a52',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        {/* ── Pagination ── */}
        {!loading && totalPages > 1 && (
          <div style={{
            padding: '16px 20px',
            borderTop: '1px solid #F3F4F6',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#FAFBFC'
          }}>
            {/* Info text */}
            <span style={{ fontSize: '13px', color: '#9CA3AF', fontWeight: '500' }}>
              Showing{' '}
              <span style={{ color: '#374151', fontWeight: '700' }}>
                {(page - 1) * itemsPerPage + 1}–{Math.min(page * itemsPerPage, totalItems)}
              </span>
              {' '}of{' '}
              <span style={{ color: '#374151', fontWeight: '700' }}>{totalItems}</span>
            </span>

            {/* Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>

              {/* Prev */}
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                style={{
                  width: '36px', height: '36px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: page === 1 ? '#F9FAFB' : 'white',
                  color: page === 1 ? '#D1D5DB' : '#3a4a52',
                  border: `1px solid ${page === 1 ? '#F3F4F6' : '#E5E7EB'}`,
                  borderRadius: '8px',
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (page !== 1) {
                    e.currentTarget.style.backgroundColor = '#3a4a52'
                    e.currentTarget.style.color = 'white'
                    e.currentTarget.style.borderColor = '#3a4a52'
                  }
                }}
                onMouseLeave={(e) => {
                  if (page !== 1) {
                    e.currentTarget.style.backgroundColor = 'white'
                    e.currentTarget.style.color = '#3a4a52'
                    e.currentTarget.style.borderColor = '#E5E7EB'
                  }
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {/* Page numbers */}
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                let pageNum = i + 1
                if (totalPages > 5 && page > 3) {
                  pageNum = page - 3 + i
                  if (pageNum > totalPages) pageNum = totalPages - (4 - i)
                }
                if (pageNum < 1 || pageNum > totalPages) return null
                const isActive = page === pageNum
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    style={{
                      width: '36px', height: '36px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      backgroundColor: isActive ? '#3a4a52' : 'white',
                      color: isActive ? 'white' : '#374151',
                      border: `1px solid ${isActive ? '#3a4a52' : '#E5E7EB'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: isActive ? '700' : '500',
                      transition: 'all 0.2s',
                      boxShadow: isActive ? '0 2px 8px rgba(58,74,82,0.3)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = '#F3F4F6'
                        e.currentTarget.style.borderColor = '#3a4a52'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'white'
                        e.currentTarget.style.borderColor = '#E5E7EB'
                      }
                    }}
                  >
                    {pageNum}
                  </button>
                )
              })}

              {/* Next */}
              <button
                onClick={() => setPage(page + 1)}
                disabled={!hasMore || page >= totalPages}
                style={{
                  width: '36px', height: '36px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: (!hasMore || page >= totalPages) ? '#F9FAFB' : 'white',
                  color: (!hasMore || page >= totalPages) ? '#D1D5DB' : '#3a4a52',
                  border: `1px solid ${(!hasMore || page >= totalPages) ? '#F3F4F6' : '#E5E7EB'}`,
                  borderRadius: '8px',
                  cursor: (!hasMore || page >= totalPages) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (hasMore && page < totalPages) {
                    e.currentTarget.style.backgroundColor = '#3a4a52'
                    e.currentTarget.style.color = 'white'
                    e.currentTarget.style.borderColor = '#3a4a52'
                  }
                }}
                onMouseLeave={(e) => {
                  if (hasMore && page < totalPages) {
                    e.currentTarget.style.backgroundColor = 'white'
                    e.currentTarget.style.color = '#3a4a52'
                    e.currentTarget.style.borderColor = '#E5E7EB'
                  }
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes shimmer {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}