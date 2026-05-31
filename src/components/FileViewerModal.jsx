import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { getFileAsBlob } from '../utils/api'

export default function FileViewerModal({ fileKey, onClose, title }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fileUrl, setFileUrl] = useState(null)
  const [fileType, setFileType] = useState('')
  const [isPdf, setIsPdf] = useState(false)

  useEffect(() => {
    fetchFile()
    
    return () => {
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl)
      }
    }
  }, [fileKey])

  const fetchFile = async () => {
    setLoading(true)
    setError('')
    try {
      const blob = await getFileAsBlob(`s3/api/v1/get-file/${fileKey}`)
      
      // Determine file type
      const type = blob.type || ''
      setFileType(type)
      
      // Check if it's a PDF
      const extension = fileKey?.split('.').pop()?.toLowerCase()
      const isPdfFile = type === 'application/pdf' || extension === 'pdf'
      setIsPdf(isPdfFile)
      
      const url = URL.createObjectURL(blob)
      setFileUrl(url)
      
    } catch (err) {
      console.error('Failed to load file:', err)
      setError('Failed to load file. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const isImage = () => {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp']
    const imageMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp', 'image/bmp']
    
    const extension = fileKey?.split('.').pop()?.toLowerCase()
    if (extension && imageExtensions.includes(extension)) {
      return true
    }
    
    if (fileType && imageMimeTypes.includes(fileType)) {
      return true
    }
    
    return false
  }

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          maxWidth: '90vw',
          maxHeight: '90vh',
          width: '100%',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#F9FAFB'
        }}>
          <h3 style={{ 
            margin: 0, 
            fontSize: '16px', 
            fontWeight: '600',
            color: '#111827'
          }}>
            {title || 'File Viewer'}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#6B7280',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#F3F4F6'
              e.target.style.color = '#111827'
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent'
              e.target.style.color = '#6B7280'
            }}
          >
            ×
          </button>
        </div>

        {}
        <div style={{ 
          padding: '24px', 
          flex: 1,
          overflow: 'auto',
          backgroundColor: '#fff',
          minHeight: '400px',
          maxHeight: 'calc(90vh - 80px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {loading && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                display: 'inline-block',
                width: '48px',
                height: '48px',
                border: '3px solid #E5E7EB',
                borderTop: '3px solid #2563EB',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginBottom: '16px'
              }} />
              <p style={{ color: '#6B7280', margin: 0 }}>Loading file...</p>
            </div>
          )}

          {error && !loading && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '48px',
                marginBottom: '16px',
                color: '#DC2626'
              }}>
                ⚠️
              </div>
              <p style={{ 
                color: '#DC2626', 
                margin: '0 0 16px 0', 
                fontWeight: '500' 
              }}>
                {error}
              </p>
              <button
                onClick={fetchFile}
                style={{
                  padding: '8px 20px',
                  backgroundColor: '#3a4a52',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#3a4a52'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#3a4a52'}
              >
                Try Again
              </button>
            </div>
          )}

          {!loading && !error && fileUrl && isImage() && (
            <div style={{ textAlign: 'center', width: '100%' }}>
              <img
                src={fileUrl}
                alt={title || 'File preview'}
                style={{
                  maxWidth: '100%',
                  maxHeight: '70vh',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                }}
              />
            </div>
          )}

          {!loading && !error && fileUrl && isPdf && (
            <div style={{ 
              width: '100%', 
              height: '70vh',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <iframe
                src={`${fileUrl}#toolbar=1&navpanes=1`}
                title="PDF Viewer"
                width="100%"
                height="100%"
                style={{
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: '#F9FAFB'
                }}
              />
              <div style={{
                marginTop: '16px',
                textAlign: 'center'
              }}>
                <a
                  href={fileUrl}
                  download={`document-${fileKey}`}
                  style={{
                    padding: '8px 20px',
                    backgroundColor: '#F3F4F6',
                    color: '#1F2937',
                    textDecoration: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    border: '1px solid #E5E7EB',
                    display: 'inline-block',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#E5E7EB'
                    e.target.style.borderColor = '#2563EB'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#F3F4F6'
                    e.target.style.borderColor = '#E5E7EB'
                  }}
                >
                  Download PDF
                </a>
              </div>
            </div>
          )}

          {!loading && !error && fileUrl && !isImage() && !isPdf && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{
                fontSize: '48px',
                marginBottom: '16px',
                color: '#6B7280'
              }}>
                📄
              </div>
              <p style={{ 
                color: '#6B7280', 
                marginBottom: '24px',
                fontSize: '14px'
              }}>
                This file type cannot be previewed.
              </p>
              <a
                href={fileUrl}
                download={`file-${fileKey}`}
                style={{
                  padding: '10px 24px',
                  backgroundColor: '#3a4a52',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  display: 'inline-block',
                  fontWeight: '500',
                  fontSize: '14px',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#1D4ED8'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#2563EB'}
              >
                Download File
              </a>
            </div>
          )}
        </div>

        {}
        {!loading && !error && fileUrl && (
          <div style={{
            padding: '12px 24px',
            borderTop: '1px solid #E5E7EB',
            backgroundColor: '#F9FAFB',
            fontSize: '12px',
            color: '#6B7280',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontFamily: 'monospace' }}>
              {fileKey?.split('/').pop() || fileKey}
            </span>
            {(isImage() || isPdf) && (
              <a
                href={fileUrl}
                download={`${isPdf ? 'document' : 'image'}-${fileKey}`}
                style={{
                  color: '#3a4a52',
                  textDecoration: 'none',
                  fontSize: '13px',
                  padding: '4px 12px',
                  borderRadius: '4px',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#EFF6FF'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                Download
              </a>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>,
    document.body
  )
}