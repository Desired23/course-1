import { queryClient } from '../lib/queryClient'
import { clearHttpRuntimeState, clearTokens } from './http'
import { clearInstructorCache } from './instructor.api'
import { clearCategoryCache } from './category.api'
import { clearCoursePublicStatsCache } from './course.api'
import { clearRegisteredCaches } from './cacheRegistry'

export function clearSessionData(): void {
  clearTokens()
  clearHttpRuntimeState()
  clearInstructorCache()
  clearCategoryCache()
  clearCoursePublicStatsCache()
  clearRegisteredCaches()
  queryClient.clear()

  try {
    localStorage.clear()
  } catch {

  }

  try {
    sessionStorage.clear()
  } catch {

  }
}
