import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'

import { useRouter } from '../../components/Router'
import { useAuth } from '../../contexts/AuthContext'
import { parseGoogleCallback } from '../../config/googleOAuth'

const sectionStagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
}

const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1],
    },
  },
}

export function GoogleCallbackPage() {
  const { t } = useTranslation()
  const { navigate } = useRouter()
  const { loginWithGoogle } = useAuth()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const params = parseGoogleCallback(window.location.href)

        if (params.error) {
          setStatus('error')
          setErrorMessage(params.error)
          setTimeout(() => navigate('/login'), 3000)
          return
        }

        if (params.code) {
          setStatus('error')
          setErrorMessage(t('google_callback_page.backend_integration_required'))
          setTimeout(() => navigate('/login'), 5000)
          return
        }

        setStatus('error')
        setErrorMessage(t('google_callback_page.invalid_callback'))
        setTimeout(() => navigate('/login'), 3000)
      } catch (error) {
        console.error('Callback error:', error)
        setStatus('error')
        setErrorMessage(t('google_callback_page.processing_error'))
        setTimeout(() => navigate('/login'), 3000)
      }
    }

    handleCallback()
  }, [navigate, loginWithGoogle, t])

  return (
    <motion.div
      className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div className="max-w-md w-full" variants={sectionStagger} initial="hidden" animate="show">
        <motion.div className="bg-white p-8 rounded-lg shadow-sm border text-center" variants={fadeInUp}>
          {status === 'loading' && (
            <>
              <div className="flex justify-center mb-4">
                <svg className="animate-spin h-12 w-12 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2">{t('google_callback_page.processing_title')}</h2>
              <p className="text-gray-600">{t('google_callback_page.processing_description')}</p>
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
              <h2 className="text-xl font-semibold mb-2 text-green-600">{t('google_callback_page.success_title')}</h2>
              <p className="text-gray-600">{t('google_callback_page.redirect_home')}</p>
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
              <h2 className="text-xl font-semibold mb-2 text-red-600">{t('google_callback_page.error_title')}</h2>
              <p className="text-gray-600 mb-4">{errorMessage}</p>
              <p className="text-sm text-gray-500">{t('google_callback_page.redirect_login')}</p>
            </>
          )}
        </motion.div>

        <motion.div className="mt-6 text-center" variants={fadeInUp}>
          <button onClick={() => navigate('/login')} className="text-sm text-primary hover:text-primary/80">
            {t('google_callback_page.back_to_login')}
          </button>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
