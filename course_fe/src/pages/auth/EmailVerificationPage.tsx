import { useState, useEffect } from 'react'
import { useRouter } from '../../components/Router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Alert, AlertDescription } from '../../components/ui/alert'
import { CheckCircle2, XCircle, Mail, Loader2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { toast } from 'sonner@2.0.3'

export function EmailVerificationPage() {
  const { navigate, params } = useRouter()
  const { user } = useAuth()
  const [verificationCode, setVerificationCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(0)

  // Check if email is already verified
  useEffect(() => {
    if (user?.email_verified) {
      navigate('/')
    }
  }, [user])

  // Countdown timer for resend button
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleVerify = async () => {
    if (!verificationCode.trim()) {
      setError('Please enter verification code')
      return
    }

    setIsVerifying(true)
    setError('')

    // Simulate API call
    setTimeout(() => {
      // In production, verify with backend
      if (verificationCode === '123456') {
        setIsVerified(true)
        toast.success('Email verified successfully!')
        setTimeout(() => {
          navigate('/')
        }, 2000)
      } else {
        setError('Invalid verification code')
      }
      setIsVerifying(false)
    }, 1500)
  }

  const handleResendCode = async () => {
    if (countdown > 0) return

    // Simulate API call
    setTimeout(() => {
      toast.success('Verification code sent to your email')
      setCountdown(60) // 60 seconds cooldown
    }, 1000)
  }

  if (isVerified) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
              </div>
              <h2 className="text-2xl">Email Verified!</h2>
              <p className="text-muted-foreground">
                Your email has been successfully verified. Redirecting...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Mail className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle>Verify Your Email</CardTitle>
          <CardDescription>
            We've sent a verification code to {user?.email || 'your email'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Verification Code</label>
            <Input
              type="text"
              placeholder="Enter 6-digit code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              maxLength={6}
              className="text-center text-2xl tracking-widest"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleVerify()
                }
              }}
            />
            <p className="text-xs text-muted-foreground text-center">
              For demo: use code <span className="font-mono font-bold">123456</span>
            </p>
          </div>

          <Button 
            onClick={handleVerify} 
            disabled={isVerifying || !verificationCode.trim()}
            className="w-full"
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify Email'
            )}
          </Button>

          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Didn't receive the code?
            </p>
            <Button
              variant="link"
              onClick={handleResendCode}
              disabled={countdown > 0}
              className="p-0 h-auto"
            >
              {countdown > 0 
                ? `Resend code in ${countdown}s` 
                : 'Resend verification code'
              }
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
