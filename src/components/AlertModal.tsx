'use client'

import Modal from './Modal'

interface AlertModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
  variant?: 'success' | 'error' | 'warning' | 'info'
  buttonText?: string
}

export default function AlertModal({
  isOpen,
  onClose,
  title,
  message,
  variant = 'info',
  buttonText = 'OK'
}: AlertModalProps) {
  const variantStyles = {
    success: { 
      backgroundColor: '#d4edda', 
      borderColor: '#c3e6cb', 
      color: '#155724',
      icon: '✅'
    },
    error: { 
      backgroundColor: '#f8d7da', 
      borderColor: '#f5c6cb', 
      color: '#721c24',
      icon: '❌'
    },
    warning: { 
      backgroundColor: '#fff3cd', 
      borderColor: '#ffeaa7', 
      color: '#856404',
      icon: '⚠️'
    },
    info: { 
      backgroundColor: '#e1f5fe', 
      borderColor: '#b3e5fc', 
      color: '#0277bd',
      icon: 'ℹ️'
    }
  }

  const style = variantStyles[variant]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div>
        <div 
          style={{
            padding: '1rem',
            marginBottom: '1.5rem',
            borderRadius: '0.375rem',
            border: `1px solid ${style.borderColor}`,
            backgroundColor: style.backgroundColor,
            color: style.color,
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem'
          }}
        >
          <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>
            {style.icon}
          </span>
          <div style={{ flex: 1, lineHeight: 1.5 }}>
            {message}
          </div>
        </div>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end' 
        }}>
          <button
            type="button"
            onClick={onClose}
            className="btn"
          >
            {buttonText}
          </button>
        </div>
      </div>
    </Modal>
  )
}