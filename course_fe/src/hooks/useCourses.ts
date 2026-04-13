




import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
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

      toast.success('Course created successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create course')
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

        toast.success('Course updated successfully!')
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update course')
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

      toast.success('Course deleted successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete course')
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
