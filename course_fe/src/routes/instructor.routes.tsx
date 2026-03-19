import React from 'react'
import { RouteConfig } from './public.routes'
import { RequireAuth } from '../components/auth/RequireAuth'
import { InstructorLayout } from '../components/layouts'
import { InstructorDashboard } from '../pages/instructor/InstructorDashboard'
import { InstructorCoursesPage } from '../pages/instructor/InstructorCoursesPage'
import { InstructorCreateCoursePage } from '../pages/instructor/InstructorCreateCoursePage'
import { InstructorCourseDetailPage } from '../pages/instructor/InstructorCourseDetailPage'
import { InstructorQuizzesPage } from '../pages/instructor/InstructorQuizzesPage'
import { InstructorAnalyticsPage } from '../pages/instructor/InstructorAnalyticsPage'
import { InstructorDiscountsPage } from '../pages/instructor/InstructorDiscountsPage'
import { InstructorLessonsPageNew } from '../pages/instructor/InstructorLessonsPageNew'
import { InstructorEarningsPage } from '../pages/instructor/InstructorEarningsPage'
import { InstructorSubscriptionRevenuePage } from '../pages/instructor/InstructorSubscriptionRevenuePage'
import { InstructorPayoutsPage } from '../pages/instructor/InstructorPayoutsPage'
import { InstructorProfilePage } from '../pages/instructor/InstructorProfilePage'
import { InstructorResourcesPage } from '../pages/instructor/InstructorResourcesPage'
import { InstructorStudentsPage } from '../pages/instructor/InstructorStudentsPage'
import { InstructorOnboardingPage } from '../pages/instructor/InstructorOnboardingPage'
import { InstructorCourseLandingPage } from '../pages/instructor/InstructorCourseLandingPage'
import { InstructorCommunicationPage } from '../pages/instructor/InstructorCommunicationPage'
import { InstructorLessonEditorPage } from '../pages/instructor/InstructorLessonEditorPage'

export const instructorRoutes: RouteConfig[] = [
  // Dashboard
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
  
  // Courses
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
  
  // Lessons
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
  
  // Quizzes
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
  
  // Analytics
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
  
  // Discounts
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
  
  // Earnings & Payouts
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
  
  // Profile
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
  
  // Resources
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
  
  // Students
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
  
  // Course Landing
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
  
  // Communication
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
  
  // Onboarding (No auth required)
  {
    path: '/instructor/onboarding',
    element: <InstructorOnboardingPage />
  },
  {
    path: '/instructor/signup',
    element: <InstructorOnboardingPage />
  }
]
