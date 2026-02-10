import React, { useEffect, useRef } from 'react'

export default function About() {
  const wrapperRef = useRef(null)

  useEffect(() => {
    // Removed intersection-based intro animation; keep content static
    return () => {}
  }, [])

  return (
    <section id="about" className="hero">
      <div className="hero-inner">
        <div className="hero-box-wrapper parallax" data-speed="0.06" ref={wrapperRef}>
          <div className="hero-box">
            <div className="hero-left simple-hero">
              <h1 className="hero-title">Your Educational Institute in one place and <span className="nowrap">powered by AI</span></h1>
              <p className="hero-sub">unihub unifies students, instructors, and administration in a single, secure system — powered by AI to personalize experiences and automate workflows.</p>

              <p className="hero-text">
                UniHub is a multi-tenant university platform designed to serve multiple institutions within a single, scalable system. It connects students, instructors, and administration through a unified, secure digital environment. Powered by AI, UniHub delivers personalized experiences, smart insights, and intelligent automation to simplify academic and administrative processes. Its architecture ensures data isolation, scalability, and flexibility, making it adaptable to universities of different sizes and needs. UniHub aims to modernize university operations by providing a centralized, efficient, and intelligent platform.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
