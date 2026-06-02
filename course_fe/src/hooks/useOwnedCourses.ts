import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getAllMyEnrollments, type Enrollment } from '../services/enrollment.api'
import { getAllMySubscriptionCourses } from '../services/subscription.api'
import { registerCacheClearer } from '../services/cacheRegistry'







let _cache: {
  userId: string
  courseIds: Set<number>
  enrollmentMap: Map<number, Enrollment>
  subscriptionIds: Set<number>
} | null = null

registerCacheClearer(() => {
  _cache = null
})

export function useOwnedCourses() {
  const { user, isAuthenticated } = useAuth()
  const [ownedIds, setOwnedIds] = useState<Set<number>>(new Set())
  const [enrollmentMap, setEnrollmentMap] = useState<Map<number, Enrollment>>(new Map())
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setOwnedIds(new Set())
      setEnrollmentMap(new Map())
      return
    }


    const userId = String(user.id)

    if (_cache && _cache.userId === userId) {
      setOwnedIds(_cache.courseIds)
      setEnrollmentMap(_cache.enrollmentMap)
      return
    }

    setLoading(true)
    try {
      const [enrollments, planCourses] = await Promise.all([
        getAllMyEnrollments(),
        getAllMySubscriptionCourses(),
      ])
      const ids = new Set<number>()
      const map = new Map<number, Enrollment>()
      for (const e of enrollments) {
        if (e.status === 'active' || e.status === 'complete') {
          const cid = typeof e.course === 'object' ? e.course.course_id : e.course
          ids.add(cid)
          map.set(cid, e)
        }
      }
      const subIds = new Set<number>()
      for (const pc of planCourses) {
        if (pc.status === 'active') {
          ids.add(pc.course)
          subIds.add(pc.course)
        }
      }
      _cache = { userId, courseIds: ids, enrollmentMap: map, subscriptionIds: subIds }
      setOwnedIds(ids)
      setEnrollmentMap(map)
    } catch {
      setOwnedIds(new Set())
      setEnrollmentMap(new Map())
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, user?.id])

  useEffect(() => {
    load()
  }, [load])

  const isOwned = useCallback((courseId: number) => ownedIds.has(courseId), [ownedIds])

  const getProgress = useCallback((courseId: number): number => {
    const enrollment = enrollmentMap.get(courseId)
    if (!enrollment) return 0
    return parseFloat(enrollment.progress) || 0
  }, [enrollmentMap])


  const refresh = useCallback(() => {
    _cache = null
    load()
  }, [load])

  return useMemo(() => ({
    ownedIds,
    isOwned,
    getProgress,
    loading,
    refresh,
  }), [ownedIds, isOwned, getProgress, loading, refresh])
}


export function invalidateOwnedCoursesCache() {
  _cache = null
}
