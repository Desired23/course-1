





import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
  dismissible?: boolean
}

interface ToastState {
  toasts: Toast[]


  addToast: (toast: Omit<Toast, 'id'>) => string
  removeToast: (id: string) => void
  clearAllToasts: () => void


  success: (title: string, message?: string) => string
  error: (title: string, message?: string) => string
  warning: (title: string, message?: string) => string
  info: (title: string, message?: string) => string
}

const DEFAULT_DURATION = 5000

export const useToastStore = create<ToastState>()(
  devtools(
    (set, get) => ({
      toasts: [],

      addToast: (toast) => {
        const id = `toast-${Date.now()}-${Math.random()}`
        const newToast: Toast = {
          id,
          type: toast.type,
          title: toast.title,
          message: toast.message,
          duration: toast.duration ?? DEFAULT_DURATION,
          action: toast.action,
          dismissible: toast.dismissible ?? true
        }

        set((state) => ({
          toasts: [...state.toasts, newToast]
        }))


        if (newToast.duration > 0) {
          setTimeout(() => {
            get().removeToast(id)
          }, newToast.duration)
        }

        return id
      },

      removeToast: (id) => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id)
        }))
      },

      clearAllToasts: () => {
        set({ toasts: [] })
      },


      success: (title, message) => {
        return get().addToast({ type: 'success', title, message })
      },

      error: (title, message) => {
        return get().addToast({
          type: 'error',
          title,
          message,
          duration: 7000
        })
      },

      warning: (title, message) => {
        return get().addToast({
          type: 'warning',
          title,
          message,
          duration: 6000
        })
      },

      info: (title, message) => {
        return get().addToast({ type: 'info', title, message })
      }
    }),
    { name: 'Toast Store' }
  )
)


export const selectToasts = (state: ToastState) => state.toasts
export const selectLatestToast = (state: ToastState) =>
  state.toasts[state.toasts.length - 1]


export const useToast = () => {
  const success = useToastStore((state) => state.success)
  const error = useToastStore((state) => state.error)
  const warning = useToastStore((state) => state.warning)
  const info = useToastStore((state) => state.info)

  return {
    success,
    error,
    warning,
    info
  }
}
