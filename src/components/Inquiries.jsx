import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { get } from '../utils/api'
import { getSortIcon, SkeletonRow, formatDate } from './TableCommons'

export default function Inquiries() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const [hasMore, setHasMore] = useState(false)
  const [totalItems, setTotalItems] = useState(0)
  const [sortField, setSortField] = useState('createdAt')
  const [sortDir, setSortDir] = useState('desc')
  const [canNext, setCanNext] = useState(false)
  const [canPrev, setCanPrev] = useState(false)

  

  async function fetchInquiries(pageNum = page) {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page_num: pageNum, page_size: itemsPerPage, sort_field: sortField, sort_dir: sortDir })
      const data = await get(`subscription/api/v1/inquiries/customer-service/get-inquiries?${params.toString()}`)

      // normalize possible shapes
      let list = []
      if (Array.isArray(data?.inquires)) list = data.inquires
      else if (Array.isArray(data)) list = data

      setItems(list)
      const serverCount = typeof data?.total_count === 'number'
      setTotalItems(serverCount ? Number(data.total_count) : (Array.isArray(list) ? list.length : 0))
      if (typeof data?.has_more === 'boolean') setHasMore(data.has_more)
      else setHasMore(Array.isArray(list) && list.length >= itemsPerPage)

      return { list }
    } catch (err) {
      console.error('Failed to fetch inquiries', err)
      setError(err.message || 'Failed to load inquiries')
      setItems([])
      setHasMore(false)
      return { list: [] }
    } finally {
      setLoading(false)
    }
  }

  // Lightweight preview fetch that does not mutate component state
  async function previewFetch(pageNum) {
    try {
      const params = new URLSearchParams({ page_num: pageNum, page_size: itemsPerPage, sort_field: sortField, sort_dir: sortDir })
      const data = await get(`subscription/api/v1/inquiries/customer-service/get-inquiries?${params.toString()}`)
      if (!data) return []
      if (Array.isArray(data?.inquires)) return data.inquires
      if (Array.isArray(data)) return data
      return []
    } catch (err) {
      console.error('Preview fetch failed', err)
      return []
    }
  }

  useEffect(() => {
    fetchInquiries()
  }, [page, itemsPerPage, sortField, sortDir])

  // update preview availability for prev/next buttons so they can be disabled when target page is empty
  useEffect(() => {
    let cancelled = false
    async function checkNeighbors() {
      const next = await previewFetch(page + 1)
      const prev = page > 1 ? await previewFetch(page - 1) : []
      if (cancelled) return
      setCanNext(Array.isArray(next) && next.length > 0)
      setCanPrev(Array.isArray(prev) && prev.length > 0)
    }
    checkNeighbors()
    return () => { cancelled = true }
  }, [page, itemsPerPage, sortField, sortDir])

  async function goNext() {
    const target = page + 1
    const list = await previewFetch(target)
    if (list && list.length > 0) setPage(target)
  }

  async function goPrev() {
    if (page <= 1) return
    const target = page - 1
    const list = await previewFetch(target)
    if (list && list.length > 0) setPage(target)
  }

  function openEmail(email, subject = '') {
    const gmailUrl = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(email)}&su=${encodeURIComponent(subject)}`
    window.open(gmailUrl, '_blank')
  }

  const navigate = useNavigate()

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

  const handleRowClick = (id) => {
    if (!id) return
    navigate(`/customer-service/inquiry/${id}`)
  }

  const columns = [
    { key: 'id', label: 'ID', width: '18%' },
    { key: 'customer', label: 'Customer', width: '37%' },
    { key: 'subject', label: 'Subject', width: '18%' },
    { key: 'createdAt', label: 'Created At', width: '18%' },
    { key: null, label: '', width: '9%' }
  ]

  

  return (
    <div style={{ padding: '36px 40px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ margin: '0 0 6px', fontSize: '26px', fontWeight: '800', color: '#111827', letterSpacing: '-0.5px' }}>
            Inquiries
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#9CA3AF', fontWeight: '500' }}>
            Manage and review incoming customer inquiries
          </p>
        </div>

        {!loading && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 16px', backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '10px',
            boxShadow: '0 1px 3px rgba(58,74,82,0.06)', fontSize: '13px', color: '#6B7280', fontWeight: '500'
          }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3a4a52' }} />
            <span style={{ color: '#111827', fontWeight: '700' }}>{totalItems}</span>
            <span style={{ margin: '0 6px' }}>total ·</span>

            <div style={{ display: 'inline-flex', gap: '6px' }}>
              <button
                onClick={() => goPrev()}
                disabled={!canPrev || page === 1}
                style={{
                  width: 36, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8,
                  border: '1px solid #E5E7EB', background: (!canPrev || page === 1) ? '#F9FAFB' : 'white', cursor: (!canPrev || page === 1) ? 'not-allowed' : 'pointer'
                }}
                aria-label="Previous page"
              >
                ‹
              </button>

              <button
                onClick={() => goNext()}
                disabled={!canNext}
                style={{
                  width: 36, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8,
                  border: '1px solid #E5E7EB', background: !canNext ? '#F9FAFB' : 'white', cursor: !canNext ? 'not-allowed' : 'pointer'
                }}
                aria-label="Next page"
              >
                ›
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div style={{
          padding: '14px 18px', backgroundColor: '#FFF5F5', border: '1px solid #FECACA', borderLeft: '4px solid #EF4444',
          borderRadius: '10px', color: '#991B1B', marginBottom: '20px', fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '10px'
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
            <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {error}
        </div>
      )}

      <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 4px 16px rgba(58,74,82,0.08)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                    color: col.key ? (sortField === col.key ? 'white' : 'rgba(255,255,255,0.6)') : 'transparent',
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
                      <span style={{ display: 'inline-flex', padding: '2px', borderRadius: '4px', backgroundColor: sortField === col.key ? 'rgba(255,255,255,0.15)' : 'transparent', transition: 'background-color 0.15s' }}>
                        {getSortIcon(col.key, sortField, sortDir)}
                      </span>
                    </span>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} index={i} />)

            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '72px 24px', textAlign: 'center' }}>
                  <div style={{ width: '56px', height: '56px', backgroundColor: '#F3F4F6', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                      <path d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4m8-4v4m0 0l-2-2m2 2l2-2" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <p style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: '600', color: '#374151' }}>No inquiries found</p>
                  <p style={{ margin: 0, fontSize: '13px', color: '#9CA3AF' }}>Check back later for new inquiries</p>
                </td>
              </tr>

            ) : (
              items.map((it, index) => (
                <tr
                  key={it.id || index}
                  onClick={() => handleRowClick(it.id)}
                  style={{ borderBottom: index === items.length - 1 ? 'none' : '1px solid #F3F4F6', cursor: 'pointer', transition: 'background-color 0.15s', backgroundColor: 'white' }}
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
                  <td style={{ padding: '18px 20px' }}>
                    <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#3a4a52', fontWeight: '600', backgroundColor: '#F0F4F6', padding: '4px 8px', borderRadius: '6px', letterSpacing: '0.03em' }}>
                      {it.id ? String(it.id).substring(0, 8) + '…' : '—'}
                    </span>
                  </td>

                  <td style={{ padding: '18px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '10px', backgroundColor: '#E8ECF0', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: '#3a4a52' }}>{(it.customer_email || it.customerEmail || '?').charAt(0).toUpperCase()}</div>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>{it.customer_email || it.customerEmail || '—'}</span>
                    </div>
                  </td>

                  <td style={{ padding: '18px 20px' }}>
                    <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>{it.subject || '—'}</span>
                  </td>

                  <td style={{ padding: '18px 20px' }}>
                    <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>{formatDate(it.created_at || it.createdAt)}</span>
                  </td>

                  <td style={{ padding: '18px 20px', textAlign: 'right' }}>
                    <span className="row-arrow" style={{ display: 'inline-flex', opacity: 0, color: '#3a4a52', transition: 'all 0.2s ease' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

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
