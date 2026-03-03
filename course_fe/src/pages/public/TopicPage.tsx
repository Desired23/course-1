import { useState } from 'react'
import { Search, Filter, Star, Grid, List, X, BookOpen, Users, Clock, TrendingUp } from 'lucide-react'
import { Input } from '../../components/ui/input'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { CourseCard } from '../../components/CourseCard'
import { CategoryBanner } from '../../components/CategoryBanner'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '../../components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Card } from '../../components/ui/card'
import { Separator } from '../../components/ui/separator'
import { Checkbox } from '../../components/ui/checkbox'
import { useRouter } from '../../components/Router'
import { formatCategoryName, BreadcrumbItem } from '../../utils/navigation'

// Mock course data
const topicCourses: Record<string, any[]> = {
  'react': [
    {
      id: '1',
      title: "React - The Complete Guide 2024 (incl. React Router & Redux)",
      instructor: "Maximilian Schwarzmüller",
      image: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800",
      rating: 4.6,
      reviews: 178234,
      price: "₫1.299.000",
      originalPrice: "₫3.599.000",
      duration: "49 hours",
      students: "650K+",
      level: "All Levels",
      bestseller: true,
      lastUpdated: '10/2024'
    },
    {
      id: '2',
      title: "Modern React with Redux",
      instructor: "Stephen Grider",
      image: "https://images.unsplash.com/photo-1633356122102-3fe601e05bd2?w=800",
      rating: 4.7,
      reviews: 112456,
      price: "₫1.299.000",
      originalPrice: "₫3.299.000",
      duration: "52 hours",
      students: "420K+",
      level: "Beginner",
      bestseller: true,
      lastUpdated: '11/2024'
    },
    {
      id: '3',
      title: "Advanced React and Redux",
      instructor: "Stephen Grider",
      image: "https://images.unsplash.com/photo-1587620962725-abab7fe55159?w=800",
      rating: 4.6,
      reviews: 89234,
      price: "₫1.299.000",
      originalPrice: "₫2.999.000",
      duration: "28 hours",
      students: "280K+",
      level: "Advanced",
      bestseller: false,
      lastUpdated: '09/2024'
    }
  ],
  'python': [
    {
      id: '4',
      title: "100 Days of Code: The Complete Python Pro Bootcamp",
      instructor: "Dr. Angela Yu",
      image: "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=800",
      rating: 4.7,
      reviews: 245678,
      price: "₫1.299.000",
      originalPrice: "₫3.499.000",
      duration: "60 hours",
      students: "780K+",
      level: "All Levels",
      bestseller: true,
      lastUpdated: '11/2024'
    },
    {
      id: '5',
      title: "Python for Data Science and Machine Learning Bootcamp",
      instructor: "Jose Portilla",
      image: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800",
      rating: 4.6,
      reviews: 145678,
      price: "₫1.299.000",
      originalPrice: "₫3.199.000",
      duration: "25 hours",
      students: "720K+",
      level: "Beginner",
      bestseller: true,
      lastUpdated: '10/2024'
    }
  ],
  'javascript': [
    {
      id: '6',
      title: "The Complete JavaScript Course 2024: From Zero to Expert!",
      instructor: "Jonas Schmedtmann",
      image: "https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?w=800",
      rating: 4.7,
      reviews: 198765,
      price: "₫1.299.000",
      originalPrice: "₫3.599.000",
      duration: "69 hours",
      students: "680K+",
      level: "All Levels",
      bestseller: true,
      lastUpdated: '11/2024'
    },
    {
      id: '7',
      title: "JavaScript: The Advanced Concepts",
      instructor: "Andrei Neagoie",
      image: "https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=800",
      rating: 4.7,
      reviews: 87654,
      price: "���1.299.000",
      originalPrice: "₫2.999.000",
      duration: "25 hours",
      students: "320K+",
      level: "Advanced",
      bestseller: false,
      lastUpdated: '09/2024'
    }
  ],
  'nodejs': [
    {
      id: '8',
      title: "Node.js, Express, MongoDB & More: The Complete Bootcamp",
      instructor: "Jonas Schmedtmann",
      image: "https://images.unsplash.com/photo-1618477388954-7852f32655ec?w=800",
      rating: 4.8,
      reviews: 125678,
      price: "₫1.299.000",
      originalPrice: "₫3.299.000",
      duration: "42 hours",
      students: "480K+",
      level: "All Levels",
      bestseller: true,
      lastUpdated: '11/2024'
    }
  ],
  'machine-learning': [
    {
      id: '9',
      title: "Machine Learning A-Z: AI, Python & R + ChatGPT Prize",
      instructor: "Kirill Eremenko, Hadelin de Ponteves",
      image: "https://images.unsplash.com/photo-1666875753105-c63a6f3bdc86?w=800",
      rating: 4.5,
      reviews: 187432,
      price: "₫1.299.000",
      originalPrice: "₫3.799.000",
      duration: "44 hours",
      students: "1.2M+",
      level: "Beginner",
      bestseller: true,
      lastUpdated: '11/2024'
    }
  ]
}

const levels = ['All Levels', 'Beginner', 'Intermediate', 'Advanced']
const ratings = [4.5, 4.0, 3.5, 3.0]

// Topic metadata
const topicMetadata: Record<string, { 
  title: string
  description: string
  parentCategory: string
  relatedTopics: string[]
}> = {
  'react': {
    title: 'React',
    description: 'Build powerful, interactive web applications with React - the most popular JavaScript library for building user interfaces',
    parentCategory: 'Web Development',
    relatedTopics: ['Redux', 'Next.js', 'TypeScript', 'JavaScript']
  },
  'python': {
    title: 'Python',
    description: 'Master Python programming from basics to advanced topics including data science, machine learning, and web development',
    parentCategory: 'Programming Languages',
    relatedTopics: ['Django', 'Flask', 'Data Science', 'Machine Learning']
  },
  'javascript': {
    title: 'JavaScript',
    description: 'Learn JavaScript and become a full-stack developer. Master the language that powers the modern web',
    parentCategory: 'Web Development',
    relatedTopics: ['Node.js', 'React', 'Vue.js', 'TypeScript']
  },
  'nodejs': {
    title: 'Node.js',
    description: 'Build scalable server-side applications with Node.js, the JavaScript runtime for backend development',
    parentCategory: 'Web Development',
    relatedTopics: ['Express.js', 'MongoDB', 'REST API', 'JavaScript']
  },
  'machine-learning': {
    title: 'Machine Learning',
    description: 'Dive into AI and machine learning. Learn to build intelligent systems that learn from data',
    parentCategory: 'Data Science',
    relatedTopics: ['Deep Learning', 'Python', 'TensorFlow', 'PyTorch']
  }
}

export default function TopicPage() {
  const { currentRoute, navigate } = useRouter()
  
  // Extract topic from URL
  const pathParts = currentRoute.split('/').filter(Boolean)
  const topicSlug = pathParts[1] || ''
  
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLevels, setSelectedLevels] = useState<string[]>([])
  const [selectedRating, setSelectedRating] = useState<number | null>(null)
  const [sortBy, setSortBy] = useState('most-popular')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  
  // Get topic info and courses
  const topicInfo = topicMetadata[topicSlug] || {
    title: formatCategoryName(topicSlug),
    description: `Learn ${formatCategoryName(topicSlug)} with expert-led courses`,
    parentCategory: 'All Courses',
    relatedTopics: []
  }
  
  const courses = topicCourses[topicSlug] || []
  
  // Generate breadcrumb
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Home', href: '/' },
    { label: 'Topics', href: '/topics' },
    { label: topicInfo.title, href: `/topic/${topicSlug}` }
  ]
  
  // Filter courses
  const filteredCourses = courses.filter(course => {
    // Search filter
    if (searchQuery && !course.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !course.instructor.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    
    // Level filter
    if (selectedLevels.length > 0 && !selectedLevels.includes(course.level)) {
      return false
    }
    
    // Rating filter
    if (selectedRating && course.rating < selectedRating) {
      return false
    }
    
    return true
  })
  
  // Sort courses
  const sortedCourses = [...filteredCourses].sort((a, b) => {
    switch (sortBy) {
      case 'most-popular':
        return parseInt(b.students) - parseInt(a.students)
      case 'highest-rated':
        return b.rating - a.rating
      case 'newest':
        return b.lastUpdated.localeCompare(a.lastUpdated)
      case 'price-low-high':
        return parseInt(a.price.replace(/\D/g, '')) - parseInt(b.price.replace(/\D/g, ''))
      case 'price-high-low':
        return parseInt(b.price.replace(/\D/g, '')) - parseInt(a.price.replace(/\D/g, ''))
      default:
        return 0
    }
  })
  
  const clearFilters = () => {
    setSearchQuery('')
    setSelectedLevels([])
    setSelectedRating(null)
  }
  
  const hasActiveFilters = searchQuery || selectedLevels.length > 0 || selectedRating !== null
  
  // Calculate stats
  const totalStudents = courses.reduce((sum, c) => {
    const students = c.students.replace(/[K+M+]/g, '')
    const multiplier = c.students.includes('M') ? 1000000 : c.students.includes('K') ? 1000 : 1
    return sum + (parseFloat(students) * multiplier)
  }, 0)
  
  const avgRating = courses.length > 0 
    ? (courses.reduce((sum, c) => sum + c.rating, 0) / courses.length).toFixed(1)
    : '0'
  
  // Filters sidebar component
  const FiltersSidebar = () => (
    <div className="space-y-6">
      {/* Ratings */}
      <div>
        <h3 className="font-semibold mb-3">Ratings</h3>
        <div className="space-y-2">
          {ratings.map(rating => (
            <div key={rating} className="flex items-center gap-2">
              <Checkbox
                checked={selectedRating === rating}
                onCheckedChange={(checked) => {
                  setSelectedRating(checked ? rating : null)
                }}
              />
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm">{rating} & up</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <Separator />
      
      {/* Level */}
      <div>
        <h3 className="font-semibold mb-3">Level</h3>
        <div className="space-y-2">
          {levels.map(level => (
            <div key={level} className="flex items-center gap-2">
              <Checkbox
                checked={selectedLevels.includes(level)}
                onCheckedChange={(checked) => {
                  setSelectedLevels(prev =>
                    checked
                      ? [...prev, level]
                      : prev.filter(l => l !== level)
                  )
                }}
              />
              <span className="text-sm">{level}</span>
            </div>
          ))}
        </div>
      </div>
      
      {hasActiveFilters && (
        <>
          <Separator />
          <Button
            variant="outline"
            className="w-full"
            onClick={clearFilters}
          >
            Clear all filters
          </Button>
        </>
      )}
    </div>
  )
  
  return (
    <div className="min-h-screen bg-background">
      {/* Topic Banner */}
      <CategoryBanner
        title={topicInfo.title}
        description={topicInfo.description}
        breadcrumbItems={breadcrumbItems}
        totalCourses={courses.length}
      />
      
      {/* Topic Stats */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 md:py-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-2 md:p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <BookOpen className="w-4 h-4 md:w-6 md:h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-lg md:text-2xl font-semibold">{courses.length}</p>
                <p className="text-xs md:text-sm text-muted-foreground">Courses</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-2 md:p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Users className="w-4 h-4 md:w-6 md:h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-lg md:text-2xl font-semibold">
                  {totalStudents >= 1000000 
                    ? `${(totalStudents / 1000000).toFixed(1)}M+` 
                    : `${(totalStudents / 1000).toFixed(0)}K+`
                  }
                </p>
                <p className="text-xs md:text-sm text-muted-foreground">Students</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-2 md:p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                <Star className="w-4 h-4 md:w-6 md:h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-lg md:text-2xl font-semibold">{avgRating}</p>
                <p className="text-xs md:text-sm text-muted-foreground">Avg Rating</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-2 md:p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <TrendingUp className="w-4 h-4 md:w-6 md:h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-lg md:text-2xl font-semibold">Top Rated</p>
                <p className="text-xs md:text-sm text-muted-foreground">Quality</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Related Topics */}
      {topicInfo.relatedTopics.length > 0 && (
        <div className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <h2 className="text-lg font-semibold mb-3">Related topics</h2>
            <div className="flex flex-wrap gap-2">
              {topicInfo.relatedTopics.map(topic => (
                <Button
                  key={topic}
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/topic/${topic.toLowerCase().replace(/\s+/g, '-')}`)}
                  className="hover:bg-purple-600 hover:text-white hover:border-purple-600"
                >
                  {topic}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}
      
      <div className="container mx-auto px-4 py-6 md:py-8">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Filters Sidebar - Desktop */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <Card className="p-4 lg:p-6 sticky top-24">
              <div className="flex items-center justify-between mb-4 lg:mb-6">
                <h2 className="font-semibold text-sm lg:text-base">Filters</h2>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-auto p-0 text-xs text-purple-400 hover:text-purple-300"
                  >
                    Clear all
                  </Button>
                )}
              </div>
              <FiltersSidebar />
            </Card>
          </aside>
          
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Search and Controls Bar */}
            <div className="mb-4 md:mb-6 space-y-3 md:space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Search courses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {/* Controls Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  <p className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                    {sortedCourses.length} courses
                  </p>
                  
                  {/* Mobile Filter Button */}
                  <Sheet open={showFilters} onOpenChange={setShowFilters}>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm" className="lg:hidden text-xs">
                        <Filter className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                        Filters
                        {hasActiveFilters && (
                          <Badge className="ml-1 sm:ml-2 h-4 w-4 sm:h-5 sm:w-5 rounded-full p-0 flex items-center justify-center text-xs">
                            !
                          </Badge>
                        )}
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-80 overflow-y-auto">
                      <SheetHeader>
                        <SheetTitle>Filters</SheetTitle>
                        <SheetDescription>Refine your search with filters</SheetDescription>
                      </SheetHeader>
                      <div className="mt-6">
                        <FiltersSidebar />
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
                
                <div className="flex items-center gap-2 sm:gap-4">
                  {/* View Mode Toggle */}
                  <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'grid' | 'list')}>
                    <TabsList className="hidden sm:flex">
                      <TabsTrigger value="grid">
                        <Grid className="w-4 h-4" />
                      </TabsTrigger>
                      <TabsTrigger value="list">
                        <List className="w-4 h-4" />
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  
                  {/* Sort By */}
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full sm:w-[180px] text-xs sm:text-sm">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="most-popular">Most Popular</SelectItem>
                      <SelectItem value="highest-rated">Highest Rated</SelectItem>
                      <SelectItem value="newest">Newest</SelectItem>
                      <SelectItem value="price-low-high">Price: Low to High</SelectItem>
                      <SelectItem value="price-high-low">Price: High to Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Active Filters */}
              {hasActiveFilters && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">Active filters:</span>
                  {selectedLevels.map(level => (
                    <Badge key={level} variant="secondary" className="gap-1">
                      {level}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => setSelectedLevels(prev => prev.filter(l => l !== level))}
                      />
                    </Badge>
                  ))}
                  {selectedRating && (
                    <Badge variant="secondary" className="gap-1">
                      {selectedRating}+ stars
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => setSelectedRating(null)}
                      />
                    </Badge>
                  )}
                </div>
              )}
            </div>
            
            {/* Courses Grid/List */}
            {sortedCourses.length > 0 ? (
              <div className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'
                  : 'space-y-4'
              }>
                {sortedCourses.map((course) => (
                  <CourseCard
                    key={course.id}
                    {...course}
                    variant={viewMode === 'list' ? 'horizontal' : 'vertical'}
                  />
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No courses found</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your filters or search query
                </p>
                {hasActiveFilters && (
                  <Button onClick={clearFilters}>Clear all filters</Button>
                )}
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}