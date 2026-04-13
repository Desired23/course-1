import React, { lazy } from 'react'
import { RouteConfig } from './public.routes'
import { RequireAuth } from '../components/auth/RequireAuth'
import { InstructorLayout } from '../components/layouts'

const InstructorDashboard = lazy(() => import('../pages/instructor/InstructorDashboard').then((module) => ({ default: module.InstructorDashboard })))
const InstructorCoursesPage = lazy(() => import('../pages/instructor/InstructorCoursesPage').then((module) => ({ default: module.InstructorCoursesPage })))
const InstructorCreateCoursePage = lazy(() => import('../pages/instructor/InstructorCreateCoursePage').then((module) => ({ default: module.InstructorCreateCoursePage })))
const InstructorCourseDetailPage = lazy(() => import('../pages/instructor/InstructorCourseDetailPage').then((module) => ({ default: module.InstructorCourseDetailPage })))
const InstructorQuizzesPage = lazy(() => import('../pages/instructor/InstructorQuizzesPage').then((module) => ({ default: module.InstructorQuizzesPage })))
const InstructorAnalyticsPage = lazy(() => import('../pages/instructor/InstructorAnalyticsPage').then((module) => ({ default: module.InstructorAnalyticsPage })))
const InstructorDiscountsPage = lazy(() => import('../pages/instructor/InstructorDiscountsPage').then((module) => ({ default: module.InstructorDiscountsPage })))
const InstructorLessonsPageNew = lazy(() => import('../pages/instructor/InstructorLessonsPageNew').then((module) => ({ default: module.InstructorLessonsPageNew })))
const InstructorEarningsPage = lazy(() => import('../pages/instructor/InstructorEarningsPage').then((module) => ({ default: module.InstructorEarningsPage })))
const InstructorSubscriptionRevenuePage = lazy(() => import('../pages/instructor/InstructorSubscriptionRevenuePage').then((module) => ({ default: module.InstructorSubscriptionRevenuePage })))
const InstructorPayoutsPage = lazy(() => import('../pages/instructor/InstructorPayoutsPage').then((module) => ({ default: module.InstructorPayoutsPage })))
const InstructorProfilePage = lazy(() => import('../pages/instructor/InstructorProfilePage').then((module) => ({ default: module.InstructorProfilePage })))
const InstructorResourcesPage = lazy(() => import('../pages/instructor/InstructorResourcesPage').then((module) => ({ default: module.InstructorResourcesPage })))
const InstructorStudentsPage = lazy(() => import('../pages/instructor/InstructorStudentsPage').then((module) => ({ default: module.InstructorStudentsPage })))
const InstructorOnboardingPage = lazy(() => import('../pages/instructor/InstructorOnboardingPage').then((module) => ({ default: module.InstructorOnboardingPage })))
const InstructorCourseLandingPage = lazy(() => import('../pages/instructor/InstructorCourseLandingPage').then((module) => ({ default: module.InstructorCourseLandingPage })))
const InstructorCommunicationPage = lazy(() => import('../pages/instructor/InstructorCommunicationPage').then((module) => ({ default: module.InstructorCommunicationPage })))
const InstructorLessonEditorPage = lazy(() => import('../pages/instructor/InstructorLessonEditorPage').then((module) => ({ default: module.InstructorLessonEditorPage })))

export const instructorRoutes: RouteConfig[] = [

  {
    path: '/instructor',
    element: (
      <RequireAuth roles={['instructor', 'admin']}>
        <InstructorLayout>
          <InstructorDashboard />
        </InstructorLayout>
      </RequireAuth>
    )
  },


  {
    path: '/instructor/courses',
    element: (
      <RequireAuth roles={['instructor', 'admin']}>
        <InstructorLayout>
          <InstructorCoursesPage />
        </InstructorLayout>
      </RequireAuth>
    )
  },
  {
    path: '/instructor/courses/create',
    element: (
      <RequireAuth roles={['instructor', 'admin']}>
        <InstructorLayout>
          <InstructorCreateCoursePage />
        </InstructorLayout>
      </RequireAuth>
    )
  },
  {
    path: '/instructor/courses/:courseId',
    element: (
      <RequireAuth roles={['instructor', 'admin']}>
        <InstructorLayout>
          <InstructorCourseDetailPage />
        </InstructorLayout>
      </RequireAuth>
    ),
    dynamic: true
  },


  {
    path: '/instructor/lessons/:courseId',
    element: (
      <RequireAuth roles={['instructor', 'admin']}>
        <InstructorLayout>
          <InstructorLessonsPageNew />
        </InstructorLayout>
      </RequireAuth>
    ),
    dynamic: true
  },
  {
    path: '/instructor/lessons/create',
    element: (
      <RequireAuth roles={['instructor', 'admin']}>
         <InstructorLessonEditorPage />
      </RequireAuth>
    )
  },
  {
    path: '/instructor/lessons/:lessonId/edit',
    element: (
      <RequireAuth roles={['instructor', 'admin']}>
         <InstructorLessonEditorPage />
      </RequireAuth>
    ),
    dynamic: true
  },
  {
    path: '/instructor/lessons',
    element: (
      <RequireAuth roles={['instructor', 'admin']}>
        <InstructorLayout>
          <InstructorLessonsPageNew />
        </InstructorLayout>
      </RequireAuth>
    )
  },


  {
    path: '/instructor/quizzes',
    element: (
      <RequireAuth roles={['instructor', 'admin']}>
        <InstructorLayout>
          <InstructorQuizzesPage />
        </InstructorLayout>
      </RequireAuth>
    )
  },


  {
    path: '/instructor/analytics',
    element: (
      <RequireAuth roles={['instructor', 'admin']}>
        <InstructorLayout>
          <InstructorAnalyticsPage />
        </InstructorLayout>
      </RequireAuth>
    )
  },


  {
    path: '/instructor/discounts',
    element: (
      <RequireAuth roles={['instructor', 'admin']}>
        <InstructorLayout>
          <InstructorDiscountsPage />
        </InstructorLayout>
      </RequireAuth>
    )
  },


  {
    path: '/instructor/earnings',
    element: (
      <RequireAuth roles={['instructor', 'admin']}>
        <InstructorLayout>
          <InstructorEarningsPage />
        </InstructorLayout>
      </RequireAuth>
    )
  },
  {
    path: '/instructor/subscription-revenue',
    element: (
      <RequireAuth roles={['instructor', 'admin']}>
        <InstructorLayout>
          <InstructorSubscriptionRevenuePage />
        </InstructorLayout>
      </RequireAuth>
    )
  },
  {
    path: '/instructor/payouts',
    element: (
      <RequireAuth roles={['instructor', 'admin']}>
        <InstructorLayout>
          <InstructorPayoutsPage />
        </InstructorLayout>
      </RequireAuth>
    )
  },


  {
    path: '/instructor/profile',
    element: (
      <RequireAuth roles={['instructor', 'admin']}>
        <InstructorLayout>
          <InstructorProfilePage />
        </InstructorLayout>
      </RequireAuth>
    )
  },


  {
    path: '/instructor/resources',
    element: (
      <RequireAuth roles={['instructor', 'admin']}>
        <InstructorLayout>
          <InstructorResourcesPage />
        </InstructorLayout>
      </RequireAuth>
    )
  },


  {
    path: '/instructor/students',
    element: (
      <RequireAuth roles={['instructor', 'admin']}>
        <InstructorLayout>
          <InstructorStudentsPage />
        </InstructorLayout>
      </RequireAuth>
    )
  },


  {
    path: '/instructor/course-landing',
    element: (
      <RequireAuth roles={['instructor', 'admin']}>
        <InstructorLayout>
          <InstructorCourseLandingPage />
        </InstructorLayout>
      </RequireAuth>
    )
  },
  {
    path: '/instructor/course-landing/:courseId',
    element: (
      <RequireAuth roles={['instructor', 'admin']}>
        <InstructorLayout>
          <InstructorCourseLandingPage />
        </InstructorLayout>
      </RequireAuth>
    ),
    dynamic: true
  },


  {
    path: '/instructor/communication',
    element: (
      <RequireAuth roles={['instructor', 'admin']}>
        <InstructorLayout>
          <InstructorCommunicationPage />
        </InstructorLayout>
      </RequireAuth>
    )
  },


  {
    path: '/instructor/onboarding',
    element: <InstructorOnboardingPage />
  },
  {
    path: '/instructor/signup',
    element: <InstructorOnboardingPage />
  }
]
