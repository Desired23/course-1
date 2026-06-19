import { type QuizQuestion } from "../components/QuizPlayer"
import { type LessonQuizQuestion } from "../services/quiz-questions.api"

export function getQuizOptionText(option: LessonQuizQuestion['options'][number]): string {
  if (typeof option === 'string') return option
  return option.option_text || option.text || ''
}

export function getCorrectOptionIndex(options: LessonQuizQuestion['options']): number {
  const flaggedIndex = options.findIndex((option) => typeof option === 'object' && option.is_correct)
  return flaggedIndex >= 0 ? flaggedIndex : 0
}

export function mapLessonQuizQuestion(question: LessonQuizQuestion): QuizQuestion {
  const options = question.question_type === 'truefalse'
    ? ['True', 'False']
    : question.options.map(getQuizOptionText).filter(Boolean)

  if (question.question_type === 'code') {
    return {
      id: question.question_id,
      question: question.question_text,
      type: 'code',
      points: question.points,
      explanation: question.description || undefined,
      requireCompletion: question.require_completion,
      codeQuestion: {
        id: question.question_id,
        question: question.question_text,
        description: question.description || undefined,
        type: 'code',
        allowedLanguages: question.allowed_languages || undefined,
        starterCode: question.starter_code || undefined,
        functionName: question.function_name || undefined,
        executionMode: question.execution_mode || (question.function_name ? 'function' : 'stdin'),
        timeLimit: question.time_limit || undefined,
        memoryLimit: question.memory_limit || undefined,
        difficulty: question.difficulty,
        points: question.points,
        testCases: question.test_cases.map((testCase) => ({
          id: testCase.id,
          input: testCase.input_data,
          expectedOutput: testCase.expected_output || '',
          isHidden: testCase.is_hidden,
          points: testCase.points,
        })),
      },
    }
  }

  return {
    id: question.question_id,
    question: question.question_text,
    type: 'single',
    options,
    correctAnswer: getCorrectOptionIndex(question.options),
    explanation: question.description || undefined,
    points: question.points,
    image: question.image_url || undefined,
    code: question.code_snippet || undefined,
  }
}
