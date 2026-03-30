import React, { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

export interface Follow {
  follow_id: number
  user_id: string
  instructor_id: string
  followed_date: string
}

interface FollowContextType {
  follows: Follow[]
  isFollowing: (instructorId: string) => boolean
  followInstructor: (instructorId: string) => void
  unfollowInstructor: (instructorId: string) => void
  getFollowersCount: (instructorId: string) => number
  getFollowingInstructors: () => Follow[]
  toggleFollow: (instructorId: string) => void
}

const FollowContext = createContext<FollowContextType | undefined>(undefined)

export function FollowProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [follows, setFollows] = useState<Follow[]>([])

  useEffect(() => {
    // Load follows from localStorage
    const saved = localStorage.getItem('instructorFollows')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setFollows(parsed)
      } catch (error) {
        console.error('Error loading follows:', error)
      }
    }
  }, [])

  useEffect(() => {
    // Save follows to localStorage
    if (follows.length > 0) {
      localStorage.setItem('instructorFollows', JSON.stringify(follows))
    }
  }, [follows])

  const isFollowing = (instructorId: string): boolean => {
    if (!user) return false
    return follows.some(f => f.user_id === user.id && f.instructor_id === instructorId)
  }

  const followInstructor = (instructorId: string) => {
    if (!user) {
      toast.error(t('follow_context.toasts.login_to_follow'))
      return
    }

    if (isFollowing(instructorId)) {
      toast.info(t('follow_context.toasts.already_following'))
      return
    }

    const newFollow: Follow = {
      follow_id: Date.now(),
      user_id: user.id,
      instructor_id: instructorId,
      followed_date: new Date().toISOString()
    }

    setFollows(prev => [...prev, newFollow])
    toast.success(t('follow_context.toasts.follow_success'))
  }

  const unfollowInstructor = (instructorId: string) => {
    if (!user) {
      toast.error(t('follow_context.toasts.login_to_unfollow'))
      return
    }

    setFollows(prev => prev.filter(f => !(f.user_id === user.id && f.instructor_id === instructorId)))
    toast.success(t('follow_context.toasts.unfollow_success'))
  }

  const toggleFollow = (instructorId: string) => {
    if (isFollowing(instructorId)) {
      unfollowInstructor(instructorId)
    } else {
      followInstructor(instructorId)
    }
  }

  const getFollowersCount = (instructorId: string): number => {
    return follows.filter(f => f.instructor_id === instructorId).length
  }

  const getFollowingInstructors = (): Follow[] => {
    if (!user) return []
    return follows.filter(f => f.user_id === user.id)
  }

  const value = {
    follows,
    isFollowing,
    followInstructor,
    unfollowInstructor,
    getFollowersCount,
    getFollowingInstructors,
    toggleFollow
  }

  return (
    <FollowContext.Provider value={value}>
      {children}
    </FollowContext.Provider>
  )
}

export function useFollow() {
  const context = useContext(FollowContext)
  if (context === undefined) {
    throw new Error('useFollow must be used within a FollowProvider')
  }
  return context
}
