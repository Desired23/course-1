import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getAllMyEnrollments, type Enrollment } from '../services/enrollment.api'
import { registerCacheClearer } from '../services/cacheRegistry'







let _cache: { userId: string; courseIds: Set<number>; enrollmentMap: Map<number, Enrollment> } | null = null

registerCacheClearer(() => {
  _cache = null
})

export function useOwnedCourses() {
  const { user, isAuthenticated } = useAuth()
  const [ownedIds, setOwnedIds] = useState<Set<number>>(_cache?.courseIds ?? new Set())
  const [enrollmentMap, setEnrollmentMap] = useState<Map<number, Enrollment>>(_cache?.enrollmentMap ?? new Map())
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setOwnedIds(new Set())
      setEnrollmentMap(new Map())
      return
    }


    if (_cache && _cache.userId === user.id) {
      setOwnedIds(_cache.courseIds)
      setEnrollmentMap(_cache.enrollmentMap)
      return
    }

    setLoading(true)
    try {
      const enrollments = await getAllMyEnrollments()
      const ids = new Set<number>()
      const map = new Map<number, Enrollment>()
      for (const e of enrollments) {
        if (e.status === 'active' || e.status === 'complete') {
          const cid = typeof e.course === 'object' ? e.course.course_id : e.course
          ids.add(cid)
          map.set(cid, e)
        }
      }
      _cache = { userId: user.id, courseIds: ids, enrollmentMap: map }
      setOwnedIds(ids)
      setEnrollmentMap(map)
    } catch {

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
