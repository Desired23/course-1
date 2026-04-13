import { useState } from "react"
import { useRouter } from "./Router"
import { useAuth } from "../contexts/AuthContext"
import { useUIStore } from "../stores"
import { Button } from "./ui/button"
import { useTranslation } from "react-i18next"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet"
import { ScrollArea } from "./ui/scroll-area"
import { Separator } from "./ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Badge } from "./ui/badge"
import {
  Menu,
  Home,
  BookOpen,
  Search,
  ShoppingCart,
  Heart,
  User,
  Bell,
  Settings,
  LogOut,
  LogIn,
  UserPlus,
  GraduationCap,
  BarChart3,
  DollarSign,
  MessageSquare,
  Briefcase,
  ChevronRight,
  Sun,
  Moon,
  Palette,
  Code,
  Megaphone,
  Camera,
  Music,
  Dumbbell,
  Book,
  Sparkles
} from 'lucide-react'

const categories = [
  { id: 'development', nameKey: 'mobile_menu.categories.development', icon: Code, color: 'text-purple-500' },
  { id: 'business', nameKey: 'mobile_menu.categories.business', icon: Briefcase, color: 'text-blue-500' },
  { id: 'design', nameKey: 'mobile_menu.categories.design', icon: Palette, color: 'text-pink-500' },
  { id: 'marketing', nameKey: 'mobile_menu.categories.marketing', icon: Megaphone, color: 'text-orange-500' },
  { id: 'photography', nameKey: 'mobile_menu.categories.photography', icon: Camera, color: 'text-green-500' },
  { id: 'music', nameKey: 'mobile_menu.categories.music', icon: Music, color: 'text-red-500' },
  { id: 'fitness', nameKey: 'mobile_menu.categories.fitness', icon: Dumbbell, color: 'text-yellow-500' },
  { id: 'teaching', nameKey: 'mobile_menu.categories.teaching', icon: Book, color: 'text-indigo-500' },
]

export function MobileMenu() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const { navigate } = useRouter()
  const { user, logout, hasRole } = useAuth()
  const { darkMode, toggleTheme } = useUIStore()

  const handleNavigate = (path: string) => {
    navigate(path)
    setOpen(false)
  }

  const handleLogout = () => {
    logout()
    navigate('/')
    setOpen(false)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0">
        <ScrollArea className="h-full">
          <div className="flex flex-col h-full">

            <SheetHeader className="p-6 pb-4">
              {user ? (
                <>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <SheetTitle className="text-base">{user.name}</SheetTitle>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <div className="flex gap-1 mt-1">
                        {user.roles?.map((role) => (
                          <Badge key={role} variant="secondary" className="text-xs">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <SheetDescription className="sr-only">
                    {t('mobile_menu.user_menu_description')}
                  </SheetDescription>
                </>
              ) : (
                <div className="space-y-2">
                  <SheetTitle>{t('mobile_menu.welcome')}</SheetTitle>
                  <SheetDescription className="sr-only">
                    {t('mobile_menu.auth_description')}
                  </SheetDescription>
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      className="flex-1"
                      onClick={() => handleNavigate('/login')}
                    >
                      <LogIn className="h-4 w-4 mr-2" />
                      {t('auth.login')}
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleNavigate('/signup')}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      {t('auth.signup')}
                    </Button>
                  </div>
                </div>
              )}
            </SheetHeader>

            <Separator />


            <div className="flex-1 py-4">

              <div className="px-3 mb-4">
                <div className="text-xs font-semibold text-muted-foreground px-3 mb-2">
                  {t('mobile_menu.sections.menu')}
                </div>
                <nav className="space-y-1">
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => handleNavigate('/')}
                  >
                    <Home className="h-4 w-4 mr-3" />
                    {t('sidebar.home')}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => handleNavigate('/courses')}
                  >
                    <BookOpen className="h-4 w-4 mr-3" />
                    {t('mobile_menu.all_courses')}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => handleNavigate('/search')}
                  >
                    <Search className="h-4 w-4 mr-3" />
                    {t('common.search')}
                  </Button>
                </nav>
              </div>


              {user && (
                <>
                  <Separator className="my-4" />
                  <div className="px-3 mb-4">
                    <div className="text-xs font-semibold text-muted-foreground px-3 mb-2">
                      {t('mobile_menu.sections.my_learning')}
                    </div>
                    <nav className="space-y-1">
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleNavigate('/my-learning')}
                      >
                        <GraduationCap className="h-4 w-4 mr-3" />
                        {t('common.my_courses')}
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleNavigate('/wishlist')}
                      >
                        <Heart className="h-4 w-4 mr-3" />
                        {t('mobile_menu.wishlist')}
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleNavigate('/cart')}
                      >
                        <ShoppingCart className="h-4 w-4 mr-3" />
                        {t('bottom_nav.cart')}
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleNavigate('/notifications')}
                      >
                        <Bell className="h-4 w-4 mr-3" />
                        {t('mobile_menu.notifications')}
                      </Button>
                    </nav>
                  </div>
                </>
              )}


              {user && hasRole('instructor') && (
                <>
                  <Separator className="my-4" />
                  <div className="px-3 mb-4">
                    <div className="text-xs font-semibold text-muted-foreground px-3 mb-2">
                      {t('mobile_menu.sections.instructor')}
                    </div>
                    <nav className="space-y-1">
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleNavigate('/instructor')}
                      >
                        <BarChart3 className="h-4 w-4 mr-3" />
                        {t('common.dashboard')}
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleNavigate('/instructor/courses')}
                      >
                        <BookOpen className="h-4 w-4 mr-3" />
                        {t('common.my_courses')}
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleNavigate('/instructor/earnings')}
                      >
                        <DollarSign className="h-4 w-4 mr-3" />
                        {t('mobile_menu.earnings')}
                      </Button>
                    </nav>
                  </div>
                </>
              )}


              {user && hasRole('admin') && (
                <>
                  <Separator className="my-4" />
                  <div className="px-3 mb-4">
                    <div className="text-xs font-semibold text-muted-foreground px-3 mb-2">
                      {t('mobile_menu.sections.admin')}
                    </div>
                    <nav className="space-y-1">
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleNavigate('/admin')}
                      >
                        <BarChart3 className="h-4 w-4 mr-3" />
                        {t('common.dashboard')}
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleNavigate('/admin/users')}
                      >
                        <User className="h-4 w-4 mr-3" />
                        {t('sidebar.users')}
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleNavigate('/admin/courses')}
                      >
                        <BookOpen className="h-4 w-4 mr-3" />
                        {t('common.courses')}
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleNavigate('/admin/settings')}
                      >
                        <Settings className="h-4 w-4 mr-3" />
                        {t('sidebar.settings')}
                      </Button>
                    </nav>
                  </div>
                </>
              )}


              <Separator className="my-4" />
              <div className="px-3 mb-4">
                <div className="text-xs font-semibold text-muted-foreground px-3 mb-2">
                  {t('mobile_menu.sections.categories')}
                </div>
                <nav className="space-y-1">
                  {categories.map((category) => {
                    const Icon = category.icon
                    return (
                      <Button
                        key={category.id}
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleNavigate(`/courses?category=${category.id}`)}
                      >
                        <Icon className={`h-4 w-4 mr-3 ${category.color}`} />
                        {t(category.nameKey)}
                        <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
                      </Button>
                    )
                  })}
                </nav>
              </div>


              <Separator className="my-4" />
              <div className="px-3 mb-4">
                <div className="text-xs font-semibold text-muted-foreground px-3 mb-2">
                  {t('mobile_menu.sections.business')}
                </div>
                <nav className="space-y-1">
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => handleNavigate('/udemy-business')}
                  >
                    <Briefcase className="h-4 w-4 mr-3" />
                    {t('common.udemy_business')}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => handleNavigate('/teach')}
                  >
                    <Sparkles className="h-4 w-4 mr-3" />
                    {t('common.teach_on_udemy')}
                  </Button>
                </nav>
              </div>
            </div>


            <div className="border-t p-4 space-y-2">

              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={toggleTheme}
              >
                {darkMode ? (
                  <Sun className="h-4 w-4 mr-3" />
                ) : (
                  <Moon className="h-4 w-4 mr-3" />
                )}
                {darkMode ? t('mobile_menu.light_mode') : t('mobile_menu.dark_mode')}
              </Button>

              {user && (
                <>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => handleNavigate('/profile')}
                  >
                    <User className="h-4 w-4 mr-3" />
                    {t('common.profile')}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => handleNavigate('/account-settings')}
                  >
                    <Settings className="h-4 w-4 mr-3" />
                    {t('sidebar.settings')}
                  </Button>
                  <Separator className="my-2" />
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-destructive hover:text-destructive"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4 mr-3" />
                    {t('common.log_out')}
                  </Button>
                </>
              )}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
