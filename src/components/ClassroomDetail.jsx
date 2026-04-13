import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getRoleName } from '../constants/roles'
import { logout } from '../utils/auth'
import { get } from '../utils/api'
import './classroom.css'

export default function ClassroomDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, clearAuth } = useAuth()
  const firstName = user?.first_name || user?.firstName || user?.name || user?.email || 'U'
  const initial = (firstName && firstName[0]) || 'U'
  const roleName = getRoleName(user)
  const isInstructor = String(roleName || '').toLowerCase().includes('instructor')
  const isStudent = String(roleName || '').toLowerCase().includes('student')

  // Get classroom data from navigation state
  const passedClassroom = location.state?.classroom

  const [classroom, setClassroom] = useState(passedClassroom || null)
  const [activeTab, setActiveTab] = useState('stream')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [teaching, setTeaching] = useState([])
  const [enrolled, setEnrolled] = useState([])
  const [archived, setArchived] = useState([])
  const [expandTeaching, setExpandTeaching] = useState(true)
  const [expandEnrolled, setExpandEnrolled] = useState(true)
  const [expandArchived, setExpandArchived] = useState(false)
  const [owner, setOwner] = useState(null)
  const [members, setMembers] = useState([])
  const [loadingPeople, setLoadingPeople] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const menuRef = useRef(null)
  const avatarRef = useRef(null)

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

  const classroomName = classroom?.class_title || classroom?.name || 'Untitled Class'
  const section = classroom?.class_sub_title || classroom?.section || ''
  const entryCode = classroom?.entry_code || classroom?.code || ''
  const imageNum = classroom?.image_num || 1
  const instructorId = classroom?.created_by || classroom?.instructor_id
  const bgColor = classroom?.color || generateColorFromId(instructorId)
  const backgroundImageUrl = getImageFilename(imageNum)

  // Fetch classrooms for sidebar
  const fetchClassrooms = useCallback(async () => {
    try {
      let teachingData = []
      let enrolledData = []
      let archivedData = []

      if (isInstructor) {
        try {
          const activeResponse = await get('classroom/api/v1/classroom/instructor/get-active-classes')
          teachingData = activeResponse?.class_rooms || []
        } catch (err) {
          console.error('Error fetching active classes:', err)
        }

        try {
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
    }
  }, [isInstructor, isStudent])

  const handleNavigateToClassroom = (classroom) => {
    navigate(`/classroom/${classroom.class_id || classroom.id}`, { state: { classroom } })
  }

  async function handleLogout() {
    try {
      await logout()
    } finally {
      clearAuth()
      setMenuOpen(false)
      navigate('/')
    }
  }

  const fetchPeopleData = useCallback(async (pageNum = 1) => {
    if (!id) return
    try {
      setLoadingPeople(true)
      // Fetch owner only on first page
      if (pageNum === 1) {
        const ownerResponse = await get(`classroom/api/v1/classroom/get-owner/${id}`)
        console.log('Owner response:', ownerResponse)
        setOwner(ownerResponse)
      }
      
      // Fetch members with pagination
      const membersResponse = await get(`classroom/api/v1/classroom/get-members/${id}?page_num=${pageNum}`)
      console.log('Members response:', membersResponse)
      const membersList = membersResponse.members || []
      setMembers(membersList)
      // If we got exactly 10 members, there might be more pages
      setHasMore(membersList.length === 10)
    } catch (err) {
      console.error('Error fetching people data:', err)
    } finally {
      setLoadingPeople(false)
    }
  }, [id])

  const handleNextPage = () => {
    setCurrentPage(prev => prev + 1)
  }

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1)
    }
  }

  useEffect(() => {
    fetchClassrooms()
  }, [fetchClassrooms])

  useEffect(() => {
    if (activeTab === 'people') {
      fetchPeopleData(currentPage)
    }
  }, [activeTab, currentPage, fetchPeopleData])

  useEffect(() => {
    // Reset page when switching to people tab
    if (activeTab === 'people') {
      setCurrentPage(1)
    }
  }, [activeTab])

  useEffect(() => {
    function onDocClick(e) {
      if (menuOpen && menuRef.current && !menuRef.current.contains(e.target) && avatarRef.current && !avatarRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [menuOpen])

  if (!classroom) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p>Loading classroom...</p>
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
          {classroomName && <span className="navbar-separator"> > {classroomName}</span>}
        </div>
        
        <div className="navbar-actions">
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
              <button type="button" className="user-menu-item" onClick={() => { setMenuOpen(false); navigate('/account') }}>
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
              onClick={() => navigate('/classroom-list', { state: { activeTab: 'home' } })}
            >
              <img src="/house.png" alt="Home" className="nav-icon" />
              <span>Home</span>
            </button>

            <button
              className={`nav-item ${activeTab === 'calendar' ? 'active' : ''}`}
              onClick={() => navigate('/classroom-list', { state: { activeTab: 'calendar' } })}
            >
              <img src="/calendar-icon.png" alt="Calendar" className="nav-icon" />
              <span>Calendar</span>
            </button>

            {/* Teaching Section */}
            {isInstructor && (
              <div className="nav-section">
                <button
                  className={`nav-section-header ${activeTab === 'teaching' ? 'active' : ''}`}
                  onClick={() => navigate('/classroom-list', { state: { activeTab: 'teaching' } })}
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
                    {teaching.map((cls) => (
                      <button
                        key={cls.class_id || cls.id}
                        className={`nav-item-class ${id === String(cls.class_id || cls.id) ? 'active' : ''}`}
                        onClick={() => handleNavigateToClassroom(cls)}
                      >
                        <span className="class-name">{cls.class_title || 'Untitled'} - {cls.class_sub_title || cls.section || ''}</span>
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
                onClick={() => setExpandEnrolled(!expandEnrolled)}
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
                  {enrolled.map((cls) => (
                    <button
                      key={cls.class_id || cls.id}
                      className={`nav-item-class ${id === String(cls.class_id || cls.id) ? 'active' : ''}`}
                      onClick={() => handleNavigateToClassroom(cls)}
                    >
                      <span className="class-name">{cls.class_title || 'Untitled'} - {cls.class_sub_title || cls.section || ''}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Archived Section */}
            <div className="nav-section">
              <button
                className={`nav-section-header ${activeTab === 'archived' ? 'active' : ''}`}
                onClick={() => setExpandArchived(!expandArchived)}
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
                  {archived.map((cls) => (
                    <button
                      key={cls.class_id || cls.id}
                      className={`nav-item-class ${id === String(cls.class_id || cls.id) ? 'active' : ''}`}
                      onClick={() => handleNavigateToClassroom(cls)}
                    >
                      <span className="class-name">{cls.class_title || 'Untitled'} - {cls.class_sub_title || cls.section || ''}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* Main Content Wrapper */}
        <div className="classroom-content-main">
          {/* Classroom Header with Image and Tabs */}
          <div className="classroom-detail-hero">
            <img 
              src={backgroundImageUrl} 
              alt={classroomName}
              className="classroom-detail-image"
            />
            
            {/* Title Overlay */}
            <div className="classroom-hero-overlay">
              <h1 className="classroom-hero-title">{classroomName}</h1>
              {section && <p className="classroom-hero-section">{section}</p>}
            </div>
            
            {/* Tabs Bar Overlay */}
            <div className="classroom-tabs">
              <button
                className={`tab-item ${activeTab === 'stream' ? 'active' : ''}`}
                onClick={() => setActiveTab('stream')}
              >
                Stream
              </button>
              <button
                className={`tab-item ${activeTab === 'classwork' ? 'active' : ''}`}
                onClick={() => setActiveTab('classwork')}
              >
                Classwork
              </button>
              <button
                className={`tab-item ${activeTab === 'people' ? 'active' : ''}`}
                onClick={() => setActiveTab('people')}
              >
                People
              </button>
            </div>
          </div>

          {/* Classroom Info Section - Code Card Only */}
          {activeTab !== 'people' && (
            <div className="classroom-header-section">
              {/* Left Side - Code Card and Announce Button */}
              <div className="classroom-header-left">
                <div className="entry-code-card">
                  <div className="code-header">Class code</div>
                  <div className="code-display">{entryCode}</div>
                </div>
              {isInstructor && (
                <button className="announce-btn">
                  <img src="/pen.png" alt="Announce" className="announce-icon" />
                  <span>Announce something</span>
                </button>
              )}
            </div>

            {/* Right Side - Stream Empty Card */}
            {activeTab === 'stream' && (
              <div className="stream-empty-card-header">
                <img src="/training.png" alt="Stream" className="stream-empty-image" />
                <h3 className="stream-empty-title">This is where you can talk to your class</h3>
                <p className="stream-empty-description">
                  {isInstructor 
                    ? 'Use the stream to share announcements, post assignments and respond to student questions'
                    : 'Stay tuned until your teacher posts an announcement to the stream and respond to student questions'
                  }
                </p>
              </div>
            )}
            </div>
          )}

          {/* Tab Content */}
          <div className="classroom-tab-content">
            {activeTab === 'stream' && (
              <div className="tab-section">
                {/* Stream content will appear here */}
              </div>
            )}

            {activeTab === 'classwork' && (
              <div className="tab-section">
                <div className="empty-state">
                  <p>No assignments yet</p>
                </div>
              </div>
            )}

            {activeTab === 'people' && (
              <div className="tab-section">
                <div className="people-list">
                  {/* Teachers Section */}
                  <div className="people-section">
                    <h3 className="people-section-title">Teachers</h3>
                    {loadingPeople ? (
                      <p>Loading...</p>
                    ) : owner ? (
                      <div className="people-item">
                        <div className="people-avatar" style={{ backgroundColor: '#7c3aed' }}>
                          {(owner.owner_email || owner.email)?.[0]?.toUpperCase() || 'T'}
                        </div>
                        <span className="people-name">{owner.owner_email || owner.email}</span>
                      </div>
                    ) : (
                      <p>No teacher found</p>
                    )}
                  </div>

                  {/* Classmates Section */}
                  <div className="people-section">
                    <div className="people-section-header">
                      <h3 className="people-section-title">Classmates</h3>
                      <span className="people-count">{members.length} students</span>
                    </div>
                    {loadingPeople ? (
                      <p>Loading...</p>
                    ) : members.length > 0 ? (
                      <div className="people-items">
                        {members.map((member, index) => (
                          <div key={index} className="people-item">
                            <div className="people-avatar" style={{ backgroundColor: generateColorFromId(member.rid || member.record_id) }}>
                              {(member.member_email || member.email)?.[0]?.toUpperCase() || 'S'}
                            </div>
                            <span className="people-name">{member.member_email || member.email}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p>No classmates yet</p>
                    )}
                    {members.length > 0 && (
                      <div className="pagination-controls">
                        <button 
                          className="pagination-btn" 
                          onClick={handlePreviousPage}
                          disabled={currentPage === 1}
                          title="Previous page"
                        >
                          ←
                        </button>
                        <span className="pagination-info">Page {currentPage}</span>
                        <button 
                          className="pagination-btn" 
                          onClick={handleNextPage}
                          disabled={!hasMore}
                          title="Next page"
                        >
                          →
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
