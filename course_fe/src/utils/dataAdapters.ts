

import { getCourseById, getCourseCurriculum, getQuizQuestionsForLesson } from "../data/db-extended"


export function transformCourseDetail(courseId: string = '1') {
  const course = getCourseById(parseInt(courseId))
  const curriculum = getCourseCurriculum(parseInt(courseId))

  if (!course || !curriculum) {
    return {
      course: {
        id: '1',
        title: 'Loading...',
        instructor: '',
        instructorAvatar: '',
        thumbnail: '',
        progress: 0,
        totalLessons: 0,
        completedLessons: 0,
        duration: '0 hours',
        certificate: false,
        enrollment: null
      },
      curriculum: [],
      currentLessonId: 1,
      lastPosition: 0
    }
  }


  const curriculumData = curriculum.map((module) => ({
    id: module.module_id,
    title: module.title,
    lectures: module.lessons?.length || 0,
    duration: `${module.duration || 0} min`,
    lessons: (module.lessons || []).map((lesson) => ({
      id: lesson.lesson_id,
      title: lesson.title,
      duration: lesson.duration || 0,
      type: lesson.content_type || 'video',
      isCompleted: false,
      isFree: lesson.is_free || false,
      videoUrl: lesson.video_url || null,
      resources: [],
      quizzes: []
    }))
  }))


  let currentLessonId = null
  for (const module of curriculum) {
    for (const lesson of (module.lessons || [])) {
      if (lesson.content_type === 'video') {
        currentLessonId = lesson.lesson_id
        break
      }
    }
    if (currentLessonId) break
  }


  const totalLessons = curriculum.reduce((sum, m) => sum + (m.lessons?.length || 0), 0)
  const completedLessons = curriculum.reduce((sum, m) =>
    sum + (m.lessons?.filter(l => l.is_completed).length || 0), 0
  )
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

  return {
    course: {
      id: course.course_id,
      title: course.title,
      instructor: course.instructor_name || 'Instructor',
      instructorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100',
      thumbnail: course.thumbnail,
      progress: progressPercent,
      totalLessons: totalLessons,
      completedLessons: completedLessons,
      duration: course.duration || '0 hours',
      certificate: true,
      enrollment: null
    },
    curriculum: curriculumData,
    currentLessonId: currentLessonId || 1,
    lastPosition: 0
  }
}


export function transformQuizForLesson(lessonId: number) {
  const questions = getQuizQuestionsForLesson(lessonId)

  if (!questions || questions.length === 0) {
    return null
  }

  return {
    id: lessonId,
    title: `Lesson ${lessonId} Quiz`,
    description: "Test your knowledge",
    passingScore: 70,
    timeLimit: 15,
    questions: questions.map((q: any) => {

      if (q.question_type === 'code' && q.code_config) {
        return {
          id: q.question_id,
          question: q.question_text,
          type: 'code',
          codeQuestion: {
            id: q.question_id,
            question: q.question_text,
            description: q.code_config.description,
            type: 'code' as const,
            allowedLanguages: q.code_config.allowedLanguages,
            starterCode: q.code_config.starterCode?.javascript || q.code_config.starterCode?.python || '',
            testCases: q.code_config.testCases,
            timeLimit: q.code_config.timeLimit,
            memoryLimit: q.code_config.memoryLimit,
            difficulty: q.code_config.difficulty as 'easy' | 'medium' | 'hard',
            points: q.points,
            hints: q.code_config.hints
          }
        }
      }



      let correctAnswer: number | number[]

      if (q.question_type === 'multiple_choice') {

        const correctIndex = q.options.findIndex((opt: string) => opt === q.correct_answer)
        correctAnswer = correctIndex >= 0 ? correctIndex : 0
      } else {

        const correctIndex = q.options.findIndex((opt: string) => opt === q.correct_answer)
        correctAnswer = correctIndex >= 0 ? correctIndex : 0
      }

      return {
        id: q.question_id,
        question: q.question_text,
        type: 'single',
        options: Array.isArray(q.options) ? q.options : [],
        correctAnswer,
        explanation: q.explanation,
        points: q.points || 1,
        image: null,
        code: null,
        codeLanguage: null
      }
    })
  }
}


export function getAllLessons(courseId: string = '1') {
  const curriculum = getCourseCurriculum(parseInt(courseId))

  if (!curriculum) return []

  const lessons: Array<{
    id: number
    moduleId: number
    title: string
    type: string
    duration: number
    isCompleted: boolean
    isFree: boolean
  }> = []

  curriculum.forEach(module => {
    (module.lessons || []).forEach(lesson => {
      lessons.push({
        id: lesson.lesson_id,
        moduleId: module.module_id,
        title: lesson.title,
        type: lesson.content_type || 'video',
        duration: lesson.duration || 0,
        isCompleted: false,
        isFree: lesson.is_free || false
      })
    })
  })

  return lessons
}


export function getNextLesson(currentLessonId: number, courseId: string = '1') {
  const lessons = getAllLessons(courseId)
  const currentIndex = lessons.findIndex(l => l.id === currentLessonId)
  if (currentIndex >= 0 && currentIndex < lessons.length - 1) {
    return lessons[currentIndex + 1]
  }
  return null
}

export function getPreviousLesson(currentLessonId: number, courseId: string = '1') {
  const lessons = getAllLessons(courseId)
  const currentIndex = lessons.findIndex(l => l.id === currentLessonId)
  if (currentIndex > 0) {
    return lessons[currentIndex - 1]
  }
  return null
}


export function getLessonDetails(lessonId: number, courseId: string = '1') {
  const curriculum = getCourseCurriculum(parseInt(courseId))

  if (!curriculum) return null

  for (const module of curriculum) {
    const lesson = (module.lessons || []).find(l => l.lesson_id === lessonId)
    if (lesson) {
      return {
        ...lesson,
        moduleTitle: module.title
      }
    }
  }
  return null
}