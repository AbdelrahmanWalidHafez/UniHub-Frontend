import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';

// Set workerSrc to CDN for Vite compatibility
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function FilePreviewCard({ title, fileUrl }) {
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cachedDataUrl, setCachedDataUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    // LRU cache helpers
    const CACHE_LIMIT = 30;
    const CACHE_INDEX_KEY = 'pdf-preview-index';
    function getCacheIndex() {
      try {
        return JSON.parse(localStorage.getItem(CACHE_INDEX_KEY) || '[]');
      } catch {
        return [];
      }
    }
    function setCacheIndex(index) {
      localStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(index));
    }
    async function generateThumbnail(url, canvas) {
      try {
        setLoading(true);
        setError(null);
        if (!canvas) return;
        // Check localStorage for cached preview
        const cacheKey = 'pdf-preview-' + encodeURIComponent(url);
        let index = getCacheIndex();
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          // Move to most recently used
          index = index.filter(k => k !== cacheKey);
          index.unshift(cacheKey);
          setCacheIndex(index.slice(0, CACHE_LIMIT));
          const img = new window.Image();
          img.onload = function () {
            if (!cancelled) {
              canvas.width = img.width;
              canvas.height = img.height;
              canvas.getContext('2d').drawImage(img, 0, 0);
              setCachedDataUrl(cached);
              setLoading(false);
            }
          };
          img.src = cached;
          return;
        }
        // Not cached, generate preview
        const pdf = await pdfjsLib.getDocument(url).promise;
        const page = await pdf.getPage(1);
        const scale = 0.25;
        const viewport = page.getViewport({ scale });
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport }).promise;
        // Save to localStorage with LRU eviction
        const dataUrl = canvas.toDataURL('image/png');
        try {
          // Evict if over limit
          index = getCacheIndex();
          if (index.length >= CACHE_LIMIT) {
            const toRemove = index.pop();
            if (toRemove) localStorage.removeItem(toRemove);
          }
          localStorage.setItem(cacheKey, dataUrl);
          index = index.filter(k => k !== cacheKey);
          index.unshift(cacheKey);
          setCacheIndex(index.slice(0, CACHE_LIMIT));
        } catch (e) {
          // Ignore quota errors
        }
        if (!cancelled) {
          setCachedDataUrl(dataUrl);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError('No preview');
          setLoading(false);
        }
      }
    }
    const canvas = canvasRef.current;
    if (fileUrl && canvas) {
      generateThumbnail(fileUrl, canvas);
    }
    return () => { cancelled = true; };
  }, [fileUrl]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        borderLeft: '1px solid #e0e0e0',
        borderTop: '1px solid #e0e0e0',
        borderBottom: '1px solid #e0e0e0',
        borderRight: 'none',
        borderRadius: 14,
        background: '#fff',
        boxShadow: '0 2px 12px #0001',
        padding: 18,
        maxWidth: 400,
        minHeight: 90,
        gap: 18,
        overflow: 'hidden',
      }}
    >
      {/* Left: Title and label */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start' }}>
        <button
          onClick={() => {
            window.location.href = fileUrl;
          }}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            margin: 0,
            color: '#1976d2',
            fontWeight: 700,
            fontSize: 16,
            textDecoration: 'underline',
            marginBottom: 6,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: 200,
            display: 'block',
            cursor: 'pointer',
          }}
          title={title}
        >
          {title}
        </button>
        <div style={{ color: '#2563eb', fontWeight: 600, fontSize: 13, letterSpacing: 1 }}>PDF</div>
      </div>
      {/* Right: PDF thumbnail using canvas */}
      <div style={{
        width: 160,
        height: 120,
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'flex-end',
        flexShrink: 0,
        marginRight: 0,
        position: 'relative',
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
        borderRight: '1px solid #e0e0e0',
        borderTop: '1px solid #e0e0e0',
        borderBottom: '1px solid #e0e0e0',
        borderLeft: 'none',
        background: 'none',
        overflow: 'hidden',
      }}>
        {loading && (
          <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: 13, background: '#f3f4f6', zIndex: 1 }}>Loading…</div>
        )}
        {error && !loading && (
          <div style={{ color: '#888', fontSize: 13, textAlign: 'center', width: '100%' }}>{error}</div>
        )}
        <canvas
          ref={canvasRef}
          style={{
            display: loading || error ? 'none' : 'block',
            width: '100%',
            height: '100%',
            borderRadius: 0,
            background: 'none',
            objectFit: 'cover',
          }}
        />
      </div>
    </div>
  );
}
