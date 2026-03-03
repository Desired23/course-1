import React from 'react'
import { SimpleHomePage } from '../pages/public/SimpleHomePage'
import { CoursesPage } from '../pages/public/CoursesPage'
import { CourseDetailPage } from '../pages/public/CourseDetailPage'
import { SearchPage } from '../pages/public/SearchPage'
import { EnhancedSearchPage } from '../pages/public/EnhancedSearchPage'
import { LoginPage } from '../pages/auth/LoginPage'
import { SignupPage } from '../pages/auth/SignupPage'
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage'
import { EmailVerificationPage } from '../pages/auth/EmailVerificationPage'
import { GoogleCallbackPage } from '../pages/auth/GoogleCallbackPage'
import { GoogleLoginTestPage } from '../pages/auth/GoogleLoginTestPage'
import { UdemyBusinessPage } from '../pages/public/UdemyBusinessPage'
import { TeachOnUdemyPage } from '../pages/public/TeachOnUdemyPage'
import { TestPage } from '../pages/_dev/TestPage'
import { QuizDemoPage } from '../pages/_dev/QuizDemoPage'
import { NavigationPage } from '../pages/_dev/NavigationPage'
import { BlogPage } from '../pages/public/BlogPage'
import { BlogPostDetailPage } from '../pages/public/BlogPostDetailPage'
import { ForumPage } from '../pages/public/ForumPage'
import { ForumTopicDetailPage } from '../pages/public/ForumTopicDetailPage'
import { QnAPage } from '../pages/public/QnAPage'
import { CourseReviewsPage } from '../pages/public/CourseReviewsPage'
import CategoryPage from '../pages/public/CategoryPage'
import TopicPage from '../pages/public/TopicPage'
import AllTopicsPage from '../pages/public/AllTopicsPage'
import { CategoriesPage } from '../pages/public/CategoriesPage'
import { PreviewDemo } from '../components/PreviewDemo'
import { AdvancedFeaturesDemo } from '../pages/_dev/AdvancedFeaturesDemo'
import { ZustandTestPage } from '../pages/_dev/ZustandTestPage'
import { CodeQuizTestPage } from '../pages/_dev/CodeQuizTestPage'
import EnhancedCodeQuizTestPage from '../pages/_dev/EnhancedCodeQuizTestPage'
import { SubscriptionPricingPage } from '../pages/public/SubscriptionPricingPage'
import { InstructorPublicProfilePage } from '../pages/public/InstructorPublicProfilePage'

export interface RouteConfig {
  path: string
  element: React.ReactNode
  dynamic?: boolean
  prefix?: boolean
}

export const publicRoutes: RouteConfig[] = [
  // Home & Landing
  { path: '/', element: <SimpleHomePage /> },
  
  // Courses
  { path: '/courses', element: <CoursesPage /> },
  { path: '/course/:id', element: <CourseDetailPage />, dynamic: true },
  { path: '/course', element: <CourseDetailPage /> },
  
  // Search
  { path: '/search', element: <SearchPage /> },
  { path: '/enhanced-search', element: <EnhancedSearchPage /> },
  
  // Categories & Topics
  { path: '/topics', element: <AllTopicsPage /> },
  { path: '/categories', element: <CategoriesPage /> },
  { path: '/category/:slug', element: <CategoryPage />, dynamic: true },
  { path: '/topic/:slug', element: <TopicPage />, dynamic: true },
  
  // Auth
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignupPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  { path: '/email-verification', element: <EmailVerificationPage /> },
  { path: '/auth/google/callback', element: <GoogleCallbackPage /> },
  { path: '/google-callback', element: <GoogleCallbackPage /> },
  { path: '/google-login-test', element: <GoogleLoginTestPage /> },
  
  // Marketing Pages
  { path: '/udemy-business', element: <UdemyBusinessPage /> },
  { path: '/teach', element: <TeachOnUdemyPage /> },
  { path: '/pricing', element: <SubscriptionPricingPage /> },
  
  // Instructor Public Profile
  { path: '/instructor/:instructorId/profile', element: <InstructorPublicProfilePage />, dynamic: true },
  { path: '/instructor/view/:instructorId', element: <InstructorPublicProfilePage />, dynamic: true },
  
  // Blog
  { path: '/blog', element: <BlogPage /> },
  { path: '/blog/:slug', element: <BlogPostDetailPage />, dynamic: true },
  
  // Community
  { path: '/forum', element: <ForumPage /> },
  { path: '/forum/topic/:id', element: <ForumTopicDetailPage />, dynamic: true },
  
  // Q&A & Reviews (public accessible)
  { path: '/qna/:courseId', element: <QnAPage />, dynamic: true },
  { path: '/qna', element: <QnAPage /> },
  { path: '/reviews/:courseId', element: <CourseReviewsPage />, dynamic: true },
  { path: '/reviews', element: <CourseReviewsPage /> },
  
  // Demo & Test Pages
  { path: '/test', element: <TestPage /> },
  { path: '/quiz-demo', element: <QuizDemoPage /> },
  { path: '/navigation', element: <NavigationPage /> },
  { path: '/preview-demo', element: <PreviewDemo /> },
  { path: '/advanced-features', element: <AdvancedFeaturesDemo /> },
  { path: '/zustand-test', element: <ZustandTestPage /> },
  { path: '/code-quiz-test', element: <CodeQuizTestPage /> },
  { path: '/enhanced-code-quiz-test', element: <EnhancedCodeQuizTestPage /> }
]