import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useRouter } from './Router'
import { useAuth } from '../contexts/AuthContext'
import { 
  Home, 
  BookOpen, 
  ShoppingCart, 
  User, 
  GraduationCap, 
  Settings, 
  HelpCircle,
  Menu,
  X,
  Search,
  Heart,
  Bell,
  Building2,
  BarChart3,
  Users,
  MessageSquare,
  Star,
  LogIn,
  UserPlus,
  Play,
  CreditCard,
  Shield,
  FileText,
  MapPin,
  Award,
  Activity,
  DollarSign,
  RefreshCw,
  Calendar,
  ChevronRight,
  TestTube,
  Crown,
  UserCheck,
  Globe,
  PlusCircle,
  Layout,
  PieChart,
  Tags,
  ClipboardList,
  Monitor,
  MessageCircle,
  Database,
  FolderOpen,
  MousePointer2,
  LayoutTemplate
} from 'lucide-react'

interface NavigationItem {
  id: string
  label: string
  path: string
  icon: React.ReactNode
  category: 'main' | 'student' | 'instructor' | 'admin' | 'other'
}

const navigationItems: NavigationItem[] = [
  // --- MAIN PAGES (Public/Core) ---
  { id: 'home', label: 'Trang chủ', path: '/', icon: <Home size={20} />, category: 'main' },
  { id: 'courses', label: 'Danh sách Khóa học', path: '/courses', icon: <BookOpen size={20} />, category: 'main' },
  { id: 'pricing', label: 'Bảng giá (Gói Pro)', path: '/pricing', icon: <DollarSign size={20} />, category: 'main' },
  { id: 'search', label: 'Tìm kiếm', path: '/search', icon: <Search size={20} />, category: 'main' },
  { id: 'enhanced-search', label: 'Tìm kiếm nâng cao', path: '/enhanced-search', icon: <Search size={20} />, category: 'main' },
  { id: 'business', label: 'Udemy Business', path: '/udemy-business', icon: <Building2 size={20} />, category: 'main' },
  { id: 'teach', label: 'Dạy học trên Udemy', path: '/teach', icon: <GraduationCap size={20} />, category: 'main' },
  { id: 'blog', label: 'Blog', path: '/blog', icon: <FileText size={20} />, category: 'main' },
  { id: 'forum', label: 'Diễn đàn cộng đồng', path: '/forum', icon: <MessageSquare size={20} />, category: 'main' },
  { id: 'login', label: 'Đăng nhập', path: '/login', icon: <LogIn size={20} />, category: 'main' },
  { id: 'signup', label: 'Đăng ký', path: '/signup', icon: <UserPlus size={20} />, category: 'main' },
  
  // --- STUDENT PAGES ---
  { id: 'my-learning', label: 'Học tập của tôi', path: '/my-learning', icon: <BookOpen size={20} />, category: 'student' },
  { id: 'cart', label: 'Giỏ hàng', path: '/cart', icon: <ShoppingCart size={20} />, category: 'student' },
  { id: 'wishlist', label: 'Danh sách yêu thích', path: '/wishlist', icon: <Heart size={20} />, category: 'student' },
  { id: 'user-subscriptions', label: 'Gói thành viên của tôi', path: '/user/subscriptions', icon: <Crown size={20} />, category: 'student' },
  { id: 'profile', label: 'Hồ sơ cá nhân', path: '/profile', icon: <User size={20} />, category: 'student' },
  { id: 'notifications', label: 'Thông báo', path: '/notifications', icon: <Bell size={20} />, category: 'student' },
  { id: 'checkout', label: 'Thanh toán khóa học', path: '/checkout', icon: <CreditCard size={20} />, category: 'student' },
  { id: 'sub-checkout-demo', label: 'Thanh toán Gói Pro (Demo)', path: '/checkout/subscription?planId=pro&billing=monthly', icon: <CreditCard size={20} />, category: 'student' },
  { id: 'course-player', label: 'Trình học (Demo)', path: '/course-player', icon: <Play size={20} />, category: 'student' },
  { id: 'certificates', label: 'Chứng chỉ của tôi', path: '/certificates', icon: <Award size={20} />, category: 'student' },
  { id: 'quiz', label: 'Bài kiểm tra (Demo)', path: '/quiz', icon: <TestTube size={20} />, category: 'student' },
  { id: 'reviews', label: 'Đánh giá của tôi', path: '/reviews', icon: <Star size={20} />, category: 'student' },
  { id: 'qna', label: 'Hỏi đáp', path: '/qna', icon: <MessageSquare size={20} />, category: 'student' },
  { id: 'support', label: 'Hỗ trợ', path: '/support', icon: <HelpCircle size={20} />, category: 'student' },
  { id: 'settings', label: 'Cài đặt tài khoản', path: '/settings', icon: <Settings size={20} />, category: 'student' },
  { id: 'activity-log', label: 'Nhật ký hoạt động', path: '/activity-log', icon: <Activity size={20} />, category: 'student' },

  // --- INSTRUCTOR PAGES ---
  { id: 'instructor', label: 'Dashboard Giảng viên', path: '/instructor', icon: <BarChart3 size={20} />, category: 'instructor' },
  // Courses
  { id: 'instructor-courses', label: 'Quản lý khóa học', path: '/instructor/courses', icon: <BookOpen size={20} />, category: 'instructor' },
  { id: 'instructor-create-course', label: 'Tạo khóa học mới', path: '/instructor/courses/create', icon: <PlusCircle size={20} />, category: 'instructor' },
  { id: 'instructor-course-landing', label: 'Trang Landing Page', path: '/instructor/course-landing', icon: <Layout size={20} />, category: 'instructor' },
  // Lessons
  { id: 'instructor-lessons', label: 'Quản lý bài học', path: '/instructor/lessons', icon: <Play size={20} />, category: 'instructor' },
  { id: 'instructor-lessons-create', label: 'Tạo bài học mới', path: '/instructor/lessons/create', icon: <PlusCircle size={20} />, category: 'instructor' },
  // Finance
  { id: 'instructor-earnings', label: 'Thu nhập tổng quan', path: '/instructor/earnings', icon: <DollarSign size={20} />, category: 'instructor' },
  { id: 'instructor-sub-revenue', label: 'Doanh thu từ Gói Pro', path: '/instructor/subscription-revenue', icon: <Crown size={20} />, category: 'instructor' },
  { id: 'instructor-payouts', label: 'Lịch sử thanh toán', path: '/instructor/payouts', icon: <CreditCard size={20} />, category: 'instructor' },
  // Tools & Analytics
  { id: 'instructor-analytics', label: 'Phân tích chi tiết', path: '/instructor/analytics', icon: <PieChart size={20} />, category: 'instructor' },
  { id: 'instructor-quizzes', label: 'Quản lý bài kiểm tra', path: '/instructor/quizzes', icon: <TestTube size={20} />, category: 'instructor' },
  { id: 'instructor-discounts', label: 'Mã giảm giá', path: '/instructor/discounts', icon: <Tags size={20} />, category: 'instructor' },
  { id: 'instructor-students', label: 'Danh sách học viên', path: '/instructor/students', icon: <Users size={20} />, category: 'instructor' },
  { id: 'instructor-communication', label: 'Giao tiếp học viên', path: '/instructor/communication', icon: <MessageCircle size={20} />, category: 'instructor' },
  { id: 'instructor-resources', label: 'Tài nguyên', path: '/instructor/resources', icon: <FolderOpen size={20} />, category: 'instructor' },
  { id: 'instructor-profile', label: 'Hồ sơ giảng viên', path: '/instructor/profile', icon: <User size={20} />, category: 'instructor' },
  { id: 'instructor-onboarding', label: 'Đăng ký giảng viên', path: '/instructor/onboarding', icon: <UserPlus size={20} />, category: 'instructor' },

  // --- ADMIN PAGES ---
  { id: 'admin', label: 'Admin Dashboard', path: '/admin', icon: <Settings size={20} />, category: 'admin' },
  // User Management
  { id: 'admin-users', label: 'Quản lý người dùng', path: '/admin/users', icon: <Users size={20} />, category: 'admin' },
  { id: 'admin-users-new', label: 'Thêm người dùng mới', path: '/admin/users/new', icon: <UserPlus size={20} />, category: 'admin' },
  { id: 'admin-instructor-apps', label: 'Đơn đăng ký giảng viên', path: '/admin/instructor-applications', icon: <ClipboardList size={20} />, category: 'admin' },
  // Content Management
  { id: 'admin-courses', label: 'Quản lý khóa học', path: '/admin/courses', icon: <BookOpen size={20} />, category: 'admin' },
  { id: 'admin-categories', label: 'Quản lý danh mục', path: '/admin/categories', icon: <Tags size={20} />, category: 'admin' },
  { id: 'admin-reviews', label: 'Quản lý đánh giá', path: '/admin/reviews', icon: <Star size={20} />, category: 'admin' },
  { id: 'admin-blog', label: 'Quản lý Blog', path: '/admin/blog', icon: <FileText size={20} />, category: 'admin' },
  { id: 'admin-forum', label: 'Quản lý Diễn đàn', path: '/admin/forum', icon: <MessageSquare size={20} />, category: 'admin' },
  // Finance & Subscription
  { id: 'admin-subscriptions', label: 'Quản lý Gói Subscription', path: '/admin/subscriptions', icon: <Calendar size={20} />, category: 'admin' },
  { id: 'admin-payments', label: 'Lịch sử giao dịch', path: '/admin/payments', icon: <CreditCard size={20} />, category: 'admin' },
  { id: 'admin-payment-methods', label: 'Phương thức thanh toán', path: '/admin/payments/methods', icon: <CreditCard size={20} />, category: 'admin' },
  { id: 'admin-refunds', label: 'Yêu cầu hoàn tiền', path: '/admin/refunds', icon: <RefreshCw size={20} />, category: 'admin' },
  { id: 'admin-discounts', label: 'Quản lý mã giảm giá', path: '/admin/discounts', icon: <Tags size={20} />, category: 'admin' },
  // System & Settings
  { id: 'admin-analytics', label: 'Phân tích hệ thống', path: '/admin/analytics', icon: <PieChart size={20} />, category: 'admin' },
  { id: 'admin-statistics', label: 'Thống kê tổng quan', path: '/admin/statistics', icon: <BarChart3 size={20} />, category: 'admin' },
  { id: 'admin-website', label: 'Quản lý giao diện Web', path: '/admin/website-management', icon: <Monitor size={20} />, category: 'admin' },
  { id: 'admin-home-layout', label: 'Bố cục trang chủ', path: '/admin/home-layout', icon: <LayoutTemplate size={20} />, category: 'admin' },
  { id: 'admin-settings', label: 'Cài đặt nền tảng', path: '/admin/settings', icon: <Settings size={20} />, category: 'admin' },
  { id: 'admin-website-settings', label: 'Cấu hình Website', path: '/admin/website-settings', icon: <Globe size={20} />, category: 'admin' },
  { id: 'admin-permissions', label: 'Phân quyền vai trò', path: '/admin/permissions', icon: <Shield size={20} />, category: 'admin' },
  { id: 'admin-reports', label: 'Báo cáo vi phạm', path: '/admin/reports', icon: <Shield size={20} />, category: 'admin' },
  { id: 'admin-activity', label: 'Nhật ký hệ thống', path: '/admin/activity-log', icon: <Activity size={20} />, category: 'admin' },
  { id: 'admin-backup', label: 'Sao lưu dữ liệu', path: '/admin/data-backup', icon: <Database size={20} />, category: 'admin' },
  
  // --- OTHER (Demos/Utility) ---
  { id: 'test', label: 'Trang Test', path: '/test', icon: <TestTube size={20} />, category: 'other' },
  { id: 'navigation', label: 'Sơ đồ điều hướng', path: '/navigation', icon: <MapPin size={20} />, category: 'other' },
  { id: 'blog-post', label: 'Xem bài viết mẫu', path: '/blog/react-hooks-guide', icon: <FileText size={20} />, category: 'other' },
  { id: 'advanced-features', label: 'Tính năng nâng cao (Demo)', path: '/advanced-features', icon: <Star size={20} />, category: 'other' },
]

const categoryLabels = {
  main: 'Chính',
  student: 'Học viên',
  instructor: 'Giảng viên',
  admin: 'Quản trị',
  other: 'Khác'
}

export function FloatingNavigation() {
  const [isOpen, setIsOpen] = useState(true)
  const [activeCategory, setActiveCategory] = useState<'main' | 'student' | 'instructor' | 'admin' | 'other'>('main')
  const [showTestLogin, setShowTestLogin] = useState(false)
  const { navigate } = useRouter()
  const auth = useAuth()
  const { user, login, logout, isAuthenticated, hasRole } = auth || {}

  const testUsers = [
    { email: 'john@example.com', name: 'John Doe (User)', roles: ['user'] },
    { email: 'jane@example.com', name: 'Jane Smith (Instructor)', roles: ['user', 'instructor'] },
    { email: 'admin@example.com', name: 'Admin User', roles: ['admin'] },
    { email: 'multi@example.com', name: 'Multi Role User', roles: ['user', 'instructor', 'admin'] }
  ]

  const handleTestLogin = async (email: string) => {
    await login(email, 'password')
    setShowTestLogin(false)
  }

  const handleNavigate = (path: string) => {
    navigate(path)
    setIsOpen(false)
  }

  const categories = ['main', 'student', 'instructor', 'admin', 'other'] as const
  
  const filteredItems = React.useMemo(() => {
    return navigationItems.filter(item => {
      // First filter by category
      if (item.category !== activeCategory) return false
      
      // Then filter by permissions
      switch (item.category) {
        case 'student':
          // Student pages require authentication
          return isAuthenticated || false
          
        case 'instructor':
          // Instructor pages require instructor role or admin
          return hasRole?.('instructor') || hasRole?.('admin') || false
          
        case 'admin':
          // Admin pages require admin role
          return hasRole?.('admin') || false
          
        case 'main':
          // Main pages are mostly public, but some require auth logic (hide login if logged in)
          if (['login', 'signup'].includes(item.id)) {
            return !(isAuthenticated || false)
          }
          return true
          
        default:
          return true
      }
    })
  }, [activeCategory, isAuthenticated, hasRole, auth])

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-16 right-0 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden max-h-[80vh] flex flex-col"
          >
            {/* User Status */}
            <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isAuthenticated ? (
                    <>
                      <UserCheck size={16} className="text-green-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {user?.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {user?.roles.join(', ')}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <User size={16} className="text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Chưa đăng nhập
                      </span>
                    </>
                  )}
                </div>
                <div className="flex gap-1">
                  {isAuthenticated ? (
                    <button
                      onClick={logout}
                      className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Đăng xuất
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowTestLogin(!showTestLogin)}
                      className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Test Login
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Test Login Panel */}
            {showTestLogin && !isAuthenticated && (
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  Chọn tài khoản test:
                </p>
                <div className="space-y-1">
                  {testUsers.map((testUser) => (
                    <button
                      key={testUser.email}
                      onClick={() => handleTestLogin(testUser.email)}
                      className="w-full flex items-center gap-2 px-2 py-1 text-xs text-left hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                    >
                      {testUser.roles.includes('admin') && <Crown size={12} className="text-yellow-500" />}
                      {testUser.roles.includes('instructor') && !testUser.roles.includes('admin') && <GraduationCap size={12} className="text-blue-500" />}
                      {testUser.roles.includes('user') && !testUser.roles.includes('instructor') && !testUser.roles.includes('admin') && <User size={12} className="text-gray-500" />}
                      <span className="text-gray-900 dark:text-gray-100">
                        {testUser.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Category Tabs */}
            <div className="flex bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 overflow-x-auto scrollbar-hide">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`flex-none px-3 py-3 text-xs transition-colors whitespace-nowrap ${
                    activeCategory === category
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {categoryLabels[category]}
                </button>
              ))}
            </div>

            {/* Navigation Items */}
            <div className="overflow-y-auto flex-1 custom-scrollbar">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <motion.button
                    key={item.id}
                    onClick={() => handleNavigate(item.path)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 group"
                    whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.05)' }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="text-gray-500 dark:text-gray-400 group-hover:text-blue-500 transition-colors">
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-gray-900 dark:text-gray-100 block text-sm font-medium truncate">
                        {item.label}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate block opacity-70">
                        {item.path}
                      </span>
                    </div>
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-400" />
                  </motion.button>
                ))
              ) : (
                <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  <p className="text-sm">Không có trang nào trong danh mục này</p>
                  <p className="text-xs mt-1 opacity-70">(Cần quyền truy cập phù hợp)</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="flex justify-between items-center text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <span>{categoryLabels[activeCategory]} ({filteredItems.length})</span>
                <span>Tổng: {navigationItems.length}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors relative z-50"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={{ rotate: isOpen ? 90 : 0 }}
        transition={{ duration: 0.2 }}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </motion.button>

      {/* Badge - showing total pages count */}
      {!isOpen && (
        <div className="absolute -top-2 -left-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs shadow-lg animate-bounce">
          {navigationItems.length}
        </div>
      )}

      {/* Active category indicator */}
      {isOpen && (
        <div className="absolute -top-8 right-0 px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full shadow-lg">
          {categoryLabels[activeCategory]}
        </div>
      )}
    </div>
  )
}
