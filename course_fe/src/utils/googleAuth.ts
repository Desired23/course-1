




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

interface GoogleCredentialHandler {
  onSuccess: (credential: any) => void
  onError?: (error: Error) => void
}

interface GoogleAuthRuntime {
  initialized: boolean
  scriptPromise: Promise<void> | null
  handlers: Map<string, GoogleCredentialHandler>
  activeHandlerState: string | null
}

const runtimeKey = '__courseGoogleAuthRuntime'
const runtime: GoogleAuthRuntime = (window as any)[runtimeKey] || {
  initialized: false,
  scriptPromise: null,
  handlers: new Map<string, GoogleCredentialHandler>(),
  activeHandlerState: null,
}

;(window as any)[runtimeKey] = runtime






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





export function registerGoogleCredentialHandler(
  state: string,
  onSuccess: (credential: any) => void,
  onError?: (error: Error) => void
) {
  const handler = { onSuccess, onError }
  runtime.handlers.set(state, handler)

  return () => {
    if (runtime.handlers.get(state) === handler) {
      runtime.handlers.delete(state)
    }
  }
}

export async function initializeGoogleSignIn() {
  await loadGoogleScript()
  if (runtime.initialized) return

  const google = (window as any).google
  google.accounts.id.initialize({
    client_id: GOOGLE_OAUTH_CONFIG.clientId,
    callback: (response: any) => {
      const state = response.state || runtime.activeHandlerState
      const handler = state ? runtime.handlers.get(state) : undefined
      runtime.activeHandlerState = null

      if (response.credential) {
        handler?.onSuccess(response)
      } else {
        handler?.onError?.(new Error('No credential received'))
      }
    },
    auto_select: false,
    cancel_on_tap_outside: true,
  })
  runtime.initialized = true
}




export function renderGoogleButton(
  element: HTMLElement,
  options?: {
    type?: 'standard' | 'icon'
    theme?: 'outline' | 'filled_blue' | 'filled_black'
    size?: 'large' | 'medium' | 'small'
    text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
    shape?: 'rectangular' | 'pill' | 'circle' | 'square'
    logo_alignment?: 'left' | 'center'
    width?: number
    state?: string
  }
) {
  if (!(window as any).google) {
    console.error('Google Identity Services script not loaded')
    return
  }

  const google = (window as any).google

  element.replaceChildren()
  google.accounts.id.renderButton(
    element,
    {
      type: options?.type || 'standard',
      theme: options?.theme || 'outline',
      size: options?.size || 'large',
      text: options?.text || 'continue_with',
      shape: options?.shape || 'rectangular',
      logo_alignment: options?.logo_alignment || 'left',
      width: options?.width || 300,
      state: options?.state,
      click_listener: () => {
        runtime.activeHandlerState = options?.state || null
      },
    }
  )
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
  if ((window as any).google) {
    return Promise.resolve()
  }
  if (runtime.scriptPromise) {
    return runtime.scriptPromise
  }

  runtime.scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true

    script.onload = () => {
      resolve()
    }

    script.onerror = () => {
      runtime.scriptPromise = null
      reject(new Error('Failed to load Google Identity Services script'))
    }

    document.head.appendChild(script)
  })

  return runtime.scriptPromise
}
