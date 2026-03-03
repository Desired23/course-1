// ============================================
// EXTENDED MOCK DATA - Complete DB Structure
// ============================================
// Import base data
import { categories as baseCategories, users as baseUsers, instructors as baseInstructors, courses as baseCourses } from './db'

// Re-export base data
export { baseCategories as categories, baseUsers as users, baseInstructors as instructors, baseCourses as courses }

// ============================================
// SUBCATEGORIES (Based on parent_category relationship)
// ============================================
export const subcategories = [
  // Development subcategories
  { category_id: 101, name: "Web Development", parent_category: 1, description: "Learn HTML, CSS, JavaScript, React, and more", status: "active", created_at: new Date(), updated_at: new Date() },
  { category_id: 102, name: "Mobile Development", parent_category: 1, description: "iOS, Android, React Native, Flutter", status: "active", created_at: new Date(), updated_at: new Date() },
  { category_id: 103, name: "Programming Languages", parent_category: 1, description: "Python, Java, C++, JavaScript, and more", status: "active", created_at: new Date(), updated_at: new Date() },
  { category_id: 104, name: "Game Development", parent_category: 1, description: "Unity, Unreal Engine, C#", status: "active", created_at: new Date(), updated_at: new Date() },
  { category_id: 105, name: "Database Design", parent_category: 1, description: "SQL, MongoDB, PostgreSQL", status: "active", created_at: new Date(), updated_at: new Date() },
  
  // Business subcategories
  { category_id: 201, name: "Entrepreneurship", parent_category: 2, description: "Start and grow your business", status: "active", created_at: new Date(), updated_at: new Date() },
  { category_id: 202, name: "Communication", parent_category: 2, description: "Public speaking, writing, presentation", status: "active", created_at: new Date(), updated_at: new Date() },
  { category_id: 203, name: "Management", parent_category: 2, description: "Leadership, project management", status: "active", created_at: new Date(), updated_at: new Date() },
  
  // Design subcategories
  { category_id: 301, name: "Graphic Design", parent_category: 3, description: "Photoshop, Illustrator, branding", status: "active", created_at: new Date(), updated_at: new Date() },
  { category_id: 302, name: "UX/UI Design", parent_category: 3, description: "User experience, interface design", status: "active", created_at: new Date(), updated_at: new Date() },
  { category_id: 303, name: "3D & Animation", parent_category: 3, description: "Blender, Maya, After Effects", status: "active", created_at: new Date(), updated_at: new Date() },
  
  // Marketing subcategories
  { category_id: 401, name: "Digital Marketing", parent_category: 4, description: "SEO, SEM, content marketing", status: "active", created_at: new Date(), updated_at: new Date() },
  { category_id: 402, name: "Social Media Marketing", parent_category: 4, description: "Facebook, Instagram, TikTok", status: "active", created_at: new Date(), updated_at: new Date() }
]

// ============================================
// COURSE MODULES
// ============================================
export const courseModules = [
  // Course 1 modules
  { module_id: 1, course_id: 1, title: "Introduction to Web Development", description: "Get started with web development basics", order_number: 1, duration: 120, status: "published", created_date: new Date(), updated_date: new Date() },
  { module_id: 2, course_id: 1, title: "HTML Fundamentals", description: "Master HTML structure and elements", order_number: 2, duration: 180, status: "published", created_date: new Date(), updated_date: new Date() },
  { module_id: 3, course_id: 1, title: "CSS Styling", description: "Style your websites with CSS", order_number: 3, duration: 240, status: "published", created_date: new Date(), updated_date: new Date() },
  { module_id: 4, course_id: 1, title: "JavaScript Basics", description: "Learn JavaScript programming", order_number: 4, duration: 300, status: "published", created_date: new Date(), updated_date: new Date() },
  
  // Course 2 modules
  { module_id: 5, course_id: 2, title: "React Fundamentals", description: "Learn React basics", order_number: 1, duration: 150, status: "published", created_date: new Date(), updated_date: new Date() },
  { module_id: 6, course_id: 2, title: "React Hooks", description: "Master React Hooks", order_number: 2, duration: 180, status: "published", created_date: new Date(), updated_date: new Date() },
  { module_id: 7, course_id: 2, title: "State Management", description: "Redux and Context API", order_number: 3, duration: 200, status: "published", created_date: new Date(), updated_date: new Date() },
]

// ============================================
// LESSONS
// ============================================
export const lessons = [
  // Module 1 lessons
  { lesson_id: 1, coursemodule_id: 1, title: "Course Introduction", description: "Welcome to the course", content_type: "video", content: null, video_url: "https://www.youtube.com/watch?v=VBKNoLcj8jA", file_path: null, duration: 15, is_free: true, order: 1, status: "published", created_at: new Date(), updated_at: new Date() },
  { lesson_id: 2, coursemodule_id: 1, title: "What is Web Development?", description: "Overview of web development", content_type: "video", content: null, video_url: "https://www.youtube.com/watch?v=VBKNoLcj8jA", file_path: null, duration: 25, is_free: true, order: 2, status: "published", created_at: new Date(), updated_at: new Date() },
  { lesson_id: 3, coursemodule_id: 1, title: "Setting Up Your Environment", description: "Install necessary tools", content_type: "video", content: null, video_url: "https://www.youtube.com/watch?v=VBKNoLcj8jA", file_path: null, duration: 30, is_free: true, order: 3, status: "published", created_at: new Date(), updated_at: new Date() },
  { lesson_id: 4, coursemodule_id: 1, title: "Module 1 Quiz", description: "Test your knowledge", content_type: "quiz", content: null, video_url: null, file_path: null, duration: 10, is_free: false, order: 4, status: "published", created_at: new Date(), updated_at: new Date() },
  
  // Module 2 lessons
  { lesson_id: 5, coursemodule_id: 2, title: "HTML Structure", description: "Learn HTML document structure", content_type: "video", content: null, video_url: "https://www.youtube.com/watch?v=VBKNoLcj8jA", file_path: null, duration: 35, is_free: false, order: 1, status: "published", created_at: new Date(), updated_at: new Date() },
  { lesson_id: 6, coursemodule_id: 2, title: "HTML Elements", description: "Common HTML elements", content_type: "video", content: null, video_url: "https://www.youtube.com/watch?v=VBKNoLcj8jA", file_path: null, duration: 40, is_free: false, order: 2, status: "published", created_at: new Date(), updated_at: new Date() },
  { lesson_id: 7, coursemodule_id: 2, title: "Programming Challenge - Code Quiz", description: "Test your coding skills with Two Sum and FizzBuzz challenges", content_type: "quiz", content: null, video_url: null, file_path: null, duration: 30, is_free: false, order: 3, status: "published", created_at: new Date(), updated_at: new Date() },
]

// ============================================
// QUIZ QUESTIONS
// ============================================
export const quizQuestions = [
  {
    question_id: 1,
    lesson_id: 4,
    question_text: "What does HTML stand for?",
    question_type: "multiple_choice",
    options: ["Hyper Text Markup Language", "High Tech Modern Language", "Home Tool Markup Language", "Hyperlinks and Text Markup Language"],
    correct_answer: "Hyper Text Markup Language",
    points: 10,
    explanation: "HTML stands for Hyper Text Markup Language, which is the standard markup language for creating web pages.",
    order_number: 1,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    question_id: 2,
    lesson_id: 4,
    question_text: "Which programming language runs in the browser?",
    question_type: "multiple_choice",
    options: ["Python", "Java", "JavaScript", "C++"],
    correct_answer: "JavaScript",
    points: 10,
    explanation: "JavaScript is the programming language that runs directly in web browsers.",
    order_number: 2,
    created_at: new Date(),
    updated_at: new Date()
  },
  // CODE QUIZ - Lesson 5 (Programming Challenge)
  {
    question_id: 3,
    lesson_id: 7,
    question_text: "Two Sum Problem",
    question_type: "code",
    options: [],
    correct_answer: "",
    points: 50,
    explanation: null,
    order_number: 1,
    created_at: new Date(),
    updated_at: new Date(),
    // Code question specific fields
    code_config: {
      description: "Given an array of integers nums and an integer target, return the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution.\n\nExample:\nInput: nums = [2,7,11,15], target = 9\nOutput: [2,7]\nExplanation: Because nums[0] + nums[1] == 9, we return [2, 7].",
      allowedLanguages: [63, 71, 62], // JavaScript, Python, Java
      starterCode: {
        javascript: `function twoSum(nums, target) {
  // Your code here
  
}`,
        python: `def two_sum(nums, target):
    # Your code here
    pass`
      },
      testCases: [
        {
          id: 1,
          input: "2,7,11,15\n9",
          expectedOutput: "2,7",
          isHidden: false,
          points: 15
        },
        {
          id: 2,
          input: "3,2,4\n6",
          expectedOutput: "2,4",
          isHidden: false,
          points: 15
        },
        {
          id: 3,
          input: "1,5,3,7,9,2\n10",
          expectedOutput: "1,9",
          isHidden: true,
          points: 20
        }
      ],
      timeLimit: 3,
      memoryLimit: 128000,
      difficulty: "medium",
      hints: [
        "Think about using a hash map to store numbers you've seen",
        "For each number, check if (target - number) exists in the hash map",
        "Time complexity should be O(n)"
      ]
    }
  },
  // CODE QUIZ - FizzBuzz Challenge
  {
    question_id: 4,
    lesson_id: 7,
    question_text: "FizzBuzz Challenge",
    question_type: "code",
    options: [],
    correct_answer: "",
    points: 30,
    explanation: null,
    order_number: 2,
    created_at: new Date(),
    updated_at: new Date(),
    code_config: {
      description: "Write a function that returns an array of strings from 1 to n. For multiples of 3, return 'Fizz' instead of the number. For multiples of 5, return 'Buzz'. For multiples of both 3 and 5, return 'FizzBuzz'.\n\nExample:\nInput: n = 5\nOutput: ['1', '2', 'Fizz', '4', 'Buzz']\nExplanation: The function returns an array where multiples of 3 are 'Fizz' and multiples of 5 are 'Buzz'.",
      allowedLanguages: [63, 71, 62, 54, 50], // JS, Python, Java, C++, C
      starterCode: {
        javascript: `function fizzBuzz(n) {
  // Your code here
  // Return an array of strings
  
}`,
        python: `def fizz_buzz(n):
    # Your code here
    # Return a list of strings
    pass`
      },
      testCases: [
        {
          id: 1,
          input: "5",
          expectedOutput: "1\n2\nFizz\n4\nBuzz",
          isHidden: false,
          points: 10
        },
        {
          id: 2,
          input: "15",
          expectedOutput: "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz",
          isHidden: false,
          points: 10
        },
        {
          id: 3,
          input: "30",
          expectedOutput: "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz\n16\n17\nFizz\n19\nBuzz\nFizz\n22\n23\nFizz\nBuzz\n26\nFizz\n28\n29\nFizzBuzz",
          isHidden: true,
          points: 10
        }
      ],
      timeLimit: 2,
      memoryLimit: 128000,
      difficulty: "easy",
      hints: [
        "Check divisibility by 15 first (both 3 and 5)",
        "Use the modulo operator (%) to check divisibility",
        "Use a loop from 1 to n"
      ]
    }
  }
]

// ============================================
// ENROLLMENTS
// ============================================
export const enrollments = [
  {
    enrollment_id: 1,
    user_id: 1,
    course_id: 1,
    enrollment_date: new Date("2024-11-01"),
    expiry_date: null,
    completion_date: null,
    progress: 35.5,
    status: "active",
    certificate: null,
    certificate_issue_date: null,
    last_access_date: new Date("2024-12-20"),
    created_at: new Date("2024-11-01")
  },
  {
    enrollment_id: 2,
    user_id: 1,
    course_id: 2,
    enrollment_date: new Date("2024-11-15"),
    expiry_date: null,
    completion_date: null,
    progress: 12.0,
    status: "active",
    certificate: null,
    certificate_issue_date: null,
    last_access_date: new Date("2024-12-19"),
    created_at: new Date("2024-11-15")
  }
]

// ============================================
// REVIEWS
// ============================================
export const reviews = [
  {
    review_id: 1,
    course_id: 1,
    user_id: 1,
    rating: 5,
    comment: "Absolutely amazing course! Dr. Angela explains everything so clearly. I went from knowing nothing about web development to building my own websites. Highly recommended!",
    review_date: new Date("2024-11-20"),
    updated_date: new Date("2024-11-20"),
    status: "approved",
    likes: 156,
    report_count: 0,
    instructor_response: "Thank you so much for your kind words! I'm thrilled to hear about your progress. Keep up the great work!",
    response_date: new Date("2024-11-21")
  },
  {
    review_id: 2,
    course_id: 1,
    user_id: 3,
    rating: 4,
    comment: "Great course with tons of content. Sometimes felt a bit overwhelming with the amount of information, but overall very valuable.",
    review_date: new Date("2024-11-25"),
    updated_date: new Date("2024-11-25"),
    status: "approved",
    likes: 89,
    report_count: 0,
    instructor_response: null,
    response_date: new Date()
  },
  {
    review_id: 3,
    course_id: 2,
    user_id: 1,
    rating: 5,
    comment: "The best React course I've ever taken. Max is an excellent teacher and the projects are really practical.",
    review_date: new Date("2024-12-01"),
    updated_date: new Date("2024-12-01"),
    status: "approved",
    likes: 234,
    report_count: 0,
    instructor_response: "Thanks a lot! Happy to hear you enjoyed the course!",
    response_date: new Date("2024-12-02")
  }
]

// ============================================
// CART
// ============================================
export const cart = [
  {
    cart_id: 1,
    user_id: 1,
    course_id: 3,
    promotion_id: null,
    added_date: new Date("2024-12-15")
  },
  {
    cart_id: 2,
    user_id: 1,
    course_id: 4,
    promotion_id: 1,
    added_date: new Date("2024-12-18")
  }
]

// ============================================
// WISHLIST
// ============================================
export const wishlist = [
  {
    wishlist_id: 1,
    user_id: 1,
    course_id: 5,
    added_date: new Date("2024-12-10")
  },
  {
    wishlist_id: 2,
    user_id: 1,
    course_id: 6,
    added_date: new Date("2024-12-12")
  }
]

// ============================================
// PROMOTIONS
// ============================================
export const promotions = [
  {
    promotion_id: 1,
    code: "NEWYEAR2025",
    description: "New Year Sale - 50% off all courses",
    discount_type: "percentage",
    discount_value: 50,
    start_date: new Date("2025-01-01"),
    end_date: new Date("2025-01-31"),
    usage_limit: 1000,
    used_count: 234,
    min_purchase: 0,
    max_discount: 500000,
    admin_id: null,
    instructor_id: null,
    status: "active",
    created_date: new Date("2024-12-01"),
    updated_date: new Date("2024-12-01"),
    applicable_courses: [],
    applicable_categories: []
  },
  {
    promotion_id: 2,
    code: "WELCOME10",
    description: "Welcome discount for new users",
    discount_type: "percentage",
    discount_value: 10,
    start_date: new Date("2024-01-01"),
    end_date: new Date("2025-12-31"),
    usage_limit: null,
    used_count: 5678,
    min_purchase: 0,
    max_discount: 200000,
    admin_id: null,
    instructor_id: null,
    status: "active",
    created_date: new Date("2024-01-01"),
    updated_date: new Date("2024-01-01"),
    applicable_courses: [],
    applicable_categories: []
  }
]

// ============================================
// NOTIFICATIONS
// ============================================
export const notifications = [
  {
    notification_id: 1,
    user_id: 1,
    title: "New course in your wishlist is on sale!",
    message: "UI/UX Design Bootcamp is now 50% off. Don't miss this limited time offer!",
    is_read: false,
    created_at: new Date("2024-12-20T10:30:00"),
    type: "promotion",
    notification_code: "COURSE_SALE",
    related_id: 5
  },
  {
    notification_id: 2,
    user_id: 1,
    title: "New lesson available",
    message: "A new lesson has been added to The Complete 2024 Web Development Bootcamp",
    is_read: false,
    created_at: new Date("2024-12-19T15:20:00"),
    type: "course",
    notification_code: "NEW_LESSON",
    related_id: 1
  },
  {
    notification_id: 3,
    user_id: 1,
    title: "Your review received likes",
    message: "Your review of React - The Complete Guide 2024 received 10 new likes",
    is_read: true,
    created_at: new Date("2024-12-18T09:15:00"),
    type: "social",
    notification_code: "REVIEW_LIKED",
    related_id: 3
  }
]

// ============================================
// LEARNING PROGRESS
// ============================================
export const learningProgress = [
  {
    progress_id: 1,
    enrollment_id: 1,
    lesson_id: 1,
    progress: 100,
    last_accessed: new Date("2024-11-02"),
    status: "completed",
    start_time: new Date("2024-11-02T10:00:00"),
    completion_time: new Date("2024-11-02T10:15:00"),
    time_spent: 900,
    last_position: null,
    notes: "Great introduction!"
  },
  {
    progress_id: 2,
    enrollment_id: 1,
    lesson_id: 2,
    progress: 100,
    last_accessed: new Date("2024-11-03"),
    status: "completed",
    start_time: new Date("2024-11-03T14:00:00"),
    completion_time: new Date("2024-11-03T14:25:00"),
    time_spent: 1500,
    last_position: null,
    notes: null
  },
  {
    progress_id: 3,
    enrollment_id: 1,
    lesson_id: 3,
    progress: 60,
    last_accessed: new Date("2024-12-20"),
    status: "in_progress",
    start_time: new Date("2024-11-05T16:00:00"),
    completion_time: null,
    time_spent: 1080,
    last_position: 1080,
    notes: "Need to review the VSCode shortcuts"
  }
]

// ============================================
// HOMEPAGE CONFIG (For Admin Customization)
// ============================================
export const homepageConfig = {
  hero: {
    enabled: true,
    title: "Learn without limits",
    subtitle: "Start, switch, or advance your career with more than 5,000 courses",
    cta_primary: "Join for Free",
    cta_secondary: "Try Udemy Business",
    background_image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=600&fit=crop",
    show_search: true,
    show_stats: true
  },
  sections: [
    { id: 1, component: "TrustedCompanies", enabled: true, order: 1 },
    { id: 2, component: "FeaturesSection", enabled: true, order: 2 },
    { id: 3, component: "Categories", enabled: true, order: 3 },
    { id: 4, component: "FeaturedCourses", enabled: true, order: 4 },
    { id: 5, component: "LearningGoals", enabled: true, order: 5 },
    { id: 6, component: "TrendingCourses", enabled: true, order: 6 },
    { id: 7, component: "PopularSkills", enabled: true, order: 7 },
    { id: 8, component: "TestimonialsSection", enabled: true, order: 8 },
    { id: 9, component: "StatsSection", enabled: true, order: 9 },
    { id: 10, component: "InstructorPromo", enabled: true, order: 10 },
    { id: 11, component: "NewsletterSection", enabled: true, order: 11 }
  ],
  featured_testimonials: [1, 2, 3],
  popular_skills: ["Web Development", "Python", "Data Science", "UI/UX Design", "Digital Marketing"],
  banners: [
    {
      id: 1,
      title: "New Year Sale",
      description: "Get 50% off on all courses",
      image: "https://images.unsplash.com/photo-1607969160688-e209f0ac9644?w=1200&h=300&fit=crop",
      cta: "Shop Now",
      link: "/courses?sale=true",
      enabled: true
    }
  ]
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getCoursesWithInstructors() {
  return baseCourses.map(course => {
    const instructor = baseInstructors.find(inst => inst.instructor_id === course.instructor_id)
    const instructorUser = baseUsers.find(user => user.user_id === instructor?.user_id)
    const category = baseCategories.find(cat => cat.category_id === course.category_id)
    const reviewsCount = reviews.filter(r => r.course_id === course.course_id).length
    const avgRating = reviewsCount > 0 
      ? reviews.filter(r => r.course_id === course.course_id).reduce((acc, r) => acc + r.rating, 0) / reviewsCount 
      : course.rating
    
    return {
      ...course,
      instructor_details: instructor,
      instructor_name: instructorUser?.full_name || "Instructor",
      instructor_avatar: instructorUser?.avatar,
      category_name: category?.name || "Category",
      reviews_count: reviewsCount,
      average_rating: Number(avgRating.toFixed(1))
    }
  })
}

export function getCourseById(courseId: number) {
  const coursesWithInstructors = getCoursesWithInstructors()
  return coursesWithInstructors.find(c => c.course_id === courseId)
}

export function getFeaturedCourses() {
  return getCoursesWithInstructors().filter(course => course.is_featured)
}

export function getTrendingCourses() {
  return getCoursesWithInstructors()
    .filter(course => !course.is_featured)
    .sort((a, b) => b.total_students - a.total_students)
    .slice(0, 4)
}

export function getCoursesByCategory(categoryId: number) {
  return getCoursesWithInstructors().filter(course => course.category_id === categoryId)
}

export function getModulesForCourse(courseId: number) {
  return courseModules
    .filter(m => m.course_id === courseId)
    .sort((a, b) => a.order_number - b.order_number)
}

export function getLessonsForModule(moduleId: number) {
  return lessons
    .filter(l => l.coursemodule_id === moduleId)
    .sort((a, b) => a.order - b.order)
}

export function getQuizQuestionsForLesson(lessonId: number) {
  return quizQuestions
    .filter(q => q.lesson_id === lessonId)
    .sort((a, b) => a.order_number - b.order_number)
}

export function getCourseCurriculum(courseId: number) {
  const modules = getModulesForCourse(courseId)
  return modules.map(module => ({
    ...module,
    lessons: getLessonsForModule(module.module_id)
  }))
}

export function getReviewsForCourse(courseId: number | string) {
  const id = typeof courseId === 'string' ? parseInt(courseId) : courseId;
  return reviews
    .filter(r => r.course_id === id && r.status === "approved")
    .sort((a, b) => b.review_date.getTime() - a.review_date.getTime())
    .map(review => {
      const user = baseUsers.find(u => u.user_id === review.user_id);
      return {
        ...review,
        user
      };
    });
}

export function getUserEnrollments(userId: number) {
  return enrollments
    .filter(e => e.user_id === userId)
    .map(enrollment => {
      const course = getCourseById(enrollment.course_id)
      return {
        ...enrollment,
        course
      }
    })
}

export function getUserCart(userId: number) {
  return cart
    .filter(c => c.user_id === userId)
    .map(item => {
      const course = getCourseById(item.course_id)
      const promotion = item.promotion_id ? promotions.find(p => p.promotion_id === item.promotion_id) : null
      return {
        ...item,
        course,
        promotion
      }
    })
}

export function getUserWishlist(userId: number) {
  return wishlist
    .filter(w => w.user_id === userId)
    .map(item => {
      const course = getCourseById(item.course_id)
      return {
        ...item,
        course
      }
    })
}

export function getUserNotifications(userId: number) {
  return notifications
    .filter(n => n.user_id === userId)
    .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
}

export function getUnreadNotificationsCount(userId: number) {
  return notifications.filter(n => n.user_id === userId && !n.is_read).length
}

export function getCategoriesWithSubcategories() {
  return baseCategories.map(category => ({
    ...category,
    subcategories: subcategories.filter(sub => sub.parent_category === category.category_id)
  }))
}

export function getStatistics() {
  return {
    totalCourses: baseCourses.length,
    totalUsers: baseUsers.length,
    totalInstructors: baseInstructors.length,
    totalStudents: baseCourses.reduce((acc, course) => acc + course.total_students, 0),
    totalEnrollments: enrollments.length,
    totalReviews: reviews.length,
    averageRating: baseCourses.reduce((acc, course) => acc + course.rating, 0) / baseCourses.length
  }
}

export function getActivePromotions() {
  const now = new Date()
  return promotions.filter(p => 
    p.status === "active" && 
    p.start_date <= now && 
    p.end_date >= now
  )
}

export function getHomepageConfig() {
  return homepageConfig
}

// Export all data
export default {
  categories: baseCategories,
  subcategories,
  users: baseUsers,
  instructors: baseInstructors,
  courses: baseCourses,
  courseModules,
  lessons,
  quizQuestions,
  enrollments,
  reviews,
  cart,
  wishlist,
  promotions,
  notifications,
  learningProgress,
  homepageConfig,
  // Helper functions
  getCoursesWithInstructors,
  getCourseById,
  getFeaturedCourses,
  getTrendingCourses,
  getCoursesByCategory,
  getModulesForCourse,
  getLessonsForModule,
  getQuizQuestionsForLesson,
  getCourseCurriculum,
  getReviewsForCourse,
  getUserEnrollments,
  getUserCart,
  getUserWishlist,
  getUserNotifications,
  getUnreadNotificationsCount,
  getCategoriesWithSubcategories,
  getStatistics,
  getActivePromotions,
  getHomepageConfig
}