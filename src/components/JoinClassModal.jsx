import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import './classroom.css'

export default function JoinClassModal({ onClose, onJoin }) {
  const [classCode, setClassCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    setClassCode(e.target.value)
    setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!classCode.trim()) {
      setError('Class code is required')
      return
    }

    try {
      setLoading(true)
      await onJoin(classCode)
    } catch (err) {
      console.error('Error joining classroom:', err)
      setError(err.message || 'Failed to join classroom. Please check the code and try again.')
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
          <h2 className="modal-title">Join a class</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          {error && <div className="form-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="classCode" className="form-label">
              Class code <span className="required">*</span>
            </label>
            <p className="form-description">Ask your teacher for the class code, then enter it here.</p>

            <input
              type="text"
              id="classCode"
              name="classCode"
              value={classCode}
              onChange={handleChange}
              placeholder="Class code"
              className="form-input"
              disabled={loading}
              autoFocus
              maxLength="50"
            />
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
              disabled={loading || !classCode.trim()}
            >
              {loading ? 'Joining...' : 'Join'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
