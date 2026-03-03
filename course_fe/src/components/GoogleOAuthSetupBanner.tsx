import { useState } from 'react'
import { AlertCircle, ExternalLink, X } from 'lucide-react'
import { GOOGLE_OAUTH_CONFIG } from '../config/googleOAuth'

/**
 * Google OAuth Setup Banner
 * Shows configuration instructions if origin not authorized
 */
export function GoogleOAuthSetupBanner() {
  const [isVisible, setIsVisible] = useState(true)
  
  if (!isVisible) return null

  return (
    <div className="fixed bottom-4 right-4 max-w-md bg-yellow-50 border-2 border-yellow-400 rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        
        <div className="flex-1 text-sm">
          <div className="font-semibold text-yellow-900 mb-2">
            ⚠️ Google OAuth Setup Required
          </div>
          
          <div className="text-yellow-800 space-y-2">
            <p>Add these to Google Console:</p>
            
            <div className="bg-white rounded p-2 space-y-1">
              <div className="text-xs font-medium text-gray-700">JavaScript origins:</div>
              <code className="text-xs break-all bg-yellow-100 px-1 py-0.5 rounded">
                {window.location.origin}
              </code>
            </div>
            
            <div className="bg-white rounded p-2 space-y-1">
              <div className="text-xs font-medium text-gray-700">Redirect URIs:</div>
              <code className="text-xs break-all bg-yellow-100 px-1 py-0.5 rounded">
                {GOOGLE_OAUTH_CONFIG.redirectUri}
              </code>
            </div>
            
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium mt-2"
            >
              <ExternalLink className="w-3 h-3" />
              Open Google Console
            </a>
            
            <div className="text-xs text-yellow-700 mt-2">
              💡 Check console (F12) for detailed instructions
            </div>
          </div>
        </div>
        
        <button
          onClick={() => setIsVisible(false)}
          className="text-yellow-600 hover:text-yellow-800 flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
