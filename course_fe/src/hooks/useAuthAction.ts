import { useAuth } from '../contexts/AuthContext'
import { useModal } from '../stores/modal.store'






export function useAuthAction() {
  const { isAuthenticated } = useAuth()
  const { open } = useModal('login')

  const execute = (action: () => void) => {
    if (isAuthenticated) {
      action()
    } else {

      open({ onSuccess: action })
    }
  }

  return { execute }
}