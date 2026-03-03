import { useRouter } from "./Router"
import { Button } from "./ui/button"

export function HeaderSimple() {
  const { navigate } = useRouter()
  
  return (
    <header className="border-b bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center space-x-1 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
              <span className="text-primary-foreground font-bold">U</span>
            </div>
            <span className="font-bold text-xl">Udemy</span>
          </button>
          
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate('/login')}>Login</Button>
            <Button onClick={() => navigate('/signup')}>Sign Up</Button>
          </div>
        </div>
      </div>
    </header>
  )
}
