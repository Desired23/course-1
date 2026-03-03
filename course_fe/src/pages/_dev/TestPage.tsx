import { Button } from "../../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { 
  Bell, 
  MessageCircle, 
  BookOpen, 
  Users, 
  Star, 
  TrendingUp, 
  Settings, 
  BarChart3, 
  CreditCard, 
  Shield, 
  FileText, 
  User,
  Crown
} from 'lucide-react'
import { useRouter } from "../../components/Router"
import { useAuth } from "../../contexts/AuthContext"
import { useNotifications } from "../../contexts/NotificationContext"
import { useChat } from "../../contexts/ChatContext"

export function TestPage() {
  const { navigate } = useRouter()
  const { user, isAuthenticated } = useAuth()
  const { state: notificationState, addNotification } = useNotifications()
  const { state: chatState, openChat } = useChat()

  const testPages = [
    // Student pages
    { path: '/my-learning', name: 'My Learning', icon: BookOpen, description: 'View enrolled courses and progress' },
    { path: '/wishlist', name: 'Wishlist', icon: Star, description: 'Saved courses for later' },
    { path: '/notifications', name: 'Notifications', icon: Bell, description: 'Stay updated with course notifications' },
    { path: '/support', name: 'Support', icon: Users, description: 'Get help and contact support' },
    { path: '/qna/1', name: 'Q&A Page', icon: MessageCircle, description: 'Course Q&A discussions' },
    { path: '/reviews/1', name: 'Course Reviews', icon: Star, description: 'Read and write course reviews' },
    
    // Instructor pages
    { path: '/instructor', name: 'Instructor Dashboard', icon: TrendingUp, description: 'Instructor overview and analytics' },
    { path: '/instructor/courses', name: 'My Courses', icon: BookOpen, description: 'Manage your published courses' },
    { path: '/instructor/lessons/1', name: 'Course Curriculum', icon: BookOpen, description: 'Edit course content and lessons' },
    { path: '/instructor/earnings', name: 'Earnings', icon: TrendingUp, description: 'Revenue and performance tracking' },
    { path: '/instructor/payouts', name: 'Payouts', icon: TrendingUp, description: 'Manage payment methods and history' },
    { path: '/instructor/profile', name: 'Instructor Profile', icon: User, description: 'Customizable instructor profile' },
    
    // Advanced Features
    { path: '/blog', name: 'Blog & Articles', icon: FileText, description: 'Community blog with approval system' },
    { path: '/admin/statistics', name: 'Platform Statistics', icon: BarChart3, description: 'Advanced analytics and charts' },
    { path: '/admin/permissions', name: 'Permissions Manager', icon: Shield, description: 'Multi-role permission system' },
    { path: '/admin/settings', name: 'Platform Settings', icon: Settings, description: 'Configure platform policies and settings' },
    { path: '/admin/payments/methods', name: 'Payment Methods', icon: CreditCard, description: 'Manage payment processors and gateways' },
    { path: '/admin/subscriptions', name: 'Subscriptions', icon: Crown, description: 'Advanced subscription management' },
    
    // Other pages
    { path: '/search', name: 'Search Page', icon: BookOpen, description: 'Advanced course search with filters' },
    { path: '/admin', name: 'Admin Dashboard', icon: Users, description: 'Admin panel (admin role only)' }
  ]

  const handleTestNotification = () => {
    addNotification({
      type: 'info',
      title: 'Test Notification',
      message: 'This is a test notification to demo the system!'
    })
  }

  const handleTestChat = () => {
    openChat()
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-4">Udemy Clone - Test Dashboard</h1>
          <p className="text-muted-foreground mb-6">
            Welcome to the enhanced Udemy clone with advanced features! This version includes:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-2">
              <h3 className="font-semibold text-green-600">✓ Multi-Role System</h3>
              <p className="text-sm text-muted-foreground">Unknown, User, Instructor, Admin with customizable permissions</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-blue-600">✓ Advanced Analytics</h3>
              <p className="text-sm text-muted-foreground">Charts, statistics, and comprehensive reporting</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-purple-600">✓ Blog System</h3>
              <p className="text-sm text-muted-foreground">Content creation with admin approval workflow</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-orange-600">✓ Payment Systems</h3>
              <p className="text-sm text-muted-foreground">Multiple gateways, subscriptions, and payout management</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-red-600">✓ Platform Settings</h3>
              <p className="text-sm text-muted-foreground">Comprehensive configuration and policy management</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-cyan-600">✓ Enhanced Profiles</h3>
              <p className="text-sm text-muted-foreground">Customizable instructor profiles with sections</p>
            </div>
          </div>
          
          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Users className="h-6 w-6 text-blue-500" />
                  <span className="font-medium">Authentication</span>
                </div>
                {isAuthenticated ? (
                  <Badge className="bg-green-500 hover:bg-green-600">
                    Logged in as {user?.name}
                  </Badge>
                ) : (
                  <Badge variant="outline">Not logged in</Badge>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Bell className="h-6 w-6 text-purple-500" />
                  <span className="font-medium">Notifications</span>
                </div>
                <Badge variant="secondary">
                  {notificationState.unreadCount} unread
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <MessageCircle className="h-6 w-6 text-green-500" />
                  <span className="font-medium">Chat</span>
                </div>
                <Badge variant="secondary">
                  {chatState.totalUnreadCount} unread messages
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <BookOpen className="h-6 w-6 text-orange-500" />
                  <span className="font-medium">Dark/Light Mode</span>
                </div>
                <Badge variant="outline">Toggle in header</Badge>
              </CardContent>
            </Card>
          </div>

          {/* User Roles & Permissions */}
          {isAuthenticated && user && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Your Roles & Permissions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Active Roles:</p>
                    <div className="flex flex-wrap gap-2">
                      {user.roles.map((role) => (
                        <Badge key={role} variant={
                          role === 'admin' ? 'destructive' : 
                          role === 'instructor' ? 'default' : 'secondary'
                        }>
                          {role}
                          {user.adminLevel && role === 'admin' && ` (${user.adminLevel})`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Permissions:</p>
                    <p className="text-sm text-muted-foreground">
                      {user.permissions.length} permissions assigned
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {user.permissions.slice(0, 6).map((permission) => (
                        <Badge key={permission} variant="outline" className="text-xs">
                          {permission.split('.').pop()}
                        </Badge>
                      ))}
                      {user.permissions.length > 6 && (
                        <Badge variant="outline" className="text-xs">
                          +{user.permissions.length - 6} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Test Actions */}
          <div className="flex gap-4 mb-8">
            <Button onClick={handleTestNotification}>
              <Bell className="h-4 w-4 mr-2" />
              Test Notification
            </Button>
            <Button onClick={handleTestChat} variant="outline">
              <MessageCircle className="h-4 w-4 mr-2" />
              Open Chat
            </Button>
            <Button onClick={() => navigate('/login')} variant="outline">
              Login Page
            </Button>
          </div>
        </div>

        {/* Available Pages */}
        <div>
          <h2 className="mb-6">Available Pages & Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testPages.map((page) => {
              const IconComponent = page.icon
              return (
                <Card key={page.path} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(page.path)}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                      <IconComponent className="h-5 w-5" />
                      {page.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      {page.description}
                    </p>
                    <Button size="sm" className="w-full">
                      Visit Page
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Features List */}
        <div className="mt-12">
          <h2 className="mb-6">Implemented Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>🎓 Student Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600">✓</Badge>
                  <span>My Learning dashboard with progress tracking</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600">✓</Badge>
                  <span>Wishlist with course management</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600">✓</Badge>
                  <span>Real-time notifications system</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600">✓</Badge>
                  <span>Support tickets and FAQ</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600">✓</Badge>
                  <span>Q&A discussions with instructors</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600">✓</Badge>
                  <span>Course reviews and ratings</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>👨‍🏫 Instructor Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600">✓</Badge>
                  <span>Instructor dashboard with analytics</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600">✓</Badge>
                  <span>Course management and editing</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600">✓</Badge>
                  <span>Lesson curriculum builder</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600">✓</Badge>
                  <span>Earnings tracking and analytics</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600">✓</Badge>
                  <span>Payout management system</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600">✓</Badge>
                  <span>Revenue charts and reports</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>💬 Communication</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600">✓</Badge>
                  <span>Real-time chat system</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600">✓</Badge>
                  <span>Notification center with categories</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600">✓</Badge>
                  <span>Message conversations</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600">✓</Badge>
                  <span>Online status indicators</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>🔧 Technical Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600">✓</Badge>
                  <span>Dark/Light theme switching</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600">✓</Badge>
                  <span>Responsive design</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600">✓</Badge>
                  <span>Advanced search with filters</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600">✓</Badge>
                  <span>Context-based state management</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600">✓</Badge>
                  <span>Dynamic routing system</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}