import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useModal } from '../../stores/modal.store'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { toast } from 'sonner@2.0.3'
import { Loader2 } from 'lucide-react'

export function AuthModal() {
  const { login, signup, error: authError, clearError } = useAuth()
  const { isOpen, close, data } = useModal('login')
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('login')

  // Login form states
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Signup form states
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
        toast.success('Đăng nhập thành công')
        resetForms()
        close()
        if (data?.onSuccess) {
          data.onSuccess()
        }
      } else {
        toast.error(authError || 'Sai tên đăng nhập hoặc mật khẩu')
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra')
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
        toast.success('Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.', { duration: 6000 })
        resetForms()
        setActiveTab('login')
      } else {
        toast.error(authError || 'Đăng ký thất bại')
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { resetForms(); close() } }}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">
            {activeTab === 'login' ? 'Chào mừng trở lại' : 'Tạo tài khoản'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {activeTab === 'login' 
              ? 'Nhập thông tin đăng nhập để truy cập tài khoản' 
              : 'Nhập thông tin để tạo tài khoản mới'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); clearError() }} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="login">Đăng nhập</TabsTrigger>
            <TabsTrigger value="signup">Đăng ký</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="modal-username">Tên đăng nhập</Label>
                <Input 
                  id="modal-username" 
                  type="text" 
                  placeholder="Nhập tên đăng nhập"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  required 
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="modal-password">Mật khẩu</Label>
                  <Button variant="link" className="p-0 h-auto text-xs" type="button">
                    Quên mật khẩu?
                  </Button>
                </div>
                <Input 
                  id="modal-password" 
                  type="password" 
                  placeholder="Nhập mật khẩu"
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
                Đăng nhập
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="modal-signup-username">Tên đăng nhập</Label>
                <Input 
                  id="modal-signup-username" 
                  placeholder="Nhập tên đăng nhập"
                  value={signupUsername}
                  onChange={(e) => setSignupUsername(e.target.value)}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modal-signup-name">Họ và tên</Label>
                <Input 
                  id="modal-signup-name" 
                  placeholder="Nguyễn Văn A"
                  value={signupFullName}
                  onChange={(e) => setSignupFullName(e.target.value)}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modal-signup-email">Email</Label>
                <Input 
                  id="modal-signup-email" 
                  type="email" 
                  placeholder="name@example.com"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modal-signup-password">Mật khẩu</Label>
                <Input 
                  id="modal-signup-password" 
                  type="password" 
                  placeholder="Tối thiểu 8 ký tự"
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
                Đăng ký
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}