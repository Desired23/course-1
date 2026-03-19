import { useState } from 'react'
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Input } from "../../components/ui/input"
import { Textarea } from "../../components/ui/textarea"
import { Badge } from "../../components/ui/badge"
import { Progress } from "../../components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar"
import { Star, ThumbsUp, ThumbsDown, Search, Filter, Edit3, Trash2, AlertCircle, Reply, MessageCircle, Send } from 'lucide-react'
import { useRouter } from "../../components/Router"
import { DashboardSidebar } from "../../components/DashboardSidebar"
import { useAuth } from "../../contexts/AuthContext"
import { useNotifications } from "../../contexts/NotificationContext"
import { toast } from "sonner"

// Mock reviews data
const reviewsData = [
  {
    id: 1,
    rating: 5,
    title: "Excellent course! Highly recommended",
    content: "This course exceeded my expectations. The instructor explains complex concepts in a very clear and understandable way. The practical examples and projects really helped me grasp the material.",
    reviewer: {
      name: "Sarah Johnson",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b789?w=40&h=40&fit=crop&crop=face",
      initials: "SJ"
    },
    date: "March 15, 2024",
    helpful: 24,
    notHelpful: 2,
    verified: true,
    isOwn: false
  },
  {
    id: 2,
    rating: 4,
    title: "Great content, could use better audio quality",
    content: "The course content is fantastic and very comprehensive. However, the audio quality in some videos could be improved. Overall, still a great learning experience.",
    reviewer: {
      name: "Mike Chen",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face",
      initials: "MC"
    },
    date: "March 12, 2024",
    helpful: 18,
    notHelpful: 3,
    verified: true,
    isOwn: false
  },
  {
    id: 3,
    rating: 5,
    title: "Perfect for beginners and intermediate learners",
    content: "I've been programming for 2 years and this course still taught me so much. The progression from basic to advanced topics is perfectly structured.",
    reviewer: {
      name: "Emily Davis",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face",
      initials: "ED"
    },
    date: "March 10, 2024",
    helpful: 31,
    notHelpful: 1,
    verified: true,
    isOwn: true // This is the user's own review
  },
  {
    id: 4,
    rating: 3,
    title: "Good course but moves too fast",
    content: "The course covers a lot of ground which is great, but sometimes it feels rushed. I had to pause and rewatch sections multiple times to fully understand.",
    reviewer: {
      name: "David Wilson",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop&crop=face",
      initials: "DW"
    },
    date: "March 8, 2024",
    helpful: 12,
    notHelpful: 8,
    verified: true,
    isOwn: false
  }
]

// Mock course info
const courseInfo = {
  title: "The Complete JavaScript Course 2024: From Zero to Expert!",
  instructor: "Jonas Schmedtmann",
  averageRating: 4.6,
  totalReviews: 127543,
  ratingDistribution: {
    5: 78,
    4: 15,
    3: 4,
    2: 2,
    1: 1
  }
}

export function CourseReviewsPage() {
  const { params, currentRoute } = useRouter()
  const { user } = useAuth()
  const { addNotification } = useNotifications()
  const courseId = params?.courseId
  const isInstructorView = currentRoute.startsWith('/instructor/')
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState(isInstructorView ? "recent" : "helpful")
  const [filterRating, setFilterRating] = useState("all")
  const [selectedCourse, setSelectedCourse] = useState("all")
  const [showWriteReview, setShowWriteReview] = useState(false)
  const [newReview, setNewReview] = useState({
    rating: 0,
    title: '',
    content: ''
  })
  const [replyingTo, setReplyingTo] = useState<number | null>(null)
  const [replyText, setReplyText] = useState("")
  
  // Get new reviews count (reviews from last 7 days)
  const newReviewsCount = 5 // In real app, calculate from actual data
  
  // Mock course list for instructor
  const instructorCourses = [
    { id: 'all', name: 'All Courses' },
    { id: '1', name: 'React - The Complete Guide' },
    { id: '2', name: 'JavaScript Fundamentals' },
    { id: '3', name: 'Advanced TypeScript' }
  ]

  const filteredReviews = reviewsData.filter(review => {
    const matchesSearch = review.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         review.content.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCourse = selectedCourse === 'all' || true // In real app, filter by actual course
    
    if (filterRating === "all") return matchesSearch && matchesCourse
    return matchesSearch && matchesCourse && review.rating === parseInt(filterRating)
  })

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Submitting review:', newReview)
    setNewReview({ rating: 0, title: '', content: '' })
    setShowWriteReview(false)
  }

  const handleHelpful = (reviewId: number, helpful: boolean) => {
    console.log('Rating review:', { reviewId, helpful })
    toast.success(helpful ? "Marked as helpful" : "Feedback recorded")
  }

  const handleReplyToReview = (reviewId: number) => {
    if (!replyText.trim()) {
      toast.error("Please enter a reply")
      return
    }

    console.log('Replying to review:', reviewId, replyText)
    
    // Send notification to reviewer
    addNotification({
      type: 'review_response',
      title: 'Instructor responded to your review',
      message: `${user?.name || 'Instructor'} replied to your review`,
      timestamp: new Date()
    })
    
    toast.success("Reply posted successfully!")
    setReplyText("")
    setReplyingTo(null)
  }

  const StarRating = ({ rating, size = "h-4 w-4", interactive = false, onRatingChange }: any) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${size} ${
              star <= rating 
                ? "fill-yellow-400 text-yellow-400" 
                : "text-gray-300"
            } ${interactive ? "cursor-pointer hover:text-yellow-400" : ""}`}
            onClick={() => interactive && onRatingChange?.(star)}
          />
        ))}
      </div>
    )
  }

  const content = (
    <>
      {/* Course Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="mb-2">{isInstructorView ? 'Student Reviews' : 'Course Reviews'}</h1>
            <p className="text-muted-foreground">{courseInfo.title}</p>
          </div>
          {isInstructorView && newReviewsCount > 0 && (
            <div className="flex items-center gap-2 text-blue-600 bg-blue-50 dark:bg-blue-950 px-4 py-2 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">{newReviewsCount} new review{newReviewsCount !== 1 ? 's' : ''} this week</span>
            </div>
          )}
        </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Rating Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Overall Rating</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="text-4xl font-bold">{courseInfo.averageRating}</div>
                  <div>
                    <StarRating rating={Math.round(courseInfo.averageRating)} size="h-6 w-6" />
                    <p className="text-sm text-muted-foreground mt-1">
                      {courseInfo.totalReviews.toLocaleString()} reviews
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {Object.entries(courseInfo.ratingDistribution)
                    .reverse()
                    .map(([rating, percentage]) => (
                    <div key={rating} className="flex items-center gap-2">
                      <span className="text-sm w-4">{rating}</span>
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <Progress value={percentage} className="flex-1 h-2" />
                      <span className="text-sm text-muted-foreground w-8">{percentage}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Write Review or Instructor Stats */}
            {!isInstructorView ? (
              <Card>
                <CardHeader>
                  <CardTitle>Write a Review</CardTitle>
                  <CardDescription>
                    Share your experience with other students
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!showWriteReview ? (
                    <Button onClick={() => setShowWriteReview(true)} className="w-full gap-2">
                      <Edit3 className="h-4 w-4" />
                      Write a Review
                    </Button>
                  ) : (
                    <form onSubmit={handleSubmitReview} className="space-y-4">
                      <div className="space-y-2">
                        <label>Rating</label>
                        <StarRating 
                          rating={newReview.rating} 
                          size="h-8 w-8"
                          interactive 
                          onRatingChange={(rating: number) => setNewReview(prev => ({ ...prev, rating }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <label>Review Title</label>
                        <Input
                          placeholder="Summarize your review in one line"
                          value={newReview.title}
                          onChange={(e) => setNewReview(prev => ({ ...prev, title: e.target.value }))}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label>Review</label>
                        <Textarea
                          placeholder="Tell others about your experience with this course..."
                          value={newReview.content}
                          onChange={(e) => setNewReview(prev => ({ ...prev, content: e.target.value }))}
                          className="min-h-[100px]"
                          required
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button type="submit">Submit Review</Button>
                        <Button type="button" variant="outline" onClick={() => setShowWriteReview(false)}>
                          Cancel
                        </Button>
                      </div>
                    </form>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>
                    Review activity from the last 30 days
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">New Reviews</span>
                      <span className="font-medium text-lg">{newReviewsCount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Avg. Response Time</span>
                      <span className="font-medium text-lg">2.3 days</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Helpful Votes</span>
                      <span className="font-medium text-lg">142</span>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full">
                    View Analytics
                  </Button>
                </CardContent>
              </Card>
            )}
        </div>
      </div>

      {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search reviews..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={filterRating} onValueChange={setFilterRating}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Filter by rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ratings</SelectItem>
              <SelectItem value="5">5 Stars</SelectItem>
              <SelectItem value="4">4 Stars</SelectItem>
              <SelectItem value="3">3 Stars</SelectItem>
              <SelectItem value="2">2 Stars</SelectItem>
              <SelectItem value="1">1 Star</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="helpful">Most Helpful</SelectItem>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="rating-high">Highest Rating</SelectItem>
              <SelectItem value="rating-low">Lowest Rating</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Reviews List */}
        <div className="space-y-6">
          {filteredReviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Review Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={review.reviewer.avatar} />
                        <AvatarFallback>{review.reviewer.initials}</AvatarFallback>
                      </Avatar>
                      
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{review.reviewer.name}</span>
                          {review.verified && (
                            <Badge variant="outline" className="text-green-600">
                              Verified
                            </Badge>
                          )}
                          {review.isOwn && (
                            <Badge variant="secondary">Your Review</Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 mb-2">
                          <StarRating rating={review.rating} />
                          <span className="text-sm text-muted-foreground">{review.date}</span>
                        </div>
                      </div>
                    </div>

                    {review.isOwn && (
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Review Content */}
                  <div>
                    <h4 className="font-medium mb-2">{review.title}</h4>
                    <p className="text-muted-foreground">{review.content}</p>
                  </div>

                  {/* Review Actions */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-2"
                          onClick={() => handleHelpful(review.id, true)}
                        >
                          <ThumbsUp className="h-4 w-4" />
                          Helpful ({review.helpful})
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-2"
                          onClick={() => handleHelpful(review.id, false)}
                        >
                          <ThumbsDown className="h-4 w-4" />
                          Not helpful ({review.notHelpful})
                        </Button>
                      </div>

                      <div className="flex items-center gap-2">
                        {isInstructorView && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setReplyingTo(review.id)}
                          >
                            <Reply className="h-4 w-4 mr-2" />
                            Reply
                          </Button>
                        )}
                        <Button variant="ghost" size="sm">
                          Report
                        </Button>
                      </div>
                    </div>

                    {/* Reply Form for Instructor */}
                    {isInstructorView && replyingTo === review.id && (
                      <div className="pl-4 border-l-2 border-primary space-y-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MessageCircle className="h-4 w-4" />
                          <span>Replying as instructor</span>
                        </div>
                        <Textarea
                          placeholder="Write your response to the reviewer..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          className="min-h-[80px]"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleReplyToReview(review.id)}>
                            <Send className="h-4 w-4 mr-2" />
                            Post Reply
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => {
                              setReplyingTo(null)
                              setReplyText("")
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredReviews.length === 0 && (
            <div className="text-center py-12">
              <Star className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="mb-2">No reviews found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? "Try different search terms" : "Be the first to review this course!"}
              </p>
              {!isInstructorView && (
                <Button onClick={() => setShowWriteReview(true)}>
                  Write First Review
                </Button>
              )}
            </div>
          )}
        </div>
      </>
    )

  if (isInstructorView) {
    return (
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar type="instructor" />
        
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {content}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {content}
      </div>
    </div>
  )
}