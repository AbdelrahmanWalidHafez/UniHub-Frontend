import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set workerSrc for pdfjs
pdfjs.GlobalWorkerOptions.workerSrc = '/node_modules/pdfjs-dist/build/pdf.worker.min.mjs'; // version now matches react-pdf
import FilePreviewCard from './FilePreviewCard';
import { createPortal } from 'react-dom'
import { useAuth } from '../contexts/AuthContext'
import { getRoleName } from '../constants/roles'
import { get, post, apiCall, formPost, patch, deleteRequest } from '../utils/api'
import PostDeleteModal from './PostDeleteModal'
import { getAccessToken } from '../utils/auth'
import { formatInCairo } from '../utils/timezone'

function timeAgo(input) {
  if (!input) return ''
  const d = (input instanceof Date) ? input : new Date(input)
  if (isNaN(d.getTime())) return ''
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return days === 1 ? '1 day ago' : `${days} days ago`
  const months = Math.floor(days / 30)
  if (months < 12) return months === 1 ? '1 month ago' : `${months} months ago`
  const years = Math.floor(months / 12)
  return years === 1 ? '1 year ago' : `${years} years ago`
}

// S3 keys use literal + signs — encode them as %2B so the browser doesn't mangle them
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

// Top-level memoized attachment renderer to keep a stable component identity
const AttachmentRendererMemo = React.memo(function AttachmentRendererMemo({ url, type, name, openLightbox }) {
  const [decided, setDecided] = useState(() => {
    if (!url) return 'unknown'
    const t = (type || '').toLowerCase()
    const ext = String(url).toLowerCase().split('.').pop() || ''
    if (t.startsWith('image/')) return 'image'
    if (t.startsWith('video/')) return 'video'
    if (t === 'application/pdf' || ext === 'pdf') return 'pdf'
    // fallback to extension if type is missing
    if (['mp4','webm','ogg','mov','m4v'].includes(ext)) return 'video'
    if (['jpg','jpeg','png','gif','webp','avif'].includes(ext)) return 'image'
    return 'unknown'
  })
  const [fallbackToImage, setFallbackToImage] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [pdfError, setPdfError] = useState(false)
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null)
  const [pdfFetching, setPdfFetching] = useState(false)
  const pdfFetchControllerRef = useRef(null)
  const googlePreviewUrl = url ? `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true` : null

  useEffect(() => {
    // recompute on url/type change
    if (!url) return
    const t = (type || '').toLowerCase()
    const ext = String(url).toLowerCase().split('.').pop() || ''
    if (t.startsWith('image/')) setDecided('image')
    else if (t.startsWith('video/')) setDecided('video')
    else if (t === 'application/pdf' || ext === 'pdf') setDecided('pdf')
    else if (['mp4','webm','ogg','mov','m4v'].includes(ext)) setDecided('video')
    else if (['jpg','jpeg','png','gif','webp','avif'].includes(ext)) setDecided('image')
    else setDecided('unknown')
    setFallbackToImage(false)
    setVideoError(false)
    setImageError(false)
    setPdfError(false)
    // No HEAD/OPTIONS probes — we rely on provided `type`, URL extension, or GET for PDFs.
  }, [url, type])

  // PDF blob fetch effect — always declared at top level
  useEffect(() => {
    if (!url || decided !== 'pdf') return
    // abort any previous fetch
    if (pdfFetchControllerRef.current) {
      try { pdfFetchControllerRef.current.abort() } catch (e) {}
      pdfFetchControllerRef.current = null
    }
    // revoke previous blob
    if (pdfBlobUrl) {
      try { URL.revokeObjectURL(pdfBlobUrl) } catch (e) {}
      setPdfBlobUrl(null)
    }
    setPdfFetching(true)
    setPdfError(false)
    const ctrl = new AbortController()
    pdfFetchControllerRef.current = ctrl
    const timeoutId = setTimeout(() => { try { ctrl.abort() } catch (e) {} }, 10000)
    ;(async () => {
      try {
        const res = await fetch(safeUrl(url), { method: 'GET', mode: 'cors', credentials: 'omit', signal: ctrl.signal })
        if (!res.ok) throw new Error('Failed to fetch PDF: ' + res.status)
        const blob = await res.blob()
        const bUrl = URL.createObjectURL(blob)
        setPdfBlobUrl(bUrl)
      } catch (err) {
        console.debug('PDF blob fetch failed', url, err)
        setPdfError(true)
      } finally {
        clearTimeout(timeoutId)
        setPdfFetching(false)
        pdfFetchControllerRef.current = null
      }
    })()
    return () => {
      if (pdfFetchControllerRef.current) {
        try { pdfFetchControllerRef.current.abort() } catch (e) {}
        pdfFetchControllerRef.current = null
      }
      if (pdfBlobUrl) {
        try { URL.revokeObjectURL(pdfBlobUrl) } catch (e) {}
      }
    }
  }, [url, decided])

  if (!url) return null

  const containerStyle = { display: 'flex', justifyContent: 'center', marginTop: 12 }
  const innerStyle = { width: '100%', maxWidth: 680, display: 'flex', justifyContent: 'center', paddingLeft: 0 }
  const mediaCommon = { width: '100%', maxWidth: 680, maxHeight: '70vh', borderRadius: 12, objectFit: 'contain', display: 'block', margin: '0 auto' }

  if (decided === 'image' || (decided === 'unknown' && fallbackToImage)) {
    return (
      <div style={containerStyle}>
        <div style={innerStyle}>
          <img
            src={url}
            alt={name}
            className="attachment-img"
            style={{ ...mediaCommon, cursor: 'zoom-in', display: 'block' }}
            onClick={() => openLightbox && openLightbox(url)}
            decoding="async"
            loading="lazy"
            onError={(e) => { console.error('Image failed to load', url, e); setImageError(true); e.currentTarget.style.display = 'none' }}
          />
        </div>
      </div>
    )
  }

  if (videoError && imageError) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
        <div style={{ width: '100%', maxWidth: 680, textAlign: 'center', padding: 12, borderRadius: 8, background: '#fff', border: '1px solid #F3F4F6' }}>
          <div style={{ marginBottom: 8, color: '#B91C1C' }}>Media unavailable</div>
          <a href={url} target="_blank" rel="noreferrer noopener" style={{ color: '#111', textDecoration: 'underline' }}>{String(url).slice(0, 120)}{String(url).length > 120 ? '...' : ''}</a>
        </div>
      </div>
    )
  }
  // PDF rendering: attempt to fetch PDF as blob and render via blob URL (bypasses framing restrictions).
  if (decided === 'pdf') {
    // Horizontal card preview: title/label left, thumbnail right using react-pdf
    const [numPages, setNumPages] = useState(null);
    const [loadError, setLoadError] = useState(null);

    return (
      <div style={{ margin: '24px 0' }}>
        <a href={safeUrl(url)} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block', cursor: 'pointer' }}>
          <FilePreviewCard title={name || url.split('/').pop() || 'PDF file'} fileUrl={safeUrl(url)} cacheKey={safeUrl(url)} />
        </a>
      </div>
    );
  }

    // Left-aligned video preview card (flush with card's left edge)
    return (
      <div style={{ width: '100%', minHeight: '1px', display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start', margin: '32px 0' }}>
        <div style={{ maxWidth: 480, width: '100%', border: '1px solid #e0e0e0', borderRadius: 14, boxShadow: '0 2px 12px #0001', overflow: 'hidden', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: 0 }}>
          <video
            controls
            preload="metadata"
            style={{ width: '100%', maxWidth: 480, height: 'auto', display: 'block', background: '#000', borderRadius: 0 }}
            onError={(e) => { console.error('Video failed to load', url, e); setVideoError(true); setFallbackToImage(true) }}
          >
            <source src={url} type={type || undefined} />
            Your browser does not support the video element. <a href={url} target="_blank" rel="noreferrer noopener">Open</a>
          </video>
        </div>
      </div>
    )
}, (prev, next) => prev.url === next.url && prev.type === next.type && prev.name === next.name)


export default function AnnouncementPage({ secretary = false }) {
  const { user } = useAuth()
  const roleName = getRoleName(user)
  const isSecretaryUser = secretary || String(roleName || '').toLowerCase().includes('secretary') || roleName === 'ROLE_SECRETARY'
  const author = (user?.first_name || user?.firstName || user?.name || user?.email || 'User')
  const initial = (author && author[0]) || 'U'

  function isOwner(entity) {
    if (!entity) return false
    const raw = entity.raw || {}
    if (raw.created_by && user) {
      const uids = [user.id, user.user_id, user.userId, user.email, user.email_address, user.emailAddress].filter(Boolean).map(String)
      if (uids.includes(String(raw.created_by))) return true
    }
    const createdByName = entity.createdBy || raw.created_by || raw.createdBy || ''
    const userNames = [user?.first_name, user?.firstName, user?.name, user?.email].filter(Boolean).map(String)
    if (createdByName && userNames.includes(String(createdByName))) return true
    return false
  }

  const [posts, setPosts] = useState([])
  const [showMyPosts, setShowMyPosts] = useState(false)
  const [myPosts, setMyPosts] = useState([])
  const [myPageNum, setMyPageNum] = useState(1)
  const [myLoading, setMyLoading] = useState(false)
  const [myHasMore, setMyHasMore] = useState(true)
  const [mySortField, setMySortField] = useState('createdAt')
  const [mySortDir, setMySortDir] = useState('desc')
  const [statusCounts, setStatusCounts] = useState({})
  const [pageNum, setPageNum] = useState(1)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const sentinelRef = useRef(null)
  const [secretaryStatusFilter, setSecretaryStatusFilter] = useState(isSecretaryUser ? 'PENDING' : '')

  const [draft, setDraft] = useState('')
  const [title, setTitle] = useState('')
  const [titleError, setTitleError] = useState('')
  const [contentError, setContentError] = useState('')
  // composer-specific state (separate from inline editing state `title`/`draft`)
  const [composerTitle, setComposerTitle] = useState('')
  const [composerDraft, setComposerDraft] = useState('')
  const [composerAttachments, setComposerAttachments] = useState([])
  const [composerSelectedAttachmentIndex, setComposerSelectedAttachmentIndex] = useState(null)
  const [composerTitleError, setComposerTitleError] = useState('')
  const [composerContentError, setComposerContentError] = useState('')
  const [composerOpen, setComposerOpen] = useState(false)
  const [attachments, setAttachments] = useState([])
  const [selectedAttachmentIndex, setSelectedAttachmentIndex] = useState(null)
  const [publishLoading, setPublishLoading] = useState(false)
  const [publishError, setPublishError] = useState(null)
  const [showFileModal, setShowFileModal] = useState(false)
  const textareaRef = useRef(null)
  const modalInputRef = useRef(null)
  const composerRef = useRef(null)
  const postsListRef = useRef(null)
  const removedRemoteRef = useRef([])
  const [lightboxUrl, setLightboxUrl] = useState(null)
  const lightboxImgRef = useRef(null)
  const [openMenuId, setOpenMenuId] = useState(null)
  const [editingPostId, setEditingPostId] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState(null)
  const [showDeleteCommentConfirm, setShowDeleteCommentConfirm] = useState(false)
  const [pendingDeleteCommentId, setPendingDeleteCommentId] = useState(null)
  const [pendingDeleteCommentPostId, setPendingDeleteCommentPostId] = useState(null)
  const previewUrlRef = useRef(null)
  const previewTypeRef = useRef(null)
  const [showLikesModal, setShowLikesModal] = useState(false)
  const [showCommentsModal, setShowCommentsModal] = useState(false)
  const [likesList, setLikesList] = useState([])
  const [likesPage, setLikesPage] = useState(1)
  const [likesLoading, setLikesLoading] = useState(false)
  const [likesHasMore, setLikesHasMore] = useState(false)
  const [likesModalPostId, setLikesModalPostId] = useState(null)
  const likesContentRef = useRef(null)
  // deterministic color for fallback avatars based on name
  function avatarColor(seed, sat = 60, light = 60) {
    // normalize seed to stable string
    let s = (seed || 'user').toString().trim().toLowerCase()
    if (!s) s = 'user'
    let hash = 0
    for (let i = 0; i < s.length; i++) {
      hash = (hash << 5) - hash + s.charCodeAt(i)
      hash |= 0
    }
    const h = Math.abs(hash) % 360
    return `hsl(${h}, ${sat}%, ${light}%)`
  }
  // comments modal and pagination
  const [commentsList, setCommentsList] = useState([])
  const [commentsPage, setCommentsPage] = useState(1)
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentsHasMore, setCommentsHasMore] = useState(false)
  const [commentsModalPostId, setCommentsModalPostId] = useState(null)
  const commentsContentRef = useRef(null)
  const COMMENTS_PAGE_SIZE = 5
  const [commentsDraft, setCommentsDraft] = useState('')
  const [commentsError, setCommentsError] = useState('')
  const [commentsSubmitting, setCommentsSubmitting] = useState(false)
  const [openCommentMenuId, setOpenCommentMenuId] = useState(null)
  const [commentMenuPos, setCommentMenuPos] = useState(null)
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editCommentDraft, setEditCommentDraft] = useState('')
  const [editingReplyId, setEditingReplyId] = useState(null)
  const [editReplyDraft, setEditReplyDraft] = useState('')
  const [replyDrafts, setReplyDrafts] = useState({})
  const [commentsScrollEnabled, setCommentsScrollEnabled] = useState(false)
  // Replies rendering is placed inside the comments modal JSX below.

  async function fetchMyPosts(page = 1) {
    setMyLoading(true)
    try {
      const path = `announcement/api/v1/posts/public/get-my-posts?page_num=${page}&sort_field=${mySortField}&sort_dir=${mySortDir}`
      const data = await get(path)
      const incoming = (data && data.posts) || []
      const mapped = incoming.map((p) => ({
        id: p.post_id || p.id,
        author: p.created_by || p.createdBy || 'You',
        time: (() => {
          const d = new Date(p.created_at || p.createdAt);
          if (isNaN(d.getTime())) return '-';
          const date = d.toLocaleDateString('en-CA'); // YYYY-MM-DD
          const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
          return `${date} ${time}`;
        })(),
        title: p.title || '',
        content: p.content,
        likes: p.likes_count || p.likesCount || 0,
        liked: (p.liked_by_current_user === true) || (p.user_liked === true) || (p.liked === true) || false,
        comments: p.comments_count || p.commentsCount || 0,
        shares: 0,
        attachments: p.media_url ? [{ name: p.media_url, url: p.media_url, type: p.media_type || p.content_type || p.mime_type || p.media_mime || p.contentType || p.mediaContentType || (p.raw && (p.raw.content_type || p.raw.mime_type || p.raw.media_type)) || null }] : [],
        raw: p,
      }))

      if (page === 1) setMyPosts(mapped)
      else setMyPosts((prev) => [...prev, ...mapped])

      if (typeof data?.has_more === 'boolean') {
        setMyHasMore(!!data.has_more)
      } else if (typeof data?.page_num === 'number' && typeof data?.total_pages === 'number') {
        setMyHasMore(Number(data.page_num) < Number(data.total_pages))
      } else {
        setMyHasMore(incoming.length > 0)
      }
      if (page === 1) await fetchPostStatusAnalysis()
    } catch (err) {
      console.error('Failed to load my posts', err)
      if (page === 1) setMyPosts([])
      setMyHasMore(false)
    } finally {
      setMyLoading(false)
    }
  }

  async function fetchPostStatusAnalysis() {
    try {
      const path = 'announcement/api/v1/posts/public/get-my-posts-analysis'
      const data = await get(path)
      // data expected: [{ status: 'PENDING', count: 3 }, ...]
      if (Array.isArray(data)) {
        const map = {}
        data.forEach((d) => {
          if (d && d.status) map[String(d.status)] = Number(d.count || 0)
        })
        setStatusCounts(map)
      }
    } catch (err) {
      console.error('Failed to load post status analysis', err)
    }
  }

  async function fetchPosts(page = 1) {
    setLoading(true)
    try {
      // Secretary has a dedicated endpoint under the posts controller
      if (secretary) {
        let path = `announcement/api/v1/posts/secretary/get-posts?page_num=${page}&sort_field=${mySortField}&sort_dir=${mySortDir}`
        if (secretaryStatusFilter) {
          path += `&status=${encodeURIComponent(secretaryStatusFilter)}`
        }
        const data = await get(path)
        const incoming = (data && data.posts) || []
        const mapped = incoming.map((p) => ({
          id: p.post_id || p.id,
          author: p.created_by || p.createdBy || 'User',
            time: (() => {
              const d = new Date(p.created_at || p.createdAt);
              if (isNaN(d.getTime())) return '-';
              const date = d.toLocaleDateString('en-CA'); // YYYY-MM-DD
              const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
              return `${date} ${time}`;
            })(),
          title: p.title || '',
          content: p.content,
          likes: p.likes_count || p.likesCount || 0,
          liked: (p.liked_by_current_user === true) || (p.user_liked === true) || (p.liked === true) || false,
          comments: p.comments_count || p.commentsCount || 0,
          shares: 0,
          attachments: p.media_url ? [{ name: p.media_url, url: p.media_url, type: p.media_type || p.content_type || p.mime_type || p.media_mime || p.contentType || p.mediaContentType || (p.raw && (p.raw.content_type || p.raw.mime_type || p.raw.media_type)) || null }] : [],
          raw: p,
        }))
        if (page === 1) setPosts(mapped)
        else setPosts((prev) => [...prev, ...mapped])
        // page info
        if (typeof data?.has_more === 'boolean') setHasMore(!!data.has_more)
        else if (typeof data?.page_num === 'number' && typeof data?.total_pages === 'number') setHasMore(Number(data.page_num) < Number(data.total_pages))
        else setHasMore(incoming.length > 0)
      } else {
        // public feed endpoint (best-effort path)
        const path = `announcement/api/v1/posts/public/get-posts?page_num=${page}&sort_field=${mySortField}&sort_dir=${mySortDir}`
        const data = await get(path)
        const incoming = (data && data.posts) || []
        const mapped = incoming.map((p) => ({
          id: p.post_id || p.id,
          author: p.created_by || p.createdBy || 'User',
            time: (() => {
              const d = new Date(p.created_at || p.createdAt);
              if (isNaN(d.getTime())) return '-';
              return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            })(),
          title: p.title || '',
          content: p.content,
          likes: p.likes_count || p.likesCount || 0,
          liked: (p.liked_by_current_user === true) || (p.user_liked === true) || (p.liked === true) || false,
          comments: p.comments_count || p.commentsCount || 0,
          shares: 0,
          attachments: p.media_url ? [{ name: p.media_url, url: p.media_url, type: p.media_type || p.content_type || p.mime_type || p.media_mime || p.contentType || p.mediaContentType || (p.raw && (p.raw.content_type || p.raw.mime_type || p.raw.media_type)) || null }] : [],
          raw: p,
        }))
        if (page === 1) setPosts(mapped)
        else setPosts((prev) => [...prev, ...mapped])
        if (typeof data?.has_more === 'boolean') setHasMore(!!data.has_more)
        else if (typeof data?.page_num === 'number' && typeof data?.total_pages === 'number') setHasMore(Number(data.page_num) < Number(data.total_pages))
        else setHasMore(incoming.length > 0)
        if (page === 1) await fetchPostStatusAnalysis()
      }
      setPageNum(page)
    } catch (err) {
      console.error('Failed to load posts', err)
      if (page === 1) setPosts([])
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }

  // infinite scroll using IntersectionObserver
  useEffect(() => {
    if (!sentinelRef.current) return
    const rootEl = postsListRef.current || null
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        if (showMyPosts) {
          if (myHasMore && !myLoading) {
            const next = myPageNum + 1
            setMyPageNum(next)
            fetchMyPosts(next)
          }
        } else {
          if (hasMore && !loading) {
            const next = pageNum + 1
            setPageNum(next)
            fetchPosts(next)
          }
        }
      })
    }, { root: rootEl, rootMargin: '200px', threshold: 0.1 })
    obs.observe(sentinelRef.current)
    return () => obs.disconnect()
  }, [sentinelRef.current, postsListRef.current, hasMore, loading, pageNum, showMyPosts, myHasMore, myLoading, myPageNum])

  // close lightbox on Escape
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') setLightboxUrl(null)
    }
    if (lightboxUrl) {
      window.addEventListener('keydown', onKey)
      return () => window.removeEventListener('keydown', onKey)
    }
  }, [lightboxUrl])

  // lock body scroll when overlays (lightbox, file modal, confirmation) are open
  useEffect(() => {
    const anyOpen = !!lightboxUrl || !!showFileModal || !!showDeleteConfirm || !!showDeleteCommentConfirm
    const prev = document.body.style.overflow
    if (anyOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = prev || ''
    }
    return () => {
      document.body.style.overflow = prev || ''
    }
  }, [lightboxUrl, showFileModal, showDeleteConfirm])

  // cleanup object URLs for previews on unmount
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        try { URL.revokeObjectURL(previewUrlRef.current) } catch (e) {}
        previewUrlRef.current = null
      }
    }
  }, [])

  // initial posts load and reload when secretary prop/user or status filter changes
  const userId = user?.id || user?.user_id || user?.userId || user?.email || ''
  useEffect(() => {
    setPosts([])
    setPageNum(1)
    fetchPosts(1)
  }, [secretary, userId, secretaryStatusFilter])

  // stable lightbox opener to pass to memoized children
  const openLightbox = useCallback((url) => {
    setLightboxUrl(url)
  }, [setLightboxUrl])

  // close any open post/comment menus when clicking outside
  useEffect(() => {
    function onDocClick(e) {
      const el = e.target
      // if click happened inside any menu trigger or menu content, ignore
      if (el && el.closest && (el.closest('[data-menu-trigger]') || el.closest('[data-menu-content]'))) return
      if (openMenuId) setOpenMenuId(null)
      if (openCommentMenuId) setOpenCommentMenuId(null)
    }
    function onKey(e) {
      if (e.key === 'Escape') {
        if (openMenuId) setOpenMenuId(null)
        if (openCommentMenuId) setOpenCommentMenuId(null)
      }
    }
    document.addEventListener('click', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [openMenuId, openCommentMenuId])

  function handleSubmit(e) {
    e.preventDefault()
    if (!composerTitle.trim()) {
      // show composer-specific validation
      setComposerTitleError('Title is required')
      return
    }
    if (composerContentError) return
    createPost(composerTitle, composerDraft, composerAttachments)
  }

  async function createPost(titleArg, content, files) {
    setPublishLoading(true)
    setPublishError(null)
    try {
      const path = 'announcement/api/v1/posts/public/create'
      let resData = null

      const fd = new FormData()
      // Backend expects a JSON part named `data` and an optional `media` file
      const dataObj = { title: titleArg }
      const trimmedContent = content && content.trim()
      if (trimmedContent) dataObj.content = trimmedContent
      fd.append('data', new Blob([JSON.stringify(dataObj)], { type: 'application/json' }))
      if (files && files.length > 0) {
        fd.append('media', files[0])
      }

      // Use formPost so base URL, auth and timeouts are handled consistently
      const token = getAccessToken()
      const headers = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      resData = await formPost(path, fd, { headers })

      const created = resData?.post || resData || null
      if (created) {
        // Do not add created post to public feed — status may be DRAFT.
        // Refresh status counts and user's posts view if open.
        await fetchPostStatusAnalysis()
        if (showMyPosts) {
          // refresh my posts list
          setMyPageNum(1)
          await fetchMyPosts(1)
        }
      } else {
        // fallback: refresh status counts
        await fetchPostStatusAnalysis()
        if (showMyPosts) {
          setMyPageNum(1)
          await fetchMyPosts(1)
        }
      }

      setComposerDraft('')
      setComposerTitle('')
      setComposerTitleError('')
      setComposerContentError('')
      // cleanup preview url
      if (previewUrlRef.current) {
        try { URL.revokeObjectURL(previewUrlRef.current) } catch (e) {}
        previewUrlRef.current = null
      }
      setComposerAttachments([])
      setSelectedAttachmentIndex(null)
      setComposerOpen(false)
      setPublishError(null)
    } catch (err) {
      console.error('Create post failed', err)
      setPublishError(err && (err.message || String(err)) || 'Failed to create post')
      // keep composer open so user can retry or inspect
    } finally {
      setPublishLoading(false)
    }
  }

  async function updatePost(postId, titleArg, content) {
    setPublishLoading(true)
    setPublishError(null)
    try {
      const trimmed = content && content.trim()
      // Determine if there are any new files to send
      const newFiles = attachments.filter((a) => a instanceof File)
      // Use the backend edit endpoint which accepts multipart/form-data.
      // Build FormData with a JSON `data` part (title/content) and optional `media` file.
      const pathBase = `announcement/api/v1/posts/public/edit/${postId}`
      const fd = new FormData()
      const dataObj = { title: titleArg }
      if (trimmed) dataObj.content = trimmed
      fd.append('data', new Blob([JSON.stringify(dataObj)], { type: 'application/json' }))

      // If backend expects a remove flag, set remove_media=true when any remote removals tracked
      const shouldRemoveMedia = !!(removedRemoteRef.current && removedRemoteRef.current.length)
      const path = shouldRemoveMedia ? `${pathBase}?remove_media=true` : pathBase

      if (newFiles.length > 0) {
        // append first file only (backend accepts single media)
        fd.append('media', newFiles[0])
      }

      const token = getAccessToken()
      const headers = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      const resData = await apiCall(path, { method: 'PUT', body: fd, headers })
      const updated = resData?.post || resData || null
      if (updated) {
        setPosts((prev) => prev.map((it) => (it.id === postId ? { ...it, title: updated.title || titleArg, content: updated.content || trimmed, attachments: updated.media_url ? [{ name: updated.media_url, url: updated.media_url }] : [] } : it)))
        setMyPosts((prev) => prev.map((it) => (it.id === postId ? { ...it, title: updated.title || titleArg, content: updated.content || trimmed, attachments: updated.media_url ? [{ name: updated.media_url, url: updated.media_url }] : [] } : it)))
      } else {
        setPosts((prev) => prev.map((it) => (it.id === postId ? { ...it, title: titleArg, content: trimmed } : it)))
        setMyPosts((prev) => prev.map((it) => (it.id === postId ? { ...it, title: titleArg, content: trimmed } : it)))
      }

      setEditingPostId(null)
      setComposerOpen(false)
      removedRemoteRef.current = []
      setAttachments([])
      await fetchPostStatusAnalysis()
    } catch (err) {
      console.error('Failed to update post', err)
      setPublishError(err.message || String(err))
    } finally {
      setPublishLoading(false)
    }
  }

  async function performDelete() {
    const id = pendingDeleteId
    if (!id) return
    setShowDeleteConfirm(false)
    try {
      // backend uses RESTful delete with path param
      if (isSecretaryUser) {
        await deleteRequest(`announcement/api/v1/posts/secretary/delete/post/${id}`)
      } else {
        await deleteRequest(`announcement/api/v1/posts/public/delete/${id}`)
      }
      setPosts((prev) => prev.filter((it) => it.id !== id))
      setMyPosts((prev) => prev.filter((it) => it.id !== id))
      await fetchPostStatusAnalysis()
    } catch (err) {
      console.error('Delete failed', err)
      alert('Delete failed: ' + (err.message || err))
    } finally {
      setPendingDeleteId(null)
    }
  }

  async function publishPost(postId) {
    if (!postId) return
    try {
      // call backend publish PATCH endpoint
      const path = `announcement/api/v1/posts/public/publish/${postId}`
      await apiCall(path, { method: 'PATCH' })
      // refresh my posts and status counts without popups
      setMyPageNum(1)
      await fetchMyPosts(1)
      await fetchPostStatusAnalysis()
    } catch (err) {
      console.error('Publish failed', err)
    }
  }

  async function toggleLike(postId) {
    if (!postId) return
    // optimistic update
    let reverted = false
    setPosts((prev) => prev.map((it) => {
      if (it.id !== postId) return it
      const nowLiked = !it.liked
      return { ...it, liked: nowLiked, likes: Math.max(0, it.likes + (nowLiked ? 1 : -1)) }
    }))
    setMyPosts((prev) => prev.map((it) => {
      if (it.id !== postId) return it
      const nowLiked = !it.liked
      return { ...it, liked: nowLiked, likes: Math.max(0, it.likes + (nowLiked ? 1 : -1)) }
    }))

    try {
      const path = `announcement/api/v1/likes/${postId}/like-toggle`
      await post(path, {})
    } catch (err) {
      console.error('Like toggle failed', err)
      // revert optimistic change
      reverted = true
      setPosts((prev) => prev.map((it) => (it.id === postId ? { ...it, liked: !it.liked, likes: Math.max(0, it.likes + (it.liked ? -1 : 1)) } : it)))
      setMyPosts((prev) => prev.map((it) => (it.id === postId ? { ...it, liked: !it.liked, likes: Math.max(0, it.likes + (it.liked ? -1 : 1)) } : it)))
    }
    return !reverted
  }

  async function fetchLikes(postId, page = 1) {
    if (!postId) return
    setLikesLoading(true)
    try {
      const path = `announcement/api/v1/likes/${postId}?page_num=${page}`
      const data = await get(path)
      const raw = Array.isArray(data) ? data : (Array.isArray(data?.users) ? data.users : [])
      // normalize items to { displayName, avatar }
      const users = raw.map((u) => {
        if (!u) return { displayName: '', seed: 'user', university_name: '' }
        if (typeof u === 'string') return { displayName: u, seed: u, university_name: '' }
        // assume object
        const displayName = u.name || u.fullName || u.full_name || u.first_name || u.username || u.email || String(u)
        const avatar = u.avatar || u.avatar_url || u.profile_image || u.photo_url || null
        const seed = displayName || u.email || u.id || u.user_id || String(u)
        const university_name = u.university_name || u.universityName || ''
        return { displayName, avatar, seed, university_name }
      })
      if (page === 1) setLikesList(users)
      else setLikesList((prev) => [...prev, ...users])
      setLikesPage(page)
      // backend returns LIKES_PAGE_SIZE items per page
      setLikesHasMore(users.length === LIKES_PAGE_SIZE)
      setLikesModalPostId(postId)
      setShowLikesModal(true)
    } catch (err) {
      console.error('Failed to fetch likes', err)
    } finally {
      setLikesLoading(false)
    }
  }

  async function fetchComments(postId, page = 1) {
    if (!postId) return
    setCommentsLoading(true)
    try {
      const path = `announcement/api/v1/comments/public/get-comments/${postId}?page_num=${page}`
      const data = await get(path)
      const raw = Array.isArray(data) ? data : (Array.isArray(data?.comments) ? data.comments : [])
      const comments = raw.map((c) => {
        const createdBy = c.created_by || c.createdBy || c.createdBy || 'User'
        const seed = createdBy || c.email || c.id || String(c)
        return {
          id: c.comment_id || c.cid || null,
          content: c.content || '',
          createdBy,
          createdAt: c.created_at || c.createdAt || null,
          updatedAt: c.updated_at || c.updatedAt || null,
          raw: c,
          seed,
        }
      })
      if (page === 1) setCommentsList(comments)
      else setCommentsList((prev) => [...prev, ...comments])
      setCommentsPage(page)
      if (typeof data?.has_more === 'boolean') {
        setCommentsHasMore(!!data.has_more)
      } else if (typeof data?.page_num === 'number' && typeof data?.total_pages === 'number') {
        setCommentsHasMore(Number(data.page_num) < Number(data.total_pages))
      } else {
        setCommentsHasMore(comments.length === COMMENTS_PAGE_SIZE)
      }
      setCommentsModalPostId(postId)
      setShowCommentsModal(true)
    } catch (err) {
      console.error('Failed to fetch comments', err)
    } finally {
      setCommentsLoading(false)
    }
  }

  async function deleteComment(commentId, postId) {
    if (!commentId) return
    // handle locally-created (temp) comments without calling the server
    if (String(commentId).startsWith('tmp-')) {
      let removedTopLevel = false
      setCommentsList((prev) => {
        const next = []
        for (const c of prev) {
          if (String(c.id) === String(commentId)) {
            removedTopLevel = true
            continue
          }
          if (c.replies && c.replies.length) {
            const filtered = c.replies.filter((r) => String(r.id) !== String(commentId))
            next.push({ ...c, replies: filtered })
          } else {
            next.push(c)
          }
        }
        return next
      })
      if (removedTopLevel) {
        setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, comments: Math.max(0, (p.comments||0) - 1) } : p)))
        setMyPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, comments: Math.max(0, (p.comments||0) - 1) } : p)))
      }
      return
    }
    try {
      if (isSecretaryUser) {
        // secretary deletes comment via secretary comments endpoint
        await deleteRequest(`announcement/api/v1/comments/secretary/delete/${postId}/${commentId}`)
      } else {
        await deleteRequest(`announcement/api/v1/comments/public/delete/${commentId}`)
      }
      // Remove either a top-level comment or a nested reply
      let removedTopLevel = false
      setCommentsList((prev) => {
        const next = []
        for (const c of prev) {
          if (String(c.id) === String(commentId)) {
            removedTopLevel = true
            continue
          }
          if (c.replies && c.replies.length) {
            const filtered = c.replies.filter((r) => String(r.id) !== String(commentId))
            next.push({ ...c, replies: filtered })
          } else {
            next.push(c)
          }
        }
        return next
      })
      // decrement counts on posts lists only for removed top-level comments
      if (removedTopLevel) {
        setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, comments: Math.max(0, (p.comments||0) - 1) } : p)))
        setMyPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, comments: Math.max(0, (p.comments||0) - 1) } : p)))
      }
    } catch (err) {
      console.error('Failed to delete comment', err)
      alert('Failed to delete comment')
    }
  }

  async function acceptPost(postId) {
    if (!postId) return
    try {
      const path = `announcement/api/v1/posts/secretary/accept/post/${postId}`
      const res = await apiCall(path, { method: 'PATCH' })
      // update local post status if returned
      const updated = res || {}
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, raw: updated, status: updated.status || updated.state || p.status } : p)))
      setMyPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, raw: updated, status: updated.status || updated.state || p.status } : p)))
      await fetchPostStatusAnalysis()
    } catch (err) {
      console.error('Failed to accept post', err)
      alert('Failed to accept post')
    }
  }

  async function rejectPost(postId) {
    if (!postId) return
    try {
      const path = `announcement/api/v1/posts/secretary/reject/post/${postId}`
      const res = await apiCall(path, { method: 'PATCH' })
      const updated = res || {}
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, raw: updated, status: updated.status || updated.state || p.status } : p)))
      setMyPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, raw: updated, status: updated.status || updated.state || p.status } : p)))
      await fetchPostStatusAnalysis()
    } catch (err) {
      console.error('Failed to reject post', err)
      alert('Failed to reject post')
    }
  }

  async function deletePostSecretary(postId) {
    if (!postId) return
    try {
      await deleteRequest(`announcement/api/v1/posts/secretary/delete/post/${postId}`)
      setPosts((prev) => prev.filter((p) => p.id !== postId))
      setMyPosts((prev) => prev.filter((p) => p.id !== postId))
      await fetchPostStatusAnalysis()
    } catch (err) {
      console.error('Failed to delete post (secretary)', err)
      alert('Failed to delete post')
    }
  }

  async function fetchReplies(commentId, page = 1) {
    if (!commentId) return
    setCommentsList((prev) => prev.map((c) => (String(c.id) === String(commentId) ? { ...c, repliesLoading: true } : c)))
    try {
      const path = `announcement/api/v1/comments/public/get-comments-reply/${commentId}?page_num=${page}`
      const data = await get(path)
      const raw = Array.isArray(data) ? data : (Array.isArray(data?.comments) ? data.comments : [])
      const replies = raw.map((r) => ({
        id: r.comment_id || r.cid || r.id || null,
        content: r.content || '',
        createdBy: r.created_by || r.createdBy || (user?.first_name || user?.name || user?.email),
        createdAt: r.created_at || r.createdAt || null,
        updatedAt: r.updated_at || r.updatedAt || null,
        raw: r,
      }))
      setCommentsList((prev) => prev.map((c) => {
        if (String(c.id) !== String(commentId)) return c
        const existing = c.replies || []
        const merged = page === 1 ? replies : [...existing, ...replies]
        const hasMore = (replies.length === COMMENTS_PAGE_SIZE)
        return { ...c, replies: merged, repliesPage: page, repliesHasMore: hasMore, repliesLoading: false, showReplies: true }
      }))
    } catch (err) {
      console.error('Failed to fetch replies', err)
      setCommentsList((prev) => prev.map((c) => (String(c.id) === String(commentId) ? { ...c, repliesLoading: false } : c)))
    }
  }

  async function createReply(commentId, content) {
    if (!commentId) return
    const trimmed = content && content.trim()
    if (!trimmed || trimmed.length < 1) return
    try {
      const path = `announcement/api/v1/comments/public/reply/${commentId}`
      const body = { content: trimmed }
      const res = await post(path, body)
      const r = res || {}
      const created = {
        id: r.comment_id || r.cid || r.id || null,
        content: r.content || trimmed,
        createdBy: r.created_by || r.createdBy || (user?.first_name || user?.name || user?.email),
        createdAt: r.created_at || r.createdAt || new Date().toISOString(),
        updatedAt: r.updated_at || r.updatedAt || null,
        raw: r,
      }
      if (!created.id) {
        const tmp = `tmp-reply-${Date.now()}-${Math.floor(Math.random() * 10000)}`
        created.id = tmp
        created.raw = { ...(created.raw || {}), _isTemp: true }
      }
      setCommentsList((prev) => prev.map((c) => {
        if (String(c.id) !== String(commentId)) return c
        const existing = c.replies || []
        return { ...c, replies: [created, ...existing], repliesPage: c.repliesPage || 1, showReplies: true }
      }))
      setReplyDrafts((prev) => ({ ...prev, [commentId]: '' }))
    } catch (err) {
      console.error('Failed to create reply', err)
    }
  }

  async function updateComment(commentId, content) {
    if (!commentId) return
    const trimmed = content && content.trim()
    if (!trimmed || trimmed.length < 2) {
      alert('Comment must be at least 2 characters')
      return
    }
    if (trimmed.length > 500) {
      alert('Comment cannot exceed 500 characters')
      return
    }
    try {
      const path = `announcement/api/v1/comments/public/update/${commentId}`
      const res = await apiCall(path, { method: 'PATCH', body: JSON.stringify({ content: trimmed }), headers: { 'Content-Type': 'application/json' } })
      const updated = res || {}
      // Update either a top-level comment or a nested reply
      setCommentsList((prev) => prev.map((c) => {
        if (String(c.id) === String(commentId)) {
          return { ...c, content: updated.content || trimmed, updatedAt: updated.updated_at || updated.updatedAt || new Date().toISOString(), raw: updated }
        }
        if (c.replies && c.replies.length) {
          const replies = c.replies.map((r) => (String(r.id) === String(commentId) ? { ...r, content: updated.content || trimmed, updatedAt: updated.updated_at || updated.updatedAt || new Date().toISOString(), raw: updated } : r))
          return { ...c, replies }
        }
        return c
      }))
      setEditingCommentId(null)
      setEditCommentDraft('')
    } catch (err) {
      console.error('Failed to update comment', err)
      alert('Failed to update comment')
    }
  }

  async function createComment(postId, content) {
    if (!postId) return
    const trimmed = content && content.trim()
    if (!trimmed || trimmed.length < 2) {
      setCommentsError('Comment must be at least 2 characters')
      return
    }
    if (trimmed.length > 500) {
      setCommentsError('Comment cannot exceed 500 characters')
      return
    }
    setCommentsSubmitting(true)
    setCommentsError('')
    try {
      const path = `announcement/api/v1/comments/public/create/${postId}`
      const body = { content: trimmed }
      const res = await post(path, body)
      // res expected to be CommentDto
      const c = res || {}
      const created = {
        id: c.comment_id || c.cid || c.id || null,
        content: c.content || trimmed,
        createdBy: c.created_by || c.createdBy || c.createdBy || (user?.first_name || user?.name || user?.email),
        createdAt: c.created_at || c.createdAt || new Date().toISOString(),
        updatedAt: c.updated_at || c.updatedAt || null,
        raw: c,
      }
      // ensure a stable temporary id for optimistic UI if server didn't return one
      if (!created.id) {
        const tmp = `tmp-comment-${Date.now()}-${Math.floor(Math.random() * 10000)}`
        created.id = tmp
        created.raw = { ...(created.raw || {}), _isTemp: true }
      }
      // prepend to comments list
      setCommentsList((prev) => [created, ...prev])
      // update counts in posts and myPosts
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, comments: (p.comments || 0) + 1 } : p)))
      setMyPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, comments: (p.comments || 0) + 1 } : p)))
      setCommentsDraft('')
    } catch (err) {
      console.error('Failed to create comment', err)
      setCommentsError(err?.message || 'Failed to create comment')
    } finally {
      setCommentsSubmitting(false)
    }
  }

  function openLikesModal(postId) {
    // open modal immediately, then load likes
    setLikesList([])
    setLikesPage(1)
    setLikesHasMore(false)
    setLikesModalPostId(postId)
    setShowLikesModal(true)
    fetchLikes(postId, 1)
  }

  function openCommentsModal(postId) {
    // open comments modal immediately, then load comments
    setCommentsList([])
    setCommentsPage(1)
    setCommentsHasMore(false)
    setCommentsModalPostId(postId)
    setShowCommentsModal(true)
    fetchComments(postId, 1)
  }

  function handleLikesScroll(e) {
    const el = likesContentRef.current || e.currentTarget
    if (!el || likesLoading || !likesHasMore) return
    const { scrollTop, scrollHeight, clientHeight } = el
    if (scrollTop + clientHeight >= scrollHeight - 80) {
      // load next page
      if (!likesModalPostId) return
      fetchLikes(likesModalPostId, likesPage + 1)
    }
  }

  function handleCommentsScroll(e) {
    const el = commentsContentRef.current || e.currentTarget
    if (!el || commentsLoading || !commentsHasMore || !commentsScrollEnabled) return
    const { scrollTop, scrollHeight, clientHeight } = el
    if (scrollTop + clientHeight >= scrollHeight - 80) {
      if (!commentsModalPostId) return
      fetchComments(commentsModalPostId, commentsPage + 1)
    }
  }

  function closeLikesModal() {
    setShowLikesModal(false)
    setLikesList([])
    setLikesModalPostId(null)
    setLikesPage(1)
    setLikesHasMore(false)
    setLikesLoading(false)
  }

  function closeCommentsModal() {
    setShowCommentsModal(false)
    setCommentsList([])
    setCommentsModalPostId(null)
    setCommentsPage(1)
    setCommentsHasMore(false)
    setCommentsLoading(false)
    setCommentsScrollEnabled(false)
  }

  function handleAttachFiles(files) {
    const list = Array.from(files || []).slice(0, 1) // only allow one media
    if (list.length === 0) return
    // if replacing while editing, mark existing remote attachments for removal
    if (editingPostId) {
      const existingRemote = (attachments || []).filter(a => a.remote && (a.name || a.url)).map(a => a.name || a.url)
      if (existingRemote.length) removedRemoteRef.current = [...removedRemoteRef.current, ...existingRemote]
    }
    // revoke previous preview if any
    if (previewUrlRef.current) {
      try { URL.revokeObjectURL(previewUrlRef.current) } catch (e) {}
      previewUrlRef.current = null
      setLightboxUrl(null)
      setSelectedAttachmentIndex(null)
    }
    setAttachments(list)
    // if file is image or video, set preview url for quick preview
    const f = list[0]
    if (f && f.type && f.type.startsWith) {
      try {
        const url = URL.createObjectURL(f)
        previewUrlRef.current = url
        previewTypeRef.current = f.type || null
        setLightboxUrl(url)
      } catch (e) {}
    }
    setShowFileModal(false)
  }

  // composer-specific attach (top composer)
  function handleComposerAttachFiles(files) {
    const list = Array.from(files || []).slice(0, 1)
    if (list.length === 0) return
    // revoke previous preview if any
    if (previewUrlRef.current) {
      try { URL.revokeObjectURL(previewUrlRef.current) } catch (e) {}
      previewUrlRef.current = null
      setLightboxUrl(null)
      setSelectedAttachmentIndex(null)
    }
    setComposerAttachments(list)
    const f = list[0]
    if (f && f.type && f.type.startsWith) {
      try { const url = URL.createObjectURL(f); previewUrlRef.current = url; previewTypeRef.current = f.type || null; setLightboxUrl(url) } catch (e) {}
    }
    setShowFileModal(false)
  }
  function removeAttachment(index) {
    // revoke preview url if it belongs to this file
      setAttachments((prev) => {
        const item = prev[index]
        if (item) {
          if (item.remote && (item.name || item.url)) {
            removedRemoteRef.current = [...removedRemoteRef.current, item.name || item.url]
          }
        }
        const next = prev.filter((_, i) => i !== index)
        // adjust selectedAttachmentIndex and preview
        setSelectedAttachmentIndex((cur) => {
          if (cur == null) return null
          if (cur === index) {
              try { URL.revokeObjectURL(previewUrlRef.current) } catch (e) {}
              previewUrlRef.current = null
              previewTypeRef.current = null
              setLightboxUrl(null)
              return null
            }
          return cur > index ? cur - 1 : cur
        })
        return next
      })
  }

    function removeComposerAttachment(index) {
      setComposerAttachments((prev) => {
        const item = prev[index]
        if (item && item.remote && (item.name || item.url)) {
          // mark remote for removal if editing/upload replacement
          removedRemoteRef.current = [...removedRemoteRef.current, item.name || item.url]
        }
        const next = prev.filter((_, i) => i !== index)
        setComposerSelectedAttachmentIndex((cur) => {
          if (cur == null) return null
          if (cur === index) {
              try { URL.revokeObjectURL(previewUrlRef.current) } catch (e) {}
              previewUrlRef.current = null
              previewTypeRef.current = null
              setLightboxUrl(null)
              return null
            }
          return cur > index ? cur - 1 : cur
        })
        return next
      })
    }

  function selectAttachment(i) {
    if (i == null) return
    const f = attachments[i]
    setSelectedAttachmentIndex(i)
    if (f && f.type && f.type.startsWith) {
      // revoke previous
      if (previewUrlRef.current) {
        try { URL.revokeObjectURL(previewUrlRef.current) } catch (e) {}
      }
      const url = URL.createObjectURL(f)
      previewUrlRef.current = url
      previewTypeRef.current = f.type || null
      setLightboxUrl(url)
    } else {
      // not a previewable file - clear lightbox but keep selection
      if (previewUrlRef.current) {
        try { URL.revokeObjectURL(previewUrlRef.current) } catch (e) {}
        previewUrlRef.current = null
        previewTypeRef.current = null
      }
      setLightboxUrl(null)
    }
  }

  function selectComposerAttachment(i) {
    if (i == null) return
    const f = composerAttachments[i]
    setComposerSelectedAttachmentIndex(i)
    if (f && f.type && f.type.startsWith) {
      if (previewUrlRef.current) {
        try { URL.revokeObjectURL(previewUrlRef.current) } catch (e) {}
      }
      const url = URL.createObjectURL(f)
      previewUrlRef.current = url
      previewTypeRef.current = f.type || null
      setLightboxUrl(url)
    } else {
      if (previewUrlRef.current) {
        try { URL.revokeObjectURL(previewUrlRef.current) } catch (e) {}
        previewUrlRef.current = null
        previewTypeRef.current = null
      }
      setLightboxUrl(null)
    }
  }

  function handleFileInputChange(e) {
    handleComposerAttachFiles(e.target.files)
  }

  function handleDrop(e) {
    e.preventDefault()
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
      handleAttachFiles(e.dataTransfer.files)
    }
  }

  function handleDragOver(e) {
    e.preventDefault()
  }

  // Removed old AttachmentRenderer (replaced by top-level memoized AttachmentRendererMemo)

  return (
    <div className="unihub-feed-container full-height">
      <div className="unihub-left">
        <div ref={composerRef} className={`composer-card ${composerOpen ? 'open' : ''}`}>
          <div className="composer-inner" role="button" tabIndex={0}>
            <div className="composer-indicator" />
            <div className="composer-avatar">{(user?.first_name || user?.firstName || user?.name || user?.email || initial).charAt(0).toUpperCase()}</div>
            <div className="composer-placeholder">What's on your mind?</div>
                  {composerAttachments.length > 0 && !editingPostId ? (
              <div className="composer-attachment-badge" aria-hidden>{composerAttachments.length}</div>
            ) : null}
            <button type="button" className={`composer-action ${composerOpen ? 'open' : ''}`} onClick={() => setComposerOpen((s) => !s)} aria-expanded={composerOpen} aria-label="Open composer">›</button>
          </div>

          {composerOpen ? (
            <div className="composer-dropdown" onClick={(e) => e.stopPropagation()}>
              <form onSubmit={handleSubmit}>
                <input
                  type="text"
                  value={composerTitle}
                  onChange={(e) => {
                    const v = e.target.value
                    setComposerTitle(v)
                    const trimmed = v.trim()
                    const invalidChars = /[<>]/.test(trimmed)
                    if (!trimmed) {
                      setTitleError('')
                    } else if (invalidChars) {
                      setTitleError('Title contains invalid characters')
                    } else if (trimmed.length < 3) {
                      setTitleError('Title must be at least 3 characters')
                    } else if (trimmed.length > 70) {
                      setTitleError('Title cannot exceed 70 characters')
                    } else {
                      setTitleError('')
                    }
                  }}
                  placeholder="Title"
                  className={`composer-title ${titleError ? 'error' : ''}`}
                  maxLength={70}
                  aria-invalid={!!titleError}
                />
                {composerTitleError ? <div className="composer-title-error" role="alert">{composerTitleError}</div> : null}
                <div className="composer-title-counter">{(composerTitle || '').length}/70</div>
                <textarea
                  ref={textareaRef}
                  value={composerDraft}
                  onChange={(e) => {
                    const v = e.target.value
                    setComposerDraft(v)
                    autoResize()
                    const trimmed = v.trim()
                    if (!trimmed) {
                      setComposerContentError('')
                    } else if (trimmed.length < 10) {
                      setComposerContentError('Content must be at least 10 characters')
                    } else if (trimmed.length > 10000) {
                      setComposerContentError('Content cannot exceed 10000 characters')
                    } else {
                      setComposerContentError('')
                    }
                  }}
                  placeholder={`What's on your mind, ${author}?`}
                  rows={2}
                  className="composer-textarea"
                />
                {composerContentError ? <div className="composer-title-error" role="alert">{composerContentError}</div> : null}
                {publishError ? <div className="publish-error" role="alert" style={{ color: '#b00020', marginTop: 8 }}>{publishError}</div> : null}
                {composerAttachments && composerAttachments.length > 0 ? (
                  <div className="composer-attachments" style={{ marginTop: 12 }}>
                    {composerAttachments.map((f, i) => (
                        <div
                        key={i}
                        className={`composer-attachment ${composerSelectedAttachmentIndex === i ? 'selected' : ''}`}
                        style={{ marginRight: 8, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                      >
                        <div
                          className="attachment-name"
                          title={f.name}
                          style={{ marginRight: 12, cursor: (f.type && f.type.startsWith && f.type.startsWith('image/')) ? 'pointer' : 'default' }}
                          onClick={() => selectComposerAttachment(i)}
                        >{f.name || f.url}</div>
                        <button type="button" className="remove-attachment" onClick={() => removeComposerAttachment(i)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, color: '#b00020' }} aria-label={`Remove ${f.name || f.url}`}>×</button>
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="composer-dropdown-actions">
                  <button type="button" className="file-button composer-btn" onClick={() => setShowFileModal(true)} style={{ background: 'var(--brand-lime-dark)', color: '#000' }}>Upload media</button>
                  <input type="file" id="composer-file-input" accept="image/*,video/*,application/pdf" style={{ display: 'none' }} onChange={(e) => handleComposerAttachFiles(e.target.files)} />
                  <button type="button" className="clear-btn composer-btn" onClick={() => { setComposerDraft(''); setComposerAttachments([]); setComposerTitle(''); setComposerTitleError(''); setComposerContentError('') }} disabled={publishLoading}>Clear</button>
                  <button type="submit" className="composer-btn composer-submit" disabled={publishLoading || !!titleError}>{publishLoading ? 'Publishing...' : 'Publish'}</button>
                </div>
              </form>
            </div>
          ) : null}
        </div>

        <div className="posts-scrollable" ref={postsListRef}>
          <div className="posts-list">
          {/* Render myPosts when in My Posts mode, otherwise public posts */}
          {(() => {
            const displayList = showMyPosts ? myPosts : posts
            const isLoading = showMyPosts ? myLoading : loading
            if (isLoading && displayList.length === 0) {
              return <div style={{ padding: 20, textAlign: 'center', color: '#6B7280' }}>Loading posts…</div>
            }
            if (displayList.length === 0) {
              return <div style={{ padding: 20, textAlign: 'center', color: '#6B7280' }}>No posts to show</div>
            }
            return displayList.map((p) => (
              <div key={p.id} className="card post-card" style={{ position: 'relative' }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  {/* owner menu */}
                  {!secretary && user && (isOwner(p) || isSecretaryUser) ? (
                    <div style={{ position: 'absolute', right: 18, top: 18, zIndex: 1400 }}>
                      <button data-menu-trigger aria-label="Post menu" onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === p.id ? null : p.id) }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18 }}>⋯</button>
                      {openMenuId === p.id ? (
                        <div data-menu-content onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', right: 0, top: 28, background: '#fff', borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,0.12)', padding: 6, minWidth: 120, zIndex: 1500 }}>
                          {isOwner(p) ? (
                            <button onClick={() => { setEditingPostId(p.id); setTitle(p.title || ''); setTitleError(''); setDraft(p.content || ''); setContentError(''); setAttachments((p.attachments || []).map(a => ({ name: a.name, url: a.url, remote: true }))); removedRemoteRef.current = []; setOpenMenuId(null); setComposerOpen(false) }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', border: 'none', background: 'transparent', cursor: 'pointer' }}>Edit</button>
                          ) : null}
                          <button onClick={() => { setOpenMenuId(null); setPendingDeleteId(p.id); setShowDeleteConfirm(true) }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#b00020' }}>Delete</button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#F87171', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>{p.author ? p.author.charAt(0).toUpperCase() : 'U'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ fontWeight: 800 }}>{p.author}</div>
                      {/* Removed status display next to author */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#374151', fontSize: 15, fontWeight: 600 }}>
                        <img src="/earth.png" alt="public" style={{ width: 14, height: 14, opacity: 0.8 }} />
                        <span>{p.time && typeof p.time === 'string' && p.time.length > 5 ? p.time : (() => {
                          // fallback: show date and time if not present
                          const d = new Date(p.raw?.created_at || p.raw?.createdAt);
                          if (isNaN(d.getTime())) return '-';
                          const date = d.toLocaleDateString('en-CA');
                          const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                          return `${date} ${time}`;
                        })()}</span>
                        {(() => {
                          const raw = p.raw || {}
                          const updated = raw.updated_at || raw.updatedAt || null
                          const created = raw.created_at || raw.createdAt || null
                          const updatedTs = updated ? Date.parse(updated) : null;
                          const createdTs = created ? Date.parse(created) : null;
                          // Only show 'updated' if difference is more than 1 minute (60,000 ms)
                          if (updatedTs && createdTs && updatedTs - createdTs > 60000) {
                            return <span style={{ marginLeft: 6 }}>• updated</span>
                          }
                          return null
                        })()}
                      </div>
                    </div>
                        {editingPostId === p.id ? (
                      <form onSubmit={(e) => { e.preventDefault(); updatePost(p.id, title, draft) }} style={{ marginTop: 8 }}>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => { const v = e.target.value; setTitle(v); const trimmed = v.trim(); const invalidChars = /[<>]/.test(trimmed); if (!trimmed) setTitleError(''); else if (invalidChars) setTitleError('Title contains invalid characters'); else if (trimmed.length < 3) setTitleError('Title must be at least 3 characters'); else if (trimmed.length > 70) setTitleError('Title cannot exceed 70 characters'); else setTitleError('') }}
                          placeholder="Title"
                          className={`composer-title ${titleError ? 'error' : ''}`}
                          maxLength={70}
                          aria-invalid={!!titleError}
                          style={{ margin: '8px auto', display: 'block', width: '90%', textAlign: 'left' }}
                        />
                        {titleError ? <div className="composer-title-error" role="alert">{titleError}</div> : null}
                        <div className="composer-title-counter">{(title || '').length}/70</div>
                        <textarea
                          value={draft}
                          onChange={(e) => { const v = e.target.value; setDraft(v); autoResize(); const trimmed = v.trim(); if (!trimmed) setContentError(''); else if (trimmed.length < 10) setContentError('Content must be at least 10 characters'); else if (trimmed.length > 10000) setContentError('Content cannot exceed 10000 characters'); else setContentError('') }}
                          placeholder={"What's on your mind, " + author + '?'}
                          rows={3}
                          className="composer-textarea"
                          style={{ marginTop: 6, display: 'block', width: '90%', marginLeft: 'auto', marginRight: 'auto', textAlign: 'left' }}
                        />
                        {contentError ? <div className="composer-title-error" role="alert">{contentError}</div> : null}
                        {/* Inline attachment UI */}
                        {attachments && attachments.length > 0 ? (
                          <div className="composer-attachments" style={{ marginTop: 12 }}>
                            {attachments.map((f, i) => (
                              <div key={i} className={`composer-attachment ${selectedAttachmentIndex === i ? 'selected' : ''}`} style={{ marginRight: 8, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div className="attachment-name" title={f.name} style={{ marginRight: 12, cursor: (f.type && f.type.startsWith && f.type.startsWith('image/')) ? 'pointer' : 'default' }} onClick={() => selectAttachment(i)}>{f.name || f.url}</div>
                                <button type="button" className="remove-attachment" onClick={() => removeAttachment(i)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, color: '#b00020' }} aria-label={`Remove ${f.name || f.url}`}>×</button>
                              </div>
                            ))}
                          </div>
                        ) : null}
                        <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', justifyContent: 'center' }}>
                              <input type="file" id={`post-edit-file-input-${p.id}`} accept="image/*,video/*,application/pdf" style={{ display: 'none' }} onChange={(e) => handleAttachFiles(e.target.files)} />
                          <button type="button" className="file-button composer-btn" onClick={() => document.getElementById(`post-edit-file-input-${p.id}`).click()} style={{ background: 'var(--brand-lime-dark)', color: '#000' }}>Upload media</button>
                          <button type="button" className="clear-btn composer-btn" onClick={() => { setEditingPostId(null); setTitle(''); setDraft(''); setTitleError(''); setContentError(''); setAttachments([]); removedRemoteRef.current = [] }} style={{ marginRight: 8 }}>Cancel</button>
                          <button type="submit" className="composer-btn composer-submit" disabled={publishLoading || !!titleError}>{publishLoading ? 'Saving...' : 'Save'}</button>
                        </div>
                      </form>
                    ) : (
                      <>
                        {p.title ? <div style={{ fontWeight: 800, marginTop: 8 }}>{p.title}</div> : null}
                        {p.content ? <div style={{ whiteSpace: 'pre-wrap', marginTop: 10, color: '#111' }}>{p.content}</div> : null}
                      </>
                    )}

                    {(() => {
                      const renderAttachments = (editingPostId === p.id) ? attachments : p.attachments
                      if (!renderAttachments || renderAttachments.length === 0) return null
                      return (
                        <div className="attachment-wrapper" style={{ marginTop: 12 }}>
                          {renderAttachments.map((a, i) => {
                                    const isFile = a instanceof File
                                    // Prefer explicit preview on the attachment if present, otherwise fallback to global preview
                                    const src = a.url || (isFile ? (a.preview || previewUrlRef.current) : null)
                                    const stableKey = `${p.id}-att-${(a && (a.url || a.name)) || i}`
                                    return <AttachmentRendererMemo key={stableKey} url={src} type={a && (a.type || a.media_type)} name={a && (a.name || a.url)} openLightbox={openLightbox} />
                                  })}
                        </div>
                      )
                    })()}

                    {/* Post status at the bottom for activity management - only show when secretary uses status filter */}
                    {!showMyPosts && secretary && secretaryStatusFilter && (() => {
                      const raw = p.raw || {}
                      const st = raw.status || raw.status_name || raw.state || p.status || ''
                      const s = String(st || '').toUpperCase()
                      let label = s
                      let bg = '#E5E7EB'
                      let color = '#111'
                      if (s === 'ACCEPTED' || s === 'APPROVED') { label = 'Accepted'; bg = '#DBEAFE'; color = '#0369A1' }
                      else if (s === 'PENDING') { label = 'Pending'; bg = '#FFFBEB'; color = '#B45309' }
                      else if (s === 'REJECTED' || s === 'REJECT') { label = 'Rejected'; bg = '#FEF2F2'; color = '#B91C1C' }
                      else if (s === 'DRAFT') { label = 'Draft'; bg = '#F3F4F6'; color = '#6B7280' }
                      return (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                          <div className="post-status" style={{ padding: '6px 10px', borderRadius: 999, background: bg, color, fontWeight: 700, fontSize: 13 }}>{label}</div>
                        </div>
                      )
                    })()}

                    <div className="post-actions" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div className="action-item" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button type="button" onClick={() => toggleLike(p.id)} style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }} aria-label="Like">
                            <img className="action-icon" src={p.liked ? '/like_black.png' : '/like.png'} alt="like" />
                          </button>
                          <button type="button" onClick={() => openLikesModal(p.id)} style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit' }} aria-label={`View likes for post ${p.id}`}>
                            <span>{p.likes}</span>
                          </button>
                        </div>
                        <div className="action-item"><img className="action-icon" src="/comment.png" alt="comment"/> <button type="button" onClick={() => openCommentsModal(p.id)} style={{ background: 'transparent', border: 'none', padding: 0, margin: 0, cursor: 'pointer', color: 'inherit' }} aria-label={`View comments for post ${p.id}`}><span>{p.comments}</span></button></div>
                      </div>
                      {secretary ? (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          {(() => {
                            const raw = p.raw || {}
                            const st = raw.status || raw.status_name || raw.state || p.status || ''
                            const s = String(st || '').toUpperCase()
                            return (
                              <>
                                {s !== 'ACCEPTED' && s !== 'APPROVED' ? (
                                  <button type="button" onClick={() => acceptPost(p.id)} style={{ padding: '6px 10px', borderRadius: 8, border: 'none', background: '#10B981', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>Accept</button>
                                ) : null}
                                {s !== 'REJECTED' && s !== 'REJECT' ? (
                                  <button type="button" onClick={() => rejectPost(p.id)} style={{ padding: '6px 10px', borderRadius: 8, border: 'none', background: '#F97316', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>Reject</button>
                                ) : null}
                              </>
                            )
                          })()}
                          <button type="button" onClick={() => { setPendingDeleteId(p.id); setShowDeleteConfirm(true) }} style={{ padding: '6px 10px', borderRadius: 8, border: 'none', background: '#EF4444', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>Delete</button>
                        </div>
                      ) : (showMyPosts ? (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          {(() => {
                            const st = (p.raw && (p.raw.status || p.raw.status_name || p.raw.state)) || p.status || ''
                            const s = String(st || '').toUpperCase()
                            let label = s
                            let bg = '#E5E7EB'
                            let color = '#111'
                            if (s === 'ACCEPTED' || s === 'APPROVED') { label = 'Accepted'; bg = '#DBEAFE'; color = '#0369A1' }
                            else if (s === 'PENDING') { label = 'Pending'; bg = '#FFFBEB'; color = '#B45309' }
                            else if (s === 'REJECTED' || s === 'REJECT') { label = 'Rejected'; bg = '#FEF2F2'; color = '#B91C1C' }
                            else if (s === 'DRAFT') { label = 'Draft'; bg = '#F3F4F6'; color = '#6B7280' }
                            return (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div className="post-status" style={{ padding: '6px 10px', borderRadius: 999, background: bg, color, fontWeight: 700, fontSize: 13 }}>{label}</div>
                                {s === 'DRAFT' ? (
                                  <button
                                    type="button"
                                    className="post-action-btn"
                                    onClick={() => publishPost(p.id)}
                                    style={{
                                      padding: '6px 12px',
                                      borderRadius: 999,
                                      border: 'none',
                                      background: 'var(--brand-lime-dark)',
                                      color: '#000',
                                      cursor: 'pointer',
                                      fontWeight: 700,
                                      boxShadow: '0 2px 8px rgba(157,217,87,0.12)'
                                    }}
                                  >Post</button>
                                ) : null}
                              </div>
                            )
                          })()}
                        </div>
                      ) : null)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          })()}
            <div ref={sentinelRef} style={{ height: 1 }} />
            {(showMyPosts ? myLoading : loading) && (showMyPosts ? myPosts.length > 0 : posts.length > 0) ? <div style={{ padding: 12, textAlign: 'center', color: '#6B7280' }}>Loading more…</div> : null}
            {(!showMyPosts && !loading && !hasMore && posts.length > 0) ? <div style={{ padding: 12, textAlign: 'center', color: '#6B7280' }}>No more posts</div> : null}
            {(showMyPosts && !myLoading && !myHasMore && myPosts.length > 0) ? <div style={{ padding: 12, textAlign: 'center', color: '#6B7280' }}>No more posts</div> : null}
          </div>
        </div>
      </div>

      <aside className="unihub-right">
        <div className="card manage-card" style={{ minHeight: 320, transition: 'min-height 0.2s', position: 'sticky', top: 32, zIndex: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 4, height: 20, background: '#B9FF66', borderRadius: 4 }} />
                <h3 className="manage-title" style={{ margin: 0 }}>Manage your posts</h3>
              </div>
              {/* secretary filter moved below the status list for better placement */}
          </div>

          <div className="manage-progress" style={{ marginTop: 12 }}>
            {(() => {
              const accepted = Number(statusCounts['ACCEPTED'] ?? statusCounts['APPROVED'] ?? 0)
              const pending = Number(statusCounts['PENDING'] ?? 0)
              const rejected = Number(statusCounts['REJECTED'] ?? statusCounts['REJECT'] ?? 0)
              const drafts = Number(statusCounts['DRAFT'] ?? 0)
              const total = accepted + pending + rejected + drafts
              if (total === 0) {
                return (
                  <>
                    <div className="bar blue" style={{ flex: 1 }} />
                    <div className="bar yellow" style={{ flex: 1 }} />
                    <div className="bar red" style={{ flex: 1 }} />
                    <div className="bar gray" style={{ flex: 1 }} />
                  </>
                )
              }
              return (
                <>
                  <div className="bar blue" style={{ flex: accepted }} />
                  <div className="bar yellow" style={{ flex: pending }} />
                  <div className="bar red" style={{ flex: rejected }} />
                  <div className="bar gray" style={{ flex: drafts }} />
                </>
              )
            })()}
          </div>

          <ul className="manage-list" style={{ listStyle: 'none', padding: 0, marginTop: 16 }}>
            <li>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span className="dot blue" />Accepted
              </span>
              <strong>{statusCounts['ACCEPTED'] ?? statusCounts['APPROVED'] ?? 0}</strong>
            </li>
            <li>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span className="dot yellow" />Pending
              </span>
              <strong>{statusCounts['PENDING'] ?? 0}</strong>
            </li>
            <li>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span className="dot red" />Rejected
              </span>
              <strong>{statusCounts['REJECTED'] ?? statusCounts['REJECT'] ?? 0}</strong>
            </li>
            <li>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span className="dot gray" />Drafts
              </span>
              <strong>{statusCounts['DRAFT'] ?? 0}</strong>
            </li>
          </ul>

          {secretary ? (
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {['PENDING', 'ACCEPTED', 'REJECTED'].map((opt) => {
                  const label = opt.charAt(0) + opt.slice(1).toLowerCase()
                  const active = String(secretaryStatusFilter || '') === String(opt || '')
                  return (
                    <button key={opt} onClick={(e) => { e.stopPropagation(); setSecretaryStatusFilter(opt); setPageNum(1); setPosts([]) }} style={{
                      padding: '6px 18px',
                      borderRadius: 999,
                      border: active ? '2px solid #b9ff66' : '1px solid #E5E7EB',
                      background: active ? 'var(--brand-lime-dark)' : '#FFF',
                      color: active ? '#000' : '#111',
                      cursor: 'pointer',
                      fontWeight: 700,
                      boxShadow: active ? '0 4px 16px rgba(34,197,94,0.08)' : 'none',
                      position: 'relative',
                      outline: active ? '2px solid #b9ff66' : 'none',
                      outlineOffset: active ? '1px' : '0'
                    }}>{label}</button>
                  )
                })}
              </div>
            </div>
          ) : null}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {(!secretary) && <div style={{ width: 4, height: 20, background: '#B9FF66', borderRadius: 4 }} />}
              {(showMyPosts || !secretary) ? <div style={{ fontWeight: 800 }}>{showMyPosts ? 'See public posts' : 'See your posts'}</div> : null}
            </div>
            <button
              onClick={() => {
                if (showMyPosts) {
                  // go back to public
                  setShowMyPosts(false)
                  setPageNum(1)
                  setPosts([])
                  fetchPosts(1)
                } else {
                  // open my posts
                  setShowMyPosts(true)
                  setMyPageNum(1)
                  setMyPosts([])
                  fetchMyPosts(1)
                }
              }}
              aria-label={showMyPosts ? 'See public posts' : (secretary ? '' : 'See your posts')}
              title={showMyPosts ? 'See public posts' : (secretary ? '' : 'See your posts')}
              style={{ fontSize: 26, background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px 10px', lineHeight: 1, display: secretary ? 'none' : undefined }}
            >{showMyPosts ? '‹' : '›'}</button>
          </div>
        </div>
      </aside>
      {showDeleteConfirm ? (
        <PostDeleteModal
          open={showDeleteConfirm}
          title="Delete Post"
          message="Are you sure you want to permanently delete this post? This action cannot be undone."
          onConfirm={performDelete}
          onCancel={() => { setShowDeleteConfirm(false); setPendingDeleteId(null) }}
        />
      ) : null}
      {showDeleteCommentConfirm ? (
        <PostDeleteModal
          open={showDeleteCommentConfirm}
          title="Delete Comment"
          message="Are you sure you want to permanently delete this comment? This action cannot be undone."
          onConfirm={async () => {
            try {
              await deleteComment(pendingDeleteCommentId, pendingDeleteCommentPostId || commentsModalPostId)
            } finally {
              setShowDeleteCommentConfirm(false)
              setPendingDeleteCommentId(null)
              setPendingDeleteCommentPostId(null)
            }
          }}
          onCancel={() => { setShowDeleteCommentConfirm(false); setPendingDeleteCommentId(null); setPendingDeleteCommentPostId(null) }}
        />
      ) : null}
        {showFileModal ? createPortal(
        <div className="file-modal-overlay" onClick={() => setShowFileModal(false)}>
          <div
              className="file-modal"
              onClick={(e) => e.stopPropagation()}
              onDragOver={handleDragOver}
              onDragEnter={handleDragOver}
              onDrop={handleDrop}
            >
              <div className="file-modal-content" onClick={() => modalInputRef.current && modalInputRef.current.click()}>
                <div className="file-modal-cloud">
                  <img src="/cloud.png" className="file-cloud-img" alt="Upload" />
                </div>
                <p>Drag & drop a single file here (image, video, or PDF), or click to choose</p>
                <input ref={modalInputRef} type="file" accept="image/*,video/*,application/pdf" style={{ display: 'none' }} onChange={handleFileInputChange} />
              </div>
            </div>
        </div>
      , document.body) : null}
        {lightboxUrl ? createPortal(
          <div className="lightbox-overlay" onClick={() => setLightboxUrl(null)}>
            <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const url = lightboxUrl || ''
              const low = String(url).toLowerCase()
              const mime = previewTypeRef.current || ''
              const isVideo = (mime && mime.startsWith && mime.startsWith('video/')) || low.endsWith('.mp4') || low.endsWith('.webm')
              if (isVideo) {
                return (
                  <video controls src={url} className="lightbox-video" style={{ maxWidth: '90vw', maxHeight: '90vh', width: '100%', height: 'auto', borderRadius: 12 }} />
                )
              }
              return (
                <img
                  ref={lightboxImgRef}
                  src={url}
                  alt="attachment"
                  className="lightbox-img"
                  onLoad={(e) => {
                    const img = e.currentTarget
                    const nw = img.naturalWidth || 0
                    const nh = img.naturalHeight || 0
                    if (!nw || !nh) return
                    const maxW = Math.floor(window.innerWidth * 0.9)
                    const maxH = Math.floor(window.innerHeight * 0.9)
                    const scale = Math.min(1, maxW / nw, maxH / nh)
                    img.style.width = Math.floor(nw * scale) + 'px'
                    img.style.height = 'auto'
                  }}
                  decoding="async"
                />
              )
            })()}
            <button className="lightbox-close" onClick={() => setLightboxUrl(null)} aria-label="Close">×</button>
          </div>
          </div>
        , document.body) : null}
      {showLikesModal ? createPortal(
        <div className="file-modal-overlay" onClick={closeLikesModal}>
          <div className="likes-modal" onClick={(e) => e.stopPropagation()}>
            <div className="likes-modal-header">
              <h3>Likes</h3>
              <button className="likes-modal-close" onClick={closeLikesModal} aria-label="Close">×</button>
            </div>
            <div className="likes-modal-body">
              {likesLoading ? (
                <div className="likes-loading">Loading…</div>
              ) : likesList && likesList.length > 0 ? (
                <div ref={likesContentRef} onScroll={handleLikesScroll} className="likes-list-scroll">
                  <ul className="likes-list">
                    {likesList.map((u, i) => (
                      <li key={i} className="likes-list-item">
                        {u.avatar ? (
                          <img src={u.avatar} alt={u.displayName} className="likes-avatar" />
                        ) : (
                          <div className="likes-avatar likes-avatar-fallback">{(u.university_name || u.displayName || '').charAt(0).toUpperCase()}</div>
                        )}
                        <div className="likes-name">{u.displayName}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="likes-empty">No likes yet</div>
              )}
            </div>
            <div className="likes-modal-footer">
              {likesHasMore ? (
                <button className="likes-load-more" onClick={() => fetchLikes(likesModalPostId, likesPage + 1)} disabled={likesLoading}>
                  {likesLoading ? 'Loading…' : 'Load more'}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      , document.body) : null}
      {showCommentsModal ? createPortal(
        <div className="file-modal-overlay" onClick={closeCommentsModal}>
          <div className="comments-modal" onClick={(e) => e.stopPropagation()}>
            <div className="comments-modal-header">
              <h3>Comments</h3>
              <button className="comments-modal-close" onClick={closeCommentsModal} aria-label="Close">×</button>
            </div>
            <div className="comments-modal-body">
              <div className="comments-input-chat">
                <div className="comments-avatar">{initial}</div>
                <div className="comments-bubble">
                  <input
                    type="text"
                    value={commentsDraft}
                    onChange={(e) => { setCommentsDraft(e.target.value); if (commentsError) setCommentsError('') }}
                    placeholder="Write a comment..."
                    className="comments-bubble-input"
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); createComment(commentsModalPostId, commentsDraft) } }}
                  />
                </div>
                <button className="comments-send" type="button" onClick={() => createComment(commentsModalPostId, commentsDraft)} disabled={commentsSubmitting || (commentsDraft || '').trim().length < 2}>{commentsSubmitting ? '...' : 'Send'}</button>
              </div>
              {commentsError ? <div className="comments-error" role="alert" style={{ color: '#b00020', marginTop: 6 }}>{commentsError}</div> : null}
              {commentsLoading ? (
                <div className="comments-loading">Loading…</div>
              ) : commentsList && commentsList.length > 0 ? (
                <div ref={commentsContentRef} onScroll={handleCommentsScroll} className={`comments-list-scroll ${commentsScrollEnabled ? 'scroll-enabled' : ''}`}>
                  <ul className="comments-list">
                    {commentsList.map((c, i) => {
                      const repliesCount = c.raw?.replies_count ?? c.raw?.repliesCount ?? (c.replies ? c.replies.length : 0)
                      const isEdited = c.raw?.is_edited ?? c.raw?.isEdited ?? !!c.updatedAt
                      return (
                      <li key={c.id || i} className="comments-list-item" style={{ position: 'relative' }}>
                        <div className="comments-avatar">{(c.raw?.university_name || c.raw?.universityName || c.createdBy || 'U').charAt(0).toUpperCase()}</div>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className="comments-name">{c.createdBy}</div>
                            <div style={{ color: '#6B7280', fontSize: 12 }}>{c.createdAt ? formatInCairo(c.createdAt) : ''}{isEdited ? ' • edited' : ''}</div>
                          </div>
                          {editingCommentId === c.id ? (
                            <div style={{ marginTop: 8 }}>
                              <input type="text" value={editCommentDraft} onChange={(e) => setEditCommentDraft(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #E5E7EB' }} />
                              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                                <button type="button" onClick={() => { setEditingCommentId(null); setEditCommentDraft('') }} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>Cancel</button>
                                <button type="button" onClick={() => updateComment(c.id, editCommentDraft)} style={{ background: 'var(--brand-lime-dark)', color: '#000', border: 'none', padding: '8px 12px', borderRadius: 8 }}>Save</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="comments-content" style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{c.content}</div>
                              <div style={{ display: 'flex', gap: 12, marginTop: 8, alignItems: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    // ensure replies area is visible and open the reply input
                                    setCommentsList((prev) => prev.map((x) => (x.id === c.id ? { ...x, showReplies: true } : x)))
                                    setReplyDrafts((prev) => ({ ...prev, [c.id]: prev[c.id] ?? '' }))
                                    // enable scrolling inside comments modal so replies can be scrolled
                                    setCommentsScrollEnabled(true)
                                    // small timeout to allow DOM update; focus not implemented to keep simple
                                  }}
                                  style={{ background: 'transparent', border: 'none', color: 'var(--brand-lime-dark)', cursor: 'pointer', padding: 0 }}
                                >Reply</button>
                                <button type="button" onClick={() => { if (!c.showReplies) { setCommentsScrollEnabled(true); fetchReplies(c.id, 1) } else setCommentsList((prev) => prev.map((x) => (x.id === c.id ? { ...x, showReplies: false } : x))) }} style={{ background: 'transparent', border: 'none', color: '#6B7280', cursor: 'pointer', padding: 0 }}>{c.showReplies ? 'Hide replies' : `View replies (${repliesCount})`}</button>
              {openCommentMenuId && commentMenuPos ? createPortal(
                <div data-menu-content onClick={(e) => e.stopPropagation()} style={{ position: 'fixed', left: commentMenuPos.left, top: commentMenuPos.top, background: '#fff', boxShadow: '0 6px 20px rgba(0,0,0,0.12)', borderRadius: 8, padding: 8, zIndex: 10000, minWidth: 140 }} role="menu">
                  {(() => {
                    const id = String(openCommentMenuId || '')
                    const parts = id.split('-')
                    const kind = parts[0]
                    const realId = parts.slice(1).join('-')
                    let item = null
                    if (kind === 'comment') {
                      item = (commentsList || []).find((x) => String(x.id) === String(realId)) || null
                    } else if (kind === 'reply') {
                      for (const com of (commentsList || [])) {
                        const found = (com.replies || []).find((r) => String(r.id) === String(realId))
                        if (found) { item = found; break }
                      }
                    }
                    const owner = item && isOwner(item)
                    return (
                      <>
                        {owner ? (
                          <button type="button" onClick={() => {
                            if (kind === 'comment') { setEditingCommentId(realId) } else { setEditingReplyId(realId) }
                            setOpenCommentMenuId(null)
                            setCommentMenuPos(null)
                          }} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '8px 10px', cursor: 'pointer' }}>Edit</button>
                        ) : null}
                        <button type="button" onClick={() => {
                          setPendingDeleteCommentId(realId)
                          const fallbackPostId = commentsModalPostId || (item && (item.raw?.post_id || item.raw?.postId || item.raw?.post || null))
                          setPendingDeleteCommentPostId(fallbackPostId)
                          setShowDeleteCommentConfirm(true)
                          setOpenCommentMenuId(null)
                          setCommentMenuPos(null)
                        }} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '8px 10px', cursor: 'pointer', color: '#B91C1C' }}>Delete</button>
                      </>
                    )
                  })()}
                </div>
              , document.body) : null}
                                {(isOwner(c) || (!secretary && isSecretaryUser)) ? (
                                  <div style={{ position: 'relative' }}>
                                    <button data-menu-trigger type="button" aria-haspopup="menu" aria-expanded={openCommentMenuId === `comment-${c.id}`} onClick={(e) => { e.stopPropagation(); const tid = `comment-${c.id}`; if (openCommentMenuId === tid) { setOpenCommentMenuId(null); setCommentMenuPos(null) } else { const r = e.currentTarget.getBoundingClientRect(); setCommentMenuPos({ left: Math.max(8, r.right - 150), top: r.bottom + window.scrollY + 6 }); setOpenCommentMenuId(tid) } }} style={{ background: 'transparent', border: 'none', color: '#6B7280', cursor: 'pointer', padding: '4px 6px' }}>⋯</button>
                                  </div>
                                ) : null}
                                {(secretary && isSecretaryUser && !isOwner(c)) ? (
                                  <button type="button" onClick={() => { setPendingDeleteCommentId(c.id); setPendingDeleteCommentPostId(commentsModalPostId); setShowDeleteCommentConfirm(true) }} style={{ background: 'transparent', border: 'none', color: '#B91C1C', cursor: 'pointer', padding: '4px 6px', marginLeft: 8 }}>Delete</button>
                                ) : null}
                              </div>
                              {/* Replies block */}
                              {c.showReplies && (
                                <div style={{ marginTop: 8, paddingLeft: 56 }}>
                                  <div className="reply-block">
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                      <div className="reply-avatar">{initial}</div>
                                      <input value={replyDrafts[c.id] || ''} onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [c.id]: e.target.value }))} placeholder="Write a reply..." style={{ flex: 1, padding: '10px 14px', borderRadius: 20, border: 'none', background: '#F3F4F6', fontSize: 14 }} />
                                      <button className="comments-send" onClick={() => createReply(c.id, replyDrafts[c.id] || '')} disabled={!(replyDrafts[c.id] || '').trim()}>Reply</button>
                                      <button type="button" onClick={() => setReplyDrafts((prev) => { const next = { ...prev }; delete next[c.id]; return next })} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6B7280' }}>Cancel</button>
                                    </div>

                                    <div style={{ marginTop: 8 }}>
                                      {c.replies && c.replies.length > 0 ? (
                                        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                                          {c.replies.map((r, ri) => (
                                            <li key={r.id || `reply-${ri}`} className="reply-item">
                                              <div className="reply-avatar">{(r.raw?.university_name || r.raw?.universityName || r.createdBy || 'U').charAt(0).toUpperCase()}</div>
                                              <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                  <div style={{ fontWeight: 700 }}>{r.createdBy}</div>
                                                  <div className="reply-meta">{r.createdAt ? formatInCairo(r.createdAt) : ''}{r.updatedAt ? ' • edited' : ''}</div>
                                                  {(isOwner(r) || (!secretary && isSecretaryUser)) ? (
                                                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, position: 'relative' }}>
                                                      <button data-menu-trigger type="button" aria-haspopup="menu" aria-expanded={openCommentMenuId === `reply-${r.id}`} onClick={(e) => { e.stopPropagation(); const tid = `reply-${r.id}`; if (openCommentMenuId === tid) { setOpenCommentMenuId(null); setCommentMenuPos(null) } else { const rct = e.currentTarget.getBoundingClientRect(); setCommentMenuPos({ left: Math.max(8, rct.right - 150), top: rct.bottom + window.scrollY + 6 }); setOpenCommentMenuId(tid) } }} style={{ background: 'transparent', border: 'none', color: '#6B7280', cursor: 'pointer', padding: '4px 6px' }}>⋯</button>
                                                      {(secretary && isSecretaryUser && !isOwner(r)) ? (
                                                        <button type="button" onClick={() => { setPendingDeleteCommentId(r.id); const fallbackPostId = commentsModalPostId || (r && (r.raw?.post_id || r.raw?.postId || r.raw?.post || null)); setPendingDeleteCommentPostId(fallbackPostId); setShowDeleteCommentConfirm(true) }} style={{ background: 'transparent', border: 'none', color: '#B91C1C', cursor: 'pointer', padding: '4px 6px' }}>Delete</button>
                                                      ) : null}
                                                    </div>
                                                  ) : null}
                                                </div>
                                                {editingReplyId === r.id ? (
                                                  <div style={{ marginTop: 6 }}>
                                                    <input type="text" value={editReplyDraft} onChange={(e) => setEditReplyDraft(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #E5E7EB' }} />
                                                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                                                      <button type="button" onClick={() => { setEditingReplyId(null); setEditReplyDraft('') }} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>Cancel</button>
                                                      <button type="button" onClick={() => { updateComment(r.id, editReplyDraft); setEditingReplyId(null); setEditReplyDraft('') }} style={{ background: 'var(--brand-lime-dark)', color: '#000', border: 'none', padding: '8px 12px', borderRadius: 8 }}>Save</button>
                                                    </div>
                                                  </div>
                                                ) : (
                                                  <div style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{r.content}</div>
                                                )}
                                              </div>
                                            </li>
                                          ))}
                                        </ul>
                                      ) : c.repliesLoading ? (
                                        <div className="comments-loading">Loading…</div>
                                      ) : (
                                        <div className="comments-empty">No replies yet</div>
                                      )}
                                    </div>

                                    <div style={{ marginTop: 8 }}>
                                      {c.repliesHasMore ? (
                                        <button className="comments-send" onClick={() => { setCommentsScrollEnabled(true); fetchReplies(c.id, (c.repliesPage || 1) + 1) }} disabled={c.repliesLoading} style={{ display: 'block', margin: '8px auto 0' }}>{c.repliesLoading ? 'Loading…' : 'Load more'}</button>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </li>
                          )})}
                      </ul>
                    </div>
                  ) : (
                    <div className="comments-empty">No comments yet</div>
                  )}
            </div>
            <div className="comments-modal-footer">
              {commentsHasMore ? (
                <button className="comments-load-more" onClick={() => { setCommentsScrollEnabled(true); fetchComments(commentsModalPostId, commentsPage + 1) }} disabled={commentsLoading}>
                  {commentsLoading ? 'Loading…' : 'Load more'}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      , document.body) : null}
    </div>
  )
}
