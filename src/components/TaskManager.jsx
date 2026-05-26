import React, { useState, useEffect, useCallback, useRef } from 'react'
import { get, post, put, patch, deleteRequest, apiCall } from '../utils/api'
import './task-manager.css'

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
  const [form, setForm] = useState(initial || EMPTY_FORM)
  const [errors, setErrors] = useState({})

  function validate() {
    const e = {}
    if (!form.title.trim()) e.title = 'Title is required'
    else if (form.title.length > 60) e.title = 'Max 60 characters'
    if (form.description && form.description.length > 1000) e.description = 'Max 1000 characters'
    if (!form.priority) e.priority = 'Priority is required'
    if (!form.due_date) e.due_date = 'Due date is required'
    else if (new Date(form.due_date) <= new Date()) e.due_date = 'Due date must be in the future'
    return e
  }

  function handleSubmit(e) {
    e.preventDefault()
    const e2 = validate()
    if (Object.keys(e2).length) { setErrors(e2); return }
    onSave(form)
  }

  const minDate = new Date(Date.now() + 60000).toISOString().slice(0, 16)

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
          placeholder="Optional description..."
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
          <select
            className={`tm-select${errors.priority ? ' error' : ''}`}
            value={form.priority}
            onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
          >
            {Object.entries(PRIORITY_LABEL).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          {errors.priority && <span className="tm-error">{errors.priority}</span>}
        </div>

        <div className="tm-form-group">
          <label className="tm-label">Due Date *</label>
          <input
            type="datetime-local"
            className={`tm-input${errors.due_date ? ' error' : ''}`}
            value={form.due_date}
            min={minDate}
            onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
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

  return (
    <div className={`tm-card${selected ? ' selected' : ''}${overdue ? ' overdue' : ''}`}>
      <div className="tm-card-header">
        <input
          type="checkbox"
          className="tm-checkbox"
          checked={selected}
          onChange={() => onSelect(task.id)}
          onClick={e => e.stopPropagation()}
        />
        <div className="tm-card-title-row">
          <span className="tm-card-title">{task.title}</span>
          <div className="tm-badges">
            <span className="tm-badge" style={{ background: PRIORITY_COLOR[task.priority] + '20', color: PRIORITY_COLOR[task.priority] }}>
              {PRIORITY_LABEL[task.priority]}
            </span>
            <span className="tm-badge" style={{ background: STATUS_COLOR[task.status] + '20', color: STATUS_COLOR[task.status] }}>
              {STATUS_LABEL[task.status]}
            </span>
            {overdue && <span className="tm-badge tm-badge-overdue">Overdue</span>}
          </div>
        </div>
      </div>

      {task.description && <p className="tm-card-desc">{task.description}</p>}

      <div className="tm-card-meta">
        <span className="tm-meta-item">Due: {formatDate(task.due_date)}</span>
        {task.started_at && <span className="tm-meta-item">Started: {formatDate(task.started_at)}</span>}
        {task.finished_at && <span className="tm-meta-item">Finished: {formatDate(task.finished_at)}</span>}
      </div>

      <div className="tm-card-actions">
        <div className="tm-status-actions">
          {task.status !== STATUS.TODO && (
            <button className="tm-btn tm-btn-xs tm-btn-ghost" onClick={() => onStatusChange(task.id, STATUS.TODO)}>
              Reset
            </button>
          )}
          {task.status === STATUS.TODO && (
            <button className="tm-btn tm-btn-xs tm-btn-lime" onClick={() => onStatusChange(task.id, STATUS.INPROGRESS)}>
              Start
            </button>
          )}
          {task.status === STATUS.INPROGRESS && (
            <button className="tm-btn tm-btn-xs tm-btn-lime" onClick={() => onStatusChange(task.id, STATUS.DONE)}>
              Complete
            </button>
          )}
        </div>
        <div className="tm-edit-actions">
          <button className="tm-icon-btn" title="Edit" onClick={() => onEdit(task)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button className="tm-icon-btn tm-icon-btn-danger" title="Delete" onClick={() => onDelete(task.id)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
      </div>
    </div>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="tm-modal-overlay" onClick={onClose}>
      <div className="tm-modal" onClick={e => e.stopPropagation()}>
        <div className="tm-modal-header">
          <span className="tm-modal-title">{title}</span>
          <button className="tm-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="tm-modal-body">{children}</div>
      </div>
    </div>
  )
}

export default function TaskManager() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [formLoading, setFormLoading] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [filterPriority, setFilterPriority] = useState('ALL')
  const [deletingId, setDeletingId] = useState(null)
  const [batchDeleting, setBatchDeleting] = useState(false)

  const loadTasks = useCallback(async (pageNum = 1, replace = true) => {
    try {
      setLoading(true)
      setError(null)
      const data = await get(`taskmanager/api/v1/tasks/get-tasks?page_num=${pageNum}`)
      const fetched = data?.tasks || []
      setTasks(prev => replace ? fetched : [...prev, ...fetched])
      setHasMore(fetched.length === 10)
      setPage(pageNum)
    } catch (err) {
      setError(err.message || 'Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadTasks(1, true) }, [loadTasks])

  async function handleCreate(form) {
    try {
      setFormLoading(true)
      const body = {
        title: form.title,
        description: form.description || undefined,
        priority: form.priority,
        due_date: new Date(form.due_date).toISOString().replace('Z', ''),
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
        description: form.description || undefined,
        priority: form.priority,
        due_date: new Date(form.due_date).toISOString().replace('Z', ''),
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
    const due = task.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : ''
    setEditingTask({ ...task, due_date: due })
  }

  const filtered = tasks.filter(t => {
    if (filterStatus !== 'ALL' && t.status !== filterStatus) return false
    if (filterPriority !== 'ALL' && t.priority !== filterPriority) return false
    return true
  })

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
        <div className="tm-stat">
          <span className="tm-stat-num">{tasks.length}</span>
          <span className="tm-stat-label">Total</span>
        </div>
        <div className="tm-stat">
          <span className="tm-stat-num" style={{ color: STATUS_COLOR.TODO }}>{stats.todo}</span>
          <span className="tm-stat-label">To Do</span>
        </div>
        <div className="tm-stat">
          <span className="tm-stat-num" style={{ color: STATUS_COLOR.INPROGRESS }}>{stats.inprogress}</span>
          <span className="tm-stat-label">In Progress</span>
        </div>
        <div className="tm-stat">
          <span className="tm-stat-num" style={{ color: STATUS_COLOR.DONE }}>{stats.done}</span>
          <span className="tm-stat-label">Done</span>
        </div>
        {stats.overdue > 0 && (
          <div className="tm-stat">
            <span className="tm-stat-num" style={{ color: '#EF4444' }}>{stats.overdue}</span>
            <span className="tm-stat-label">Overdue</span>
          </div>
        )}
      </div>

      <div className="tm-toolbar">
        <div className="tm-filters">
          <select className="tm-select tm-select-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="ALL">All Statuses</option>
            {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select className="tm-select tm-select-sm" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
            <option value="ALL">All Priorities</option>
            {Object.entries(PRIORITY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        {selected.size > 0 && (
          <div className="tm-batch-actions">
            <span className="tm-selected-count">{selected.size} selected</span>
            <button className="tm-btn tm-btn-danger tm-btn-sm" onClick={handleBatchDelete} disabled={batchDeleting}>
              {batchDeleting ? 'Deleting...' : `Delete ${selected.size}`}
            </button>
            <button className="tm-btn tm-btn-ghost tm-btn-sm" onClick={() => setSelected(new Set())}>Clear</button>
          </div>
        )}
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
          <div className="tm-empty-icon">📋</div>
          <p>{tasks.length === 0 ? 'No tasks yet. Create your first task!' : 'No tasks match the current filters.'}</p>
        </div>
      ) : (
        <>
          {filtered.length > 0 && (
            <div className="tm-select-all-row">
              <label className="tm-select-all-label">
                <input
                  type="checkbox"
                  className="tm-checkbox"
                  checked={selected.size === filtered.length && filtered.length > 0}
                  onChange={toggleSelectAll}
                />
                Select all ({filtered.length})
              </label>
            </div>
          )}
          <div className="tm-list">
            {filtered.map(task => (
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
          {hasMore && (
            <div className="tm-load-more">
              <button className="tm-btn tm-btn-ghost" onClick={() => loadTasks(page + 1, false)} disabled={loading}>
                {loading ? 'Loading...' : 'Load More'}
              </button>
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
