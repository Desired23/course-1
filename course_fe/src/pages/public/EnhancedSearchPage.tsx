import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useRouter } from '../../components/Router'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Avatar } from '../../components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { 
  Search, 
  Filter, 
  Star, 
  Clock, 
  Users, 
  BookOpen,
  MessageCircle,
  Eye,
  CheckCircle,
  Award,
  TrendingUp,
  Calendar,
  User,
  FileText,
  HelpCircle,
  ChevronRight,
  X
} from 'lucide-react'
import { toast } from 'sonner'

// Enhanced search data with categories
const searchData = {
  courses: [
    {
      id: 1,
      type: 'course',
      title: "Complete JavaScript Course 2024: From Zero to Expert!",
      instructor: "Jonas Schmedtmann",
      image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300&h=200&fit=crop",
      price: 89.99,
      originalPrice: 199.99,
      rating: 4.7,
      students: 45230,
      duration: "69 hours",
      level: "All Levels",
      bestseller: true,
      updated: "March 2024",
      category: "Development",
      tags: ["JavaScript", "Web Development", "Programming"]
    },
    {
      id: 2,
      type: 'course',
      title: "React - The Complete Guide (incl Hooks, React Router, Redux)",
      instructor: "Maximilian Schwarzmüller",
      image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=300&h=200&fit=crop",
      price: 79.99,
      originalPrice: 159.99,
      rating: 4.5,
      students: 23167,
      duration: "48 hours",
      level: "Intermediate",
      bestseller: false,
      updated: "February 2024",
      category: "Development",
      tags: ["React", "JavaScript", "Frontend"]
    },
    {
      id: 3,
      type: 'course',
      title: "Python for Data Science and Machine Learning Bootcamp",
      instructor: "Jose Portilla",
      image: "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=300&h=200&fit=crop",
      price: 94.99,
      originalPrice: 189.99,
      rating: 4.6,
      students: 67890,
      duration: "25 hours",
      level: "Beginner",
      bestseller: true,
      updated: "January 2024",
      category: "Data Science",
      tags: ["Python", "Data Science", "Machine Learning"]
    }
  ],
  instructors: [
    {
      id: 1,
      type: 'instructor',
      name: "Jonas Schmedtmann",
      title: "Web Developer, Designer, and Teacher",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
      rating: 4.8,
      students: 892456,
      courses: 12,
      expertise: ["JavaScript", "React", "Node.js", "Web Development"],
      verified: true,
      bio: "Passionate web developer with 10+ years of experience"
    },
    {
      id: 2,
      type: 'instructor',
      name: "Angela Yu",
      title: "Developer and Lead Instructor",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
      rating: 4.7,
      students: 564123,
      courses: 8,
      expertise: ["Python", "Web Development", "iOS Development", "Data Science"],
      verified: true,
      bio: "Full-stack developer and educator"
    },
    {
      id: 3,
      type: 'instructor',
      name: "Maximilian Schwarzmüller",
      title: "Professional Web Developer",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
      rating: 4.6,
      students: 423789,
      courses: 15,
      expertise: ["React", "Vue.js", "Angular", "Node.js"],
      verified: true,
      bio: "Expert in modern web development frameworks"
    }
  ],
  articles: [
    {
      id: 1,
      type: 'article',
      title: "10 JavaScript Concepts Every Developer Should Know",
      excerpt: "Master these essential JavaScript concepts to become a better developer. From closures to async/await...",
      author: "Tech Blog Team",
      publishDate: "2024-01-15",
      readTime: "8 min read",
      tags: ["JavaScript", "Web Development", "Programming"],
      image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300&h=200&fit=crop",
      views: 12450,
      category: "Tutorial"
    },
    {
      id: 2,
      type: 'article',
      title: "React Hooks vs Class Components: A Complete Comparison",
      excerpt: "Learn the differences between React Hooks and Class Components with practical examples and best practices...",
      author: "React Expert",
      publishDate: "2024-01-10",
      readTime: "12 min read",
      tags: ["React", "JavaScript", "Frontend"],
      image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=300&h=200&fit=crop",
      views: 8750,
      category: "Comparison"
    },
    {
      id: 3,
      type: 'article',
      title: "Machine Learning in 2024: Trends and Predictions",
      excerpt: "Explore the latest trends in machine learning and what to expect in 2024...",
      author: "AI Research Team",
      publishDate: "2024-01-05",
      readTime: "15 min read",
      tags: ["Machine Learning", "AI", "Technology"],
      image: "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=300&h=200&fit=crop",
      views: 15230,
      category: "Analysis"
    }
  ],
  qna: [
    {
      id: 1,
      type: 'qna',
      question: "How to handle async operations in React?",
      excerpt: "I'm struggling with handling asynchronous operations in React components. What are the best practices?",
      author: "Sarah Wilson",
      authorAvatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face",
      answers: 15,
      views: 2340,
      tags: ["React", "JavaScript", "Async"],
      lastActivity: "2 hours ago",
      isAnswered: true,
      votes: 23,
      category: "React"
    },
    {
      id: 2,
      type: 'qna',
      question: "Best practices for Node.js error handling?",
      excerpt: "What are the recommended approaches for error handling in Node.js applications?",
      author: "Mike Johnson",
      authorAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
      answers: 8,
      views: 1560,
      tags: ["Node.js", "Error Handling", "Backend"],
      lastActivity: "1 day ago",
      isAnswered: true,
      votes: 18,
      category: "Backend"
    },
    {
      id: 3,
      type: 'qna',
      question: "Python vs JavaScript for beginners?",
      excerpt: "I'm new to programming and can't decide between Python and JavaScript. Which should I start with?",
      author: "Alex Chen",
      authorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
      answers: 22,
      views: 4560,
      tags: ["Python", "JavaScript", "Beginner"],
      lastActivity: "3 hours ago",
      isAnswered: true,
      votes: 35,
      category: "Career"
    }
  ]
}

export function EnhancedSearchPage() {
  const { navigate, params } = useRouter()
  const [activeTab, setActiveTab] = useState<'all' | 'courses' | 'instructors' | 'articles' | 'qna'>('all')
  const [searchQuery, setSearchQuery] = useState(params?.query || '')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([
    "JavaScript basics", "React hooks", "Python data science", "Node.js tutorial"
  ])

  // Popular searches by category
  const popularSearches = {
    courses: ["JavaScript", "React", "Python", "Machine Learning", "Web Development"],
    instructors: ["Jonas Schmedtmann", "Angela Yu", "Maximilian Schwarzmüller"],
    articles: ["JavaScript concepts", "React vs Vue", "Python tutorials"],
    qna: ["React hooks", "Node.js errors", "Python beginners"]
  }

  useEffect(() => {
    if (searchQuery.length > 1) {
      // Mock search suggestions
      const allContent = [
        ...searchData.courses.map(c => c.title),
        ...searchData.instructors.map(i => i.name),
        ...searchData.articles.map(a => a.title),
        ...searchData.qna.map(q => q.question)
      ]
      
      const filtered = allContent
        .filter(item => item.toLowerCase().includes(searchQuery.toLowerCase()))
        .slice(0, 5)
      
      setSuggestions(filtered)
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
    }
  }, [searchQuery])

  const handleSearch = (query: string) => {
    if (query.trim()) {
      setSearchQuery(query)
      setShowSuggestions(false)
      
      // Add to recent searches
      setRecentSearches(prev => {
        const newSearches = [query, ...prev.filter(s => s !== query)].slice(0, 5)
        return newSearches
      })
      
      toast.success(`Searching for "${query}"`)
    }
  }

  const clearSearch = () => {
    setSearchQuery('')
    setSuggestions([])
    setShowSuggestions(false)
  }

  const getFilteredResults = () => {
    if (!searchQuery) return { courses: [], instructors: [], articles: [], qna: [] }
    
    const query = searchQuery.toLowerCase()
    
    return {
      courses: searchData.courses.filter(course => 
        course.title.toLowerCase().includes(query) ||
        course.instructor.toLowerCase().includes(query) ||
        course.tags.some(tag => tag.toLowerCase().includes(query))
      ),
      instructors: searchData.instructors.filter(instructor =>
        instructor.name.toLowerCase().includes(query) ||
        instructor.expertise.some(skill => skill.toLowerCase().includes(query))
      ),
      articles: searchData.articles.filter(article =>
        article.title.toLowerCase().includes(query) ||
        article.excerpt.toLowerCase().includes(query) ||
        article.tags.some(tag => tag.toLowerCase().includes(query))
      ),
      qna: searchData.qna.filter(qa =>
        qa.question.toLowerCase().includes(query) ||
        qa.excerpt.toLowerCase().includes(query) ||
        qa.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }
  }

  const filteredResults = getFilteredResults()
  const totalResults = Object.values(filteredResults).reduce((sum, arr) => sum + arr.length, 0)

  const renderCourseCard = (course: any) => (
    <motion.div
      key={course.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="cursor-pointer"
      onClick={() => navigate(`/course/${course.id}`)}
    >
      <Card className="h-full hover:shadow-lg transition-shadow">
        <div className="relative">
          <img 
            src={course.image} 
            alt={course.title}
            className="w-full h-40 object-cover rounded-t-lg"
          />
          {course.bestseller && (
            <Badge className="absolute top-2 left-2 bg-yellow-500 text-white">
              Bestseller
            </Badge>
          )}
        </div>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-2 line-clamp-2">{course.title}</h3>
          <p className="text-sm text-muted-foreground mb-2">{course.instructor}</p>
          
          <div className="flex items-center mb-2">
            <div className="flex items-center">
              <span className="text-sm font-medium mr-1">{course.rating}</span>
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`w-3 h-3 ${i < Math.floor(course.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground ml-1">
                ({course.students.toLocaleString()})
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{course.duration}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>{course.level}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold">${course.price}</span>
              <span className="text-sm text-muted-foreground line-through">
                ${course.originalPrice}
              </span>
            </div>
            <Badge variant="outline">{course.category}</Badge>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )

  const renderInstructorCard = (instructor: any) => (
    <motion.div
      key={instructor.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="cursor-pointer"
      onClick={() => navigate(`/instructor/${instructor.id}`)}
    >
      <Card className="h-full hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Avatar className="w-16 h-16">
              <img src={instructor.avatar} alt={instructor.name} />
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold">{instructor.name}</h3>
                {instructor.verified && (
                  <CheckCircle className="w-4 h-4 text-blue-500" />
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-2">{instructor.title}</p>
              <p className="text-sm mb-3">{instructor.bio}</p>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span>{instructor.rating}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{instructor.students.toLocaleString()} students</span>
                </div>
                <div className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  <span>{instructor.courses} courses</span>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-1">
                {instructor.expertise.slice(0, 3).map((skill: string) => (
                  <Badge key={skill} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
                {instructor.expertise.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{instructor.expertise.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )

  const renderArticleCard = (article: any) => (
    <motion.div
      key={article.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="cursor-pointer"
      onClick={() => navigate(`/blog/${article.id}`)}
    >
      <Card className="h-full hover:shadow-lg transition-shadow">
        <div className="flex">
          <img 
            src={article.image} 
            alt={article.title}
            className="w-32 h-24 object-cover rounded-l-lg"
          />
          <CardContent className="p-4 flex-1">
            <h3 className="font-semibold mb-2 line-clamp-2">{article.title}</h3>
            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{article.excerpt}</p>
            
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <div className="flex items-center gap-3">
                <span>By {article.author}</span>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(article.publishDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{article.readTime}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                <span>{article.views.toLocaleString()}</span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-1">
              {article.tags.slice(0, 3).map((tag: string) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </div>
      </Card>
    </motion.div>
  )

  const renderQnACard = (qa: any) => (
    <motion.div
      key={qa.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="cursor-pointer"
      onClick={() => navigate(`/qna/${qa.id}`)}
    >
      <Card className="h-full hover:shadow-lg transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="w-10 h-10">
              <img src={qa.authorAvatar} alt={qa.author} />
            </Avatar>
            <div className="flex-1">
              <h3 className="font-semibold mb-2 line-clamp-2">{qa.question}</h3>
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{qa.excerpt}</p>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                <span>by {qa.author}</span>
                <div className="flex items-center gap-1">
                  <MessageCircle className="w-4 h-4" />
                  <span>{qa.answers} answers</span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  <span>{qa.views}</span>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  <span>{qa.votes} votes</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {qa.tags.slice(0, 3).map((tag: string) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                {qa.isAnswered && (
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-xs">Answered</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Search Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search for courses, instructors, articles, or Q&A..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
                  className="pl-10 pr-10 h-12 text-base"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSearch}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              {/* Search Suggestions */}
              <AnimatePresence>
                {showSuggestions && suggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border rounded-lg shadow-lg z-50"
                  >
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSearch(suggestion)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg"
                      >
                        <div className="flex items-center gap-2">
                          <Search className="h-4 w-4 text-muted-foreground" />
                          <span>{suggestion}</span>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="flex items-center justify-center mt-4">
              <Button onClick={() => handleSearch(searchQuery)} className="w-32">
                Search
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Search Results */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {!searchQuery ? (
          // Default state - show popular searches and recent
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="mb-4">Discover What You Want to Learn</h1>
              <p className="text-muted-foreground mb-8">
                Search through our vast collection of courses, expert instructors, helpful articles, and community Q&A
              </p>
            </div>

            {/* Popular Searches */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BookOpen className="w-5 h-5 text-blue-500" />
                    Popular Courses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {popularSearches.courses.map((term) => (
                      <button
                        key={term}
                        onClick={() => handleSearch(term)}
                        className="block w-full text-left px-3 py-2 rounded hover:bg-muted transition-colors"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="w-5 h-5 text-green-500" />
                    Top Instructors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {popularSearches.instructors.map((term) => (
                      <button
                        key={term}
                        onClick={() => handleSearch(term)}
                        className="block w-full text-left px-3 py-2 rounded hover:bg-muted transition-colors"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="w-5 h-5 text-purple-500" />
                    Popular Articles
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {popularSearches.articles.map((term) => (
                      <button
                        key={term}
                        onClick={() => handleSearch(term)}
                        className="block w-full text-left px-3 py-2 rounded hover:bg-muted transition-colors"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <HelpCircle className="w-5 h-5 text-orange-500" />
                    Trending Q&A
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {popularSearches.qna.map((term) => (
                      <button
                        key={term}
                        onClick={() => handleSearch(term)}
                        className="block w-full text-left px-3 py-2 rounded hover:bg-muted transition-colors"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Searches</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((term) => (
                      <Badge
                        key={term}
                        variant="secondary"
                        className="cursor-pointer hover:bg-secondary/80"
                        onClick={() => handleSearch(term)}
                      >
                        {term}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          // Search results
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2>
                {totalResults > 0 
                  ? `${totalResults} results for "${searchQuery}"`
                  : `No results found for "${searchQuery}"`
                }
              </h2>
              {totalResults > 0 && (
                <Button
                  variant="outline"
                  onClick={() => toast.info('Advanced filters coming soon!')}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                </Button>
              )}
            </div>

            {totalResults > 0 && (
              <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="all">All ({totalResults})</TabsTrigger>
                  <TabsTrigger value="courses">Courses ({filteredResults.courses.length})</TabsTrigger>
                  <TabsTrigger value="instructors">Instructors ({filteredResults.instructors.length})</TabsTrigger>
                  <TabsTrigger value="articles">Articles ({filteredResults.articles.length})</TabsTrigger>
                  <TabsTrigger value="qna">Q&A ({filteredResults.qna.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-8">
                  {filteredResults.courses.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Courses</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredResults.courses.slice(0, 3).map(renderCourseCard)}
                      </div>
                      {filteredResults.courses.length > 3 && (
                        <div className="text-center mt-4">
                          <Button variant="outline" onClick={() => setActiveTab('courses')}>
                            View all {filteredResults.courses.length} courses
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {filteredResults.instructors.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Instructors</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filteredResults.instructors.slice(0, 2).map(renderInstructorCard)}
                      </div>
                      {filteredResults.instructors.length > 2 && (
                        <div className="text-center mt-4">
                          <Button variant="outline" onClick={() => setActiveTab('instructors')}>
                            View all {filteredResults.instructors.length} instructors
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {filteredResults.articles.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Articles</h3>
                      <div className="space-y-4">
                        {filteredResults.articles.slice(0, 3).map(renderArticleCard)}
                      </div>
                      {filteredResults.articles.length > 3 && (
                        <div className="text-center mt-4">
                          <Button variant="outline" onClick={() => setActiveTab('articles')}>
                            View all {filteredResults.articles.length} articles
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {filteredResults.qna.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Q&A</h3>
                      <div className="space-y-4">
                        {filteredResults.qna.slice(0, 3).map(renderQnACard)}
                      </div>
                      {filteredResults.qna.length > 3 && (
                        <div className="text-center mt-4">
                          <Button variant="outline" onClick={() => setActiveTab('qna')}>
                            View all {filteredResults.qna.length} Q&A
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="courses">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredResults.courses.map(renderCourseCard)}
                  </div>
                </TabsContent>

                <TabsContent value="instructors">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredResults.instructors.map(renderInstructorCard)}
                  </div>
                </TabsContent>

                <TabsContent value="articles">
                  <div className="space-y-4">
                    {filteredResults.articles.map(renderArticleCard)}
                  </div>
                </TabsContent>

                <TabsContent value="qna">
                  <div className="space-y-4">
                    {filteredResults.qna.map(renderQnACard)}
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>
        )}
      </div>
    </div>
  )
}