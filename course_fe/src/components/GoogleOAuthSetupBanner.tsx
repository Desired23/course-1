import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle, ExternalLink, X } from 'lucide-react'
import { GOOGLE_OAUTH_CONFIG } from '../config/googleOAuth'

export function GoogleOAuthSetupBanner() {
  const { t } = useTranslation()
  const [isVisible, setIsVisible] = useState(true)

  if (!isVisible) return null

  return (
    <div className="fixed bottom-4 right-4 max-w-md bg-yellow-50 border-2 border-yellow-400 rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />

        <div className="flex-1 text-sm">
          <div className="font-semibold text-yellow-900 mb-2">
            {t('google_oauth_setup_banner.title')}
          </div>

          <div className="text-yellow-800 space-y-2">
            <p>{t('google_oauth_setup_banner.add_to_console')}</p>

            <div className="bg-white rounded p-2 space-y-1">
              <div className="text-xs font-medium text-gray-700">{t('google_oauth_setup_banner.javascript_origins')}</div>
              <code className="text-xs break-all bg-yellow-100 px-1 py-0.5 rounded">
                {window.location.origin}
              </code>
            </div>

            <div className="bg-white rounded p-2 space-y-1">
              <div className="text-xs font-medium text-gray-700">{t('google_oauth_setup_banner.redirect_uris')}</div>
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
              {t('google_oauth_setup_banner.open_console')}
            </a>

            <div className="text-xs text-yellow-700 mt-2">
              {t('google_oauth_setup_banner.console_hint')}
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
