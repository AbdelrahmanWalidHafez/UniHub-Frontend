import React, { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { get, patch } from '../utils/api'
import './submissions-page.css'

const getFileName = (url) => {
  try { return decodeURIComponent(url.split('?')[0].split('/').pop().replace(/\+/g, ' ')) }
  catch { return url.split('/').pop() }
}
const getExt = (url) => (url || '').split('?')[0].split('.').pop().toUpperCase()
const fmtDate = (d) => {
  if (!d) return '—'
  try { return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
  catch { return '—' }
}

function BackBtn({ onClick }) {
  return (
    <button className="sp-back-btn" onClick={onClick} aria-label="Back">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

function PaginationBar({ page, totalPages, reachedEnd, onPage }) {
  if (totalPages <= 1 && reachedEnd) return null
  return (
    <div className="sp-pagination-controls">
      <button className="sp-pg-circle-btn" onClick={() => onPage(page - 1)} disabled={page === 1} title="Previous page">←</button>
      <span className="sp-pg-info">Page {page}{reachedEnd ? ` of ${totalPages}` : ''}</span>
      <button className="sp-pg-circle-btn" onClick={() => onPage(page + 1)} disabled={page === totalPages} title="Next page">→</button>
    </div>
  )
}

function GradeModal({ sid, currentGrade, maxPoints, onClose, onSaved }) {
  const [value, setValue] = useState(currentGrade > 0 ? String(currentGrade) : '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const max = maxPoints && maxPoints > 0 ? maxPoints : 100

  const handleSubmit = async (e) => {
    e.preventDefault()
    const num = parseInt(value, 10)
    if (!value || isNaN(num)) { setError('Please enter a grade.'); return }
    if (num < 1) { setError('Grade must be at least 1.'); return }
    if (num > max) { setError(`Grade cannot exceed ${max} (assignment points).`); return }

    setSaving(true)
    setError('')
    try {
      const res = await patch(`classroom/api/v1/submissions/instructor/set-grade/${sid}`, { grade: num })
      onSaved(res?.grade ?? num)
      onClose()
    } catch (e) {
      setError(e.message || 'Failed to save grade.')
    } finally {
      setSaving(false)
    }
  }

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return createPortal(
    <div className="sp-modal-overlay" onClick={onClose}>
      <div className="sp-modal" onClick={e => e.stopPropagation()}>
        <div className="sp-modal-header">
          <h3 className="sp-modal-title">Set grade</h3>
          <button className="sp-modal-close" onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <form className="sp-modal-body" onSubmit={handleSubmit} noValidate>
          <label className="sp-grade-label">
            Grade
            <span className="sp-grade-max">/ {max} pts</span>
          </label>
          <input
            className={`sp-grade-input${error ? ' sp-grade-input-error' : ''}`}
            type="number"
            step={1}
            value={value}
            onChange={e => { setValue(e.target.value); setError('') }}
            placeholder={`1 – ${max}`}
            autoFocus
            noValidate
          />
          {error && <p className="sp-grade-error">{error}</p>}
          <div className="sp-modal-footer">
            <button type="button" className="sp-modal-btn sp-modal-btn-cancel" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="sp-modal-btn sp-modal-btn-save" disabled={saving}>
              {saving ? 'Saving…' : 'Save grade'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

function SubmissionDetailPanel({ sid, currentGrade, maxPoints, onClose, onGraded }) {
  const [sub, setSub] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [grade, setGrade] = useState(currentGrade)
  const [showGradeModal, setShowGradeModal] = useState(false)

  useEffect(() => {
    setLoading(true)
    setSub(null)
    setError('')
    setGrade(currentGrade)
    get(`classroom/api/v1/submissions/instructor/get-submission/${sid}`)
      .then(res => { setSub(res); setGrade(res?.grade ?? currentGrade) })
      .catch(e => setError(e.message || 'Failed to load submission'))
      .finally(() => setLoading(false))
  }, [sid])

  const handleGradeSaved = (newGrade) => {
    setGrade(newGrade)
    onGraded(sid, newGrade)
  }

  return (
    <div className="sp-inline-detail">
      <div className="sp-inline-detail-header">
        <span className="sp-inline-detail-title">Submission detail</span>
        <button className="sp-inline-close-btn" onClick={onClose} aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {loading && <div className="sp-inline-loading">Loading…</div>}
      {error && <div className="sp-error" style={{ margin: '12px 20px' }}>{error}</div>}

      {sub && !loading && (
        <>
          <div className="sp-inline-meta-row">
            <div className="sp-detail-avatar sp-inline-avatar">
              {(sub.created_by || 'U')[0].toUpperCase()}
            </div>
            <div className="sp-inline-meta-text">
              <span className="sp-detail-email">{sub.created_by}</span>
              <span className="sp-inline-date">
                Submitted {fmtDate(sub.created_at)}
                {sub.edited && <span className="sp-edited-badge" style={{ marginLeft: 8 }}>Edited</span>}
              </span>
            </div>
            <div className="sp-inline-actions">
              <div className={`sp-grade-badge${grade === -1 ? ' sp-grade-ungraded' : ' sp-grade-graded'}`}>
                Grade: {grade === -1 ? 'Ungraded' : `${grade} / ${maxPoints || '—'}`}
              </div>
              <button
                className="sp-set-grade-btn"
                onClick={() => setShowGradeModal(true)}
              >
                {grade === -1 ? 'Grade' : 'Edit grade'}
              </button>
            </div>
          </div>

          <div className="sp-inline-files-section">
            <div className="sp-section-label">Submitted files</div>
            {(sub.submission_urls || []).length === 0
              ? <div className="sp-no-files">No files submitted</div>
              : (
                <div className="sp-inline-files-grid">
                  {(sub.submission_urls || []).map((url, i) => {
                    const name = getFileName(url)
                    const ext = getExt(url)
                    return (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="sp-file-row">
                        <div className="sp-file-icon">
                          <svg width="18" height="22" viewBox="0 0 20 24" fill="none">
                            <path d="M4 3h9l4 4v14a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1z" fill="#1a73e8" opacity="0.7"/>
                            <path d="M13 3v4h4" fill="none" stroke="#1a73e8" strokeWidth="1.5"/>
                          </svg>
                        </div>
                        <div className="sp-file-info">
                          <span className="sp-file-name">{name}</span>
                          <span className="sp-file-ext">{ext}</span>
                        </div>
                        <span className="sp-file-open">↗</span>
                      </a>
                    )
                  })}
                </div>
              )
            }
          </div>
        </>
      )}

      {showGradeModal && (
        <GradeModal
          sid={sid}
          currentGrade={grade}
          maxPoints={maxPoints}
          onClose={() => setShowGradeModal(false)}
          onSaved={handleGradeSaved}
        />
      )}
    </div>
  )
}

const PAGE_SIZE = 5

export default function SubmissionsPage({ materialId: materialIdProp, onBack, maxPoints: maxPointsProp }) {
  const params = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const materialId = materialIdProp || params.materialId
  const classroomName = location.state?.classroomName || 'Classroom'
  const materialTitle = location.state?.materialTitle || 'Assignment'
  // maxPoints can come from the parent or from location state (when navigated as a route)
  const maxPoints = maxPointsProp ?? location.state?.maxPoints ?? null
  const handleBack = onBack || (() => navigate(-1))

  const [aid, setAid] = useState(null)
  const [assignmentPoints, setAssignmentPoints] = useState(maxPoints)
  const [allSubmissions, setAllSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [reachedEnd, setReachedEnd] = useState(false)
  const [selectedSid, setSelectedSid] = useState(null)

  useEffect(() => {
    if (!materialId) return
    get(`classroom/api/v1/material/get-assignment/${materialId}`)
      .then(res => {
        setAid(res?.assignment_id || res?.aid || res?.id)
        // pick up points from the assignment lookup if not already known
        if (!assignmentPoints && res?.points) setAssignmentPoints(res.points)
      })
      .catch(e => { setError(e.message || 'Failed to load assignment'); setLoading(false) })
  }, [materialId])

  const fetchServerPage = useCallback(async (serverPage) => {
    if (!aid) return []
    const res = await get(`classroom/api/v1/submissions/instructor/get-all-submissions/${aid}?page_num=${serverPage}`)
    return res?.submissions || []
  }, [aid])

  useEffect(() => {
    if (!aid) return
    setLoading(true)
    fetchServerPage(1).then(list => {
      setAllSubmissions(list)
      setReachedEnd(list.length < PAGE_SIZE)
      setPage(1)
    }).catch(e => setError(e.message || 'Failed to load submissions'))
      .finally(() => setLoading(false))
  }, [aid, fetchServerPage])

  const goToPage = useCallback(async (p) => {
    const needed = p * PAGE_SIZE
    if (needed > allSubmissions.length && !reachedEnd) {
      setLoading(true)
      try {
        const serverPage = Math.ceil(needed / PAGE_SIZE)
        const list = await fetchServerPage(serverPage)
        setAllSubmissions(prev => [...prev, ...list.filter(s => !prev.find(x => x.sid === s.sid))])
        if (list.length < PAGE_SIZE) setReachedEnd(true)
      } catch (e) {
        setError(e.message || 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    setSelectedSid(null)
    setPage(p)
  }, [allSubmissions, reachedEnd, fetchServerPage])

  // Update grade in the table row without refetching
  const handleGraded = useCallback((sid, newGrade) => {
    setAllSubmissions(prev => prev.map(s => s.sid === sid ? { ...s, grade: newGrade } : s))
  }, [])

  const totalPages = reachedEnd
    ? Math.ceil(allSubmissions.length / PAGE_SIZE)
    : Math.ceil(allSubmissions.length / PAGE_SIZE) + (allSubmissions.length % PAGE_SIZE === 0 ? 1 : 0)

  const pageItems = allSubmissions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleRowClick = (sid) => setSelectedSid(prev => prev === sid ? null : sid)

  return (
    <div className="sp-page">
      <div className="sp-page-header">
        <BackBtn onClick={handleBack} />
        <div className="sp-page-title-block">
          <nav className="sp-breadcrumb">
            <span className="sp-breadcrumb-item">Classroom</span>
            <span className="sp-breadcrumb-sep">›</span>
            <span className="sp-breadcrumb-item">{classroomName}</span>
            <span className="sp-breadcrumb-sep">›</span>
            <span className="sp-breadcrumb-item">{materialTitle}</span>
            <span className="sp-breadcrumb-sep">›</span>
            <span className="sp-breadcrumb-item sp-breadcrumb-current">Student submissions</span>
          </nav>
          {!loading && (
            <span className="sp-total-badge">
              {allSubmissions.length}{!reachedEnd ? '+' : ''} student{allSubmissions.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {loading && <div className="sp-loading">Loading submissions…</div>}
      {error && <div className="sp-error">{error}</div>}

      {!loading && !error && allSubmissions.length === 0 && (
        <div className="sp-empty">No submissions yet.</div>
      )}

      {!loading && allSubmissions.length > 0 && (
        <>
          <div className="sp-table-wrap">
            <table className="sp-table">
              <thead>
                <tr>
                  <th className="sp-th sp-th-center">#</th>
                  <th className="sp-th">Student</th>
                  <th className="sp-th">Submitted</th>
                  <th className="sp-th sp-th-center">Files</th>
                  <th className="sp-th sp-th-center">Grade</th>
                  <th className="sp-th sp-th-center">Status</th>
                  <th className="sp-th"></th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((sub, idx) => {
                  const isSelected = selectedSid === sub.sid
                  return (
                    <React.Fragment key={sub.sid}>
                      <tr
                        className={`sp-tr${isSelected ? ' sp-tr-selected' : ''}`}
                        onClick={() => handleRowClick(sub.sid)}
                      >
                        <td className="sp-td sp-td-num">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                        <td className="sp-td sp-td-student">
                          <div className="sp-cell-student">
                            <div className="sp-row-avatar">{(sub.created_by || 'U')[0].toUpperCase()}</div>
                            <span className="sp-row-email">{sub.created_by}</span>
                          </div>
                        </td>
                        <td className="sp-td sp-td-date">{fmtDate(sub.created_at)}</td>
                        <td className="sp-td sp-td-center">
                          {(sub.submission_urls || []).length} file{(sub.submission_urls || []).length !== 1 ? 's' : ''}
                        </td>
                        <td className="sp-td sp-td-center">
                          <span className={`sp-row-grade${sub.grade === -1 ? ' ungraded' : ' graded'}`}>
                            {sub.grade === -1 ? 'U' : `${sub.grade} pts`}
                          </span>
                        </td>
                        <td className="sp-td sp-td-center">
                          {sub.edited
                            ? <span className="sp-edited-badge">Edited</span>
                            : <span className="sp-submitted-badge">Submitted</span>
                          }
                        </td>
                        <td className="sp-td sp-td-arrow">
                          <svg
                            width="16" height="16" viewBox="0 0 24 24" fill="none"
                            stroke={isSelected ? '#9DD957' : '#bdc1c6'} strokeWidth="2"
                            style={{ transform: isSelected ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s, stroke 0.2s' }}
                          >
                            <path d="M9 18l6-6-6-6"/>
                          </svg>
                        </td>
                      </tr>
                      {isSelected && (
                        <tr className="sp-detail-row">
                          <td colSpan={7} className="sp-detail-cell">
                            <SubmissionDetailPanel
                              sid={sub.sid}
                              currentGrade={sub.grade}
                              maxPoints={assignmentPoints}
                              onClose={() => setSelectedSid(null)}
                              onGraded={handleGraded}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="sp-table-footer">
            <span className="sp-table-showing">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, allSubmissions.length)}{!reachedEnd ? '+' : ` of ${allSubmissions.length}`}
            </span>
            <PaginationBar page={page} totalPages={totalPages} reachedEnd={reachedEnd} onPage={goToPage} />
          </div>
        </>
      )}
    </div>
  )
}
