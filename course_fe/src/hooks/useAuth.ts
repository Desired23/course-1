/**
 * React Query hooks for Authentication
 * Note: Currently using AuthContext, but this shows how to migrate to React Query
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  login,
  register,
  getUserById,
  type LoginCredentials,
  type RegisterData
} from '../services/auth.api'

/**
 * Login mutation
 */
export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => login(credentials),
    onSuccess: (data) => {
      // Save token to localStorage
      localStorage.setItem('authToken', data.token)
      
      // Set current user in cache
      queryClient.setQueryData(['currentUser'], data.user)
      
      toast.success(`Welcome back, ${data.user.name}!`)
    },
    onError: (error: any) => {
      toast.error(error.message || 'Login failed')
    }
  })
}

/**
 * Signup mutation
 */
export function useSignup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: RegisterData) => register(data),
    onSuccess: (data) => {
      // Save token to localStorage
      localStorage.setItem('authToken', data.token)
      
      // Set current user in cache
      queryClient.setQueryData(['currentUser'], data.user)
      
      toast.success(`Welcome, ${data.user.name}! Account created successfully.`)
    },
    onError: (error: any) => {
      toast.error(error.message || 'Signup failed')
    }
  })
}

/**
 * Logout mutation
 */
export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => {
      localStorage.removeItem('authToken')
      return Promise.resolve()
    },
    onSuccess: () => {
      // Remove token
      localStorage.removeItem('authToken')
      
      // Clear user cache
      queryClient.setQueryData(['currentUser'], null)
      
      // Clear all queries (optional)
      queryClient.clear()
      
      toast.success('Logged out successfully')
    }
  })
}

/**
 * Get current user query
 */
export function useCurrentUser() {
  const token = localStorage.getItem('authToken')

  return useQuery({
    queryKey: ['currentUser'],
    queryFn: () => token ? getUserById(Number(token)) : null,
    enabled: !!token,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: false
  })
}

/**
 * Check if user is authenticated
 */
export function useIsAuthenticated() {
  const { data: user, isLoading } = useCurrentUser()
  return { isAuthenticated: !!user, isLoading }
}

/**
 * Check if user has specific role
 */
export function useHasRole(role: string) {
  const { data: user } = useCurrentUser()
  return user?.roles.includes(role) || false
}

/**
 * Check if user has any of the roles
 */
export function useHasAnyRole(roles: string[]) {
  const { data: user } = useCurrentUser()
  return roles.some(role => user?.roles.includes(role)) || false
}
