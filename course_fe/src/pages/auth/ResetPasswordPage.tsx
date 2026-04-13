import { useState } from 'react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useRouter } from '../../components/Router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Alert, AlertDescription } from '../../components/ui/alert'
import { CheckCircle2, Lock, Loader2, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

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

export function ResetPasswordPage() {
  const { t } = useTranslation()
  const { navigate, params } = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)

  const token = params?.token

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return t('reset_password_page.password_min')
    }
    if (!/[A-Z]/.test(pwd)) {
      return t('reset_password_page.password_uppercase')
    }
    if (!/[a-z]/.test(pwd)) {
      return t('reset_password_page.password_lowercase')
    }
    if (!/[0-9]/.test(pwd)) {
      return t('reset_password_page.password_number')
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()


    const passwordError = validatePassword(password)
    if (passwordError) {
      toast.error(passwordError)
      return
    }

    if (password !== confirmPassword) {
      toast.error(t('reset_password_page.passwords_do_not_match'))
      return
    }

    setIsSubmitting(true)


    setTimeout(() => {
      setResetSuccess(true)
      setIsSubmitting(false)
      toast.success(t('reset_password_page.reset_success_toast'))
      setTimeout(() => {
        navigate('/login')
      }, 2000)
    }, 1500)
  }

  if (resetSuccess) {
    return (
      <motion.div
        className="min-h-screen bg-background flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
      >
        <motion.div variants={sectionStagger} initial="hidden" animate="show" className="max-w-md w-full">
          <Card>
          <CardContent className="pt-6">
            <motion.div className="text-center space-y-4" variants={fadeInUp}>
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
              </div>
              <h2 className="text-2xl">{t('reset_password_page.success_title')}</h2>
              <p className="text-muted-foreground">
                {t('reset_password_page.success_description')}
              </p>
            </motion.div>
          </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    )
  }

  return (
    <motion.div
      className="min-h-screen bg-background flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div variants={sectionStagger} initial="hidden" animate="show" className="max-w-md w-full">
        <Card>
        <CardHeader className="text-center">
          <motion.div className="flex justify-center mb-4" variants={fadeInUp}>
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-primary" />
            </div>
          </motion.div>
          <motion.div variants={fadeInUp}>
            <CardTitle>{t('reset_password_page.title')}</CardTitle>
            <CardDescription>
              {t('reset_password_page.description')}
            </CardDescription>
          </motion.div>
        </CardHeader>
        <CardContent>
          <motion.form onSubmit={handleSubmit} className="space-y-4" variants={fadeInUp}>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('reset_password_page.new_password')}</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('reset_password_page.new_password_placeholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('reset_password_page.password_hint')}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('reset_password_page.confirm_password')}</label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder={t('reset_password_page.confirm_password_placeholder')}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {password && confirmPassword && password !== confirmPassword && (
              <Alert variant="destructive">
                <AlertDescription>{t('reset_password_page.passwords_do_not_match')}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={isSubmitting || !password || !confirmPassword}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('reset_password_page.resetting')}
                </>
              ) : (
                t('reset_password_page.title')
              )}
            </Button>
          </motion.form>
        </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
