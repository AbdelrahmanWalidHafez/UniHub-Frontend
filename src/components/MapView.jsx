import React, { useEffect, useRef } from 'react'

export default function MapView({ lat = 31.23052, lng = 29.952007500000004, zoom = 13 }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return

    function loadCss() {
      const href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      if (!document.querySelector(`link[href="${href}"]`)) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = href
        document.head.appendChild(link)
      }
    }

    function init() {
      const L = window.L
      if (!L || !containerRef.current) return
      if (mapRef.current) return
      try {
        mapRef.current = L.map(containerRef.current, { scrollWheelZoom: false }).setView([lat, lng], zoom)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(mapRef.current)
        L.marker([lat, lng]).addTo(mapRef.current)
      } catch (e) {
        // fail silently
        // eslint-disable-next-line no-console
        console.error('Leaflet init error', e)
      }
    }

    if (window.L) {
      loadCss()
      init()
    } else {
      loadCss()
      const s = document.createElement('script')
      s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      s.async = true
      s.onload = init
      document.body.appendChild(s)
    }

    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove()
        } catch (e) {}
        mapRef.current = null
      }
    }
  }, [lat, lng, zoom])

  return <div className="map-container" ref={containerRef} aria-hidden={false} />
}
