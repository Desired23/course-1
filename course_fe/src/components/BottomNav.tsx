import { Home, Search, ShoppingCart, BookOpen, User } from 'lucide-react'
import { useRouter } from './Router'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import { Badge } from './ui/badge'

export function BottomNav() {
  const { navigate, currentRoute } = useRouter()
  const { isAuthenticated } = useAuth()
  const { cartItems } = useCart()

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Search, label: 'Search', path: '/search' },
    { 
      icon: ShoppingCart, 
      label: 'Cart', 
      path: '/cart',
      badge: cartItems.length > 0 ? cartItems.length : undefined
    },
    { 
      icon: BookOpen, 
      label: 'My Learning', 
      path: '/my-learning',
      requireAuth: true
    },
    { 
      icon: User, 
      label: isAuthenticated ? 'Account' : 'Login', 
      path: isAuthenticated ? '/profile' : '/login'
    },
  ]

  // Filter items based on auth
  const filteredItems = navItems.filter(item => !item.requireAuth || isAuthenticated)

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t z-50">
      <div className="flex items-center justify-around h-16">
        {filteredItems.map((item) => {
          const Icon = item.icon
          const isActive = currentRoute === item.path
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors relative ${
                isActive 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {item.badge && (
                  <Badge className="absolute -top-2 -right-2 w-4 h-4 p-0 flex items-center justify-center text-[10px]">
                    {item.badge}
                  </Badge>
                )}
              </div>
              <span className="text-xs mt-1">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
