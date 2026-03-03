import { useEffect, useState, useCallback } from 'react'
import { loadGoogleScript, initializeGoogleSignIn, decodeGoogleJWT } from '../utils/googleAuth'
import { GOOGLE_OAUTH_CONFIG, validateGoogleOAuthConfig } from '../config/googleOAuth'

interface UseGoogleLoginOptions {
  onSuccess: (user: any) => void
  onError?: (error: Error) => void
  autoLoad?: boolean
  disabled?: boolean
}

export function useGoogleLogin({ onSuccess, onError, autoLoad = false, disabled = false }: UseGoogleLoginOptions) {
  const [isLoading, setIsLoading] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Validate configuration
    const validation = validateGoogleOAuthConfig()
    if (!validation.valid) {
      const errorMsg = validation.errors.join(', ')
      setError(errorMsg)
      console.error('Google OAuth configuration error:', errorMsg)
      return
    }

    // Load Google script
    setIsLoading(true)
    loadGoogleScript()
      .then(() => {
        // Initialize Google Sign-In
        initializeGoogleSignIn(
          (response) => {
            // Decode the credential (JWT token)
            const userData = decodeGoogleJWT(response.credential)
            
            if (userData) {
              onSuccess({
                credential: response.credential,
                ...userData,
              })
            } else {
              const err = new Error('Failed to decode Google credential')
              setError(err.message)
              onError?.(err)
            }
          },
          (err) => {
            setError(err.message)
            onError?.(err)
          }
        )
        
        setIsReady(true)
        setIsLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setIsLoading(false)
        onError?.(err)
      })
  }, [onSuccess, onError])

  const signIn = useCallback(() => {
    if (!isReady || disabled) {
      return
    }

    // Trigger Google One Tap
    if ((window as any).google) {
      (window as any).google.accounts.id.prompt()
    }
  }, [isReady, disabled])

  return {
    signIn,
    isLoading,
    isReady,
    error,
    disabled: disabled || !isReady,
  }
}
