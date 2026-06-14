import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useRouter } from '../../components/Router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Alert, AlertDescription } from '../../components/ui/alert'
import { CheckCircle2, Mail, Loader2, XCircle } from 'lucide-react'
import { confirmEmailChange } from '../../services/auth.api'

type VerifyState = 'verifying' | 'verified' | 'expired' | 'invalid'

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

export function EmailChangeVerificationPage() {
  const { t } = useTranslation()
  const { navigate } = useRouter()
  const [state, setState] = useState<VerifyState>('verifying')
  const [message, setMessage] = useState('')

  const token = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return new URLSearchParams(window.location.search).get('token') || ''
  }, [])

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setState('invalid')
        setMessage(t('email_change_verification_page.missing_token'))
        return
      }

      try {
        const result = await confirmEmailChange(token)
        setState('verified')
        setMessage(result.message || t('email_change_verification_page.verified_success'))
      } catch (error: any) {
        const details = error?.errors || {}
        if (details?.code === 'email_change_expired') {
          setState('expired')
          setMessage(details?.error || t('email_change_verification_page.link_expired'))
          return
        }
        setState('invalid')
        setMessage(details?.error || error?.message || t('email_change_verification_page.invalid_link'))
      }
    }

    run()
  }, [token, t])

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
              {state === 'verified' ? (
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              ) : state === 'verifying' ? (
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              ) : (
                <Mail className="w-8 h-8 text-primary" />
              )}
            </div>
          </motion.div>
          <motion.div variants={fadeInUp}>
            <CardTitle>{t('email_change_verification_page.title')}</CardTitle>
            <CardDescription>{message}</CardDescription>
          </motion.div>
        </CardHeader>
        <CardContent className="space-y-4">
          {(state === 'invalid' || state === 'expired') && (
            <motion.div variants={fadeInUp}>
              <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{message}</AlertDescription>
              </Alert>
            </motion.div>
          )}

          {state === 'verified' && (
            <motion.div variants={fadeInUp}>
              <Button className="w-full" onClick={() => navigate('/login')}>
                {t('email_change_verification_page.go_to_login')}
              </Button>
            </motion.div>
          )}
        </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
