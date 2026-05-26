import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import './unihub.css'

const CAPTIONS = [
  'Your next great idea starts with a conversation.',
  'Face-to-face, wherever you are.',
  'Study together, grow together.',
  'No distance too far for a great lecture.',
  'Click. Connect. Collaborate.',
]

function slugify(str) {
  return str.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'room'
}

function generateRoomId() {
  return 'unihub-' + Math.random().toString(36).slice(2, 9)
}

function loadJitsiScript(cb) {
  if (window.JitsiMeetExternalAPI) { cb(); return }
  if (document.getElementById('jitsi-script')) {
    const interval = setInterval(() => {
      if (window.JitsiMeetExternalAPI) { clearInterval(interval); cb() }
    }, 100)
    return
  }
  const s = document.createElement('script')
  s.id = 'jitsi-script'
  s.src = 'https://meet.jit.si/external_api.js'
  s.async = true
  s.onload = cb
  document.head.appendChild(s)
}

export default function VideoChats() {
  const { user } = useAuth()
  const displayName = user?.first_name || user?.firstName || user?.name || user?.email || 'User'

  const [roomInput, setRoomInput] = useState('')
  const [activeRoom, setActiveRoom] = useState(null)
  const [copied, setCopied] = useState(false)
  const [captionIdx, setCaptionIdx] = useState(0)
  const [captionVisible, setCaptionVisible] = useState(true)
  const containerRef = useRef(null)
  const apiRef = useRef(null)

  const meetingLink = activeRoom ? `https://meet.jit.si/${activeRoom}` : ''

  useEffect(() => {
    const interval = setInterval(() => {
      setCaptionVisible(false)
      setTimeout(() => {
        setCaptionIdx(i => (i + 1) % CAPTIONS.length)
        setCaptionVisible(true)
      }, 400)
    }, 3500)
    return () => clearInterval(interval)
  }, [])

  function handleCreate() {
    const room = roomInput.trim() ? slugify(roomInput) : generateRoomId()
    setActiveRoom(room)
  }

  function handleJoin() {
    if (!roomInput.trim()) return
    setActiveRoom(slugify(roomInput))
  }

  function handleLeave() {
    if (apiRef.current) {
      try { apiRef.current.dispose() } catch (_) {}
      apiRef.current = null
    }
    setActiveRoom(null)
    setRoomInput('')
    setCopied(false)
  }

  function handleCopy() {
    navigator.clipboard.writeText(meetingLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  useEffect(() => {
    if (!activeRoom) return
    loadJitsiScript(() => {
      if (!containerRef.current || apiRef.current) return
      apiRef.current = new window.JitsiMeetExternalAPI('meet.jit.si', {
        roomName: activeRoom,
        parentNode: containerRef.current,
        width: '100%',
        height: '100%',
        userInfo: { displayName },
        configOverwrite: {
          startWithAudioMuted: true,
          startWithVideoMuted: false,
          disableDeepLinking: true,
          prejoinPageEnabled: false,
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: ['microphone','camera','desktop','fullscreen','fodeviceselection','hangup','chat','raisehand','videoquality','tileview','settings'],
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
        },
      })
      apiRef.current.addEventListener('readyToClose', handleLeave)
    })
    return () => {
      if (apiRef.current) { try { apiRef.current.dispose() } catch (_) {} apiRef.current = null }
    }
  }, [activeRoom])

  return (
    <div className="vc-root">

      {/* Animated background blobs */}
      <div className="vc-bg">
        <div className="vc-blob vc-blob-1" />
        <div className="vc-blob vc-blob-2" />
        <div className="vc-blob vc-blob-3" />
      </div>

      {/* Lobby */}
      {!activeRoom && (
        <div className="vc-lobby">
          <div className="vc-lobby-card">

            {/* Animated icon */}
            <div className="vc-cam-wrap">
              <div className="vc-cam-ring vc-cam-ring-1" />
              <div className="vc-cam-ring vc-cam-ring-2" />
              <div className="vc-cam-icon">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#B9FF66" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 10l4.553-2.369A1 1 0 0 1 21 8.535v6.93a1 1 0 0 1-1.447.904L15 14"/>
                  <rect x="2" y="7" width="13" height="10" rx="2"/>
                </svg>
              </div>
            </div>

            <h1 className="vc-main-title">UniHub <span className="vc-lime">Meetings</span></h1>

            <p className={`vc-caption ${captionVisible ? 'vc-caption-in' : 'vc-caption-out'}`}>
              {CAPTIONS[captionIdx]}
            </p>

            <div className="vc-card-body">
              {/* New meeting */}
              <div className="vc-form-group">
                <label className="vc-label">Room name <span className="vc-optional">(optional)</span></label>
                <input
                  className="vc-input"
                  type="text"
                  placeholder="e.g. math-101-revision"
                  value={roomInput}
                  onChange={e => setRoomInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                />
              </div>

              <button className="vc-btn vc-btn-primary" onClick={handleCreate}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Start New Meeting
              </button>

              <div className="vc-or"><span>or join with a room name</span></div>

              <div className="vc-join-row">
                <input
                  className="vc-input"
                  type="text"
                  placeholder="Enter room name to join…"
                  value={roomInput}
                  onChange={e => setRoomInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleJoin()}
                />
                <button className="vc-btn vc-btn-ghost" onClick={handleJoin} disabled={!roomInput.trim()}>
                  Join
                </button>
              </div>
            </div>

            <p className="vc-tip">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Share the room name so classmates can join instantly
            </p>

          </div>
        </div>
      )}

      {/* Meeting — always in DOM */}
      <div className="vc-meeting-wrap" style={{ display: activeRoom ? 'flex' : 'none' }}>
        <div className="vc-meeting-bar">
          <div className="vc-room-label">
            <span className="vc-live-dot" />
            <span>{activeRoom}</span>
          </div>
          <div className="vc-bar-actions">
            <button className="vc-copy-btn" onClick={handleCopy}>
              {copied ? (
                <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#B9FF66" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg> Copied!</>
              ) : (
                <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy Link</>
              )}
            </button>
            <button className="vc-leave-btn" onClick={handleLeave}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Leave
            </button>
          </div>
        </div>
        <div ref={containerRef} className="vc-frame" />
      </div>

    </div>
  )
}
