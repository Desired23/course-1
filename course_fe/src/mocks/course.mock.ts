




export interface Course {
  id: string
  title: string
  description: string
  instructor: string
  instructor_id: string
  price: number
  original_price: number
  rating: number
  students_count: number
  duration: string
  level: 'beginner' | 'intermediate' | 'advanced' | 'all_levels'
  language: string
  thumbnail: string
  category: string
  subcategory?: string
  is_featured: boolean
  is_bestseller: boolean
  last_updated: string
  total_lessons: number
  total_modules: number
}

const MOCK_COURSES: Course[] = [
  {
    id: '1',
    title: 'Complete React & TypeScript Developer Course',
    description: 'Master React and TypeScript from scratch with hands-on projects',
    instructor: 'John Smith',
    instructor_id: '2',
    price: 499000,
    original_price: 1999000,
    rating: 4.8,
    students_count: 45680,
    duration: '42 hours',
    level: 'intermediate',
    language: 'Tiếng Việt',
    thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800',
    category: 'Development',
    subcategory: 'Web Development',
    is_featured: true,
    is_bestseller: true,
    last_updated: '2024-01-15',
    total_lessons: 280,
    total_modules: 18
  },
  {
    id: '2',
    title: 'NodeJS - The Complete Guide (MVC, REST APIs, GraphQL)',
    description: 'Master Node JS & Deno.js, build REST APIs with Node.js, GraphQL APIs, add Authentication, use MongoDB, SQL & much more!',
    instructor: 'Jane Doe',
    instructor_id: '3',
    price: 449000,
    original_price: 1899000,
    rating: 4.7,
    students_count: 38200,
    duration: '38 hours',
    level: 'all_levels',
    language: 'Tiếng Việt',
    thumbnail: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=800',
    category: 'Development',
    subcategory: 'Backend Development',
    is_featured: true,
    is_bestseller: false,
    last_updated: '2024-01-10',
    total_lessons: 245,
    total_modules: 16
  }
]


const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export async function mockGetCourses(params?: {
  category?: string
  level?: string
  search?: string
  page?: number
  limit?: number
}): Promise<{ courses: Course[]; total: number; page: number; limit: number }> {
  await delay(500)

  let filteredCourses = [...MOCK_COURSES]


  if (params?.category) {
    filteredCourses = filteredCourses.filter(c =>
      c.category.toLowerCase() === params.category?.toLowerCase()
    )
  }

  if (params?.level) {
    filteredCourses = filteredCourses.filter(c => c.level === params.level)
  }

  if (params?.search) {
    const searchLower = params.search.toLowerCase()
    filteredCourses = filteredCourses.filter(c =>
      c.title.toLowerCase().includes(searchLower) ||
      c.description.toLowerCase().includes(searchLower)
    )
  }


  const page = params?.page || 1
  const limit = params?.limit || 12
  const start = (page - 1) * limit
  const end = start + limit
  const paginatedCourses = filteredCourses.slice(start, end)

  return {
    courses: paginatedCourses,
    total: filteredCourses.length,
    page,
    limit
  }
}

export async function mockGetCourse(id: string): Promise<Course | null> {
  await delay(300)

  const course = MOCK_COURSES.find(c => c.id === id)
  return course || null
}

export async function mockCreateCourse(data: Partial<Course>): Promise<Course> {
  await delay(800)

  const newCourse: Course = {
    id: Date.now().toString(),
    title: data.title || 'Untitled Course',
    description: data.description || '',
    instructor: data.instructor || 'Unknown',
    instructor_id: data.instructor_id || '1',
    price: data.price || 0,
    original_price: data.original_price || 0,
    rating: 0,
    students_count: 0,
    duration: data.duration || '0 hours',
    level: data.level || 'beginner',
    language: data.language || 'Tiếng Việt',
    thumbnail: data.thumbnail || '',
    category: data.category || 'Uncategorized',
    subcategory: data.subcategory,
    is_featured: false,
    is_bestseller: false,
    last_updated: new Date().toISOString().split('T')[0],
    total_lessons: 0,
    total_modules: 0
  }

  MOCK_COURSES.push(newCourse)
  return newCourse
}

export async function mockUpdateCourse(id: string, data: Partial<Course>): Promise<Course | null> {
  await delay(600)

  const index = MOCK_COURSES.findIndex(c => c.id === id)
  if (index === -1) return null

  MOCK_COURSES[index] = { ...MOCK_COURSES[index], ...data }
  return MOCK_COURSES[index]
}

export async function mockDeleteCourse(id: string): Promise<boolean> {
  await delay(400)

  const index = MOCK_COURSES.findIndex(c => c.id === id)
  if (index === -1) return false

  MOCK_COURSES.splice(index, 1)
  return true
}

export async function mockGetFeaturedCourses(): Promise<Course[]> {
  await delay(400)
  return MOCK_COURSES.filter(c => c.is_featured)
}

export async function mockGetBestsellerCourses(): Promise<Course[]> {
  await delay(400)
  return MOCK_COURSES.filter(c => c.is_bestseller)
}
