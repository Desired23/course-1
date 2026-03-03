import { useRouter } from "../../components/Router"
import { useAuth } from "../../contexts/AuthContext"
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { Separator } from "../../components/ui/separator"
import { 
  Home, 
  BookOpen, 
  Search, 
  ShoppingCart, 
  User, 
  Settings, 
  BarChart3, 
  Users, 
  CreditCard,
  MessageSquare,
  Bell,
  Heart,
  HelpCircle,
  GraduationCap,
  Briefcase,
  Shield,
  FileText,
  DollarSign,
  Calendar
} from "lucide-react"

interface RouteInfo {
  path: string
  name: string
  description: string
  icon: any
  category: string
  requiredRoles?: string[]
}

export function NavigationPage() {
  const { navigate } = useRouter()
  const { user, hasRole } = useAuth()

  const routes: RouteInfo[] = [
    // Public Routes
    {
      path: "/",
      name: "Trang chủ",
      description: "Trang chủ chính của website",
      icon: Home,
      category: "Công khai"
    },
    {
      path: "/courses",
      name: "Khóa học",
      description: "Danh sách tất cả khóa học",
      icon: BookOpen,
      category: "Công khai"
    },
    {
      path: "/search",
      name: "Tìm kiếm",
      description: "Tìm kiếm khóa học",
      icon: Search,
      category: "Công khai"
    },
    {
      path: "/udemy-business",
      name: "Udemy Business",
      description: "Giải pháp doanh nghiệp",
      icon: Briefcase,
      category: "Công khai"
    },
    {
      path: "/teach",
      name: "Giảng dạy trên Udemy",
      description: "Trở thành giảng viên",
      icon: GraduationCap,
      category: "Công khai"
    },
    {
      path: "/blog",
      name: "Blog",
      description: "Tin tức và bài viết",
      icon: FileText,
      category: "Công khai"
    },
    {
      path: "/test",
      name: "Test Page",
      description: "Trang demo tính năng",
      icon: Settings,
      category: "Công khai"
    },

    // Authentication
    {
      path: "/login",
      name: "Đăng nhập",
      description: "Đăng nhập tài khoản",
      icon: User,
      category: "Xác thực"
    },
    {
      path: "/signup",
      name: "Đăng ký",
      description: "Tạo tài khoản mới",
      icon: User,
      category: "Xác thực"
    },

    // Student Routes
    {
      path: "/my-learning",
      name: "Học tập của tôi",
      description: "Các khóa học đã đăng ký",
      icon: BookOpen,
      category: "Học viên",
      requiredRoles: ["user"]
    },
    {
      path: "/cart",
      name: "Giỏ hàng",
      description: "Giỏ hàng của bạn",
      icon: ShoppingCart,
      category: "Học viên",
      requiredRoles: ["user"]
    },
    {
      path: "/checkout",
      name: "Thanh toán",
      description: "Trang thanh toán",
      icon: CreditCard,
      category: "Học viên",
      requiredRoles: ["user"]
    },
    {
      path: "/wishlist",
      name: "Danh sách yêu thích",
      description: "Khóa học yêu thích",
      icon: Heart,
      category: "Học viên",
      requiredRoles: ["user"]
    },
    {
      path: "/profile",
      name: "Hồ sơ",
      description: "Thông tin cá nhân",
      icon: User,
      category: "Học viên",
      requiredRoles: ["user"]
    },
    {
      path: "/notifications",
      name: "Thông báo",
      description: "Thông báo của bạn",
      icon: Bell,
      category: "Học viên",
      requiredRoles: ["user"]
    },
    {
      path: "/support",
      name: "Hỗ trợ",
      description: "Trung tâm hỗ trợ",
      icon: HelpCircle,
      category: "Học viên",
      requiredRoles: ["user"]
    },

    // Instructor Routes
    {
      path: "/instructor",
      name: "Dashboard Giảng viên",
      description: "Bảng điều khiển giảng viên",
      icon: BarChart3,
      category: "Giảng viên",
      requiredRoles: ["instructor"]
    },
    {
      path: "/instructor/courses",
      name: "Khóa học của tôi",
      description: "Quản lý khóa học",
      icon: BookOpen,
      category: "Giảng viên",
      requiredRoles: ["instructor"]
    },
    {
      path: "/instructor/earnings",
      name: "Thu nhập",
      description: "Theo dõi thu nhập",
      icon: DollarSign,
      category: "Giảng viên",
      requiredRoles: ["instructor"]
    },
    {
      path: "/instructor/profile",
      name: "Hồ sơ Giảng viên",
      description: "Chỉnh sửa hồ sơ giảng viên",
      icon: User,
      category: "Giảng viên",
      requiredRoles: ["instructor"]
    },

    // Admin Routes
    {
      path: "/admin",
      name: "Dashboard Admin",
      description: "Bảng điều khiển quản trị",
      icon: Shield,
      category: "Quản trị",
      requiredRoles: ["admin"]
    },
    {
      path: "/admin/statistics",
      name: "Thống kê",
      description: "Thống kê hệ thống",
      icon: BarChart3,
      category: "Quản trị",
      requiredRoles: ["admin"]
    },
    {
      path: "/admin/permissions",
      name: "Phân quyền",
      description: "Quản lý phân quyền",
      icon: Shield,
      category: "Quản trị",
      requiredRoles: ["admin"]
    },
    {
      path: "/admin/settings",
      name: "Cài đặt hệ thống",
      description: "Cài đặt nền tảng",
      icon: Settings,
      category: "Quản trị",
      requiredRoles: ["admin"]
    },
    {
      path: "/admin/payments/methods",
      name: "Phương thức thanh toán",
      description: "Quản lý phương thức thanh toán",
      icon: CreditCard,
      category: "Quản trị",
      requiredRoles: ["admin"]
    },
    {
      path: "/admin/subscriptions",
      name: "Đăng ký",
      description: "Quản lý đăng ký",
      icon: Calendar,
      category: "Quản trị",
      requiredRoles: ["admin"]
    }
  ]

  const categories = [...new Set(routes.map(route => route.category))]

  const canAccessRoute = (route: RouteInfo) => {
    if (!route.requiredRoles) return true
    if (!user) return false
    return route.requiredRoles.some(role => hasRole(role))
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-4">Điều hướng trang web</h1>
        <p className="text-muted-foreground">
          Trang này cho phép bạn truy cập nhanh vào tất cả các trang trong hệ thống. 
          Các trang yêu cầu quyền truy cập sẽ được đánh dấu và chỉ hiển thị khi bạn có quyền phù hợp.
        </p>
      </div>

      <div className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Thông tin người dùng hiện tại</CardTitle>
          </CardHeader>
          <CardContent>
            {user ? (
              <div className="space-y-2">
                <p><strong>Tên:</strong> {user.name}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <div>
                  <strong>Vai trò:</strong>
                  <div className="flex gap-2 mt-1">
                    {user.roles.map(role => (
                      <Badge key={role} variant="secondary">
                        {role === 'admin' ? 'Quản trị viên' :
                         role === 'instructor' ? 'Gi강사' :
                         role === 'user' ? 'Học viên' : role}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">Chưa đăng nhập</p>
            )}
          </CardContent>
        </Card>
      </div>

      {categories.map(category => {
        const categoryRoutes = routes.filter(route => route.category === category)
        
        return (
          <div key={category} className="mb-8">
            <h2 className="mb-4">{category}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryRoutes.map(route => {
                const canAccess = canAccessRoute(route)
                const Icon = route.icon
                
                return (
                  <Card 
                    key={route.path} 
                    className={`transition-all hover:shadow-md ${
                      !canAccess ? 'opacity-50' : ''
                    }`}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Icon className="h-5 w-5" />
                        {route.name}
                        {route.requiredRoles && (
                          <Badge variant="outline" className="ml-auto">
                            {route.requiredRoles.join(', ')}
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>{route.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {route.path}
                        </code>
                        <Button
                          size="sm"
                          onClick={() => navigate(route.path)}
                          disabled={!canAccess}
                        >
                          {canAccess ? 'Truy cập' : 'Không có quyền'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
            <Separator className="mt-6" />
          </div>
        )
      })}

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Lưu ý</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Một số trang có thể có routes động (như /course/[id]) - sử dụng TestPage để test</li>
              <li>• Các trang yêu cầu quyền sẽ chỉ hiển thị khi bạn có vai trò phù hợp</li>
              <li>• Để test với vai trò khác nhau, hãy sử dụng tính năng đổi vai trò trong TestPage</li>
              <li>• Một số routes có thể tái sử dụng components với tabs khác nhau</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}