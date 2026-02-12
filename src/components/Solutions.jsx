import React, { useEffect, useRef, useState } from 'react'

const BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) ? import.meta.env.BASE_URL.replace(/\/$/, '') : ''

const FEATURES = [
  {
    id: 'lumos',
    title: 'Lumos AI',
    subtitle: 'AI-first platform intelligence',
    image: `${BASE}/lumosAI.png`,
    description:
      'Lumos AI provides platform-wide intelligence that personalizes learning journeys, surfaces smart recommendations, and automates routine administrative workflows. It powers instant search, contextual assistants, and predictive analytics so instructors and students get the right information at the right time. Lumos also exposes careful governance controls so AI features respect institutional policies and privacy.',
  },
  {
    id: 'data-isolation',
    title: 'Data Isolation',
    subtitle: 'Secure multi-tenant boundaries',
    image: `${BASE}/dataIsolation.png`,
    description:
      'Each institution runs inside a logically isolated data environment with strict tenancy boundaries — students, instructors, courses, grades, and files are partitioned so no cross-tenant access occurs. Isolation is enforced at the storage, API, and application layer, enabling per-tenant encryption, compliance reporting, and safe customizations without risking data leakage. These controls make UniHub suitable for large consortia, federated deployments, and regulated environments.',
  },
  {
    id: 'admin',
    title: 'System Administration',
    subtitle: 'Manage institutions, users, and integrations',
    image: `${BASE}/systemAdmin.png`,
    description:
      'Centralized administration tools let platform operators add and remove institutions, manage users and roles, and configure integrations such as SIS, LMS, and payment gateways. Admins can create fine-grained permission sets, audit activity, and roll out feature flags or subscription controls per institution. Built-in monitoring and health dashboards simplify maintenance and day-to-day operations at scale.',
  },
  {
    id: 'community',
    title: 'Community Management',
    subtitle: 'Forums, posts and discussions',
    image: `${BASE}/announcments.png`,
    description:
      'Community tools let users create posts, start discussions, comment, like, and follow topics, bringing social learning into the platform. Spaces and groups are scoped per institution (or course) so discussions remain relevant and private where required, while moderators and reporting workflows help maintain healthy discourse. Community analytics highlight active topics and influential contributors to help instructors and admins foster engagement.',
  },
  {
    id: 'classroom',
    title: 'Classroom',
    subtitle: 'Course materials and interactions',
    image: `${BASE}/classroom.png`,
    description:
      'Classroom features provide course pages, assignment workflows, gradebooks, and resource management for instructors and students. Teachers can publish materials, create scalable assessments, give feedback inline, and use integrated communication channels to interact with students in context. Robust enrollment and roster sync keep course membership accurate across institutional systems.',
  },
  {
    id: 'collaboration',
    title: 'Collaboration',
    subtitle: 'Chat, meetings and teamwork',
    image: `${BASE}/collaboration.png`,
    description:
      'Collaboration includes real-time chat, group channels, document sharing, and virtual meeting integrations so teams can work together smoothly. Granular permissions and channel controls let institutions keep conversations private or open as appropriate, while threaded discussions and activity history preserve context. Integrations with calendars and tasks connect collaboration to daily workflows.',
  },
  {
    id: 'calendar',
    title: 'Calendar & Tasks',
    subtitle: 'Schedule, deadlines and to-dos',
    image: `${BASE}/calendar.png`,
    description:
      'The unified calendar and task system aggregates course schedules, assignment deadlines, and campus events into a single, personalized timeline. Students and staff can create task lists, set reminders, and synchronize with external calendar apps so nothing slips through the gaps. Smart notifications and due-date summaries keep users focused and on track across multiple institutions and courses.',
  },
]

export default function Solutions() {
  const visualRefs = useRef([])
  const visualScrollRef = useRef(null)
  const sectionRef = useRef(null)
  
  const leftRef = useRef(null)
  const [active, setActive] = useState(0)
  const [detailState, setDetailState] = useState(0)
  const trackRef = useRef(null)
  const thumbRef = useRef(null)
  const [processedImages, setProcessedImages] = useState({})
  const areaActiveRef = useRef(false)

  useEffect(() => {
    visualRefs.current = visualRefs.current.slice(0, FEATURES.length)

    const rootEl = visualScrollRef.current || null
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const idx = Number(entry.target.dataset.index)
          if (entry.isIntersecting) {
            setActive(idx)
          }
        })
      },
      { root: rootEl, threshold: 0.6 }
    )

    visualRefs.current.forEach((el) => el && obs.observe(el))
    return () => obs.disconnect()
  }, [])

  // animate detail panel on active change
  useEffect(() => {
    setDetailState((s) => s + 1)
  }, [active])

  // ensure visual pane scrolls to the active feature (keeps images in sync)
  useEffect(() => {
    const el = visualRefs.current[active]
    if (el && visualScrollRef.current) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [active])

  // (indicator removed — custom track now replaces it)

  function scrollToIndex(i) {
    const el = visualRefs.current[i]
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  // custom track/thumb sync + interactions
  useEffect(() => {
    const scroller = visualScrollRef.current
    const track = trackRef.current
    const thumb = thumbRef.current
    if (!scroller || !track || !thumb) return

    // enable wheel scrolling from the left column only
    const leftEl = leftRef.current
    function onLeftWheel(e) {
      // only when wheel happens near the paragraph
      e.preventDefault()
      scroller.scrollBy({ top: e.deltaY, behavior: 'auto' })
      updateThumb()
    }

    // track whether the cursor is in the left area
    function onLeftEnter() { areaActiveRef.current = true }
    function onLeftLeave() { areaActiveRef.current = false }
    leftEl && leftEl.addEventListener('wheel', onLeftWheel, { passive: false })
    leftEl && leftEl.addEventListener('mouseenter', onLeftEnter)
    leftEl && leftEl.addEventListener('mouseleave', onLeftLeave)

    let isDragging = false
    let startY = 0
    let startScroll = 0

    let rafId = null
    function doUpdateThumb() {
      rafId = null
      // set track sizing to match the left column (decoupled from paragraph)
      const leftEl = leftRef.current
      if (leftEl) {
        // position track at the top of the left column
        track.style.top = `0px`
        const newH = `${leftEl.clientHeight}px`
        if (track.style.height !== newH) track.style.height = newH
      }

      const trackRect = track.getBoundingClientRect()
      const trackH = trackRect.height
      const visibleH = scroller.clientHeight
      const scrollH = scroller.scrollHeight
      if (scrollH <= visibleH) {
        track.style.opacity = '0'
        return
      }
      track.style.opacity = '1'
      const thumbH = Math.max((visibleH / scrollH) * trackH, 24)
      const maxThumbTop = trackH - thumbH
      const top = (scroller.scrollTop / (scrollH - visibleH)) * maxThumbTop
      // apply updates in a single frame
      thumb.style.height = `${thumbH}px`
      thumb.style.transform = `translateY(${top}px)`
    }

    function scheduleUpdate() {
      if (rafId) return
      rafId = requestAnimationFrame(doUpdateThumb)
    }

    function onScroll() { scheduleUpdate() }
    scroller.addEventListener('scroll', onScroll, { passive: true })

    function onPointerDown(e) {
      // only start dragging if cursor is in the left area (near paragraph)
      if (!areaActiveRef.current) return
      isDragging = true
      startY = e.clientY
      startScroll = scroller.scrollTop
      thumb.setPointerCapture?.(e.pointerId)
    }

    function onPointerMove(e) {
      if (!isDragging) return
      const trackRect = track.getBoundingClientRect()
      const trackH = trackRect.height
      const visibleH = scroller.clientHeight
      const scrollH = scroller.scrollHeight
      const delta = e.clientY - startY
      const scrollDelta = (delta / trackH) * scrollH
      scroller.scrollTop = Math.max(0, Math.min(scrollH - visibleH, startScroll + scrollDelta))
    }

    function onPointerUp(e) {
      isDragging = false
      try { thumb.releasePointerCapture?.(e.pointerId) } catch (err) {}
    }

    function onTrackClick(e) {
      // only respond to clicks when cursor is in the left area
      if (!areaActiveRef.current) return
      if (e.target === thumb) return
      const trackRect = track.getBoundingClientRect()
      const clickY = e.clientY - trackRect.top
      const thumbH = thumb.getBoundingClientRect().height
      const trackH = trackRect.height
      const visibleH = scroller.clientHeight
      const scrollH = scroller.scrollHeight
      const maxThumbTop = trackH - thumbH
      const newThumbTop = Math.max(0, Math.min(maxThumbTop, clickY - thumbH / 2))
      const newScroll = (newThumbTop / maxThumbTop) * (scrollH - visibleH)
      scroller.scrollTo({ top: newScroll, behavior: 'smooth' })
    }

    thumb.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    track.addEventListener('click', onTrackClick)

    // initial
    scheduleUpdate()
    const ro = new ResizeObserver(scheduleUpdate)
    ro.observe(scroller)
    // observe the left column so the track stays stable when layout changes
    ro.observe(leftEl)

    return () => {
      scroller.removeEventListener('scroll', onScroll)
      thumb.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      track.removeEventListener('click', onTrackClick)
      leftEl && leftEl.removeEventListener('wheel', onLeftWheel)
      leftEl && leftEl.removeEventListener('mouseenter', onLeftEnter)
      leftEl && leftEl.removeEventListener('mouseleave', onLeftLeave)
      ro.disconnect()
    }
  }, [])

  // convert feature PNGs to monochrome variants — defer until section is visible to avoid heavy startup work
  useEffect(() => {
    let cancelled = false
    let obs = null

    async function processAll() {
      const map = {}
      await Promise.all(
        FEATURES.map(async (f) => {
          try {
            const data = await processImageToMonochrome(f.image)
            map[f.id] = data
          } catch (e) {
            map[f.id] = f.image
          }
        })
      )
      if (!cancelled) setProcessedImages(map)
    }

    const sec = sectionRef.current
    if (sec && typeof IntersectionObserver !== 'undefined') {
      obs = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              processAll()
              observer.unobserve(sec)
            }
          })
        },
        { threshold: 0.12 }
      )
      obs.observe(sec)
    } else {
      // fallback: process immediately in environments without IntersectionObserver
      processAll()
    }

    return () => {
      cancelled = true
      if (obs) obs.disconnect()
    }
  }, [])

  // helper: load image and convert to black icon on white background
  function processImageToMonochrome(src) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        try {
          const w = img.naturalWidth
          const h = img.naturalHeight
          const canvas = document.createElement('canvas')
          canvas.width = w
          canvas.height = h
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0)
          const id = ctx.getImageData(0, 0, w, h)
          const d = id.data
          // determine background as dark pixels; threshold
          for (let i = 0; i < d.length; i += 4) {
            const r = d[i]
            const g = d[i + 1]
            const b = d[i + 2]
            const a = d[i + 3]
            // treat very transparent pixels as background
            if (a < 16) {
              d[i] = 255
              d[i + 1] = 255
              d[i + 2] = 255
              d[i + 3] = 255
              continue
            }
            const brightness = (r + g + b) / 3
            // if pixel is dark (likely background), make it white
            if (brightness < 64) {
              d[i] = 255
              d[i + 1] = 255
              d[i + 2] = 255
              d[i + 3] = 255
            } else {
              // make icon pixel black and opaque
              d[i] = 0
              d[i + 1] = 0
              d[i + 2] = 0
              d[i + 3] = 255
            }
          }
          ctx.putImageData(id, 0, 0)
          resolve(canvas.toDataURL('image/png'))
        } catch (err) {
          reject(err)
        }
      }
      img.onerror = reject
      img.src = src
    })
  }

  return (
    <section id="solutions" className="solutions">
      <div className="solutions-inner">
        <div className="solutions-left" ref={leftRef}>
          <h3 className="solutions-kicker">Solutions</h3>
          <h2 className="solutions-title">Trusted features driving UniHub</h2>
          <p className="solutions-desc">Explore core platform capabilities — scroll the list to the right to preview each feature.</p>

          {/* visual indicator removed — custom scroll track replaces it */}

          {/* custom scroll track beside the paragraph */}
          <div className="custom-scroll-track" ref={trackRef} aria-hidden>
            <div className="custom-scroll-thumb" ref={thumbRef} />
          </div>

          <div className="solutions-detail" key={detailState}>
            <h4 className="detail-title">{FEATURES[active].title}</h4>
            <p className="detail-sub">{FEATURES[active].subtitle}</p>
            <p className="detail-desc">{FEATURES[active].description}</p>
          </div>
        </div>

        <div className="solutions-right">
          <div className="solutions-visual">
              <div className="visual-scroll" ref={visualScrollRef}>
              {FEATURES.map((f, i) => (
                <div
                  key={f.id}
                  className={`visual-section ${i === active ? 'active' : ''}`}
                  data-index={i}
                  ref={(el) => (visualRefs.current[i] = el)}
                >
                  <img src={f.image} alt={f.title} decoding="async" />
                </div>
              ))}
              </div>

              {/* (custom scroll track moved to left column) */}
          </div>
        </div>
      </div>
    </section>
  )
}
