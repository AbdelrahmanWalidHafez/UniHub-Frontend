import React, { useState, useEffect, useCallback } from 'react'
import { get } from '../utils/api'
import './classroom-calendar.css'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const CLASS_COLORS = [
  '#9DD957', '#5cb85c', '#43a047', '#7CB342', '#33691E',
  '#8BC34A', '#AED581', '#689F38', '#558B2F', '#76c442'
]

const today = new Date()
today.setHours(0, 0, 0, 0)

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function daysFromToday(date) {
  const d = new Date(date); d.setHours(0, 0, 0, 0)
  return Math.round((d - today) / (1000 * 60 * 60 * 24))
}

export default function ClassroomCalendar({ classrooms }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [assignments, setAssignments] = useState([])
  const [selectedEvent, setSelectedEvent] = useState(null)

  const fetchAll = useCallback(async () => {
    if (!classrooms || classrooms.length === 0) return
    const results = []
    await Promise.all(
      classrooms.map(async (cls, idx) => {
        const cid = cls.class_id || cls.id
        const color = CLASS_COLORS[idx % CLASS_COLORS.length]
        try {
          let page = 1
          while (true) {
            const res = await get(`classroom/api/v1/material/get-all-assignments/${cid}?page_num=${page}`)
            const list = res?.assignments || []
            list.forEach(a => {
              if (a.due_date) {
                results.push({
                  title: a.material?.head_line || 'Assignment',
                  due: new Date(a.due_date),
                  points: a.points,
                  classroomName: cls.class_title || cls.name || 'Class',
                  color,
                  cid,
                })
              }
            })
            if (list.length < 5) break
            page++
          }
        } catch (e) { }
      })
    )
    setAssignments(results)
  }, [classrooms])

  useEffect(() => { fetchAll() }, [fetchAll])

  const prevMonth = () => { const d = new Date(currentDate); d.setMonth(d.getMonth() - 1); setCurrentDate(d) }
  const nextMonth = () => { const d = new Date(currentDate); d.setMonth(d.getMonth() + 1); setCurrentDate(d) }
  const goToday = () => setCurrentDate(new Date())

  const eventsOnDay = (day) => assignments.filter(a => sameDay(a.due, day))

  const firstOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const firstDayOfWeek = firstOfMonth.getDay()
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const totalCells = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7
  const monthCells = Array.from({ length: totalCells }, (_, i) => {
    const d = new Date(firstOfMonth)
    d.setDate(1 - firstDayOfWeek + i)
    return d
  })

  const headerLabel = `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`

  // Upcoming events: due in the future, sorted by due date
  const upcoming = assignments
    .filter(a => { const d = new Date(a.due); d.setHours(0,0,0,0); return d >= today })
    .sort((a, b) => a.due - b.due)
    .slice(0, 5)

  // Today's due assignments
  const todayEvents = assignments.filter(a => sameDay(a.due, today))

  return (
    <div className="cal-root">
      <div className="cal-layout">

        {/* ── Left: calendar ──────────────────────── */}
        <div className="cal-main">
          {/* Toolbar */}
          <div className="cal-toolbar">
            <div className="cal-toolbar-left">
              <button className="cal-today-btn" onClick={goToday}>Today</button>
              <button className="cal-nav-btn" onClick={prevMonth}>‹</button>
              <button className="cal-nav-btn" onClick={nextMonth}>›</button>
              <span className="cal-header-label">{headerLabel}</span>
            </div>
          </div>

          {/* Month grid */}
          <div className="cal-month-root">
            <div className="cal-month-header">
              {DAYS.map(d => <div key={d} className="cal-month-day-name">{d}</div>)}
            </div>
            <div className="cal-month-grid">
              {monthCells.map((day, i) => {
                const isCurrentMonth = day.getMonth() === currentDate.getMonth()
                const isToday = sameDay(day, today)
                const events = eventsOnDay(day)
                const hasDue = events.length > 0
                return (
                  <div key={i} className={`cal-month-cell${!isCurrentMonth ? ' cal-month-cell-other' : ''}`}>
                    <div className="cal-month-cell-top">
                      <span className={`cal-month-cell-num${isToday ? ' cal-day-today' : ''}`}>{day.getDate()}</span>
                      {hasDue && <span className="cal-due-dot" title={`${events.length} assignment${events.length > 1 ? 's' : ''} due`} />}
                    </div>
                    <div className="cal-month-events">
                      {events.slice(0, 2).map((ev, j) => (
                        <div
                          key={j}
                          className="cal-event-chip"
                          style={{ background: ev.color }}
                          onClick={() => setSelectedEvent(ev)}
                        >
                          {ev.title}
                        </div>
                      ))}
                      {events.length > 2 && (
                        <div className="cal-more-events">+{events.length - 2} more</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Right: sidebar ──────────────────────── */}
        <div className="cal-sidebar">

          {/* Today's due */}
          <div className="cal-sidebar-section">
            <div className="cal-sidebar-title">
              <span className="cal-sidebar-dot cal-sidebar-dot-red" />
              Due Today
            </div>
            {todayEvents.length === 0 ? (
              <div className="cal-sidebar-empty">Nothing due today 🎉</div>
            ) : (
              todayEvents.map((ev, i) => (
                <div key={i} className="cal-sidebar-card cal-sidebar-card-urgent" onClick={() => setSelectedEvent(ev)}>
                  <div className="cal-sc-color" style={{ background: ev.color }} />
                  <div className="cal-sc-body">
                    <div className="cal-sc-title">{ev.title}</div>
                    <div className="cal-sc-class">{ev.classroomName}</div>
                    <div className="cal-sc-time">
                      {ev.due.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="cal-sc-badge cal-sc-badge-red">Today</div>
                </div>
              ))
            )}
          </div>

          {/* Upcoming */}
          <div className="cal-sidebar-section">
            <div className="cal-sidebar-title">
              <span className="cal-sidebar-dot cal-sidebar-dot-green" />
              Upcoming
            </div>
            {upcoming.length === 0 ? (
              <div className="cal-sidebar-empty">No upcoming assignments</div>
            ) : (
              upcoming.map((ev, i) => {
                const diff = daysFromToday(ev.due)
                const label = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : `In ${diff} days`
                const urgent = diff <= 2
                return (
                  <div key={i} className="cal-sidebar-card" onClick={() => setSelectedEvent(ev)}>
                    <div className="cal-sc-color" style={{ background: ev.color }} />
                    <div className="cal-sc-body">
                      <div className="cal-sc-title">{ev.title}</div>
                      <div className="cal-sc-class">{ev.classroomName}</div>
                      <div className="cal-sc-date">
                        {ev.due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {ev.due.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className={`cal-sc-badge${urgent ? ' cal-sc-badge-red' : ' cal-sc-badge-green'}`}>{label}</div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Event detail popup */}
      {selectedEvent && (
        <div className="cal-popup-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="cal-popup" onClick={e => e.stopPropagation()}>
            <button className="cal-popup-close" onClick={() => setSelectedEvent(null)}>✕</button>
            <div className="cal-popup-color" style={{ background: selectedEvent.color }} />
            <div className="cal-popup-body">
              <div className="cal-popup-title">{selectedEvent.title}</div>
              <div className="cal-popup-class">{selectedEvent.classroomName}</div>
              <div className="cal-popup-due">
                📅 {selectedEvent.due.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
              {selectedEvent.points && (
                <div className="cal-popup-points">{selectedEvent.points} pts</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
