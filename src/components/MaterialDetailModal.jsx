import React, { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { get, post, put, deleteRequest } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import bookIcon from '/book.png'
import announcementIcon from '/announcement.png'
import assignmentIcon from '/assignment.png'
import './material-detail-modal.css'

const getExt = (url) => (url || '').split('?')[0].split('.').pop().toLowerCase()
const getFileName = (url) => {
  try { return decodeURIComponent(url.split('?')[0].split('/').pop()) } catch { return url.split('?')[0].split('/').pop() }
}
const isImage = (url) => ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(getExt(url))
const isPdf = (url) => getExt(url) === 'pdf'

function AttachmentGrid({ urls }) {
  if (!urls || urls.length === 0) return null
  return (
    <div className="mdm-attachments">
      {urls.map((url, i) => {
        const name = getFileName(url)
        if (isImage(url)) {
          return (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="mdm-attachment-image-wrap">
              <img src={url} alt={name} className="mdm-attachment-img" />
              <div className="mdm-attachment-label">
                <span className="mdm-attachment-name">{name}</span>
                <span className="mdm-attachment-type">Image</span>
              </div>
            </a>
          )
        }
        if (isPdf(url)) {
          return (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="mdm-attachment-file-wrap">
              <div className="mdm-attachment-file-icon">PDF</div>
              <div className="mdm-attachment-label">
                <span className="mdm-attachment-name">{name}</span>
                <span className="mdm-attachment-type">PDF</span>
              </div>
            </a>
          )
        }
        return (
          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="mdm-attachment-file-wrap">
            <div className="mdm-attachment-file-icon">📎</div>
            <div className="mdm-attachment-label">
              <span className="mdm-attachment-name">{name}</span>
              <span className="mdm-attachment-type">File</span>
            </div>
          </a>
        )
      })}
    </div>
  )
}

function CommentSection({ materialId, isInstructor, userEmail }) {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(false)
  const [draft, setDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editDraft, setEditDraft] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  const { user } = useAuth()
  const firstName = user?.first_name || user?.firstName || user?.name || user?.email || 'U'
  const initial = (firstName && firstName[0]?.toUpperCase()) || 'U'

  const fetchComments = useCallback(async (pageNum = 1) => {
    if (!materialId) return
    setLoading(true)
    try {
      const res = await get(`classroom/api/v1/comment/get-material-comments/${materialId}?page_num=${pageNum}`)
      const list = res?.comments || []
      setComments(prev => pageNum === 1 ? list : [...prev, ...list])
      setHasMore(list.length === 10)
      setPage(pageNum)
    } catch {
      setError('Failed to load comments')
    } finally {
      setLoading(false)
    }
  }, [materialId])

  useEffect(() => {
    fetchComments(1)
  }, [fetchComments])

  const handleSend = async () => {
    if (!draft.trim() || draft.trim().length < 2) return
    setSubmitting(true)
    setError('')
    try {
      const res = await post(`classroom/api/v1/comment/create-material/${materialId}`, { content: draft.trim() })
      setComments(prev => [res, ...prev])
      setDraft('')
    } catch (err) {
      setError(err.message || 'Failed to post comment')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (commentId) => {
    try {
      await deleteRequest(`classroom/api/v1/comment/delete/${commentId}`)
      setComments(prev => prev.filter(c => (c.id || c.comment_id) !== commentId))
    } catch (err) {
      setError(err.message || 'Failed to delete comment')
    }
  }

  const handleEdit = async (commentId) => {
    if (!editDraft.trim()) return
    try {
      const res = await put(`classroom/api/v1/comment/edit/${commentId}`, { content: editDraft.trim() })
      setComments(prev => prev.map(c => (c.id || c.comment_id) === commentId ? { ...c, ...res, content: editDraft.trim() } : c))
      setEditingId(null)
      setEditDraft('')
    } catch (err) {
      setError(err.message || 'Failed to edit comment')
    }
  }

  const isOwner = (comment) => {
    const commentEmail = comment.created_by || comment.createdBy || comment.email || ''
    return commentEmail === userEmail
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    try { return new Date(dateStr).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }
    catch { return '' }
  }

  return (
    <div className="mdm-comments">
      <div className="mdm-comments-title">
        <img src="/comment.png" alt="Comments" className="mdm-comments-icon" onError={e => e.target.style.display = 'none'} />
        Class comments
      </div>

      {/* Input */}
      <div className="mdm-comment-input-row">
        <div className="mdm-avatar">{initial}</div>
        <input
          type="text"
          value={draft}
          onChange={e => { setDraft(e.target.value); if (error) setError('') }}
          placeholder="Add class comment..."
          className="mdm-comment-input"
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          disabled={submitting}
        />
        <button
          className="mdm-comment-send"
          onClick={handleSend}
          disabled={submitting || draft.trim().length < 2}
        >
          {submitting ? '...' : '➤'}
        </button>
      </div>

      {error && <div className="mdm-error">{error}</div>}

      <hr className="mdm-divider" />

      {/* Comments list */}
      {loading && comments.length === 0 ? (
        <div className="mdm-loading">Loading…</div>
      ) : comments.length === 0 ? (
        <div className="mdm-no-comments">No comments yet. Be the first!</div>
      ) : (
        <ul className="mdm-comment-list">
          {comments.map((c, i) => {
            const commentId = c.id || c.comment_id
            const author = c.created_by || c.createdBy || c.email || 'User'
            const avatarLetter = author.charAt(0).toUpperCase()
            const isEdited = c.is_edited || c.isEdited || (c.updated_at && c.created_at && c.updated_at !== c.created_at)
            return (
              <li key={commentId || i} className="mdm-comment-item">
                <div className="mdm-avatar">{avatarLetter}</div>
                <div className="mdm-comment-body">
                  <div className="mdm-comment-meta">
                    <span className="mdm-comment-author">{author}</span>
                    <span className="mdm-comment-date">
                      {formatDate(c.created_at || c.createdAt)}
                      {isEdited ? ' • edited' : ''}
                    </span>
                  </div>
                  {editingId === commentId ? (
                    <div className="mdm-edit-block">
                      <input
                        type="text"
                        value={editDraft}
                        onChange={e => setEditDraft(e.target.value)}
                        className="mdm-edit-input"
                        onKeyDown={e => { if (e.key === 'Enter') handleEdit(commentId) }}
                      />
                      <div className="mdm-edit-actions">
                        <button type="button" className="mdm-edit-cancel" onClick={() => { setEditingId(null); setEditDraft('') }}>Cancel</button>
                        <button type="button" className="mdm-edit-save" onClick={() => handleEdit(commentId)}>Save</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mdm-comment-content">{c.content}</div>
                      {(isOwner(c) || isInstructor) && (
                        <div className="mdm-comment-actions">
                          {isOwner(c) && (
                            <button type="button" className="mdm-action-edit" onClick={() => { setEditingId(commentId); setEditDraft(c.content) }}>Edit</button>
                          )}
                          <button type="button" className="mdm-action-delete" onClick={() => handleDelete(commentId)}>Delete</button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {hasMore && (
        <div className="mdm-load-more">
          <button type="button" onClick={() => fetchComments(page + 1)} disabled={loading}>
            {loading ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function MaterialDetailModal({ isOpen, onClose, materialId, isInstructor, onEdit, onDelete }) {
  const { user } = useAuth()
  const userEmail = user?.email || ''

  const [material, setMaterial] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showMenu, setShowMenu] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const fetchMaterial = useCallback(async () => {
    if (!materialId) return
    setLoading(true)
    setError(null)
    try {
      const res = await get(`classroom/api/v1/material/get-material/${materialId}`)
      setMaterial(res)
    } catch (err) {
      setError(err.message || 'Failed to load material')
    } finally {
      setLoading(false)
    }
  }, [materialId])

  useEffect(() => {
    if (isOpen && materialId) {
      setMaterial(null)
      setShowMenu(false)
      fetchMaterial()
    }
  }, [isOpen, materialId, fetchMaterial])

  if (!isOpen) return null

  const type = (material?.material_type || '').toLowerCase()
  const typeIcon = type === 'material' ? bookIcon : type === 'assignment' ? assignmentIcon : announcementIcon
  const typeLabel = type ? type.charAt(0).toUpperCase() + type.slice(1) : ''

  const urls = (material?.material_urls || []).map(u =>
    typeof u === 'string' ? u : (u?.url || u?.file_url || u?.path || '')
  ).filter(Boolean)

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    } catch { return '' }
  }

  const isEdited = material?.updated_at && material?.created_at &&
    new Date(material.updated_at).getTime() !== new Date(material.created_at).getTime()

  const handleDelete = () => {
    setShowDeleteConfirm(false)
    onClose()
    onDelete(materialId)
  }

  return createPortal(
    <div className="mdm-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="mdm-panel">
        {/* Header */}
        <div className="mdm-header">
          <div className="mdm-header-left">
            <div className="mdm-type-icon-wrap">
              <img src={typeIcon} alt={typeLabel} className="mdm-type-icon" />
            </div>
            <div>
              <div className="mdm-headline">{loading ? 'Loading...' : (material?.head_line || '')}</div>
              <div className="mdm-meta">
                {material?.created_by && <span>{material.created_by}</span>}
                {material?.created_at && <span> • {formatDate(material.created_at)}</span>}
                {isEdited && <span> (Edited {formatDate(material.updated_at)})</span>}
              </div>
            </div>
          </div>
          <div className="mdm-header-right">
            {isInstructor && !loading && material && (
              <div className="mdm-menu-wrap">
                <button className="mdm-menu-btn" onClick={() => setShowMenu(s => !s)} aria-label="Options">⋮</button>
                {showMenu && (
                  <div className="mdm-menu-dropdown">
                    <button className="mdm-menu-item" onClick={() => { setShowMenu(false); onEdit(material) }}>
                      <span>✎</span> Edit
                    </button>
                    <button className="mdm-menu-item mdm-menu-delete" onClick={() => { setShowMenu(false); setShowDeleteConfirm(true) }}>
                      <img src="/delete.png" alt="Delete" style={{ width: 16, height: 16 }} /> Delete
                    </button>
                  </div>
                )}
              </div>
            )}
            <button className="mdm-close-btn" onClick={onClose} aria-label="Close">×</button>
          </div>
        </div>

        <hr className="mdm-divider" />

        {/* Body */}
        <div className="mdm-body">
          {loading && <div className="mdm-loading">Loading...</div>}
          {error && <div className="mdm-error">{error}</div>}

          {material && !loading && (
            <>
              {/* Attachments */}
              {urls.length > 0 && <AttachmentGrid urls={urls} />}

              {/* Description */}
              <p className="mdm-description">{material.description}</p>

              {/* Comments */}
              <CommentSection
                materialId={materialId}
                isInstructor={isInstructor}
                userEmail={userEmail}
              />
            </>
          )}
        </div>
      </div>

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div className="delete-confirm-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="delete-confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="delete-confirm-icon">
              <img src="/delete.png" alt="Delete" />
            </div>
            <h3 className="delete-confirm-title">Delete Material</h3>
            <p className="delete-confirm-message">Are you sure you want to delete <strong>"{material?.head_line}"</strong>? This action cannot be undone.</p>
            <div className="delete-confirm-actions">
              <button className="delete-confirm-cancel" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button className="delete-confirm-delete" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  )
}
