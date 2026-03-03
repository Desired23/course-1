import { useEffect, useState } from 'react'
import { useRouter } from '../../components/Router'
import { useAuth } from '../../contexts/AuthContext'
import { parseGoogleCallback } from '../../config/googleOAuth'

/**
 * Google OAuth Callback Page
 * Handles the redirect from Google after authentication
 */
export function GoogleCallbackPage() {
  const { navigate } = useRouter()
  const { loginWithGoogle } = useAuth()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Parse URL parameters
        const params = parseGoogleCallback(window.location.href)
        
        if (params.error) {
          // User denied access or other error
          setStatus('error')
          setErrorMessage(params.error)
          
          // Redirect back to login after 3 seconds
          setTimeout(() => {
            navigate('/login')
          }, 3000)
          
          return
        }
        
        if (params.code) {
          // We have an authorization code
          // In a real app, send this to your backend to exchange for tokens
          
          // For now, we'll simulate success
          // You'll need to implement the backend endpoint to handle this
          setStatus('error')
          setErrorMessage('Backend integration required. Please use the direct Google Sign-In button on the login page instead.')
          
          setTimeout(() => {
            navigate('/login')
          }, 5000)
          
          return
        }
        
        // No code or error - something went wrong
        setStatus('error')
        setErrorMessage('Invalid callback - no authorization code received')
        
        setTimeout(() => {
          navigate('/login')
        }, 3000)
        
      } catch (error) {
        console.error('Callback error:', error)
        setStatus('error')
        setErrorMessage('An error occurred processing the login')
        
        setTimeout(() => {
          navigate('/login')
        }, 3000)
      }
    }
    
    handleCallback()
  }, [navigate, loginWithGoogle])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white p-8 rounded-lg shadow-sm border text-center">
          {status === 'loading' && (
            <>
              <div className="flex justify-center mb-4">
                <svg className="animate-spin h-12 w-12 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2">Processing Google Login...</h2>
              <p className="text-gray-600">Please wait while we complete your authentication.</p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <h2 className="text-xl font-semibold mb-2 text-green-600">Login Successful!</h2>
              <p className="text-gray-600">Redirecting to homepage...</p>
            </>
          )}
          
          {status === 'error' && (
            <>
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
              <h2 className="text-xl font-semibold mb-2 text-red-600">Login Failed</h2>
              <p className="text-gray-600 mb-4">{errorMessage}</p>
              <p className="text-sm text-gray-500">Redirecting back to login page...</p>
            </>
          )}
        </div>
        
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/login')}
            className="text-sm text-primary hover:text-primary/80"
          >
            ← Back to Login
          </button>
        </div>
      </div>
    </div>
  )
}
