import { useState, useEffect } from 'react'
import { Eye, EyeOff, User, Lock } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { useRouter } from '../components/Router'
import { useAuth } from '../contexts/AuthContext'
import { GoogleLoginButton } from '../components/GoogleLoginButton'
import { GoogleOAuthSetupBanner } from '../components/GoogleOAuthSetupBanner'
import { toast } from 'sonner'
import { debugGoogleOAuthConfig } from '../utils/debugGoogleOAuth'
import { AuthLayout } from '../components/auth/AuthLayout'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../stores/auth.store'

export function LoginPage() {
  const { t } = useTranslation()
  const [showPassword, setShowPassword] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{username?: string, password?: string}>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('remember_me') === 'true')
  
  const { navigate } = useRouter()
  const { login, error: authError, clearError } = useAuth()

  useEffect(() => {
    debugGoogleOAuthConfig()
  }, [])

  // Clear auth error when component mounts or fields change
  useEffect(() => {
    if (authError) clearError()
  }, [username, password])

  const validate = () => {
    const newErrors: {username?: string, password?: string} = {}
    
    if (!username.trim()) {
      newErrors.username = t('auth.username_required', 'Vui lòng nhập tên đăng nhập')
    }
    
    if (!password) {
      newErrors.password = t('auth.password_required')
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validate()) return

    setIsSubmitting(true)
    
    try {
      const success = await login(username.trim(), password, rememberMe)
      if (success) {
        localStorage.setItem('remember_me', String(rememberMe))
        toast.success(t('auth.login_success'))
        navigate('/')
      } else {
        toast.error(useAuthStore.getState().error || t('auth.error_occurred'))
      }
    } catch (error) {
      toast.error(t('auth.error_occurred'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleSuccess = () => {
    toast.success(t('auth.google_success'))
  }

  const handleGoogleError = (error: Error) => {
    toast.error(`${t('auth.google_failed')}: ${error.message}`)
  }

  return (
    <AuthLayout 
      title={t('auth.welcome')}
      subtitle={t('auth.welcome_subtitle')}
      image="https://images.unsplash.com/photo-1762278805303-69a5fe7b6a82?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGRpZ2l0YWwlMjB0ZWNobm9sb2d5JTIwZGFyayUyMGJhY2tncm91bmQlMjBtb2Rlcm58ZW58MXx8fHwxNzY4MDQ4Mjk5fDA&ixlib=rb-4.1.0&q=80&w=1080"
      quote="The beautiful thing about learning is that no one can take it away from you."
      author="B.B. King"
    >
      <div className="grid gap-6">
        {/* <GoogleOAuthSetupBanner /> */}
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-2"
          >
            <Label htmlFor="username" className="text-gray-700 dark:text-gray-300">{t('auth.username', 'Tên đăng nhập')}</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value)
                  if (errors.username) setErrors({...errors, username: undefined})
                }}
                onBlur={validate}
                placeholder={t('auth.username_placeholder', 'Nhập tên đăng nhập')}
                className={`pl-10 h-11 bg-gray-50 dark:bg-zinc-800/50 border-gray-200 dark:border-zinc-700 focus:bg-white dark:focus:bg-zinc-800 transition-colors ${
                  errors.username 
                    ? 'border-red-500 focus-visible:ring-red-500' 
                    : 'focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-400'
                }`}
              />
            </div>
            {errors.username && (
              <motion.span 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-red-500 text-xs font-medium flex items-center gap-1 mt-1"
              >
                {errors.username}
              </motion.span>
            )}
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-gray-700 dark:text-gray-300">{t('auth.password')}</Label>
              <button
                type="button"
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium transition-colors"
              >
                {t('auth.forgot_password')}
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (errors.password) setErrors({...errors, password: undefined})
                }}
                onBlur={validate}
                placeholder={t('auth.enter_password')}
                className={`pl-10 pr-10 h-11 bg-gray-50 dark:bg-zinc-800/50 border-gray-200 dark:border-zinc-700 focus:bg-white dark:focus:bg-zinc-800 transition-colors ${
                  errors.password 
                    ? 'border-red-500 focus-visible:ring-red-500' 
                    : 'focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-400'
                }`}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
            {errors.password && (
              <motion.span 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-red-500 text-xs font-medium flex items-center gap-1 mt-1"
              >
                {errors.password}
              </motion.span>
            )}
          </motion.div>

          <div className="flex items-center space-x-2">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
            />
            <label htmlFor="remember-me" className="text-sm font-medium text-gray-600 dark:text-gray-400 cursor-pointer">
              {t('auth.remember_me')}
            </label>
          </div>

          <motion.div
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <Button 
              type="submit" 
              className="w-full h-11 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold shadow-lg shadow-indigo-500/20 transition-all duration-300" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{t('auth.logging_in')}</span>
                </div>
              ) : t('auth.sign_in')}
            </Button>
          </motion.div>
        </form>

        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-200 dark:border-zinc-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-transparent px-2 text-gray-500 dark:text-gray-400 font-medium">
              {t('auth.or_continue_with')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <GoogleLoginButton
            useCustomButton={true}
            buttonText={t('common.google')}
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            className="w-full"
          />
          
          <Button variant="outline" className="w-full h-10 bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-200 transition-colors">
            <svg className="w-4 h-4 mr-2 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            {t('common.facebook')}
          </Button>
        </div>

        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          {t('auth.no_account')}{' '}
          <button
            onClick={() => navigate('/signup')}
            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-bold hover:underline transition-all"
          >
            {t('auth.signup')}
          </button>
        </div>
      </div>
    </AuthLayout>
  )
}
