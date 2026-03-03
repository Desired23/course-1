/**
 * React Query hooks for Courses
 * Provides a stable interface for data fetching
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner@2.0.3'
import {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  getFeaturedCourses,
  getBestsellerCourses,
  getInstructorCourses,
  publishCourse,
  type GetCoursesParams,
  type Course
} from '../services/course.api'

/**
 * Get all courses with filters
 */
export function useCourses(params?: GetCoursesParams) {
  return useQuery({
    queryKey: ['courses', params],
    queryFn: () => getCourses(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000 // 10 minutes (formerly cacheTime)
  })
}

/**
 * Get single course by ID
 */
export function useCourse(id: string | undefined) {
  return useQuery({
    queryKey: ['course', id],
    queryFn: () => id ? getCourse(id) : null,
    enabled: !!id, // Only run query if id exists
    staleTime: 5 * 60 * 1000
  })
}

/**
 * Get featured courses
 */
export function useFeaturedCourses() {
  return useQuery({
    queryKey: ['courses', 'featured'],
    queryFn: getFeaturedCourses,
    staleTime: 10 * 60 * 1000 // Cache longer for featured courses
  })
}

/**
 * Get bestseller courses
 */
export function useBestsellerCourses() {
  return useQuery({
    queryKey: ['courses', 'bestsellers'],
    queryFn: getBestsellerCourses,
    staleTime: 10 * 60 * 1000
  })
}

/**
 * Get instructor's courses
 */
export function useInstructorCourses(instructorId: string | undefined) {
  return useQuery({
    queryKey: ['courses', 'instructor', instructorId],
    queryFn: () => instructorId ? getInstructorCourses(instructorId) : [],
    enabled: !!instructorId,
    staleTime: 5 * 60 * 1000
  })
}

/**
 * Create new course
 */
export function useCreateCourse() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<Course>) => createCourse(data),
    onSuccess: (newCourse) => {
      // Invalidate courses list to refetch
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      
      // Optimistically add to cache
      queryClient.setQueryData(['course', newCourse.id], newCourse)
      
      toast.success('Course created successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create course')
    }
  })
}

/**
 * Update course
 */
export function useUpdateCourse() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Course> }) => 
      updateCourse(id, data),
    onSuccess: (updatedCourse, variables) => {
      if (updatedCourse) {
        // Update single course cache
        queryClient.setQueryData(['course', variables.id], updatedCourse)
        
        // Invalidate courses list
        queryClient.invalidateQueries({ queryKey: ['courses'] })
        
        toast.success('Course updated successfully!')
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update course')
    }
  })
}

/**
 * Delete course
 */
export function useDeleteCourse() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteCourse(id),
    onSuccess: (_, deletedId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ['course', deletedId] })
      
      // Invalidate courses list
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      
      toast.success('Course deleted successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete course')
    }
  })
}

/**
 * Publish/Unpublish course
 */
export function usePublishCourse() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, publish }: { id: string; publish: boolean }) => 
      publishCourse(id, publish),
    onSuccess: (updatedCourse, variables) => {
      if (updatedCourse) {
        queryClient.setQueryData(['course', variables.id], updatedCourse)
        queryClient.invalidateQueries({ queryKey: ['courses'] })
        
        toast.success(
          variables.publish 
            ? 'Course published successfully!' 
            : 'Course unpublished successfully!'
        )
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update course status')
    }
  })
}
