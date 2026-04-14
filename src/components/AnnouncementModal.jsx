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

export default function AnnouncementModal({ isOpen, onClose, classroomId, onSuccess, material = null, forceAssignment = false }) {
  const [materialType, setMaterialType] = useState(material?.material_type?.toLowerCase() || 'announcement')
  const [headline, setHeadline] = useState(material?.head_line || '')
  const [description, setDescription] = useState(material?.description || '')
  const [points, setPoints] = useState(material?.points || '')
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
      } else if (parseInt(points) <= 0) {
        errors.points = 'Points must be greater than 0'
      } else if (parseInt(points) > 1000) {
        errors.points = 'Points cannot exceed 1000'
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
            materialDto: {
              head_line: headline,
              description: description,
            },
            points: parseInt(points),
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
                  if (fieldErrors.points) {
                    setFieldErrors({ ...fieldErrors, points: undefined })
                  }
                }}
                placeholder="e.g., 50"
                min="1"
                max="1000"
                className={`form-input ${fieldErrors.points ? 'input-error' : ''}`}
                disabled={loading}
              />
              <div className="form-helper">
                <small className="form-hint">Maximum 1000 points per assignment</small>
                {fieldErrors.points && <small className="field-error">{fieldErrors.points}</small>}
              </div>
            </div>
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
