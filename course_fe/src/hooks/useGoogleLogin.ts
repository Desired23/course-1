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
        // Surface the real reason instead of silently swallowing it — the most
        // common cause is the current origin not being registered as an
        // "Authorized JavaScript origin" for the OAuth client in Google Cloud.
        if (notification.isNotDisplayed?.()) {
          const reason = notification.getNotDisplayedReason?.() || 'unknown'
          const err = new Error(`Google Sign-In not displayed (${reason}).`)
          console.error('Google One Tap not displayed:', reason)
          setError(err.message)
          onError?.(err)
        } else if (notification.isSkippedMoment?.()) {
          const reason = notification.getSkippedReason?.() || 'unknown'
          console.warn('Google One Tap skipped:', reason)
        } else if (notification.isDismissedMoment?.()) {
          // User dismissed the prompt — not an error.
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
