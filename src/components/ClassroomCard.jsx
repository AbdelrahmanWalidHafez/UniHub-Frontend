import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function ClassroomCard({ classroom, isInstructor, isArchived = false, onArchive, onUnarchive, onDelete, onLeave }) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const classroomId = classroom.class_id || classroom.tid || classroom.id
  const classroomName = classroom.class_title || classroom.name || classroom.className || 'Untitled Class'
  const instructorName = classroom.created_by || classroom.instructor_name || classroom.instructorName || 'Instructor'
  const section = classroom.class_sub_title || classroom.section || classroom.class_section || ''
  const description = classroom.description || ''
  const studentCount = classroom.student_count || classroom.studentCount || 0
  const entryCode = classroom.entry_code || classroom.code || ''
  const imageNum = classroom.image_num || 1
  
  // Map image numbers to actual filenames in public folder
  const getImageFilename = (num) => {
    const imageMap = {
      1: '/im1png.png',
      2: '/im2.jpg',
      3: '/im3jpg.jpg',
      4: '/im4.jpg',
      5: '/im5.jpg',
      6: '/im6.jpg',
      7: '/im7.jpg',
      8: '/im8.jpg',
      9: '/im9.jpg',
      10: '/im10jpg.jpg',
    }
    return imageMap[num] || '/im1png.png'
  }
  
  // Use a hash of the instructor ID to generate a consistent color (same instructor = same color)
  const generateColorFromId = (id) => {
    const colors = ['#0b5fff', '#F97316', '#8B5CF6', '#EC4899', '#14B8A6', '#EAB308', '#ef4444', '#06B6D4', '#10B981']
    let hash = 0
    if (id) {
      for (let i = 0; i < String(id).length; i++) {
        hash = String(id).charCodeAt(i) + ((hash << 5) - hash)
      }
    }
    return colors[Math.abs(hash) % colors.length]
  }
  const instructorId = classroom.created_by || classroom.instructor_id || classroom.instructorId
  const bgColor = classroom.color || generateColorFromId(instructorId)
  const backgroundImageUrl = getImageFilename(imageNum)

  const handleCardClick = () => {
    navigate(`/classroom/${classroomId}`, { state: { classroom } })
  }

  const handleMenuClick = (e) => {
    e.stopPropagation()
    setMenuOpen(!menuOpen)
  }

  const handleArchive = async (e) => {
    e.stopPropagation()
    if (onArchive) {
      await onArchive(classroomId)
    }
    setMenuOpen(false)
  }

  const handleUnarchive = async (e) => {
    e.stopPropagation()
    if (onUnarchive) {
      await onUnarchive(classroomId)
    }
    setMenuOpen(false)
  }

  const handleDelete = (e) => {
    e.stopPropagation()
    setMenuOpen(false)
    setShowConfirm(true)
  }

  const handleConfirmAction = async () => {
    if (isInstructor && onDelete) {
      await onDelete(classroomId)
    } else if (!isInstructor && onLeave) {
      await onLeave(classroomId)
    }
    setShowConfirm(false)
  }

  // Lighten color for gradient
  const lightenColor = (color) => {
    const num = parseInt(color.replace('#', ''), 16)
    const amt = 30
    const usePound = true
    const R = Math.min(255, (num >> 16) + amt)
    const G = Math.min(255, (num >> 8 & 0x00FF) + amt)
    const B = Math.min(255, (num & 0x0000FF) + amt)
    return (usePound ? '#' : '') + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)
  }

  return (
    <>
    <div className="classroom-card" onClick={handleCardClick}>
      <div
        className="card-header"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.5) 100%), url('${backgroundImageUrl}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="card-header-content">
          <h3 className="card-header-title">{classroomName}</h3>
          {section && <p className="card-header-section">{section}</p>}
        </div>
        {isArchived && <div className="archived-badge">Archived</div>}
        <div className="instructor-avatar" style={{ backgroundColor: bgColor }}>
          {instructorName.charAt(0).toUpperCase()}
        </div>
      </div>

      <div className="card-footer">
        {isInstructor && !isArchived && (
          <button className="footer-action-btn" onClick={handleArchive} title="Archive" aria-label="Archive">
            <img src="/archive .png" alt="Archive" className="action-icon" />
            <span>Archive</span>
          </button>
        )}
        {isInstructor && isArchived && (
          <button className="footer-action-btn" onClick={handleUnarchive} title="Restore" aria-label="Restore">
            <img src="/archive .png" alt="Restore" className="action-icon" />
            <span>Restore</span>
          </button>
        )}
        <button className="footer-action-btn delete-btn" onClick={handleDelete} title={isInstructor ? "Delete" : "Leave"} aria-label={isInstructor ? "Delete" : "Leave"}>
          <img src="/delete.png" alt={isInstructor ? "Delete" : "Leave"} className="action-icon" />
          <span>{isInstructor ? "Delete" : "Leave"}</span>
        </button>
      </div>
    </div>

    {showConfirm && (
      <div className="cc-confirm-overlay" onClick={() => setShowConfirm(false)}>
        <div className="cc-confirm-modal" onClick={(e) => e.stopPropagation()}>
          <div className="cc-confirm-icon">
            <img src="/delete.png" alt={isInstructor ? 'Delete' : 'Leave'} />
          </div>
          <h3 className="cc-confirm-title">{isInstructor ? 'Delete Classroom' : 'Leave Classroom'}</h3>
          <p className="cc-confirm-message">
            Are you sure you want to {isInstructor ? 'delete' : 'leave'} <strong>"{classroomName}"</strong>?
            {isInstructor ? ' This action cannot be undone.' : ' You can rejoin with the class code.'}
          </p>
          <div className="cc-confirm-actions">
            <button className="cc-confirm-cancel" onClick={() => setShowConfirm(false)}>
              Cancel
            </button>
            <button className="cc-confirm-submit" onClick={handleConfirmAction}>
              {isInstructor ? 'Delete' : 'Leave'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
