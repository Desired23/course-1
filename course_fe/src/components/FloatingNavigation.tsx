import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslation } from 'react-i18next'
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
  labelKey: string
  path: string
  icon: React.ReactNode
  category: 'main' | 'student' | 'instructor' | 'admin' | 'other'
}

const navigationItems: NavigationItem[] = [

  { id: 'home', labelKey: 'floating_navigation.items.home', path: '/', icon: <Home size={20} />, category: 'main' },
  { id: 'courses', labelKey: 'floating_navigation.items.courses', path: '/courses', icon: <BookOpen size={20} />, category: 'main' },
  { id: 'pricing', labelKey: 'floating_navigation.items.pricing', path: '/pricing', icon: <DollarSign size={20} />, category: 'main' },
  { id: 'search', labelKey: 'floating_navigation.items.search', path: '/search', icon: <Search size={20} />, category: 'main' },
  { id: 'enhanced-search', labelKey: 'floating_navigation.items.enhanced_search', path: '/enhanced-search', icon: <Search size={20} />, category: 'main' },
  { id: 'business', labelKey: 'floating_navigation.items.business', path: '/udemy-business', icon: <Building2 size={20} />, category: 'main' },
  { id: 'teach', labelKey: 'floating_navigation.items.teach', path: '/teach', icon: <GraduationCap size={20} />, category: 'main' },
  { id: 'blog', labelKey: 'floating_navigation.items.blog', path: '/blog', icon: <FileText size={20} />, category: 'main' },
  { id: 'forum', labelKey: 'floating_navigation.items.forum', path: '/forum', icon: <MessageSquare size={20} />, category: 'main' },
  { id: 'login', labelKey: 'floating_navigation.items.login', path: '/login', icon: <LogIn size={20} />, category: 'main' },
  { id: 'signup', labelKey: 'floating_navigation.items.signup', path: '/signup', icon: <UserPlus size={20} />, category: 'main' },


  { id: 'my-learning', labelKey: 'floating_navigation.items.my_learning', path: '/my-learning', icon: <BookOpen size={20} />, category: 'student' },
  { id: 'cart', labelKey: 'floating_navigation.items.cart', path: '/cart', icon: <ShoppingCart size={20} />, category: 'student' },
  { id: 'wishlist', labelKey: 'floating_navigation.items.wishlist', path: '/wishlist', icon: <Heart size={20} />, category: 'student' },
  { id: 'user-subscriptions', labelKey: 'floating_navigation.items.user_subscriptions', path: '/user/subscriptions', icon: <Crown size={20} />, category: 'student' },
  { id: 'profile', labelKey: 'floating_navigation.items.profile', path: '/profile', icon: <User size={20} />, category: 'student' },
  { id: 'notifications', labelKey: 'floating_navigation.items.notifications', path: '/notifications', icon: <Bell size={20} />, category: 'student' },
  { id: 'checkout', labelKey: 'floating_navigation.items.checkout', path: '/checkout', icon: <CreditCard size={20} />, category: 'student' },
  { id: 'sub-checkout-demo', labelKey: 'floating_navigation.items.sub_checkout_demo', path: '/checkout/subscription?planId=pro&billing=monthly', icon: <CreditCard size={20} />, category: 'student' },
  { id: 'course-player', labelKey: 'floating_navigation.items.course_player', path: '/course-player', icon: <Play size={20} />, category: 'student' },
  { id: 'certificates', labelKey: 'floating_navigation.items.certificates', path: '/certificates', icon: <Award size={20} />, category: 'student' },
  { id: 'quiz', labelKey: 'floating_navigation.items.quiz', path: '/quiz', icon: <TestTube size={20} />, category: 'student' },
  { id: 'reviews', labelKey: 'floating_navigation.items.reviews', path: '/reviews', icon: <Star size={20} />, category: 'student' },
  { id: 'qna', labelKey: 'floating_navigation.items.qna', path: '/qna', icon: <MessageSquare size={20} />, category: 'student' },
  { id: 'support', labelKey: 'floating_navigation.items.support', path: '/support', icon: <HelpCircle size={20} />, category: 'student' },
  { id: 'settings', labelKey: 'floating_navigation.items.settings', path: '/settings', icon: <Settings size={20} />, category: 'student' },
  { id: 'activity-log', labelKey: 'floating_navigation.items.activity_log', path: '/activity-log', icon: <Activity size={20} />, category: 'student' },


  { id: 'instructor', labelKey: 'floating_navigation.items.instructor', path: '/instructor', icon: <BarChart3 size={20} />, category: 'instructor' },

  { id: 'instructor-courses', labelKey: 'floating_navigation.items.instructor_courses', path: '/instructor/courses', icon: <BookOpen size={20} />, category: 'instructor' },
  { id: 'instructor-create-course', labelKey: 'floating_navigation.items.instructor_create_course', path: '/instructor/courses/create', icon: <PlusCircle size={20} />, category: 'instructor' },
  { id: 'instructor-course-landing', labelKey: 'floating_navigation.items.instructor_course_landing', path: '/instructor/course-landing', icon: <Layout size={20} />, category: 'instructor' },

  { id: 'instructor-lessons', labelKey: 'floating_navigation.items.instructor_lessons', path: '/instructor/lessons', icon: <Play size={20} />, category: 'instructor' },
  { id: 'instructor-lessons-create', labelKey: 'floating_navigation.items.instructor_lessons_create', path: '/instructor/lessons/create', icon: <PlusCircle size={20} />, category: 'instructor' },

  { id: 'instructor-earnings', labelKey: 'floating_navigation.items.instructor_earnings', path: '/instructor/earnings', icon: <DollarSign size={20} />, category: 'instructor' },
  { id: 'instructor-sub-revenue', labelKey: 'floating_navigation.items.instructor_sub_revenue', path: '/instructor/subscription-revenue', icon: <Crown size={20} />, category: 'instructor' },
  { id: 'instructor-payouts', labelKey: 'floating_navigation.items.instructor_payouts', path: '/instructor/payouts', icon: <CreditCard size={20} />, category: 'instructor' },

  { id: 'instructor-analytics', labelKey: 'floating_navigation.items.instructor_analytics', path: '/instructor/analytics', icon: <PieChart size={20} />, category: 'instructor' },
  { id: 'instructor-quizzes', labelKey: 'floating_navigation.items.instructor_quizzes', path: '/instructor/quizzes', icon: <TestTube size={20} />, category: 'instructor' },
  { id: 'instructor-discounts', labelKey: 'floating_navigation.items.instructor_discounts', path: '/instructor/discounts', icon: <Tags size={20} />, category: 'instructor' },
  { id: 'instructor-students', labelKey: 'floating_navigation.items.instructor_students', path: '/instructor/students', icon: <Users size={20} />, category: 'instructor' },
  { id: 'instructor-communication', labelKey: 'floating_navigation.items.instructor_communication', path: '/instructor/communication', icon: <MessageCircle size={20} />, category: 'instructor' },
  { id: 'instructor-resources', labelKey: 'floating_navigation.items.instructor_resources', path: '/instructor/resources', icon: <FolderOpen size={20} />, category: 'instructor' },
  { id: 'instructor-profile', labelKey: 'floating_navigation.items.instructor_profile', path: '/instructor/profile', icon: <User size={20} />, category: 'instructor' },
  { id: 'instructor-onboarding', labelKey: 'floating_navigation.items.instructor_onboarding', path: '/instructor/onboarding', icon: <UserPlus size={20} />, category: 'instructor' },


  { id: 'admin', labelKey: 'floating_navigation.items.admin', path: '/admin', icon: <Settings size={20} />, category: 'admin' },

  { id: 'admin-users', labelKey: 'floating_navigation.items.admin_users', path: '/admin/users', icon: <Users size={20} />, category: 'admin' },
  { id: 'admin-users-new', labelKey: 'floating_navigation.items.admin_users_new', path: '/admin/users/new', icon: <UserPlus size={20} />, category: 'admin' },
  { id: 'admin-instructor-apps', labelKey: 'floating_navigation.items.admin_instructor_apps', path: '/admin/instructor-applications', icon: <ClipboardList size={20} />, category: 'admin' },

  { id: 'admin-courses', labelKey: 'floating_navigation.items.admin_courses', path: '/admin/courses', icon: <BookOpen size={20} />, category: 'admin' },
  { id: 'admin-categories', labelKey: 'floating_navigation.items.admin_categories', path: '/admin/categories', icon: <Tags size={20} />, category: 'admin' },
  { id: 'admin-reviews', labelKey: 'floating_navigation.items.admin_reviews', path: '/admin/reviews', icon: <Star size={20} />, category: 'admin' },
  { id: 'admin-blog', labelKey: 'floating_navigation.items.admin_blog', path: '/admin/blog', icon: <FileText size={20} />, category: 'admin' },
  { id: 'admin-forum', labelKey: 'floating_navigation.items.admin_forum', path: '/admin/forum', icon: <MessageSquare size={20} />, category: 'admin' },

  { id: 'admin-subscriptions', labelKey: 'floating_navigation.items.admin_subscriptions', path: '/admin/subscriptions', icon: <Calendar size={20} />, category: 'admin' },
  { id: 'admin-payments', labelKey: 'floating_navigation.items.admin_payments', path: '/admin/payments', icon: <CreditCard size={20} />, category: 'admin' },
  { id: 'admin-payment-methods', labelKey: 'floating_navigation.items.admin_payment_methods', path: '/admin/payments/methods', icon: <CreditCard size={20} />, category: 'admin' },
  { id: 'admin-refunds', labelKey: 'floating_navigation.items.admin_refunds', path: '/admin/refunds', icon: <RefreshCw size={20} />, category: 'admin' },
  { id: 'admin-discounts', labelKey: 'floating_navigation.items.admin_discounts', path: '/admin/discounts', icon: <Tags size={20} />, category: 'admin' },

  { id: 'admin-analytics', labelKey: 'floating_navigation.items.admin_analytics', path: '/admin/analytics', icon: <PieChart size={20} />, category: 'admin' },
  { id: 'admin-statistics', labelKey: 'floating_navigation.items.admin_statistics', path: '/admin/statistics', icon: <BarChart3 size={20} />, category: 'admin' },
  { id: 'admin-website', labelKey: 'floating_navigation.items.admin_website', path: '/admin/website-management', icon: <Monitor size={20} />, category: 'admin' },
  { id: 'admin-home-layout', labelKey: 'floating_navigation.items.admin_home_layout', path: '/admin/home-layout', icon: <LayoutTemplate size={20} />, category: 'admin' },
  { id: 'admin-settings', labelKey: 'floating_navigation.items.admin_settings', path: '/admin/settings', icon: <Settings size={20} />, category: 'admin' },
  { id: 'admin-website-settings', labelKey: 'floating_navigation.items.admin_website_settings', path: '/admin/website-settings', icon: <Globe size={20} />, category: 'admin' },
  { id: 'admin-permissions', labelKey: 'floating_navigation.items.admin_permissions', path: '/admin/permissions', icon: <Shield size={20} />, category: 'admin' },
  { id: 'admin-reports', labelKey: 'floating_navigation.items.admin_reports', path: '/admin/reports', icon: <Shield size={20} />, category: 'admin' },
  { id: 'admin-activity', labelKey: 'floating_navigation.items.admin_activity', path: '/admin/activity-log', icon: <Activity size={20} />, category: 'admin' },
  { id: 'admin-backup', labelKey: 'floating_navigation.items.admin_backup', path: '/admin/data-backup', icon: <Database size={20} />, category: 'admin' },


  { id: 'test', labelKey: 'floating_navigation.items.test', path: '/test', icon: <TestTube size={20} />, category: 'other' },
  { id: 'navigation', labelKey: 'floating_navigation.items.navigation', path: '/navigation', icon: <MapPin size={20} />, category: 'other' },
  { id: 'blog-post', labelKey: 'floating_navigation.items.blog_post', path: '/blog/react-hooks-guide', icon: <FileText size={20} />, category: 'other' },
  { id: 'advanced-features', labelKey: 'floating_navigation.items.advanced_features', path: '/advanced-features', icon: <Star size={20} />, category: 'other' },
]

export function FloatingNavigation() {
  const { t } = useTranslation()
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
  const categoryLabels = {
    main: t('floating_navigation.categories.main'),
    student: t('floating_navigation.categories.student'),
    instructor: t('floating_navigation.categories.instructor'),
    admin: t('floating_navigation.categories.admin'),
    other: t('floating_navigation.categories.other'),
  }

  const filteredItems = React.useMemo(() => {
    return navigationItems.filter(item => {

      if (item.category !== activeCategory) return false


      switch (item.category) {
        case 'student':

          return isAuthenticated || false

        case 'instructor':

          return hasRole?.('instructor') || hasRole?.('admin') || false

        case 'admin':

          return hasRole?.('admin') || false

        case 'main':

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
                        {t('floating_navigation.not_logged_in')}
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
                      {t('floating_navigation.logout')}
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowTestLogin(!showTestLogin)}
                      className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      {t('floating_navigation.test_login')}
                    </button>
                  )}
                </div>
              </div>
            </div>


            {showTestLogin && !isAuthenticated && (
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  {t('floating_navigation.choose_test_account')}
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
                        {t(item.labelKey)}
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
                  <p className="text-sm">{t('floating_navigation.no_pages')}</p>
                  <p className="text-xs mt-1 opacity-70">{t('floating_navigation.no_pages_hint')}</p>
                </div>
              )}
            </div>


            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="flex justify-between items-center text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <span>{categoryLabels[activeCategory]} ({filteredItems.length})</span>
                <span>{t('floating_navigation.total_count', { count: navigationItems.length })}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


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


      {!isOpen && (
        <div className="absolute -top-2 -left-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs shadow-lg animate-bounce">
          {navigationItems.length}
        </div>
      )}


      {isOpen && (
        <div className="absolute -top-8 right-0 px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full shadow-lg">
          {categoryLabels[activeCategory]}
        </div>
      )}
    </div>
  )
}
