import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { formPost, formPut } from '../utils/api'
import './announcement-modal.css'
import announcementIcon from '/announcement.png'
import bookIcon from '/book.png'
import assignmentIcon from '/assignment.png'

const normalizeUrls = (urls) => {
  if (!urls) return []
  return urls.map(u => typeof u === 'string' ? u : (u?.url || u?.file_url || u?.path || '')).filter(Boolean)
}

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function DateTimePicker({ value, onChange, error: fieldError, disabled = false }) {
  const calendarRef = useRef(null)
  const yearDropdownRef = useRef(null)
  const [showCalendar, setShowCalendar] = useState(false)
  const [showYearDropdown, setShowYearDropdown] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(() => value ? new Date(value) : new Date())
  const [isFocused, setIsFocused] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  // Parse value into date and time parts
  const selectedDate = value ? new Date(value) : null
  const timeValue = selectedDate
    ? `${String(selectedDate.getHours()).padStart(2, '0')}:${String(selectedDate.getMinutes()).padStart(2, '0')}`
    : '23:59'

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

  const getBorderColor = () => {
    if (fieldError) return '#EF4444'
    if (isFocused || showCalendar) return '#000'
    if (isHovered) return '#d1d9e8'
    return '#e6e8f0'
  }

  const daysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay()

  const generateCalendarDays = () => {
    const days = []
    const totalDays = daysInMonth(currentMonth)
    const firstDay = firstDayOfMonth(currentMonth)
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const prevMonthTotal = new Date(year, month, 0).getDate()
    for (let i = prevMonthTotal - firstDay + 1; i <= prevMonthTotal; i++) {
      days.push({ day: i, isCurrentMonth: false, isPrevMonth: true })
    }
    for (let i = 1; i <= totalDays; i++) {
      days.push({ day: i, isCurrentMonth: true })
    }
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, isCurrentMonth: false, isNextMonth: true })
    }
    return days
  }

  const buildIso = (year, month, day, time) => {
    const [h, m] = (time || '23:59').split(':')
    const d = new Date(year, month, day, parseInt(h), parseInt(m))
    return d.toISOString()
  }

  const handleDayClick = (dayObj) => {
    let year = currentMonth.getFullYear()
    let month = currentMonth.getMonth()
    let day = dayObj.day
    if (dayObj.isPrevMonth) { month--; if (month < 0) { month = 11; year-- } }
    if (dayObj.isNextMonth) { month++; if (month > 11) { month = 0; year++ } }
    setCurrentMonth(new Date(year, month))
    onChange(buildIso(year, month, day, timeValue))
    setShowCalendar(false)
  }

  const handleTimeChange = (e) => {
    if (!selectedDate) return
    const [h, m] = e.target.value.split(':')
    const d = new Date(selectedDate)
    d.setHours(parseInt(h), parseInt(m))
    onChange(d.toISOString())
  }

  const isSelectedDay = (dayObj) => {
    if (!selectedDate || !dayObj.isCurrentMonth) return false
    return selectedDate.getDate() === dayObj.day &&
      selectedDate.getMonth() === currentMonth.getMonth() &&
      selectedDate.getFullYear() === currentMonth.getFullYear()
  }

  const isToday = (dayObj) => {
    if (!dayObj.isCurrentMonth) return false
    const today = new Date()
    return today.getDate() === dayObj.day &&
      today.getMonth() === currentMonth.getMonth() &&
      today.getFullYear() === currentMonth.getFullYear()
  }

  const isPast = (dayObj) => {
    if (!dayObj.isCurrentMonth) return false
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayObj.day)
    return d < today
  }

  const displayValue = selectedDate
    ? `${String(selectedDate.getMonth() + 1).padStart(2, '0')}/${String(selectedDate.getDate()).padStart(2, '0')}/${selectedDate.getFullYear()}  ${timeValue}`
    : ''

  return (
    <div style={{ position: 'relative' }} ref={calendarRef}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          readOnly
          value={displayValue}
          placeholder="MM/DD/YYYY  HH:MM"
          disabled={disabled}
          onClick={() => !disabled && setShowCalendar(!showCalendar)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onMouseEnter={() => !disabled && setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            width: '100%',
            padding: '12px 50px 12px 16px',
            minHeight: '48px',
            fontSize: '14px',
            border: `2px solid ${getBorderColor()}`,
            borderRadius: '10px',
            boxSizing: 'border-box',
            backgroundColor: disabled ? '#F3F4F6' : (isFocused || isHovered || showCalendar ? '#fff' : '#f9fafb'),
            color: displayValue ? '#2b3740' : '#9CA3AF',
            fontFamily: 'inherit',
            transition: 'all 0.2s ease',
            boxShadow: fieldError ? '0 0 0 4px rgba(239,68,68,0.12)' : (isFocused || showCalendar ? '0 0 0 4px rgba(0,0,0,0.08)' : 'none'),
            outline: 'none',
            cursor: 'pointer',
          }}
        />
        <button
          type="button"
          onClick={() => !disabled && setShowCalendar(!showCalendar)}
          disabled={disabled}
          style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', width: '32px', height: '32px', border: 'none', background: 'transparent', cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
          aria-label="Open calendar"
        >
          <img src="/calendar.png" alt="Calendar" style={{ width: '24px', height: '24px', objectFit: 'contain', opacity: showCalendar ? 1 : 0.7, transition: 'opacity 0.2s' }} />
        </button>
      </div>

      {showCalendar && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 'calc(100% + 4px)', background: 'white', border: '1px solid #E5E7EB', borderRadius: 10, boxShadow: '0 6px 20px rgba(15,23,42,0.08)', zIndex: 9999, padding: '16px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '8px' }}>
            <button type="button" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#374151', padding: '4px 8px', borderRadius: '6px', transition: 'background 0.12s', flexShrink: 0 }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(157,217,87,0.12)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >‹</button>

            <div style={{ display: 'flex', gap: '8px', flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <span style={{ fontWeight: '600', fontSize: '14px', color: '#111827' }}>{monthNames[currentMonth.getMonth()]}</span>
              <div style={{ position: 'relative' }} ref={yearDropdownRef}>
                <button type="button" onClick={(e) => { e.stopPropagation(); setShowYearDropdown(!showYearDropdown) }}
                  style={{ padding: '6px 24px 6px 12px', fontSize: '13px', fontWeight: '600', color: '#111827', border: showYearDropdown ? '2px solid #000' : '2px solid #e6e8f0', borderRadius: '10px', backgroundColor: showYearDropdown ? '#fff' : '#f9fafb', cursor: 'pointer', outline: 'none', transition: 'all 0.2s ease', position: 'relative', minWidth: '80px' }}
                >
                  {currentMonth.getFullYear()}
                  <span style={{ position: 'absolute', right: '8px', top: '50%', transform: showYearDropdown ? 'translateY(-50%) rotate(180deg)' : 'translateY(-50%)', fontSize: '10px', transition: 'transform 0.3s ease' }}>▼</span>
                </button>
                {showYearDropdown && (
                  <div style={{ position: 'absolute', left: 0, right: 0, top: 'calc(100% + 4px)', background: 'white', border: '1px solid #E5E7EB', borderRadius: 10, boxShadow: '0 6px 20px rgba(15,23,42,0.08)', maxHeight: '200px', overflow: 'auto', zIndex: 50 }}>
                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map(year => (
                      <div key={year}
                        style={{ padding: '8px 12px', borderBottom: '1px solid #F3F4F6', cursor: 'pointer', fontSize: 13, fontWeight: currentMonth.getFullYear() === year ? '600' : '400', backgroundColor: currentMonth.getFullYear() === year ? '#9DD957' : 'transparent', color: currentMonth.getFullYear() === year ? '#000' : '#374151', transition: 'background 0.12s' }}
                        onClick={() => { setCurrentMonth(new Date(year, currentMonth.getMonth())); setShowYearDropdown(false) }}
                        onMouseEnter={(e) => { if (currentMonth.getFullYear() !== year) e.currentTarget.style.backgroundColor = 'rgba(157,217,87,0.12)' }}
                        onMouseLeave={(e) => { if (currentMonth.getFullYear() !== year) e.currentTarget.style.backgroundColor = 'transparent' }}
                      >{year}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button type="button" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#374151', padding: '4px 8px', borderRadius: '6px', transition: 'background 0.12s', flexShrink: 0 }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(157,217,87,0.12)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >›</button>
          </div>

          {/* Day names */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px' }}>
            {dayNames.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#6B7280', padding: '4px' }}>{d}</div>
            ))}
          </div>

          {/* Days */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {generateCalendarDays().map((dayObj, idx) => (
              <button key={idx} type="button"
                onClick={() => !isPast(dayObj) && handleDayClick(dayObj)}
                disabled={isPast(dayObj)}
                style={{
                  padding: '8px', border: 'none', borderRadius: '6px', fontSize: '13px',
                  fontWeight: isSelectedDay(dayObj) ? '600' : '400',
                  color: !dayObj.isCurrentMonth ? '#D1D5DB' : isPast(dayObj) ? '#D1D5DB' : isSelectedDay(dayObj) ? '#000' : isToday(dayObj) ? '#9DD957' : '#374151',
                  backgroundColor: isSelectedDay(dayObj) ? '#9DD957' : 'transparent',
                  cursor: isPast(dayObj) ? 'not-allowed' : 'pointer',
                  transition: 'background 0.12s', textAlign: 'center'
                }}
                onMouseEnter={(e) => { if (!isSelectedDay(dayObj) && !isPast(dayObj)) e.currentTarget.style.backgroundColor = 'rgba(157,217,87,0.12)' }}
                onMouseLeave={(e) => { if (!isSelectedDay(dayObj)) e.currentTarget.style.backgroundColor = 'transparent' }}
              >{dayObj.day}</button>
            ))}
          </div>

          {/* Time picker */}
          {selectedDate && (
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>Time:</span>
              <input
                type="time"
                value={timeValue}
                onChange={handleTimeChange}
                style={{ padding: '6px 10px', fontSize: '13px', border: '2px solid #e6e8f0', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', cursor: 'pointer', backgroundColor: '#f9fafb', color: '#2b3740' }}
              />
            </div>
          )}
        </div>
      )}

      {fieldError && (
        <div style={{ fontSize: '12px', color: '#EF4444', marginTop: '6px', fontWeight: '500' }}>{fieldError}</div>
      )}
    </div>
  )
}

export default function AnnouncementModal({ isOpen, onClose, classroomId, onSuccess, material = null, forceAssignment = false }) {
  const [materialType, setMaterialType] = useState(material?.material_type?.toLowerCase() || 'announcement')
  const [headline, setHeadline] = useState(material?.head_line || '')
  const [description, setDescription] = useState(material?.description || '')
  const [points, setPoints] = useState(material?.points || '')
  const [dueDate, setDueDate] = useState(material?.due_date ? new Date(material.due_date).toISOString() : '')
  const [files, setFiles] = useState([])
  const [uploadedFiles, setUploadedFiles] = useState(normalizeUrls(material?.material_urls))
  const [toDeleteFiles, setToDeleteFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const fileInputRef = useRef(null)

  // Sync state when modal opens with a different material
  useEffect(() => {
    if (isOpen) {
      setMaterialType(forceAssignment ? 'assignment' : (material?.material_type?.toLowerCase() || 'announcement'))
      setHeadline(material?.head_line || '')
      setDescription(material?.description || '')
      setPoints(material?.points || '')
      setDueDate(material?.due_date ? new Date(material.due_date).toISOString() : '')
      setFiles([])
      setUploadedFiles(normalizeUrls(material?.material_urls))
      setToDeleteFiles([])
      setError(null)
      setFieldErrors({})
    }
  }, [isOpen, material])

  const validateForm = () => {
    const errors = {}

    if (headline.trim().length === 0) {
      errors.headline = 'Headline is required'
    } else if (headline.trim().length < 3) {
      errors.headline = 'Headline must be at least 3 characters'
    } else if (headline.trim().length > 100) {
      errors.headline = 'Headline cannot exceed 100 characters'
    }

    if (description.trim().length === 0) {
      errors.description = 'Description is required'
    } else if (description.trim().length < 5) {
      errors.description = 'Description must be at least 5 characters'
    } else if (description.trim().length > 500) {
      errors.description = 'Description cannot exceed 500 characters'
    }

    if (materialType === 'assignment') {
      if (!points || points === '') {
        errors.points = 'Points are required for assignments'
      } else if (parseInt(points) < 1) {
        errors.points = 'Points must be at least 1'
      } else if (parseInt(points) > 100) {
        errors.points = 'Points cannot exceed 100'
      }
      if (!dueDate) {
        errors.dueDate = 'Due date is required for assignments'
      } else if (new Date(dueDate) < new Date()) {
        errors.dueDate = 'Due date must be in the present or future'
      }
    }

    return errors
  }

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files || [])
    setFiles([...files, ...selectedFiles])
  }

  const removeFile = (index, isUploaded = false) => {
    if (isUploaded) {
      const fileToDelete = uploadedFiles[index]
      setToDeleteFiles([...toDeleteFiles, fileToDelete])
      setUploadedFiles(uploadedFiles.filter((_, i) => i !== index))
    } else {
      setFiles(files.filter((_, i) => i !== index))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const errors = validateForm()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setError('Please fix the errors below')
      return
    }

    setLoading(true)
    setError(null)
    setFieldErrors({})

    try {
      const formData = new FormData()

      if (material) {
        // Edit mode
        const materialData = {
          head_line: headline,
          description: description,
        }
        const jsonBlob = new Blob([JSON.stringify(materialData)], { type: 'application/json' })
        formData.append('data', jsonBlob)

        // Add new files
        files.forEach((file) => {
          formData.append('files', file)
        })

        // Add files to delete — send as a single JSON array part
        if (toDeleteFiles.length > 0) {
          formData.append('ToDeleteFiles', new Blob([JSON.stringify(toDeleteFiles)], { type: 'application/json' }))
        }

        const materialId = material.mid || material.material_id || material.id || material.m_id
        await formPut(`classroom/api/v1/material/instructor/edit/${materialId}`, formData)
      } else {
        // Create mode
        if (materialType === 'assignment') {
          const assignmentData = {
            material: {
              head_line: headline,
              description: description,
            },
            points: parseInt(points),
            due_date: dueDate,
          }
          const jsonBlob = new Blob([JSON.stringify(assignmentData)], { type: 'application/json' })
          formData.append('data', jsonBlob)
        } else {
          const materialData = {
            head_line: headline,
            description: description,
          }
          const jsonBlob = new Blob([JSON.stringify(materialData)], { type: 'application/json' })
          formData.append('data', jsonBlob)
        }

        // Add files
        files.forEach((file) => {
          formData.append('files', file)
        })

        const endpoint = `classroom/api/v1/material/instructor/create-${materialType}/${classroomId}`
        await formPost(endpoint, formData)
      }

      onSuccess?.()
      handleClose()
    } catch (err) {
      console.error('Error creating/editing material:', err)
      setError(err.message || 'Failed to save material. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setHeadline('')
    setDescription('')
    setPoints('')
    setFiles([])
    setUploadedFiles([])
    setToDeleteFiles([])
    setError(null)
    setFieldErrors({})
    setMaterialType('announcement')
    onClose()
  }

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  if (!isOpen) return null

  return createPortal(
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content announcement-modal">
        <div className="modal-header">
          <h2 className="modal-title">{material ? 'Edit' : 'Create'} {materialType.charAt(0).toUpperCase() + materialType.slice(1)}</h2>
          <button className="modal-close-btn" onClick={handleClose} aria-label="Close">
            ×
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          {error && <div className="form-error">{error}</div>}

          {/* Material Type Selector - Only in Create Mode and not forced */}
          {!material && !forceAssignment && (
            <div className="form-group">
              <label className="form-label">
                Material Type <span className="required">*</span>
              </label>
              <div className="type-buttons">
                <button
                  type="button"
                  className={`type-btn ${materialType === 'announcement' ? 'active' : ''}`}
                  onClick={() => {
                    setMaterialType('announcement')
                    setFieldErrors({ ...fieldErrors, materialType: undefined })
                  }}
                >
                  <img src={announcementIcon} alt="Announcement" className="type-icon" />
                  <span>Announcement</span>
                </button>
                <button
                  type="button"
                  className={`type-btn ${materialType === 'material' ? 'active' : ''}`}
                  onClick={() => {
                    setMaterialType('material')
                    setFieldErrors({ ...fieldErrors, materialType: undefined })
                  }}
                >
                  <img src={bookIcon} alt="Material" className="type-icon" />
                  <span>Material</span>
                </button>
                <button
                  type="button"
                  className={`type-btn ${materialType === 'assignment' ? 'active' : ''}`}
                  onClick={() => {
                    setMaterialType('assignment')
                    setFieldErrors({ ...fieldErrors, materialType: undefined })
                  }}
                >
                  <img src={assignmentIcon} alt="Assignment" className="type-icon" />
                  <span>Assignment</span>
                </button>
              </div>
            </div>
          )}

          {/* Headline */}
          <div className="form-group">
            <label htmlFor="headline" className="form-label">
              Headline <span className="required">*</span>
            </label>
            <input
              id="headline"
              type="text"
              value={headline}
              onChange={(e) => {
                setHeadline(e.target.value)
                if (fieldErrors.headline) {
                  setFieldErrors({ ...fieldErrors, headline: undefined })
                }
              }}
              placeholder="e.g., Introduction to Biology"
              maxLength="100"
              className={`form-input ${fieldErrors.headline ? 'input-error' : ''}`}
              disabled={loading}
            />
            <div className="form-helper">
              <small className="form-hint">
                {headline.length}/100 characters
                {headline.length > 90 && ' - approaching limit'}
              </small>
              {fieldErrors.headline && <small className="field-error">{fieldErrors.headline}</small>}
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="description" className="form-label">
              Description <span className="required">*</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
                if (fieldErrors.description) {
                  setFieldErrors({ ...fieldErrors, description: undefined })
                }
              }}
              placeholder="Provide detailed description of the material"
              maxLength="500"
              rows="4"
              className={`form-textarea ${fieldErrors.description ? 'input-error' : ''}`}
              disabled={loading}
            />
            <div className="form-helper">
              <small className="form-hint">
                {description.length}/500 characters
                {description.length > 450 && ' - approaching limit'}
              </small>
              {fieldErrors.description && <small className="field-error">{fieldErrors.description}</small>}
            </div>
          </div>

          {/* Points - Only for Assignments */}
          {materialType === 'assignment' && (
            <>
              <div className="form-group">
                <label htmlFor="points" className="form-label">
                  Points <span className="required">*</span>
                </label>
                <input
                  id="points"
                  type="number"
                  value={points}
                  onChange={(e) => {
                    setPoints(e.target.value)
                    if (fieldErrors.points) setFieldErrors({ ...fieldErrors, points: undefined })
                  }}
                  placeholder="e.g., 50"
                  min="1"
                  max="100"
                  className={`form-input ${fieldErrors.points ? 'input-error' : ''}`}
                  disabled={loading}
                />
                <div className="form-helper">
                  <small className="form-hint">Maximum 100 points per assignment</small>
                  {fieldErrors.points && <small className="field-error">{fieldErrors.points}</small>}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Due Date <span className="required">*</span>
                </label>
                <DateTimePicker
                  value={dueDate}
                  onChange={(iso) => {
                    setDueDate(iso)
                    if (fieldErrors.dueDate) setFieldErrors({ ...fieldErrors, dueDate: undefined })
                  }}
                  error={fieldErrors.dueDate}
                  disabled={loading}
                />
              </div>
            </>
          )}

          {/* File Upload */}
          <div className="form-group">
            <label className="form-label">Attachments (Optional)</label>
            <div className="file-upload-area">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileChange}
                className="file-input"
                id="file-input"
                disabled={loading}
              />
              <label htmlFor="file-input" className="file-upload-label">
                <span className="upload-icon">📎</span>
                <span>Click to upload or drag and drop</span>
                <span className="upload-hint">PNG, JPG, PDF, DOC, DOCX, XLS, XLSX</span>
              </label>
            </div>

            {/* Uploaded Files Display */}
            {uploadedFiles.length > 0 && (
              <div className="files-list">
                <h4>Existing Files</h4>
                {uploadedFiles.map((fileUrl, index) => (
                  <div key={index} className="file-item existing-file">
                    <span className="file-icon">📎</span>
                    <span className="file-name">{decodeURIComponent(fileUrl.split('?')[0].split('/').pop())}</span>
                    <button
                      type="button"
                      className="file-remove-btn"
                      onClick={() => removeFile(index, true)}
                      aria-label="Remove file"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* New Files Display */}
            {files.length > 0 && (
              <div className="files-list">
                <h4>New Files</h4>
                {files.map((file, index) => (
                  <div key={index} className="file-item new-file">
                    <span className="file-icon">📎</span>
                    <span className="file-name">{file.name}</span>
                    <button
                      type="button"
                      className="file-remove-btn"
                      onClick={() => removeFile(index, false)}
                      aria-label="Remove file"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (material ? 'Saving...' : 'Creating...') : (material ? 'Save' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
