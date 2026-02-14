import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { get } from '../utils/api'
import { getSortIcon, SkeletonRow, formatDate } from './TableCommons'

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
  const [itemsPerPage, setItemsPerPage] = useState(5)

  // Sorting
  const [sortField, setSortField] = useState('createdAt')
  const [sortDir, setSortDir] = useState('desc')

  async function fetchSubscriptionRequests(pageNum = page) {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({
        page_num: pageNum,
        page_size: itemsPerPage,
        sort_field: sortField,
        sort_dir: sortDir
      })
      const data = await get(`subscription/api/v1/customer-service/get-requests?${params.toString()}`)

      // Accept several possible response shapes from the API and normalize to an array
      let requestsData = []
      if (Array.isArray(data?.['subscription-requests'])) requestsData = data['subscription-requests']
      else if (Array.isArray(data?.metaDataList)) requestsData = data.metaDataList
      else if (Array.isArray(data?.subscriptionRequests)) requestsData = data.subscriptionRequests
      else if (Array.isArray(data)) requestsData = data

      const serverHasCount = typeof data?.total_count === 'number'
      const totalCount = serverHasCount ? Number(data.total_count) : (Array.isArray(requestsData) ? requestsData.length : 0)
      const computedTotalPages = serverHasCount ? Number(data?.total_pages ?? Math.max(1, Math.ceil(totalCount / itemsPerPage))) : null

      // Update state based on fetched page
      setRequests(requestsData || [])
      setTotalItems(totalCount)
      setTotalPages(computedTotalPages || 1)

      if (typeof data?.has_more === 'boolean') {
        setHasMore(data.has_more)
      } else {
        setHasMore(Array.isArray(requestsData) && requestsData.length >= itemsPerPage)
      }

      // return normalized response so callers can decide how to react
      return { requestsData: requestsData || [], totalCount, hasMore: typeof data?.has_more === 'boolean' ? data.has_more : (Array.isArray(requestsData) && requestsData.length >= itemsPerPage) }
    } catch (err) {
      console.error('Failed to fetch subscription requests:', err)
      setError(err.message || 'Failed to load subscription requests')
      setRequests([])
      return { requestsData: [], totalCount: 0, hasMore: false }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubscriptionRequests()
  }, [page, sortField, sortDir, itemsPerPage])

  // Optimistic navigation: try to load target page before committing page state
  async function goNext() {
    const target = page + 1
    const result = await fetchSubscriptionRequests(target)
    if (result.requestsData && result.requestsData.length > 0) {
      setPage(target)
    }
  }

  async function goPrev() {
    if (page <= 1) return
    const target = page - 1
    const result = await fetchSubscriptionRequests(target)
    if (result.requestsData && result.requestsData.length > 0) {
      setPage(target)
    }
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir(field === 'createdAt' ? 'desc' : 'asc')
    }
    setPage(1)
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

  

  const columns = [
    { key: 'rid',            label: 'Request ID',  width: '18%' },
    { key: 'universityName', label: 'University',   width: '37%' },
    { key: 'status',         label: 'Status',       width: '18%' },
    { key: 'createdAt',      label: 'Created At',   width: '18%' },
    { key: null,             label: '',             width: '9%'  }
  ]

  

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

        {/* Header pill showing total and inline Prev/Next arrows (replaces 'page N of M') */}
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
            <span style={{ margin: '0 6px' }}>total ·</span>

            <div style={{ display: 'inline-flex', gap: '6px' }}>
              <button
                onClick={() => goPrev()}
                disabled={page === 1}
                style={{
                  width: 36, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8,
                  border: '1px solid #E5E7EB', background: page === 1 ? '#F9FAFB' : 'white', cursor: page === 1 ? 'not-allowed' : 'pointer'
                }}
                aria-label="Previous page"
              >
                ‹
              </button>

              <button
                onClick={() => goNext()}
                disabled={!hasMore}
                style={{
                  width: 36, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8,
                  border: '1px solid #E5E7EB', background: !hasMore ? '#F9FAFB' : 'white', cursor: !hasMore ? 'not-allowed' : 'pointer'
                }}
                aria-label="Next page"
              >
                ›
              </button>
            </div>
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
                        {getSortIcon(col.key, sortField, sortDir)}
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

        {/* Pagination removed — header arrows control navigation now */}
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