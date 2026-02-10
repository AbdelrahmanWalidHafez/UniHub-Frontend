import React, { useEffect, useState } from 'react'
import NavBar from './components/NavBar'
import About from './components/About'
import Solutions from './components/Solutions'
import Pricing from './components/Pricing'
import Contact from './components/Contact'
import SuccessPartners from './components/SuccessPartners'
import Login from './components/Login'
import { isAuthenticated, getUser, logout } from './utils/auth'

export default function App() {
  const [showLogin, setShowLogin] = useState(false)
  const [user, setUser] = useState(getUser())
  const [authenticated, setAuthenticated] = useState(isAuthenticated())
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll('main > section'))
    if (!sections.length) return

    sections.forEach((s) => s.classList.add('reveal-on-scroll'))

    const obs = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.14 }
    )

    sections.forEach((s) => obs.observe(s))
    const navLinks = Array.from(document.querySelectorAll('.nav-links a'))
    const navbarEl = document.querySelector('.navbar')
    const navClickHandlers = []
    navLinks.forEach((a) => {
      const handler = (e) => {
        const href = a.getAttribute('href')
        if (!href || !href.startsWith('#')) return
        const id = href.slice(1)
        const target = document.getElementById(id)
        if (!target) return
        e.preventDefault()
        const navHeight = navbarEl ? navbarEl.getBoundingClientRect().height : 0
        const rect = target.getBoundingClientRect()
        const scrollTop = window.scrollY + rect.top - navHeight - 12
        window.scrollTo({ top: Math.max(0, Math.floor(scrollTop)), behavior: 'smooth' })
        target.setAttribute('tabindex', '-1')
        target.focus({ preventScroll: true })
      }
      a.addEventListener('click', handler)
      navClickHandlers.push({ el: a, handler })
    })
    const spySections = Array.from(document.querySelectorAll('main > section[id]'))
    if (spySections.length) {
      const spy = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const id = entry.target.id
              navLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#${id}`))
            }
          })
        },
        { threshold: 0.56 }
      )
      spySections.forEach((s) => spy.observe(s))

      return () => {
        obs.disconnect()
        spy.disconnect()
        navClickHandlers.forEach(({ el, handler }) => el.removeEventListener('click', handler))
      }
    }

    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const bar = document.querySelector('.scroll-progress__bar')
    if (!bar) return
    let rafId = 0
    function update() {
      const doc = document.documentElement
      const scrollTop = window.scrollY || doc.scrollTop
      const scrollHeight = doc.scrollHeight - window.innerHeight
      const pct = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0
      bar.style.width = pct + '%'
      rafId = 0
    }
    function schedule() {
      if (rafId) return
      rafId = requestAnimationFrame(update)
    }
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    schedule()
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width:800px)').matches) return

    const els = Array.from(document.querySelectorAll('.parallax'))
    if (!els.length) return
    let rafId = 0

    function onFrame() {
      els.forEach((el) => {
        const speedAttr = el.getAttribute('data-speed') || '0.04'
        const speed = Math.max(0, Math.min(0.5, parseFloat(speedAttr)))
        const rect = el.getBoundingClientRect()
        const offset = -rect.top * speed
        el.style.transform = `translateY(${offset.toFixed(2)}px)`
      })
      rafId = 0
    }

    function schedule() {
      if (rafId) return
      rafId = requestAnimationFrame(onFrame)
    }

    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    schedule()
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (rafId) cancelAnimationFrame(rafId)
      els.forEach((el) => (el.style.transform = ''))
    }
  }, [])

  async function handleUserIconClick() {
    if (authenticated) {
      try {
        await logout()
        setUser(null)
        setAuthenticated(false)
      } catch (err) {
        console.error('Logout failed:', err)
      }
    } else {
      setShowLogin(true)
    }
  }

  return (
    <div>
      {showLogin ? (
        <Login onLoginSuccess={(userData) => {
          setUser(userData)
          setAuthenticated(true)
          setShowLogin(false)
        }} />
      ) : (
        <>
          <NavBar 
            appName="unihub" 
            logoSrc="/logo.png" 
            onUserIconClick={handleUserIconClick} 
            onLogoClick={() => window.scrollTo(0, 0)}
            isAuthenticated={authenticated}
          />
          <main>
            <About />
            <Solutions />
            <Pricing />
            <SuccessPartners />
            <Contact />
          </main>
        </>
      )}
    </div>
  )
}
