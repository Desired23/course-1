import { useEffect, useState, useCallback, useRef } from 'react'
import { decodeGoogleJWT, initializeGoogleSignIn, registerGoogleCredentialHandler } from '../utils/googleAuth'
import { validateGoogleOAuthConfig } from '../config/googleOAuth'

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
  const handlerState = useRef(`google-login-${Math.random().toString(36).slice(2)}`).current
  const onSuccessRef = useRef(onSuccess)
  const onErrorRef = useRef(onError)

  useEffect(() => {
    onSuccessRef.current = onSuccess
    onErrorRef.current = onError
  }, [onSuccess, onError])

  useEffect(() => registerGoogleCredentialHandler(
    handlerState,
    (response) => {
      const userData = decodeGoogleJWT(response.credential)
      if (userData) {
        onSuccessRef.current({
          credential: response.credential,
          ...userData,
        })
        return
      }

      const err = new Error('Failed to decode Google credential')
      setError(err.message)
      onErrorRef.current?.(err)
    },
    (err) => {
      setError(err.message)
      onErrorRef.current?.(err)
    }
  ), [handlerState])

  const ensureInitialized = useCallback(async (): Promise<boolean> => {
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
      await initializeGoogleSignIn()
      setIsReady(true)
      return true
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to initialize Google Sign-In')
      setError(err.message)
      onErrorRef.current?.(err)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!autoLoad || disabled) {
      return
    }
    void ensureInitialized()
  }, [autoLoad, disabled, ensureInitialized])

  return {
    isLoading,
    isReady,
    error,
    handlerState,
    disabled: disabled || isLoading,
  }
}
