import React, { createContext, useContext, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useAuth } from './AuthContext'

export interface Enrollment {
  enrollment_id: number
  user_id: string
  course_id: string
  enrollment_date: string
  expiry_date?: string
  completion_date?: string
  progress: number
  status: 'active' | 'completed' | 'expired' | 'inactive'
  certificate?: string
  certificate_issue_date?: string
  last_access_date: string
  created_at: string
}

interface EnrollmentContextType {
  enrollments: Enrollment[]
  isEnrolled: (courseId: string) => boolean
  getEnrollment: (courseId: string) => Enrollment | undefined
  enrollCourse: (courseId: string, paymentId?: string) => Promise<boolean>
  updateProgress: (courseId: string, progress: number) => void
  completeCourse: (courseId: string) => void
  getCourseProgress: (courseId: string) => number
  getTotalEnrollments: () => number
  getActiveEnrollments: () => Enrollment[]
  getCompletedEnrollments: () => Enrollment[]
}

const EnrollmentContext = createContext<EnrollmentContextType | undefined>(undefined)

const MOCK_ENROLLMENTS: Enrollment[] = [
  {
    enrollment_id: 1,
    user_id: '1',
    course_id: '1',
    enrollment_date: '2024-01-15T10:00:00Z',
    progress: 33,
    status: 'active',
    last_access_date: '2024-01-20T15:30:00Z',
    created_at: '2024-01-15T10:00:00Z'
  },
  {
    enrollment_id: 2,
    user_id: '1',
    course_id: '2',
    enrollment_date: '2024-02-01T12:00:00Z',
    progress: 100,
    status: 'completed',
    completion_date: '2024-02-28T18:00:00Z',
    certificate: 'CERT-123456',
    certificate_issue_date: '2024-02-28T18:00:00Z',
    last_access_date: '2024-02-28T18:00:00Z',
    created_at: '2024-02-01T12:00:00Z'
  }
]

export function EnrollmentProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])

  useEffect(() => {
    if (!user) {
      localStorage.removeItem('enrollments')
      setEnrollments([])
      return
    }

    const saved = localStorage.getItem('enrollments')
    if (saved) {
      try {
        const parsed: Enrollment[] = JSON.parse(saved)
        const belongsToCurrent = parsed.every(e => e.user_id === user.id)
        if (!belongsToCurrent) {
          localStorage.removeItem('enrollments')
          setEnrollments([])
        } else {
          setEnrollments(parsed)
          return
        }
      } catch (error) {
        console.error('Error loading enrollments:', error)
        localStorage.removeItem('enrollments')
      }
    }

    const userEnrollments = MOCK_ENROLLMENTS.filter(e => e.user_id === user.id)
    setEnrollments(userEnrollments)
    localStorage.setItem('enrollments', JSON.stringify(userEnrollments))
  }, [user])

  useEffect(() => {
    if (enrollments.length > 0) {
      localStorage.setItem('enrollments', JSON.stringify(enrollments))
    }
  }, [enrollments])

  const isEnrolled = (courseId: string): boolean => {
    if (!user) return false
    return enrollments.some(e => e.course_id === courseId && e.user_id === user.id)
  }

  const getEnrollment = (courseId: string): Enrollment | undefined => {
    if (!user) return undefined
    return enrollments.find(e => e.course_id === courseId && e.user_id === user.id)
  }

  const enrollCourse = async (courseId: string, paymentId?: string): Promise<boolean> => {
    if (!user) {
      toast.error(t('enrollment_context.toasts.login_to_enroll'))
      return false
    }

    if (isEnrolled(courseId)) {
      toast.info(t('enrollment_context.toasts.already_enrolled'))
      return false
    }

    const newEnrollment: Enrollment = {
      enrollment_id: Date.now(),
      user_id: user.id,
      course_id: courseId,
      enrollment_date: new Date().toISOString(),
      progress: 0,
      status: 'active',
      last_access_date: new Date().toISOString(),
      created_at: new Date().toISOString()
    }

    setEnrollments(prev => [...prev, newEnrollment])
    toast.success(t('enrollment_context.toasts.enroll_success'))
    return true
  }

  const updateProgress = (courseId: string, progress: number) => {
    if (!user) return

    setEnrollments(prev => prev.map(enrollment => {
      if (enrollment.course_id === courseId && enrollment.user_id === user.id) {
        const updatedEnrollment = {
          ...enrollment,
          progress: Math.min(100, Math.max(0, progress)),
          last_access_date: new Date().toISOString()
        }

        if (progress >= 100 && !enrollment.completion_date) {
          updatedEnrollment.status = 'completed'
          updatedEnrollment.completion_date = new Date().toISOString()
          updatedEnrollment.certificate = `CERT-${Date.now()}`
          updatedEnrollment.certificate_issue_date = new Date().toISOString()
        }

        return updatedEnrollment
      }
      return enrollment
    }))
  }

  const completeCourse = (courseId: string) => {
    if (!user) return

    setEnrollments(prev => prev.map(enrollment => {
      if (enrollment.course_id === courseId && enrollment.user_id === user.id) {
        return {
          ...enrollment,
          progress: 100,
          status: 'completed',
          completion_date: new Date().toISOString(),
          certificate: `CERT-${Date.now()}`,
          certificate_issue_date: new Date().toISOString(),
          last_access_date: new Date().toISOString()
        }
      }
      return enrollment
    }))

    toast.success(t('enrollment_context.toasts.course_completed'))
  }

  const getCourseProgress = (courseId: string): number => {
    const enrollment = getEnrollment(courseId)
    return enrollment?.progress || 0
  }

  const getTotalEnrollments = (): number => {
    return enrollments.filter(e => e.user_id === user?.id).length
  }

  const getActiveEnrollments = (): Enrollment[] => {
    return enrollments.filter(e => e.user_id === user?.id && e.status === 'active')
  }

  const getCompletedEnrollments = (): Enrollment[] => {
    return enrollments.filter(e => e.user_id === user?.id && e.status === 'completed')
  }

  const value = {
    enrollments,
    isEnrolled,
    getEnrollment,
    enrollCourse,
    updateProgress,
    completeCourse,
    getCourseProgress,
    getTotalEnrollments,
    getActiveEnrollments,
    getCompletedEnrollments
  }

  return (
    <EnrollmentContext.Provider value={value}>
      {children}
    </EnrollmentContext.Provider>
  )
}

export function useEnrollment() {
  const context = useContext(EnrollmentContext)
  if (context === undefined) {
    throw new Error('useEnrollment must be used within an EnrollmentProvider')
  }
  return context
}
