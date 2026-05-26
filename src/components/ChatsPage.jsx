import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { useAuth } from '../contexts/AuthContext'
import { getAccessToken } from '../utils/auth'
import { get, post, patch, deleteRequest, formPost, apiCall } from '../utils/api'
import { API_GATEWAY_BASE_URL } from '../utils/config'
import './chats.css'

const BASE = 'chat/api/v1'
const WS_PATH = '/unihub/chat/ws'
function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
}

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return 'now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function formatMsgTime(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDateSep(ts) {
  const d = new Date(ts)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return 'Today'
  const y = new Date(now); y.setDate(y.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
}

function shouldShowDateSep(msgs, idx) {
  if (idx === 0) return true
  return new Date(msgs[idx].created_at).toDateString() !== new Date(msgs[idx - 1].created_at).toDateString()
}

const AVATAR_COLORS = ['#6366F1','#F97316','#10B981','#3B82F6','#8B5CF6','#EC4899','#14B8A6','#F59E0B','#EF4444','#06B6D4']

function Avatar({ name, size = 40, online }) {
  const safeName = name || ''
  const color = AVATAR_COLORS[(safeName.charCodeAt(0) || 0) % AVATAR_COLORS.length]
  return (
    <div className="ch-avatar" style={{ width: size, height: size, background: color, fontSize: size * 0.36 }}>
      {getInitials(safeName)}
      {online !== undefined && <span className={`ch-dot ${online ? 'on' : 'off'}`} />}
    </div>
  )
}

function Toast({ notice }) {
  if (!notice) return null
  return <div className={`ch-toast ${notice.type}`}>{notice.message}</div>
}

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)) }

function joinUrl(base, path) {
  const safeBase = (base || '').replace(/\/$/, '')
  const safePath = String(path || '').replace(/^\//, '')
  return `${safeBase}/${safePath}`
}

function resolveMediaUrl(url) {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  if (url.startsWith('//')) return `https:${url}`
  return joinUrl(API_GATEWAY_BASE_URL, url)
}

function fmtDur(sec = 0) {
  const s = Math.max(0, Math.floor(sec))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}

function VoiceMessage({ src, mine, durationHint, authHeaders }) {
  const audioRef = useRef(null)
  const objectUrlRef = useRef(null)
  const [audioSrc, setAudioSrc] = useState(src || '')
  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [dur, setDur] = useState(durationHint || 0)
  const [t, setT] = useState(0)

  useEffect(() => {
    let alive = true

    const cleanupObjectUrl = () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    }

    const loadVoice = async () => {
      if (!src) {
        setAudioSrc('')
        return
      }

      // Try authenticated fetch first; fallback to raw src if not required.
      try {
        const response = await fetch(src, {
          headers: authHeaders || {},
          credentials: 'include',
        })
        if (!response.ok) throw new Error(`voice-fetch-${response.status}`)
        const blob = await response.blob()
        if (!alive) return
        cleanupObjectUrl()
        const objectUrl = URL.createObjectURL(blob)
        objectUrlRef.current = objectUrl
        setAudioSrc(objectUrl)
      } catch {
        if (alive) {
          cleanupObjectUrl()
          setAudioSrc(src)
        }
      }
    }

    loadVoice()

    return () => {
      alive = false
      cleanupObjectUrl()
    }
  }, [src, authHeaders])

  useEffect(() => {
    const el = audioRef.current
    if (!el) return

    const onLoaded = () => {
      setReady(true)
      setDur(Number.isFinite(el.duration) ? el.duration : 0)
    }
    const onTime = () => setT(el.currentTime || 0)
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onEnded = () => { setPlaying(false); setT(0) }

    el.addEventListener('loadedmetadata', onLoaded)
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)
    el.addEventListener('ended', onEnded)
    return () => {
      el.removeEventListener('loadedmetadata', onLoaded)
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('play', onPlay)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('ended', onEnded)
    }
  }, [src, durationHint])

  const pct = dur > 0 ? clamp((t / dur) * 100, 0, 100) : 0

  const toggle = () => {
    const el = audioRef.current
    if (!el) return
    if (playing) el.pause()
    else el.play().catch(() => {})
  }

  const seek = (e) => {
    const el = audioRef.current
    if (!el || !dur) return
    const next = Number(e.target.value)
    el.currentTime = clamp(next, 0, dur)
    setT(el.currentTime)
  }

  const BAR_COUNT = 30
  const bars = Array.from({ length: BAR_COUNT }, (_, i) => {
    const heights = [3,5,8,6,10,7,4,9,6,5,8,11,7,5,9,6,4,8,5,10,7,6,9,4,8,6,5,10,7,4]
    return heights[i % heights.length]
  })

  return (
    <div className={`ch-voice ${mine ? 'mine' : 'theirs'}`}>
      <button className="ch-voice-btn" onClick={toggle} disabled={!ready} aria-label={playing ? 'Pause' : 'Play'}>
        {playing ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="4" width="4" height="16" rx="1"/><rect x="15" y="4" width="4" height="16" rx="1"/></svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4l14 8-14 8V4z"/></svg>
        )}
      </button>

      <div className="ch-voice-track">
        <div className="ch-voice-waveform" onClick={(e) => {
          if (!ready || !dur) return
          const rect = e.currentTarget.getBoundingClientRect()
          const ratio = (e.clientX - rect.left) / rect.width
          const el = audioRef.current
          if (el) { el.currentTime = clamp(ratio * dur, 0, dur); setT(el.currentTime) }
        }}>
          {bars.map((h, i) => {
            const barPct = (i + 1) / BAR_COUNT * 100
            const active = barPct <= pct
            return <span key={i} className={`ch-voice-bar${active ? ' active' : ''}`} style={{ height: `${h}px` }} />
          })}
        </div>
        <div className="ch-voice-time">
          <span>{fmtDur(playing || t > 0 ? t : dur)}</span>
        </div>
      </div>

      <audio ref={audioRef} src={audioSrc} preload="metadata" />
    </div>
  )
}

export default function ChatsPage({ fullPage = false }) {
  const { user, accessToken } = useAuth()
  const navigate = useNavigate()
  const myEmail = user?.email || ''
  const tid = user?.university_id || user?.universityId || user?.tid || ''
  const cid = user?.college_id || user?.collegeId || user?.cid || ''
  const myName = user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : myEmail.split('@')[0]

  const [rooms, setRooms] = useState([])
  const [activeRoom, setActiveRoom] = useState(null)
  // Keep a ref so WS closures always see the latest active room without re-subscribing
  useEffect(() => { activeRoomRef.current = activeRoom }, [activeRoom])
  const [messages, setMessages] = useState([])
  const [msgPage, setMsgPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [loadingRooms, setLoadingRooms] = useState(true)
  const [input, setInput] = useState('')
  const [roomSearch, setRoomSearch] = useState('')
  const [userResults, setUserResults] = useState([])
  const [searchingUsers, setSearchingUsers] = useState(false)
  const [showNewGroup, setShowNewGroup] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [groupMembers, setGroupMembers] = useState([])
  const [groupSearch, setGroupSearch] = useState('')
  const [groupSearchRes, setGroupSearchRes] = useState([])
  const [typingUsers, setTypingUsers] = useState({})
  const [editingMsg, setEditingMsg] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [showRoomInfo, setShowRoomInfo] = useState(false)
  const [addMemberQ, setAddMemberQ] = useState('')
  const [addMemberRes, setAddMemberRes] = useState([])
  const [renameVal, setRenameVal] = useState('')
  const [msgCtx, setMsgCtx] = useState(null)
  const [notice, setNotice] = useState(null)
  const [wsStatus, setWsStatus] = useState('disconnected')
  const [recording, setRecording] = useState(false)
  const [mentionQ, setMentionQ] = useState(null)
  const [mentionResults, setMentionResults] = useState([])
  const [pendingImage, setPendingImage] = useState(null)
  const [imgPreviewUrl, setImgPreviewUrl] = useState(null)
  const [confirmModal, setConfirmModal] = useState(null) // { title, message, onConfirm }
  const roomSearchRef = useRef(null)

  const stompRef = useRef(null)
  const subsRef = useRef({})
  const roomFeedSubRef = useRef(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const typingTimerRef = useRef(null)
  const fileInputRef = useRef(null)
  const messagesRef = useRef(null)
  const prevScrollH = useRef(0)
  const noticeTimer = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const recordingStartedAtRef = useRef(0)
  const loadingRoomIdsRef = useRef(new Set())
  const activeRoomRef = useRef(null)

  const chatHeaders = useMemo(() => ({
    'X-User-Email': myEmail,
    'X-User-University-Id': tid,
    ...(cid ? { 'X-User-College-Id': cid } : {}),
  }), [myEmail, tid, cid])

  const mediaHeaders = useMemo(() => {
    const token = accessToken || getAccessToken()
    return {
      ...chatHeaders,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
  }, [accessToken, chatHeaders])

  const toast = useCallback((message, type = 'error') => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current)
    setNotice({ message, type })
    noticeTimer.current = setTimeout(() => setNotice(null), 3500)
  }, [])

  useEffect(() => () => { if (noticeTimer.current) clearTimeout(noticeTimer.current) }, [])

  useEffect(() => {
    return () => {
      if (pendingImage?.previewUrl) URL.revokeObjectURL(pendingImage.previewUrl)
    }
  }, [pendingImage])

  const refreshPresenceForRoom = useCallback(async (room) => {
    if (!room || room.type !== 'DIRECT') return room
    const other = room.participants?.find(p => p.email !== myEmail)
    if (!other?.email) return room

    try {
      const presence = await get(`${BASE}/users/${encodeURIComponent(other.email)}/presence`, { headers: chatHeaders })
      const nextParticipants = (room.participants || []).map(p => (
        p.email === other.email
          ? { ...p, is_online: presence?.is_online, last_seen_at: presence?.last_seen_at, display_name: presence?.display_name || p.display_name }
          : p
      ))
      return { ...room, participants: nextParticipants }
    } catch {
      return room
    }
  }, [chatHeaders, myEmail])

  const refreshDirectPresences = useCallback(async (roomList) => {
    const directRooms = (roomList || []).filter(room => room.type === 'DIRECT')
    if (directRooms.length === 0) return roomList

    const resolved = await Promise.all(directRooms.map(refreshPresenceForRoom))
    const presenceById = new Map(resolved.map(room => [room.id, room]))
    return (roomList || []).map(room => presenceById.get(room.id) || room)
  }, [refreshPresenceForRoom])

  const loadRoomById = useCallback(async (roomId) => {
    if (!roomId || loadingRoomIdsRef.current.has(roomId)) return
    loadingRoomIdsRef.current.add(roomId)
    try {
      const fetched = normalizeRoom(await get(`${BASE}/rooms/${roomId}`, { headers: chatHeaders }))
      if (!fetched?.id) return
      const resolved = fetched.type === 'DIRECT' ? await refreshPresenceForRoom(fetched) : fetched
      setRooms(prev => {
        if (prev.some(room => room.id === resolved.id)) {
          return prev.map(room => (room.id === resolved.id ? { ...room, ...resolved } : room))
        }
        return [resolved, ...prev]
      })
    } catch {
      // Room can be temporarily unavailable while membership propagates.
    } finally {
      loadingRoomIdsRef.current.delete(roomId)
    }
  }, [chatHeaders, refreshPresenceForRoom])

  const normalizeRoom = (room) => {
    if (!room) return room
    const lm = room.lastMessage || room.last_message || null
    return { ...room, lastMessage: lm, last_message: lm }
  }

  const loadRooms = useCallback(async () => {
    try {
      setLoadingRooms(true)
      const data = await get(`${BASE}/rooms`, { headers: chatHeaders })
      const resolvedRooms = await refreshDirectPresences((data || []).map(normalizeRoom))
      setRooms(resolvedRooms)
    } catch (err) {
      setRooms([])
      toast(err?.message || 'Unable to load chats')
    } finally { setLoadingRooms(false) }
  }, [chatHeaders, refreshDirectPresences, toast])

  useEffect(() => { loadRooms() }, [loadRooms])

  // STOMP over SockJS
  useEffect(() => {
    const token = accessToken || getAccessToken()
    if (!myEmail || !token) return
    const headers = {
      'X-User-Email': myEmail,
      ...(tid ? { 'X-User-University-Id': tid } : {}),
      ...(cid ? { 'X-User-College-Id': cid } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
    let client
    try {
      client = new Client({
        webSocketFactory: () => new SockJS(WS_PATH),
        connectHeaders: headers,
        reconnectDelay: 4000,
        debug: (msg) => {
          // Useful to confirm connect attempts in DevTools console.
          // eslint-disable-next-line no-console
          console.debug('[chat-ws]', msg)
        },
        onWebSocketError: () => setWsStatus('error'),
        onWebSocketClose: () => setWsStatus('disconnected'),
        onConnect: () => { stompRef.current = client; setWsStatus('connected') },
        onDisconnect: () => setWsStatus('disconnected'),
        onStompError: () => setWsStatus('error'),
      })
      setWsStatus('connecting')
      client.activate()
      stompRef.current = client
    } catch (e) {
      setWsStatus('error')
      toast('WebSocket init failed')
    }
    return () => {
      client?.deactivate()
      stompRef.current = null
      setWsStatus('disconnected')
    }
  }, [myEmail, tid, cid])

  // Subscribe to room topics
  useEffect(() => {
    if (!activeRoom) return
    Object.values(subsRef.current).forEach(s => { try { s.unsubscribe() } catch {} })
    subsRef.current = {}

    const sub = () => {
      const client = stompRef.current
      if (!client?.connected) { setTimeout(sub, 300); return }

      subsRef.current.msg = client.subscribe(`/topic/room/${activeRoom.id}`, frame => {
        const msg = normalizeMessage(JSON.parse(frame.body))
        upsertMessage(msg)
      })

      subsRef.current.typing = client.subscribe(`/topic/room/${activeRoom.id}/typing`, frame => {
        const ev = JSON.parse(frame.body)
        if (ev.senderEmail === myEmail) return
        setTypingUsers(prev => ({ ...prev, [ev.senderEmail]: ev.typing }))
        if (ev.typing) setTimeout(() => setTypingUsers(prev => { const n = { ...prev }; delete n[ev.senderEmail]; return n }), 3000)
      })

      subsRef.current.read = client.subscribe(`/topic/room/${activeRoom.id}/read`, frame => {
        const ev = JSON.parse(frame.body)
        setMessages(prev => prev.map(m => ({ ...m, read_by: m.read_by?.includes(ev.readerEmail) ? m.read_by : [...(m.read_by || []), ev.readerEmail] })))
      })
    }
    sub()
    return () => { Object.values(subsRef.current).forEach(s => { try { s.unsubscribe() } catch {} }); subsRef.current = {} }
  }, [activeRoom?.id, myEmail])

  useEffect(() => {
    const connectRoomFeed = () => {
      const client = stompRef.current
      if (!client?.connected) {
        setTimeout(connectRoomFeed, 300)
        return
      }

      try { roomFeedSubRef.current?.unsubscribe() } catch {}

      roomFeedSubRef.current = client.subscribe('/user/queue/rooms', frame => {
        const event = JSON.parse(frame.body || '{}')
        const eventRoomId = event?.roomId

        if (event?.type === 'ROOM_DELETED' && eventRoomId) {
          setRooms(prev => prev.filter(r => r.id !== eventRoomId))
          if (activeRoomRef.current?.id === eventRoomId) {
            setActiveRoom(null)
            setMessages([])
            setShowRoomInfo(false)
          }
          return
        }

        if (event?.type === 'ROOM_UPSERT' && eventRoomId) {
          loadRoomById(eventRoomId).then(() => {
            if (activeRoomRef.current?.id === eventRoomId) {
              get(`${BASE}/rooms/${eventRoomId}`, { headers: chatHeaders }).then(updated => {
                if (updated?.id) {
                  const normalized = normalizeRoom(updated)
                  setActiveRoom(normalized)
                }
              }).catch(() => {})
            }
          })
          return
        }

        const wsMessage = normalizeMessage(event?.message || event)
        if (!eventRoomId) return

        if (!wsMessage?.id) {
          loadRoomById(eventRoomId)
          return
        }

        const isActiveRoom = activeRoomRef.current?.id === wsMessage.roomId

        if (isActiveRoom) {
          // Still update preview/lastMessage but never increment unread
          setRooms(prev => prev.map(room => {
            if (room.id !== wsMessage.roomId) return room
            const sender = wsMessage.senderEmail || wsMessage.sender_email
            const preview = wsMessage.type === 'TEXT'
              ? wsMessage.content
              : wsMessage.type === 'IMAGE'
                ? (wsMessage.content || 'Photo')
                : wsMessage.type === 'VOICE'
                  ? `Voice note ${fmtDur(wsMessage.voice_duration_secs || 0)}`
                  : (wsMessage.deletedAt ? 'Message deleted' : wsMessage.content || `[${wsMessage.type}]`)
            return {
              ...room,
              unread_count: 0,
              unreadCount: 0,
              lastMessage: { message_id: wsMessage.id, messageId: wsMessage.id, content_preview: preview, sender_email: sender, type: wsMessage.type, sent_at: wsMessage.createdAt || wsMessage.created_at },
            }
          }))
          return
        }

        let hasRoom = false
        setRooms(prev => prev.map(room => {
          if (room.id !== wsMessage.roomId) return room
          hasRoom = true

          const sender = wsMessage.senderEmail || wsMessage.sender_email
          const unreadBase = Number(room.unread_count || room.unreadCount || 0)
          const lastId = room.lastMessage?.message_id || room.lastMessage?.messageId
          const shouldIncrementUnread = Boolean(
            sender
            && sender !== myEmail
            && !wsMessage.editedAt
            && !wsMessage.deletedAt
            && wsMessage.id !== lastId
          )
          const unreadNext = shouldIncrementUnread ? unreadBase + 1 : unreadBase

          const preview = wsMessage.type === 'TEXT'
            ? wsMessage.content
            : wsMessage.type === 'IMAGE'
              ? (wsMessage.content || 'Photo')
              : wsMessage.type === 'VOICE'
                ? `Voice note ${fmtDur(wsMessage.voice_duration_secs || 0)}`
                : (wsMessage.deletedAt ? 'Message deleted' : wsMessage.content || `[${wsMessage.type}]`)

          return {
            ...room,
            unread_count: unreadNext,
            unreadCount: unreadNext,
            lastMessage: {
              message_id: wsMessage.id,
              messageId: wsMessage.id,
              content_preview: preview,
              sender_email: sender,
              type: wsMessage.type,
              sent_at: wsMessage.createdAt || wsMessage.created_at,
            },
          }
        }))

        if (!hasRoom) {
          loadRoomById(eventRoomId)
        }
      })
    }

    connectRoomFeed()

    return () => {
      try { roomFeedSubRef.current?.unsubscribe() } catch {}
      roomFeedSubRef.current = null
    }
  }, [activeRoom?.id, myEmail, loadRoomById])

  const loadMessages = useCallback(async (roomId, page = 1, prepend = false) => {
    if (loadingMsgs) return
    setLoadingMsgs(true)
    try {
      const data = await get(`${BASE}/rooms/${roomId}/messages?page=${page}`, { headers: chatHeaders })
      const msgs = (data?.content || [])
        .map(normalizeMessage)
        .filter(Boolean)
        .reverse()
      if (prepend) {
        prevScrollH.current = messagesRef.current?.scrollHeight || 0
        setMessages(prev => [...msgs, ...prev])
      } else {
        setMessages(msgs)
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'auto' }), 50)
      }
      setHasMore(!data?.last)
    } catch (err) { toast(err?.message || 'Unable to load messages') }
    finally { setLoadingMsgs(false) }
  }, [chatHeaders, loadingMsgs, toast])

  useEffect(() => {
    if (!activeRoom) return
    setMessages([]); setMsgPage(1); setHasMore(true); setReplyTo(null)
    loadMessages(activeRoom.id, 1)
    sendStomp('chat.read', { roomId: activeRoom.id, readerEmail: myEmail })
  }, [activeRoom?.id])

  useEffect(() => {
    if (!activeRoom || activeRoom.type !== 'DIRECT') return
    refreshPresenceForRoom(activeRoom).then(updated => {
      if (!updated || updated.id !== activeRoom.id) return
      setActiveRoom(updated)
      setRooms(prev => prev.map(room => room.id === updated.id ? updated : room))
    })
  }, [activeRoom?.id, activeRoom?.type, refreshPresenceForRoom])

  useEffect(() => {
    if (prevScrollH.current && messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight - prevScrollH.current
      prevScrollH.current = 0
    }
  }, [messages.length])

  const sendStomp = async (dest, payload) => {
    const client = stompRef.current
    const publishNow = () => {
      if (!client?.connected) return false
      try {
        client.publish({ destination: `/app/${dest}`, body: JSON.stringify(payload) })
        return true
      } catch {
        return false
      }
    }

    if (publishNow()) return true
    for (let i = 0; i < 6; i++) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise(r => setTimeout(r, 200))
      if (publishNow()) return true
    }
    return false
  }

  const handleInputChange = (e) => {
    const val = e.target.value
    setInput(val)
    const el = e.currentTarget
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 130)}px`

    // Mention detection
    const cursor = el.selectionStart
    const textBefore = val.slice(0, cursor)
    const mentionMatch = textBefore.match(/@(\w*)$/)
    if (mentionMatch) {
      setMentionQ(mentionMatch[1])
    } else {
      setMentionQ(null)
      setMentionResults([])
    }
  }

  useEffect(() => {
    if (mentionQ === null || !activeRoom) return
    const members = activeRoom.participants?.filter(p => p.email !== myEmail) || []
    const q = mentionQ.toLowerCase()
    setMentionResults(members.filter(p => (p.display_name || p.email).toLowerCase().includes(q)))
  }, [mentionQ, activeRoom])

  const insertMention = (p) => {
    const cursor = inputRef.current?.selectionStart || input.length
    const before = input.slice(0, cursor).replace(/@\w*$/, `@${p.display_name || p.email} `)
    const after = input.slice(cursor)
    setInput(before + after)
    setMentionQ(null)
    setMentionResults([])
    inputRef.current?.focus()
  }

  const extractMentions = (text) => {
    if (!activeRoom) return []
    const mentioned = []
    activeRoom.participants?.forEach(p => {
      if (p.email !== myEmail) {
        const name = p.display_name || p.email
        if (text.includes(`@${name}`)) mentioned.push(p.email)
      }
    })
    return mentioned
  }

  const normalizeMessage = (message) => {
    if (!message) return null
    const type = String(message.type || '').toUpperCase()
    const mentions = (message.mentions || []).map(m => ({
      ...m,
      email: m.email,
      display_name: m.display_name || m.displayName,
      displayName: m.displayName || m.display_name,
    }))
    return {
      ...message,
      room_id: message.room_id || message.roomId,
      roomId: message.roomId || message.room_id,
      sender_email: message.sender_email || message.senderEmail,
      senderEmail: message.senderEmail || message.sender_email,
      sender_display_name: message.sender_display_name || message.senderDisplayName,
      senderDisplayName: message.senderDisplayName || message.sender_display_name,
      createdAt: message.createdAt || message.created_at,
      created_at: message.created_at || message.createdAt,
      image_url: resolveMediaUrl(message.image_url || message.imageUrl),
      imageUrl: resolveMediaUrl(message.imageUrl || message.image_url),
      voice_duration_secs: message.voice_duration_secs ?? message.voiceDurationSecs,
      voiceDurationSecs: message.voiceDurationSecs ?? message.voice_duration_secs,
      read_by: message.read_by || message.readBy || [],
      readBy: message.readBy || message.read_by || [],
      editedAt: message.editedAt || message.edited_at,
      deletedAt: message.deletedAt || message.deleted_at,
      deleted_at: message.deleted_at || message.deletedAt,
      content_preview: message.content_preview || message.content || '',
      mentions,
      type,
    }
  }

  const isDeletedMessage = (message) => Boolean(message?.deletedAt || message?.deleted_at)
  const formatMentionLabel = (mention) => mention?.display_name || mention?.displayName || mention?.email || ''

  const upsertMessage = (message) => {
    const normalized = normalizeMessage(message)
    if (!normalized?.id || !normalized?.roomId) return

    setMessages(prev => {
      const exists = prev.some(item => item.id === normalized.id)
      const next = exists
        ? prev.map(item => (item.id === normalized.id ? { ...item, ...normalized } : item))
        : [...prev, normalized]
      return next.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime())
    })

    setRooms(prev => prev.map(room => {
      if (room.id !== normalized.roomId) return room

      const preview = normalized.type === 'TEXT'
        ? normalized.content
        : normalized.type === 'IMAGE'
          ? (normalized.content || 'Photo')
          : normalized.type === 'VOICE'
            ? `Voice note ${fmtDur(normalized.voice_duration_secs || 0)}`
            : normalized.content || `[${normalized.type}]`

      return {
        ...room,
        lastMessage: {
          message_id: normalized.id,
          messageId: normalized.id,
          content_preview: preview,
          sender_email: normalized.senderEmail,
          type: normalized.type,
          sent_at: normalized.createdAt || normalized.created_at,
        },
      }
    }))

    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 40)
  }

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file || !activeRoom) return
    if (pendingImage?.previewUrl) URL.revokeObjectURL(pendingImage.previewUrl)
    const previewUrl = URL.createObjectURL(file)
    setPendingImage({ file, previewUrl })
    e.target.value = ''
  }

  const clearPendingImage = () => {
    if (pendingImage?.previewUrl) URL.revokeObjectURL(pendingImage.previewUrl)
    setPendingImage(null)
  }

  const handleSend = async () => {
    if (pendingImage && activeRoom) {
      const fd = new FormData()
      fd.append('file', pendingImage.file)
      if (replyTo?.id) fd.append('replyTo', replyTo.id)
      if (input.trim()) fd.append('content', input.trim())
      try {
        const uploaded = await formPost(`${BASE}/rooms/${activeRoom.id}/messages/image`, fd, { headers: chatHeaders })
        upsertMessage(uploaded)
        clearPendingImage()
        setInput('')
        setReplyTo(null)
      } catch (err) {
        toast(err?.message || 'Image upload failed')
      }
      return
    }

    const text = input.trim()
    if (!text || !activeRoom) return
    const replyToMessageId = replyTo?.id || null
    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    setReplyTo(null)
    setMentionQ(null)
    const ok = await sendStomp('chat.send', {
      roomId: activeRoom.id,
      content: text,
      replyToMessageId,
      mentionedEmails: extractMentions(text),
    })
    if (!ok) toast('Not connected — message may not send', 'error')
  }

  const handleKeyDown = (e) => {
    if (mentionResults.length > 0 && (e.key === 'Escape')) { setMentionQ(null); setMentionResults([]); return }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); return }
    clearTimeout(typingTimerRef.current)
    sendStomp('chat.typing', { roomId: activeRoom?.id, senderEmail: myEmail, typing: true })
    typingTimerRef.current = setTimeout(() => sendStomp('chat.typing', { roomId: activeRoom?.id, senderEmail: myEmail, typing: false }), 2000)
  }

  const startRecording = async () => {
    if (recording) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      audioChunksRef.current = []
      mr.ondataavailable = e => audioChunksRef.current.push(e.data)
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const durationSecs = Math.max(1, Math.round((Date.now() - (recordingStartedAtRef.current || Date.now())) / 1000))
        if (durationSecs < 2) {
          toast('Hold a little longer before sending voice', 'error')
          return
        }
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const fd = new FormData(); fd.append('file', new File([blob], 'voice.webm', { type: 'audio/webm' }))
        try {
          const uploaded = await formPost(`${BASE}/rooms/${activeRoom.id}/messages/voice?duration_secs=${durationSecs}`, fd, { headers: chatHeaders })
          upsertMessage(uploaded)
        } catch (err) { toast(err?.message || 'Voice upload failed') }
      }
      mr.start()
      recordingStartedAtRef.current = Date.now()
      mediaRecorderRef.current = mr
      setRecording(true)
    } catch { toast('Microphone access denied') }
  }

  const stopRecording = () => {
    if (!recording) return
    mediaRecorderRef.current?.stop()
    setRecording(false)
  }

  const toggleRecording = () => {
    if (recording) {
      stopRecording()
      return
    }
    startRecording()
  }

  const handleEditSave = async () => {
    if (!editingMsg || !editContent.trim()) return
    try {
      const updated = await patch(`${BASE}/messages/${editingMsg.id}`, { content: editContent }, { headers: chatHeaders })
      setMessages(prev => prev.map(m => m.id === updated.id ? updated : m))
    } catch (err) { toast(err?.message || 'Unable to edit') }
    setEditingMsg(null); setEditContent('')
  }

  const openRoom = (room) => {
    setActiveRoom(room)
    setShowRoomInfo(false)
    setReplyTo(null)
    setMentionQ(null)
    setMentionResults([])
    setRooms(prev => prev.map(item => (
      item.id === room.id
        ? { ...item, unread_count: 0, unreadCount: 0 }
        : item
    )))
  }

  const closeCurrentConversation = () => {
    setActiveRoom(null)
    setShowRoomInfo(false)
    setReplyTo(null)
    setMentionQ(null)
    setMentionResults([])
    setEditingMsg(null)
    setMsgCtx(null)
    setTypingUsers({})
    setMessages([])
    setHasMore(true)
    setMsgPage(1)
  }

  const handleDelete = async (msgId) => {
    try {
      const deleted = await deleteRequest(`${BASE}/messages/${msgId}`, { headers: chatHeaders })
      if (deleted?.id) {
        upsertMessage(deleted)
      } else {
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, deletedAt: new Date().toISOString() } : m))
      }
    } catch (err) { toast(err?.message || 'Unable to delete') }
    setMsgCtx(null)
  }

  useEffect(() => {
    const q = roomSearch.trim()
    if (!q) { setUserResults([]); setSearchingUsers(false); return }
    const t = setTimeout(async () => {
      try {
        setSearchingUsers(true)
        setUserResults((await get(`${BASE}/users/search?q=${encodeURIComponent(q)}`, { headers: chatHeaders })) || [])
      } catch {
        setUserResults([])
      } finally {
        setSearchingUsers(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [roomSearch, chatHeaders])

  useEffect(() => {
    if (!groupSearch.trim()) { setGroupSearchRes([]); return }
    const t = setTimeout(async () => {
      try {
        const data = (await get(`${BASE}/users/search?q=${encodeURIComponent(groupSearch)}`, { headers: chatHeaders })) || []
        setGroupSearchRes(data.filter(u => !groupMembers.find(m => m.email === u.email)))
      } catch {}
    }, 300)
    return () => clearTimeout(t)
  }, [groupSearch, groupMembers, chatHeaders])

  useEffect(() => {
    if (!addMemberQ.trim()) { setAddMemberRes([]); return }
    const t = setTimeout(async () => {
      try {
        const data = (await get(`${BASE}/users/search?q=${encodeURIComponent(addMemberQ)}`, { headers: chatHeaders })) || []
        const existing = activeRoom?.participants?.map(p => p.email) || []
        setAddMemberRes(data.filter(u => !existing.includes(u.email)))
      } catch {}
    }, 300)
    return () => clearTimeout(t)
  }, [addMemberQ, activeRoom, chatHeaders])

  const startDirect = async (targetEmail) => {
    try {
      const room = await post(`${BASE}/rooms/direct`, { targetEmail }, { headers: chatHeaders })
      setRooms(prev => prev.find(r => r.id === room.id) ? prev : [room, ...prev])
      setActiveRoom(room)
      setRoomSearch('')
    } catch (err) { toast(err?.message || 'Unable to start chat') }
  }

  const createGroup = async () => {
    if (!groupName.trim() || groupMembers.length < 1) return
    try {
      const room = await post(`${BASE}/rooms/group`, { name: groupName, participantEmails: groupMembers.map(m => m.email) }, { headers: chatHeaders })
      setRooms(prev => [room, ...prev])
      setActiveRoom(room); setShowNewGroup(false); setGroupName(''); setGroupMembers([])
    } catch (err) { toast(err?.message || 'Unable to create group') }
  }

  const isPermissionError = (err) => /admin|permission|not allowed|forbidden|unauthorized/i.test(err?.message || '')

  const renameGroup = async () => {
    if (!renameVal.trim() || !activeRoom) return
    try {
      const updated = await apiCall(`${BASE}/rooms/${activeRoom.id}/name?name=${encodeURIComponent(renameVal)}`, { method: 'PATCH', headers: chatHeaders })
      setActiveRoom(updated); setRooms(prev => prev.map(r => r.id === updated.id ? updated : r)); setRenameVal('')
    } catch (err) { if (!isPermissionError(err)) toast(err?.message || 'Unable to rename') }
  }

  const leaveGroup = () => {
    if (!activeRoom || activeRoom.type !== 'GROUP') return
    setConfirmModal({
      title: 'Leave Group',
      message: `Are you sure you want to leave "${getRoomName(activeRoom)}"?`,
      onConfirm: async () => {
        try {
          await deleteRequest(`${BASE}/rooms/${activeRoom.id}/leave`, { headers: chatHeaders })
          setRooms(prev => prev.filter(r => r.id !== activeRoom.id))
          setActiveRoom(null)
          setShowRoomInfo(false)
          setMessages([])
          toast('You left the group', 'success')
        } catch (err) {
          if (!isPermissionError(err)) toast(err?.message || 'Unable to leave group')
        }
      }
    })
  }

  const deleteGroup = () => {
    if (!activeRoom || activeRoom.type !== 'GROUP') return
    setConfirmModal({
      title: 'Delete Group',
      message: `Delete "${getRoomName(activeRoom)}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await deleteRequest(`${BASE}/rooms/${activeRoom.id}`, { headers: chatHeaders })
          setRooms(prev => prev.filter(r => r.id !== activeRoom.id))
          setActiveRoom(null)
          setShowRoomInfo(false)
          setMessages([])
        } catch (err) {
          if (!isPermissionError(err)) toast(err?.message || 'Unable to delete group')
        }
      }
    })
  }

  const addParticipant = async (email) => {
    try {
      await post(`${BASE}/rooms/${activeRoom.id}/participants`, { emails: [email] }, { headers: chatHeaders })
      const updated = await get(`${BASE}/rooms/${activeRoom.id}`, { headers: chatHeaders })
      setActiveRoom(updated); setRooms(prev => prev.map(r => r.id === updated.id ? updated : r))
      setAddMemberQ(''); setAddMemberRes([])
    } catch (err) { toast(err?.message || 'Unable to add member') }
  }

  const removeParticipant = async (email) => {
    try {
      await deleteRequest(`${BASE}/rooms/${activeRoom.id}/participants/${encodeURIComponent(email)}`, { headers: chatHeaders })
      const updated = await get(`${BASE}/rooms/${activeRoom.id}`, { headers: chatHeaders })
      setActiveRoom(updated); setRooms(prev => prev.map(r => r.id === updated.id ? updated : r))
    } catch (err) { toast(err?.message || 'Unable to remove member') }
  }

  function getRoomName(room) {
    if (!room) return ''
    if (room.type === 'GROUP') return room.name || 'Group'
    const other = room.participants?.find(p => p.email !== myEmail)
    return other?.display_name || other?.email || 'Unknown'
  }

  function getRoomOther(room) { return room?.participants?.find(p => p.email !== myEmail) }

  const filteredRooms = useMemo(() => {
    const q = roomSearch.trim().toLowerCase()
    return rooms
      .filter(r => {
        if (!q) return true
        const name = getRoomName(r).toLowerCase()
        const lm = r.lastMessage || r.last_message
        const preview = String(lm?.content_preview || '').toLowerCase()
        const members = (r.participants || []).some(p => `${p.display_name || ''} ${p.email}`.toLowerCase().includes(q))
        return name.includes(q) || preview.includes(q) || members
      })
      .sort((a, b) => {
        const lm = r => r.lastMessage || r.last_message
        const t = r => new Date(lm(r)?.sent_at || r.updated_at || r.created_at || 0).getTime()
        return t(b) - t(a)
      })
  }, [rooms, roomSearch])

  const typingList = Object.entries(typingUsers).filter(([, v]) => v).map(([k]) => k.split('@')[0])
  const isMyMsg = (msg) => (msg.sender_email || msg.senderEmail) === myEmail
  const isMentioningMe = (msg) => (msg.mentions || []).some(m => (m.email || '').toLowerCase() === myEmail.toLowerCase())
  const isAdmin = activeRoom?.participants?.find(p => p.email === myEmail)?.role === 'ADMIN'

  const handleScroll = () => {
    if (!messagesRef.current) return
    if (messagesRef.current.scrollTop < 80 && hasMore && !loadingMsgs) {
      const next = msgPage + 1; setMsgPage(next)
      loadMessages(activeRoom.id, next, true)
    }
  }

  const resetChats = async () => {
    setActiveRoom(null); setMessages([]); await loadRooms()
  }

  return (
    <div className={`ch-root${fullPage ? ' ch-fullpage' : ''}`}>
      <Toast notice={notice} />

      <div className="ch-body">

        {/* ══ LEFT: topbar + sidebar as one card ══ */}
        <div className="ch-left">

          {/* Top section of the left card */}
          <div className="ch-left-topbar">
            <button className="ch-back-btn" onClick={() => navigate('/dashboard')} title="Back">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <div className="ch-left-topbar-center">
              <img src="/logo.png" alt="UniHub" className="ch-topbar-logo-img" onError={e => { e.target.style.display='none' }} />
              <span className="ch-topbar-brand">UniHub</span>
            </div>
          </div>

          {/* Search + action buttons */}
          <div className="ch-sidebar-top">
            <div className="ch-sidebar-search-wrap">
              <svg className="ch-sidebar-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
              <input
                className="ch-sidebar-search"
                placeholder="Search people or conversations…"
                value={roomSearch}
                onChange={e => setRoomSearch(e.target.value)}
                ref={roomSearchRef}
              />
              {roomSearch && <button className="ch-clear-btn" onClick={() => setRoomSearch('')}>×</button>}
            </div>
            <div className="ch-sidebar-actions">
              <button
                className="ch-action-btn"
                title="New message"
                onClick={() => {
                  setShowNewGroup(false)
                  roomSearchRef.current?.focus()
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2.2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </button>
              <button className="ch-action-btn" title="New group" onClick={() => { setShowNewGroup(s => !s) }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2.2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </button>
            </div>
          </div>

          {/* Search results: people + rooms */}
          {roomSearch.trim() && (
            <div className="ch-search-results">
              <div className="ch-search-section">
                <div className="ch-search-section-title">
                  People
                  {searchingUsers ? (
                    <span className="ch-search-loading" aria-label="Searching">
                      <span /><span /><span />
                    </span>
                  ) : null}
                </div>
                <div className="ch-search-list">
                  {userResults.slice(0, 6).map(u => (
                    <div key={u.email} className="ch-search-item" onClick={() => startDirect(u.email)}>
                      <Avatar name={u.display_name || u.email} size={34} online={u.is_online} />
                      <div className="ch-search-item-body">
                        <div className="ch-search-name">{u.display_name || u.email.split('@')[0]}</div>
                        <div className="ch-search-email">{u.email}</div>
                      </div>
                      <span className="ch-search-pill">Message</span>
                    </div>
                  ))}
                  {searchingUsers && userResults.length === 0 && (
                    <div className="ch-search-skeleton">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="ch-search-skel-row">
                          <div className="ch-search-skel-av" />
                          <div className="ch-search-skel-lines">
                            <div />
                            <div />
                          </div>
                          <div className="ch-search-skel-pill" />
                        </div>
                      ))}
                    </div>
                  )}
                  {!searchingUsers && userResults.length === 0 && <div className="ch-search-empty">No people found</div>}
                </div>
              </div>

              <div className="ch-search-section">
                <div className="ch-search-section-title">Conversations</div>
              </div>
            </div>
          )}

          {/* Room list */}
          <div className="ch-room-list">
            {loadingRooms && (
              <div className="ch-skeleton-list">
                {[1,2,3,4].map(i => <div key={i} className="ch-skeleton-item"><div className="ch-sk-av"/><div className="ch-sk-lines"><div/><div/></div></div>)}
              </div>
            )}
            {!loadingRooms && filteredRooms.length === 0 && (
              <div className="ch-rooms-empty">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                <p>{roomSearch ? `No results for "${roomSearch}"` : 'No conversations yet'}</p>
              </div>
            )}
            {filteredRooms.map(room => {
              const name = getRoomName(room)
              const other = getRoomOther(room)
              const active = activeRoom?.id === room.id
              const lm = room.lastMessage || room.last_message
              const unread = Number(room.unread_count || room.unreadCount || 0)
              return (
                <div key={room.id} className={`ch-room-item${active ? ' active' : ''}${unread > 0 ? ' has-unread' : ''}`} onClick={() => openRoom(room)}>
                  <Avatar name={name} size={44} online={room.type === 'DIRECT' ? other?.is_online : undefined} />
                  <div className="ch-room-body">
                    <div className="ch-room-row1">
                      <span className="ch-room-name">{name}</span>
                      <span className="ch-room-time">{formatTime(lm?.sent_at)}</span>
                    </div>
                    <div className="ch-room-row2">
                      <div className="ch-room-preview">
                        {lm
                          ? ((!lm.type || lm.type === 'TEXT')
                              ? (lm.content_preview || lm.content || '')
                              : `📎 ${lm.type?.toLowerCase()}`)
                          : 'No messages yet'}
                      </div>
                      {unread > 0 && <span className="ch-room-unread">{unread > 99 ? '99+' : unread}</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

        </div>{/* end .ch-left */}

        {/* ══ MAIN chat area ══ */}
        <div className="ch-main">
          {!activeRoom ? (
            <div className="ch-welcome">
              <div className="ch-welcome-logomark" aria-hidden="true">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                  <path d="M7.5 7.8h9M7.5 11.2h6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </div>
              <h2 className="ch-welcome-title">Connect with people and start conversations</h2>
              <p className="ch-welcome-sub">Start a chat when you’re ready</p>
            </div>
          ) : (
            <div className="ch-chat-wrap">
              {/* Chat header — no info button */}
              <div className="ch-chat-header">
                <div className="ch-chat-header-info">
                  <Avatar name={getRoomName(activeRoom)} size={40} online={activeRoom.type === 'DIRECT' ? getRoomOther(activeRoom)?.is_online : undefined} />
                  <div>
                    <div className="ch-chat-name">{getRoomName(activeRoom)}</div>
                    <div className="ch-chat-sub">
                      {typingList.length > 0
                        ? <span className="ch-typing-label">{typingList.join(', ')} typing…</span>
                        : activeRoom.type === 'GROUP'
                          ? `${activeRoom.participants?.length || 0} members`
                          : getRoomOther(activeRoom)?.is_online ? 'Online' : 'Offline'}
                    </div>
                  </div>
                </div>
                <div className="ch-chat-header-actions">
                  <button className="ch-icon-btn" title="Close conversation" onClick={closeCurrentConversation}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                  <button className="ch-icon-btn" title="Contact info" onClick={() => setShowRoomInfo(v => !v)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="ch-messages" ref={messagesRef} onScroll={handleScroll}>
                {loadingMsgs && msgPage === 1 && (
                  <div className="ch-msgs-loading">
                    {[1,2,3].map(i => <div key={i} className={`ch-sk-msg${i%2===0?' mine':''}`}><div/></div>)}
                  </div>
                )}
                {hasMore && msgPage > 1 && loadingMsgs && <div className="ch-load-more">Loading older messages…</div>}

                {messages.map((msg, idx) => {
                  const mine = isMyMsg(msg)
                  const deleted = Boolean(msg.deletedAt || msg.deleted_at)
                  const showSep = shouldShowDateSep(messages, idx)
                  const prevMsg = idx > 0 ? messages[idx - 1] : null
                  const senderKey = msg.sender_email || msg.senderEmail
                  const prevSenderKey = prevMsg?.sender_email || prevMsg?.senderEmail
                  const isGrouped = !showSep && prevMsg && prevSenderKey === senderKey && (new Date(msg.created_at) - new Date(prevMsg.created_at)) < 120000

                  if (msg.type === 'SYSTEM') {
                    return (
                      <React.Fragment key={msg.id}>
                        {showSep && <div className="ch-date-sep"><span>{formatDateSep(msg.created_at)}</span></div>}
                        <div className="ch-system-row"><span className="ch-system-pill">{msg.content}</span></div>
                      </React.Fragment>
                    )
                  }

                  return (
                    <React.Fragment key={msg.id}>
                      {showSep && <div className="ch-date-sep"><span>{formatDateSep(msg.created_at)}</span></div>}
                      <div
                        className={`ch-msg-row ${mine ? 'mine' : 'theirs'}${isGrouped ? ' grouped' : ''}`}
                        onContextMenu={e => {
                          e.preventDefault()
                          setMsgCtx({ msg, x: Math.min(e.clientX, window.innerWidth - 160), y: Math.min(e.clientY, window.innerHeight - 140) })
                        }}
                      >
                        {!mine && !isGrouped && <Avatar name={msg.sender_display_name || msg.sender_email} size={30} />}
                        {!mine && isGrouped && <div style={{ width: 30, flexShrink: 0 }} />}

                        <div className={`ch-bubble ${mine ? 'bubble-mine' : 'bubble-theirs'}${deleted ? ' bubble-deleted' : ''}`}>
                          {!mine && !isGrouped && activeRoom.type === 'GROUP' && (
                            <div className="ch-sender-name">{msg.sender_display_name || msg.sender_email?.split('@')[0]}</div>
                          )}
                          {msg.reply_to && !deleted && (
                            <div className="ch-reply-preview">
                              <span className="ch-reply-who">{msg.reply_to.sender_display_name}</span>
                              <span className="ch-reply-text">{msg.reply_to.content_preview}</span>
                            </div>
                          )}
                          {!mine && isMentioningMe(msg) && !deleted && (
                            <div className="ch-mention-badge">Mentioned you</div>
                          )}
                          {!deleted && (msg.mentions || []).length > 0 && (
                            <div className="ch-mention-list-inline" aria-label="Mentioned users">
                              {(msg.mentions || []).map((mention, mentionIndex) => (
                                <span key={`${msg.id}-mention-${mention.email || mentionIndex}`} className="ch-mention-chip">
                                  @{formatMentionLabel(mention)}
                                </span>
                              ))}
                            </div>
                          )}
                          {deleted ? (
                            <span className="ch-deleted">Message deleted</span>
                          ) : msg.type === 'IMAGE' ? (
                            <div className="ch-image-msg">
                              <img
                                src={msg.image_url}
                                alt="attachment"
                                className="ch-msg-img"
                                loading="lazy"
                                onClick={() => setImgPreviewUrl(msg.image_url)}
                              />
                              {msg.content && (
                                <div className="ch-image-caption">{msg.content}</div>
                              )}
                            </div>
                          ) : msg.type === 'VOICE' ? (
                            <VoiceMessage
                              src={joinUrl(API_GATEWAY_BASE_URL, `${BASE}/messages/${msg.id}/voice`)}
                              mine={mine}
                              durationHint={msg.voice_duration_secs}
                              authHeaders={mediaHeaders}
                            />
                          ) : msg.type === 'SYSTEM' ? (
                            <span className="ch-system">{msg.content}</span>
                          ) : editingMsg?.id === msg.id ? (
                            <div className="ch-edit-wrap">
                              <textarea className="ch-edit-input" value={editContent} onChange={e => setEditContent(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditSave() } if (e.key === 'Escape') setEditingMsg(null) }} autoFocus rows={1} />
                              <div className="ch-edit-actions">
                                <button className="ch-btn-primary ch-btn-sm" onClick={handleEditSave}>Save</button>
                                <button className="ch-btn-ghost ch-btn-sm" onClick={() => setEditingMsg(null)}>Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <span className="ch-msg-text">{msg.content}{msg.editedAt && <em className="ch-edited"> edited</em>}</span>
                          )}
                          <div className="ch-msg-meta">
                            <span className="ch-msg-time">{formatMsgTime(msg.created_at)}</span>
                            {mine && !deleted && (() => {
                              const seen = msg.read_by?.filter(e => e !== myEmail).length > 0
                              return (
                                <span className={`ch-ticks ${seen ? 'seen' : 'sent'}`} title={seen ? 'Seen' : 'Sent'}>
                                  {/* first tick */}
                                  <svg width="11" height="8" viewBox="0 0 11 8" fill="none" className="ch-tick ch-tick-1">
                                    <path d="M1 4l3 3L10 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                  {/* second tick (offset right, overlapping) */}
                                  <svg width="11" height="8" viewBox="0 0 11 8" fill="none" className="ch-tick ch-tick-2">
                                    <path d="M1 4l3 3L10 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </span>
                              )
                            })()}
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  )
                })}

                {typingList.length > 0 && (
                  <div className="ch-msg-row theirs">
                    <div className="ch-typing-bubble">
                      <span /><span /><span />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Reply banner */}
              {replyTo && (
                <div className="ch-reply-banner">
                  <div className="ch-reply-banner-bar" />
                  <div className="ch-reply-banner-body">
                    <span className="ch-reply-banner-who">{replyTo.sender_display_name}</span>
                    <span className="ch-reply-banner-text">{replyTo.content?.slice(0, 80)}</span>
                  </div>
                  <button className="ch-icon-btn" onClick={() => setReplyTo(null)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              )}

              {/* Input bar — Lumos AI style */}
              <div className="ch-input-bar">
                {/* Mention dropdown — inside input-bar to avoid overflow:hidden clipping */}
                {mentionResults.length > 0 && (
                  <div className="ch-mention-list">
                    <div className="ch-mention-list-header">Mention</div>
                    {mentionResults.map(p => (
                      <div key={p.email} className="ch-mention-item" onClick={() => insertMention(p)}>
                        <Avatar name={p.display_name || p.email} size={34} />
                        <div className="ch-mention-item-body">
                          <span className="ch-mention-item-name">{p.display_name || p.email.split('@')[0]}</span>
                          <span className="ch-mention-item-email">{p.email}</span>
                        </div>
                        <span className="ch-mention-item-tag">@</span>
                      </div>
                    ))}
                  </div>
                )}
                <input type="file" accept="image/*,video/*" ref={fileInputRef} className="ch-file-hidden" onChange={handleImageUpload} />
                {pendingImage && (
                  <div className="ch-media-draft ch-media-draft-preview">
                    <img src={pendingImage.previewUrl} alt="Selected attachment" className="ch-media-draft-thumb" />
                    <div className="ch-media-draft-info">
                      <div className="ch-media-draft-title">Image</div>
                      <div className="ch-media-draft-name">{pendingImage.file?.name || 'Selected image'}</div>
                    </div>
                    <button className="ch-media-draft-remove" onClick={clearPendingImage} aria-label="Remove selected image">×</button>
                  </div>
                )}
                <div className="ch-input-wrap">
                  <button className="ch-input-action" title="Attach image" onClick={() => fileInputRef.current?.click()}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  </button>
                  <textarea
                    ref={inputRef}
                    className="ch-input"
                    placeholder={pendingImage ? 'Add a caption (optional)…' : 'Type a message…'}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    maxLength={4000}
                  />
                  <button
                    className={`ch-mic-btn${recording ? ' recording' : ''}`}
                    onClick={toggleRecording}
                    title={recording ? 'Stop and send voice' : 'Start recording voice'}
                  >
                    <img src="/microphone.png" alt="voice" />
                  </button>
                  <button className="ch-send-btn" onClick={handleSend} disabled={!input.trim() && !pendingImage}>
                    <img src="/sendmessage.png" alt="send" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {activeRoom && showRoomInfo && (
          <aside className="ch-info">
            <div className="ch-info-header">
              <span>Contact Info</span>
              <button className="ch-icon-btn" onClick={() => setShowRoomInfo(false)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="ch-info-hero">
              <Avatar name={getRoomName(activeRoom)} size={64} online={activeRoom.type === 'DIRECT' ? getRoomOther(activeRoom)?.is_online : undefined} />
              <div className="ch-info-hero-name">{getRoomName(activeRoom)}</div>
              <div className="ch-info-hero-sub">
                {activeRoom.type === 'GROUP' ? `${activeRoom.participants?.length || 0} members` : (getRoomOther(activeRoom)?.is_online ? 'Online' : 'Offline')}
              </div>
            </div>

            {activeRoom.type === 'GROUP' && isAdmin && (
              <div className="ch-info-section">
                <div className="ch-info-label">Rename Group</div>
                <div className="ch-info-row">
                  <input className="ch-info-input" placeholder="New group name..." value={renameVal} onChange={e => setRenameVal(e.target.value)} />
                  <button className="ch-btn-primary ch-btn-sm" onClick={renameGroup}>Save</button>
                </div>
                <button className="ch-btn-danger ch-btn-sm" onClick={deleteGroup}>Delete Group</button>
              </div>
            )}

            {activeRoom.type === 'GROUP' && isAdmin && (
              <div className="ch-info-section">
                <div className="ch-info-label">Add Member</div>
                <input className="ch-info-input" placeholder="Search by email/name..." value={addMemberQ} onChange={e => setAddMemberQ(e.target.value)} />
                {addMemberRes.map(u => (
                  <div key={u.email} className="ch-info-member ch-info-member-add" onClick={() => addParticipant(u.email)}>
                    <Avatar name={u.display_name || u.email} size={30} online={u.is_online} />
                    <div className="ch-info-member-body">
                      <div className="ch-info-member-name">{u.display_name || u.email.split('@')[0]}</div>
                      <div className="ch-info-member-role">{u.email}</div>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9DD957" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                  </div>
                ))}
              </div>
            )}

            {activeRoom.type === 'GROUP' && !isAdmin && (
              <div className="ch-info-section">
                <button className="ch-btn-primary ch-btn-danger ch-btn-sm" style={{ width: '100%', justifyContent: 'center', gap: 8 }} onClick={leaveGroup}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  Leave Group
                </button>
              </div>
            )}

            <div className="ch-info-section">
              <div className="ch-info-label">Members</div>
              {(activeRoom.participants || []).map(p => (
                <div key={p.email} className="ch-info-member">
                  <Avatar name={p.display_name || p.email} size={30} />
                  <div className="ch-info-member-body">
                    <div className="ch-info-member-name">{p.display_name || p.email.split('@')[0]}</div>
                    <div className="ch-info-member-role">{p.role || 'MEMBER'}</div>
                  </div>
                  {activeRoom.type === 'GROUP' && isAdmin && p.email !== myEmail && (
                    <button className="ch-remove-btn" onClick={() => removeParticipant(p.email)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </aside>
        )}

      </div>

      {/* Image lightbox */}
      {imgPreviewUrl && (
        <div
          className="ch-lightbox-overlay"
          role="dialog"
          aria-modal="true"
          onClick={(e) => { if (e.target === e.currentTarget) setImgPreviewUrl(null) }}
          onKeyDown={(e) => { if (e.key === 'Escape') setImgPreviewUrl(null) }}
          tabIndex={-1}
        >
          <div className="ch-lightbox">
            <button className="ch-lightbox-close" onClick={() => setImgPreviewUrl(null)} aria-label="Close preview">×</button>
            <img className="ch-lightbox-img" src={imgPreviewUrl} alt="Preview" />
            <a className="ch-lightbox-open" href={imgPreviewUrl} target="_blank" rel="noreferrer">Open in new tab</a>
          </div>
        </div>
      )}

      {/* Context menu */}
      {msgCtx && (
        <>
          <div className="ch-ctx-overlay" onClick={() => setMsgCtx(null)} />
          <div className="ch-ctx-menu" style={{ top: msgCtx.y, left: msgCtx.x }}>
            <button onClick={() => { setReplyTo(msgCtx.msg); setMsgCtx(null) }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
              Reply
            </button>
            {isMyMsg(msgCtx.msg) && !msgCtx.msg.deletedAt && msgCtx.msg.type === 'TEXT' && (
              <button onClick={() => { setEditingMsg(msgCtx.msg); setEditContent(msgCtx.msg.content); setMsgCtx(null) }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Edit
              </button>
            )}
            {isMyMsg(msgCtx.msg) && !msgCtx.msg.deletedAt && (
              <button className="danger" onClick={() => handleDelete(msgCtx.msg.id)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                Delete
              </button>
            )}
          </div>
        </>
      )}

      {/* ── New Group Modal ── */}
      {showNewGroup && (
        <div className="ch-modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setShowNewGroup(false); setGroupName(''); setGroupMembers([]) } }}>
          <div className="ch-modal">
            <h2 className="ch-modal-title">New Group Chat</h2>

            <div className="ch-modal-field">
              <label className="ch-modal-label">Group Name</label>
              <input
                className="ch-modal-input"
                placeholder="e.g. Study Squad, Project Team…"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="ch-modal-field">
              <label className="ch-modal-label">Add Members</label>
              <div className="ch-modal-search-wrap">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
                <input
                  className="ch-modal-search"
                  placeholder="Search by name or email…"
                  value={groupSearch}
                  onChange={e => setGroupSearch(e.target.value)}
                />
              </div>
            </div>

            {groupMembers.length > 0 && (
              <div className="ch-modal-chips">
                {groupMembers.map(m => (
                  <span key={m.email} className="ch-chip">
                    {m.display_name || m.email.split('@')[0]}
                    <button onClick={() => setGroupMembers(prev => prev.filter(x => x.email !== m.email))}>×</button>
                  </span>
                ))}
              </div>
            )}

            <div className="ch-modal-results">
              {groupSearchRes.map(u => (
                <div key={u.email} className="ch-modal-user" onClick={() => { setGroupMembers(p => [...p, u]); setGroupSearch('') }}>
                  <Avatar name={u.display_name || u.email} size={36} />
                  <div>
                    <div className="ch-modal-user-name">{u.display_name || u.email.split('@')[0]}</div>
                    <div className="ch-modal-user-email">{u.email}</div>
                  </div>
                </div>
              ))}
              {groupSearch && groupSearchRes.length === 0 && <div className="ch-modal-empty">No users found</div>}
            </div>

            <div className="ch-modal-footer">
              <button className="ch-btn-ghost" onClick={() => { setShowNewGroup(false); setGroupName(''); setGroupMembers([]) }}>Cancel</button>
              <button className="ch-btn-primary" onClick={createGroup} disabled={!groupName.trim() || groupMembers.length < 1}>
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm modal */}
      {confirmModal && (
        <div className="ch-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setConfirmModal(null) }}>
          <div className="ch-confirm-modal">
            <div className="ch-confirm-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <h3 className="ch-confirm-title">{confirmModal.title}</h3>
            <p className="ch-confirm-message">{confirmModal.message}</p>
            <div className="ch-confirm-footer">
              <button className="ch-btn-ghost" onClick={() => setConfirmModal(null)}>Cancel</button>
              <button className="ch-btn-primary ch-btn-danger" onClick={async () => { await confirmModal.onConfirm(); setConfirmModal(null) }}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
