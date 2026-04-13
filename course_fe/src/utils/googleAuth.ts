




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






export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string
  expires_in: number
  token_type: string
  scope: string
  id_token: string
}> {




  throw new Error('This should be implemented on the backend for security')
}




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




export async function verifyGoogleIdToken(idToken: string): Promise<any> {



  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`)

  if (!response.ok) {
    throw new Error('Failed to verify Google ID token')
  }

  return response.json()
}





export function initializeGoogleSignIn(onSuccess: (credential: any) => void, onError?: (error: any) => void) {

  if (!(window as any).google) {
    console.error('Google Identity Services script not loaded')
    return
  }

  const google = (window as any).google


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




export function promptGoogleOneTap(
  onSuccess: (credential: any) => void,
  onError?: (error: any) => void
) {
  if (!(window as any).google) {
    console.error('Google Identity Services script not loaded')
    return
  }

  const google = (window as any).google


  initializeGoogleSignIn(onSuccess, onError)


  google.accounts.id.prompt((notification: any) => {
    if (notification.isNotDisplayed() || notification.isSkippedMoment()) {

      console.log('One Tap not shown:', notification.getNotDisplayedReason())
    }
  })
}




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




export function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {

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
