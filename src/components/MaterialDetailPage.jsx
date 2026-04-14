import React, { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { get, post, put, deleteRequest } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import bookIcon from '/book.png'
import announcementIcon from '/announcement.png'
import assignmentIcon from '/assignment.png'
import FilePreviewCard from './FilePreviewCard'
import './material-detail-page.css'
import './material-card.css'

const getExt = (url) => (url || '').split('?')[0].split('.').pop().toLowerCase()
const getFileName = (url) => {
  try { return decodeURIComponent(url.split('?')[0].split('/').pop().replace(/\+/g, ' ')) } catch { return url.split('?')[0].split('/').pop() }
}
const URL_REGEX = /(https?:\/\/[^\s]+)/g

function LinkifiedText({ text }) {
  if (!text) return null
  return (
    <>
      {text.split(URL_REGEX).map((part, i) =>
        URL_REGEX.test(part)
          ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: '#0b5fff', wordBreak: 'break-all' }}>{part}</a>
          : part
      )}
    </>
  )
}

const safeUrl = (url) => {
  try {
    const [base, query] = url.split('?')
    const parts = base.split('/')
    const filename = parts.pop()
    parts.push(filename.replace(/\+/g, '%2B'))
    return parts.join('/') + (query ? '?' + query : '')
  } catch {
    return url
  }
}
const isImage = (url) => ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(getExt(url))
const isPdf = (url) => getExt(url) === 'pdf'
const isVideo = (url) => ['mp4', 'webm', 'ogg', 'mov', 'm4v'].includes(getExt(url))

function VideoModal({ url, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return createPortal(
    <div className="video-modal-overlay" onClick={onClose}>
      <div className="video-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="video-modal-close" onClick={onClose}>✕</button>
        <video src={url} controls autoPlay className="video-modal-player" />
      </div>
    </div>,
    document.body
  )
}

function AttachmentGrid({ urls }) {
  const [videoUrl, setVideoUrl] = useState(null)
  if (!urls || urls.length === 0) return null
  return (
    <>
    {videoUrl && <VideoModal url={videoUrl} onClose={() => setVideoUrl(null)} />}
    <div className="mdp-attachments">
      {urls.map((url, i) => {
        const name = getFileName(url)
        if (isImage(url)) {
          return (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="mdp-att-image-wrap">
              <div className="mdp-att-thumb image-thumb">
                <img src={url} alt={name} className="mdp-att-img" />
              </div>
              <div className="mdp-att-label">
                <span className="mdp-att-name">{name}</span>
                <span className="mdp-att-type">Image</span>
              </div>
            </a>
          )
        }
        if (isPdf(url)) {
          return (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="mdp-att-pdf-wrap">
              <FilePreviewCard title={name} fileUrl={url} cacheKey={url} square />
              <div className="mdp-att-pdf-label">
                <span className="mdp-att-pdf-name">{name}</span>
                <span className="mdp-att-pdf-type">PDF</span>
              </div>
            </a>
          )
        }
        if (isVideo(url)) {
          return (
            <div key={i} className="mdp-att-video-wrap" onClick={() => setVideoUrl(url)}>
              <div className="mdp-att-thumb video-thumb">
                <video src={url} className="mdp-att-video-el" muted playsInline preload="metadata" />
                <span className="mdp-att-play-icon">▶</span>
              </div>
              <div className="mdp-att-label">
                <span className="mdp-att-name">{name}</span>
                <span className="mdp-att-type">Video</span>
              </div>
            </div>
          )
        }
        return (
          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="mdp-att-file-wrap">
            <div className="mdp-att-thumb file-thumb">
              <div className="mdp-att-thumb-icon">
                <svg width="36" height="44" viewBox="0 0 36 44" fill="none">
                  <rect width="36" height="44" rx="4" fill="#1a73e8" opacity="0.12"/>
                  <path d="M8 6h16l8 8v24a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2z" fill="#1a73e8" opacity="0.5"/>
                  <path d="M24 6v8h8" fill="none" stroke="#1a73e8" strokeWidth="1.5"/>
                </svg>
                <span className="icon-label">FILE</span>
              </div>
            </div>
            <div className="mdp-att-label">
              <span className="mdp-att-name">{name}</span>
              <span className="mdp-att-type">File</span>
            </div>
          </a>
        )
      })}
    </div>
    </>
  )
}

function CommentSection({ materialId, isInstructor, userEmail }) {
  const { user } = useAuth()
  const firstName = user?.first_name || user?.firstName || user?.name || user?.email || 'U'
  const initial = (firstName?.[0] || 'U').toUpperCase()

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
  const sentinelRef = useRef(null)

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
    } catch {
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
    setPage(1)
    setHasMore(false)
    fetchComments(1, false)
  }, [fetchComments])

  useEffect(() => {
    if (!sentinelRef.current) return
    if (!hasMore || loadingMore || loading) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && hasMore) {
          fetchComments(page + 1, true)
        }
      },
      { threshold: 0.1 }
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

  const isOwner = (c) => (c.created_by || c.createdBy || c.email || '') === userEmail

  const fmt = (d) => {
    if (!d) return ''
    try { return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }
    catch { return '' }
  }

  return (
    <div className="mdp-comments-section">
      <div className="mdp-comments-title">
        <img src="/comment.png" alt="" className="mdp-comments-icon" onError={e => e.target.style.display = 'none'} />
        Class comments
      </div>

      <div className="mdp-comment-input-row">
        <div className="mdp-avatar">{initial}</div>
        <input
          type="text"
          value={draft}
          onChange={e => {
            const nextValue = e.target.value
            setDraft(nextValue)
            if (error) setError('')
            setDraftError(validateContent(nextValue))
          }}
          placeholder="Add class comment..."
          className="mdp-comment-input"
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          disabled={submitting}
        />
        <button className="mdp-send-btn" onClick={handleSend} disabled={submitting || draft.trim().length < 2 || draft.trim().length > 500}>
          {submitting ? '...' : 'Send'}
        </button>
      </div>

      {draftError && <div className="mdp-error">{draftError}</div>}

      {error && <div className="mdp-error">{error}</div>}

      <hr className="mdp-hr" />

      {loading && comments.length === 0 ? (
        <div className="mdp-loading">Loading…</div>
      ) : comments.length === 0 ? (
        <div className="mdp-no-comments">No comments yet. Be the first!</div>
      ) : (
        <>
          <ul className="mdp-comment-list">
            {comments.map((c, i) => {
            const cid = c.id || c.comment_id
            const author = c.created_by || c.createdBy || c.email || 'User'
            const letter = author.charAt(0).toUpperCase()
            const edited = c.is_edited || c.isEdited || (c.updated_at && c.created_at && c.updated_at !== c.created_at)
            return (
              <li key={cid || i} className="mdp-comment-item">
                <div className="mdp-avatar">{letter}</div>
                <div className="mdp-comment-body">
                  <div className="mdp-comment-meta">
                    <span className="mdp-comment-author">{author}</span>
                    <span className="mdp-comment-date">{fmt(c.created_at || c.createdAt)}{edited ? ' • edited' : ''}</span>
                  </div>
                  {editingId === cid ? (
                    <div className="mdp-edit-block">
                      <input type="text" value={editDraft} onChange={e => setEditDraft(e.target.value)}
                        className="mdp-edit-input" onKeyDown={e => { if (e.key === 'Enter') handleEdit(cid) }} />
                      {editError && <div className="mdp-error">{editError}</div>}
                      <div className="mdp-edit-actions">
                        <button type="button" className="mdp-edit-cancel" onClick={() => { setEditingId(null); setEditDraft('') }}>Cancel</button>
                        <button type="button" className="mdp-edit-save" onClick={() => handleEdit(cid)}>Save</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mdp-comment-content">{c.content}</div>
                      {(isOwner(c) || isInstructor) && (
                        <div className="mdp-comment-actions">
                          {isOwner(c) && <button type="button" className="mdp-act-edit" onClick={() => { setEditingId(cid); setEditDraft(c.content) }}>Edit</button>}
                          <button type="button" className="mdp-act-delete" onClick={() => handleDelete(cid)}>Delete</button>
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
        </>
      )}

    </div>
  )
}

export default function MaterialDetailPage({ materialId, isInstructor, refreshKey, onBack, onEdit, onDelete }) {
  const { user } = useAuth()
  const userEmail = user?.email || ''

  const [material, setMaterial] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showMenu, setShowMenu] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (!materialId) return
    setLoading(true)
    setError(null)
    setMaterial(null)
    get(`classroom/api/v1/material/get-material/${materialId}`)
      .then(res => setMaterial(res))
      .catch(err => setError(err.message || 'Failed to load material'))
      .finally(() => setLoading(false))
  }, [materialId, refreshKey])

  const type = (material?.material_type || '').toLowerCase()
  const typeIcon = type === 'assignment' ? assignmentIcon : type === 'material' ? bookIcon : announcementIcon

  const urls = (material?.material_urls || [])
    .map(u => safeUrl(typeof u === 'string' ? u : (u?.url || u?.file_url || u?.path || '')))
    .filter(Boolean)

  const fmtDate = (d) => {
    if (!d) return ''
    try { return new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return '' }
  }

  const isEdited = material?.updated_at && material?.created_at &&
    new Date(material.updated_at).getTime() !== new Date(material.created_at).getTime()

  const handleDelete = () => {
    setShowDeleteConfirm(false)
    onDelete(materialId)
    onBack()
  }

  return (
    <div className="mdp-page">
      <div className="mdp-layout">
        {/* Main card */}
        <div className="mdp-main-card">
          {loading && <div className="mdp-loading" style={{ padding: 48 }}>Loading...</div>}
          {error && <div className="mdp-error" style={{ padding: 24 }}>{error}</div>}

          {material && !loading && (
            <>
              {/* Header */}
              <div className="mdp-card-header">
                <div className="mdp-card-header-left">
                  <button className="mdp-back-btn" onClick={onBack} aria-label="Back">
                    <svg className="mdp-back-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <div className="mdp-icon-circle">
                    <img src={typeIcon} alt={type} className="mdp-type-icon" />
                  </div>
                  <div className="mdp-header-text">
                    <h1 className="mdp-title">{material.head_line}</h1>
                    <div className="mdp-subtitle">
                      {material.created_by && <span>{material.created_by}</span>}
                      {material.created_at && <span> • {fmtDate(material.created_at)}</span>}
                      {isEdited && <span> (Edited {fmtDate(material.updated_at)})</span>}
                    </div>
                  </div>
                </div>

                {isInstructor && (
                  <div className="mdp-menu-wrap">
                    <button className="mdp-menu-btn" onClick={() => setShowMenu(s => !s)}>⋮</button>
                    {showMenu && (
                      <div className="mdp-menu-dropdown">
                        <button className="mdp-menu-item" onClick={() => { setShowMenu(false); onEdit(material) }}>
                          <span>✎</span> Edit
                        </button>
                        <button className="mdp-menu-item mdp-menu-delete" onClick={() => { setShowMenu(false); setShowDeleteConfirm(true) }}>
                          <img src="/delete.png" alt="Delete" style={{ width: 16, height: 16 }} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <hr className="mdp-hr" />

              {/* Attachments */}
              {urls.length > 0 && <AttachmentGrid urls={urls} />}

              {/* Description */}
              <p className="mdp-description"><LinkifiedText text={material.description} /></p>

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
            <div className="delete-confirm-icon"><img src="/delete.png" alt="Delete" /></div>
            <h3 className="delete-confirm-title">Delete Material</h3>
            <p className="delete-confirm-message">Are you sure you want to delete <strong>"{material?.head_line}"</strong>? This action cannot be undone.</p>
            <div className="delete-confirm-actions">
              <button className="delete-confirm-cancel" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button className="delete-confirm-delete" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
