import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useModal } from '../../stores/modal.store'
import { useAuthStore } from '../../stores/auth.store'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function AuthModal() {
  const { t } = useTranslation()
  const { login, signup, clearError } = useAuth()
  const { isOpen, close, data } = useModal('login')
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('login')

  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  const [signupUsername, setSignupUsername] = useState('')
  const [signupFullName, setSignupFullName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')

  const resetForms = () => {
    setLoginUsername('')
    setLoginPassword('')
    setSignupUsername('')
    setSignupFullName('')
    setSignupEmail('')
    setSignupPassword('')
    clearError()
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const success = await login(loginUsername.trim(), loginPassword)
      if (success) {
        toast.success(t('auth.login_success'))
        resetForms()
        close()
        data?.onSuccess?.()
      } else {
        toast.error(useAuthStore.getState().error || t('auth_modal.login_failed_fallback'))
      }
    } catch {
      toast.error(t('auth.error_occurred'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const success = await signup(
        signupUsername.trim(),
        signupEmail.trim(),
        signupFullName.trim(),
        signupPassword
      )

      if (success) {
        toast.success(t('auth_modal.signup_success_with_verification'), { duration: 6000 })
        resetForms()
        setActiveTab('login')
      } else {
        toast.error(useAuthStore.getState().error || t('auth_modal.signup_failed_fallback'))
      }
    } catch {
      toast.error(t('auth.error_occurred'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { resetForms(); close() } }}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">
            {activeTab === 'login' ? t('auth.welcome') : t('auth.create_account')}
          </DialogTitle>
          <DialogDescription className="text-center">
            {activeTab === 'login'
              ? t('auth_modal.login_description')
              : t('auth_modal.signup_description')}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); clearError() }} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="login">{t('auth.login')}</TabsTrigger>
            <TabsTrigger value="signup">{t('auth.signup')}</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="modal-username">{t('auth_modal.username')}</Label>
                <Input
                  id="modal-username"
                  type="text"
                  placeholder={t('auth_modal.username_placeholder')}
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="modal-password">{t('auth.password')}</Label>
                  <Button variant="link" className="p-0 h-auto text-xs" type="button">
                    {t('auth.forgot_password')}
                  </Button>
                </div>
                <Input
                  id="modal-password"
                  type="password"
                  placeholder={t('auth.enter_password')}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full text-black hover:bg-gray-100 border-none"
                disabled={isLoading}
                style={{ backgroundColor: '#ffffff', color: '#000000' }}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('auth.login')}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="modal-signup-username">{t('auth_modal.username')}</Label>
                <Input
                  id="modal-signup-username"
                  placeholder={t('auth_modal.username_placeholder')}
                  value={signupUsername}
                  onChange={(e) => setSignupUsername(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modal-signup-name">{t('auth.full_name')}</Label>
                <Input
                  id="modal-signup-name"
                  placeholder={t('auth.enter_name')}
                  value={signupFullName}
                  onChange={(e) => setSignupFullName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modal-signup-email">{t('auth.email')}</Label>
                <Input
                  id="modal-signup-email"
                  type="email"
                  placeholder={t('auth.email_placeholder')}
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modal-signup-password">{t('auth.password')}</Label>
                <Input
                  id="modal-signup-password"
                  type="password"
                  placeholder={t('auth.password_hint')}
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <Button
                type="submit"
                className="w-full border-none"
                disabled={isLoading}
                style={{ backgroundColor: '#ffffff', color: '#000000' }}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('auth.signup')}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
