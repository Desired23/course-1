import { useEffect, useState, useCallback } from 'react'
import { loadGoogleScript, initializeGoogleSignIn, decodeGoogleJWT } from '../utils/googleAuth'
import { validateGoogleOAuthConfig } from '../config/googleOAuth'

interface UseGoogleLoginOptions {
  onSuccess: (user: any) => void
  onError?: (error: Error) => void
  autoLoad?: boolean
  disabled?: boolean
}

function isBenignGoogleAbort(err: unknown): boolean {
  const message = String((err as any)?.message || err || '').toLowerCase()
  return (
    message.includes('aborterror') ||
    message.includes('signal is aborted') ||
    message.includes('fedcm')
  )
}

export function useGoogleLogin({ onSuccess, onError, autoLoad = false, disabled = false }: UseGoogleLoginOptions) {
  const [isLoading, setIsLoading] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ensureInitialized = useCallback(async (): Promise<boolean> => {
    if (isReady) return true


    const validation = validateGoogleOAuthConfig()
    if (!validation.valid) {
      const errorMsg = validation.errors.join(', ')
      setError(errorMsg)
      console.error('Google OAuth configuration error:', errorMsg)
      return false
    }

    setIsLoading(true)
    setError(null)
    try {
      await loadGoogleScript()
      initializeGoogleSignIn(
        (response) => {
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
          if (isBenignGoogleAbort(err)) {
            return
          }
          setError(err.message)
          onError?.(err)
        }
      )
      setIsReady(true)
      return true
    } catch (err: any) {
      setError(err.message)
      onError?.(err)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [isReady, onSuccess, onError])

  useEffect(() => {
    if (!autoLoad || disabled) {
      return
    }
    void ensureInitialized()
  }, [autoLoad, disabled, ensureInitialized])

  const signIn = useCallback(async () => {
    if (disabled || isLoading) return

    const ready = isReady || await ensureInitialized()
    if (!ready) return


    if ((window as any).google) {
      ;(window as any).google.accounts.id.prompt((notification: any) => {
        if (!notification) return
        if (
          notification.isNotDisplayed?.() ||
          notification.isSkippedMoment?.() ||
          notification.isDismissedMoment?.()
        ) {

          setError(null)
        }
      })
    }
  }, [isReady, disabled, isLoading, ensureInitialized])

  return {
    signIn,
    isLoading,
    isReady,
    error,
    disabled: disabled || isLoading,
  }
}
