import React, { useEffect, useRef } from 'react'

export default function SuccessPartners(){
  const partners = [
    { id: 'google', src: '/googleCloud.png', alt: 'Google Cloud' },
    { id: 'stripe', src: '/stripe.png', alt: 'Stripe' },
    { id: 'jitsi', src: '/jitsi.png', alt: 'Jitsi Meet' },
    { id: 'aws', src: '/AWS.png', alt: 'AWS' },
  ]

  
  const repeatCount = 6
  const looped = Array.from({ length: repeatCount }).flatMap((_) => partners).concat(partners)

  const trackRef = useRef(null)
  const viewportRef = useRef(null)

  
  useEffect(() => {
    const track = trackRef.current
    const viewport = viewportRef.current
    if (!track || !viewport) return

    function update() {
      const trackWidth = track.scrollWidth || 0
      const shift = Math.floor(trackWidth / 2)
      
      const speed = 120
      const duration = Math.max(6, shift / speed)
      track.style.setProperty('--marquee-shift', `${shift}px`)
      track.style.setProperty('--marquee-duration', `${duration}s`)
    }

    update()
    const ro = new ResizeObserver(update)
    ro.observe(track)
    ro.observe(viewport)
    window.addEventListener('resize', update)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [])

  return (
    <section id="success-partners" className="partners">
      <div className="partners-inner">
        <h3 className="partners-title">Success partners</h3>
        <p className="partners-sub">Trusted by institutions and partners worldwide</p>

        <div className="partners-viewport full-bleed" aria-hidden ref={viewportRef}>
          <div className="partners-track" ref={trackRef}>
            {looped.map((p, i) => (
              <div className="partner-item" key={p.id + '-' + i}>
                <img src={p.src} alt={p.alt} className="partner-logo" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
