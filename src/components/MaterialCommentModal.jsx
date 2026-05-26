import React, { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { get, post, deleteRequest, put } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'

export default function MaterialCommentModal({ isOpen, onClose, material, isInstructor, onCommentCountChange }) {
  const { user } = useAuth()
  const firstName = user?.first_name || user?.firstName || user?.name || user?.email || 'U'
  const initial = (firstName && firstName[0]?.toUpperCase()) || 'U'
  const userEmail = user?.email || ''

  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(false)
  const [draft, setDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [draftError, setDraftError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editDraft, setEditDraft] = useState('')
  const [editError, setEditError] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [countDelta, setCountDelta] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const sentinelRef = useRef(null)

  const materialId = material?.mid || material?.material_id || material?.id || material?.m_id

  const fetchComments = useCallback(async (pageNum = 1, append = false) => {
    if (!materialId) return
    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }
    try {
      const res = await get(`classroom/api/v1/comment/get-material-comments/${materialId}?page_num=${pageNum}`)
      const list = res?.comments || []
      setComments(prev => (append ? [...prev, ...list] : list))
      setHasMore(list.length > 0)
      setPage(pageNum)
    } catch (err) {
      setError('Failed to load comments')
    } finally {
      if (append) {
        setLoadingMore(false)
      } else {
        setLoading(false)
      }
    }
  }, [materialId])

  useEffect(() => {
    if (isOpen && materialId) {
      setComments([])
      setDraft('')
      setError('')
      setEditingId(null)
      setCountDelta(0)
      setPage(1)
      setHasMore(false)
      fetchComments(1, false)
    }
  }, [isOpen, materialId])

  useEffect(() => {
    if (!listRef.current || !sentinelRef.current) return
    if (!hasMore || loadingMore || loading) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && hasMore) {
          fetchComments(page + 1, true)
        }
      },
      { root: listRef.current, threshold: 0.1 }
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [fetchComments, hasMore, loadingMore, loading, page])

  const validateContent = (value) => {
    const trimmed = value.trim()
    if (!trimmed) return 'Comment content cannot be empty'
    if (trimmed.length < 2) return 'Comment content must be at least 2 characters'
    if (trimmed.length > 500) return 'Comment content cannot exceed 500 characters'
    return ''
  }

  const handleSend = async () => {
    const validationMessage = validateContent(draft)
    if (validationMessage) {
      setDraftError(validationMessage)
      return
    }
    setSubmitting(true)
    setError('')
    setDraftError('')
    try {
      const res = await post(`classroom/api/v1/comment/create-material/${materialId}`, { content: draft.trim() })
      setComments(prev => [res, ...prev])
      setCountDelta(prev => prev + 1)
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
      setCountDelta(prev => prev - 1)
    } catch (err) {
      setError(err.message || 'Failed to delete comment')
    }
  }

  const handleEdit = async (commentId) => {
    const validationMessage = validateContent(editDraft)
    if (validationMessage) {
      setEditError(validationMessage)
      return
    }
    try {
      setEditError('')
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
    try {
      return new Date(dateStr).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    } catch { return '' }
  }

  const handleClose = () => {
    if (countDelta !== 0 && onCommentCountChange) {
      onCommentCountChange(countDelta)
    }
    onClose()
  }

  if (!isOpen) return null

  return createPortal(
    <div className="file-modal-overlay" onClick={handleClose}>
      <div className="comments-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="comments-modal-header">
          <h3>Comments</h3>
          <button className="comments-modal-close" onClick={handleClose} aria-label="Close">×</button>
        </div>

        {/* Body */}
        <div className="comments-modal-body">
          {/* Input */}
          <div className="comments-input-chat" style={{ padding: '8px 16px' }}>
            <div className="comments-avatar">{initial}</div>
            <div className="comments-bubble">
              <input
                ref={inputRef}
                type="text"
                value={draft}
                onChange={e => {
                  const nextValue = e.target.value
                  setDraft(nextValue)
                  if (error) setError('')
                  setDraftError(validateContent(nextValue))
                }}
                placeholder="Write a comment..."
                className="comments-bubble-input"
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                disabled={submitting}
              />
            </div>
            <button
              className="comments-send"
              type="button"
              onClick={handleSend}
              disabled={submitting || draft.trim().length < 2 || draft.trim().length > 500}
            >
              {submitting ? '...' : 'Send'}
            </button>
          </div>

          {draftError && <div style={{ color: '#b00020', fontSize: 13, padding: '4px 16px' }}>{draftError}</div>}

          {error && <div style={{ color: '#b00020', fontSize: 13, padding: '4px 16px' }}>{error}</div>}

          {/* Comments list */}
          {loading && comments.length === 0 ? (
            <div className="comments-loading" style={{ padding: 24, textAlign: 'center', color: '#888' }}>Loading…</div>
          ) : comments.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#aaa', fontSize: 14 }}>No comments yet. Be the first!</div>
          ) : (
            <div className="comments-list-scroll scroll-enabled" ref={listRef}>
              <ul className="comments-list">
                {comments.map((c, i) => {
                  const commentId = c.id || c.comment_id
                  const author = c.created_by || c.createdBy || c.email || 'User'
                  const avatarLetter = author.charAt(0).toUpperCase()
                  const isEdited = c.is_edited || c.isEdited || (c.updated_at && c.created_at && c.updated_at !== c.created_at)
                  return (
                    <li key={commentId || i} className="comments-list-item">
                      <div className="comments-avatar">{avatarLetter}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="comments-name">{author}</div>
                          <div style={{ color: '#6B7280', fontSize: 12 }}>
                            {formatDate(c.created_at || c.createdAt)}
                            {isEdited ? ' • edited' : ''}
                          </div>
                        </div>

                        {editingId === commentId ? (
                          <div style={{ marginTop: 8 }}>
                            <input
                              type="text"
                              value={editDraft}
                              onChange={e => setEditDraft(e.target.value)}
                              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 14 }}
                              onKeyDown={e => { if (e.key === 'Enter') handleEdit(commentId) }}
                            />
                            {editError && <div style={{ color: '#b00020', fontSize: 12, marginTop: 6 }}>{editError}</div>}
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                              <button type="button" onClick={() => { setEditingId(null); setEditDraft('') }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                              <button type="button" onClick={() => handleEdit(commentId)} style={{ background: '#0b5fff', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>Save</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="comments-content" style={{ marginTop: 4, whiteSpace: 'pre-wrap', fontSize: 14 }}>{c.content}</div>
                            {(isOwner(c) || isInstructor) && (
                              <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                                {isOwner(c) && (
                                  <button type="button" onClick={() => { setEditingId(commentId); setEditDraft(c.content) }} style={{ background: '#ecfdf5', border: 'none', color: '#059669', cursor: 'pointer', padding: '2px 8px', fontSize: 12, borderRadius: 6, fontWeight: 600 }}>Edit</button>
                                )}
                                <button type="button" onClick={() => handleDelete(commentId)} style={{ background: 'transparent', border: 'none', color: '#B91C1C', cursor: 'pointer', padding: 0, fontSize: 12 }}>Delete</button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
              <div ref={sentinelRef} style={{ height: 1 }} />
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
