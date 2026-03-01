import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { get, post, put, deleteRequest } from '../utils/api'
import { getUser } from '../utils/auth'
import { ROLES, getRoleName } from '../constants/roles'
import ConfirmationModal from './ConfirmationModal'
import { SkeletonRow, formatDate, getSortIcon } from './TableCommons'

export default function Users() {
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

  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [hasMore, setHasMore] = useState(false)
  const [totalItems, setTotalItems] = useState(0)
  const [sortField, setSortField] = useState('createdAt')
  const [sortDir, setSortDir] = useState('desc')
  const [canNext, setCanNext] = useState(false)
  const [canPrev, setCanPrev] = useState(false)
  const [showNewMenu, setShowNewMenu] = useState(false)
  const newMenuRef = useRef(null)

  // Filter states
  const [roleFilter, setRoleFilter] = useState('')
  const [collegeFilter, setCollegeFilter] = useState('')
  const [roles, setRoles] = useState([])
  const [colleges, setColleges] = useState([])
  const [rolesLoading, setRolesLoading] = useState(true)
  const [collegesLoading, setCollegesLoading] = useState(false)
  const [showRoleDropdown, setShowRoleDropdown] = useState(false)
  const [showCollegeDropdown, setShowCollegeDropdown] = useState(false)
  const [hoveredCollegeId, setHoveredCollegeId] = useState(null)
  const roleDropdownRef = useRef(null)
  const collegeDropdownRef = useRef(null)
  const collegeScrollRef = useRef(null)
  const [collegePage, setCollegePage] = useState(1)

  // CSV Import states
  const [showImportModal, setShowImportModal] = useState(false)
  const [importFile, setImportFile] = useState(null)
  const [importLoading, setImportLoading] = useState(false)
  const [importResult, setImportResult] = useState(null)

  const extractErrorMessage = (error) => {
    // If it's a validation error object like { email: "error message", firstName: "error" }
    try {
      const parsed = typeof error === 'string' ? JSON.parse(error) : error
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        // Get first error message from object
        const firstKey = Object.keys(parsed)[0]
        if (firstKey && typeof parsed[firstKey] === 'string') {
          return parsed[firstKey]
        }
      }
    } catch (e) {
      // Not JSON, return as-is
    }
    return String(error || '')
  }
  const [importError, setImportError] = useState('')
  const fileInputRef = useRef(null)

  // Batch delete states
  const [selectedUsers, setSelectedUsers] = useState(new Set())
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false)
  const [batchDeleteLoading, setBatchDeleteLoading] = useState(false)

  const navigate = useNavigate()

  const truncate = (s, n = 36) => {
    if (!s) return ''
    return s.length > n ? s.substring(0, n - 1) + '…' : s
  }

  const getCollegeKey = (id) => {
    if (id === null || id === undefined || id === '') return ''
    return String(id)
  }

  const mapUserResponse = useCallback((u) => ({
    ...u,
    uid: u.user_id || u.uid,
    email: u.email,
    cid: u.college_id || u.cid,
    roleName: u.role_name || u.roleName,
    createdBy: u.created_by || u.createdBy,
    createdAt: u.created_at || u.createdAt,
    updatedAt: u.updated_at || u.updatedAt
  }), [])

  // Fetch roles on mount
  useEffect(() => {
    fetchRoles()
    fetchUsers(1, '')
  }, [])

  // Fetch first page only when dropdown opens and cache is empty
  useEffect(() => {
    if (!showCollegeDropdown) return
    if (colleges.length > 0) return
    fetchColleges(1)
  }, [showCollegeDropdown, colleges.length])

  // Fetch additional pages while dropdown is open
  useEffect(() => {
    if (!showCollegeDropdown) return
    if (collegePage <= 1) return
    fetchColleges(collegePage)
  }, [showCollegeDropdown, collegePage])

  // Close filter dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(e.target)) {
        setShowRoleDropdown(false)
      }
      if (collegeDropdownRef.current && !collegeDropdownRef.current.contains(e.target)) {
        setShowCollegeDropdown(false)
        setHoveredCollegeId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchRoles = async () => {
    try {
      const data = await get('http://localhost:8083/api/v1/roles/get-roles')
      let roleList = []
      if (Array.isArray(data)) roleList = data
      else if (Array.isArray(data?.roles)) roleList = data.roles
      else if (data && typeof data === 'object') roleList = Object.values(data).flat()
      
      console.log('Fetched roles:', roleList)
      setRoles(roleList)
    } catch (err) {
      console.error('Failed to fetch roles:', err)
      setRoles([])
    } finally {
      setRolesLoading(false)
    }
  }

  const fetchColleges = async (page) => {
    setCollegesLoading(true)
    try {
      const params = new URLSearchParams({ page_num: page, sort_field: 'createdAt', sort_dir: 'desc' })
      const data = await get(`universitymanagement/api/v1/colleges/system-admin/get-colleges?${params.toString()}`)
      
      let collegeList = []
      if (Array.isArray(data?.colleges)) collegeList = data.colleges
      else if (Array.isArray(data)) collegeList = data
      
      if (page === 1) {
        setColleges(collegeList)
      } else {
        setColleges(prev => [...prev, ...collegeList])
      }
    } catch (err) {
      // If access is denied, silently show no colleges found instead of error
      const text = String(err.message || '').toLowerCase()
      const isAccessDenied = text.includes('403') || text.includes('forbidden') || text.includes('access denied')
      
      if (!isAccessDenied) {
        console.error('Failed to fetch colleges:', err)
      }
      // Always clear colleges on error
      if (page === 1) setColleges([])
    } finally {
      setCollegesLoading(false)
    }
  }

  const handleCollegeScroll = (e) => {
    if (!collegeScrollRef.current) return
    const scrollDiv = collegeScrollRef.current
    if (scrollDiv.scrollTop + scrollDiv.clientHeight >= scrollDiv.scrollHeight - 20) {
      if (!collegesLoading && colleges.length > 0) {
        setCollegePage((prev) => prev + 1)
      }
    }
  }

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchText.trim()) {
        const nextSearch = searchText.trim()
        setDebouncedSearch(nextSearch)
        setPage(1)
        handleSearch(nextSearch)
      } else {
        setDebouncedSearch('')
        setSuggestions([])
        setShowSuggestions(false)
        setPage(1)
        fetchUsers(1, '')
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchText])

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (newMenuRef.current && !newMenuRef.current.contains(e.target)) {
        setShowNewMenu(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  async function handleSearch(searchValue = searchText) {
    if (!searchValue.trim()) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    setSearching(true)
    try {
      const list = await fetchUsers(1, searchValue.trim())

      setSuggestions(list)
      setShowSuggestions(list.length > 0)
    } catch (err) {
      console.error('Search failed:', err)
      setSuggestions([])
      setShowSuggestions(false)
    } finally {
      setSearching(false)
    }
  }

  const handleSuggestionClick = (user) => {
    setSearchText('')
    setDebouncedSearch('')
    setSuggestions([])
    setShowSuggestions(false)
    openUserDetails(user.uid)
  }

  async function fetchUsers(pageNum = page, search = debouncedSearch) {
    setLoading(true)
    setError('')
    try {
      let endpoint = ''
      if (search) {
        const params = new URLSearchParams({ search_text: search.trim() })
        endpoint = `http://localhost:8083/api/v1/account-management/search-user?${params.toString()}`
      } else {
        const params = new URLSearchParams({ 
          page_num: pageNum, 
          page_size: itemsPerPage,
          sort_field: sortField, 
          sort_dir: sortDir 
        })
        
        // Add role_name filter if selected
        if (roleFilter) {
          params.append('role_name', roleFilter)
        }
        
        // Add cid filter if selected
        if (collegeFilter) {
          params.append('cid', collegeFilter)
        }
        
        endpoint = `http://localhost:8083/api/v1/account-management/get-users?${params.toString()}`
      }

      const data = await get(endpoint)

      let raw = []
      if (Array.isArray(data?.usersList)) raw = data.usersList
      else if (Array.isArray(data?.users)) raw = data.users
      else if (Array.isArray(data)) raw = data

      const list = raw.map(mapUserResponse)

      setItems(list)

      if (search.trim()) {
        setSuggestions(list)
      }

      const calculatedTotal = typeof data?.total_count === 'number' ? Number(data.total_count) : list.length
      setTotalItems(calculatedTotal)

      const newHasMore = typeof data?.has_more === 'boolean' ? data.has_more : (Array.isArray(list) && list.length >= itemsPerPage)
      setHasMore(newHasMore)

      setCanPrev(pageNum > 1)
      setCanNext(newHasMore)
      return list
    } catch (err) {
      const errMsg = err.message || String(err)
      console.error('Error fetching users:', errMsg)
      setError(errMsg)
      setItems([])
      return []
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (page > 1) {
      fetchUsers(page, debouncedSearch)
    }
  }, [page])

  useEffect(() => {
    fetchUsers(1, debouncedSearch)
  }, [sortField, sortDir])

  // Fetch users when role filter changes
  useEffect(() => {
    setPage(1)
    fetchUsers(1, debouncedSearch)
  }, [roleFilter])

  // Fetch users when college filter changes
  useEffect(() => {
    setPage(1)
    fetchUsers(1, debouncedSearch)
  }, [collegeFilter])

  const handleImportClick = () => {
    setShowNewMenu(false)
    setShowImportModal(true)
    setImportFile(null)
    setImportError('')
    setImportResult(null)
    // Reset file input to allow fresh file selection
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setTimeout(() => {
      fileInputRef.current?.click()
    }, 100)
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        setImportError('Please select a CSV file')
        setImportFile(null)
        e.target.value = ''
        return
      }
      setImportFile(file)
      setImportError('')
    }
    // Reset input value to allow selecting the same file again
    e.target.value = ''
  }

  const handleImportSubmit = async () => {
    if (!importFile) {
      setImportError('Please select a file')
      return
    }

    setImportLoading(true)
    setImportError('')
    setImportResult(null)

    try {
      const formData = new FormData()
      formData.append('file', importFile)

      const response = await fetch('http://localhost:8083/api/v1/account-management/import', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`
        }
      })

      let data = null
      let responseText = ''
      const contentType = response.headers.get('content-type') || ''
      try {
        responseText = await response.text()
      } catch (e) {
        console.error('Failed to read response body:', e)
      }

      if (responseText && contentType.includes('application/json')) {
        try {
          data = JSON.parse(responseText)
        } catch (e) {
          console.error('Failed to parse response:', e)
        }
      }

      if (!response.ok) {
        // Only show errors from API response
        const apiError = Array.isArray(data?.errors) && data.errors.length > 0
          ? (data.errors[0]?.message || data.errors[0])
          : (data?.message || data?.error || '')
        throw new Error(apiError || 'Import failed')
      }

      setImportResult(data)
      setImportFile(null)
      setTimeout(() => {
        setPage(1)
        fetchUsers(1, debouncedSearch)
      }, 1000)
    } catch (err) {
      const errorText = String(err.message || '').toLowerCase()
      const isAccessDenied = errorText.includes('403') || errorText.includes('forbidden') || errorText.includes('access denied')
      const message = isAccessDenied || !err.message
        ? 'Access denied. Please renew or set a new subscription plan to use this feature.'
        : extractErrorMessage(err.message)
      setImportError(message)
    } finally {
      setImportLoading(false)
    }
  }

  const toggleUserSelection = (userId) => {
    const newSelection = new Set(selectedUsers)
    if (newSelection.has(userId)) {
      newSelection.delete(userId)
    } else {
      newSelection.add(userId)
    }
    setSelectedUsers(newSelection)
  }

  const toggleSelectAll = () => {
    if (selectedUsers.size === items.length) {
      setSelectedUsers(new Set())
    } else {
      const allUserIds = new Set(items.map(user => user.uid))
      setSelectedUsers(allUserIds)
    }
  }

  const handleBatchDelete = async () => {
    setShowBatchDeleteModal(false)
    setBatchDeleteLoading(true)

    try {
      const userIds = Array.from(selectedUsers)
      const response = await fetch('http://localhost:8083/api/v1/account-management/delete-batch', {
        method: 'DELETE',
        body: JSON.stringify(userIds),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`
        }
      })

      if (!response.ok) {
        throw new Error(`Delete failed: ${response.status}`)
      }

      setSelectedUsers(new Set())
      setError('')
      setPage(1)
      await fetchUsers(1, debouncedSearch)
    } catch (err) {
      setError(err.message || 'Failed to delete users')
    } finally {
      setBatchDeleteLoading(false)
    }
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  // Modal handlers removed - now using page navigation instead
  const handleCloseModal = () => {}
  const validateUserForm = () => ({})
  const handleCreateUser = async () => {}
  const openUserDetails = (userId) => {
    if (userId) {
      navigate(`/university-admin/users/${userId}`)
    }
  }
  const handleCloseDetailModal = () => {}
  const handleUpdateUser = async () => {}

  // Banner logic
  const _bannerUser = getUser()
  const _bannerIsSysAdmin = _bannerUser && getRoleName(_bannerUser) === ROLES.SYSTEM_ADMIN
  const _bannerIsForbidden = error && (String(error).includes('403') || String(error).toLowerCase().includes('forbidden'))
  const bannerMessage = _bannerIsForbidden && _bannerIsSysAdmin ? 'Please set or renew your current subscription plan' : error
  const bannerStyle = _bannerIsForbidden && _bannerIsSysAdmin ? styles.warningBanner : styles.errorBanner

  // Batch delete confirmation modal
  const renderBatchDeleteModal = () => {
    if (!showBatchDeleteModal) return null

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={() => !batchDeleteLoading && setShowBatchDeleteModal(false)}
      >
        <div style={{
          backgroundColor: 'white',
          borderRadius: '14px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)',
          padding: '24px',
          maxWidth: '340px',
          width: '90%',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
        >
          {/* Icon */}
          <div style={{
            width: '40px',
            height: '40px',
            backgroundColor: '#FEE2E2',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 0 12px 0'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </div>

          {/* Title */}
          <h3 style={{
            margin: '0 0 4px 0',
            fontSize: '16px',
            fontWeight: '700',
            color: '#111827'
          }}>
            Delete {selectedUsers.size} {selectedUsers.size === 1 ? 'User' : 'Users'}?
          </h3>

          {/* Message */}
          <p style={{
            margin: '0 0 20px 0',
            fontSize: '12px',
            color: '#6B7280',
            lineHeight: '1.5',
            fontWeight: '500'
          }}>
            This action cannot be undone.
          </p>

          {/* Buttons */}
          <div style={{
            display: 'flex',
            gap: '12px'
          }}>
            <button
              onClick={() => setShowBatchDeleteModal(false)}
              disabled={batchDeleteLoading}
              style={{
                flex: 1,
                padding: '9px 14px',
                backgroundColor: '#F3F4F6',
                border: 'none',
                borderRadius: '8px',
                color: '#374151',
                fontWeight: '600',
                fontSize: '12px',
                cursor: batchDeleteLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                opacity: batchDeleteLoading ? 0.5 : 1
              }}
              onMouseEnter={(e) => !batchDeleteLoading && (e.currentTarget.style.backgroundColor = '#E5E7EB')}
              onMouseLeave={(e) => !batchDeleteLoading && (e.currentTarget.style.backgroundColor = '#F3F4F6')}
            >
              Cancel
            </button>
            <button
              onClick={handleBatchDelete}
              disabled={batchDeleteLoading}
              style={{
                flex: 1,
                padding: '9px 14px',
                backgroundColor: '#EF4444',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontWeight: '600',
                fontSize: '12px',
                cursor: batchDeleteLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                opacity: batchDeleteLoading ? 0.8 : 1
              }}
              onMouseEnter={(e) => !batchDeleteLoading && (e.currentTarget.style.backgroundColor = '#DC2626')}
              onMouseLeave={(e) => !batchDeleteLoading && (e.currentTarget.style.backgroundColor = '#EF4444')}
            >
              {batchDeleteLoading ? (
                <>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }} />
                  Deleting
                </>
              ) : (
                <>Delete</>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

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
          <h1 style={styles.title}>Users</h1>
          <p style={styles.subtitle}>Manage and review users information</p>
        </div>
        <div style={styles.headerRight}>
          <div style={{ position: 'relative' }} ref={newMenuRef}>
            <button style={styles.newButton} onClick={() => setShowNewMenu(!showNewMenu)}>+ New</button>
            
            {showNewMenu && (
              <div style={styles.newMenu}>
                <button
                  onClick={() => {
                    navigate('/university-admin/users/new')
                    setShowNewMenu(false)
                  }}
                  style={styles.newMenuOption}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F9FAFB'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <img src="/user.png" alt="User" style={{ width: 20, height: 20, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>Add New User</div>
                    <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>Create a new user manually</div>
                  </div>
                </button>
                <div style={{ borderBottom: '1px solid #E5E7EB' }} />
                <button
                  onClick={handleImportClick}
                  style={styles.newMenuOption}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F9FAFB'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <img src="/import.png" alt="Import" style={{ width: 20, height: 20, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>Import from CSV</div>
                    <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>Bulk import users from file</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          {/* CSV Import Modal */}
          {showImportModal && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}
            onClick={() => !importLoading && setShowImportModal(false)}
            >
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '32px',
                maxWidth: '440px',
                width: '90%',
                maxHeight: '80vh',
                overflowY: 'auto',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)'
              }}
              onClick={(e) => e.stopPropagation()}
              >
                <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: '800', color: '#111827' }}>Import Users from CSV</h2>

                {importLoading && !importResult ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{ display: 'inline-block', width: '44px', height: '44px', border: '3px solid #E5E7EB', borderTop: '3px solid #3a4a52', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    <p style={{ marginTop: '16px', color: '#6B7280', fontSize: '14px' }}>Processing your CSV file...</p>
                  </div>
                ) : importResult ? (
                  <div>
                    <div style={{
                      backgroundColor: importResult.status?.toLowerCase() === 'failed' ? '#FEE2E2' : importResult.failed === 0 && importResult.process_failures === 0 && importResult.write_failures === 0 ? '#D1FAE5' : '#FEF3C7',
                      border: `1px solid ${importResult.status?.toLowerCase() === 'failed' ? '#EF4444' : importResult.failed === 0 && importResult.process_failures === 0 && importResult.write_failures === 0 ? '#6EE7B7' : '#FCD34D'}`,
                      borderRadius: '8px',
                      padding: '16px',
                      marginBottom: '20px'
                    }}>
                      <p style={{
                        margin: '0 0 12px 0',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: importResult.status?.toLowerCase() === 'failed' ? '#991B1B' : importResult.failed === 0 && importResult.process_failures === 0 && importResult.write_failures === 0 ? '#065F46' : '#92400E'
                      }}>
                        Import Complete
                      </p>
                      <div style={{ fontSize: '13px', lineHeight: '1.6', color: importResult.status?.toLowerCase() === 'failed' ? '#7F1D1D' : importResult.failed === 0 && importResult.process_failures === 0 && importResult.write_failures === 0 ? '#047857' : '#78350F' }}>
                        <div>Status: <strong>{importResult.status}</strong></div>
                        <div>Total Read: <strong>{importResult.total_read}</strong></div>
                        <div>Successfully Inserted: <strong style={{ color: '#10B981' }}>{importResult.inserted}</strong></div>
                        {importResult.failed > 0 && <div>Failed: <strong style={{ color: '#EF4444' }}>{importResult.failed}</strong></div>}
                        {importResult.process_failures > 0 && <div>Process Failures: <strong style={{ color: '#EF4444' }}>{importResult.process_failures}</strong></div>}
                        {importResult.write_failures > 0 && <div>Write Failures: <strong style={{ color: '#EF4444' }}>{importResult.write_failures}</strong></div>}
                        <div style={{ marginTop: '8px', fontSize: '12px' }}>
                          Processing time: {importResult.start_time && importResult.end_time ? (
                            <span>{new Date(importResult.end_time).getTime() - new Date(importResult.start_time).getTime()}ms</span>
                          ) : 'N/A'}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        onClick={() => {
                          setShowImportModal(false)
                          setImportResult(null)
                          setImportFile(null)
                          if (fileInputRef.current) {
                            fileInputRef.current.value = ''
                          }
                        }}
                        style={{
                          flex: 1,
                          padding: '12px 20px',
                          backgroundColor: '#9DD957',
                          border: 'none',
                          borderRadius: '10px',
                          color: '#000',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#8BC749'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#9DD957'}
                      >
                        Done
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{
                      border: '2px dashed #D1D5DB',
                      borderRadius: '8px',
                      padding: '32px 16px',
                      textAlign: 'center',
                      marginBottom: '20px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      backgroundColor: importFile ? '#F0FDF4' : '#FAFBFC'
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    >
                      <div style={{ fontSize: '28px', marginBottom: '8px' }}>📄</div>
                      <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                        {importFile ? importFile.name : 'Click to select CSV file'}
                      </p>
                      <p style={{ margin: 0, fontSize: '12px', color: '#6B7280' }}>or drag and drop</p>
                    </div>
                    {importError && (
                      <div style={{
                        backgroundColor: '#FEE2E2',
                        border: '1px solid #EF4444',
                        borderRadius: '8px',
                        padding: '12px',
                        marginBottom: '20px',
                        color: '#991B1B',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px'
                      }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: '1px' }}>
                          <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span>{importError}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        onClick={() => {
                          setShowImportModal(false)
                          if (fileInputRef.current) {
                            fileInputRef.current.value = ''
                          }
                        }}
                        style={{
                          flex: 1,
                          padding: '12px 20px',
                          backgroundColor: 'white',
                          border: '1px solid #D1D5DB',
                          borderRadius: '10px',
                          color: '#374151',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleImportSubmit}
                        disabled={!importFile}
                        style={{
                          flex: 1,
                          padding: '12px 20px',
                          backgroundColor: importFile ? '#9DD957' : '#D1D5DB',
                          border: 'none',
                          borderRadius: '10px',
                          color: importFile ? '#000' : '#6B7280',
                          fontWeight: '600',
                          cursor: importFile ? 'pointer' : 'not-allowed',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => importFile && (e.currentTarget.style.backgroundColor = '#8BC749')}
                        onMouseLeave={(e) => importFile && (e.currentTarget.style.backgroundColor = '#9DD957')}
                      >
                        Import
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Filter Dropdowns */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {/* Role Filter */}
            <div style={{ position: 'relative' }} ref={roleDropdownRef}>
              <button
                onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                style={{
                  padding: '10px 14px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: roleFilter ? '#000' : '#6B7280',
                  border: `2px solid ${showRoleDropdown ? '#000' : '#e6e8f0'}`,
                  borderRadius: '10px',
                  backgroundColor: showRoleDropdown ? '#fff' : '#f9fafb',
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  boxShadow: showRoleDropdown ? '0 0 0 4px rgba(0,0,0,0.08)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  minWidth: '140px',
                  justifyContent: 'space-between',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                <span>{roleFilter ? roleFilter.replace('ROLE_', '').replace(/_/g, ' ') : 'Role'}</span>
                <span style={{ fontSize: '12px', opacity: 0.7, transform: showRoleDropdown ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>▼</span>
              </button>
              {showRoleDropdown && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  backgroundColor: '#fff',
                  border: '1px solid #E5E7EB',
                  borderRadius: '10px',
                  boxShadow: '0 6px 20px rgba(15,23,42,0.08)',
                  zIndex: 40,
                  minWidth: '200px',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  overflowX: 'hidden'
                }}>
                  {rolesLoading ? (
                    <div style={{ padding: '16px', textAlign: 'center', fontSize: '13px', color: '#6B7280' }}>
                      Loading roles...
                    </div>
                  ) : (
                    <>
                      <div
                        style={{
                          padding: '12px 16px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: !roleFilter ? '600' : '400',
                          backgroundColor: !roleFilter ? '#F3F4F6' : 'transparent',
                          color: '#111827',
                          transition: 'background 0.12s',
                          borderBottom: '1px solid #F3F4F6'
                        }}
                        onClick={() => {
                          setRoleFilter('')
                          setShowRoleDropdown(false)
                        }}
                        onMouseEnter={(e) => {
                          if (!roleFilter) return
                          e.currentTarget.style.backgroundColor = 'rgba(157,217,87,0.12)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = !roleFilter ? '#F3F4F6' : 'transparent'
                        }}
                      >
                        All Roles
                      </div>
                      {roles.map((role) => (
                        <div
                          key={role.name}
                          style={{
                            padding: '12px 16px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: roleFilter === role.name ? '600' : '400',
                            backgroundColor: roleFilter === role.name ? '#9DD957' : 'transparent',
                            color: roleFilter === role.name ? '#000' : '#374151',
                            transition: 'background 0.12s',
                            borderBottom: '1px solid #F3F4F6'
                          }}
                          onClick={() => {
                            setRoleFilter(role.name)
                            setShowRoleDropdown(false)
                          }}
                          onMouseEnter={(e) => {
                            if (roleFilter === role.name) return
                            e.currentTarget.style.backgroundColor = 'rgba(157,217,87,0.12)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = roleFilter === role.name ? '#9DD957' : 'transparent'
                          }}
                        >
                          {role.name.replace('ROLE_', '').replace(/_/g, ' ')}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* College Filter */}
            <div style={{ position: 'relative' }} ref={collegeDropdownRef}>
              <button
                onClick={() => {
                  setShowCollegeDropdown((prev) => {
                    if (prev) setHoveredCollegeId(null)
                    if (!prev && colleges.length === 0 && collegePage !== 1) {
                      setCollegePage(1)
                    }
                    return !prev
                  })
                }}
                style={{
                  padding: '10px 14px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: collegeFilter ? '#000' : '#6B7280',
                  border: `2px solid ${showCollegeDropdown ? '#000' : '#e6e8f0'}`,
                  borderRadius: '10px',
                  backgroundColor: showCollegeDropdown ? '#fff' : '#f9fafb',
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  boxShadow: showCollegeDropdown ? '0 0 0 4px rgba(0,0,0,0.08)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  minWidth: '155px',
                  justifyContent: 'space-between',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                <span>{collegeFilter ? '✓ College' : 'College'}</span>
                <span style={{ fontSize: '12px', opacity: 0.7, transform: showCollegeDropdown ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>▼</span>
              </button>
              {showCollegeDropdown && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  backgroundColor: '#fff',
                  border: '1px solid #E5E7EB',
                  borderRadius: '10px',
                  boxShadow: '0 6px 20px rgba(15,23,42,0.08)',
                  zIndex: 40,
                  minWidth: '240px',
                  maxHeight: '300px',
                  overflow: 'auto'
                }} ref={collegeScrollRef} onScroll={handleCollegeScroll}>
                  <div
                    style={{
                      padding: '12px 16px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: !collegeFilter ? '600' : '400',
                      backgroundColor: !collegeFilter ? '#F3F4F6' : 'transparent',
                      color: '#111827',
                      transition: 'background 0.12s',
                      borderBottom: '1px solid #F3F4F6'
                    }}
                    onClick={() => {
                      setCollegeFilter('')
                      setShowCollegeDropdown(false)
                      setHoveredCollegeId(null)
                    }}
                    onMouseEnter={(e) => {
                      if (collegeFilter) e.currentTarget.style.backgroundColor = 'rgba(157,217,87,0.12)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = !collegeFilter ? '#F3F4F6' : 'transparent'
                    }}
                  >
                    All Colleges
                  </div>
                  {colleges.length === 0 && !collegesLoading ? (
                    <div style={{ padding: '16px', textAlign: 'center', fontSize: '13px', color: '#6B7280' }}>
                      No colleges found
                    </div>
                  ) : (
                    colleges.map((college) => (
                      <div
                        key={college.college_id}
                        style={{
                          padding: '12px 16px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: getCollegeKey(collegeFilter) === getCollegeKey(college.college_id) ? '600' : '400',
                          backgroundColor: getCollegeKey(collegeFilter) === getCollegeKey(college.college_id) ? '#9DD957' : 'transparent',
                          color: getCollegeKey(collegeFilter) === getCollegeKey(college.college_id) ? '#000' : '#111827',
                          transition: 'background 0.12s',
                          borderBottom: '1px solid #F3F4F6'
                        }}
                        onClick={() => {
                          setCollegeFilter(getCollegeKey(college.college_id))
                          setShowCollegeDropdown(false)
                          setHoveredCollegeId(null)
                        }}
                        onMouseEnter={(e) => {
                          if (getCollegeKey(collegeFilter) !== getCollegeKey(college.college_id)) {
                            e.currentTarget.style.backgroundColor = 'rgba(157,217,87,0.12)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = getCollegeKey(collegeFilter) === getCollegeKey(college.college_id) ? '#9DD957' : 'transparent'
                        }}
                      >
                        <div style={{ fontWeight: '500', color: 'inherit' }}>
                          {college.college_name}
                        </div>
                        <div style={{ fontSize: '11px', color: getCollegeKey(collegeFilter) === getCollegeKey(college.college_id) ? 'rgba(0,0,0,0.6)' : '#6B7280', marginTop: '3px' }}>
                          {college.campus}
                        </div>
                      </div>
                    ))
                  )}
                  {collegesLoading && (
                    <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: '#6B7280' }}>
                      Loading more...
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div style={styles.searchContainer} ref={searchRef}>
            <input
              type="text"
              placeholder="Search user"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onFocus={() => {
                setSearchFocused(true)
                if (searchText.trim() && suggestions.length > 0) {
                  setShowSuggestions(true)
                }
              }}
              onBlur={() => {
                setTimeout(() => {
                  setSearchFocused(false)
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
                  suggestions.map((u, index) => (
                    <div
                      key={u.uid || index}
                      style={styles.suggestionItem}
                      role="option"
                      onMouseDown={(ev) => { ev.preventDefault(); handleSuggestionClick(u); setShowSuggestions(false); }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#E8ECF0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#3a4a52', fontSize: 12, flexShrink: 0 }}>
                        {(u.email || '?').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: '#111827', fontSize: 13 }}>{truncate(u.email || 'Unknown', 40)}</div>
                        {(u.roleName) && (
                          <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4, fontFamily: 'monospace', textTransform: 'capitalize' }}>{u.roleName}</div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={styles.suggestionLoading}>No users found</div>
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

      {/* Delete Selected Button */}
      {selectedUsers.size > 0 && (
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-start' }}>
          <button
            onClick={() => setShowBatchDeleteModal(true)}
            disabled={batchDeleteLoading}
            style={{
              padding: '10px 16px',
              backgroundColor: '#EF4444',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontWeight: '600',
              fontSize: '13px',
              cursor: batchDeleteLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: batchDeleteLoading ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.2)'
            }}
            onMouseEnter={(e) => !batchDeleteLoading && (e.currentTarget.style.backgroundColor = '#DC2626')}
            onMouseLeave={(e) => !batchDeleteLoading && (e.currentTarget.style.backgroundColor = '#EF4444')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
            Delete {selectedUsers.size} Selected
          </button>
        </div>
      )}

      {/* Table */}
      <section style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 4px 16px rgba(58,74,82,0.08)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#000' }}>
              <th style={{ padding: '16px 20px', textAlign: 'center', fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.75)', width: '5%' }}>
                <input
                  type="checkbox"
                  checked={selectedUsers.size > 0 && selectedUsers.size === items.length}
                  onChange={toggleSelectAll}
                  className="custom-checkbox"
                />
              </th>
              <th onClick={() => handleSort('uid')} style={{ padding: '16px 20px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: sortField === 'uid' ? 'white' : 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.07em', cursor: 'pointer', userSelect: 'none', width: '15%' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  ID
                  <span style={{ display: 'inline-flex', padding: '2px', borderRadius: '4px', backgroundColor: sortField === 'uid' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>
                    {getSortIcon('uid', sortField, sortDir)}
                  </span>
                </span>
              </th>
              <th onClick={() => handleSort('email')} style={{ padding: '16px 20px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: sortField === 'email' ? 'white' : 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.07em', cursor: 'pointer', userSelect: 'none', width: '25%' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  EMAIL
                  <span style={{ display: 'inline-flex', padding: '2px', borderRadius: '4px', backgroundColor: sortField === 'email' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>
                    {getSortIcon('email', sortField, sortDir)}
                  </span>
                </span>
              </th>
              <th onClick={() => handleSort('cid')} style={{ padding: '16px 20px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: sortField === 'cid' ? 'white' : 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.07em', cursor: 'pointer', userSelect: 'none', width: '18%', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  COLLEGE
                  <span style={{ display: 'inline-flex', padding: '2px', borderRadius: '4px', backgroundColor: sortField === 'cid' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>
                    {getSortIcon('cid', sortField, sortDir)}
                  </span>
                </span>
              </th>
              <th onClick={() => handleSort('roleName')} style={{ padding: '16px 20px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: sortField === 'roleName' ? 'white' : 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.07em', cursor: 'pointer', userSelect: 'none', width: '15%' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  ROLE
                  <span style={{ display: 'inline-flex', padding: '2px', borderRadius: '4px', backgroundColor: sortField === 'roleName' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>
                    {getSortIcon('roleName', sortField, sortDir)}
                  </span>
                </span>
              </th>
              <th onClick={() => handleSort('createdBy')} style={{ padding: '16px 20px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: sortField === 'createdBy' ? 'white' : 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.07em', cursor: 'pointer', userSelect: 'none', width: '16%', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  CREATED BY
                  <span style={{ display: 'inline-flex', padding: '2px', borderRadius: '4px', backgroundColor: sortField === 'createdBy' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>
                    {getSortIcon('createdBy', sortField, sortDir)}
                  </span>
                </span>
              </th>
              <th onClick={() => handleSort('createdAt')} style={{ padding: '16px 20px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: sortField === 'createdAt' ? 'white' : 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.07em', cursor: 'pointer', userSelect: 'none', width: '17%', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  CREATED AT
                  <span style={{ display: 'inline-flex', padding: '2px', borderRadius: '4px', backgroundColor: sortField === 'createdAt' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>
                    {getSortIcon('createdAt', sortField, sortDir)}
                  </span>
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && items.length === 0 ? (
              Array.from({ length: itemsPerPage }).map((_, i) => <SkeletonRow key={i} index={i} cols={6} />)
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '72px 24px', textAlign: 'center' }}>
                  <div style={{ width: '56px', height: '56px', backgroundColor: '#F3F4F6', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                      <path d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4m8-4v4m0 0l-2-2m2 2l2-2" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <p style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: '600', color: '#374151' }}>No users found</p>
                  <p style={{ margin: 0, fontSize: '13px', color: '#9CA3AF' }}>
                    {searchText ? `No results for "${searchText}"` : 'Check back later for new users'}
                  </p>
                </td>
              </tr>
            ) : (
              items.map((user, index) => (
                <tr 
                  key={user.uid || index} 
                  style={{ 
                    borderBottom: index === items.length - 1 ? 'none' : '1px solid #F3F4F6',  
                    transition: 'background-color 0.15s', 
                    backgroundColor: selectedUsers.has(user.uid) ? '#ECFDF5' : 'white',
                    cursor: 'pointer'
                  }}
                  onClick={() => navigate(`/university-admin/users/${user.uid}`)}
                  onMouseEnter={(e) => {
                    if (selectedUsers.has(user.uid)) {
                      e.currentTarget.style.backgroundColor = '#D1FAE5'
                    } else {
                      e.currentTarget.style.backgroundColor = '#F8FAFB'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedUsers.has(user.uid)) {
                      e.currentTarget.style.backgroundColor = '#ECFDF5'
                    } else {
                      e.currentTarget.style.backgroundColor = 'white'
                    }
                  }}
                >
                  <td style={{ padding: '18px 20px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedUsers.has(user.uid)}
                      onChange={() => toggleUserSelection(user.uid)}
                      className="custom-checkbox"
                    />
                  </td>
                  <td style={{ padding: '18px 20px' }}>
                    <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#3a4a52', fontWeight: '600', backgroundColor: '#F0F4F6', padding: '4px 8px', borderRadius: '6px', letterSpacing: '0.03em' }}>
                      {user.uid ? String(user.uid).substring(0, 8) + '…' : '—'}
                    </span>
                  </td>
                  <td style={{ padding: '18px 20px' }}>
                    <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>
                      {user.email || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '18px 20px', whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500', fontFamily: 'monospace' }}>
                      {user.cid ? String(user.cid).substring(0, 8) + '…' : '—'}
                    </span>
                  </td>
                  <td style={{ padding: '18px 20px' }}>
                    <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500', textTransform: 'capitalize' }}>
                      {user.roleName ? user.roleName.replace('ROLE_', '').replace(/_/g, ' ') : '—'}
                    </span>
                  </td>
                  <td style={{ padding: '18px 20px', whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>
                      {user.createdBy || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '18px 20px', whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>
                      {formatDate(user.createdAt)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {/* CSV Import Notice */}
      <div style={{
        marginTop: '20px',
        padding: '16px 20px',
        backgroundColor: '#F0F9FF',
        border: '1px solid #BAE6FD',
        borderRadius: '8px',
        fontSize: '13px',
        color: '#0C4A6E',
        lineHeight: '1.6'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: '2px' }}>
            <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#0284C7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div>
            <strong style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Batch User Import</strong>
            <p style={{ margin: '0 0 8px 0' }}>
              If you want to insert users in batch, you can import your CSV file using the import button above.
            </p>
            <p style={{ margin: '0 0 8px 0' }}>
              <strong>Important:</strong> The <code style={{ 
                backgroundColor: '#DBEAFE', 
                padding: '2px 6px', 
                borderRadius: '4px', 
                fontFamily: 'monospace',
                fontSize: '12px',
                color: '#1E40AF'
              }}>cid</code> column in your CSV file must match one of the college UUIDs in UniHub.
            </p>
            <p style={{ margin: 0 }}>
              If you want to create your CSV file and don't know how, you can{' '}
              <a 
                href="/sample.csv" 
                download="sample_users.csv"
                style={{ 
                  color: '#0284C7', 
                  fontWeight: '600', 
                  textDecoration: 'underline',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#0369A1'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#0284C7'}
              >
                download this sample
              </a>.
            </p>
          </div>
        </div>
      </div>

      <style>{`@keyframes shimmer { 0%,100%{opacity:1;}50%{opacity:0.4;} } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <style>{`
        .user-details-modal-body {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .user-details-modal-body::-webkit-scrollbar { display: none; }
        
        .custom-checkbox {
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          width: 16px;
          height: 16px;
          border: 2px solid #D1D5DB;
          border-radius: 4px;
          cursor: pointer;
          position: relative;
          transition: all 0.2s ease;
          background-color: white;
        }
        
        .custom-checkbox:hover {
          border-color: #9CA3AF;
          background-color: #F9FAFB;
        }
        
        .custom-checkbox:checked {
          background-color: #9DD957;
          border-color: #9DD957;
        }
        
        .custom-checkbox:checked::after {
          content: '';
          position: absolute;
          left: 3.5px;
          top: 0.5px;
          width: 4px;
          height: 8px;
          border: solid white;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }
        
        .custom-checkbox:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(157, 217, 87, 0.15);
        }
      `}</style>
      {renderBatchDeleteModal()}
    </div>
  )
}


const InfoItem = ({ label, value, mono = false }) => (
  <div>
    <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
    <div style={{ 
      fontSize: '14px', 
      color: '#111827', 
      fontWeight: '500',
      ...(mono && { fontFamily: 'monospace', backgroundColor: '#F0F4F6', padding: '4px 8px', borderRadius: '6px', letterSpacing: '0.03em' })
    }}>
      {value || '—'}
    </div>
  </div>
)

const SectionCard = ({ title, children }) => (
  <div style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #E5E7EB' }}>
    <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#111827', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</h3>
    {children}
  </div>
)

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
  newMenu: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    background: 'white',
    border: '1px solid #E5E7EB',
    borderRadius: '10px',
    boxShadow: '0 10px 25px rgba(15,23,42,0.1)',
    minWidth: '280px',
    zIndex: 50,
    overflow: 'hidden'
  },
  newMenuOption: {
    width: '100%',
    padding: '12px 16px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    transition: 'all 0.15s',
    fontSize: '13px',
    color: '#374151',
    textAlign: 'left'
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
