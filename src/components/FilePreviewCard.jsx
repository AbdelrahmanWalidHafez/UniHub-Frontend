import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.4.296/build/pdf.worker.min.mjs`;

const CACHE_LIMIT = 30;
const CACHE_INDEX_KEY = 'pdf-preview-index';

function getCacheIndex() {
  try { return JSON.parse(localStorage.getItem(CACHE_INDEX_KEY) || '[]') } catch { return [] }
}
function setCacheIndex(index) {
  try { localStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(index)) } catch {}
}
function getCached(key) {
  try { return localStorage.getItem(key) } catch { return null }
}
function saveCache(key, dataUrl) {
  try {
    let index = getCacheIndex();
    if (index.length >= CACHE_LIMIT) {
      const toRemove = index.pop();
      if (toRemove) localStorage.removeItem(toRemove);
    }
    localStorage.setItem(key, dataUrl);
    index = [key, ...index.filter(k => k !== key)];
    setCacheIndex(index.slice(0, CACHE_LIMIT));
  } catch {}
}

async function fetchPdfBuffer(url) {
  // Fetch via no-cors-credential mode to avoid S3 CORS rejection
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'omit',
    mode: 'cors',
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.arrayBuffer();
}

export default function FilePreviewCard({ title, fileUrl, cacheKey, square = false }) {
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const stableKey = 'pdf-preview-' + encodeURIComponent(cacheKey || fileUrl);

  useEffect(() => {
    if (!fileUrl) return;
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;

    setLoading(true);
    setError(false);

    async function render() {
      // Try cache first
      const cached = getCached(stableKey);
      if (cached) {
        let idx = getCacheIndex();
        idx = [stableKey, ...idx.filter(k => k !== stableKey)];
        setCacheIndex(idx.slice(0, CACHE_LIMIT));
        const img = new window.Image();
        img.onload = () => {
          if (cancelled) return;
          canvas.width = img.width;
          canvas.height = img.height;
          canvas.getContext('2d').drawImage(img, 0, 0);
          setLoading(false);
        };
        img.onerror = () => { if (!cancelled) { setError(true); setLoading(false); } };
        img.src = cached;
        return;
      }

      try {
        // Fetch the PDF as ArrayBuffer with credentials omitted so S3 CORS passes
        const buffer = await fetchPdfBuffer(fileUrl);
        if (cancelled) return;

        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        if (cancelled) return;
        const page = await pdf.getPage(1);
        if (cancelled) return;
        const scale = 0.5;
        const viewport = page.getViewport({ scale });
        const ctx = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport }).promise;
        if (!cancelled) {
          const dataUrl = canvas.toDataURL('image/png');
          saveCache(stableKey, dataUrl);
          setLoading(false);
        }
      } catch (err) {
        console.error('PDF render error:', err);
        if (!cancelled) { setError(true); setLoading(false); }
      }
    }

    render();
    return () => { cancelled = true; };
  }, [fileUrl, stableKey]);

  if (square) {
    return (
      <div style={{
        width: '100%',
        height: '160px',
        background: '#fce8e6',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <canvas
          ref={canvasRef}
          style={{ display: loading || error ? 'none' : 'block', position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        {(loading || error) && (
          <span style={{ fontSize: 11, fontWeight: 700, color: '#d93025', letterSpacing: 0.3 }}>{loading ? '…' : 'PDF'}</span>
        )}
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      border: '1px solid #e0e0e0',
      borderRadius: 10,
      background: '#fff',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      overflow: 'hidden',
      maxWidth: 320,
      height: 64,
      cursor: 'pointer',
    }}>
      <div style={{
        width: 48, height: 64, flexShrink: 0,
        background: '#fce8e6',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRight: '1px solid #e0e0e0',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <canvas
          ref={canvasRef}
          style={{ display: loading || error ? 'none' : 'block', position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        {(loading || error) && (
          <span style={{ fontSize: 10, fontWeight: 700, color: '#d93025', letterSpacing: 0.3 }}>PDF</span>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 12px', gap: 2 }}>
        <div style={{ color: '#202124', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={title}>
          {title}
        </div>
        <div style={{ color: '#d93025', fontWeight: 500, fontSize: 11 }}>PDF</div>
      </div>
    </div>
  );
}
