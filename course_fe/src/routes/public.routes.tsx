import React, { lazy } from 'react'

const SimpleHomePage = lazy(() => import('../pages/public/SimpleHomePage').then((module) => ({ default: module.SimpleHomePage })))
const CoursesPage = lazy(() => import('../pages/public/CoursesPage').then((module) => ({ default: module.CoursesPage })))
const CourseDetailPage = lazy(() => import('../pages/public/CourseDetailPage').then((module) => ({ default: module.CourseDetailPage })))
const SearchPage = lazy(() => import('../pages/public/SearchPage').then((module) => ({ default: module.SearchPage })))
const EnhancedSearchPage = lazy(() => import('../pages/public/EnhancedSearchPage').then((module) => ({ default: module.EnhancedSearchPage })))
const LoginPage = lazy(() => import('../pages/auth/LoginPage').then((module) => ({ default: module.LoginPage })))
const SignupPage = lazy(() => import('../pages/auth/SignupPage').then((module) => ({ default: module.SignupPage })))
const ForgotPasswordPage = lazy(() => import('../pages/auth/ForgotPasswordPage').then((module) => ({ default: module.ForgotPasswordPage })))
const ResetPasswordPage = lazy(() => import('../pages/auth/ResetPasswordPage').then((module) => ({ default: module.ResetPasswordPage })))
const EmailVerificationPage = lazy(() => import('../pages/auth/EmailVerificationPage').then((module) => ({ default: module.EmailVerificationPage })))
const GoogleCallbackPage = lazy(() => import('../pages/auth/GoogleCallbackPage').then((module) => ({ default: module.GoogleCallbackPage })))
const UdemyBusinessPage = lazy(() => import('../pages/public/UdemyBusinessPage').then((module) => ({ default: module.UdemyBusinessPage })))
const TeachOnUdemyPage = lazy(() => import('../pages/public/TeachOnUdemyPage').then((module) => ({ default: module.TeachOnUdemyPage })))
const BlogPage = lazy(() => import('../pages/public/BlogPage').then((module) => ({ default: module.BlogPage })))
const BlogPostDetailPage = lazy(() => import('../pages/public/BlogPostDetailPage').then((module) => ({ default: module.BlogPostDetailPage })))
const ForumPage = lazy(() => import('../pages/public/ForumPage').then((module) => ({ default: module.ForumPage })))
const ForumTopicDetailPage = lazy(() => import('../pages/public/ForumTopicDetailPage').then((module) => ({ default: module.ForumTopicDetailPage })))
const QnAPage = lazy(() => import('../pages/public/QnAPage').then((module) => ({ default: module.QnAPage })))
const CourseReviewsPage = lazy(() => import('../pages/public/CourseReviewsPage').then((module) => ({ default: module.CourseReviewsPage })))
const CategoryPage = lazy(() => import('../pages/public/CategoryPage'))
const TopicPage = lazy(() => import('../pages/public/TopicPage'))
const AllTopicsPage = lazy(() => import('../pages/public/AllTopicsPage'))
const CategoriesPage = lazy(() => import('../pages/public/CategoriesPage').then((module) => ({ default: module.CategoriesPage })))
const PreviewDemo = lazy(() => import('../components/PreviewDemo').then((module) => ({ default: module.PreviewDemo })))
const SubscriptionPricingPage = lazy(() => import('../pages/public/SubscriptionPricingPage').then((module) => ({ default: module.SubscriptionPricingPage })))
const InstructorPublicProfilePage = lazy(() => import('../pages/public/InstructorPublicProfilePage').then((module) => ({ default: module.InstructorPublicProfilePage })))

export interface RouteConfig {
  path: string
  element: React.ReactNode
  dynamic?: boolean
  prefix?: boolean
}

export const publicRoutes: RouteConfig[] = [

  { path: '/', element: <SimpleHomePage /> },


  { path: '/courses', element: <CoursesPage /> },
  { path: '/course/:id', element: <CourseDetailPage />, dynamic: true },
  { path: '/course', element: <CourseDetailPage /> },


  { path: '/search', element: <SearchPage /> },
  { path: '/enhanced-search', element: <EnhancedSearchPage /> },


  { path: '/topics', element: <AllTopicsPage /> },
  { path: '/categories', element: <CategoriesPage /> },
  { path: '/category/:slug', element: <CategoryPage />, dynamic: true },
  { path: '/topic/:slug', element: <TopicPage />, dynamic: true },


  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignupPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  { path: '/email-verification', element: <EmailVerificationPage /> },
  { path: '/auth/google/callback', element: <GoogleCallbackPage /> },
  { path: '/google-callback', element: <GoogleCallbackPage /> },


  { path: '/udemy-business', element: <UdemyBusinessPage /> },
  { path: '/teach', element: <TeachOnUdemyPage /> },
  { path: '/pricing', element: <SubscriptionPricingPage /> },


  { path: '/instructor/:instructorId/profile', element: <InstructorPublicProfilePage />, dynamic: true },
  { path: '/instructor/view/:instructorId', element: <InstructorPublicProfilePage />, dynamic: true },


  { path: '/blog', element: <BlogPage /> },
  { path: '/blog/:slug', element: <BlogPostDetailPage />, dynamic: true },


  { path: '/forum', element: <ForumPage /> },
  { path: '/forum/topic/:id', element: <ForumTopicDetailPage />, dynamic: true },


  { path: '/qna/:courseId', element: <QnAPage />, dynamic: true },
  { path: '/qna', element: <QnAPage /> },
  { path: '/reviews/:courseId', element: <CourseReviewsPage />, dynamic: true },
  { path: '/reviews', element: <CourseReviewsPage /> },


  { path: '/preview-demo', element: <PreviewDemo /> },
]
