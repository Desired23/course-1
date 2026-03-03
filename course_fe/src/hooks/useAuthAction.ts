import { useAuth } from '../contexts/AuthContext'
import { useModal } from '../stores/modal.store'

/**
 * Hook to wrap actions that require authentication.
 * If user is authenticated, executes the action immediately.
 * If not, opens the login modal and executes the action after successful login.
 */
export function useAuthAction() {
  const { isAuthenticated } = useAuth()
  const { open } = useModal('login')

  const execute = (action: () => void) => {
    if (isAuthenticated) {
      action()
    } else {
      // Pass the action as onSuccess callback to the modal
      open({ onSuccess: action })
    }
  }

  return { execute }
}