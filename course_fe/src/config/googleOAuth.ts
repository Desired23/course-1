/**
 * Google OAuth Configuration
 * 
 * DEMO MODE - Client ID hardcoded for testing
 */

export const GOOGLE_OAUTH_CONFIG = {
  // Hardcoded Client ID for demo (không cần .env)
  clientId: '769246063466-q50orj7aqn9rshcdaiu2m03d1lc8fq46.apps.googleusercontent.com',
  
  // Redirect URI - auto-detect
  redirectUri: window.location.hostname === 'localhost' 
    ? 'http://localhost:5173/auth/google/callback'
    : `${window.location.origin}/auth/google/callback`,
  
  // Scopes to request from Google
  scope: [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
  ].join(' '),
  
  // Response type
  responseType: 'code',
  
  // Access type (offline for refresh token)
  accessType: 'online',
  
  // Prompt type
  prompt: 'select_account',
}

/**
 * Generate Google OAuth URL
 */
export function getGoogleOAuthURL(): string {
  const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth'
  
  const options = {
    redirect_uri: GOOGLE_OAUTH_CONFIG.redirectUri,
    client_id: GOOGLE_OAUTH_CONFIG.clientId,
    access_type: GOOGLE_OAUTH_CONFIG.accessType,
    response_type: GOOGLE_OAUTH_CONFIG.responseType,
    prompt: GOOGLE_OAUTH_CONFIG.prompt,
    scope: GOOGLE_OAUTH_CONFIG.scope,
  }
  
  const qs = new URLSearchParams(options)
  
  return `${rootUrl}?${qs.toString()}`
}

/**
 * Parse Google OAuth callback URL
 */
export function parseGoogleCallback(url: string): { code?: string; error?: string } {
  const params = new URLSearchParams(new URL(url).search)
  
  return {
    code: params.get('code') || undefined,
    error: params.get('error') || undefined,
  }
}

/**
 * Validate Google OAuth configuration
 */
export function validateGoogleOAuthConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!GOOGLE_OAUTH_CONFIG.clientId || GOOGLE_OAUTH_CONFIG.clientId === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
    errors.push('Google Client ID is not configured. Please set VITE_GOOGLE_CLIENT_ID in your .env file.')
  }
  
  if (!GOOGLE_OAUTH_CONFIG.redirectUri) {
    errors.push('Google Redirect URI is not configured.')
  }
  
  return {
    valid: errors.length === 0,
    errors,
  }
}