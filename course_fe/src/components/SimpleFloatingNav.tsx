import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useRouter } from './Router'
import { useAuth } from '../contexts/AuthContext'
import { Menu, X, Home, BookOpen, User } from 'lucide-react'

export function SimpleFloatingNav() {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const { navigate } = useRouter()
  const auth = useAuth()

  // Basic navigation items
  const basicItems = [
    { id: 'home', label: t('simple_floating_nav.home'), path: '/', icon: Home },
    { id: 'courses', label: t('simple_floating_nav.courses'), path: '/courses', icon: BookOpen },
    { id: 'profile', label: t('simple_floating_nav.profile'), path: '/profile', icon: User },
  ]

  const handleNavigate = (path: string) => {
    navigate(path)
    setIsOpen(false)
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="absolute bottom-16 right-0 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border p-4"
          >
            <div className="space-y-2">
              {basicItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.path)}
                  className="w-full flex items-center gap-3 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-gray-500">
                {t('simple_floating_nav.auth_status')}: {auth?.isAuthenticated ? t('simple_floating_nav.logged_in') : t('simple_floating_nav.not_logged_in')}
              </p>
              {auth?.user && (
                <p className="text-xs text-gray-500">
                  {t('simple_floating_nav.user')}: {auth.user.name} ({auth.user.roles.join(', ')})
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
    </div>
  )
}
