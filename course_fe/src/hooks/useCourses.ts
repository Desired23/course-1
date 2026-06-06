




import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import i18n from '../utils/i18n'
import { getErrorMessage } from '../lib/apiError'
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




export function useCourses(params?: GetCoursesParams) {
  return useQuery({
    queryKey: ['courses', params],
    queryFn: () => getCourses(params),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  })
}




export function useCourse(id: string | undefined) {
  return useQuery({
    queryKey: ['course', id],
    queryFn: () => id ? getCourse(id) : null,
    enabled: !!id,
    staleTime: 5 * 60 * 1000
  })
}




export function useFeaturedCourses() {
  return useQuery({
    queryKey: ['courses', 'featured'],
    queryFn: getFeaturedCourses,
    staleTime: 10 * 60 * 1000
  })
}




export function useBestsellerCourses() {
  return useQuery({
    queryKey: ['courses', 'bestsellers'],
    queryFn: getBestsellerCourses,
    staleTime: 10 * 60 * 1000
  })
}




export function useInstructorCourses(instructorId: string | undefined) {
  return useQuery({
    queryKey: ['courses', 'instructor', instructorId],
    queryFn: () => instructorId ? getInstructorCourses(instructorId) : [],
    enabled: !!instructorId,
    staleTime: 5 * 60 * 1000
  })
}




export function useCreateCourse() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<Course>) => createCourse(data),
    onSuccess: (newCourse) => {

      queryClient.invalidateQueries({ queryKey: ['courses'] })


      queryClient.setQueryData(['course', newCourse.id], newCourse)

      toast.success(i18n.t('course_hooks.created'))
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, i18n.t('course_hooks.create_failed')))
    }
  })
}




export function useUpdateCourse() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Course> }) =>
      updateCourse(id, data),
    onSuccess: (updatedCourse, variables) => {
      if (updatedCourse) {

        queryClient.setQueryData(['course', variables.id], updatedCourse)


        queryClient.invalidateQueries({ queryKey: ['courses'] })

        toast.success(i18n.t('course_hooks.updated'))
      }
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, i18n.t('course_hooks.update_failed')))
    }
  })
}




export function useDeleteCourse() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteCourse(id),
    onSuccess: (_, deletedId) => {

      queryClient.removeQueries({ queryKey: ['course', deletedId] })


      queryClient.invalidateQueries({ queryKey: ['courses'] })

      toast.success(i18n.t('course_hooks.deleted'))
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, i18n.t('course_hooks.delete_failed')))
    }
  })
}




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
            ? i18n.t('course_hooks.published')
            : i18n.t('course_hooks.unpublished')
        )
      }
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, i18n.t('course_hooks.status_update_failed')))
    }
  })
}
