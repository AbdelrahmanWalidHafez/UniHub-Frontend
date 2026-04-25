import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCached, getFileAsBlob, authPatch } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import { ROUTES } from '../constants/routes'
import { getRoleName } from '../constants/roles'

export default function Account() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [university, setUniversity] = useState(null)
  const [college, setCollege] = useState(null)
  const [logoUrl, setLogoUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const lastFetchRef = useRef({ tid: null, cid: null, tidPending: null, cidPending: null })
  const loadedRef = useRef(false)
  const profileRef = useRef(null)
  const [profileHeight, setProfileHeight] = useState(null)
  
  // change-password state
  const newPwRef = useRef(null)
  const confirmPwRef = useRef(null)
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState('')
  // visibility toggles are handled directly on the DOM to avoid re-renders
  const metadataRef = useRef(null)
  const [metadataHeight, setMetadataHeight] = useState(null)
   const accountGridRef = useRef(null)
   const [metadataTop, setMetadataTop] = useState(0)
  const changePwVerticalOffset =16

  useEffect(() => {
    if (loadedRef.current) return
    if (!user) return
    loadedRef.current = true
    async function loadRelated() {
      setError('')
      const u = user

      const extractId = (v) => {
        if (v === null || v === undefined) return undefined
        if (typeof v === 'string' || typeof v === 'number') return v
        if (typeof v === 'object') {
          return v.id || v.college_id || v.collegeId || v.cid || v._id || v.uid || v.tid
        }
        return undefined
      }

      let rawTid = u?.tid || u?.university_id || u?.uniId || u?.universityId || u?.university?.tid || u?.tenant_id || u?.tenantId || (u?.university && (u.university.tid || u.university.id))
      let rawCid = u?.cid || u?.college_id || u?.collegeId || u?.college?.id || u?.college?.cid || u?.university?.cid || u?.university?.college_id || (u?.university && u.university.college_id)
      const tid = extractId(rawTid)
      const cid = extractId(rawCid)

      // determine user role early so we can skip college fetches for system admins
      const userRoleEarly = getRoleName(u) || u.roleName || (u.role && (u.role.rid || u.role.id)) || (u.role && u.role.name) || ''

      setLoading(true)
      let pending = (tid ? 1 : 0) + (cid && userRoleEarly !== 'ROLE_SYSTEM_ADMIN' ? 1 : 0)
      if (pending === 0) { setLoading(false); return }

      const done = () => { pending--; if (pending === 0) setLoading(false) }

      if (tid) {
        const tidKey = String(tid)
        getCached(`universitymanagement/api/v1/get-university/${tidKey}`)
          .then(async (data) => {
            const udata = {
              id: data?.university_id || data?.uniId || data?.id,
              name: data?.university_name || data?.universityName || data?.name,
              logo_key: data?.logo_key || data?.university_logo || data?.universityLogo || data?.logoKey,
            }
            setUniversity(udata)
            if (udata.logo_key) {
              getFileAsBlob(`s3/api/v1/get-file/${udata.logo_key}`)
                .then(blob => setLogoUrl(URL.createObjectURL(blob)))
                .catch(() => {})
            }
          })
          .catch(() => {})
          .finally(done)
      }

      if (cid && userRoleEarly !== 'ROLE_SYSTEM_ADMIN') {
        const cidKey = String(cid)
        getCached(`universitymanagement/api/v1/colleges/public/get-college/${cidKey}`)
          .then(c => setCollege({
            id: c?.college_id || c?.collegeId || c?.id,
            name: c?.college_name || c?.collegeName || c?.name,
            campus: c?.campus || c?.college_campus || c?.campus_name || '',
          }))
          .catch(() => {})
          .finally(done)
      }
    }

    loadRelated()
  }, [user])

  // cleanup logo blob url when component unmounts or when logoUrl changes
  useEffect(() => {
    return () => { if (logoUrl) URL.revokeObjectURL(logoUrl) }
  }, [logoUrl])

  if (!user) {
    return (
      <div style={{ padding: 28 }}>
        <h2>Account</h2>
        <p>You must be logged in to view your account.</p>
        <button onClick={() => navigate(ROUTES.LOGIN)}>Sign in</button>
      </div>
    )
  }

  // compute first/last name fallbacks

  const InfoItem = ({ label, value }) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 15, color: '#111827', fontWeight: 500 }}>{value || '—'}</div>
    </div>
  )

  const SectionCard = ({ title, children, style, containerRef }) => (
    <div ref={containerRef} style={{ backgroundColor: 'white', borderRadius: 14, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 2px 8px rgba(58,74,82,0.06)', marginBottom: 20, ...(style || {}) }}>
      <div style={{ padding: '12px 18px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 10, backgroundColor: '#FAFBFC' }}>
        <div style={{ width: 3, height: 16, backgroundColor: '#9DD957', borderRadius: 2 }} />
        <h3 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#000000', textTransform: 'uppercase' }}>{title}</h3>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  )

  // normalize common user fields with fallbacks
  const fmt = (d) => {
    if (!d) return ''
    try {
      const dt = new Date(d)
      if (isNaN(dt)) return String(d)
      return dt.toLocaleString()
    } catch { return String(d) }
  }

  const firstName = user.first_name || user.firstName || ''
  const lastName = user.last_name || user.lastName || user.last_name || ''
  const displayName = (firstName || lastName) ? `${firstName} ${lastName}`.trim() : (user.fullName || user.name || user.email || '—')
  const dob = user.date_of_birth || user.dob || ''
  const gender = user.gender || user.sex || ''
  const createdAt = user.created_at || user.createdAt || ''
  const createdBy = user.created_by || user.createdBy || ''
  const updatedAt = user.updated_at || user.updatedAt || ''
  const updatedBy = user.updated_by || user.updatedBy || ''
  const userId = user.user_id || user.userId || user.id || ''
  const roleId = user.role && (user.role.rid || user.role.id) ? (user.role.rid || user.role.id) : ''
  const roleName = getRoleName(user) || user.roleName || (user.role && user.role.name) || ''
  const universityObj = user.university || {}
  const uniName = universityObj.university_name || universityObj.universityName || universityObj.name || ''
  const collegeId = user.cid || user.college_id || user.collegeId || ''
  const gpa = user.gpa || (user.university && (user.university.gpa || user.university?.gpa)) || ''

  const formatRole = (r) => {
    if (!r) return ''
    try {
      let s = String(r)
      s = s.replace(/^ROLE_/, '')
      s = s.replace(/_/g, ' ')
      return s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
    } catch {
      return String(r)
    }
  }
  const roleDisplay = formatRole(roleName || (user.role && user.role.name))

  // computed affiliation height (match profile card)
  const affHeight = profileHeight || (profileRef.current ? profileRef.current.offsetHeight : null)

  // match affiliation card height to profile card height
  useEffect(() => {
    const el = profileRef.current
    if (!el) return
    const update = () => {
      try { setProfileHeight(el.offsetHeight) } catch (e) {}
    }
    update()
    let ro = null
    try {
      ro = new ResizeObserver(update)
      ro.observe(el)
    } catch (e) {
      // ResizeObserver may not be available in some environments
      window.addEventListener('resize', update)
    }
    return () => {
      try { if (ro) ro.disconnect() } catch (e) {}
      window.removeEventListener('resize', update)
    }
  }, [])

  // measure metadata card height for matching other card heights
  useEffect(() => {
    const el = metadataRef.current
    if (!el) return
    const update = () => {
      try { setMetadataHeight(el.offsetHeight) } catch (e) {}
       try {
         if (accountGridRef.current && el) {
           const gridRect = accountGridRef.current.getBoundingClientRect()
           const metaRect = el.getBoundingClientRect()
           setMetadataTop(Math.max(0, Math.round(metaRect.top - gridRect.top)))
         }
       } catch (e) {}
    }
    update()
    let ro = null
    try {
      ro = new ResizeObserver(update)
      ro.observe(el)
    } catch (e) {
      window.addEventListener('resize', update)
    }
    return () => {
      try { if (ro) ro.disconnect() } catch (e) {}
      window.removeEventListener('resize', update)
    }
  }, [])

  // (removed height-locking behavior; change-password moved beneath Affiliation)

  

  
  const handleSubmitPassword = () => {
    setPwError('')
    setPwSuccess('')
    const newPassword = newPwRef.current ? String(newPwRef.current.value || '') : ''
    const confirmPassword = confirmPwRef.current ? String(confirmPwRef.current.value || '') : ''
    // server-side regex: ^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!]).{8,}$
    const pwRegex = /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!]).{8,}$/
    if (!newPassword) {
      setPwError('Password cannot be blank')
      return
    }
    if (!pwRegex.test(newPassword)) {
      setPwError('Password must have uppercase, lowercase, digit, special character, and be at least 8 characters long.')
      return
    }
    if (!confirmPassword) {
      setPwError('Confirm password cannot be blank')
      return
    }
    if (newPassword !== confirmPassword) {
      setPwError('Passwords do not match')
      return
    }

    // Call auth microservice PATCH /api/v1/auth/change-password
    ;(async () => {
      try {
        await authPatch('change-password', { password: newPassword, confirm_password: confirmPassword })
        setPwSuccess('Password updated successfully')
        setPwError('')
        if (newPwRef.current) newPwRef.current.value = ''
        if (confirmPwRef.current) confirmPwRef.current.value = ''
      } catch (err) {
        setPwError(err?.message || 'Failed to change password')
        setPwSuccess('')
      }
    })()
  }

  const handleToggleShowNew = (e) => {
    try {
      const input = newPwRef.current
      if (!input) return
      const img = e && e.currentTarget ? e.currentTarget.querySelector('img') : null
      const wasFocused = document.activeElement === input
      const selStart = input.selectionStart
      const selEnd = input.selectionEnd
      // toggle type directly on DOM
      if (input.type === 'password') {
        input.type = 'text'
        if (img) img.src = '/hidden.png'
        if (e && e.currentTarget) e.currentTarget.setAttribute('aria-label', 'Hide new password')
      } else {
        input.type = 'password'
        if (img) img.src = '/eye.png'
        if (e && e.currentTarget) e.currentTarget.setAttribute('aria-label', 'Show new password')
      }
      // restore selection and focus
      requestAnimationFrame(() => {
        try {
          input.value = input.value
          if (typeof selStart === 'number' && typeof selEnd === 'number') input.setSelectionRange(selStart, selEnd)
          if (wasFocused) input.focus()
        } catch (err) {}
      })
    } catch (err) {}
  }

  const handleToggleShowConfirm = (e) => {
    try {
      const input = confirmPwRef.current
      if (!input) return
      const img = e && e.currentTarget ? e.currentTarget.querySelector('img') : null
      const wasFocused = document.activeElement === input
      const selStart = input.selectionStart
      const selEnd = input.selectionEnd
      if (input.type === 'password') {
        input.type = 'text'
        if (img) img.src = '/hidden.png'
        if (e && e.currentTarget) e.currentTarget.setAttribute('aria-label', 'Hide confirm password')
      } else {
        input.type = 'password'
        if (img) img.src = '/eye.png'
        if (e && e.currentTarget) e.currentTarget.setAttribute('aria-label', 'Show confirm password')
      }
      requestAnimationFrame(() => {
        try {
          input.value = input.value
          if (typeof selStart === 'number' && typeof selEnd === 'number') input.setSelectionRange(selStart, selEnd)
          if (wasFocused) input.focus()
        } catch (err) {}
      })
    } catch (err) {}
  }

  // Restrict access: only allow specific roles to view Account
  const allowedRoles = ['ROLE_SYSTEM_ADMIN', 'ROLE_STUDENT', 'ROLE_INSTRUCTOR', 'ROLE_SECRETARY']
  const rawRole = roleName || (user.role && user.role.name) || ''
  if (!allowedRoles.includes(rawRole)) {
    return (
      <div style={{ padding: 28 }}>
        <h2>Access denied</h2>
        <p>You don't have permission to view this page.</p>
      </div>
    )
  }

  return (
    <div className="account-root" style={{ backgroundColor: '#F4F6F8', minHeight: '100vh', paddingBottom: 48 }}>
      <style>{`
        .account-container{max-width:1100px;margin:0 auto;padding:36px 28px}
        .account-header{display:flex;align-items:center;gap:16px;margin-bottom:20px}
        .account-back{width:36px;height:36px;border-radius:10px;border:1px solid #E5E7EB;background:white;display:flex;align-items:center;justify-content:center;cursor:pointer}
        .account-title{font-size:26px;font-weight:800;color:#111827;margin:0}
        .account-sub{font-family:monospace;color:#6B7280;margin-top:6px}
        .account-grid{display:grid;grid-template-columns:1fr 400px;gap:28px;align-items:start}
        .section-card{background:white;border-radius:14px;border:1px solid #E5E7EB;padding:20px;box-shadow:0 2px 8px rgba(58,74,82,0.04)}
        .profile-avatar{width:112px;height:112px;border-radius:50%;background:#F3F4F6;border:1px solid #E5E7EB;display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:800;color:#9CA3AF;overflow:hidden;transition:transform 200ms cubic-bezier(.2,.8,.2,1);position:relative}
        .profile-avatar img{display:block;width:100%;height:100%;object-fit:cover;transition:transform 260ms cubic-bezier(.2,.8,.2,1)}
        .profile-avatar:hover{ /* no position change on hover */ }
        .profile-avatar::after{content:'';position:absolute;inset:-8px;border-radius:50%;pointer-events:none;opacity:0;transition:opacity 220ms ease}
        .profile-avatar:hover::after{opacity:1;box-shadow:0 0 0 0 rgba(157,217,87,0.36);animation:pulse 1600ms infinite}
        @keyframes pulse{0%{box-shadow:0 0 0 0 rgba(157,217,87,0.36)}70%{box-shadow:0 0 0 18px rgba(157,217,87,0)}100%{box-shadow:0 0 0 0 rgba(157,217,87,0)}}
        .profile-avatar .avatar-overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg, rgba(0,0,0,0.28), rgba(0,0,0,0.36));color:#fff;opacity:0;transition:opacity 220ms ease}
        .profile-avatar:hover .avatar-overlay{opacity:1}
        .avatar-camera{display:inline-flex;align-items:center;gap:8px;opacity:0;transition:opacity 220ms}
        .profile-avatar:hover .avatar-camera{opacity:1}
        .profile-meta{display:flex;flex-direction:column;gap:6px}
        .account-topbar{padding:20px 60px;border-bottom:1px solid #e0e0e0;background:#ffffff;display:flex;justify-content:center}
        .app-logo{height:40px;object-fit:contain}
        @media (max-width:980px){.account-grid{grid-template-columns:1fr;}.account-container{padding:24px}}
      `}</style>

      <div className="account-topbar">
        <img src="/logo.png" alt="App logo" className="app-logo" style={{ height: 40 }} />
      </div>

      <div className="account-container">
        <div className="account-header">
          <button className="account-back" onClick={() => navigate(-1)}>‹</button>
          <div>
            <h1 className="account-title">Account</h1>
            <div className="account-sub">#{String(userId || '')}</div>
          </div>
        </div>

        <div className="account-grid">
          <div>
            <SectionCard title="Profile" containerRef={profileRef}>
              <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                <div className="profile-avatar" style={{ position: 'relative' }}>
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{(displayName || '?').charAt(0).toUpperCase()}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 800 }}>{displayName}</div>
                    </div>
                  </div>
                  <div style={{ height: 14 }} />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
                    <InfoItem label="First name" value={firstName} />
                    <InfoItem label="Last name" value={lastName} />
                    <InfoItem label="Email" value={user.email || user.username} />
                    <InfoItem label="Date of birth" value={dob} />
                    <InfoItem label="Gender" value={gender} />
                    <InfoItem label="Role" value={roleDisplay || '—'} />
                  </div>
                  {/* change-password form moved below Affiliation card */}
                </div>
              </div>
            </SectionCard>

            <div style={{ height: 18 }} />

            <SectionCard title="Metadata" containerRef={metadataRef} style={{ height: `${(metadataHeight || 0) + 223}px` }}>
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 700 }}>Created At</div>
                  <div style={{ fontSize: 14 }}>{fmt(createdAt) || '—'}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 700 }}>Created By</div>
                  <div style={{ fontSize: 14 }}>{createdBy || '—'}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 700 }}>Updated At</div>
                  <div style={{ fontSize: 14 }}>{fmt(updatedAt) || '—'}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 700 }}>Updated By</div>
                  <div style={{ fontSize: 14 }}>{updatedBy || '—'}</div>
                </div>
              </div>
            </SectionCard>
          </div>

          <div>
            <SectionCard title="Affiliation" style={affHeight ? { minHeight: `${affHeight}px` } : {}}>
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', background: '#F3F4F6', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {logoUrl ? (
                      <img src={logoUrl} alt="University" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ fontSize: 20, color: '#9CA3AF', fontWeight: 700 }}>{(university?.name || uniName || '?').charAt(0).toUpperCase()}</div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase' }}>University</div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{loading ? 'Loading…' : (university?.name || uniName || '—')}</div>
                  </div>
                </div>
                {rawRole !== 'ROLE_SYSTEM_ADMIN' ? (
                <div>
                  <div style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase' }}>College</div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{loading ? 'Loading…' : (college?.name || '—')}</div>
                  <div style={{ fontSize: 12, color: '#6B7280', marginTop: 6 }}>Campus: {college?.campus || '—'}</div>
                </div>
                ) : null}
                {/* role removed from affiliations card - displayed in General card */}
                {gpa ? (
                  <div>
                    <div style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase' }}>GPA</div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{gpa}</div>
                  </div>
                ) : null}
              </div>
            </SectionCard>
            <div style={{ height: metadataHeight ? `${metadataHeight + changePwVerticalOffset}px` : changePwVerticalOffset }} />
            <SectionCard title="Change password" style={metadataHeight ? { minHeight: `${metadataHeight}px` } : {}}>
              <div style={{ display: 'grid', gap: 8 }}>
                {pwSuccess ? (
                  <div style={{ marginBottom: 8, padding: '8px 12px', background: '#ECFDF5', border: '1px solid #D1FAE5', color: '#065F46', borderRadius: 8 }}>{pwSuccess}</div>
                ) : null}
                {pwError ? (
                  <div style={{ color: '#B91C1C', fontSize: 13, marginBottom: 6, fontWeight: 600 }}>{pwError}</div>
                ) : null}
                <div style={{ position: 'relative' }}>
                  <input ref={newPwRef} type="password" placeholder="New password" style={{ padding: '10px 40px 10px 10px', borderRadius: 8, border: '1px solid #E5E7EB', width: '100%' }} />
                  <button aria-label="Show new password" onClick={handleToggleShowNew} type="button" style={{ position: 'absolute', right: 8, top: 6, bottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 6, background: 'transparent', border: 'none', cursor: 'pointer' }}>
                    <img src="/eye.png" alt="show" style={{ width: 18, height: 18, display: 'block' }} />
                  </button>
                </div>
                <div style={{ height: 8 }} />
                <div style={{ position: 'relative' }}>
                  <input ref={confirmPwRef} type="password" placeholder="Confirm password" style={{ padding: '10px 40px 10px 10px', borderRadius: 8, border: '1px solid #E5E7EB', width: '100%' }} />
                  <button aria-label="Show confirm password" onClick={handleToggleShowConfirm} type="button" style={{ position: 'absolute', right: 8, top: 6, bottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 6, background: 'transparent', border: 'none', cursor: 'pointer' }}>
                    <img src="/eye.png" alt="show" style={{ width: 18, height: 18, display: 'block' }} />
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleSubmitPassword} style={{ padding: '10px 14px', background: '#9DD957', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>Save</button>
                  <button onClick={() => { if (newPwRef.current) newPwRef.current.value = ''; if (confirmPwRef.current) confirmPwRef.current.value = ''; setPwError(''); setPwSuccess('') }} style={{ padding: '10px 14px', background: 'white', border: '1px solid #E5E7EB', borderRadius: 8, cursor: 'pointer' }}>Clear</button>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  )
}
