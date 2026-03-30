import React, { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

export interface WishlistItem {
  wishlist_id: number
  user_id: string
  course_id: string
  added_date: string
  // Additional course info for display
  title?: string
  instructor?: string
  price?: number
  image?: string
  rating?: number
}

interface WishlistContextType {
  wishlist: WishlistItem[]
  isInWishlist: (courseId: string) => boolean
  addToWishlist: (courseId: string, courseData?: Partial<WishlistItem>) => void
  removeFromWishlist: (courseId: string) => void
  clearWishlist: () => void
  getWishlistCount: () => number
  moveToCart: (courseId: string) => void
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined)

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [wishlist, setWishlist] = useState<WishlistItem[]>([])

  useEffect(() => {
    // Load wishlist from localStorage
    if (!user) {
      setWishlist([])
      return
    }

    const saved = localStorage.getItem(`wishlist_${user.id}`)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setWishlist(parsed)
      } catch (error) {
        console.error('Error loading wishlist:', error)
        setWishlist([])
      }
      return
    }

    setWishlist([])
  }, [user])

  useEffect(() => {
    // Save wishlist to localStorage
    if (user) {
      localStorage.setItem(`wishlist_${user.id}`, JSON.stringify(wishlist))
    }
  }, [wishlist, user])

  const isInWishlist = (courseId: string): boolean => {
    if (!user) return false
    return wishlist.some(item => item.course_id === courseId)
  }

  const addToWishlist = (courseId: string, courseData?: Partial<WishlistItem>) => {
    if (!user) {
      toast.error(t('wishlist_context.toasts.login_to_add'))
      return
    }

    if (isInWishlist(courseId)) {
      toast.info(t('wishlist_context.toasts.already_in_wishlist'))
      return
    }

    const newItem: WishlistItem = {
      wishlist_id: Date.now(),
      user_id: user.id,
      course_id: courseId,
      added_date: new Date().toISOString(),
      ...courseData
    }

    setWishlist(prev => [...prev, newItem])
    toast.success(t('wishlist_context.toasts.added'))
  }

  const removeFromWishlist = (courseId: string) => {
    if (!user) return

    setWishlist(prev => prev.filter(item => item.course_id !== courseId))
    toast.success(t('wishlist_context.toasts.removed'))
  }

  const clearWishlist = () => {
    setWishlist([])
    toast.success(t('wishlist_context.toasts.cleared'))
  }

  const getWishlistCount = (): number => {
    return wishlist.length
  }

  const moveToCart = (courseId: string) => {
    if (!user) {
      toast.error(t('wishlist_context.toasts.login_to_add_to_cart'))
      return
    }

    // This would integrate with CartContext
    // For now, just remove from wishlist
    removeFromWishlist(courseId)
    toast.success(t('wishlist_context.toasts.moved_to_cart'))
  }

  const value = {
    wishlist,
    isInWishlist,
    addToWishlist,
    removeFromWishlist,
    clearWishlist,
    getWishlistCount,
    moveToCart
  }

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  const context = useContext(WishlistContext)
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider')
  }
  return context
}
