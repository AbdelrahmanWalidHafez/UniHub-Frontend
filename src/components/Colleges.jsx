import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { get, post, put, deleteRequest } from '../utils/api'
import { getUser } from '../utils/auth'
import { ROLES, getRoleName } from '../constants/roles'
import ConfirmationModal from './ConfirmationModal'
import { SkeletonRow, formatDate, getSortIcon } from './TableCommons'

export default function Colleges() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [searchText, setSearchText] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [searching, setSearching] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const searchRef = useRef(null)

  // Debug: Log when showSuggestions or suggestions change
  useEffect(() => {
    console.log('States updated - showSuggestions:', showSuggestions, 'suggestions:', suggestions.length, 'searchFocused:', searchFocused, 'searching:', searching)
  }, [showSuggestions, suggestions, searchFocused, searching])

  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const [hasMore, setHasMore] = useState(false)
  const [totalItems, setTotalItems] = useState(0)
  const [sortField, setSortField] = useState('createdAt')
  const [sortDir, setSortDir] = useState('desc')
  const [canNext, setCanNext] = useState(false)
  const [canPrev, setCanPrev] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [newCollegeName, setNewCollegeName] = useState('')
  const [newCampus, setNewCampus] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})
  const [modalMessage, setModalMessage] = useState({ type: '', text: '' })

  const navigate = useNavigate()

  const truncate = (s, n = 36) => {
    if (!s) return ''
    return s.length > n ? s.substring(0, n - 1) + '…' : s
  }

  async function fetchColleges(pageNum = page, search = debouncedSearch) {
    setLoading(true)
    setError('')
    try {
      let endpoint = ''
      if (search) {
        // Search endpoint with search_text parameter
        const params = new URLSearchParams({ search_text: search })
        endpoint = `universitymanagement/api/v1/colleges/system-admin/search-college?${params.toString()}`
      } else {
        // Regular endpoint with pagination and sorting
        const params = new URLSearchParams({ page_num: pageNum, sort_field: sortField, sort_dir: sortDir })
        endpoint = `universitymanagement/api/v1/colleges/system-admin/get-colleges?${params.toString()}`
      }
      
      console.log('Fetching colleges from:', endpoint)
      const data = await get(endpoint)
      console.log('API Response:', data)

      let raw = []
      if (Array.isArray(data?.colleges)) raw = data.colleges
      else if (Array.isArray(data)) raw = data

      console.log('Raw colleges data:', raw)

      const list = raw.map((c) => ({
        ...c,
        collegeId: c.college_id || c.collegeId || c.id,
        collegeName: c.college_name || c.collegeName || c.name,
        campus: c.campus || '',
        createdAt: c.created_at || c.createdAt,
        created_by: c.created_by || c.createdBy,
        updated_at: c.updated_at || c.updatedAt
      }))

      console.log('Mapped colleges list:', list)

      setItems(list)
      // Calculate total items and pagination based on response
      const calculatedTotal = typeof data?.total_count === 'number' ? Number(data.total_count) : list.length
      console.log('Total items calculated:', calculatedTotal, 'from response:', data?.total_count)
      setTotalItems(calculatedTotal)
      // Determine if there are more pages
      if (typeof data?.has_more === 'boolean') {
        setHasMore(data.has_more)
      } else {
        // Assume no more pages if we got less than expected
        setHasMore(Array.isArray(list) && list.length >= itemsPerPage)
      }

      // Keep suggestions open — don't auto-close here to avoid flicker

      return { list }
    } catch (err) {
      console.error('Failed to fetch colleges', err)
      setError(err.message || 'Failed to load colleges')
      setItems([])
      setHasMore(false)
      return { list: [] }
    } finally {
      setLoading(false)
    }
  }

  async function previewFetch(pageNum, search = debouncedSearch) {
    try {
      let endpoint = ''
      if (search) {
        // Use system-admin search to match table results
        const params = new URLSearchParams({ search_text: search })
        endpoint = `universitymanagement/api/v1/colleges/system-admin/search-college?${params.toString()}`
      } else {
        // Regular endpoint with pagination and sorting (system-admin)
        const params = new URLSearchParams({ page_num: pageNum, sort_field: sortField, sort_dir: sortDir })
        endpoint = `universitymanagement/api/v1/colleges/system-admin/get-colleges?${params.toString()}`
      }
      console.log('PreviewFetch endpoint:', endpoint)
      const data = await get(endpoint)
      console.log('PreviewFetch raw response:', JSON.stringify(data, null, 2))
      
      if (!data) {
        console.log('No data returned')
        return []
      }
      
      let raw = []
      if (Array.isArray(data?.colleges)) {
        raw = data.colleges
        console.log('Found colleges array with', raw.length, 'items')
      } else if (Array.isArray(data)) {
        raw = data
        console.log('Data is array with', raw.length, 'items')
      } else {
        console.log('Data format not recognized:', typeof data)
      }
      
      console.log('Raw data before mapping:', JSON.stringify(raw, null, 2))
      
      const mapped = raw.map((c, index) => {
        const result = {
          ...c,
          collegeId: c.college_id || c.collegeId || c.id,
          collegeName: c.college_name || c.collegeName || c.name,
          campus: c.campus || c.college_campus || '',
          createdAt: c.created_at || c.createdAt
        }
        console.log(`Mapped college ${index}:`, result)
        return result
      })
      console.log('PreviewFetch mapped results:', mapped)
      return mapped
    } catch (err) {
      console.error('Preview fetch failed', err)
      return []
    }
  }

  useEffect(() => { fetchColleges() }, [page, itemsPerPage, sortField, sortDir])

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      const normalized = searchText.trim().replace(/\s+/g, ' ')
      setDebouncedSearch(normalized)
      setPage(1)
    }, 300)
    return () => clearTimeout(debounceTimer)
  }, [searchText])

  useEffect(() => { fetchColleges(1, debouncedSearch) }, [debouncedSearch])

  useEffect(() => {
    setCanNext(hasMore && items.length >= itemsPerPage)
    setCanPrev(page > 1)
  }, [page, hasMore, items])

  useEffect(() => {
    async function updateSuggestions() {
      const normalized = searchText.trim().replace(/\s+/g, ' ')
      if (!normalized) {
        setSuggestions([])
        setShowSuggestions(false)
        setSearching(false)
        return
      }
      try {
        setSearching(true)
        console.log('======= FETCHING SUGGESTIONS =======')
        console.log('Search text:', normalized)
        const previewed = await previewFetch(1, normalized)
        console.log('Suggestions received count:', previewed.length)
        console.log('Suggestions array:', previewed)
        
        const sliced = previewed.slice(0, 5)
        console.log('Setting suggestions to:', sliced)
        setSuggestions(sliced)
        
        // Always show suggestions if we have results
        if (previewed.length > 0) {
          console.log('✓ Setting showSuggestions to TRUE - have results')
          setShowSuggestions(true)
        } else {
          console.log('⚠ No results, but showing dropdown with "No colleges found"')
          setShowSuggestions(true) // Show dropdown even with no results
        }
        console.log('====================================')
      } catch (error) {
        console.error('Error fetching suggestions:', error)
        setSuggestions([])
        setShowSuggestions(false)
      } finally {
        setSearching(false)
      }
    }
    
    // Debounce suggestions to avoid too many API calls
    const suggestionsTimer = setTimeout(() => {
      updateSuggestions()
    }, 300)
    
    return () => clearTimeout(suggestionsTimer)
  }, [searchText])

  useEffect(() => {
    function onDocClick(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        console.log('Click outside search - closing suggestions')
        setShowSuggestions(false)
        setSearchFocused(false)
      }
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])

  function handleSuggestionClick(c) {
    console.log('Suggestion clicked:', c)
    const name = c.collegeName || c.college_name || c.name || ''
    console.log('Setting search text to:', name)
    setSearchText(name)
    setShowSuggestions(false)
  }

  // College details modal state and handlers
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detail, setDetail] = useState(null)
  const [detailEditMode, setDetailEditMode] = useState(false)

  async function openCollegeDetails(id) {
    if (!id) return
    setDetailLoading(true)
    try {
      const data = await get(`universitymanagement/api/v1/colleges/system-admin/get-college/${id}`)
      if (!data) {
        setDetail(null)
      } else {
        const c = data
        const mapped = {
          ...c,
          collegeId: c.college_id || c.collegeId || c.id,
          collegeName: c.college_name || c.collegeName || c.name,
          campus: c.campus || c.college_campus || '',
          createdAt: c.created_at || c.createdAt,
          created_by: c.created_by || c.createdBy
        }
        setDetail(mapped)
        setShowDetailModal(true)
        setDetailEditMode(false)
      }
    } catch (err) {
      console.error('Failed to fetch college details', err)
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }

  async function handleUpdateCollege() {
    if (!detail) return
    const nameError = validateCollegeName(detail.collegeName)
    const campusError = validateCampus(detail.campus)
    if (nameError || campusError) {
      setValidationErrors({ collegeName: nameError, campus: campusError })
      return
    }
    try {
      const payload = {
        college_name: detail.collegeName.trim(),
        college_campus: detail.campus.trim()
      }
      await put(`universitymanagement/api/v1/colleges/system-admin/update-college/${detail.collegeId}`, payload)
      // Refresh list and details
      await fetchColleges(1)
      const refreshed = await get(`universitymanagement/api/v1/colleges/system-admin/get-college/${detail.collegeId}`)
      if (refreshed) {
        const updated = {
          ...refreshed,
          collegeId: refreshed.college_id || refreshed.collegeId || refreshed.id,
          collegeName: refreshed.college_name || refreshed.collegeName || refreshed.name,
          campus: refreshed.campus || refreshed.college_campus || '',
          createdAt: refreshed.created_at || refreshed.createdAt,
          created_by: refreshed.created_by || refreshed.createdBy
        }
        setDetail(updated)
        setDetailEditMode(false)
        setModalMessage({ type: 'success', text: 'College updated successfully' })
        setTimeout(() => setModalMessage({ type: '', text: '' }), 1500)
      }
    } catch (err) {
      console.error('Update failed', err)
      const user = getUser()
      const isSysAdmin = user && getRoleName(user) === ROLES.SYSTEM_ADMIN
      if (isSysAdmin && err.message && (err.message.includes('403') || err.message.toLowerCase().includes('forbidden'))) {
        setModalMessage({ type: 'warning', text: 'Please set or renew your subscription first so you can use the feature' })
      } else {
        setModalMessage({ type: 'error', text: err.message || 'Failed to update college' })
      }
    }
  }

  async function handleDeleteCollege() {
    if (!detail) return
    // open confirmation modal (styled) instead of native confirm
    setDeleteTargetId(detail.collegeId)
    setShowConfirmDelete(true)
  }

  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState(null)

  async function confirmDeleteCollege() {
    const id = deleteTargetId || (detail && detail.collegeId)
    if (!id) return
    setShowConfirmDelete(false)
    try {
      await deleteRequest(`universitymanagement/api/v1/colleges/system-admin/delete-college/${id}`)
      setShowDetailModal(false)
      setDetail(null)
      await fetchColleges(1)
    } catch (err) {
      console.error('Delete failed', err)
      const user = getUser()
      const isSysAdmin = user && getRoleName(user) === ROLES.SYSTEM_ADMIN
      if (isSysAdmin && err.message && (err.message.includes('403') || err.message.toLowerCase().includes('forbidden'))) {
        setModalMessage({ type: 'warning', text: 'Please set or renew your subscription first so you can use the feature' })
      } else {
        setModalMessage({ type: 'error', text: err.message || 'Failed to delete college' })
      }
    } finally {
      setDeleteTargetId(null)
    }
  }

  function handleSort(field) {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  function validateCollegeName(name) {
    if (!name || name.trim().length === 0) {
      return 'College name is required'
    }
    if (name.length < 2 || name.length > 70) {
      return 'College name must be between 2 and 70 characters'
    }
    const pattern = /^[\p{L} .'-]+$/u
    if (!pattern.test(name)) {
      return 'College name contains invalid characters'
    }
    return ''
  }

  function validateCampus(campus) {
    if (!campus || campus.trim().length === 0) {
      return 'Campus is required'
    }
    if (campus.length < 10 || campus.length > 80) {
      return 'Campus must be between 10 and 80 characters'
    }
    const pattern = /^[\p{L} .'-]+$/u
    if (!pattern.test(campus)) {
      return 'Campus contains invalid characters'
    }
    return ''
  }

  function validateForm() {
    const errors = {}
    const nameError = validateCollegeName(newCollegeName)
    const campusError = validateCampus(newCampus)
    
    if (nameError) errors.collegeName = nameError
    if (campusError) errors.campus = campusError
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleCreateCollege() {
    setModalMessage({ type: '', text: '' })
    
    if (!validateForm()) {
      return
    }
    
    setSubmitting(true)
    try {
      const payload = {
        college_name: newCollegeName.trim(),
        college_campus: newCampus.trim()
      }
      await post('universitymanagement/api/v1/colleges/system-admin/create', payload)
      
      setModalMessage({ type: 'success', text: 'College saved successfully!' })
      
      // Close modal and refresh after 1.5 seconds
      setTimeout(async () => {
        setNewCollegeName('')
        setNewCampus('')
        setValidationErrors({})
        setModalMessage({ type: '', text: '' })
        setShowModal(false)
        await fetchColleges(1)
      }, 1500)
    } catch (err) {
      console.error('Failed to create college', err)
      // If user is system admin and server returned 403, show subscription warning
      const user = getUser()
      const isSysAdmin = user && getRoleName(user) === ROLES.SYSTEM_ADMIN
      if (isSysAdmin && err.message && (err.message.includes('403') || err.message.toLowerCase().includes('forbidden'))) {
        setModalMessage({
          type: 'warning',
          text: 'Please set or renew your subscription first so you can use the feature'
        })
      } else {
        setModalMessage({
          type: 'error',
          text: err.message || 'Failed to create college'
        })
      }
    } finally {
      setSubmitting(false)
    }
  }

  function handleCloseModal() {
    if (submitting) return
    setShowModal(false)
    setNewCollegeName('')
    setNewCampus('')
    setValidationErrors({})
    setModalMessage({ type: '', text: '' })
  }

  function handleCloseDetailModal() {
    if (detailEditMode) {
      if (!window.confirm('Discard unsaved changes?')) return
    }
    setShowDetailModal(false)
    setDetail(null)
    setDetailEditMode(false)
    setModalMessage({ type: '', text: '' })
  }

  // Small UI helpers to mimic RequestDetails layout
  const InfoItem = ({ label, value, isLink, mono }) => (
    <div>
      <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      <div style={{ fontSize: '14px', color: '#111827', fontWeight: '500', wordBreak: 'break-word', fontFamily: mono ? 'monospace' : 'inherit' }}>
        {isLink && value ? (
          <a href={value.startsWith('http') ? value : `https://${value}`} target="_blank" rel="noreferrer" style={{ color: '#3a4a52', textDecoration: 'none', borderBottom: '1px dashed #94A3B8', paddingBottom: '1px' }}>{value}</a>
        ) : (
          <span style={{ color: value ? '#111827' : '#D1D5DB' }}>{value || '—'}</span>
        )}
      </div>
    </div>
  )

  const SectionCard = ({ title, children, noBorder }) => (
    <div style={{ backgroundColor: 'white', borderRadius: '14px', border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 2px 8px rgba(58,74,82,0.06)', marginBottom: '20px' }}>
      <div style={{ padding: '12px 16px', borderBottom: noBorder ? 'none' : '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#FAFBFC' }}>
        <div style={{ width: '3px', height: '16px', backgroundColor: '#9DD957', borderRadius: '2px', flexShrink: 0 }} />
        <h3 style={{ margin: 0, fontSize: '12px', fontWeight: '700', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</h3>
      </div>
      <div style={{ padding: '18px 16px' }}>{children}</div>
    </div>
  )

  // Banner logic: when system admin sees 403, show subscription warning (yellow)
  const _bannerUser = getUser()
  const _bannerIsSysAdmin = _bannerUser && getRoleName(_bannerUser) === ROLES.SYSTEM_ADMIN
  const _bannerIsForbidden = error && (String(error).includes('403') || String(error).toLowerCase().includes('forbidden'))
  const bannerMessage = _bannerIsForbidden && _bannerIsSysAdmin ? 'Please set or renew your current subscription plan' : error
  const bannerStyle = _bannerIsForbidden && _bannerIsSysAdmin ? styles.warningBanner : styles.errorBanner

  return (
    <div style={styles.container}>
      {/* Error Banner */}
      {error && (
        <div style={bannerStyle}>
          <span style={styles.errorIcon}>⚠️</span>
          <span>{bannerMessage}</span>
          <button onClick={() => setError('')} style={styles.errorClose}>×</button>
        </div>
      )}

      {/* Header with title and pagination info */}
      <div style={styles.headerSection}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>Colleges</h1>
          <p style={styles.subtitle}>Manage and review colleges information</p>
        </div>
        <div style={styles.headerRight}>
          <button style={styles.newButton} onClick={() => setShowModal(true)}>+ New</button>
          
          <div style={styles.searchContainer} ref={searchRef}>
            <input
              type="text"
              placeholder="Search college"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onFocus={() => {
                setSearchFocused(true)
                if (searchText.trim() && suggestions.length > 0) {
                  setShowSuggestions(true)
                }
              }}
              onBlur={() => {
                // Delay to allow click on suggestions
                setTimeout(() => {
                  setSearchFocused(false)
                  // Don't close suggestions immediately - let handleSuggestionClick handle it
                }, 200)
              }}
              style={{
                ...styles.searchInput,
                border: searchFocused ? '2px solid #000000' : '1px solid #D1D5DB',
                padding: searchFocused ? '0 11px 0 35px' : '0 12px 0 36px'
              }}
            />
            <svg style={styles.searchIcon} viewBox="0 0 24 24" fill="none">
              <path d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M20.8 20.8L15.8 15.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {/* Suggestions Dropdown */}
            {searchText.trim() && (showSuggestions || searching) && (
              <div style={styles.suggestionsDropdown}>
                {searching ? (
                  <div style={styles.suggestionLoading}>Searching...</div>
                ) : suggestions.length > 0 ? (
                  suggestions.map((c, index) => {
                    console.log(`Suggestion ${index}:`, c)
                    return (
                      <div
                        key={c.collegeId || c.id || index}
                        style={styles.suggestionItem}
                        role="option"
                        onMouseDown={(ev) => { ev.preventDefault(); /* prevent input blur */ handleSuggestionClick(c); setShowSuggestions(false); }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <div style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#E8ECF0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#3a4a52', fontSize: 12, flexShrink: 0 }}>
                          {(c.collegeName || c.college_name || c.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, color: '#111827', fontSize: 13 }}>{truncate(c.collegeName || c.college_name || c.name || 'Unnamed College', 40)}</div>
                          {(c.campus || c.college_campus) && (
                            <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4, fontFamily: 'monospace' }}>{c.campus || c.college_campus}</div>
                          )}
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div style={styles.suggestionLoading}>No colleges found</div>
                )}
              </div>
            )}
          </div>

          <div style={styles.paginationTopContent}>
            <span style={styles.totalDot}>●</span>
            <span style={styles.totalText}>{totalItems}</span>
            <span style={{ margin: '0 6px', color: '#6B7280', fontWeight: '500', whiteSpace: 'nowrap' }}>total ·</span>
            <div style={{ display: 'inline-flex', gap: '6px' }}>
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={!canPrev}
                style={{ ...styles.paginationArrowButton, background: !canPrev ? '#F9FAFB' : 'white', cursor: !canPrev ? 'not-allowed' : 'pointer', opacity: !canPrev ? 0.5 : 1 }}
                aria-label="Previous page"
              >
                ‹
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={!canNext}
                style={{ ...styles.paginationArrowButton, background: !canNext ? '#F9FAFB' : 'white', cursor: !canNext ? 'not-allowed' : 'pointer', opacity: !canNext ? 0.5 : 1 }}
                aria-label="Next page"
              >
                ›
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <section style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 4px 16px rgba(58,74,82,0.08)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#000' }}>
              <th onClick={() => handleSort('collegeId')} style={{ padding: '16px 20px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: sortField === 'collegeId' ? 'white' : 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.07em', cursor: 'pointer', userSelect: 'none', width: '18%' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  ID
                  <span style={{ display: 'inline-flex', padding: '2px', borderRadius: '4px', backgroundColor: sortField === 'collegeId' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>
                    {getSortIcon('collegeId', sortField, sortDir)}
                  </span>
                </span>
              </th>
              <th onClick={() => handleSort('collegeName')} style={{ padding: '16px 20px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: sortField === 'collegeName' ? 'white' : 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.07em', cursor: 'pointer', userSelect: 'none', width: '30%' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  COLLEGE
                  <span style={{ display: 'inline-flex', padding: '2px', borderRadius: '4px', backgroundColor: sortField === 'collegeName' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>
                    {getSortIcon('collegeName', sortField, sortDir)}
                  </span>
                </span>
              </th>
              <th onClick={() => handleSort('campus')} style={{ padding: '16px 20px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: sortField === 'campus' ? 'white' : 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.07em', cursor: 'pointer', userSelect: 'none', width: '25%' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  CAMPUS
                  <span style={{ display: 'inline-flex', padding: '2px', borderRadius: '4px', backgroundColor: sortField === 'campus' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>
                    {getSortIcon('campus', sortField, sortDir)}
                  </span>
                </span>
              </th>
              <th onClick={() => handleSort('createdAt')} style={{ padding: '16px 20px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: sortField === 'createdAt' ? 'white' : 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.07em', cursor: 'pointer', userSelect: 'none', width: '18%' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  CREATED AT
                  <span style={{ display: 'inline-flex', padding: '2px', borderRadius: '4px', backgroundColor: sortField === 'createdAt' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>
                    {getSortIcon('createdAt', sortField, sortDir)}
                  </span>
                </span>
              </th>
              <th onClick={() => handleSort('created_by')} style={{ padding: '16px 20px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: sortField === 'created_by' ? 'white' : 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.07em', cursor: 'pointer', userSelect: 'none', width: '9%' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  CREATED BY
                  <span style={{ display: 'inline-flex', padding: '2px', borderRadius: '4px', backgroundColor: sortField === 'created_by' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>
                    {getSortIcon('created_by', sortField, sortDir)}
                  </span>
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && items.length === 0 ? (
              Array.from({ length: itemsPerPage }).map((_, i) => <SkeletonRow key={i} index={i} />)
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '72px 24px', textAlign: 'center' }}>
                  <div style={{ width: '56px', height: '56px', backgroundColor: '#F3F4F6', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                      <path d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4m8-4v4m0 0l-2-2m2 2l2-2" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <p style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: '600', color: '#374151' }}>No colleges found</p>
                  <p style={{ margin: 0, fontSize: '13px', color: '#9CA3AF' }}>
                    {searchText ? `No results for "${searchText}"` : 'Check back later for new colleges'}
                  </p>
                </td>
              </tr>
            ) : (
              items.map((college, index) => (
                <tr 
                  key={college.collegeId || college.id || index} 
                  style={{ 
                    borderBottom: index === items.length - 1 ? 'none' : '1px solid #F3F4F6',  
                    transition: 'background-color 0.15s', 
                    backgroundColor: 'white',
                    cursor: 'pointer'
                  }}
                  onClick={() => openCollegeDetails(college.collegeId || college.id || '')}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F8FAFB'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                >
                  <td style={{ padding: '18px 20px' }}>
                    <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#3a4a52', fontWeight: '600', backgroundColor: '#F0F4F6', padding: '4px 8px', borderRadius: '6px', letterSpacing: '0.03em' }}>
                      {college.collegeId ? String(college.collegeId).substring(0, 8) + '…' : '—'}
                    </span>
                  </td>
                  <td style={{ padding: '18px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '10px', backgroundColor: '#E8ECF0', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: '#3a4a52' }}>
                        {(college.collegeName || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                          {college.collegeName || '—'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '18px 20px' }}>
                    <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>
                      {college.campus || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '18px 20px' }}>
                    <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>
                      {formatDate(college.createdAt)}
                    </span>
                  </td>
                  <td style={{ padding: '18px 20px' }}>
                    <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>
                      {college.created_by || '—'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <style>{`@keyframes shimmer { 0%,100%{opacity:1;}50%{opacity:0.4;} }`}</style>
      <style>{`
        /* Hide native scrollbars for college details modal while keeping scrolling functional */
        .college-details-modal-body {
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE 10+ */
        }
        .college-details-modal-body::-webkit-scrollbar { display: none; } /* WebKit */
      `}</style>

      {/* Modal for creating new college */}
      {showModal && (
        <div style={styles.modalOverlay} onClick={handleCloseModal}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Create New College</h2>
              <button
                onClick={handleCloseModal}
                style={styles.modalCloseButton}
                disabled={submitting}
              >
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              {/* Success/Warning Message */}
              {modalMessage.text && (
                <div style={{
                  ...styles.messageBox,
                  backgroundColor: modalMessage.type === 'success' ? '#D1FAE5' : 
                                  modalMessage.type === 'warning' ? '#FEF3C7' : '#FEE2E2',
                  borderColor: modalMessage.type === 'success' ? '#10B981' : 
                              modalMessage.type === 'warning' ? '#F59E0B' : '#EF4444',
                  color: modalMessage.type === 'success' ? '#065F46' : 
                        modalMessage.type === 'warning' ? '#92400E' : '#991B1B'
                }}>
                  {modalMessage.text}
                </div>
              )}

              <div style={styles.formGroup}>
                <label style={styles.label}>College Name *</label>
                <input
                  type="text"
                  value={newCollegeName}
                  onChange={(e) => {
                    setNewCollegeName(e.target.value)
                    if (validationErrors.collegeName) {
                      setValidationErrors({ ...validationErrors, collegeName: '' })
                    }
                  }}
                  placeholder="Enter college name (2-70 characters)"
                  style={{
                    ...styles.input,
                    borderColor: validationErrors.collegeName ? '#EF4444' : '#D1D5DB'
                  }}
                  disabled={submitting}
                />
                {validationErrors.collegeName && (
                  <span style={styles.errorText}>{validationErrors.collegeName}</span>
                )}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Campus *</label>
                <input
                  type="text"
                  value={newCampus}
                  onChange={(e) => {
                    setNewCampus(e.target.value)
                    if (validationErrors.campus) {
                      setValidationErrors({ ...validationErrors, campus: '' })
                    }
                  }}
                  placeholder="Enter campus location (10-80 characters)"
                  style={{
                    ...styles.input,
                    borderColor: validationErrors.campus ? '#EF4444' : '#D1D5DB'
                  }}
                  disabled={submitting}
                />
                {validationErrors.campus && (
                  <span style={styles.errorText}>{validationErrors.campus}</span>
                )}
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button
                onClick={handleCloseModal}
                style={styles.modalCancelButton}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCollege}
                style={styles.modalSubmitButton}
                disabled={submitting}
              >
                {submitting ? 'Creating...' : 'Create College'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for college details (view / edit / delete) */}
      {showDetailModal && (
        <div style={styles.modalOverlay} onClick={handleCloseDetailModal}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>College Details</h2>
              <button
                onClick={handleCloseDetailModal}
                style={styles.modalCloseButton}
                disabled={detailLoading}
              >
                ✕
              </button>
            </div>

            <div style={styles.modalBody} className="college-details-modal-body">
              {detailLoading ? (
                <div style={styles.suggestionLoading}>Loading...</div>
              ) : detail ? (
                <div>
                  <SectionCard title="College Information">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px 20px' }}>
                      <InfoItem label="ID" value={detail.collegeId} mono />

                      {/* College name field */}
                      <div>
                        <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em' }}>College name</div>
                        {detailEditMode ? (
                          <input value={detail.collegeName} onChange={(e) => setDetail({ ...detail, collegeName: e.target.value })} style={styles.detailInput} />
                        ) : (
                          <div style={{ fontSize: '14px', color: '#111827', fontWeight: '500' }}>{detail.collegeName || '—'}</div>
                        )}
                      </div>

                      {/* Campus field */}
                      <div>
                        <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Campus</div>
                        {detailEditMode ? (
                          <input value={detail.campus} onChange={(e) => setDetail({ ...detail, campus: e.target.value })} style={styles.detailInput} />
                        ) : (
                          <div style={{ fontSize: '14px', color: '#111827', fontWeight: '500' }}>{detail.campus || '—'}</div>
                        )}
                      </div>
                    </div>
                  </SectionCard>

                  <SectionCard title="Metadata">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px 20px' }}>
                      <InfoItem label="Created at" value={formatDate(detail.createdAt)} />
                      <InfoItem label="Created by" value={detail.created_by} />
                      <InfoItem label="Updated at" value={detail.updated_at ? formatDate(detail.updated_at) : '—'} />
                      <InfoItem label="Updated by" value={detail.updated_by || '—'} />
                    </div>
                  </SectionCard>
                </div>
              ) : (
                <div style={styles.suggestionLoading}>No details available</div>
              )}
            </div>

            <div style={styles.modalFooter}>
              {detail && !detailEditMode && (
                <button onClick={() => setDetailEditMode(true)} style={styles.modalCancelButton}>Edit</button>
              )}

              {detail && detailEditMode && (
                <>
                  <button onClick={() => { setDetailEditMode(false); openCollegeDetails(detail.collegeId) }} style={styles.modalCancelButton}>Cancel</button>
                  <button onClick={handleUpdateCollege} style={styles.modalSubmitButton}>Save</button>
                </>
              )}

              {detail && (
                <button onClick={handleDeleteCollege} style={{ ...styles.modalCancelButton, backgroundColor: '#FEF2F2', borderColor: '#FECACA', color: '#991B1B' }}>Delete</button>
              )}
            </div>
          </div>
        </div>
      )}

      {showConfirmDelete && (
        <ConfirmationModal
          action={'delete'}
          onConfirm={confirmDeleteCollege}
          onCancel={() => { setShowConfirmDelete(false); setDeleteTargetId(null) }}
        />
      )}
    </div>
  )
}

const maskId = (val) => {
  if (val === null || val === undefined || val === '') return '—'
  const s = String(val)
  if (s.length <= 12) return s
  return `${s.slice(0, 6)}...${s.slice(-4)}`
}

const styles = {
  container: {
    padding: '36px 60px',
    maxWidth: 'calc(100% - 120px)',
    margin: '0 auto',
    minHeight: 'auto'
  },
  headerSection: {
    display: 'flex',
    alignItems: 'flex-end',
    marginBottom: '28px',
    gap: 20,
    justifyContent: 'space-between'
  },
  headerLeft: {
    flex: '0 0 auto'
  },
  title: {
    fontSize: '32px',
    fontWeight: '800',
    margin: '0 0 8px 0',
    color: '#111827'
  },
  subtitle: {
    fontSize: '14px',
    color: '#9CA3AF',
    margin: 0,
    fontWeight: '500'
  },
  headerRight: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end'
  },
  searchContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: '380px'
  },
  searchInput: {
    width: '100%',
    height: '40px',
    padding: '0 12px 0 36px',
    borderRadius: '8px',
    border: '1px solid #D1D5DB',
    fontSize: '14px',
    backgroundColor: '#ffffff',
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'all 0.2s',
    boxSizing: 'border-box'
  },
  searchIcon: {
    position: 'absolute',
    left: '10px',
    width: '16px',
    height: '16px',
    color: '#6B7280',
    pointerEvents: 'none'
  },
  suggestionsDropdown: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 'calc(100% + 8px)',
    background: 'white',
    border: '1px solid #E5E7EB',
    borderRadius: 10,
    boxShadow: '0 6px 20px rgba(15,23,42,0.08)',
    maxHeight: 260,
    overflow: 'auto',
    zIndex: 40
  },
  suggestionItem: {
    padding: '8px 10px',
    borderBottom: '1px solid #F3F4F6',
    cursor: 'pointer',
    display: 'flex',
    gap: 10,
    alignItems: 'center',
    transition: 'background 0.12s',
    backgroundColor: 'transparent',
    fontSize: 13,
    color: '#374151'
  },
  suggestionName: {
    fontWeight: '600',
    color: '#111827',
    marginBottom: '4px',
    fontSize: '14px',
    lineHeight: '1.4'
  },
  detailInput: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #D1D5DB',
    borderRadius: '8px',
    fontSize: '14px',
    boxSizing: 'border-box',
    marginTop: 6,
    backgroundColor: '#fff'
  },
  suggestionCampus: {
    fontSize: '11px',
    color: '#6B7280',
    lineHeight: '1.3',
    marginTop: '2px'
  },
  suggestionLoading: {
    padding: '16px',
    fontSize: '13px',
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
    minHeight: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  newButton: {
    backgroundColor: '#9DD957',
    color: '#ffffff',
    border: 'none',
    height: '40px',
    padding: '0 48px',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
    boxShadow: '0 2px 4px rgba(157, 217, 87, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    whiteSpace: 'nowrap'
  },
  paginationTopContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    backgroundColor: '#ffffff',
    border: '1px solid #E5E7EB',
    borderRadius: '10px',
    padding: '0 16px',
    height: '41px',
    boxShadow: '0 1px 3px rgba(58,74,82,0.06)',
    whiteSpace: 'nowrap'
  },
  totalDot: {
    color: '#B9FF66',
    fontSize: '16px',
    fontWeight: '700',
    whiteSpace: 'nowrap'
  },
  totalText: {
    color: '#111827',
    fontWeight: '700',
    fontSize: '13px',
    whiteSpace: 'nowrap'
  },
  paginationDot: {
    color: '#D1D5DB'
  },
  paginationArrowButton: {
    width: 36,
    height: 36,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'white',
    border: '1px solid #E5E7EB',
    cursor: 'pointer',
    fontSize: '16px',
    color: '#6B7280',
    transition: 'all 0.2s',
    borderRadius: '8px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
    borderRadius: '12px',
    overflow: 'hidden'
  },
  headerRow: {
    backgroundColor: '#000000',
    borderBottom: '1px solid #1F2937'
  },
  th: {
    padding: '18px 20px',
    textAlign: 'left',
    fontWeight: '700',
    color: '#ffffff',
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'background 0.15s'
  },
  thContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  bodyRow: {
    borderBottom: '1px solid #E5E7EB',
    transition: 'background 0.15s'
  },
  td: {
    padding: '18px 20px',
    color: '#374151',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    backgroundColor: '#ffffff'
  },
  errorMessage: {
    color: '#DC2626',
    fontSize: '14px',
    fontWeight: '500'
  },
  errorCell: {
    padding: '24px',
    textAlign: 'center',
    backgroundColor: '#ffffff'
  },
  emptyCell: {
    padding: '72px 24px',
    backgroundColor: '#ffffff'
  },
  emptyBox: {
    textAlign: 'center'
  },
  emptyIcon: {
    width: '80px',
    height: '80px',
    backgroundColor: '#F0F1F3',
    borderRadius: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px'
  },
  emptyTitle: {
    margin: '0 0 6px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#1F2937'
  },
  emptySubtitle: {
    margin: 0,
    fontSize: '13px',
    color: '#9CA3AF'
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    backdropFilter: 'blur(4px)'
  },
  modalContent: {
    backgroundColor: '#F4F6F8',
    borderRadius: '12px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
    width: '90%',
    maxWidth: '500px',
    overflow: 'hidden'
  },
  modalHeader: {
    padding: '24px',
    borderBottom: '1px solid #E5E7EB',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#111827',
    margin: 0
  },
  modalCloseButton: {
    background: 'transparent',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#6B7280',
    padding: '0 4px',
    transition: 'color 0.2s'
  },
  modalBody: {
    padding: '24px'
  },
  formGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '8px',
    textTransform: 'uppercase'
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #D1D5DB',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'all 0.2s',
    boxSizing: 'border-box',
    backgroundColor: '#F9FAFB'
  },
  modalFooter: {
    padding: '16px 24px',
    borderTop: '1px solid #E5E7EB',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px'
  },
  modalCancelButton: {
    padding: '10px 20px',
    border: '1px solid #D1D5DB',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    color: '#374151',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  modalSubmitButton: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: '#9DD957',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 2px 4px rgba(157, 217, 87, 0.2)'
  },
  messageBox: {
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '13px',
    fontWeight: '600',
    border: '1px solid',
    display: 'flex',
    alignItems: 'center'
  },
  errorText: {
    color: '#EF4444',
    fontSize: '12px',
    marginTop: '4px',
    display: 'block',
    fontWeight: '500'
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    border: '1px solid #EF4444',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    color: '#991B1B',
    fontSize: '14px',
    fontWeight: '500'
  },
  warningBanner: {
    backgroundColor: '#FEF3C7',
    border: '1px solid #F59E0B',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    color: '#92400E',
    fontSize: '14px',
    fontWeight: '500'
  },
  errorIcon: {
    fontSize: '18px'
  },
  errorClose: {
    marginLeft: 'auto',
    background: 'transparent',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#991B1B',
    padding: '0 4px',
    fontWeight: 'bold'
  }
}
