import React from 'react'
import { Link } from '../components/Router'
import { useTranslation } from 'react-i18next'

export function ZustandSuccessBanner() {
  const { t } = useTranslation()
  const [visible, setVisible] = React.useState(true)

  if (!visible) return null

  return (
    <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{t('zustand_success_banner.emoji')}</span>
            <div>
              <h3 className="font-semibold">{t('zustand_success_banner.title')}</h3>
              <p className="text-sm text-white/90">
                {t('zustand_success_banner.description')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/zustand-test"
              className="px-4 py-2 bg-white text-purple-600 rounded-lg font-medium hover:bg-purple-50 transition"
            >
              {t('zustand_success_banner.cta')}
            </Link>

            <button
              onClick={() => setVisible(false)}
              className="px-3 py-2 text-white/80 hover:text-white transition"
              aria-label={t('zustand_success_banner.close')}
            >
              ×
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
