import { useState } from 'react'
import { Eye, EyeOff, User, Mail, Lock, AtSign } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { useRouter } from '../components/Router'
import { useAuth } from '../contexts/AuthContext'
import { AuthLayout } from '../components/auth/AuthLayout'
import { toast } from 'sonner'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'

export function SignupPage() {
  const { t } = useTranslation()
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    email: '',
    password: ''
  })
  const [errors, setErrors] = useState<{username?: string, fullName?: string, email?: string, password?: string}>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { navigate } = useRouter()
  const { signup, error: authError, clearError } = useAuth()

  const validate = () => {
    const newErrors: {username?: string, fullName?: string, email?: string, password?: string} = {}
    
    if (!formData.username.trim()) {
      newErrors.username = t('auth.username_required', 'Vui lòng nhập tên đăng nhập')
    } else if (formData.username.trim().length < 3) {
      newErrors.username = t('auth.username_min', 'Tên đăng nhập phải có ít nhất 3 ký tự')
    }
    
    if (!formData.fullName.trim()) {
      newErrors.fullName = t('auth.name_required')
    }

    if (!formData.email) {
      newErrors.email = t('auth.email_required')
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t('auth.email_invalid')
    }
    
    if (!formData.password) {
      newErrors.password = t('auth.password_required')
    } else if (formData.password.length < 8) {
      newErrors.password = t('auth.password_min')
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validate()) return

    setIsSubmitting(true)
    
    try {
      const success = await signup(
        formData.username.trim(),
        formData.email.trim(),
        formData.fullName.trim(),
        formData.password
      )
      if (success) {
        toast.success(
          t('auth.signup_success_verify', 'Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.'),
          { duration: 6000 }
        )
        navigate('/login')
      } else {
        toast.error(authError || t('auth.signup_failed', 'Đăng ký thất bại. Vui lòng thử lại.'))
      }
    } catch (error) {
      toast.error(t('auth.error_occurred'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    if (errors[e.target.name as keyof typeof errors]) {
      setErrors({
        ...errors,
        [e.target.name]: undefined
      })
    }
  }

  return (
    <AuthLayout 
      title={t('auth.create_account')}
      subtitle={t('auth.create_account_subtitle')}
      image="https://images.unsplash.com/photo-1623485101793-082c03565fa9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkZW50JTIwbGVhcm5pbmclMjBvbmxpbmUlMjBsYXB0b3AlMjBsaWJyYXJ5JTIwYWVzdGhldGljfGVufDF8fHx8MTc2ODA0ODMwMnww&ixlib=rb-4.1.0&q=80&w=1080"
      quote="The more that you read, the more things you will know. The more that you learn, the more places you'll go."
      author="Dr. Seuss"
    >
      <div className="grid gap-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="space-y-2"
          >
            <Label htmlFor="username" className="text-gray-700 dark:text-gray-300">{t('auth.username', 'Tên đăng nhập')}</Label>
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleInputChange}
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
            transition={{ delay: 0.25 }}
            className="space-y-2"
          >
            <Label htmlFor="fullName" className="text-gray-700 dark:text-gray-300">{t('auth.full_name')}</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="fullName"
                name="fullName"
                type="text"
                value={formData.fullName}
                onChange={handleInputChange}
                onBlur={validate}
                placeholder={t('auth.enter_name')}
                className={`pl-10 h-11 bg-gray-50 dark:bg-zinc-800/50 border-gray-200 dark:border-zinc-700 focus:bg-white dark:focus:bg-zinc-800 transition-colors ${
                  errors.fullName 
                    ? 'border-red-500 focus-visible:ring-red-500' 
                    : 'focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-400'
                }`}
              />
            </div>
            {errors.fullName && (
              <motion.span 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-red-500 text-xs font-medium flex items-center gap-1 mt-1"
              >
                {errors.fullName}
              </motion.span>
            )}
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 }}
            className="space-y-2"
          >
            <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">{t('auth.email')}</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                onBlur={validate}
                placeholder={t('auth.email_placeholder')}
                className={`pl-10 h-11 bg-gray-50 dark:bg-zinc-800/50 border-gray-200 dark:border-zinc-700 focus:bg-white dark:focus:bg-zinc-800 transition-colors ${
                  errors.email 
                    ? 'border-red-500 focus-visible:ring-red-500' 
                    : 'focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-400'
                }`}
              />
            </div>
            {errors.email && (
              <motion.span 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-red-500 text-xs font-medium flex items-center gap-1 mt-1"
              >
                {errors.email}
              </motion.span>
            )}
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.45 }}
            className="space-y-2"
          >
            <Label htmlFor="password" className="text-gray-700 dark:text-gray-300">{t('auth.password')}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleInputChange}
                onBlur={validate}
                placeholder={t('auth.create_password')}
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
            {errors.password ? (
              <motion.span 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-red-500 text-xs font-medium flex items-center gap-1 mt-1"
              >
                {errors.password}
              </motion.span>
            ) : (
              <p className="text-[0.8rem] text-gray-500 dark:text-gray-400 mt-1">
                {t('auth.password_hint')}
              </p>
            )}
          </motion.div>

          <div className="space-y-4">
            <div className="flex items-start space-x-2">
              <input
                id="promotional-emails"
                name="promotional-emails"
                type="checkbox"
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mt-0.5 cursor-pointer"
              />
              <label htmlFor="promotional-emails" className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-600 dark:text-gray-400 cursor-pointer">
                {t('auth.email_offers')}
              </label>
            </div>
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
                  <span>{t('auth.creating_account')}</span>
                </div>
              ) : t('auth.create_account')}
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
           <Button variant="outline" className="w-full h-10 bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-200 transition-colors">
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {t('common.google')}
          </Button>
          
          <Button variant="outline" className="w-full h-10 bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-200 transition-colors">
            <svg className="w-4 h-4 mr-2 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            {t('common.facebook')}
          </Button>
        </div>

        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          {t('auth.have_account')}{' '}
          <button
            onClick={() => navigate('/login')}
            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-bold hover:underline transition-all"
          >
            {t('auth.login')}
          </button>
        </div>
      </div>
    </AuthLayout>
  )
}
