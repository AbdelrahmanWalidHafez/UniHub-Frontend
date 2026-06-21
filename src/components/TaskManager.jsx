import React, { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { get, post, put, patch, deleteRequest, apiCall } from '../utils/api'
import './task-manager.css'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa']

function DatePicker({ value, onChange, min, hasError }) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => {
    const d = value ? new Date(value + 'T00:00:00') : new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function onOutside(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [open])

  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00')
      setView({ year: d.getFullYear(), month: d.getMonth() })
    }
  }, [value])

  const today = new Date(); today.setHours(0,0,0,0)
  const minDate = min ? new Date(min + 'T00:00:00') : today

  function getDays() {
    const first = new Date(view.year, view.month, 1).getDay()
    const total = new Date(view.year, view.month + 1, 0).getDate()
    return { first, total }
  }

  function toStr(y, m, d) {
    return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
  }

  function select(day) {
    const str = toStr(view.year, view.month, day)
    onChange(str)
    setOpen(false)
  }

  function prevMonth() {
    setView(v => v.month === 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 })
  }
  function nextMonth() {
    setView(v => v.month === 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: v.month + 1 })
  }

  const { first, total } = getDays()
  const selectedStr = value || ''

  const display = value
    ? new Date(value + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Pick a date'

  return (
    <div className={`tm-datepicker-wrap${hasError ? ' error' : ''}`} ref={ref}>
      <button type="button" className={`tm-datepicker-trigger${open ? ' open' : ''}${hasError ? ' error' : ''}`} onClick={() => setOpen(o => !o)}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
        <span style={{ color: value ? '#0F172A' : '#9CA3AF' }}>{display}</span>
        <svg className="tm-datepicker-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
      </button>

      {open && (
        <div className="tm-datepicker-popup">
          <div className="tm-datepicker-header">
            <button type="button" className="tm-datepicker-nav" onClick={prevMonth}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <span className="tm-datepicker-month">{MONTHS[view.month]} {view.year}</span>
            <button type="button" className="tm-datepicker-nav" onClick={nextMonth}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>

          <div className="tm-datepicker-grid">
            {DAYS.map(d => <span key={d} className="tm-datepicker-dayname">{d}</span>)}
            {Array.from({ length: first }, (_, i) => <span key={'e'+i} />)}
            {Array.from({ length: total }, (_, i) => {
              const day = i + 1
              const str = toStr(view.year, view.month, day)
              const date = new Date(view.year, view.month, day)
              const isDisabled = date < minDate
              const isSelected = str === selectedStr
              const isToday = str === toStr(today.getFullYear(), today.getMonth(), today.getDate())
              return (
                <button
                  key={day}
                  type="button"
                  disabled={isDisabled}
                  className={`tm-datepicker-day${isSelected ? ' selected' : ''}${isToday && !isSelected ? ' today' : ''}${isDisabled ? ' disabled' : ''}`}
                  onClick={() => select(day)}
                >
                  {day}
                </button>
              )
            })}
          </div>

          <div className="tm-datepicker-footer">
            <button type="button" className="tm-datepicker-clear" onClick={() => { onChange(''); setOpen(false) }}>Clear</button>
            <button type="button" className="tm-datepicker-today" onClick={() => {
              const t = toStr(today.getFullYear(), today.getMonth(), today.getDate())
              if (today >= minDate) { onChange(t); setOpen(false) }
            }}>Today</button>
          </div>
        </div>
      )}
    </div>
  )
}

const STATUS = { TODO: 'TODO', INPROGRESS: 'INPROGRESS', DONE: 'DONE' }
const PRIORITY = { LOW: 'LOW', MID: 'MID', HIGH: 'HIGH' }

const STATUS_LABEL = { TODO: 'To Do', INPROGRESS: 'In Progress', DONE: 'Done' }
const PRIORITY_LABEL = { LOW: 'Low', MID: 'Medium', HIGH: 'High' }

const STATUS_COLOR = { TODO: '#6B7280', INPROGRESS: '#F59E0B', DONE: '#22C55E' }
const PRIORITY_COLOR = { LOW: '#6B7280', MID: '#F59E0B', HIGH: '#EF4444' }

function formatDate(dt) {
  if (!dt) return ''
  const d = new Date(dt)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function isOverdue(due_date, status) {
  if (!due_date || status === STATUS.DONE) return false
  return new Date(due_date) < new Date()
}

const EMPTY_FORM = { title: '', description: '', priority: PRIORITY.MID, due_date: '' }

function TaskForm({ initial, onSave, onCancel, loading }) {
  const isEdit = !!initial
  const [form, setForm] = useState(initial || EMPTY_FORM)
  const [errors, setErrors] = useState({})

  function validate() {
    const e = {}
    if (!form.title.trim()) e.title = 'Title is required'
    else if (form.title.length > 60) e.title = 'Max 60 characters'
    if (!form.description.trim()) e.description = 'Description is required'
    else if (form.description.length > 1000) e.description = 'Max 1000 characters'
    if (!form.priority) e.priority = 'Priority is required'
    if (!form.due_date) e.due_date = 'Due date is required'
    else if (!isEdit && new Date(form.due_date) < new Date(new Date().toDateString())) e.due_date = 'Due date must be today or later'
    return e
  }

  function handleSubmit(e) {
    e.preventDefault()
    const e2 = validate()
    if (Object.keys(e2).length) { setErrors(e2); return }
    onSave(form)
  }

  const minDate = new Date().toISOString().slice(0, 10)
  // minDate passed to DatePicker as the earliest selectable date

  return (
    <form className="tm-form" onSubmit={handleSubmit} noValidate>
      <div className="tm-form-group">
        <label className="tm-label">Title *</label>
        <input
          className={`tm-input${errors.title ? ' error' : ''}`}
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder="Task title"
          maxLength={60}
        />
        <div className="tm-field-footer">
          {errors.title && <span className="tm-error">{errors.title}</span>}
          <span className="tm-counter">{form.title.length}/60</span>
        </div>
      </div>

      <div className="tm-form-group">
        <label className="tm-label">Description</label>
        <textarea
          className={`tm-textarea${errors.description ? ' error' : ''}`}
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Description (required)"
          maxLength={1000}
          rows={3}
        />
        <div className="tm-field-footer">
          {errors.description && <span className="tm-error">{errors.description}</span>}
          <span className="tm-counter">{(form.description || '').length}/1000</span>
        </div>
      </div>

      <div className="tm-form-row">
        <div className="tm-form-group">
          <label className="tm-label">Priority *</label>
          <div className={`tm-priority-picker${errors.priority ? ' error' : ''}`}>
            {[
              { v: 'LOW',  l: 'Low',    color: '#22C55E', bg: '#F0FDF4' },
              { v: 'MID',  l: 'Medium', color: '#F59E0B', bg: '#FFFBEB' },
              { v: 'HIGH', l: 'High',   color: '#EF4444', bg: '#FFF5F5' },
            ].map(({ v, l, color, bg }) => (
              <button
                key={v}
                type="button"
                className={`tm-priority-option${form.priority === v ? ' active' : ''}`}
                style={form.priority === v ? { background: bg, borderColor: color, color } : {}}
                onClick={() => setForm(f => ({ ...f, priority: v }))}
              >
                <span className="tm-priority-dot" style={{ background: color }} />
                {l}
              </button>
            ))}
          </div>
          {errors.priority && <span className="tm-error">{errors.priority}</span>}
        </div>

        <div className="tm-form-group">
          <label className="tm-label">Due Date *</label>
          <DatePicker
            value={form.due_date}
            min={isEdit ? undefined : minDate}
            hasError={!!errors.due_date}
            onChange={v => setForm(f => ({ ...f, due_date: v }))}
          />
          {errors.due_date && <span className="tm-error">{errors.due_date}</span>}
        </div>
      </div>

      <div className="tm-form-actions">
        <button type="button" className="tm-btn tm-btn-ghost" onClick={onCancel} disabled={loading}>Cancel</button>
        <button type="submit" className="tm-btn tm-btn-primary" disabled={loading}>
          {loading ? 'Saving...' : (initial ? 'Save Changes' : 'Create Task')}
        </button>
      </div>
    </form>
  )
}

function TaskCard({ task, onStatusChange, onEdit, onDelete, selected, onSelect }) {
  const overdue = isOverdue(task.due_date, task.status)

  const priorityDot = { LOW: '#22C55E', MID: '#F59E0B', HIGH: '#EF4444' }
  const statusIcon = {
    TODO: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/></svg>
    ),
    INPROGRESS: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v10l4 4"/><circle cx="12" cy="12" r="10"/></svg>
    ),
    DONE: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
    ),
  }

  return (
    <div className={`tm-card${selected ? ' selected' : ''}${overdue ? ' overdue' : ''} tm-card-status-${task.status.toLowerCase()}`}>
      <div className="tm-card-left-bar" style={{ background: STATUS_COLOR[task.status] }} />

      <div className="tm-card-inner">
        <div className="tm-card-top">
          <input
            type="checkbox"
            className="tm-checkbox"
            checked={selected}
            onChange={() => onSelect(task.id)}
            onClick={e => e.stopPropagation()}
          />
          <div className="tm-card-title-wrap">
            <span className={`tm-card-title${task.status === STATUS.DONE ? ' tm-title-done' : ''}`}>{task.title}</span>
            {overdue && <span className="tm-badge tm-badge-overdue">Overdue</span>}
          </div>
          <div className="tm-card-top-actions">
            <button className="tm-icon-btn" title="Edit" onClick={() => onEdit(task)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button className="tm-icon-btn tm-icon-btn-danger" title="Delete" onClick={() => onDelete(task.id)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            </button>
          </div>
        </div>

        {task.description && <p className="tm-card-desc">{task.description}</p>}

        <div className="tm-card-footer">
          <div className="tm-card-pills">
            <span className="tm-pill" style={{ background: STATUS_COLOR[task.status] + '18', color: STATUS_COLOR[task.status] }}>
              <span style={{ display: 'flex', alignItems: 'center' }}>{statusIcon[task.status]}</span>
              {STATUS_LABEL[task.status]}
            </span>
            <span className="tm-pill" style={{ background: priorityDot[task.priority] + '18', color: priorityDot[task.priority] }}>
              <span className="tm-priority-dot" style={{ background: priorityDot[task.priority] }} />
              {PRIORITY_LABEL[task.priority]}
            </span>
            <span className="tm-pill tm-pill-date">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
              {formatDate(task.due_date)}
            </span>
            {task.started_at && (
              <span className="tm-pill tm-pill-date">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                Started {formatDate(task.started_at)}
              </span>
            )}
          </div>

          <div className="tm-card-status-btns">
            {task.status !== STATUS.TODO && (
              <button className="tm-pill-btn tm-pill-btn-ghost" onClick={() => onStatusChange(task.id, STATUS.TODO)}>
                ↩ Reset
              </button>
            )}
            {task.status === STATUS.TODO && (
              <button className="tm-pill-btn tm-pill-btn-lime" onClick={() => onStatusChange(task.id, STATUS.INPROGRESS)}>
                ▶ Start
              </button>
            )}
            {task.status === STATUS.INPROGRESS && (
              <button className="tm-pill-btn tm-pill-btn-lime" onClick={() => onStatusChange(task.id, STATUS.DONE)}>
                ✓ Complete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Modal({ title, onClose, children }) {
  return createPortal(
    <div className="tm-modal-overlay" onClick={onClose}>
      <div className="tm-modal" onClick={e => e.stopPropagation()}>
        <div className="tm-modal-header">
          <span className="tm-modal-title">{title}</span>
          <button className="tm-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="tm-modal-body">{children}</div>
      </div>
    </div>,
    document.body
  )
}

const PAGE_SIZE = 5

export default function TaskManager() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [formLoading, setFormLoading] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [filterPriority, setFilterPriority] = useState('ALL')
  const [sortDate, setSortDate] = useState('none')
  const [currentPage, setCurrentPage] = useState(1)
  const [deletingId, setDeletingId] = useState(null)
  const [batchDeleting, setBatchDeleting] = useState(false)

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      let allTasks = []
      let pageNum = 1
      while (true) {
        const data = await get(`taskmanager/api/v1/tasks/get-tasks?page_num=${pageNum}`)
        const fetched = data?.tasks || []
        allTasks = [...allTasks, ...fetched]
        if (fetched.length < 10) break
        pageNum++
      }
      setTasks(allTasks)
    } catch (err) {
      setError(err.message || 'Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadTasks() }, [loadTasks])

  async function handleCreate(form) {
    try {
      setFormLoading(true)
      const body = {
        title: form.title,
        description: form.description,
        priority: form.priority,
        due_date: `${form.due_date}T23:59:59`,
      }
      const created = await post('taskmanager/api/v1/tasks/create', body)
      setTasks(prev => [created, ...prev])
      setFormOpen(false)
    } catch (err) {
      setError(err.message || 'Failed to create task')
    } finally {
      setFormLoading(false)
    }
  }

  async function handleEdit(form) {
    try {
      setFormLoading(true)
      const body = {
        title: form.title,
        description: form.description,
        priority: form.priority,
        due_date: `${form.due_date}T23:59:59`,
      }
      const updated = await put(`taskmanager/api/v1/tasks/edit-task/${editingTask.id}`, body)
      setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
      setEditingTask(null)
    } catch (err) {
      setError(err.message || 'Failed to update task')
    } finally {
      setFormLoading(false)
    }
  }

  async function handleStatusChange(id, status) {
    try {
      const updated = await apiCall(`taskmanager/api/v1/tasks/set-task-state/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(status),
        headers: { 'Content-Type': 'application/json' },
      })
      setTasks(prev => prev.map(t => t.id === id ? updated : t))
    } catch (err) {
      setError(err.message || 'Failed to update status')
    }
  }

  async function handleDelete(id) {
    setDeletingId(id)
  }

  async function confirmDelete() {
    try {
      await deleteRequest(`taskmanager/api/v1/tasks/delete-task/${deletingId}`)
      setTasks(prev => prev.filter(t => t.id !== deletingId))
      setSelected(prev => { const s = new Set(prev); s.delete(deletingId); return s })
    } catch (err) {
      setError(err.message || 'Failed to delete task')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleBatchDelete() {
    if (!selected.size) return
    setBatchDeleting(true)
    try {
      await apiCall('taskmanager/api/v1/tasks/delete-in-batch', {
        method: 'DELETE',
        body: JSON.stringify([...selected]),
      })
      setTasks(prev => prev.filter(t => !selected.has(t.id)))
      setSelected(new Set())
    } catch (err) {
      setError(err.message || 'Failed to delete tasks')
    } finally {
      setBatchDeleting(false)
    }
  }

  function toggleSelect(id) {
    setSelected(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(t => t.id)))
    }
  }

  function openEdit(task) {
    const due = task.due_date ? task.due_date.slice(0, 10) : ''
    setEditingTask({ ...task, due_date: due, title: task.title || '', description: task.description || '' })
  }

  const filtered = tasks
    .filter(t => {
      if (filterStatus !== 'ALL' && t.status !== filterStatus) return false
      if (filterPriority !== 'ALL' && t.priority !== filterPriority) return false
      return true
    })
    .sort((a, b) => {
      if (sortDate === 'asc') return new Date(a.due_date) - new Date(b.due_date)
      if (sortDate === 'desc') return new Date(b.due_date) - new Date(a.due_date)
      return 0
    })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function handleFilterChange(fn) {
    fn()
    setCurrentPage(1)
    setSelected(new Set())
  }

  const stats = {
    todo: tasks.filter(t => t.status === STATUS.TODO).length,
    inprogress: tasks.filter(t => t.status === STATUS.INPROGRESS).length,
    done: tasks.filter(t => t.status === STATUS.DONE).length,
    overdue: tasks.filter(t => isOverdue(t.due_date, t.status)).length,
  }

  return (
    <div className="tm-root">
      <div className="tm-header">
        <div>
          <h1 className="tm-title">Task Manager</h1>
          <p className="tm-subtitle">Manage your personal tasks and track progress</p>
        </div>
        <button className="tm-btn tm-btn-primary" onClick={() => setFormOpen(true)}>
          + New Task
        </button>
      </div>

      <div className="tm-stats">
        <div className={`tm-stat-chip${filterStatus === 'ALL' && filterPriority === 'ALL' ? ' active' : ''}`} onClick={() => handleFilterChange(() => { setFilterStatus('ALL'); setFilterPriority('ALL') })}>
          <span className="tm-stat-chip-num">{tasks.length}</span>
          <span className="tm-stat-chip-label">All</span>
        </div>
        <div className={`tm-stat-chip${filterStatus === STATUS.TODO ? ' active' : ''}`} style={{ '--chip-color': STATUS_COLOR.TODO }} onClick={() => handleFilterChange(() => setFilterStatus(f => f === STATUS.TODO ? 'ALL' : STATUS.TODO))}>
          <span className="tm-stat-chip-num" style={{ color: STATUS_COLOR.TODO }}>{stats.todo}</span>
          <span className="tm-stat-chip-label">To Do</span>
        </div>
        <div className={`tm-stat-chip${filterStatus === STATUS.INPROGRESS ? ' active' : ''}`} style={{ '--chip-color': STATUS_COLOR.INPROGRESS }} onClick={() => handleFilterChange(() => setFilterStatus(f => f === STATUS.INPROGRESS ? 'ALL' : STATUS.INPROGRESS))}>
          <span className="tm-stat-chip-num" style={{ color: STATUS_COLOR.INPROGRESS }}>{stats.inprogress}</span>
          <span className="tm-stat-chip-label">In Progress</span>
        </div>
        <div className={`tm-stat-chip${filterStatus === STATUS.DONE ? ' active' : ''}`} style={{ '--chip-color': STATUS_COLOR.DONE }} onClick={() => handleFilterChange(() => setFilterStatus(f => f === STATUS.DONE ? 'ALL' : STATUS.DONE))}>
          <span className="tm-stat-chip-num" style={{ color: STATUS_COLOR.DONE }}>{stats.done}</span>
          <span className="tm-stat-chip-label">Done</span>
        </div>
        {stats.overdue > 0 && (
          <div className="tm-stat-chip tm-stat-chip-overdue" onClick={() => handleFilterChange(() => { setFilterStatus('ALL'); setFilterPriority('ALL') })}>
            <span className="tm-stat-chip-num" style={{ color: '#EF4444' }}>{stats.overdue}</span>
            <span className="tm-stat-chip-label">Overdue</span>
          </div>
        )}
      </div>

      <div className="tm-toolbar">
        <div className="tm-filter-pills">
          <span className="tm-filter-label">Priority:</span>
          {[['ALL', 'All'], ['LOW', 'Low'], ['MID', 'Medium'], ['HIGH', 'High']].map(([v, l]) => (
            <button
              key={v}
              className={`tm-filter-pill${filterPriority === v ? ' active' : ''}`}
              style={filterPriority === v && v !== 'ALL' ? { background: { LOW: '#22C55E', MID: '#F59E0B', HIGH: '#EF4444' }[v], color: '#fff', borderColor: 'transparent' } : {}}
              onClick={() => handleFilterChange(() => setFilterPriority(filterPriority === v ? 'ALL' : v))}
            >
              {v !== 'ALL' && <span className="tm-priority-dot" style={{ background: filterPriority === v ? '#fff' : { LOW: '#22C55E', MID: '#F59E0B', HIGH: '#EF4444' }[v] }} />}
              {l}
            </button>
          ))}
          <div className="tm-filter-divider" />
          <span className="tm-filter-label">Due date:</span>
          {[['asc', 'Earliest first'], ['desc', 'Latest first']].map(([v, l]) => (
            <button
              key={v}
              className={`tm-filter-pill${sortDate === v ? ' active' : ''}`}
              onClick={() => setSortDate(v)}
            >
              {v === 'asc' && <span>↑</span>}
              {v === 'desc' && <span>↓</span>}
              {l}
            </button>
          ))}
        </div>
        <div className={`tm-batch-actions${selected.size > 0 ? ' visible' : ''}`}>
          <span className="tm-selected-count">{selected.size} selected</span>
          <button className="tm-btn tm-btn-danger tm-btn-sm" onClick={handleBatchDelete} disabled={batchDeleting}>
            {batchDeleting ? 'Deleting...' : `Delete ${selected.size}`}
          </button>
          <button className="tm-btn tm-btn-ghost tm-btn-sm" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      </div>

      {error && (
        <div className="tm-error-banner">
          {error}
          <button className="tm-error-close" onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {loading && tasks.length === 0 ? (
        <div className="tm-loading">
          <div className="tm-spinner" />
          <span>Loading tasks...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="tm-empty">
          <img src="/task.png" alt="No tasks" className="tm-empty-icon" />
          <p>{tasks.length === 0 ? 'No tasks yet. Create your first task!' : 'No tasks match the current filters.'}</p>
        </div>
      ) : (
        <>
          <div className="tm-select-all-row">
            <label className="tm-select-all-label">
              <input
                type="checkbox"
                className="tm-checkbox"
                checked={paginated.length > 0 && paginated.every(t => selected.has(t.id))}
                onChange={() => {
                  const pageIds = new Set(paginated.map(t => t.id))
                  const allSelected = paginated.every(t => selected.has(t.id))
                  setSelected(prev => {
                    const s = new Set(prev)
                    pageIds.forEach(id => allSelected ? s.delete(id) : s.add(id))
                    return s
                  })
                }}
              />
              <span>Select page ({paginated.length})</span>
              {filtered.length > 0 && <span className="tm-result-count">{filtered.length} task{filtered.length !== 1 ? 's' : ''}</span>}
            </label>
          </div>
          <div className="tm-list">
            {paginated.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                selected={selected.has(task.id)}
                onSelect={toggleSelect}
                onStatusChange={handleStatusChange}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="tm-pagination">
              <button className="tm-page-btn" onClick={() => setCurrentPage(1)} disabled={safePage === 1}>«</button>
              <button className="tm-page-btn" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  className={`tm-page-btn${safePage === p ? ' active' : ''}`}
                  onClick={() => setCurrentPage(p)}
                >
                  {p}
                </button>
              ))}
              <button className="tm-page-btn" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>›</button>
              <button className="tm-page-btn" onClick={() => setCurrentPage(totalPages)} disabled={safePage === totalPages}>»</button>
            </div>
          )}
        </>
      )}

      {formOpen && (
        <Modal title="New Task" onClose={() => setFormOpen(false)}>
          <TaskForm onSave={handleCreate} onCancel={() => setFormOpen(false)} loading={formLoading} />
        </Modal>
      )}

      {editingTask && (
        <Modal title="Edit Task" onClose={() => setEditingTask(null)}>
          <TaskForm initial={editingTask} onSave={handleEdit} onCancel={() => setEditingTask(null)} loading={formLoading} />
        </Modal>
      )}

      {deletingId && (
        <Modal title="Delete Task" onClose={() => setDeletingId(null)}>
          <p style={{ marginBottom: 24, color: '#374151' }}>Are you sure you want to delete this task? This cannot be undone.</p>
          <div className="tm-form-actions">
            <button className="tm-btn tm-btn-ghost" onClick={() => setDeletingId(null)}>Cancel</button>
            <button className="tm-btn tm-btn-danger" onClick={confirmDelete}>Delete</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
