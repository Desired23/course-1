import React, { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { toast } from 'sonner@2.0.3'

export interface Review {
  review_id: number
  course_id: string
  user_id: string
  rating: number
  comment: string
  review_date: string
  updated_date?: string
  status: 'pending' | 'approved' | 'rejected'
  likes: number
  report_count: number
  instructor_response?: string
  response_date?: string
  // Additional user info for display
  user_name?: string
  user_avatar?: string
  // Helpful tracking
  helpful_votes?: string[] // Array of user IDs who found it helpful
}

interface ReviewsContextType {
  reviews: Review[]
  getCourseReviews: (courseId: string) => Review[]
  getUserReview: (courseId: string) => Review | undefined
  hasUserReviewed: (courseId: string) => boolean
  addReview: (courseId: string, rating: number, comment: string) => Promise<boolean>
  updateReview: (reviewId: number, rating: number, comment: string) => Promise<boolean>
  deleteReview: (reviewId: number) => Promise<boolean>
  markHelpful: (reviewId: number) => void
  reportReview: (reviewId: number, reason: string) => void
  getCourseRating: (courseId: string) => {
    average: number
    total: number
    distribution: { [key: number]: number }
  }
  addInstructorResponse: (reviewId: number, response: string) => void
}

const ReviewsContext = createContext<ReviewsContextType | undefined>(undefined)

// Mock reviews for demo
const MOCK_REVIEWS: Review[] = [
  {
    review_id: 1,
    course_id: '1',
    user_id: '1',
    rating: 5,
    comment: 'Excellent course! Very comprehensive and well-structured.',
    review_date: '2024-01-20T10:00:00Z',
    status: 'approved',
    likes: 12,
    report_count: 0,
    user_name: 'John Doe',
    helpful_votes: []
  },
  {
    review_id: 2,
    course_id: '1',
    user_id: '2',
    rating: 4,
    comment: 'Great content, but could use more practical examples.',
    review_date: '2024-01-22T14:30:00Z',
    status: 'approved',
    likes: 8,
    report_count: 0,
    user_name: 'Jane Smith',
    instructor_response: 'Thank you for your feedback! I\'ll add more examples in the next update.',
    response_date: '2024-01-23T09:00:00Z',
    helpful_votes: []
  }
]

export function ReviewsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [reviews, setReviews] = useState<Review[]>([])

  useEffect(() => {
    // Load reviews from localStorage
    const saved = localStorage.getItem('courseReviews')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setReviews(parsed)
      } catch (error) {
        console.error('Error loading reviews:', error)
        setReviews(MOCK_REVIEWS)
      }
    } else {
      setReviews(MOCK_REVIEWS)
    }
  }, [])

  useEffect(() => {
    // Save reviews to localStorage
    if (reviews.length > 0) {
      localStorage.setItem('courseReviews', JSON.stringify(reviews))
    }
  }, [reviews])

  const getCourseReviews = (courseId: string): Review[] => {
    return reviews
      .filter(r => r.course_id === courseId && r.status === 'approved')
      .sort((a, b) => new Date(b.review_date).getTime() - new Date(a.review_date).getTime())
  }

  const getUserReview = (courseId: string): Review | undefined => {
    if (!user) return undefined
    return reviews.find(r => r.course_id === courseId && r.user_id === user.id)
  }

  const hasUserReviewed = (courseId: string): boolean => {
    if (!user) return false
    return reviews.some(r => r.course_id === courseId && r.user_id === user.id)
  }

  const addReview = async (courseId: string, rating: number, comment: string): Promise<boolean> => {
    if (!user) {
      toast.error('Please login to leave a review')
      return false
    }

    if (hasUserReviewed(courseId)) {
      toast.error('You have already reviewed this course')
      return false
    }

    if (rating < 1 || rating > 5) {
      toast.error('Rating must be between 1 and 5')
      return false
    }

    if (!comment.trim()) {
      toast.error('Please write a review comment')
      return false
    }

    const newReview: Review = {
      review_id: Date.now(),
      course_id: courseId,
      user_id: user.id,
      rating,
      comment: comment.trim(),
      review_date: new Date().toISOString(),
      status: 'approved', // In real app, might be 'pending' for moderation
      likes: 0,
      report_count: 0,
      user_name: user.name,
      user_avatar: user.avatar,
      helpful_votes: []
    }

    setReviews(prev => [...prev, newReview])
    toast.success('Review submitted successfully!')
    return true
  }

  const updateReview = async (reviewId: number, rating: number, comment: string): Promise<boolean> => {
    if (!user) {
      toast.error('Please login to update review')
      return false
    }

    const review = reviews.find(r => r.review_id === reviewId && r.user_id === user.id)
    if (!review) {
      toast.error('Review not found')
      return false
    }

    setReviews(prev => prev.map(r => 
      r.review_id === reviewId 
        ? { ...r, rating, comment: comment.trim(), updated_date: new Date().toISOString() }
        : r
    ))

    toast.success('Review updated successfully!')
    return true
  }

  const deleteReview = async (reviewId: number): Promise<boolean> => {
    if (!user) {
      toast.error('Please login to delete review')
      return false
    }

    const review = reviews.find(r => r.review_id === reviewId && r.user_id === user.id)
    if (!review) {
      toast.error('Review not found')
      return false
    }

    setReviews(prev => prev.filter(r => r.review_id !== reviewId))
    toast.success('Review deleted successfully!')
    return true
  }

  const markHelpful = (reviewId: number) => {
    if (!user) {
      toast.error('Please login to mark reviews as helpful')
      return
    }

    setReviews(prev => prev.map(r => {
      if (r.review_id === reviewId) {
        const helpfulVotes = r.helpful_votes || []
        const hasVoted = helpfulVotes.includes(user.id)

        if (hasVoted) {
          // Remove vote
          return {
            ...r,
            likes: Math.max(0, r.likes - 1),
            helpful_votes: helpfulVotes.filter(id => id !== user.id)
          }
        } else {
          // Add vote
          return {
            ...r,
            likes: r.likes + 1,
            helpful_votes: [...helpfulVotes, user.id]
          }
        }
      }
      return r
    }))
  }

  const reportReview = (reviewId: number, reason: string) => {
    if (!user) {
      toast.error('Please login to report reviews')
      return
    }

    setReviews(prev => prev.map(r => 
      r.review_id === reviewId 
        ? { ...r, report_count: r.report_count + 1 }
        : r
    ))

    toast.success('Review reported. Thank you for helping keep our community safe.')
  }

  const getCourseRating = (courseId: string) => {
    const courseReviews = getCourseReviews(courseId)
    
    if (courseReviews.length === 0) {
      return {
        average: 0,
        total: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      }
    }

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    let totalRating = 0

    courseReviews.forEach(review => {
      totalRating += review.rating
      distribution[review.rating as keyof typeof distribution]++
    })

    return {
      average: parseFloat((totalRating / courseReviews.length).toFixed(1)),
      total: courseReviews.length,
      distribution
    }
  }

  const addInstructorResponse = (reviewId: number, response: string) => {
    if (!user || !user.roles.includes('instructor')) {
      toast.error('Only instructors can respond to reviews')
      return
    }

    setReviews(prev => prev.map(r => 
      r.review_id === reviewId 
        ? { 
            ...r, 
            instructor_response: response,
            response_date: new Date().toISOString()
          }
        : r
    ))

    toast.success('Response added successfully!')
  }

  const value = {
    reviews,
    getCourseReviews,
    getUserReview,
    hasUserReviewed,
    addReview,
    updateReview,
    deleteReview,
    markHelpful,
    reportReview,
    getCourseRating,
    addInstructorResponse
  }

  return (
    <ReviewsContext.Provider value={value}>
      {children}
    </ReviewsContext.Provider>
  )
}

export function useReviews() {
  const context = useContext(ReviewsContext)
  if (context === undefined) {
    throw new Error('useReviews must be used within a ReviewsProvider')
  }
  return context
}
