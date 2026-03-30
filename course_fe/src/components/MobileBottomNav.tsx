import { Home, BookOpen, ShoppingCart, User, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useRouter } from './Router'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'

export function MobileBottomNav() {
  const { t } = useTranslation()
  const { navigate, currentRoute } = useRouter()
  const { isAuthenticated } = useAuth()
  const { cartItems } = useCart()

  const isActive = (path: string) => {
    if (path === '/' && currentRoute === '/') return true
    if (path !== '/' && currentRoute.startsWith(path)) return true
    return false
  }

  const navItems = [
    { id: 'home', label: t('mobile_bottom_nav.home'), icon: Home, path: '/' },
    { id: 'search', label: t('mobile_bottom_nav.search'), icon: Search, path: '/search' },
    { id: 'courses', label: t('mobile_bottom_nav.courses'), icon: BookOpen, path: isAuthenticated ? '/my-learning' : '/courses' },
    { id: 'cart', label: t('mobile_bottom_nav.cart'), icon: ShoppingCart, path: '/cart', badge: cartItems.length },
    { id: 'profile', label: t('mobile_bottom_nav.account'), icon: User, path: isAuthenticated ? '/profile' : '/login' },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border z-40">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)
          
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center flex-1 h-full relative transition-colors ${
                active
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="relative">
                <Icon className={`h-6 w-6 ${active ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 bg-primary text-primary-foreground text-[10px] rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[11px] mt-0.5 ${active ? 'font-medium' : ''}`}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
