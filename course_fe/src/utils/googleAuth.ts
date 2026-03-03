/**
 * Google Authentication Utilities
 * Handles Google OAuth flow and user data fetching
 */

import { GOOGLE_OAUTH_CONFIG } from '../config/googleOAuth'

export interface GoogleUser {
  id: string
  email: string
  verified_email: boolean
  name: string
  given_name: string
  family_name: string
  picture: string
  locale: string
}

/**
 * Exchange authorization code for access token
 * NOTE: In production, this should be done on the backend!
 * This is a simplified version for demonstration.
 */
export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string
  expires_in: number
  token_type: string
  scope: string
  id_token: string
}> {
  // In a real app, send the code to your backend
  // Backend calls: POST https://oauth2.googleapis.com/token
  // with client_id, client_secret, code, redirect_uri, grant_type
  
  throw new Error('This should be implemented on the backend for security')
}

/**
 * Get user info from Google using access token
 */
export async function getGoogleUserInfo(accessToken: string): Promise<GoogleUser> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
  
  if (!response.ok) {
    throw new Error('Failed to fetch Google user info')
  }
  
  return response.json()
}

/**
 * Verify ID token (should be done on backend)
 */
export async function verifyGoogleIdToken(idToken: string): Promise<any> {
  // In production, send to your backend to verify with Google
  // Backend uses: https://oauth2.googleapis.com/tokeninfo?id_token={id_token}
  
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`)
  
  if (!response.ok) {
    throw new Error('Failed to verify Google ID token')
  }
  
  return response.json()
}

/**
 * Initialize Google Sign-In with Google Identity Services (New method)
 * This uses the new Google Identity Services library instead of deprecated gapi
 */
export function initializeGoogleSignIn(onSuccess: (credential: any) => void, onError?: (error: any) => void) {
  // Check if google script is loaded
  if (!(window as any).google) {
    console.error('Google Identity Services script not loaded')
    return
  }

  const google = (window as any).google

  // Initialize Google Sign-In
  google.accounts.id.initialize({
    client_id: GOOGLE_OAUTH_CONFIG.clientId,
    callback: (response: any) => {
      if (response.credential) {
        onSuccess(response)
      } else if (onError) {
        onError(new Error('No credential received'))
      }
    },
    auto_select: false,
    cancel_on_tap_outside: true,
  })
}

/**
 * Render Google Sign-In button using Google's official button
 */
export function renderGoogleButton(
  elementId: string,
  options?: {
    type?: 'standard' | 'icon'
    theme?: 'outline' | 'filled_blue' | 'filled_black'
    size?: 'large' | 'medium' | 'small'
    text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
    shape?: 'rectangular' | 'pill' | 'circle' | 'square'
    logo_alignment?: 'left' | 'center'
    width?: number
  }
) {
  if (!(window as any).google) {
    console.error('Google Identity Services script not loaded')
    return
  }

  const google = (window as any).google

  google.accounts.id.renderButton(
    document.getElementById(elementId),
    {
      type: options?.type || 'standard',
      theme: options?.theme || 'outline',
      size: options?.size || 'large',
      text: options?.text || 'continue_with',
      shape: options?.shape || 'rectangular',
      logo_alignment: options?.logo_alignment || 'left',
      width: options?.width || 300,
    }
  )
}

/**
 * Prompt Google One Tap sign-in
 */
export function promptGoogleOneTap(
  onSuccess: (credential: any) => void,
  onError?: (error: any) => void
) {
  if (!(window as any).google) {
    console.error('Google Identity Services script not loaded')
    return
  }

  const google = (window as any).google

  // Initialize first
  initializeGoogleSignIn(onSuccess, onError)

  // Then prompt
  google.accounts.id.prompt((notification: any) => {
    if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
      // One Tap was not displayed or was skipped
      console.log('One Tap not shown:', notification.getNotDisplayedReason())
    }
  })
}

/**
 * Decode JWT token from Google
 */
export function decodeGoogleJWT(token: string): any {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    
    return JSON.parse(jsonPayload)
  } catch (error) {
    console.error('Failed to decode JWT:', error)
    return null
  }
}

/**
 * Load Google Identity Services script
 */
export function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if ((window as any).google) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    
    script.onload = () => {
      resolve()
    }
    
    script.onerror = () => {
      reject(new Error('Failed to load Google Identity Services script'))
    }
    
    document.head.appendChild(script)
  })
}
