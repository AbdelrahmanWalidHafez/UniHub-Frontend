import React, { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import './material-card.css'
import bookIcon from '/book.png'
import announcementIcon from '/announcement.png'
import assignmentIcon from '/assignment.png'
import MaterialCommentModal from './MaterialCommentModal'
import FilePreviewCard from './FilePreviewCard'

const getExt = (url) => (url || '').split('?')[0].split('.').pop().toLowerCase()

const getFileName = (url) => {
  try {
    return decodeURIComponent(url.split('?')[0].split('/').pop().replace(/\+/g, ' '))
  } catch {
    return url.split('?')[0].split('/').pop()
  }
}

// S3 keys use literal + signs — encode them as %2B so the browser doesn't strip/mangle them
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

const URL_REGEX = /(https?:\/\/[^\s]+)/g

function LinkifiedText({ text }) {
  const parts = useMemo(() => {
    if (!text) return []
    return text.split(URL_REGEX).map((part, i) =>
      URL_REGEX.test(part)
        ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="description-link" onClick={e => e.stopPropagation()}>{part}</a>
        : part
    )
  }, [text])
  return <>{parts}</>
}

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

function PdfAttachment({ url }) {
  const safe = safeUrl(url)
  const name = getFileName(url)
  return (
    <a href={safe} target="_blank" rel="noopener noreferrer" className="att-card" onClick={(e) => e.stopPropagation()}>
      <div className="att-card-thumb att-card-pdf-thumb">
        <FilePreviewCard title={name} fileUrl={safe} cacheKey={safe} square />
      </div>
      <div className="att-card-label">
        <span className="att-card-name">{name}</span>
        <span className="att-card-type att-card-type-pdf">PDF</span>
      </div>
    </a>
  )
}

export default function MaterialCard({ material, isInstructor, onEdit, onDelete, onViewDetail, index = 0 }) {
  const [showMenu, setShowMenu] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [commentCount, setCommentCount] = useState(material.comments_count ?? 0)
  const [videoUrl, setVideoUrl] = useState(null)
  const isMaterialType = (material.material_type || '').toLowerCase() === 'material'

  const materialId = material.mid || material.material_id || material.id || material.m_id

  // Format date to readable format
  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Check if material was edited
  const isEdited = material.updated_at && material.created_at && 
    new Date(material.updated_at).getTime() !== new Date(material.created_at).getTime()

  const createdDate = formatDate(material.created_at)
  const updatedDate = formatDate(material.updated_at)

  return (
    <>
    <div className="material-card" style={{ '--card-delay': `${Math.min(index * 60, 300)}ms` }}>
      <div className="material-card-header">
        <div className="material-card-header-left">
          <div className="material-card-icon-container">
            {(() => {
              const type = (material.material_type || '').toLowerCase()
              if (type === 'material') return <img src={bookIcon} alt="Material" className="material-card-icon" />
              if (type === 'announcement') return <img src={announcementIcon} alt="Announcement" className="material-card-icon" />
              if (type === 'assignment') return <img src={assignmentIcon} alt="Assignment" className="material-card-icon" />
              return null
            })()}
          </div>
          <h3
            className={`material-card-title${isMaterialType ? ' material-card-title-link material-card-title-material' : ''}`}
            onClick={isMaterialType && onViewDetail ? () => onViewDetail(material) : undefined}
          >{material.head_line}</h3>
        </div>

        {isInstructor && (
          <div className="material-card-menu">
            <button 
              className="material-menu-btn"
              onClick={() => setShowMenu(!showMenu)}
              aria-label="Material menu"
            >
              ⋮
            </button>
            {showMenu && (
              <div className="material-menu-dropdown">
                <button 
                  className="menu-item menu-edit"
                  onClick={() => {
                    onEdit(material)
                    setShowMenu(false)
                  }}
                >
                  <span className="menu-icon">✎</span>
                  Edit
                </button>
                <button
                  className="menu-item menu-delete"
                  onClick={() => {
                    setShowMenu(false)
                    setShowDeleteConfirm(true)
                  }}
                >
                  <img src="/delete.png" alt="Delete" className="menu-icon" />
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="material-card-content">
        <p className="material-card-description"><LinkifiedText text={material.description} /></p>

        {/* Display points for assignments */}
        {(material.material_type || '').toLowerCase() === 'assignment' && material.points && (
          <div className="material-card-meta">
            <span className="material-points">
              <strong>{material.points}</strong> points
            </span>
          </div>
        )}

        {/* File attachments — only for announcements */}
        {(material.material_type || '').toLowerCase() === 'announcement' && material.material_urls && material.material_urls.length > 0 && (() => {
          // normalize: urls may be strings or objects with a url/file_url field
          const urls = material.material_urls.map(u => safeUrl(typeof u === 'string' ? u : (u?.url || u?.file_url || u?.path || ''))).filter(Boolean)
          if (urls.length === 0) return null
          return (
            <div className="material-attachments">
              {urls.map((url, i) => {
                const name = getFileName(url)
                if (isPdf(url)) {
                  return <PdfAttachment key={i} url={url} />
                }
                if (isImage(url)) {
                  return (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="att-card" onClick={(e) => e.stopPropagation()}>
                      <div className="att-card-thumb">
                        <img src={url} alt={name} className="att-card-img" />
                      </div>
                      <div className="att-card-label">
                        <span className="att-card-name">{name}</span>
                        <span className="att-card-type">Image</span>
                      </div>
                    </a>
                  )
                }
                if (isVideo(url)) {
                  return (
                    <div key={i} className="att-card att-card-video" onClick={(e) => { e.stopPropagation(); setVideoUrl(url) }}>
                      <div className="att-card-thumb att-card-video-thumb">
                        <video src={url} className="att-card-video-el" muted playsInline preload="metadata" />
                        <span className="att-card-play-icon">▶</span>
                      </div>
                      <div className="att-card-label">
                        <span className="att-card-name">{name}</span>
                        <span className="att-card-type">Video</span>
                      </div>
                    </div>
                  )
                }
                return (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="att-card" onClick={(e) => e.stopPropagation()}>
                    <div className="att-card-thumb att-card-file-thumb">
                      <span className="att-card-file-icon">📎</span>
                    </div>
                    <div className="att-card-label">
                      <span className="att-card-name">{name}</span>
                      <span className="att-card-type">File</span>
                    </div>
                  </a>
                )
              })}
            </div>
          )
        })()}
      </div>

      <div className="material-card-footer">
        <div className="material-card-dates">
          <span className="material-date created-date">
            Posted {createdDate}
          </span>
          {isEdited && (
            <>
              <span className="material-date date-separator"> • </span>
              <span className="material-date edited-date">Edited {updatedDate}</span>
            </>
          )}
        </div>

        {/* Comments button */}
        {material.comments_count !== undefined && (
          <button
            className="material-card-comments"
            onClick={() => setShowComments(true)}
          >
            <img
              src="/comment.png"
              alt="Comments"
              className="comments-icon"
              onError={(e) => { e.target.style.display = 'none' }}
            />
            <span className="comments-count">
              {commentCount} comment{commentCount !== 1 ? 's' : ''}
            </span>
          </button>
        )}
      </div>
    </div>

      {videoUrl && <VideoModal url={videoUrl} onClose={() => setVideoUrl(null)} />}

      <MaterialCommentModal
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        material={material}
        isInstructor={isInstructor}
        onCommentCountChange={(delta) => setCommentCount(prev => Math.max(0, prev + delta))}
      />

      {showDeleteConfirm && (
        <div className="delete-confirm-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-confirm-icon">
              <img src="/delete.png" alt="Delete" />
            </div>
            <h3 className="delete-confirm-title">Delete Material</h3>
            <p className="delete-confirm-message">Are you sure you want to delete <strong>"{material.head_line}"</strong>? This action cannot be undone.</p>
            <div className="delete-confirm-actions">
              <button className="delete-confirm-cancel" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button className="delete-confirm-delete" onClick={() => { onDelete(materialId); setShowDeleteConfirm(false) }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
