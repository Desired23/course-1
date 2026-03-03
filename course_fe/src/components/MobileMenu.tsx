import { useState } from "react"
import { useRouter } from "./Router"
import { useAuth } from "../contexts/AuthContext"
import { useUIStore } from "../stores"
import { Button } from "./ui/button"
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
  { id: 'development', name: 'Development', icon: Code, color: 'text-purple-500' },
  { id: 'business', name: 'Business', icon: Briefcase, color: 'text-blue-500' },
  { id: 'design', name: 'Design', icon: Palette, color: 'text-pink-500' },
  { id: 'marketing', name: 'Marketing', icon: Megaphone, color: 'text-orange-500' },
  { id: 'photography', name: 'Photography', icon: Camera, color: 'text-green-500' },
  { id: 'music', name: 'Music', icon: Music, color: 'text-red-500' },
  { id: 'fitness', name: 'Health & Fitness', icon: Dumbbell, color: 'text-yellow-500' },
  { id: 'teaching', name: 'Teaching & Academics', icon: Book, color: 'text-indigo-500' },
]

export function MobileMenu() {
  const [open, setOpen] = useState(false)
  const { navigate } = useRouter()
  const { user, logout, hasRole } = useAuth()
  const { darkMode, toggleTheme } = useUIStore()

  const handleNavigate = (path: string) => {
    navigate(path)
    setOpen(false) // Close menu after navigation
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
            {/* User Section */}
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
                    User profile and navigation menu
                  </SheetDescription>
                </>
              ) : (
                <div className="space-y-2">
                  <SheetTitle>Welcome!</SheetTitle>
                  <SheetDescription className="sr-only">
                    Login or sign up to access your account
                  </SheetDescription>
                  <div className="flex gap-2">
                    <Button 
                      variant="default" 
                      className="flex-1" 
                      onClick={() => handleNavigate('/login')}
                    >
                      <LogIn className="h-4 w-4 mr-2" />
                      Log in
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => handleNavigate('/signup')}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Sign up
                    </Button>
                  </div>
                </div>
              )}
            </SheetHeader>

            <Separator />

            {/* Main Navigation */}
            <div className="flex-1 py-4">
              {/* General Links */}
              <div className="px-3 mb-4">
                <div className="text-xs font-semibold text-muted-foreground px-3 mb-2">
                  MENU
                </div>
                <nav className="space-y-1">
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => handleNavigate('/')}
                  >
                    <Home className="h-4 w-4 mr-3" />
                    Home
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => handleNavigate('/courses')}
                  >
                    <BookOpen className="h-4 w-4 mr-3" />
                    All Courses
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => handleNavigate('/search')}
                  >
                    <Search className="h-4 w-4 mr-3" />
                    Search
                  </Button>
                </nav>
              </div>

              {/* User Links (if logged in) */}
              {user && (
                <>
                  <Separator className="my-4" />
                  <div className="px-3 mb-4">
                    <div className="text-xs font-semibold text-muted-foreground px-3 mb-2">
                      MY LEARNING
                    </div>
                    <nav className="space-y-1">
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleNavigate('/my-learning')}
                      >
                        <GraduationCap className="h-4 w-4 mr-3" />
                        My Courses
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleNavigate('/wishlist')}
                      >
                        <Heart className="h-4 w-4 mr-3" />
                        Wishlist
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleNavigate('/cart')}
                      >
                        <ShoppingCart className="h-4 w-4 mr-3" />
                        Shopping Cart
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleNavigate('/notifications')}
                      >
                        <Bell className="h-4 w-4 mr-3" />
                        Notifications
                      </Button>
                    </nav>
                  </div>
                </>
              )}

              {/* Instructor Links */}
              {user && hasRole('instructor') && (
                <>
                  <Separator className="my-4" />
                  <div className="px-3 mb-4">
                    <div className="text-xs font-semibold text-muted-foreground px-3 mb-2">
                      INSTRUCTOR
                    </div>
                    <nav className="space-y-1">
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleNavigate('/instructor')}
                      >
                        <BarChart3 className="h-4 w-4 mr-3" />
                        Dashboard
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleNavigate('/instructor/courses')}
                      >
                        <BookOpen className="h-4 w-4 mr-3" />
                        My Courses
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleNavigate('/instructor/earnings')}
                      >
                        <DollarSign className="h-4 w-4 mr-3" />
                        Earnings
                      </Button>
                    </nav>
                  </div>
                </>
              )}

              {/* Admin Links */}
              {user && hasRole('admin') && (
                <>
                  <Separator className="my-4" />
                  <div className="px-3 mb-4">
                    <div className="text-xs font-semibold text-muted-foreground px-3 mb-2">
                      ADMIN
                    </div>
                    <nav className="space-y-1">
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleNavigate('/admin')}
                      >
                        <BarChart3 className="h-4 w-4 mr-3" />
                        Dashboard
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleNavigate('/admin/users')}
                      >
                        <User className="h-4 w-4 mr-3" />
                        Users
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleNavigate('/admin/courses')}
                      >
                        <BookOpen className="h-4 w-4 mr-3" />
                        Courses
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleNavigate('/admin/settings')}
                      >
                        <Settings className="h-4 w-4 mr-3" />
                        Settings
                      </Button>
                    </nav>
                  </div>
                </>
              )}

              {/* Categories */}
              <Separator className="my-4" />
              <div className="px-3 mb-4">
                <div className="text-xs font-semibold text-muted-foreground px-3 mb-2">
                  CATEGORIES
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
                        {category.name}
                        <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
                      </Button>
                    )
                  })}
                </nav>
              </div>

              {/* Business Links */}
              <Separator className="my-4" />
              <div className="px-3 mb-4">
                <div className="text-xs font-semibold text-muted-foreground px-3 mb-2">
                  BUSINESS
                </div>
                <nav className="space-y-1">
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => handleNavigate('/udemy-business')}
                  >
                    <Briefcase className="h-4 w-4 mr-3" />
                    Udemy Business
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => handleNavigate('/teach')}
                  >
                    <Sparkles className="h-4 w-4 mr-3" />
                    Teach on Udemy
                  </Button>
                </nav>
              </div>
            </div>

            {/* Bottom Section */}
            <div className="border-t p-4 space-y-2">
              {/* Theme Toggle */}
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
                {darkMode ? 'Light Mode' : 'Dark Mode'}
              </Button>

              {user && (
                <>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => handleNavigate('/profile')}
                  >
                    <User className="h-4 w-4 mr-3" />
                    Profile
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => handleNavigate('/account-settings')}
                  >
                    <Settings className="h-4 w-4 mr-3" />
                    Settings
                  </Button>
                  <Separator className="my-2" />
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-destructive hover:text-destructive"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4 mr-3" />
                    Log out
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