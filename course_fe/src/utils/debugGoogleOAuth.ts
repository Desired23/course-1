




import { GOOGLE_OAUTH_CONFIG } from '../config/googleOAuth'

export function debugGoogleOAuthConfig() {
  console.log('%c🔍 GOOGLE OAUTH CONFIGURATION', 'background: #4285f4; color: white; padding: 8px 12px; font-size: 14px; font-weight: bold;')
  console.log('')

  console.log('%c✅ Client ID:', 'color: #34a853; font-weight: bold;')
  console.log(GOOGLE_OAUTH_CONFIG.clientId)
  console.log('')

  console.log('%c✅ Redirect URI:', 'color: #34a853; font-weight: bold;')
  console.log(GOOGLE_OAUTH_CONFIG.redirectUri)
  console.log('')

  console.log('%c✅ Current Origin:', 'color: #34a853; font-weight: bold;')
  console.log(window.location.origin)
  console.log('')

  console.log('%c📋 GOOGLE CONSOLE CHECKLIST:', 'background: #fbbc04; color: black; padding: 4px 8px; font-weight: bold;')
  console.log('')
  console.log('Go to: https://console.cloud.google.com/apis/credentials')
  console.log('')
  console.log('1️⃣  Add to "Authorized JavaScript origins":')
  console.log(`   → ${window.location.origin}`)
  console.log('')
  console.log('2️⃣  Add to "Authorized redirect URIs":')
  console.log(`   → ${GOOGLE_OAUTH_CONFIG.redirectUri}`)
  console.log('')
  console.log('3️⃣  Click SAVE and wait 5-10 minutes')
  console.log('')
  console.log('%c⚠️  COMMON MISTAKES:', 'color: #ea4335; font-weight: bold;')
  console.log('❌ Trailing slash:', window.location.origin + '/')
  console.log('❌ With path:', window.location.origin + '/login')
  console.log('❌ Wrong protocol: https://localhost:5173')
  console.log('✅ CORRECT:', window.location.origin)
  console.log('')
  console.log('%c💡 After fixing, clear cache and restart server!', 'color: #4285f4; font-style: italic;')
}

export function showGoogleErrorHelp(error: string) {
  console.error('%c❌ GOOGLE OAUTH ERROR', 'background: #ea4335; color: white; padding: 8px 12px; font-size: 14px; font-weight: bold;')
  console.error('')
  console.error('Error:', error)
  console.error('')

  if (error.includes('origin') || error.includes('not allowed')) {
    console.error('%c🔧 SOLUTION:', 'color: #ea4335; font-weight: bold;')
    console.error('')
    console.error('The origin is not authorized in Google Console!')
    console.error('')
    console.error('1. Go to: https://console.cloud.google.com/apis/credentials')
    console.error('2. Click on your OAuth 2.0 Client ID')
    console.error('3. Add to "Authorized JavaScript origins":')
    console.error(`   ${window.location.origin}`)
    console.error('4. Add to "Authorized redirect URIs":')
    console.error(`   ${GOOGLE_OAUTH_CONFIG.redirectUri}`)
    console.error('5. Click SAVE')
    console.error('6. Wait 5-10 minutes')
    console.error('7. Clear cache and try again')
    console.error('')
    console.error('%c📖 See /FIX_GOOGLE_ERRORS.md for detailed guide', 'color: #4285f4; font-style: italic;')
  }
}


if (typeof window !== 'undefined') {

  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    debugGoogleOAuthConfig()
  }
}
