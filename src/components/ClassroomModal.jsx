import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import './classroom.css'

export default function ClassroomModal({ onClose, onCreate }) {
  const [formData, setFormData] = useState({
    class_title: '',
    class_sub_title: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.class_title.trim()) {
      setError('Class title is required')
      return
    }

    if (!formData.class_sub_title.trim()) {
      setError('Class subtitle is required')
      return
    }

    try {
      setLoading(true)
      await onCreate({
        class_title: formData.class_title,
        class_sub_title: formData.class_sub_title,
      })
    } catch (err) {
      console.error('Error creating classroom:', err)
      setError(err.message || 'Failed to create classroom. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return createPortal(
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content classroom-modal">
        <div className="modal-header">
          <h2 className="modal-title">Create a new class</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          {error && <div className="form-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="class_title" className="form-label">
              Class title <span className="required">*</span>
            </label>
            <input
              type="text"
              id="class_title"
              name="class_title"
              placeholder="e.g., Biology 101, IS Security"
              maxLength="50"
              value={formData.class_title}
              onChange={handleChange}
              className="form-input"
              disabled={loading}
            />
            <small className="form-hint">e.g., Biology 101, IS Security, Data Structures</small>
          </div>

          <div className="form-group">
            <label htmlFor="class_sub_title" className="form-label">
              Class subtitle <span className="required">*</span>
            </label>
            <input
              type="text"
              id="class_sub_title"
              name="class_sub_title"
              placeholder="e.g., Period 1, Fall 2026, Section A"
              maxLength="60"
              value={formData.class_sub_title}
              onChange={handleChange}
              className="form-input"
              disabled={loading}
            />
            <small className="form-hint">e.g., Period 1, Fall 2026, Section A, Room 204</small>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
