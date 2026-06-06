import { useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRouter } from './Router'
import { useGoogleLogin } from '../hooks/useGoogleLogin'
import { renderGoogleButton } from '../utils/googleAuth'

interface GoogleLoginButtonProps {
  onSuccess?: () => void
  onError?: (error: Error) => void
  className?: string
  redirectTo?: string
}

export function GoogleLoginButton({
  onSuccess,
  onError,
  className = '',
  redirectTo = '/',
}: GoogleLoginButtonProps) {
  const { loginWithGoogle } = useAuth()
  const { navigate } = useRouter()
  const googleButtonRef = useRef<HTMLDivElement>(null)

  const handleGoogleSuccess = async (userData: any) => {
    try {

      const success = await loginWithGoogle(userData.credential)

      if (success) {
        onSuccess?.()

        navigate(redirectTo)
      } else {
        throw new Error('Google login failed')
      }
    } catch (error) {
      console.error('Google login error:', error)
      const err = error instanceof Error ? error : new Error('Google login failed')
      onError?.(err)
    }
  }

  const handleGoogleError = (error: Error) => {
    console.error('Google Sign-In error:', error)
    onError?.(error)
  }

  const { isLoading, isReady, error, handlerState } = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: handleGoogleError,
    autoLoad: true,
  })


  useEffect(() => {
    if (isReady && googleButtonRef.current) {
      renderGoogleButton(googleButtonRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        width: 350,
        state: handlerState,
      })
    }
  }, [handlerState, isReady])

  if (error) {
    return (
      <div className="text-sm text-red-600 text-center p-2 bg-red-50 rounded">
        {error}
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="relative flex justify-center">
        <div
          ref={googleButtonRef}
          className={isLoading ? 'opacity-50 pointer-events-none' : ''}
        />
        {isLoading && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <svg className="animate-spin h-5 w-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}
      </div>
    </div>
  )
}
