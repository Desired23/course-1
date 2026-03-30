/**
 * Google User Info Component
 * Displays user information after successful Google login
 */

import { useAuth } from '../contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import { LogOut, Mail, Shield, User } from 'lucide-react'
import { Button } from './ui/button'
import { useRouter } from './Router'

export function GoogleUserInfo() {
  const { t } = useTranslation()
  const { user, logout, hasRole } = useAuth()
  const { navigate } = useRouter()

  if (!user) {
    return null
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-16 h-16 rounded-full"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
          )}
          
          <div>
            <h3 className="font-semibold text-lg">{user.name}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
              <Mail className="w-4 h-4" />
              {user.email}
            </div>
            
            {user.roles && user.roles.length > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <Shield className="w-4 h-4 text-gray-500" />
                <div className="flex gap-1">
                  {user.roles.map((role) => (
                    <span
                      key={role}
                      className={`
                        px-2 py-0.5 rounded text-xs font-medium
                        ${role === 'admin' ? 'bg-red-100 text-red-700' : ''}
                        ${role === 'instructor' ? 'bg-blue-100 text-blue-700' : ''}
                        ${role === 'user' ? 'bg-green-100 text-green-700' : ''}
                      `}
                    >
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-gray-600 hover:text-red-600"
        >
          <LogOut className="w-4 h-4 mr-2" />
          {t('google_user_info.logout')}
        </Button>
      </div>

      {user.bio && (
        <div className="pt-4 border-t">
          <p className="text-sm text-gray-600">{user.bio}</p>
        </div>
      )}

      <div className="pt-4 border-t">
        <div className="text-sm text-gray-500">
          <strong>{t('google_user_info.logged_in_with')}</strong> {t('google_user_info.oauth')}
        </div>
        {user.isOnline !== undefined && (
          <div className="flex items-center gap-2 mt-2">
            <div className={`w-2 h-2 rounded-full ${user.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span className="text-sm text-gray-600">
              {user.isOnline ? t('google_user_info.online') : t('google_user_info.offline')}
            </span>
            {user.lastSeen && !user.isOnline && (
              <span className="text-xs text-gray-400">
                {t('google_user_info.last_seen', { value: new Date(user.lastSeen).toLocaleString() })}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="pt-4 border-t flex gap-2">
        {hasRole('admin') && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin/dashboard')}
          >
            {t('google_user_info.admin_dashboard')}
          </Button>
        )}
        {hasRole('instructor') && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/instructor/dashboard')}
          >
            {t('google_user_info.instructor_dashboard')}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/profile')}
        >
          {t('google_user_info.view_profile')}
        </Button>
      </div>
    </div>
  )
}
