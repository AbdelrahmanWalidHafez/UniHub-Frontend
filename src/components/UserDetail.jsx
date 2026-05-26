import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { get, post, put, patch, deleteRequest } from '../utils/api'
import { ROUTES } from '../constants/routes'

// Helper Components - Defined outside to prevent re-mounting issues
const SectionCard = ({ title, children }) => (
  <div style={{ backgroundColor: 'white', borderRadius: '26px', padding: '22px', marginBottom: '22px', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}>
    <div style={{ fontWeight: '800', marginBottom: '14px', paddingLeft: '12px', borderLeft: '4px solid #c8ffbd', fontSize: '16px' }}>{title}</div>
    <div>{children}</div>
  </div>
)

const InfoItem = ({ label, value, loading = false }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
    <div style={{ fontSize: 15, color: '#111827', fontWeight: 600 }}>
      {loading && (value === null || value === undefined) ? (
        <div style={{ width: '56%', height: 14, background: '#EEF2F6', borderRadius: 6 }} />
      ) : (
        <span style={{ color: value ? '#111827' : '#D1D5DB' }}>{value || '—'}</span>
      )}
    </div>
  </div>
)

const InputField = ({ label, type = 'text', value, onChange, error: fieldError, disabled = false, required = false, placeholder = '' }) => {
  const [isFocused, setIsFocused] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const getBorderColor = () => {
    if (fieldError) return '#EF4444'
    if (isFocused) return '#000'
    if (isHovered) return '#d1d9e8'
    return '#e6e8f0'
  }

  const getBackgroundColor = () => {
    if (disabled) return '#F3F4F6'
    if (isFocused || isHovered) return '#fff'
    return '#f9fafb'
  }

  const getBoxShadow = () => {
    if (fieldError) return '0 0 0 4px rgba(239, 68, 68, 0.12)'
    if (isFocused) return '0 0 0 4px rgba(0, 0, 0, 0.08)'
    if (isHovered) return '0 4px 12px rgba(0,0,0,0.08)'
    return 'none'
  }

  return (
    <div style={{ marginBottom: '24px' }}>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label} {required && '*'}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '12px 16px',
          minHeight: '48px',
          fontSize: '14px',
          border: `2px solid ${getBorderColor()}`,
          borderRadius: '10px',
          boxSizing: 'border-box',
          backgroundColor: getBackgroundColor(),
          color: disabled ? '#9CA3AF' : '#2b3740',
          opacity: disabled ? 0.6 : 1,
          fontFamily: 'inherit',
          transition: 'all 0.2s ease',
          boxShadow: getBoxShadow(),
          outline: 'none'
        }}
        onFocus={() => !disabled && setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onMouseEnter={() => !disabled && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
      {fieldError && (
        <div style={{ fontSize: '12px', color: '#EF4444', marginTop: '6px', fontWeight: '500', animation: 'slideDown 0.3s ease-out' }}>
          {fieldError}
        </div>
      )}
    </div>
  )
}

export default function UserDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNewUser = !id || id === 'new'

  const [user, setUser] = useState({
    uid: '',
    email: '',
    firstName: '',
    lastName: '',
    dob: '',
    gender: 'MALE',
    roleName: '',
    collegeId: '',
    collegeName: '',
    collegeCampus: '',
    gpa: '',
    universityUid: '',
    tid: '',
    cid: '',
    createdBy: '',
    createdAt: '',
    updatedBy: '',
    updatedAt: ''
  })

  const [roles, setRoles] = useState([])
  const [colleges, setColleges] = useState([])
  const [collegeDetails, setCollegeDetails] = useState(null)
  const [rolesLoading, setRolesLoading] = useState(true)
  const [loading, setLoading] = useState(!isNewUser)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})

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

  const getCollegeKey = (id) => {
    if (id === null || id === undefined || id === '') return ''
    return String(id)
  }

  const [isEditing, setIsEditing] = useState(isNewUser)
  const [isGpaQuickEdit, setIsGpaQuickEdit] = useState(false)
  const [quickGpaValue, setQuickGpaValue] = useState('')
  const [quickGpaError, setQuickGpaError] = useState('')
  const [quickGpaSaving, setQuickGpaSaving] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Dropdown states
  const [showGenderDropdown, setShowGenderDropdown] = useState(false)
  const [showRoleDropdown, setShowRoleDropdown] = useState(false)
  const [showCollegeDropdown, setShowCollegeDropdown] = useState(false)
  const [hoveredCollegeId, setHoveredCollegeId] = useState(null)
  const [collegePage, setCollegePage] = useState(1)
  const [collegesLoading, setCollegesLoading] = useState(false)
  const [collegesError, setCollegesError] = useState('')
  const [hasMoreColleges, setHasMoreColleges] = useState(true)
  const genderDDRef = useRef(null)
  const roleDDRef = useRef(null)
  const collegeDDRef = useRef(null)
  const collegeScrollRef = useRef(null)

  const DateField = ({ label, value, onChange, error: fieldError, disabled = false, required = false }) => {
    const dateInputRef = useRef(null)
    const calendarRef = useRef(null)
    const yearDropdownRef = useRef(null)
    const [showCalendar, setShowCalendar] = useState(false)
    const [showYearDropdown, setShowYearDropdown] = useState(false)
    const [isFocused, setIsFocused] = useState(false)
    const [isHovered, setIsHovered] = useState(false)
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [inputValue, setInputValue] = useState(value || '')

    useEffect(() => {
      setInputValue(value || '')
    }, [value])

    useEffect(() => {
      function handleClickOutside(e) {
        if (calendarRef.current && !calendarRef.current.contains(e.target)) {
          setShowCalendar(false)
          setShowYearDropdown(false)
        }
      }
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleDatePickerClick = () => {
      if (!disabled) {
        setShowCalendar(!showCalendar)
      }
    }

    const getBorderColor = () => {
      if (fieldError) return '#EF4444'
      if (isFocused || showCalendar) return '#000'
      if (isHovered) return '#d1d9e8'
      return '#e6e8f0'
    }

    const handleInputChange = (e) => {
      const val = e.target.value
      setInputValue(val)
      // Try to parse the date
      const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
      const match = val.match(dateRegex)
      if (match) {
        const month = parseInt(match[1], 10) - 1
        const day = parseInt(match[2], 10)
        const year = parseInt(match[3], 10)
        const date = new Date(year, month, day)
        if (!isNaN(date.getTime())) {
          const isoDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          onChange({ target: { value: isoDate } })
        }
      }
    }

    const handleInputBlur = () => {
      setIsFocused(false)
      // Format the input value if it's a valid date
      if (value) {
        const date = new Date(value)
        if (!isNaN(date.getTime())) {
          setInputValue(`${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`)
        }
      }
    }

    const handleInputFocus = () => {
      setIsFocused(true)
      if (value) {
        const date = new Date(value)
        if (!isNaN(date.getTime())) {
          setInputValue(`${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`)
        }
      }
    }

    const daysInMonth = (date) => {
      return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
    }

    const firstDayOfMonth = (date) => {
      return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
    }

    const generateCalendarDays = () => {
      const days = []
      const totalDays = daysInMonth(currentMonth)
      const firstDay = firstDayOfMonth(currentMonth)
      const year = currentMonth.getFullYear()
      const month = currentMonth.getMonth()

      // Previous month days
      const prevMonthDays = firstDay
      const prevMonth = new Date(year, month, 0)
      const prevMonthTotal = prevMonth.getDate()
      for (let i = prevMonthTotal - prevMonthDays + 1; i <= prevMonthTotal; i++) {
        days.push({ day: i, isCurrentMonth: false, isPrevMonth: true })
      }

      // Current month days
      for (let i = 1; i <= totalDays; i++) {
        days.push({ day: i, isCurrentMonth: true })
      }

      // Next month days
      const remainingDays = 42 - days.length
      for (let i = 1; i <= remainingDays; i++) {
        days.push({ day: i, isCurrentMonth: false, isNextMonth: true })
      }

      return days
    }

    const handleDayClick = (day) => {
      if (!day.isCurrentMonth) {
        if (day.isPrevMonth) {
          const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, day.day)
          setCurrentMonth(newMonth)
          const isoDate = `${newMonth.getFullYear()}-${String(newMonth.getMonth() + 1).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`
          onChange({ target: { value: isoDate } })
        } else {
          const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, day.day)
          setCurrentMonth(newMonth)
          const isoDate = `${newMonth.getFullYear()}-${String(newMonth.getMonth() + 1).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`
          onChange({ target: { value: isoDate } })
        }
      } else {
        const isoDate = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`
        onChange({ target: { value: isoDate } })
      }
      setShowCalendar(false)
    }

    const isSelectedDay = (day) => {
      if (!value || !day.isCurrentMonth) return false
      const selectedDate = new Date(value)
      return selectedDate.getDate() === day.day &&
             selectedDate.getMonth() === currentMonth.getMonth() &&
             selectedDate.getFullYear() === currentMonth.getFullYear()
    }

    const isToday = (day) => {
      if (!day.isCurrentMonth) return false
      const today = new Date()
      return today.getDate() === day.day &&
             today.getMonth() === currentMonth.getMonth() &&
             today.getFullYear() === currentMonth.getFullYear()
    }

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    return (
      <div style={{ marginBottom: '24px', position: 'relative' }} ref={calendarRef}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label} {required && '*'}
        </label>
        <div style={{ position: 'relative' }}>
          <input
            ref={dateInputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            disabled={disabled}
            placeholder="MM/DD/YYYY"
            style={{
              width: '100%',
              padding: '12px 50px 12px 16px',
              minHeight: '48px',
              fontSize: '14px',
              border: `2px solid ${getBorderColor()}`,
              borderRadius: '10px',
              boxSizing: 'border-box',
              backgroundColor: disabled ? '#F3F4F6' : (isFocused || isHovered || showCalendar ? '#fff' : '#f9fafb'),
              color: disabled ? '#9CA3AF' : (value ? '#2b3740' : '#9CA3AF'),
              opacity: disabled ? 0.6 : 1,
              fontFamily: 'inherit',
              transition: 'all 0.2s ease',
              boxShadow: fieldError ? '0 0 0 4px rgba(239, 68, 68, 0.12)' : (isFocused || showCalendar ? '0 0 0 4px rgba(0, 0, 0, 0.08)' : (isHovered ? '0 4px 12px rgba(0,0,0,0.08)' : 'none')),
              outline: 'none',
              cursor: 'pointer'
            }}
            onMouseEnter={() => !disabled && setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          />
          <button
            type="button"
            onClick={handleDatePickerClick}
            disabled={disabled}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '32px',
              height: '32px',
              border: 'none',
              background: 'transparent',
              cursor: disabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: disabled ? 0.4 : 1,
              transition: 'opacity 0.2s ease',
              padding: 0
            }}
            aria-label="Open calendar"
          >
            <img 
              src="/calendar.png" 
              alt="Calendar" 
              style={{ 
                width: '24px', 
                height: '24px', 
                objectFit: 'contain',
                opacity: isFocused || isHovered || showCalendar ? 1 : 0.7,
                transition: 'opacity 0.2s ease'
              }} 
            />
          </button>
        </div>

        {showCalendar && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 'calc(100% + 4px)',
              background: 'white',
              border: '1px solid #E5E7EB',
              borderRadius: 10,
              boxShadow: '0 6px 20px rgba(15,23,42,0.08)',
              zIndex: 40,
              padding: '16px'
            }}
          >
            {/* Calendar Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '18px',
                  color: '#374151',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  transition: 'background 0.12s',
                  flexShrink: 0
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(157,217,87,0.12)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                ‹
              </button>
              <div style={{ display: 'flex', gap: '8px', flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <span style={{ fontWeight: '600', fontSize: '14px', color: '#111827' }}>
                  {monthNames[currentMonth.getMonth()]}
                </span>
                <div style={{ position: 'relative' }} ref={yearDropdownRef}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowYearDropdown(!showYearDropdown)
                    }}
                    style={{
                      padding: '6px 24px 6px 12px',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#111827',
                      border: showYearDropdown ? '2px solid #000' : '2px solid #e6e8f0',
                      borderRadius: '10px',
                      backgroundColor: showYearDropdown ? '#fff' : '#f9fafb',
                      cursor: 'pointer',
                      outline: 'none',
                      transition: 'all 0.2s ease',
                      boxShadow: showYearDropdown ? '0 0 0 4px rgba(0, 0, 0, 0.08)' : 'none',
                      position: 'relative',
                      minWidth: '80px'
                    }}
                  >
                    {currentMonth.getFullYear()}
                    <span style={{ 
                      position: 'absolute', 
                      right: '8px', 
                      top: '50%', 
                      transform: showYearDropdown ? 'translateY(-50%) rotate(180deg)' : 'translateY(-50%)',
                      fontSize: '10px',
                      transition: 'transform 0.3s ease'
                    }}>▼</span>
                  </button>
                  {showYearDropdown && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: 'calc(100% + 4px)',
                        background: 'white',
                        border: '1px solid #E5E7EB',
                        borderRadius: 10,
                        boxShadow: '0 6px 20px rgba(15,23,42,0.08)',
                        maxHeight: '200px',
                        overflow: 'auto',
                        zIndex: 50
                      }}
                    >
                      {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map(year => (
                        <div
                          key={year}
                          style={{
                            padding: '8px 12px',
                            borderBottom: '1px solid #F3F4F6',
                            cursor: 'pointer',
                            fontSize: 13,
                            fontWeight: currentMonth.getFullYear() === year ? '600' : '400',
                            backgroundColor: currentMonth.getFullYear() === year ? '#9DD957' : 'transparent',
                            color: currentMonth.getFullYear() === year ? '#000' : '#374151',
                            transition: 'background 0.12s'
                          }}
                          onClick={() => {
                            setCurrentMonth(new Date(year, currentMonth.getMonth()))
                            setShowYearDropdown(false)
                          }}
                          onMouseEnter={(e) => {
                            if (currentMonth.getFullYear() !== year) {
                              e.currentTarget.style.backgroundColor = 'rgba(157,217,87,0.12)'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (currentMonth.getFullYear() !== year) {
                              e.currentTarget.style.backgroundColor = 'transparent'
                            }
                          }}
                        >
                          {year}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '18px',
                  color: '#374151',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  transition: 'background 0.12s',
                  flexShrink: 0
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(157,217,87,0.12)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                ›
              </button>
            </div>

            {/* Day Names */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px' }}>
              {dayNames.map(day => (
                <div key={day} style={{ textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#6B7280', padding: '4px' }}>
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
              {generateCalendarDays().map((dayObj, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleDayClick(dayObj)}
                  style={{
                    padding: '8px',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: isSelectedDay(dayObj) ? '600' : '400',
                    color: !dayObj.isCurrentMonth ? '#D1D5DB' : (isSelectedDay(dayObj) ? '#000' : (isToday(dayObj) ? '#9DD957' : '#374151')),
                    backgroundColor: isSelectedDay(dayObj) ? '#9DD957' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.12s',
                    textAlign: 'center'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelectedDay(dayObj)) {
                      e.currentTarget.style.backgroundColor = 'rgba(157,217,87,0.12)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelectedDay(dayObj)) {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }
                  }}
                >
                  {dayObj.day}
                </button>
              ))}
            </div>
          </div>
        )}

        {fieldError && (
          <div style={{ fontSize: '12px', color: '#EF4444', marginTop: '6px', fontWeight: '500', animation: 'slideDown 0.3s ease-out' }}>
            {fieldError}
          </div>
        )}
      </div>
    )
  }

  const CustomSelectField = ({ label, value, onChange, options, error: fieldError, disabled = false, required = false, showDropdown, setShowDropdown, dropdownRef }) => {
    const selectedOption = options.find(opt => opt.value === value)
    
    return (
      <div style={{ marginBottom: '24px', position: 'relative' }} ref={dropdownRef}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label} {required && '*'}
        </label>
        <button
          type="button"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation()
            if (!disabled) setShowDropdown(!showDropdown)
          }}
          style={{
            width: '100%',
            padding: '12px 16px',
            minHeight: '48px',
            fontSize: '14px',
            border: fieldError ? '2px solid #EF4444' : '2px solid #e6e8f0',
            borderRadius: '10px',
            boxSizing: 'border-box',
            backgroundColor: showDropdown ? '#fff' : (disabled ? '#F3F4F6' : '#f9fafb'),
            color: disabled ? '#9CA3AF' : (value ? '#2b3740' : '#9CA3AF'),
            opacity: disabled ? 0.6 : 1,
            fontFamily: 'inherit',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            textAlign: 'left',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: fieldError ? '0 0 0 4px rgba(239, 68, 68, 0.12)' : (showDropdown ? '0 0 0 4px rgba(0, 0, 0, 0.08)' : 'none'),
            outline: 'none'
          }}
          onMouseEnter={(e) => {
            if (!fieldError && !showDropdown && !disabled) {
              e.currentTarget.style.borderColor = '#d1d9e8'
              e.currentTarget.style.backgroundColor = '#fff'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'
            }
          }}
          onMouseLeave={(e) => {
            if (!fieldError && !showDropdown && !disabled) {
              e.currentTarget.style.borderColor = '#e6e8f0'
              e.currentTarget.style.backgroundColor = '#f9fafb'
              e.currentTarget.style.boxShadow = 'none'
            }
          }}
          onFocus={(e) => {
            if (!fieldError && !disabled) {
              e.currentTarget.style.borderColor = '#000'
              e.currentTarget.style.backgroundColor = '#fff'
              e.currentTarget.style.boxShadow = '0 0 0 4px rgba(0, 0, 0, 0.08)'
            }
          }}
          onBlur={(e) => {
            if (!fieldError && !showDropdown && !disabled) {
              e.currentTarget.style.borderColor = '#e6e8f0'
              e.currentTarget.style.backgroundColor = '#f9fafb'
              e.currentTarget.style.boxShadow = 'none'
            }
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {selectedOption?.icon && (
              <img src={selectedOption.icon} alt={selectedOption.label} style={{ width: 20, height: 20, objectFit: 'contain' }} />
            )}
            {selectedOption ? selectedOption.label : `Select ${label}`}
          </span>
          <span style={{ fontSize: '12px', transition: 'transform 0.3s ease', transform: showDropdown ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
        </button>

        {showDropdown && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 'calc(100% + 4px)',
              background: 'white',
              border: '1px solid #E5E7EB',
              borderRadius: 10,
              boxShadow: '0 6px 20px rgba(15,23,42,0.08)',
              maxHeight: 400,
              overflow: 'auto',
              zIndex: 40
            }}
          >
            {options.map((opt) => (
              <div
                key={opt.value}
                style={{
                  padding: '8px 10px',
                  borderBottom: '1px solid #F3F4F6',
                  cursor: 'pointer',
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                  transition: 'background 0.12s',
                  backgroundColor: value === opt.value ? '#9DD957' : 'transparent',
                  fontSize: 13,
                  color: value === opt.value ? '#000' : '#374151'
                }}
                onClick={() => {
                  onChange({ target: { value: opt.value } })
                  setShowDropdown(false)
                }}
                onMouseEnter={(e) => {
                  if (value !== opt.value) {
                    e.currentTarget.style.backgroundColor = 'rgba(157,217,87,0.12)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (value !== opt.value) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }
                }}
              >
                {opt.icon ? (
                  <img src={opt.icon} alt={opt.label} style={{ width: 28, height: 28, objectFit: 'contain', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#E8ECF0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#3a4a52', fontSize: 12, flexShrink: 0 }}>
                    {opt.label.charAt(0).toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1, fontWeight: 600, color: value === opt.value ? '#000' : '#111827', fontSize: 13 }}>
                  {opt.label}
                </div>
              </div>
            ))}
          </div>
        )}

        {fieldError && (
          <div style={{ fontSize: '12px', color: '#EF4444', marginTop: '6px', fontWeight: '500', animation: 'slideDown 0.3s ease-out' }}>
            {fieldError}
          </div>
        )}
      </div>
    )
  }

  // Fetch roles on mount
  useEffect(() => {
    fetchRoles()
  }, [])

  // Fetch user data if editing
  useEffect(() => {
    if (!isNewUser && id) {
      fetchUser()
    }
  }, [id])

  // Fetch college details when we have a CID
  useEffect(() => {
    const fetchCollegeDetails = async () => {
      if (user?.cid) {
        try {
          const data = await get(`universitymanagement/api/v1/colleges/system-admin/get-college/${user.cid}`)
          setCollegeDetails(data)
        } catch (err) {
          console.error('Failed to fetch college details:', err)
        }
      }
    }
    fetchCollegeDetails()
  }, [user?.cid])

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

  useEffect(() => {
    if (!showCollegeDropdown || collegesLoading || !hasMoreColleges) return
    const scrollElement = collegeScrollRef.current
    if (!scrollElement) return

    if (scrollElement.scrollHeight <= scrollElement.clientHeight + 4 && colleges.length > 0) {
      setCollegePage((prev) => prev + 1)
    }
  }, [showCollegeDropdown, colleges, collegesLoading, hasMoreColleges])

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (genderDDRef.current && !genderDDRef.current.contains(e.target)) {
        setShowGenderDropdown(false)
      }
      if (roleDDRef.current && !roleDDRef.current.contains(e.target)) {
        setShowRoleDropdown(false)
      }
      if (collegeDDRef.current && !collegeDDRef.current.contains(e.target)) {
        setShowCollegeDropdown(false)
        setHoveredCollegeId(null)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const fetchRoles = async () => {
    setRolesLoading(true)
    try {
      const data = await get('/api/v1/roles/get-roles')
      const rolesList = data.roles || []
      setRoles(rolesList)
    } catch (err) {
      console.error('Failed to fetch roles:', err)
      setError('Failed to load available roles')
    } finally {
      setRolesLoading(false)
    }
  }

  const fetchColleges = async (page) => {
    setCollegesLoading(true)
    setCollegesError('')
    try {
      const data = await get(`universitymanagement/api/v1/colleges/system-admin/get-colleges?page_num=${page}&sort_field=createdAt&sort_dir=desc`)
      const collegesList = data.colleges || []

      if (page === 1) {
        setColleges(collegesList)
      } else {
        setColleges((prev) => [...prev, ...collegesList])
      }

      if (typeof data.has_more === 'boolean') {
        setHasMoreColleges(data.has_more)
      } else {
        setHasMoreColleges(collegesList.length > 0)
      }

      if (page === 1 && collegesList.length === 0) {
        setCollegesError('No colleges available')
      }
    } catch (err) {
      // If access is denied, silently show no colleges found instead of error
      const text = String(err.message || '').toLowerCase()
      const isAccessDenied = text.includes('403') || text.includes('forbidden') || text.includes('access denied')
      
      if (!isAccessDenied) {
        console.error('Failed to fetch colleges:', err)
        setCollegesError('Failed to load colleges')
      }
      // Always reset colleges and pagination on error
      if (page === 1) {
        setColleges([])
      }
      setHasMoreColleges(false)
    } finally {
      setCollegesLoading(false)
    }
  }

  const fetchUser = async () => {
    setLoading(true)
    setError('')
    setIsGpaQuickEdit(false)
    setQuickGpaError('')
    try {
      const data = await get(`/api/v1/account-management/get-user/${id}`)
      setUser({
        uid: data.user_id || data.uid || '',
        email: data.email || '',
        firstName: data.first_name || data.firstName || '',
        lastName: data.last_name || data.lastName || '',
        dob: data.date_of_birth || data.dob || '',
        gender: data.gender || 'MALE',
        roleName: data.role?.name || data.role?.role_name || data.role_name || data.roleName || '',
        collegeId: data.university?.cid || data.college_id || data.collegeId || '',
        collegeName: data.university?.college_name || data.college_name || data.collegeName || '',
        collegeCampus: data.university?.campus || data.college_campus || data.collegeCampus || data.campus || '',
        gpa: data.university?.gpa || data.gpa || '',
        universityUid: data.university?.uid || '',
        tid: data.university?.tid || data.tid || '',
        cid: data.university?.cid || data.cid || '',
        createdBy: data.created_by || data.createdBy || '',
        createdAt: data.created_at || data.createdAt || '',
        updatedBy: data.updated_by || data.updatedBy || '',
        updatedAt: data.updated_at || data.updatedAt || ''
      })
    } catch (err) {
      console.error('Failed to load user:', err)
      setError(err.message || 'Failed to load user')
    } finally {
      setLoading(false)
    }
  }

  const validateForm = () => {
    const errors = {}

    if (!user.email.trim()) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email.trim())) {
      errors.email = 'Invalid email format'
    }

    if (!user.firstName.trim()) {
      errors.firstName = 'First name is required'
    } else if (!/^[\p{L}]+$/u.test(user.firstName.trim())) {
      errors.firstName = 'First name must contain only letters'
    }

    if (!user.lastName.trim()) {
      errors.lastName = 'Last name is required'
    } else if (!/^[\p{L}]+$/u.test(user.lastName.trim())) {
      errors.lastName = 'Last name must contain only letters'
    }

    if (!user.dob) {
      errors.dob = 'Date of birth is required'
    } else {
      const dob = new Date(user.dob)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (isNaN(dob.getTime())) {
        errors.dob = 'Invalid date format'
      } else if (dob >= today) {
        errors.dob = 'Date of birth must be in the past'
      }
    }

    if (!user.gender) {
      errors.gender = 'Gender is required'
    }

    // Role validation only for new users (can't be changed during edit)
    if (isNewUser) {
      if (!user.roleName) {
        errors.roleName = 'Role is required'
      }
    }

    // Conditional validation based on role
    if (user.roleName && user.roleName !== 'ROLE_SYSTEM_ADMIN') {
      if (!user.collegeId) {
        errors.collegeId = 'College is required'
      }
    }

    // GPA validation only for new student users (existing users update GPA via pen action)
    if (user.roleName === 'ROLE_STUDENT' && isNewUser) {
      if (!user.gpa) {
        errors.gpa = 'GPA is required'
      } else {
        const gpa = parseFloat(user.gpa)
        if (isNaN(gpa) || gpa < 0.0 || gpa > 4.0) {
          errors.gpa = 'GPA must be between 0.0 and 4.0'
        }
      }
    }

    return errors
  }

  const handleSave = async () => {
    const errors = validateForm()
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }

    setValidationErrors({})
    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      if (isNewUser) {
        // Create payload includes role and gpa
        const payload = {
          email: user.email.trim(),
          first_name: user.firstName.trim(),
          last_name: user.lastName.trim(),
          date_of_birth: user.dob,
          gender: user.gender,
          role_name: user.roleName
        }

        // Add optional fields based on role
        if (user.roleName !== 'ROLE_SYSTEM_ADMIN') {
          payload.college_id = user.collegeId
        }

        if (user.roleName === 'ROLE_STUDENT') {
          payload.gpa = parseFloat(user.gpa)
        }

        await post('/api/v1/account-management/create', payload)
        setSuccess('User created successfully!')
        setTimeout(() => {
          navigate('/university-admin')
        }, 1500)
      } else {
        // Update payload - no role changes allowed
        const payload = {
          email: user.email.trim(),
          first_name: user.firstName.trim(),
          last_name: user.lastName.trim(),
          date_of_birth: user.dob,
          gender: user.gender
        }

        // Add college_id for non-system-admin roles
        if (user.roleName !== 'ROLE_SYSTEM_ADMIN') {
          payload.college_id = user.collegeId
        }

        await put(`/api/v1/account-management/update-user/${user.uid}`, payload)
        setSuccess('User updated successfully!')
        setIsEditing(false)
        setTimeout(() => {
          fetchUser()
        }, 1500)
      }
    } catch (err) {
      const errorText = String(err.message || '').toLowerCase()
      const isAccessDenied = errorText.includes('403') || errorText.includes('forbidden') || errorText.includes('access denied')
      const message = isAccessDenied || !err.message
        ? 'Access denied. Please renew or set a new subscription plan to use this feature.'
        : extractErrorMessage(err.message)
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleQuickGpaUpdate = async () => {
    if (user.roleName !== 'ROLE_STUDENT' || !user.uid) return

    const parsedGpa = parseFloat(quickGpaValue)
    if (!quickGpaValue || isNaN(parsedGpa) || parsedGpa < 0.0 || parsedGpa > 4.0) {
      setQuickGpaError('GPA must be between 0.0 and 4.0')
      return
    }

    setQuickGpaError('')
    setQuickGpaSaving(true)
    setError('')
    setSuccess('')

    try {
      await patch(`/api/v1/account-management/update-user-gpa/${user.uid}`, parsedGpa)
      setSuccess('GPA updated successfully!')
      setIsGpaQuickEdit(false)
      setUser((prev) => ({ ...prev, gpa: String(parsedGpa) }))
      setTimeout(() => {
        fetchUser()
      }, 1200)
    } catch (err) {
      setQuickGpaError(err.message || 'Failed to update GPA')
    } finally {
      setQuickGpaSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    setError('')
    try {
      await deleteRequest(`/api/v1/account-management/delete/${user.uid}`)
      navigate(ROUTES.UNIVERSITY_ADMIN_USERS, { state: { successMessage: `User "${user.first_name || user.email}" was deleted successfully.` } })
    } catch (err) {
      setError(err.message || 'Failed to delete user')
      setShowDeleteModal(false)
    } finally {
      setDeleting(false)
    }
  }

  const handleCollegeScroll = (e) => {
    if (!collegeScrollRef.current) return

    const scrollDiv = collegeScrollRef.current
    if (scrollDiv.scrollTop + scrollDiv.clientHeight >= scrollDiv.scrollHeight - 20) {
      if (!collegesLoading && colleges.length > 0 && hasMoreColleges) {
        setCollegePage((prev) => prev + 1)
      }
    }
  }

  // Loading state
  if (rolesLoading || (loading && !isNewUser)) {
    return (
      <div style={{ backgroundColor: '#F4F6F8', minHeight: '100vh' }}>
        <header className="navbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 60px', borderBottom: '1px solid #e0e0e0' }}>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            <button
              onClick={() => navigate(ROUTES.UNIVERSITY_ADMIN)}
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
          <div style={{ flex: 1 }} />
        </header>

        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 84px)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'inline-block', width: '44px', height: '44px', border: '3px solid #E5E7EB', borderTop: '3px solid #3a4a52', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ marginTop: '16px', color: '#6B7280', fontSize: '14px', fontWeight: '500' }}>Loading...</p>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // Error state
  if (error && !isNewUser) {
    return (
      <div style={{ backgroundColor: '#F4F6F8', minHeight: '100vh' }}>
        <header className="navbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 60px', borderBottom: '1px solid #e0e0e0' }}>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            <button
              onClick={() => navigate(ROUTES.UNIVERSITY_ADMIN)}
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
          <div style={{ flex: 1 }} />
        </header>

        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 84px)' }}>
          <div style={{ padding: '40px', backgroundColor: 'white', borderRadius: '16px', maxWidth: '600px', textAlign: 'center', border: '1px solid #FECACA', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
            <div style={{ width: '48px', height: '48px', backgroundColor: '#FEE2E2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600', color: '#111827' }}>User not found</h3>
            <p style={{ margin: '0 0 24px 0', color: '#6B7280', fontSize: '14px' }}>{error}</p>
            <button onClick={() => navigate(-1)} style={{ padding: '10px 28px', backgroundColor: '#9DD957', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#85c84a'} onMouseLeave={(e) => e.target.style.backgroundColor = '#9DD957'}>Go Back</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: '#f8fafb', minHeight: '100vh' }}>
      <header className="navbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 60px', borderBottom: '1px solid #e5e7eb', backgroundColor: 'white' }}>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <button
            onClick={() => navigate(ROUTES.UNIVERSITY_ADMIN)}
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
        <div style={{ flex: 1 }} />
      </header>

      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '60px 40px 100px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '34px', gap: '16px', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              width: '36px', height: '36px', backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '10px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', flexShrink: 0, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#9DD957'; e.currentTarget.style.color = '#9DD957'; e.currentTarget.style.backgroundColor = '#F8FAFB'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(157, 217, 87, 0.15)' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.color = '#6B7280'; e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '800', color: '#111827', letterSpacing: '-0.5px' }}>
              {isNewUser ? 'Add New User' : 'User Details'}
            </h1>
            {!isNewUser && user.uid && (
              <div style={{ fontSize: '13px', fontFamily: 'monospace', color: '#6B7280', marginTop: '6px', fontWeight: '600' }}>
                # {user.uid}
              </div>
            )}
          </div>

          {!isNewUser && !loading && (
            <div style={{ display: 'flex', gap: '12px' }}>
              {!isEditing ? (
                <>
                  <button
                    onClick={() => {
                      setIsEditing(true)
                      setIsGpaQuickEdit(false)
                      setQuickGpaError('')
                    }}
                    style={{
                      padding: '10px 24px',
                      backgroundColor: '#9DD957',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#000',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 2px 8px rgba(157, 217, 87, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#8BC749'
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(157, 217, 87, 0.4)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#9DD957'
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(157, 217, 87, 0.3)'
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    style={{
                      padding: '10px 24px',
                      backgroundColor: '#FEF2F2',
                      border: '1px solid #FECACA',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#991B1B',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#FEE2E2'
                      e.currentTarget.style.borderColor = '#FCA5A5'
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(153, 27, 27, 0.12)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#FEF2F2'
                      e.currentTarget.style.borderColor = '#FECACA'
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'
                    }}
                  >
                    Delete
                  </button>
                </>
              ) : null}
            </div>
          )}
        </div>

        {error && (
          <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #EF4444', color: '#991B1B', padding: '16px 20px', borderRadius: '10px', marginBottom: '24px', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: '1px' }}>
              <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={{ backgroundColor: '#D1FAE5', border: '1px solid #10B981', color: '#065F46', padding: '16px 20px', borderRadius: '10px', marginBottom: '24px', fontSize: '14px', fontWeight: '500' }}>
            {success}
          </div>
        )}

        <SectionCard title="User Information">
          {!isNewUser && !isEditing ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px 48px' }}>
              <div>
                <div style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Email</div>
                <div style={{ fontSize: '16px', color: '#111827', fontWeight: '600', wordBreak: 'break-word' }}>{user.email || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em' }}>First Name</div>
                <div style={{ fontSize: '16px', color: '#111827', fontWeight: '600', wordBreak: 'break-word' }}>{user.firstName || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Last Name</div>
                <div style={{ fontSize: '16px', color: '#111827', fontWeight: '600', wordBreak: 'break-word' }}>{user.lastName || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Date of Birth</div>
                <div style={{ fontSize: '16px', color: '#111827', fontWeight: '600', wordBreak: 'break-word' }}>
                  {user.dob ? new Date(user.dob).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Gender</div>
                <div style={{ fontSize: '16px', color: '#111827', fontWeight: '600', wordBreak: 'break-word', textTransform: 'capitalize' }}>
                  {user.gender ? user.gender.toLowerCase() : '—'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Role</div>
                <div style={{ fontSize: '16px', color: '#111827', fontWeight: '600', wordBreak: 'break-word', textTransform: 'capitalize' }}>
                  {user.roleName ? user.roleName.replace('ROLE_', '').replace(/_/g, ' ').toLowerCase() : '—'}
                </div>
              </div>
              {user.roleName && user.roleName !== 'ROLE_SYSTEM_ADMIN' && (
                <>
                  <div>
                    <div style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em' }}>College</div>
                    <div style={{ fontSize: '16px', color: '#111827', fontWeight: '600', wordBreak: 'break-word' }}>
                      {collegeDetails ? `${collegeDetails.college_name} - ${collegeDetails.campus}` : (user.collegeName ? `${user.collegeName}${user.collegeCampus ? ` - ${user.collegeCampus}` : ''}` : '—')}
                    </div>
                  </div>
                  {user.roleName === 'ROLE_STUDENT' && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        <div style={{ fontSize: '13px', color: '#9CA3AF', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em' }}>GPA</div>
                        <button
                          type="button"
                          onClick={() => {
                            if (!isGpaQuickEdit) {
                              setIsGpaQuickEdit(true)
                              setQuickGpaError('')
                              setQuickGpaValue(String(user.gpa || ''))
                            }
                          }}
                          disabled={isGpaQuickEdit || quickGpaSaving}
                          title="Edit GPA"
                          style={{
                            width: '28px',
                            height: '28px',
                            border: 'none',
                            borderRadius: 0,
                            backgroundColor: 'transparent',
                            cursor: isGpaQuickEdit || quickGpaSaving ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                            opacity: isGpaQuickEdit || quickGpaSaving ? 0.6 : 1
                          }}
                        >
                          <img src="/pen.png" alt="Edit GPA" style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
                        </button>
                      </div>
                      {isGpaQuickEdit ? (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={handleQuickGpaUpdate}
                              disabled={quickGpaSaving}
                              title="Save GPA"
                              style={{
                                width: '32px',
                                height: '32px',
                                border: '1px solid #BBF7D0',
                                borderRadius: '8px',
                                backgroundColor: '#F0FDF4',
                                color: '#166534',
                                cursor: quickGpaSaving ? 'not-allowed' : 'pointer',
                                fontSize: '14px',
                                opacity: quickGpaSaving ? 0.6 : 1
                              }}
                            >
                              ✓
                            </button>
                            <input
                              type="number"
                              value={quickGpaValue}
                              onChange={(e) => setQuickGpaValue(e.target.value)}
                              placeholder="0.0 - 4.0"
                              step="0.01"
                              min="0"
                              max="4"
                              disabled={quickGpaSaving}
                              style={{
                                flex: 1,
                                width: '100%',
                                padding: '10px 12px',
                                minHeight: '40px',
                                fontSize: '14px',
                                border: quickGpaError ? '2px solid #EF4444' : '2px solid #e6e8f0',
                                borderRadius: '10px',
                                boxSizing: 'border-box',
                                backgroundColor: '#fff',
                                color: '#2b3740',
                                fontFamily: 'inherit',
                                outline: 'none'
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setIsGpaQuickEdit(false)
                                setQuickGpaError('')
                                setQuickGpaValue(String(user.gpa || ''))
                              }}
                              disabled={quickGpaSaving}
                              title="Cancel GPA edit"
                              style={{
                                width: '32px',
                                height: '32px',
                                border: '1px solid #E5E7EB',
                                borderRadius: '8px',
                                backgroundColor: '#fff',
                                color: '#374151',
                                cursor: quickGpaSaving ? 'not-allowed' : 'pointer',
                                fontSize: '14px',
                                opacity: quickGpaSaving ? 0.6 : 1
                              }}
                            >
                              ✕
                            </button>
                          </div>
                          {quickGpaError && (
                            <div style={{ fontSize: '12px', color: '#EF4444', marginTop: '6px', fontWeight: '500' }}>
                              {quickGpaError}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ fontSize: '16px', color: '#111827', fontWeight: '600', wordBreak: 'break-word' }}>{user.gpa || '—'}</div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px 48px', marginBottom: '24px' }}>
            <InputField
              label="Email"
              type="email"
              value={user.email}
              onChange={(e) => setUser({ ...user, email: e.target.value })}
              error={validationErrors.email}
              placeholder="e.g., john.doe@example.com"
              disabled={!isEditing}
              required
            />
            <InputField
              label="First Name"
              value={user.firstName}
              onChange={(e) => setUser({ ...user, firstName: e.target.value })}
              error={validationErrors.firstName}
              placeholder="e.g., John"
              disabled={!isEditing}
              required
            />
            <InputField
              label="Last Name"
              value={user.lastName}
              onChange={(e) => setUser({ ...user, lastName: e.target.value })}
              error={validationErrors.lastName}
              placeholder="e.g., Doe"
              disabled={!isEditing}
              required
            />
            <DateField
              label="Date of Birth"
              value={user.dob}
              onChange={(e) => setUser({ ...user, dob: e.target.value })}
              error={validationErrors.dob}
              disabled={!isEditing}
              required
            />
            <CustomSelectField
              label="Gender"
              value={user.gender}
              onChange={(e) => setUser({ ...user, gender: e.target.value })}
              options={[
                { value: 'MALE', label: 'Male', icon: '/male.png' },
                { value: 'FEMALE', label: 'Female', icon: '/female .png' },
                { value: 'OTHER', label: 'Other', icon: '/other.png' }
              ]}
              error={validationErrors.gender}
              disabled={!isEditing}
              required
              showDropdown={showGenderDropdown}
              setShowDropdown={setShowGenderDropdown}
              dropdownRef={genderDDRef}
            />
            <CustomSelectField
              label="Role"
              value={user.roleName}
              onChange={(e) => {
                setUser({ ...user, roleName: e.target.value, collegeId: '', collegeName: '', collegeCampus: '', gpa: '' })
                setCollegePage(1)
                setHasMoreColleges(true)
                setColleges([])
              }}
              options={roles.map((r) => ({ value: r.name, label: r.name.replace('ROLE_', '').replace(/_/g, ' ') }))}
              error={validationErrors.roleName}
              disabled={!isNewUser}
              required
              showDropdown={showRoleDropdown}
              setShowDropdown={setShowRoleDropdown}
              dropdownRef={roleDDRef}
            />

            {/* Conditionally show college field for non-system-admin roles */}
            {user.roleName && user.roleName !== 'ROLE_SYSTEM_ADMIN' && (
              <div style={{ position: 'relative' }} ref={collegeDDRef}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  College *
                </label>
                <button
                  type="button"
                  onClick={(e) => {
                    if (!isEditing) return
                    e.stopPropagation()
                    setShowCollegeDropdown((prev) => {
                      if (prev) setHoveredCollegeId(null)
                      if (!prev && colleges.length === 0 && collegePage !== 1) {
                        setCollegePage(1)
                      }
                      return !prev
                    })
                  }}
                  disabled={!isEditing}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    minHeight: '48px',
                    fontSize: '14px',
                    border: validationErrors.collegeId ? '2px solid #EF4444' : '2px solid #e6e8f0',
                    borderRadius: '10px',
                    boxSizing: 'border-box',
                    backgroundColor: (!isEditing || showCollegeDropdown) ? '#f9fafb' : '#f9fafb',
                    color: user.collegeId ? '#2b3740' : '#9CA3AF',
                    fontFamily: 'inherit',
                    cursor: isEditing ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s ease',
                    textAlign: 'left',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: validationErrors.collegeId ? '0 0 0 4px rgba(239, 68, 68, 0.12)' : showCollegeDropdown ? '0 0 0 4px rgba(0, 0, 0, 0.08)' : 'none',
                    outline: 'none',
                    opacity: !isEditing ? 0.6 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (isEditing && !validationErrors.collegeId && !showCollegeDropdown) {
                      e.currentTarget.style.borderColor = '#d1d9e8'
                      e.currentTarget.style.backgroundColor = '#fff'
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isEditing && !validationErrors.collegeId && !showCollegeDropdown) {
                      e.currentTarget.style.borderColor = '#e6e8f0'
                      e.currentTarget.style.backgroundColor = '#f9fafb'
                      e.currentTarget.style.boxShadow = 'none'
                    }
                  }}
                  onFocus={(e) => {
                    if (isEditing && !validationErrors.collegeId) {
                      e.currentTarget.style.borderColor = '#000'
                      e.currentTarget.style.backgroundColor = '#fff'
                      e.currentTarget.style.boxShadow = '0 0 0 4px rgba(0, 0, 0, 0.08)'
                    }
                  }}
                  onBlur={(e) => {
                    if (isEditing && !validationErrors.collegeId && !showCollegeDropdown) {
                      e.currentTarget.style.borderColor = '#e6e8f0'
                      e.currentTarget.style.backgroundColor = '#f9fafb'
                      e.currentTarget.style.boxShadow = 'none'
                    }
                  }}
                >
                  <span>{user.collegeName ? `${user.collegeName} - ${user.collegeCampus || ''}` : 'Select College'}</span>
                  <span style={{ fontSize: '12px', transition: 'transform 0.3s ease', transform: showCollegeDropdown ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                </button>

                {showCollegeDropdown && isEditing && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: 'calc(100% + 4px)',
                      background: 'white',
                      border: '1px solid #E5E7EB',
                      borderRadius: 10,
                      boxShadow: '0 6px 20px rgba(15,23,42,0.08)',
                      maxHeight: 180,
                      overflowY: 'auto',
                      overflowX: 'hidden',
                      overscrollBehavior: 'contain',
                      WebkitOverflowScrolling: 'touch',
                      zIndex: 40
                    }}
                    ref={collegeScrollRef}
                    onScroll={handleCollegeScroll}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {collegesLoading && collegePage === 1 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#6B7280', fontSize: '13px' }}>
                        Loading colleges...
                      </div>
                    ) : colleges.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#92400E', fontSize: '13px', backgroundColor: '#FEF3C7' }}>
                        ⚠️ No colleges available
                      </div>
                    ) : (
                      <>
                        {colleges.map((college, idx) => (
                          <div
                            key={college.college_id}
                            style={{
                              width: '100%',
                              boxSizing: 'border-box',
                              padding: '8px 10px',
                              borderBottom: '1px solid #F3F4F6',
                              cursor: 'pointer',
                              display: 'flex',
                              gap: 10,
                              alignItems: 'center',
                              transition: 'background 0.12s',
                              backgroundColor: getCollegeKey(user.collegeId) === getCollegeKey(college.college_id) ? '#9DD957' : 'transparent',
                              fontSize: 13,
                              color: getCollegeKey(user.collegeId) === getCollegeKey(college.college_id) ? '#000' : '#374151'
                            }}
                            onClick={() => {
                              setUser({ ...user, collegeId: getCollegeKey(college.college_id), collegeName: college.college_name, collegeCampus: college.campus })
                              setShowCollegeDropdown(false)
                              setHoveredCollegeId(null)
                            }}
                            onMouseEnter={(e) => {
                              if (getCollegeKey(user.collegeId) !== getCollegeKey(college.college_id)) {
                                e.currentTarget.style.backgroundColor = 'rgba(157,217,87,0.12)'
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = getCollegeKey(user.collegeId) === getCollegeKey(college.college_id) ? '#9DD957' : 'transparent'
                            }}
                          >
                            <div style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#E8ECF0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#3a4a52', fontSize: 12, flexShrink: 0 }}>
                              {(college.college_name || '?').charAt(0).toUpperCase()}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, color: getCollegeKey(user.collegeId) === getCollegeKey(college.college_id) ? '#000' : '#111827', fontSize: 13 }}>
                                {college.college_name}
                              </div>
                              {college.campus && (
                                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>{college.campus}</div>
                              )}
                            </div>
                          </div>
                        ))}
                        {collegesLoading && collegePage > 1 && (
                          <div style={{ padding: '12px 16px', textAlign: 'center', color: '#6B7280', fontSize: '12px' }}>
                            Loading more...
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {validationErrors.collegeId && (
                  <div style={{ fontSize: '12px', color: '#EF4444', marginTop: '6px', fontWeight: '500' }}>
                    {validationErrors.collegeId}
                  </div>
                )}
              </div>
            )}

            {/* Conditionally show GPA field for students only */}
            {user.roleName === 'ROLE_STUDENT' && isNewUser && (
              <InputField
                label="GPA"
                type="number"
                value={user.gpa}
                onChange={(e) => setUser({ ...user, gpa: e.target.value })}
                error={validationErrors.gpa}
                placeholder="0.0 - 4.0"
                disabled={!isEditing}
                required
              />
            )}
          </div>
          )}
        </SectionCard>

        {/* University Metadata - Only for non-system-admin roles */}
        {!isNewUser && user.roleName && user.roleName !== 'ROLE_SYSTEM_ADMIN' && (user.tid || user.cid) && (
          <SectionCard title="University Metadata">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '18px 36px' }}>
              {user.tid && (
                <InfoItem label="TID" value={user.tid} />
              )}
              {user.cid && (
                <InfoItem label="CID" value={user.cid} />
              )}
            </div>
          </SectionCard>
        )}

        {/* General Metadata */}
        {!isNewUser && (
          <SectionCard title="Metadata">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '18px 36px' }}>
              {user.tid && user.roleName === 'ROLE_SYSTEM_ADMIN' && (
                <InfoItem label="TID" value={user.tid} />
              )}
              <InfoItem label="Created By" value={user.createdBy} />
              <InfoItem label="Created At" value={user.createdAt} />
              <InfoItem label="Updated By" value={user.updatedBy} />
              <InfoItem label="Updated At" value={user.updatedAt} />
            </div>
          </SectionCard>
        )}

        {(isNewUser || isEditing) && (
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={() => {
              if (isEditing && !isNewUser) {
                setIsEditing(false)
                setIsGpaQuickEdit(false)
                setQuickGpaError('')
                setValidationErrors({})
              } else {
                navigate(-1)
              }
            }}
            style={{
              padding: '12px 28px',
              backgroundColor: 'white',
              border: '1px solid #D1D5DB',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 1px 3px rgba(58,74,82,0.06)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F3F4F6'
              e.currentTarget.style.borderColor = '#9CA3AF'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(58,74,82,0.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white'
              e.currentTarget.style.borderColor = '#D1D5DB'
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(58,74,82,0.06)'
            }}
          >
            {isEditing && !isNewUser ? 'Cancel' : 'Back'}
          </button>
          <button
            onClick={handleSave}
            disabled={submitting}
            style={{
              padding: '12px 28px',
              backgroundColor: '#9DD957',
              border: 'none',
              borderRadius: '10px',
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '700',
              color: '#ffffff',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              opacity: submitting ? 0.7 : 1,
              boxShadow: '0 2px 4px rgba(157, 217, 87, 0.2)'
            }}
            onMouseEnter={(e) => {
              if (!submitting) {
                e.currentTarget.style.backgroundColor = '#85c84a'
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(157, 217, 87, 0.25)'
              }
            }}
            onMouseLeave={(e) => {
              if (!submitting) {
                e.currentTarget.style.backgroundColor = '#9DD957'
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(157, 217, 87, 0.2)'
              }
            }}
          >
            {submitting ? 'Saving...' : isNewUser ? 'Create User' : 'Save Changes'}
          </button>
        </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
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
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            width: '480px',
            maxWidth: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{ padding: '24px 24px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: '0 0 8px' }}>
                    Delete User
                  </h3>
                  <p style={{ fontSize: '14px', color: '#6B7280', margin: 0, lineHeight: '1.5' }}>
                    Are you sure you want to delete <strong>{user.email}</strong>? This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
            <div style={{ 
              padding: '16px 24px', 
              borderTop: '1px solid #E5E7EB',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px'
            }}>
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                  color: '#374151',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  opacity: deleting ? 0.5 : 1
                }}
                onMouseEnter={(e) => !deleting && (e.currentTarget.style.backgroundColor = '#F9FAFB')}
                onMouseLeave={(e) => !deleting && (e.currentTarget.style.backgroundColor = '#ffffff')}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #FECACA',
                  borderRadius: '8px',
                  backgroundColor: '#FEF2F2',
                  color: '#991B1B',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  opacity: deleting ? 0.7 : 1
                }}
                onMouseEnter={(e) => {
                  if (!deleting) {
                    e.currentTarget.style.backgroundColor = '#FEE2E2'
                    e.currentTarget.style.borderColor = '#FCA5A5'
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(153, 27, 27, 0.12)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!deleting) {
                    e.currentTarget.style.backgroundColor = '#FEF2F2'
                    e.currentTarget.style.borderColor = '#FECACA'
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'
                  }
                }}
              >
                {deleting ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        input:focus, select:focus {
          outline: none;
        }
      `}</style>
    </div>
  )
}

