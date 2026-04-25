import React, { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { streamPost, get, deleteRequest, streamPostEmpty } from '../utils/api'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

function useToast() {
  const [visible, setVisible] = useState(false)
  const timerRef = useRef(null)
  function show() {
    setVisible(true)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setVisible(false), 1800)
  }
  return [visible, show]
}

function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text)
  }
  // Fallback for non-HTTPS
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.focus()
  ta.select()
  document.execCommand('copy')
  document.body.removeChild(ta)
  return Promise.resolve()
}

function UserMessage({ text, initial, onCopy }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      className="lumos-msg-row lumos-msg-row--user"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="lumos-msg-actions lumos-msg-actions--user" style={{ opacity: hovered ? 1 : 0 }}>
        <button className="lumos-action-btn" title="Copy" onClick={() => { copyText(text).catch(() => {}); onCopy() }}>
          <img src="/copy.png" alt="copy" />
        </button>
      </div>
      <div className="lumos-bubble--user">{text}</div>
      <div className="lumos-avatar--user">{initial}</div>
    </div>
  )
}

function makeMarkdownComponents(onCopy) {
  return {
    code({ node, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '')
      const codeText = String(children).replace(/\n$/, '')
      const isBlock = !!match || codeText.includes('\n')
      if (isBlock) {
        return (
          <div className="lumos-code-block">
            <div className="lumos-code-header">
              <span className="lumos-code-lang">{match ? match[1] : 'code'}</span>
              <button
                className="lumos-code-copy"
                onClick={() => { copyText(codeText).catch(() => {}); onCopy() }}
              >Copy</button>
            </div>
            <SyntaxHighlighter style={oneDark} language={match ? match[1] : 'text'} PreTag="div" {...props}>
              {codeText}
            </SyntaxHighlighter>
          </div>
        )
      }
      return <code className="lumos-inline-code" {...props}>{children}</code>
    }
  }
}

const THINKING_PHRASES = [
  'Cogitating...',
  'Cerebrating...',
  'Ruminating...',
  'Philosophising...',
  'Pondering...',
  'Marinating...',
  'Simmering...',
  'Concocting...',
  'Hustling...',
]

function ThinkingDots() {
  const [phraseIdx, setPhraseIdx] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setPhraseIdx(i => (i + 1) % THINKING_PHRASES.length), 1800)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="lumos-thinking">
      <span className="lumos-thinking-text">{THINKING_PHRASES[phraseIdx]}</span>
      <span className="lumos-thinking-dots">
        <span /><span /><span />
      </span>
    </div>
  )
}

function AiMessage({ text, streaming, onRetry, prevUserText, onCopy }) {
  const [hovered, setHovered] = useState(false)
  const markdownComponents = makeMarkdownComponents(onCopy)
  return (
    <div
      className="lumos-msg-row lumos-msg-row--ai"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="lumos-ai-text lumos-ai-markdown">
        {streaming && text === '' ? (
          <ThinkingDots />
        ) : streaming ? (
          <span style={{ whiteSpace: 'pre-wrap' }}>{text}<span className="lumos-cursor" /></span>
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{text}</ReactMarkdown>
        )}
      </div>
      {!streaming && (
        <div className="lumos-msg-actions lumos-msg-actions--ai" style={{ opacity: hovered ? 1 : 0 }}>
          <button className="lumos-action-btn" title="Copy" onClick={() => { copyText(text).catch(() => {}); onCopy() }}>
            <img src="/copy.png" alt="copy" />
          </button>
          {prevUserText && (
            <button className="lumos-action-btn" title="Retry" onClick={() => onRetry(prevUserText)}>
              <img src="/reload.png" alt="retry" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}


export default function LumosAI({ newChat: newChatProp, explainMaterialId: explainIdProp, explainMaterialTitle: explainTitleProp, onExplainConsumed }) {
  const { user } = useAuth()
  const location = useLocation()
  const newChat = newChatProp || location.state?.newChat
  const explainMaterialId = explainIdProp || location.state?.explainMaterialId || null
  const explainMaterialTitle = explainTitleProp || location.state?.explainMaterialTitle || 'this material'
  const userEmail = user?.email || ''
  const userInitial = (user?.first_name || user?.firstName || user?.name || userEmail || 'U')[0].toUpperCase()

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [fading, setFading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [recording, setRecording] = useState(false)
  const [toastVisible, showToast] = useToast()
  const taRef = useRef(null)
  const chatRef = useRef(null)
  const bodyRef = useRef(null)
  const abortRef = useRef(null)
  const mediaRef = useRef(null)
  const typewriterQueueRef = useRef('')
  const typewriterTimerRef = useRef(null)

  function startTypewriter() {
    if (typewriterTimerRef.current) return
    typewriterTimerRef.current = setInterval(() => {
      if (typewriterQueueRef.current.length === 0) return
      // Take up to 6 chars per tick for a fast but visible effect
      const chunk = typewriterQueueRef.current.slice(0, 6)
      typewriterQueueRef.current = typewriterQueueRef.current.slice(6)
      setMessages(m => {
        const copy = [...m]
        const last = copy[copy.length - 1]
        if (last && last.from === 'ai') {
          copy[copy.length - 1] = { ...last, text: last.text + chunk }
        }
        return copy
      })
    }, 16)
  }

  function stopTypewriter() {
    clearInterval(typewriterTimerRef.current)
    typewriterTimerRef.current = null
    // Flush remaining queue instantly
    if (typewriterQueueRef.current.length > 0) {
      const remaining = typewriterQueueRef.current
      typewriterQueueRef.current = ''
      setMessages(m => {
        const copy = [...m]
        const last = copy[copy.length - 1]
        if (last && last.from === 'ai') {
          copy[copy.length - 1] = { ...last, text: last.text + remaining }
        }
        return copy
      })
    }
  }

  function handleStop() {
    abortRef.current?.abort()
    stopTypewriter()
  }


  const capabilities = [
    'Summarize material',
    'Create practice questions',
    'Explain topics',
    'Create roadmap',
    'Help with assignments',
    'Create test bank questions',
    'And more...'
  ]

  // Load chat history on mount — skip for new chat or explain flows
  useEffect(() => {
    if (!userEmail) return
    if (newChat) return
    if (explainMaterialId) return
    get('ai/api/v1/chat/history').then(data => {
      if (!Array.isArray(data) || data.length === 0) return
      const loaded = data
        .filter(m => m.messageType === 'USER' || m.messageType === 'ASSISTANT')
        .map(m => ({
          from: m.messageType === 'USER' ? 'user' : 'ai',
          text: (typeof m.text === 'string' ? m.text : (m.content || '')).replace(/\\n/g, '\n')
        }))
      if (loaded.length > 0) setMessages(loaded)
    }).catch(() => {})
  }, [userEmail])

  // Handle "Start new chat" — clear backend history then reset UI
  useEffect(() => {
    if (!newChat || !userEmail) return
    deleteRequest('ai/api/v1/chat/history').catch(() => {})
    setMessages([])
    setInput('')
  }, [newChat])

  // Handle "Explain with AI" — load history first, then append explain and stream
  useEffect(() => {
    if (!explainMaterialId || !userEmail) return
    onExplainConsumed?.()
    get('ai/api/v1/chat/history').then(data => {
      const loaded = Array.isArray(data)
        ? data
            .filter(m => m.messageType === 'USER' || m.messageType === 'ASSISTANT')
            .map(m => ({
              from: m.messageType === 'USER' ? 'user' : 'ai',
              text: (typeof m.text === 'string' ? m.text : (m.content || '')).replace(/\\n/g, '\n')
            }))
        : []
      setMessages(loaded)
      streamExplain(explainMaterialId, 'Explain this material')
    }).catch(() => {
      setMessages([])
      streamExplain(explainMaterialId, 'Explain this material')
    })
  }, [explainMaterialId, userEmail])

  // Stream a text message to the AI
  async function streamMessage(text) {
    setStreaming(true)
    typewriterQueueRef.current = ''
    setMessages(m => [...m, { from: 'ai', text: '', streaming: true }])
    abortRef.current = new AbortController()
    const params = new URLSearchParams({ message: text })

    try {
      await streamPost('ai/api/v1/chat/message', params, {
        signal: abortRef.current.signal,
        onChunk: chunk => {
          typewriterQueueRef.current += chunk
          startTypewriter()
        }
      })
      // Wait for typewriter to finish flushing
      await new Promise(resolve => {
        const check = setInterval(() => {
          if (typewriterQueueRef.current.length === 0) {
            clearInterval(check)
            resolve()
          }
        }, 20)
      })
    } catch (err) {
      stopTypewriter()
      if (err.name !== 'AbortError') {
        setMessages(m => {
          const copy = [...m]
          const last = copy[copy.length - 1]
          if (last && last.from === 'ai' && last.text === '') {
            copy[copy.length - 1] = { ...last, text: 'Something went wrong. Please try again.' }
          }
          return copy
        })
      }
    } finally {
      stopTypewriter()
      setMessages(m => {
        const copy = [...m]
        const last = copy[copy.length - 1]
        if (last && last.from === 'ai') {
          copy[copy.length - 1] = { ...last, streaming: false }
        }
        return copy
      })
      setStreaming(false)
    }
  }

  async function streamExplain(materialId, userMessage) {
    setStreaming(true)
    typewriterQueueRef.current = ''
    setMessages(m => [
      ...m,
      ...(userMessage ? [{ from: 'user', text: userMessage }] : []),
      { from: 'ai', text: '', streaming: true }
    ])
    abortRef.current = new AbortController()
    try {
      await streamPostEmpty(`ai/api/v1/chat/explain/${materialId}`, {
        signal: abortRef.current.signal,
        headers: { 'X-User-Email': userEmail },
        onChunk: chunk => {
          typewriterQueueRef.current += chunk
          startTypewriter()
        }
      })
      await new Promise(resolve => {
        const check = setInterval(() => {
          if (typewriterQueueRef.current.length === 0) { clearInterval(check); resolve() }
        }, 20)
      })
    } catch (err) {
      stopTypewriter()
      if (err.name !== 'AbortError') {
        setMessages(m => {
          const copy = [...m]
          const last = copy[copy.length - 1]
          if (last && last.from === 'ai' && last.text === '') {
            copy[copy.length - 1] = { ...last, text: 'Something went wrong. Please try again.' }
          }
          return copy
        })
      }
    } finally {
      stopTypewriter()
      setMessages(m => {
        const copy = [...m]
        const last = copy[copy.length - 1]
        if (last && last.from === 'ai') copy[copy.length - 1] = { ...last, streaming: false }
        return copy
      })
      setStreaming(false)
    }
  }

  function sendMessage(text) {
    if (!text.trim() || streaming) return
    const trimmed = text.trim()
    const dispatch = () => {
      setMessages(m => [...m, { from: 'user', text: trimmed }])
      streamMessage(trimmed)
      setInput('')
    }
    if (messages.length === 0) {
      setFading(true)
      setTimeout(() => { setFading(false); dispatch() }, 300)
    } else {
      dispatch()
    }
  }

  function handleSend() { sendMessage(input) }

  function handleRetry(text) {
    if (streaming) return
    setMessages(m => [...m, { from: 'user', text }])
    streamMessage(text)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  // Voice recording
  function handleMicClick() {
    if (recording) {
      mediaRef.current?.stop()
      return
    }
    navigator.mediaDevices?.getUserMedia({ audio: true }).then(stream => {
      const chunks = []
      // Pick best MIME type Whisper supports; fallback to browser default
      const mimeType = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
        .find(t => MediaRecorder.isTypeSupported(t)) || ''
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      mediaRef.current = mr
      mr.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        setRecording(false)
        if (chunks.length === 0) return
        const actualType = mr.mimeType || 'audio/webm'
        const blob = new Blob(chunks, { type: actualType })
        const formData = new FormData()
        formData.append('message', blob, 'voice.mp3')

        setMessages(m => [...m, { from: 'user', text: '🎤 Voice message' }])
        setStreaming(true)
        setMessages(m => [...m, { from: 'ai', text: '', streaming: true }])
        abortRef.current = new AbortController()
        try {
          await streamPost('ai/api/v1/chat/voice', formData, {
            signal: abortRef.current.signal,
            onChunk: chunk => {
              setMessages(m => {
                const copy = [...m]
                const last = copy[copy.length - 1]
                if (last && last.from === 'ai') {
                  copy[copy.length - 1] = { ...last, text: last.text + chunk }
                }
                return copy
              })
            }
          })
        } catch (err) {
          if (err.name !== 'AbortError') {
            setMessages(m => {
              const copy = [...m]
              const last = copy[copy.length - 1]
              if (last && last.from === 'ai' && last.text === '') {
                copy[copy.length - 1] = { ...last, text: 'Something went wrong. Please try again.' }
              }
              return copy
            })
          }
        } finally {
          setMessages(m => {
            const copy = [...m]
            const last = copy[copy.length - 1]
            if (last && last.from === 'ai') {
              copy[copy.length - 1] = { ...last, streaming: false }
            }
            return copy
          })
          setStreaming(false)
        }
      }
      mr.start()
      setRecording(true)
    }).catch(() => {})
  }

  useEffect(() => {
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [input])

  useEffect(() => {
    const el = bodyRef.current || chatRef.current
    if (!el) return
    setTimeout(() => { el.scrollTop = el.scrollHeight }, 50)
  }, [messages])

  const hasMessages = messages.length > 0

  return (
    <div className={`lumos-page ${hasMessages ? 'lumos-page--has-messages' : ''}`}>

      {!hasMessages && (
        <div className={`lumos-header${fading ? ' lumos-fade-out' : ''}`}>
          <h2 className="lumos-title">
            <span className="lumos-letters">
              <span>L</span><span>u</span><span>m</span><span>o</span><span>s</span>
            </span>
            <span className="lumos-ai"> AI</span>
          </h2>
        </div>
      )}

      <div className={`lumos-body ${!hasMessages ? 'lumos-empty-state' : 'lumos-has-messages'}`} ref={bodyRef}>
        {!hasMessages ? (
          <div className={`lumos-empty${fading ? ' lumos-fade-out' : ''}`}>
            <div className="lumos-brand">
              <img src="/lumosAi.png" alt="lumos" className="lumos-logo" />
              <div className="lumos-slogan">Connecting Knowledge, Empowering Minds.</div>
            </div>
            <div className="lumos-capabilities">
              {capabilities.map(c => (
                <div
                  key={c}
                  className="lumos-capability"
                  style={{ cursor: 'pointer' }}
                  onClick={() => { setInput(c); taRef.current?.focus() }}
                >{c}</div>
              ))}
            </div>
          </div>
        ) : (
          <div className="lumos-chat" ref={chatRef}>
            {messages.map((m, i) => {
              if (m.from === 'user') {
                return <UserMessage key={i} text={m.text} initial={userInitial} onCopy={showToast} />
              }
              const prevUser = [...messages].slice(0, i).reverse().find(x => x.from === 'user')
              return (
                <AiMessage
                  key={i}
                  text={m.text}
                  streaming={!!m.streaming}
                  onRetry={handleRetry}
                  prevUserText={prevUser?.text}
                  onCopy={showToast}
                />
              )
            })}
          </div>
        )}
      </div>

      <div className="lumos-input-bar">
        <div className="lumos-input-inner">
          <textarea
            ref={taRef}
            className="lumos-input-textarea"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={!hasMessages ? 'Start a conversation with Lumos AI (Enter to send)...' : 'Type a message (Enter to send)...'}
            rows={1}
            disabled={streaming}
          />
          {streaming ? (
            <button
              className="lumos-input-send lumos-input-stop"
              onClick={handleStop}
              aria-label="stop"
            >
              <span className="lumos-stop-icon" />
            </button>
          ) : (
            <button
              className={`lumos-input-send${recording ? ' lumos-input-send--recording' : ''}`}
              onClick={input.trim() ? handleSend : handleMicClick}
              aria-label={input.trim() ? 'send' : recording ? 'stop recording' : 'voice'}
            >
              {input.trim()
                ? <img src="/sendmessage.png" alt="send" />
                : <img src="/microphone.png" alt="voice" />
              }
            </button>
          )}
        </div>
      </div>

      <div className={`lumos-copy-toast${toastVisible ? ' visible' : ''}`}>Copied to clipboard</div>

    </div>
  )
}
