import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { get } from '../utils/api'
import { SkeletonRow, formatDate, getSortIcon } from './TableCommons'

export default function Universities() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [searchText, setSearchText] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [searching, setSearching] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchRef = useRef(null)

  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const [hasMore, setHasMore] = useState(false)
  const [totalItems, setTotalItems] = useState(0)
  const [sortField, setSortField] = useState('createdAt')
  const [sortDir, setSortDir] = useState('desc')
  const [canNext, setCanNext] = useState(false)
  const [canPrev, setCanPrev] = useState(false)

  const navigate = useNavigate()

  const truncate = (s, n = 36) => {
    if (!s) return ''
    return s.length > n ? s.substring(0, n - 1) + '…' : s
  }

  async function fetchUniversities(pageNum = page, search = debouncedSearch) {
    setLoading(true)
    setError('')
    try {
      const paramsObj = { page_num: pageNum, page_size: itemsPerPage, sort_field: sortField, sort_dir: sortDir }
      if (search) paramsObj.search_text = search
      const params = new URLSearchParams(paramsObj)
      // gateway prefix: universitymanagement
      const endpoint = search ? `universitymanagement/api/v1/customer-service/search-university?${params.toString()}` : `universitymanagement/api/v1/customer-service/get-universities?${params.toString()}`
      const data = await get(endpoint)

      let raw = []
      if (Array.isArray(data?.universities)) raw = data.universities
      else if (Array.isArray(data)) raw = data

      const list = raw.map((u) => ({
        ...u,
        uniId: u.university_id || u.uniId || u.id,
        universityName: u.university_name || u.universityName || u.name,
        createdAt: u.created_at || u.createdAt,
        created_by: u.created_by || u.createdBy,
        updated_at: u.updated_at || u.updatedAt
      }))

      setItems(list)
      setTotalItems(typeof data?.total_count === 'number' ? Number(data.total_count) : (Array.isArray(list) ? list.length : 0))
      if (typeof data?.has_more === 'boolean') setHasMore(data.has_more)
      else setHasMore(Array.isArray(list) && list.length >= itemsPerPage)

      return { list }
    } catch (err) {
      console.error('Failed to fetch universities', err)
      setError(err.message || 'Failed to load universities')
      setItems([])
      setHasMore(false)
      return { list: [] }
    } finally {
      setLoading(false)
    }
  }

  async function previewFetch(pageNum, search = debouncedSearch) {
    try {
      const paramsObj = { page_num: pageNum, page_size: itemsPerPage, sort_field: sortField, sort_dir: sortDir }
      if (search) paramsObj.search_text = search
      const params = new URLSearchParams(paramsObj)
      const endpoint = search ? `universitymanagement/api/v1/customer-service/search-university?${params.toString()}` : `universitymanagement/api/v1/customer-service/get-universities?${params.toString()}`
      const data = await get(endpoint)
      if (!data) return []
      let raw = []
      if (Array.isArray(data?.universities)) raw = data.universities
      else if (Array.isArray(data)) raw = data
      return raw.map((u) => ({
        ...u,
        uniId: u.university_id || u.uniId || u.id,
        universityName: u.university_name || u.universityName || u.name,
        createdAt: u.created_at || u.createdAt
      }))
    } catch (err) {
      console.error('Preview fetch failed', err)
      return []
    }
  }

  useEffect(() => { fetchUniversities() }, [page, itemsPerPage, sortField, sortDir])

  useEffect(() => {
    let cancelled = false
    async function checkNeighbors() {
      const next = await previewFetch(page + 1, debouncedSearch)
      const prev = page > 1 ? await previewFetch(page - 1, debouncedSearch) : []
      if (cancelled) return
      setCanNext(Array.isArray(next) && next.length > 0)
      setCanPrev(Array.isArray(prev) && prev.length > 0)
    }
    checkNeighbors()
    return () => { cancelled = true }
  }, [page, itemsPerPage, sortField, sortDir, debouncedSearch])

  // debounce searchText -> debouncedSearch
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchText.trim()), 300)
    return () => clearTimeout(t)
  }, [searchText])

  // when debouncedSearch changes, reset to page 1 and fetch
  useEffect(() => {
    setPage(1)
    setSearching(!!debouncedSearch)
    fetchUniversities(1, debouncedSearch)
  }, [debouncedSearch])

  // fetch suggestions for dropdown when debounced search changes
  useEffect(() => {
    let cancelled = false
    async function loadSuggestions() {
      if (!debouncedSearch) {
        setSuggestions([])
        setShowSuggestions(false)
        return
      }
      const list = await previewFetch(1, debouncedSearch)
      if (cancelled) return
      setSuggestions(Array.isArray(list) ? list.slice(0, 6) : [])
      setShowSuggestions(true)
    }
    loadSuggestions()
    return () => { cancelled = true }
  }, [debouncedSearch])

  // click outside to close suggestions
  useEffect(() => {
    function onDocClick(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSuggestions(false)
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])

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

  const handleSort = (field) => {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir(field === 'createdAt' ? 'desc' : 'asc') }
    setPage(1)
  }

  const columns = [
    { key: 'uniId', label: 'ID', width: '18%' },
    { key: 'universityName', label: 'University', width: '37%' },
    { key: 'createdAt', label: 'Created At', width: '18%' },
    { key: null, label: '', width: '27%' }
  ]

  const handleRowClick = (id) => { if (!id) return; navigate(`/customer-service/university/${id}`) }

  return (
    <div style={{ padding: '36px 40px', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '28px', display: 'flex', alignItems: 'flex-end', gap: 20 }}>
        <div style={{ flex: '0 0 auto' }}>
          <h1 style={{ margin: '0 0 6px', fontSize: '26px', fontWeight: '800', color: '#111827', letterSpacing: '-0.5px' }}>Universities</h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#9CA3AF', fontWeight: '500' }}>Manage and review registered universities</p>
        </div>

        <div style={{ flex: '1 1 auto', display: 'flex', justifyContent: 'center' }}>
          <div style={{ position: 'relative', width: '420px', maxWidth: '60%' }}>
            <div ref={searchRef} style={{ position: 'relative' }}>
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onFocus={() => { if (suggestions.length) setShowSuggestions(true) }}
                placeholder="Search universities..."
                aria-label="Search universities"
                style={{ padding: '10px 36px 10px 12px', borderRadius: 10, border: '1px solid #E5E7EB', background: 'white', width: '100%' }}
              />
              {showSuggestions && suggestions.length > 0 && (
                <div role="listbox" aria-label="Search suggestions" style={{ position: 'absolute', left: 0, right: 0, top: 'calc(100% + 8px)', background: 'white', border: '1px solid #E5E7EB', borderRadius: 10, boxShadow: '0 6px 20px rgba(15,23,42,0.08)', zIndex: 40, maxHeight: 260, overflow: 'auto' }}>
                  {suggestions.map((sugg, i) => (
                    <div
                      key={sugg.uniId || i}
                      role="option"
                      onMouseDown={(ev) => { ev.preventDefault(); setShowSuggestions(false); if (sugg.uniId) navigate(`/customer-service/university/${sugg.uniId}`); }}
                      style={{ padding: '8px 10px', cursor: 'pointer', borderBottom: i !== suggestions.length - 1 ? '1px solid #F3F4F6' : 'none', display: 'flex', gap: 10, alignItems: 'center' }}
                    >
                      <div style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#E8ECF0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#3a4a52', fontSize: 12 }}>{(sugg.universityName || '?').charAt(0).toUpperCase()}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: '#111827', fontSize: 13 }}>{truncate(sugg.universityName || '—', 40)}</div>
                        <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4, fontFamily: 'monospace' }}>{sugg.uniId ? String(sugg.uniId).substring(0, 8) + '…' : ''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }}>
              <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </div>
        </div>

        <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center' }}>
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
                <button onClick={() => goPrev()} disabled={!canPrev || page === 1} aria-label="Previous page" style={{ width: 36, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px solid #E5E7EB', background: (!canPrev || page === 1) ? '#F9FAFB' : 'white', cursor: (!canPrev || page === 1) ? 'not-allowed' : 'pointer' }}>‹</button>
                <button onClick={() => goNext()} disabled={!canNext} aria-label="Next page" style={{ width: 36, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px solid #E5E7EB', background: !canNext ? '#F9FAFB' : 'white', cursor: !canNext ? 'not-allowed' : 'pointer' }}>›</button>
              </div>
            </div>
          )}
        </div>
      </header>

      {error ? (
        <div style={{ padding: '14px 18px', backgroundColor: '#FFF5F5', border: '1px solid #FECACA', borderLeft: '4px solid #EF4444', borderRadius: '10px', color: '#991B1B', marginBottom: '20px', fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {error}
        </div>
      ) : null}

      <section style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 4px 16px rgba(58,74,82,0.08)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#3a4a52' }}>
              {columns.map((col, i) => (
                <th key={i} onClick={() => col.key && handleSort(col.key)} style={{ padding: '16px 20px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: col.key ? (sortField === col.key ? 'white' : 'rgba(255,255,255,0.6)') : 'transparent', textTransform: 'uppercase', letterSpacing: '0.07em', cursor: col.key ? 'pointer' : 'default', userSelect: 'none', width: col.width }}>{col.key ? (<span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>{col.label}<span style={{ display: 'inline-flex', padding: '2px', borderRadius: '4px', backgroundColor: sortField === col.key ? 'rgba(255,255,255,0.15)' : 'transparent' }}>{getSortIcon(col.key, sortField, sortDir)}</span></span>) : null}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} index={i} />) : items.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: '72px 24px', textAlign: 'center' }}><div style={{ width: '56px', height: '56px', backgroundColor: '#F3F4F6', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4m8-4v4m0 0l-2-2m2 2l2-2" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></div><p style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: '600', color: '#374151' }}>No universities found</p><p style={{ margin: 0, fontSize: '13px', color: '#9CA3AF' }}>Check back later for new universities</p></td></tr>
            ) : (
              items.map((it, index) => (
                <tr key={it.uniId || index} onClick={() => handleRowClick(it.uniId)} style={{ borderBottom: index === items.length - 1 ? 'none' : '1px solid #F3F4F6', cursor: 'pointer', transition: 'background-color 0.15s', backgroundColor: 'white' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F8FAFB'; const arrow = e.currentTarget.querySelector('.row-arrow'); if (arrow) { arrow.style.opacity = '1'; arrow.style.transform = 'translateX(3px)' } }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; const arrow = e.currentTarget.querySelector('.row-arrow'); if (arrow) { arrow.style.opacity = '0'; arrow.style.transform = 'translateX(0)' } }}>
                  <td style={{ padding: '18px 20px' }}><span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#3a4a52', fontWeight: '600', backgroundColor: '#F0F4F6', padding: '4px 8px', borderRadius: '6px', letterSpacing: '0.03em' }}>{it.uniId ? String(it.uniId).substring(0, 8) + '…' : '—'}</span></td>
                  <td style={{ padding: '18px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '10px', backgroundColor: '#E8ECF0', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: '#3a4a52' }}>{(it.universityName || '?').charAt(0).toUpperCase()}</div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>{it.universityName || '—'}</div>
                        <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4, fontFamily: 'monospace' }}>{it.uniId ? String(it.uniId).substring(0, 8) + '…' : ''}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '18px 20px' }}><span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>{formatDate(it.created_at || it.createdAt)}</span></td>
                  <td style={{ padding: '18px 20px', textAlign: 'right' }}><span className="row-arrow" style={{ display: 'inline-flex', opacity: 0, color: '#3a4a52', transition: 'all 0.2s ease' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <style>{`@keyframes shimmer { 0%,100%{opacity:1;}50%{opacity:0.4;} }`}</style>
    </div>
  )
}
