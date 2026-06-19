import { useState } from 'react'
import { AtSign, Eye, EyeOff, Lock, Mail, User } from 'lucide-react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { AuthLayout } from '../../components/auth/AuthLayout'
import { useRouter } from '../../components/Router'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { useAuth } from '../../contexts/AuthContext'
import { getErrorMessage } from '../../lib/apiError'
import { useAuthStore } from '../../stores/auth.store'

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

export function SignupPage() {
  const { t } = useTranslation()
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState<{ username?: string; fullName?: string; email?: string; password?: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { navigate } = useRouter()
  const { signup, error: authError } = useAuth()

  const validate = () => {
    const newErrors: { username?: string; fullName?: string; email?: string; password?: string } = {}

    if (!formData.username.trim()) {
      newErrors.username = t('auth.username_required')
    } else if (formData.username.trim().length < 3) {
      newErrors.username = t('auth.username_min')
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

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
        toast.success(t('auth.signup_success_verify'), { duration: 6000 })
        navigate('/login')
      } else {
        toast.error(useAuthStore.getState().error || 'Không nhận được chi tiết lỗi từ máy chủ.')
      }
    } catch (error) {
      toast.error(useAuthStore.getState().error || getErrorMessage(error, t('auth.error_occurred')))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    })
    if (errors[event.target.name as keyof typeof errors]) {
      setErrors({
        ...errors,
        [event.target.name]: undefined,
      })
    }
  }

  return (
    <AuthLayout
      title={t('auth.create_account')}
      subtitle={t('auth.create_account_subtitle')}
      image="https://images.unsplash.com/photo-1623485101793-082c03565fa9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkZW50JTIwbGVhcm5pbmclMjBvbmxpbmUlMjBsYXB0b3AlMjBsaWJyYXJ5JTIwYWVzdGhldGljfGVufDF8fHx8MTc2ODA0ODMwMnww&ixlib=rb-4.1.0&q=80&w=1080"
      quote={t('auth.signup_quote')}
      author={t('auth.signup_quote_author')}
    >
      <motion.div className="grid gap-6" variants={sectionStagger} initial="hidden" animate="show">
        <form onSubmit={handleSubmit} className="space-y-4">
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }} className="space-y-2">
            <Label htmlFor="username" className="text-gray-700 dark:text-gray-300">
              {t('auth.username')}
            </Label>
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleInputChange}
                onBlur={validate}
                placeholder={t('auth.username_placeholder')}
                className={`pl-10 h-11 bg-gray-50 dark:bg-zinc-800/50 border-gray-200 dark:border-zinc-700 focus:bg-white dark:focus:bg-zinc-800 transition-colors ${
                  errors.username
                    ? 'border-red-500 focus-visible:ring-red-500'
                    : 'focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-400'
                }`}
              />
            </div>
            {errors.username && (
              <motion.span initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="text-red-500 text-xs font-medium flex items-center gap-1 mt-1">
                {errors.username}
              </motion.span>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }} className="space-y-2">
            <Label htmlFor="fullName" className="text-gray-700 dark:text-gray-300">
              {t('auth.full_name')}
            </Label>
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
              <motion.span initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="text-red-500 text-xs font-medium flex items-center gap-1 mt-1">
                {errors.fullName}
              </motion.span>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }} className="space-y-2">
            <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">
              {t('auth.email')}
            </Label>
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
              <motion.span initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="text-red-500 text-xs font-medium flex items-center gap-1 mt-1">
                {errors.email}
              </motion.span>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 }} className="space-y-2">
            <Label htmlFor="password" className="text-gray-700 dark:text-gray-300">
              {t('auth.password')}
            </Label>
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
              <motion.span initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="text-red-500 text-xs font-medium flex items-center gap-1 mt-1">
                {errors.password}
              </motion.span>
            ) : (
              <p className="text-[0.8rem] text-gray-500 dark:text-gray-400 mt-1">{t('auth.password_hint')}</p>
            )}
          </motion.div>

          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
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
              ) : (
                t('auth.create_account')
              )}
            </Button>
          </motion.div>
        </form>

        <motion.div className="relative my-2" variants={fadeInUp}>
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-200 dark:border-zinc-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-transparent px-2 text-gray-500 dark:text-gray-400 font-medium">
              {t('auth.or_continue_with')}
            </span>
          </div>
        </motion.div>

        <motion.div className="hidden grid grid-cols-2 gap-4" variants={fadeInUp}>
          <Button variant="outline" className="w-full h-10">
            {t('auth.google')}
          </Button>
          <Button variant="outline" className="w-full h-10">
            {t('auth.facebook')}
          </Button>
        </motion.div>

        <motion.div className="text-center text-sm text-gray-600 dark:text-gray-400" variants={fadeInUp}>
          {t('auth.have_account')}{' '}
          <button
            onClick={() => navigate('/login')}
            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-bold hover:underline transition-all"
          >
            {t('auth.login')}
          </button>
        </motion.div>
      </motion.div>
    </AuthLayout>
  )
}
