import React, { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { get } from '../utils/api'
import './classroom-assignment-calendar.css'

const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

const todayBase = new Date()
todayBase.setHours(0, 0, 0, 0)

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth()  === b.getMonth()  &&
    a.getDate()   === b.getDate()
}

function daysFromToday(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return Math.round((d - todayBase) / 86400000)
}

function getBadge(diff) {
  if (diff < 0)   return { label: 'Ended',          cls: 'cac-badge-grey'   }
  if (diff === 0) return { label: 'Due Today',       cls: 'cac-badge-red'    }
  if (diff === 1) return { label: 'Due Tomorrow',    cls: 'cac-badge-orange' }
  if (diff <= 7)  return { label: `In ${diff} days`, cls: 'cac-badge-orange' }
  return               { label: `In ${diff} days`, cls: 'cac-badge-green'  }
}

function getCardType(diff) {
  if (diff < 0)   return 'grey'
  if (diff === 0) return 'red'
  return 'green'
}

/* ── Cell Popup ─────────────────────────────────── */
function CellPopup({ day, events, anchorRect, onClose, onView }) {
  const popupRef = useRef(null)

  const POPUP_W = 300
  const POPUP_H = 60 + events.length * 80
  const vw = window.innerWidth
  const vh = window.innerHeight

  let left = anchorRect.right + 8
  if (left + POPUP_W > vw - 8) left = anchorRect.left - POPUP_W - 8
  let top = anchorRect.top
  if (top + POPUP_H > vh - 8) top = vh - POPUP_H - 8
  if (top < 8) top = 8

  useEffect(() => {
    function handler(e) {
      if (popupRef.current && !popupRef.current.contains(e.target)) onClose()
    }
    const t = setTimeout(() => document.addEventListener('mousedown', handler), 0)
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handler) }
  }, [onClose])

  useEffect(() => {
    function handler(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const dateLabel = day.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })

  return createPortal(
    <div ref={popupRef} className="cac-popup" style={{ left, top, width: POPUP_W }}>
      <div className="cac-popup-header">
        <div className="cac-popup-date">{dateLabel}</div>
        <button className="cac-popup-close" onClick={onClose}>{'\u00D7'}</button>
      </div>

      <div className="cac-popup-events">
        {events.map((ev, i) => {
          const diff  = daysFromToday(ev.due)
          const badge = getBadge(diff)
          const type  = getCardType(diff)
          return (
            <div
              key={i}
              className={`cac-popup-event cac-popup-event-${type}${ev.mid ? ' cac-popup-event-clickable' : ''}`}
              onClick={() => ev.mid && onView(ev)}
            >
              <div className="cac-popup-event-top">
                <span className={`cac-popup-dot cac-popup-dot-${type}`} />
                <span className="cac-popup-title">{ev.title}</span>
                <span className={`cac-badge ${badge.cls}`}>{badge.label}</span>
              </div>
              {ev.description && (
                <div className="cac-popup-desc">{ev.description}</div>
              )}
              <div className="cac-popup-meta">
                <img src="/calendar.png" alt="" className="cac-cal-icon" />
                <span>
                  {ev.due.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  {' \u00B7 '}
                  {ev.due.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
                {ev.points && <span className="cac-popup-pts">{ev.points} pts</span>}
              </div>
              {ev.mid && (
                <div className="cac-popup-open-hint">Click to open assignment {'\u2192'}</div>
              )}
            </div>
          )
        })}
      </div>
    </div>,
    document.body
  )
}

/* ── UNO Deck ───────────────────────────────────── */
function UnoDeck({ cards, emptyText, onView }) {
  const [idx, setIdx]         = useState(0)
  const [animKey, setAnimKey] = useState(0)
  const [slide, setSlide]     = useState('in')

  useEffect(() => {
    setIdx(i => Math.min(i, Math.max(0, cards.length - 1)))
  }, [cards.length])

  function go(dir) {
    setSlide(dir > 0 ? 'left' : 'right')
    setTimeout(() => {
      setIdx(i => Math.min(Math.max(0, i + dir), cards.length - 1))
      setAnimKey(k => k + 1)
      setSlide('in')
    }, 160)
  }

  if (cards.length === 0) {
    return <div className="cac-deck-empty">{emptyText}</div>
  }

  const card     = cards[idx]
  const diff     = daysFromToday(card.due)
  const badge    = getBadge(diff)
  const cardType = getCardType(diff)

  return (
    <div className="cac-deck">
      <button
        className="cac-deck-arrow"
        onClick={() => go(-1)}
        disabled={idx === 0}
        aria-label="Previous"
      >{'\u2039'}</button>

      <div
        key={animKey}
        className={`cac-uno-card cac-card-${cardType} cac-slide-${slide}${card.mid && onView ? ' cac-uno-card-clickable' : ''}`}
        onClick={() => card.mid && onView && onView(card)}
        title={card.mid && onView ? 'Click to open assignment' : undefined}
      >
        <div className={`cac-uno-accent cac-accent-${cardType}`} />
        <div className="cac-uno-body">
          <div className="cac-uno-top-row">
            <div className="cac-uno-title">{card.title}</div>
            <span className={`cac-badge ${badge.cls}`}>{badge.label}</span>
          </div>
          {card.description && (
            <div className="cac-uno-desc">{card.description}</div>
          )}
          <div className="cac-uno-footer">
            <div className="cac-uno-due">
              <img src="/calendar.png" alt="" className="cac-cal-icon" />
              {card.due.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              {' \u00B7 '}
              {card.due.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="cac-uno-footer-right">
              {card.points && <span className="cac-pts">{card.points} pts</span>}
              {card.mid && onView && (
                <span className="cac-open-btn">Open {'\u2192'}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <button
        className="cac-deck-arrow"
        onClick={() => go(1)}
        disabled={idx === cards.length - 1}
        aria-label="Next"
      >{'\u203A'}</button>

      {cards.length > 1 && (
        <div className="cac-deck-dots">
          {cards.map((_, i) => (
            <button
              key={i}
              className={`cac-deck-dot${i === idx ? ' active' : ''}`}
              onClick={() => { setAnimKey(k => k + 1); setSlide('in'); setIdx(i) }}
              aria-label={`Card ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Main ───────────────────────────────────────── */
export default function ClassroomAssignmentCalendar({ classroomId, onViewMaterial, classroom }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading]         = useState(true)
  const [selectedDay, setSelectedDay] = useState(null)
  const [popup, setPopup]             = useState(null)

  const fetchAll = useCallback(async () => {
    if (!classroomId) return
    setLoading(true)
    const results = []
    try {
      let page = 1
      while (true) {
        const res  = await get(`classroom/api/v1/material/get-all-assignments/${classroomId}?page_num=${page}`)
        const list = res?.assignments || []
        list.forEach(a => {
          if (a.due_date) {
            results.push({
              // identity — needed to navigate to detail page
              mid:         a.material?.mid || a.material?.material_id || a.material?.id || null,
              title:       a.material?.head_line   || 'Assignment',
              description: a.material?.description || '',
              due:         new Date(a.due_date),
              points:      a.points,
              // pass full material shape so handleViewMaterial can read it
              material_type: 'ASSIGNMENT',
            })
          }
        })
        if (list.length < 5) break
        page++
      }
    } catch (_) {}
    setAssignments(results)
    setLoading(false)
  }, [classroomId])

  useEffect(() => { fetchAll() }, [fetchAll])

  function handleView(ev) {
    if (!ev?.mid || !onViewMaterial) return
    onViewMaterial({
      mid:           ev.mid,
      material_id:   ev.mid,
      id:            ev.mid,
      head_line:     ev.title,
      description:   ev.description,
      material_type: 'ASSIGNMENT',
    })
  }

  const prevMonth = () => { const d = new Date(currentDate); d.setMonth(d.getMonth() - 1); setCurrentDate(d) }
  const nextMonth = () => { const d = new Date(currentDate); d.setMonth(d.getMonth() + 1); setCurrentDate(d) }
  const goToday   = () => { setCurrentDate(new Date()); setSelectedDay(new Date()) }

  const eventsOnDay = day => assignments.filter(a => sameDay(a.due, day))

  const firstOfMonth   = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const firstDayOfWeek = firstOfMonth.getDay()
  const daysInMonth    = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const totalCells     = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7
  const monthCells     = Array.from({ length: totalCells }, (_, i) => {
    const d = new Date(firstOfMonth)
    d.setDate(1 - firstDayOfWeek + i)
    return d
  })

  const headerLabel = `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`

  const todayCards = assignments
    .filter(a => sameDay(a.due, todayBase))
    .sort((a, b) => a.due - b.due)

  const upcomingCards = assignments
    .filter(a => { const d = new Date(a.due); d.setHours(0,0,0,0); return d > todayBase })
    .sort((a, b) => a.due - b.due)

  const selectedEvents = selectedDay ? eventsOnDay(selectedDay) : []

  function handleCellClick(e, day, events) {
    if (!events.length) return
    const rect = e.currentTarget.getBoundingClientRect()
    setPopup({ day, events, anchorRect: rect })
    setSelectedDay(day)
  }

  return (
    <div className="cac-root">

      {/* ══ Calendar ══════════════════════════════ */}
      <div className="cac-calendar-area">
        <div className="cac-toolbar">
          <div className="cac-toolbar-left">
            <button className="cac-today-btn" onClick={goToday}>Today</button>
            <button className="cac-nav-btn" onClick={prevMonth}>{'\u2039'}</button>
            <button className="cac-nav-btn" onClick={nextMonth}>{'\u203A'}</button>
            <span className="cac-header-label">{headerLabel}</span>
          </div>
          {!loading && (
            <div className="cac-count-pill">
              {todayCards.length > 0 && (
                <span className="cac-count-red">{todayCards.length} due today</span>
              )}
              {todayCards.length > 0 && upcomingCards.length > 0 && (
                <span className="cac-count-sep">{'\u00B7'}</span>
              )}
              {upcomingCards.length > 0 && (
                <span className="cac-count-green">{upcomingCards.length} upcoming</span>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div className="cac-loading">Loading assignments…</div>
        ) : (
          <div className="cac-month-root">
            <div className="cac-month-header">
              {DAYS.map(d => <div key={d} className="cac-day-name">{d}</div>)}
            </div>
            <div className="cac-month-grid">
              {monthCells.map((day, i) => {
                const isCurrentMonth = day.getMonth() === currentDate.getMonth()
                const isToday        = sameDay(day, todayBase)
                const isSelected     = selectedDay && sameDay(day, selectedDay)
                const events         = eventsOnDay(day)
                const hasDue         = events.length > 0
                const allEnded       = hasDue && events.every(e => daysFromToday(e.due) < 0)

                return (
                  <div
                    key={i}
                    className={[
                      'cac-cell',
                      !isCurrentMonth ? 'cac-cell-other'    : '',
                      isSelected      ? 'cac-cell-selected' : '',
                      hasDue          ? 'cac-cell-clickable': '',
                    ].filter(Boolean).join(' ')}
                    onClick={e => handleCellClick(e, day, events)}
                  >
                    <div className="cac-cell-top">
                      <span className={`cac-cell-num${isToday ? ' cac-today-num' : ''}`}>
                        {day.getDate()}
                      </span>
                      {hasDue && (
                        <span className={`cac-due-dot${allEnded ? ' cac-due-dot-grey' : ''}`} />
                      )}
                    </div>
                    <div className="cac-cell-chips">
                      {events.slice(0, 2).map((ev, j) => (
                        <div key={j} className={`cac-chip${daysFromToday(ev.due) < 0 ? ' cac-chip-ended' : ''}`}>
                          <span className="cac-chip-label">{ev.title}</span>
                        </div>
                      ))}
                      {events.length > 2 && (
                        <div className="cac-more">+{events.length - 2} more</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ══ Cell popup ════════════════════════════ */}
      {popup && (
        <CellPopup
          day={popup.day}
          events={popup.events}
          anchorRect={popup.anchorRect}
          onClose={() => setPopup(null)}
          onView={ev => { setPopup(null); handleView(ev) }}
        />
      )}

      {/* ══ Bottom panel ══════════════════════════ */}
      <div className="cac-bottom-panel">
        {selectedDay ? (
          <div className="cac-panel-section cac-panel-section-full">
            <div className="cac-section-header">
              <img src="/calendar.png" alt="" className="cac-cal-icon" />
              <span className="cac-section-title">
                {selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </span>
              <button className="cac-clear-day" onClick={() => { setSelectedDay(null); setPopup(null) }}>{'\u00D7'}</button>
            </div>
            <UnoDeck cards={selectedEvents} emptyText="No assignments on this day" onView={handleView} />
          </div>
        ) : (
          <>
            <div className="cac-panel-section">
              <div className="cac-section-header">
                <span className="cac-section-dot cac-dot-red" />
                <span className="cac-section-title">Due Today</span>
              </div>
              <UnoDeck cards={todayCards} emptyText="Nothing due today" onView={handleView} />
            </div>
            <div className="cac-panel-divider" />
            <div className="cac-panel-section">
              <div className="cac-section-header">
                <span className="cac-section-dot cac-dot-green" />
                <span className="cac-section-title">Upcoming</span>
              </div>
              <UnoDeck cards={upcomingCards} emptyText="No upcoming assignments" onView={handleView} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
