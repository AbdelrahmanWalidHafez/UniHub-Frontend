import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getRoleName } from '../constants/roles'
import { logout } from '../utils/auth'
import { ROUTES } from '../constants/routes'
import { get, post, patch, deleteRequest } from '../utils/api'
import ClassroomCard from './ClassroomCard'
import ClassroomModal from './ClassroomModal'
import JoinClassModal from './JoinClassModal'
import './classroom.css'

export default function Classroom() {
  const { user, clearAuth } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const firstName = user?.first_name || user?.firstName || user?.name || user?.email || 'U'
  const initial = (firstName && firstName[0]) || 'U'
  const roleName = getRoleName(user)
  const isInstructor = String(roleName || '').toLowerCase().includes('instructor')
  const isStudent = String(roleName || '').toLowerCase().includes('student')

  const [teaching, setTeaching] = useState([])
  const [enrolled, setEnrolled] = useState([])
  const [archived, setArchived] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [joinModalOpen, setJoinModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState(isStudent ? 'enrolled' : 'teaching')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [plusMenuOpen, setPlusMenuOpen] = useState(false)
  const [expandTeaching, setExpandTeaching] = useState(true)
  const [expandEnrolled, setExpandEnrolled] = useState(true)
  const [expandArchived, setExpandArchived] = useState(false)
  const menuRef = useRef(null)
  const avatarRef = useRef(null)
  const plusMenuRef = useRef(null)
  const plusBtnRef = useRef(null)

  // Fetch classrooms
  const fetchClassrooms = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      let teachingData = []
      let enrolledData = []
      let archivedData = []

      if (isInstructor) {
        try {
          // Fetch only active classes for Teaching tab
          const activeResponse = await get('classroom/api/v1/classroom/instructor/get-active-classes')
          teachingData = activeResponse?.class_rooms || []
        } catch (err) {
          console.error('Error fetching active classes:', err)
        }

        try {
          // Fetch archived classes
          const archivedResponse = await get('classroom/api/v1/classroom/instructor/get-archived-classes')
          archivedData = archivedResponse?.class_rooms || []
        } catch (err) {
          console.error('Error fetching archived classes:', err)
        }
      }

      if (isStudent) {
        try {
          const response = await get('classroom/api/v1/classroom/get-enrolled-classes')
          enrolledData = response?.class_rooms || []
        } catch (err) {
          console.error('Error fetching enrolled classes:', err)
        }

        try {
          const archivedResponse = await get('classroom/api/v1/classroom/fetch-archived-classes')
          archivedData = archivedResponse?.class_rooms || []
        } catch (err) {
          console.error('Error fetching archived classes:', err)
        }
      }

      setTeaching(teachingData)
      setEnrolled(enrolledData)
      setArchived(archivedData)
    } catch (err) {
      console.error('Error fetching classrooms:', err)
      setError('Failed to load classrooms')
    } finally {
      setLoading(false)
    }
  }, [isInstructor, isStudent])

  useEffect(() => {
    fetchClassrooms()
  }, [fetchClassrooms])

  useEffect(() => {
    function onDocClick(e) {
      if (menuOpen && menuRef.current && !menuRef.current.contains(e.target) && avatarRef.current && !avatarRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
      if (plusMenuOpen && plusMenuRef.current && !plusMenuRef.current.contains(e.target) && plusBtnRef.current && !plusBtnRef.current.contains(e.target)) {
        setPlusMenuOpen(false)
      }
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [menuOpen, plusMenuOpen])

  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab)
    }
  }, [location.state?.activeTab])

  async function handleLogout() {
    try {
      await logout()
    } finally {
      clearAuth()
      setMenuOpen(false)
      navigate('/')
    }
  }

  const handleCreateClassroom = async (classroomData) => {
    try {
      await post('classroom/api/v1/classroom/instructor/create', classroomData)
      setModalOpen(false)
      await fetchClassrooms()
    } catch (err) {
      console.error('Error creating classroom:', err)
      throw err
    }
  }

  const handleArchiveClassroom = async (classroomId) => {
    try {
      await patch(`classroom/api/v1/classroom/instructor/archive/${classroomId}`, {})
      await fetchClassrooms()
    } catch (err) {
      console.error('Error archiving classroom:', err)
    }
  }

  const handleUnarchiveClassroom = async (classroomId) => {
    try {
      await patch(`classroom/api/v1/classroom/instructor/archive/${classroomId}`, {})
      await fetchClassrooms()
    } catch (err) {
      console.error('Error unarchiving classroom:', err)
    }
  }

  const handleNavigateToClassroom = (classroom) => {
    navigate(`/classroom/${classroom.class_id || classroom.id}`, { state: { classroom } })
  }

  const handleLeaveClassroom = async (classroomId) => {
    try {
      await deleteRequest(`classroom/api/v1/classroom/leave/${classroomId}`)
      await fetchClassrooms()
    } catch (err) {
      console.error('Error leaving classroom:', err)
    }
  }

  const handleDeleteClassroom = async (classroomId) => {
    try {
      await deleteRequest(`classroom/api/v1/classroom/leave/${classroomId}`)
      await fetchClassrooms()
    } catch (err) {
      console.error('Error deleting classroom:', err)
    }
  }

  const handleJoinClassroom = async (classCode) => {
    try {
      await post(`classroom/api/v1/classroom/join?code=${encodeURIComponent(classCode)}`, {})
      setJoinModalOpen(false)
      await fetchClassrooms()
    } catch (err) {
      console.error('Error joining classroom:', err)
      throw err
    }
  }

  if (loading) {
    return (
      <div className="classroom-page">
        <div className="classroom-navbar">
          <button className="hamburger-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <img src="/menu.png" alt="Menu" className="hamburger-icon" />
          </button>
          <div className="navbar-title">
            <img src="/classroom-icon.png" alt="Classroom" className="navbar-icon" />
            <h1>Classroom</h1>
          </div>
        </div>
        <div className="loading-spinner">Loading classrooms...</div>
      </div>
    )
  }

  return (
    <div className="classroom-page">
      {/* Top Navbar */}
      <div className="classroom-navbar">
        <button className="hamburger-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
          <img src="/menu.png" alt="Menu" className="hamburger-icon" />
        </button>
        <div className="navbar-title">
          <img src="/classroom-icon.png" alt="Classroom" className="navbar-icon" />
          <h1>Classroom</h1>
        </div>
        
        <div className="navbar-actions">
          <div className="navbar-plus-wrapper">
            <button className="navbar-add-btn" onClick={() => setPlusMenuOpen((s) => !s)} ref={plusBtnRef} title="Add class" aria-haspopup="true" aria-expanded={plusMenuOpen}>
              <img src="/plus.png" alt="Add" className="navbar-plus-icon" />
            </button>
            {plusMenuOpen && (
              <div className="plus-menu" ref={plusMenuRef} role="menu">
                {isInstructor && (
                  <button type="button" className="plus-menu-item" onClick={() => { setPlusMenuOpen(false); setModalOpen(true) }}>
                    <span>Create class</span>
                  </button>
                )}
                <button type="button" className="plus-menu-item" onClick={() => { setPlusMenuOpen(false); setJoinModalOpen(true) }}>
                  <span>Join class</span>
                </button>
              </div>
            )}
          </div>
          <div
            className="user-avatar"
            onClick={() => setMenuOpen((s) => !s)}
            ref={avatarRef}
            title={firstName}
            aria-haspopup="true"
            aria-expanded={menuOpen}
          >
            {initial.toUpperCase()}
          </div>
          {menuOpen && (
            <div className="user-menu" ref={menuRef} role="menu">
              <button type="button" className="user-menu-item" onClick={() => { setMenuOpen(false); navigate(ROUTES.ACCOUNT) }}>
                <span className="user-menu-icon"><img src="/user.png" alt="Account" /></span>
                <span>Account</span>
              </button>
              <button type="button" className="user-menu-item" onClick={handleLogout}>
                <span className="user-menu-icon"><img src="/logout.png" alt="Logout" /></span>
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Container */}
      <div className="classroom-main">
        {/* Left Sidebar */}
        <div className={`classroom-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <nav className="sidebar-nav">
            <button
              className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
              onClick={() => setActiveTab('home')}
            >
              <img src="/house.png" alt="Home" className="nav-icon" />
              <span>Home</span>
            </button>

            <button
              className={`nav-item ${activeTab === 'calendar' ? 'active' : ''}`}
              onClick={() => setActiveTab('calendar')}
            >
              <img src="/calendar-icon.png" alt="Calendar" className="nav-icon" />
              <span>Calendar</span>
            </button>

            {/* Teaching Section */}
            {isInstructor && (
              <div className="nav-section">
                <button
                  className={`nav-section-header ${activeTab === 'teaching' ? 'active' : ''}`}
                  onClick={() => setActiveTab('teaching')}
                >
                  <img src="/teacher.png" alt="Teaching" className="nav-icon" />
                  <span>Teaching</span>
                  <span 
                    className={`expand-icon ${expandTeaching ? 'expanded' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandTeaching(!expandTeaching);
                    }}
                  >›</span>
                </button>
                {expandTeaching && teaching.length > 0 && (
                  <div className="nav-section-list">
                    {teaching.map((classroom) => (
                      <button
                        key={classroom.class_id || classroom.id}
                        className={`nav-item-class ${activeTab === `class-${classroom.class_id || classroom.id}` ? 'active' : ''}`}
                        onClick={() => handleNavigateToClassroom(classroom)}
                      >
                        <span className="class-name">{classroom.class_title || 'Untitled'} - {classroom.class_sub_title || classroom.section || ''}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Enrolled Section */}
            <div className="nav-section">
              <button
                className={`nav-section-header ${activeTab === 'enrolled' ? 'active' : ''}`}
                onClick={() => setActiveTab('enrolled')}
              >
                <img src="/graduate-hat.png" alt="Enrolled" className="nav-icon" />
                <span>Enrolled</span>
                <span 
                  className={`expand-icon ${expandEnrolled ? 'expanded' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandEnrolled(!expandEnrolled);
                  }}
                >›</span>
              </button>
              {expandEnrolled && enrolled.length > 0 && (
                <div className="nav-section-list">
                  {enrolled.map((classroom) => (
                    <button
                      key={classroom.class_id || classroom.id}
                      className={`nav-item-class ${activeTab === `class-${classroom.class_id || classroom.id}` ? 'active' : ''}`}
                      onClick={() => handleNavigateToClassroom(classroom)}
                    >
                      <span className="class-name">{classroom.class_title || 'Untitled'} - {classroom.class_sub_title || classroom.section || ''}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Archived Section */}
            <div className="nav-section">
              <button
                className={`nav-section-header ${activeTab === 'archived' ? 'active' : ''}`}
                onClick={() => setActiveTab('archived')}
              >
                <img src="/archive .png" alt="Archived" className="nav-icon" />
                <span>Archived</span>
                <span 
                  className={`expand-icon ${expandArchived ? 'expanded' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandArchived(!expandArchived);
                  }}
                >›</span>
              </button>
              {expandArchived && archived.length > 0 && (
                <div className="nav-section-list">
                  {archived.map((classroom) => (
                    <button
                      key={classroom.class_id || classroom.id}
                      className={`nav-item-class ${activeTab === `class-${classroom.class_id || classroom.id}` ? 'active' : ''}`}
                      onClick={() => handleNavigateToClassroom(classroom)}
                      >
                        <span className="class-name">{classroom.class_title || 'Untitled'} - {classroom.class_sub_title || classroom.section || ''}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

            <button
              className="nav-item"
              onClick={() => { window.location.href = 'http://localhost:3000/dashboard' }}
            >
              <img src="/dashboard.png" alt="Dashboard" className="nav-icon" />
              <span>Dashboard</span>
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="classroom-content-wrapper">
          {error && <div className="classroom-error">{error}</div>}

          {activeTab === 'home' && (
            <div className="classroom-section">
              {teaching.length === 0 && enrolled.length === 0 && archived.length === 0 ? (
                <div className="empty-state">
                  <img src="/classroom-icon.png" alt="No classes" className="empty-icon" />
                  <p>{isInstructor ? 'No classes yet. Create your first class!' : 'No classes yet. Join your first class!'}</p>
                </div>
              ) : (
                <div className="classroom-grid">
                  {teaching.map((classroom) => (
                    <ClassroomCard
                      key={classroom.tid || classroom.id}
                      classroom={classroom}
                      isInstructor={isInstructor}
                      isArchived={false}
                      onArchive={handleArchiveClassroom}
                      onDelete={handleDeleteClassroom}
                    />
                  ))}
                  {enrolled.map((classroom) => (
                    <ClassroomCard
                      key={classroom.tid || classroom.id}
                      classroom={classroom}
                      isInstructor={false}
                      isArchived={false}
                      onLeave={handleLeaveClassroom}
                    />
                  ))}
                  {archived.map((classroom) => (
                    <ClassroomCard
                      key={classroom.tid || classroom.id}
                      classroom={classroom}
                      isInstructor={isInstructor}
                      isArchived={true}
                      onUnarchive={handleUnarchiveClassroom}
                      onDelete={handleDeleteClassroom}
                      onLeave={!isInstructor ? handleLeaveClassroom : undefined}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'teaching' && (
            <div className="classroom-section">
              {teaching.length === 0 ? (
                <div className="empty-state">
                  <img src="/classroom-icon.png" alt="No classes" className="empty-icon" />
                  <p>{isInstructor ? 'No classes yet. Create your first class!' : 'No classes yet. Join your first class!'}</p>
                </div>
              ) : (
                <div className="classroom-grid">
                  {teaching.map((classroom) => (
                    <ClassroomCard
                      key={classroom.tid || classroom.id}
                      classroom={classroom}
                      isInstructor={isInstructor}
                      onArchive={handleArchiveClassroom}
                      onDelete={handleDeleteClassroom}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'enrolled' && (
            <div className="classroom-section">
              {enrolled.length === 0 ? (
                <div className="empty-state">
                  <img src="/classroom-icon.png" alt="No classes" className="empty-icon" />
                  <p>You are not enrolled in any classes yet.</p>
                </div>
              ) : (
                <div className="classroom-grid">
                  {enrolled.map((classroom) => (
                    <ClassroomCard
                      key={classroom.tid || classroom.id}
                      classroom={classroom}
                      onLeave={handleLeaveClassroom}
                      isInstructor={false}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'archived' && (
            <div className="classroom-section">
              {archived.length === 0 ? (
                <div className="empty-state">
                  <img src="/archive .png" alt="No archived" className="empty-icon" />
                  <p>No archived classes yet.</p>
                </div>
              ) : (
                <div className="classroom-grid">
                  {archived.map((classroom) => (
                    <ClassroomCard
                      key={classroom.tid || classroom.id}
                      classroom={classroom}
                      isInstructor={isInstructor}
                      isArchived={true}
                      onDelete={handleDeleteClassroom}
                      onUnarchive={handleUnarchiveClassroom}
                      onLeave={!isInstructor ? handleLeaveClassroom : undefined}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'calendar' && (
            <div className="classroom-section">
              <div className="calendar-placeholder">
                <img src="/calendar.png" alt="Calendar" className="calendar-icon" />
                <p>Calendar view coming soon</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <ClassroomModal
          onClose={() => setModalOpen(false)}
          onCreate={handleCreateClassroom}
        />
      )}

      {joinModalOpen && (
        <JoinClassModal
          onClose={() => setJoinModalOpen(false)}
          onJoin={handleJoinClassroom}
        />
      )}
    </div>
  )
}
