




import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export type ModalType =
  | 'login'
  | 'signup'
  | 'confirm'
  | 'video-preview'
  | 'add-to-cart'
  | 'course-preview'
  | 'payment'
  | 'review'
  | 'share'
  | 'report'
  | 'settings'
  | 'profile-edit'
  | 'upload'
  | 'create-course'
  | 'create-lesson'
  | 'create-quiz'

interface ModalState {

  modals: Set<ModalType>


  modalData: Record<string, any>


  openModal: (type: ModalType, data?: any) => void
  closeModal: (type: ModalType) => void
  closeAllModals: () => void
  isModalOpen: (type: ModalType) => boolean
  getModalData: (type: ModalType) => any


  confirmDialog: {
    isOpen: boolean
    title: string
    message: string
    onConfirm?: () => void
    onCancel?: () => void
    confirmText?: string
    cancelText?: string
    variant?: 'danger' | 'warning' | 'info'
  }
  showConfirm: (config: Omit<ModalState['confirmDialog'], 'isOpen'>) => Promise<boolean>
  hideConfirm: () => void
}

export const useModalStore = create<ModalState>()(
  devtools(
    (set, get) => ({
      modals: new Set(),
      modalData: {},

      openModal: (type, data) => {
        set((state) => {
          const newModals = new Set(state.modals)
          newModals.add(type)

          return {
            modals: newModals,
            modalData: {
              ...state.modalData,
              [type]: data
            }
          }
        })
      },

      closeModal: (type) => {
        set((state) => {
          const newModals = new Set(state.modals)
          newModals.delete(type)

          const newData = { ...state.modalData }
          delete newData[type]

          return {
            modals: newModals,
            modalData: newData
          }
        })
      },

      closeAllModals: () => {
        set({
          modals: new Set(),
          modalData: {}
        })
      },

      isModalOpen: (type) => {
        return get().modals.has(type)
      },

      getModalData: (type) => {
        return get().modalData[type]
      },


      confirmDialog: {
        isOpen: false,
        title: '',
        message: '',
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        variant: 'info'
      },

      showConfirm: (config) => {
        return new Promise<boolean>((resolve) => {
          set({
            confirmDialog: {
              isOpen: true,
              title: config.title,
              message: config.message,
              confirmText: config.confirmText || 'Confirm',
              cancelText: config.cancelText || 'Cancel',
              variant: config.variant || 'info',
              onConfirm: () => {
                config.onConfirm?.()
                get().hideConfirm()
                resolve(true)
              },
              onCancel: () => {
                config.onCancel?.()
                get().hideConfirm()
                resolve(false)
              }
            }
          })
        })
      },

      hideConfirm: () => {
        set({
          confirmDialog: {
            isOpen: false,
            title: '',
            message: '',
            confirmText: 'Confirm',
            cancelText: 'Cancel',
            variant: 'info'
          }
        })
      }
    }),
    { name: 'Modal Store' }
  )
)


export const selectIsModalOpen = (type: ModalType) => (state: ModalState) =>
  state.isModalOpen(type)

export const selectModalData = (type: ModalType) => (state: ModalState) =>
  state.getModalData(type)


export const useModal = (type: ModalType) => {
  const isOpen = useModalStore((state) => state.isModalOpen(type))
  const data = useModalStore((state) => state.getModalData(type))
  const open = useModalStore((state) => state.openModal)
  const close = useModalStore((state) => state.closeModal)

  return {
    isOpen,
    data,
    open: (data?: any) => open(type, data),
    close: () => close(type)
  }
}

export const useConfirm = () => {
  const showConfirm = useModalStore((state) => state.showConfirm)
  const hideConfirm = useModalStore((state) => state.hideConfirm)
  const confirmDialog = useModalStore((state) => state.confirmDialog)

  return {
    confirm: showConfirm,
    hideConfirm,
    confirmDialog
  }
}
