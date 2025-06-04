'use client'

import { useState, useCallback } from 'react'

interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'primary'
}

interface AlertOptions {
  title: string
  message: string
  variant?: 'success' | 'error' | 'warning' | 'info'
  buttonText?: string
}

export function useModal() {
  const [modalState, setModalState] = useState<{
    type: 'confirm' | 'alert' | null
    isOpen: boolean
    options: any
    onConfirm?: () => void
    loading?: boolean
  }>({
    type: null,
    isOpen: false,
    options: {},
    loading: false
  })

  const confirm = useCallback(async (options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setModalState({
        type: 'confirm',
        isOpen: true,
        options,
        onConfirm: () => {
          resolve(true)
          setModalState(prev => ({ ...prev, isOpen: false }))
        },
        loading: false
      })
    })
  }, [])

  const confirmAsync = useCallback(async (
    options: ConfirmOptions, 
    asyncAction: () => Promise<void>
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      setModalState({
        type: 'confirm',
        isOpen: true,
        options,
        onConfirm: async () => {
          setModalState(prev => ({ ...prev, loading: true }))
          try {
            await asyncAction()
            resolve(true)
          } catch (error) {
            resolve(false)
          } finally {
            setModalState(prev => ({ ...prev, isOpen: false, loading: false }))
          }
        },
        loading: false
      })
    })
  }, [])

  const alert = useCallback((options: AlertOptions): Promise<void> => {
    return new Promise((resolve) => {
      setModalState({
        type: 'alert',
        isOpen: true,
        options,
        onConfirm: () => {
          resolve()
          setModalState(prev => ({ ...prev, isOpen: false }))
        }
      })
    })
  }, [])

  const closeModal = useCallback(() => {
    setModalState(prev => ({ ...prev, isOpen: false }))
  }, [])

  return {
    modalState,
    confirm,
    confirmAsync,
    alert,
    closeModal
  }
}