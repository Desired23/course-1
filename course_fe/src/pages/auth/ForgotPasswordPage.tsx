import { useState } from 'react'
import { ArrowLeft, CheckCircle2, Loader2, Mail } from 'lucide-react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { useRouter } from '../../components/Router'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'

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

export function ForgotPasswordPage() {
  const { t } = useTranslation()
  const { navigate } = useRouter()
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!email.trim()) {
      toast.error(t('auth.email_required'))
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast.error(t('auth.email_invalid'))
      return
    }

    setIsSubmitting(true)

    setTimeout(() => {
      setEmailSent(true)
      setIsSubmitting(false)
      toast.success(t('forgot_password_page.email_sent_toast'))
    }, 1500)
  }

  if (emailSent) {
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
              <h2 className="text-2xl">{t('forgot_password_page.check_email_title')}</h2>
              <p className="text-muted-foreground">
                {t('forgot_password_page.check_email_description')} <strong>{email}</strong>
              </p>
              <p className="text-sm text-muted-foreground">
                {t('forgot_password_page.check_email_hint')}{' '}
                <button onClick={() => setEmailSent(false)} className="text-primary hover:underline">
                  {t('forgot_password_page.try_another_email')}
                </button>
              </p>
              <Button onClick={() => navigate('/login')} className="w-full">
                {t('forgot_password_page.back_to_login')}
              </Button>
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
              <Mail className="w-8 h-8 text-primary" />
            </div>
          </motion.div>
          <motion.div variants={fadeInUp}>
            <CardTitle>{t('forgot_password_page.title')}</CardTitle>
            <CardDescription>{t('forgot_password_page.subtitle')}</CardDescription>
          </motion.div>
        </CardHeader>
        <CardContent>
          <motion.form onSubmit={handleSubmit} className="space-y-4" variants={fadeInUp}>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('auth.email')}</label>
              <Input
                type="email"
                placeholder={t('forgot_password_page.email_placeholder')}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('forgot_password_page.sending')}
                </>
              ) : (
                t('forgot_password_page.send_reset_link')
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/login')}
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('forgot_password_page.back_to_login')}
            </Button>
          </motion.form>
        </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
