




// @ts-nocheck
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import i18n from '../utils/i18n'
import { getErrorMessage } from '../lib/apiError'
import {
  login,
  register,
  getUserById,
  type LoginCredentials,
  type RegisterData
} from '../services/auth.api'




export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => login(credentials),
    onSuccess: (data) => {

      localStorage.setItem('authToken', data.token)


      queryClient.setQueryData(['currentUser'], data.user)

      toast.success(i18n.t('auth_hooks.welcome_back', { name: data.user.name }))
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, i18n.t('auth_hooks.login_failed')))
    }
  })
}




export function useSignup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: RegisterData) => register(data),
    onSuccess: (data) => {

      localStorage.setItem('authToken', data.token)


      queryClient.setQueryData(['currentUser'], data.user)

      toast.success(i18n.t('auth_hooks.welcome_signup', { name: data.user.name }))
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, i18n.t('auth_hooks.signup_failed')))
    }
  })
}




export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => {
      localStorage.removeItem('authToken')
      return Promise.resolve()
    },
    onSuccess: () => {

      localStorage.removeItem('authToken')


      queryClient.setQueryData(['currentUser'], null)


      queryClient.clear()

      toast.success(i18n.t('auth_hooks.logout_success'))
    }
  })
}




export function useCurrentUser() {
  const token = localStorage.getItem('authToken')

  return useQuery({
    queryKey: ['currentUser'],
    queryFn: () => token ? getUserById(Number(token)) : null,
    enabled: !!token,
    staleTime: 10 * 60 * 1000,
    retry: false
  })
}




export function useIsAuthenticated() {
  const { data: user, isLoading } = useCurrentUser()
  return { isAuthenticated: !!user, isLoading }
}




export function useHasRole(role: string) {
  const { data: user } = useCurrentUser()
  return user?.roles.includes(role) || false
}




export function useHasAnyRole(roles: string[]) {
  const { data: user } = useCurrentUser()
  return roles.some(role => user?.roles.includes(role)) || false
}
