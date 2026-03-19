import { useState } from 'react'
import { EnhancedCodeQuizCreator, EnhancedCodeQuizData } from '../../components/EnhancedCodeQuizCreator'
import { EnhancedCodeQuizPlayer } from '../../components/EnhancedCodeQuizPlayer'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Badge } from '../../components/ui/badge'
import { Code2, Eye, Edit, Plus } from 'lucide-react'
import { toast } from 'sonner'

// Sample quiz data - Two Sum problem
const sampleTwoSumQuiz: EnhancedCodeQuizData = {
  id: 1,
  title: 'Two Sum',
  problemStatement: {
    description: `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.`,
    inputFormat: `Line 1: A comma-separated list of integers representing the array nums
Line 2: An integer target`,
    outputFormat: `A comma-separated list of two integers representing the indices of the two numbers that add up to target`,
    notes: `• You may assume that each input would have exactly one solution
• You may not use the same element twice
• You can return the answer in any order`
  },
  examples: [
    {
      id: 1,
      input: 'nums = [2,7,11,15], target = 9',
      output: '[0,1]',
      explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].'
    },
    {
      id: 2,
      input: 'nums = [3,2,4], target = 6',
      output: '[1,2]',
      explanation: 'Because nums[1] + nums[2] == 6, we return [1, 2].'
    },
    {
      id: 3,
      input: 'nums = [3,3], target = 6',
      output: '[0,1]',
      explanation: 'Because nums[0] + nums[1] == 6, we return [0, 1].'
    }
  ],
  constraints: [
    { id: 1, description: '2 ≤ nums.length ≤ 10^4' },
    { id: 2, description: '-10^9 ≤ nums[i] ≤ 10^9' },
    { id: 3, description: '-10^9 ≤ target ≤ 10^9' },
    { id: 4, description: 'Only one valid answer exists' }
  ],
  learningObjectives: {
    algorithm: ['Hash Map', 'Two Pointers'],
    dataStructure: ['Array', 'Hash Table'],
    skills: ['Optimization', 'Time-Space Tradeoff', 'Edge Case Handling'],
    difficulty: 'easy',
    estimatedTime: 15
  },
  solution: {
    approach: `The optimal approach uses a hash map to store numbers we've seen along with their indices. As we iterate through the array, for each number we check if its complement (target - current number) exists in the hash map. If it does, we've found our answer. If not, we add the current number to the hash map and continue.

This approach allows us to solve the problem in a single pass through the array, achieving O(n) time complexity.`,
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(n)',
    codeLanguage: 63, // JavaScript
    code: `function twoSum(nums, target) {
  const map = new Map();
  
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    
    map.set(nums[i], i);
  }
  
  return []; // No solution found
}`,
    explanation: `Step-by-step explanation:

1. Create a hash map to store numbers and their indices
2. Iterate through the array once
3. For each number, calculate the complement (target - current number)
4. Check if the complement exists in the hash map
5. If yes, return the indices [map.get(complement), current index]
6. If no, add the current number and its index to the map
7. Continue until a solution is found

Why this works:
- We avoid nested loops (which would be O(n²))
- Hash map lookups are O(1) on average
- We only need one pass through the array
- Space-time tradeoff: use O(n) space for O(n) time`
  },
  allowedLanguages: [63, 71, 62, 54], // JavaScript, Python, Java, C++
  functionSignature: {
    63: 'function twoSum(nums, target) {\n  // Your code here\n}',
    71: 'def two_sum(nums: List[int], target: int) -> List[int]:\n    # Your code here\n    pass',
    62: 'public int[] twoSum(int[] nums, int target) {\n    // Your code here\n}',
    54: 'vector<int> twoSum(vector<int>& nums, int target) {\n    // Your code here\n}'
  },
  testCases: [
    {
      id: 1,
      input: '2,7,11,15\n9',
      expectedOutput: '0,1',
      isHidden: false,
      points: 25
    },
    {
      id: 2,
      input: '3,2,4\n6',
      expectedOutput: '1,2',
      isHidden: false,
      points: 25
    },
    {
      id: 3,
      input: '3,3\n6',
      expectedOutput: '0,1',
      isHidden: false,
      points: 25
    },
    {
      id: 4,
      input: '-1,-2,-3,-4,-5\n-8',
      expectedOutput: '2,4',
      isHidden: false,
      points: 25
    }
  ],
  timeLimit: 2,
  memoryLimit: 128000,
  points: 100,
  hints: [
    {
      level: 1,
      content: 'A brute force approach would use nested loops to check all pairs. Can you think of a way to solve this in a single pass?',
      type: 'idea'
    },
    {
      level: 2,
      content: 'Think about using a hash map (or dictionary) to store numbers you\'ve already seen. What would you store as the key and value?',
      type: 'data-structure'
    },
    {
      level: 3,
      content: 'For each number, calculate the "complement" (target - current number). Check if this complement exists in your hash map.',
      type: 'algorithm'
    },
    {
      level: 4,
      content: `Pseudocode:
1. Create empty hash map
2. For each number and its index:
   - Calculate complement = target - number
   - If complement exists in map:
     * Return [map[complement], current index]
   - Otherwise:
     * Store number and index in map
3. Return empty array if no solution`,
      type: 'pseudocode'
    }
  ],
  tags: ['array', 'hash-map', 'easy', 'leetcode', 'fundamentals']
}

// Sample quiz 2 - Valid Parentheses
const sampleValidParenthesesQuiz: EnhancedCodeQuizData = {
  id: 2,
  title: 'Valid Parentheses',
  problemStatement: {
    description: `Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.`,
    inputFormat: 'A single line containing the string s',
    outputFormat: 'Return true if the string is valid, false otherwise',
    notes: `• The string only contains parentheses characters
• Empty string is considered valid`
  },
  examples: [
    {
      id: 1,
      input: 's = "()"',
      output: 'true',
      explanation: 'The string contains one pair of matching parentheses.'
    },
    {
      id: 2,
      input: 's = "()[]{}"',
      output: 'true',
      explanation: 'All brackets are properly closed in the correct order.'
    },
    {
      id: 3,
      input: 's = "(]"',
      output: 'false',
      explanation: 'The opening parenthesis ( does not match with the closing bracket ].'
    }
  ],
  constraints: [
    { id: 1, description: '1 ≤ s.length ≤ 10^4' },
    { id: 2, description: 's consists of parentheses only \'()[]{}\'.' }
  ],
  learningObjectives: {
    algorithm: ['Stack', 'String Matching'],
    dataStructure: ['Stack', 'String'],
    skills: ['Pattern Recognition', 'LIFO Principle', 'Edge Case Handling'],
    difficulty: 'easy',
    estimatedTime: 20
  },
  solution: {
    approach: `Use a stack data structure. When we encounter an opening bracket, push it onto the stack. When we encounter a closing bracket, check if it matches the most recent opening bracket (top of stack). If it matches, pop from the stack. If it doesn't match or the stack is empty, return false.

At the end, if the stack is empty, all brackets were matched correctly.`,
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(n)',
    codeLanguage: 63,
    code: `function isValid(s) {
  const stack = [];
  const pairs = {
    '(': ')',
    '{': '}',
    '[': ']'
  };
  
  for (let char of s) {
    if (pairs[char]) {
      // Opening bracket - push to stack
      stack.push(char);
    } else {
      // Closing bracket - check if matches
      if (stack.length === 0) return false;
      const last = stack.pop();
      if (pairs[last] !== char) return false;
    }
  }
  
  return stack.length === 0;
}`,
    explanation: `The stack perfectly models the LIFO (Last In, First Out) nature of bracket matching. The most recently opened bracket must be closed first.`
  },
  allowedLanguages: [63, 71, 62, 54],
  testCases: [
    {
      id: 1,
      input: '()',
      expectedOutput: 'true',
      points: 20
    },
    {
      id: 2,
      input: '()[]{}',
      expectedOutput: 'true',
      points: 20
    },
    {
      id: 3,
      input: '(]',
      expectedOutput: 'false',
      points: 20
    },
    {
      id: 4,
      input: '([)]',
      expectedOutput: 'false',
      points: 20
    },
    {
      id: 5,
      input: '{[]}',
      expectedOutput: 'true',
      points: 20
    }
  ],
  timeLimit: 2,
  memoryLimit: 128000,
  points: 100,
  hints: [
    {
      level: 1,
      content: 'Think about the Last In, First Out (LIFO) principle. Which data structure naturally follows this pattern?',
      type: 'idea'
    },
    {
      level: 2,
      content: 'Use a stack! Push opening brackets onto the stack, and when you see a closing bracket, check if it matches the top of the stack.',
      type: 'data-structure'
    },
    {
      level: 3,
      content: 'Create a mapping of opening to closing brackets. When you encounter a closing bracket, verify it matches the most recent opening bracket.',
      type: 'algorithm'
    }
  ],
  tags: ['stack', 'string', 'easy', 'leetcode']
}

export default function EnhancedCodeQuizTestPage() {
  const [mode, setMode] = useState<'create' | 'play'>('play')
  const [selectedQuiz, setSelectedQuiz] = useState<EnhancedCodeQuizData>(sampleTwoSumQuiz)
  const [customQuiz, setCustomQuiz] = useState<EnhancedCodeQuizData | null>(null)

  const handleSaveQuiz = (data: EnhancedCodeQuizData) => {
    console.log('Quiz saved:', data)
    setCustomQuiz(data)
    setMode('play')
    setSelectedQuiz(data)
    toast.success('Quiz created successfully!')
  }

  const handleQuizComplete = (score: number, isCorrect: boolean) => {
    console.log('Quiz completed:', { score, isCorrect })
  }

  const sampleQuizzes = [
    sampleTwoSumQuiz,
    sampleValidParenthesesQuiz,
    ...(customQuiz ? [customQuiz] : [])
  ]

  return (
    <div className="min-h-screen bg-background">
      {mode === 'create' ? (
        <div className="container mx-auto py-8">
          <EnhancedCodeQuizCreator
            onSave={handleSaveQuiz}
            onCancel={() => setMode('play')}
          />
        </div>
      ) : mode === 'play' ? (
        <div className="flex flex-col h-screen">
          {/* Navigation Bar */}
          <div className="border-b bg-card p-4">
            <div className="container mx-auto flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => setMode('select')}
                >
                  ← Back to Quiz List
                </Button>
                <div className="flex items-center gap-2">
                  <Code2 className="h-5 w-5" />
                  <span className="font-semibold">Enhanced Code Quiz System</span>
                </div>
              </div>
              <Button onClick={() => setMode('create')}>
                <Plus className="h-4 w-4 mr-2" />
                Create New Quiz
              </Button>
            </div>
          </div>

          {/* Player */}
          <div className="flex-1 overflow-hidden">
            <EnhancedCodeQuizPlayer
              quiz={selectedQuiz}
              lessonId={1}
              onComplete={handleQuizComplete}
            />
          </div>
        </div>
      ) : (
        // Quiz Selection
        <div className="container mx-auto py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Enhanced Code Quiz System</h1>
            <p className="text-muted-foreground">
              LeetCode-style coding challenges with comprehensive problem statements
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {sampleQuizzes.map((quiz) => (
              <Card key={quiz.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <Code2 className="h-5 w-5" />
                        {quiz.title}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {quiz.problemStatement.description.substring(0, 120)}...
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <Badge className={
                      quiz.learningObjectives.difficulty === 'easy' ? 'bg-green-500' :
                      quiz.learningObjectives.difficulty === 'medium' ? 'bg-yellow-500' :
                      'bg-red-500'
                    }>
                      {quiz.learningObjectives.difficulty.toUpperCase()}
                    </Badge>
                    <Badge variant="outline">{quiz.points} points</Badge>
                    {quiz.learningObjectives.estimatedTime && (
                      <Badge variant="outline">~{quiz.learningObjectives.estimatedTime} min</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Tags */}
                    {quiz.tags && quiz.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {quiz.tags.slice(0, 4).map((tag, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {quiz.tags.length > 4 && (
                          <Badge variant="secondary" className="text-xs">
                            +{quiz.tags.length - 4} more
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Learning Objectives */}
                    <div className="space-y-1 text-sm">
                      {quiz.learningObjectives.algorithm && quiz.learningObjectives.algorithm.length > 0 && (
                        <div className="flex items-start gap-2">
                          <span className="text-muted-foreground">🧮</span>
                          <span className="text-xs">{quiz.learningObjectives.algorithm.join(', ')}</span>
                        </div>
                      )}
                      {quiz.learningObjectives.dataStructure && quiz.learningObjectives.dataStructure.length > 0 && (
                        <div className="flex items-start gap-2">
                          <span className="text-muted-foreground">📊</span>
                          <span className="text-xs">{quiz.learningObjectives.dataStructure.join(', ')}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        onClick={() => {
                          setSelectedQuiz(quiz)
                          setMode('play')
                        }}
                        className="flex-1"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Solve Problem
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Create Your Own Quiz</CardTitle>
              <CardDescription>
                Build professional coding challenges with comprehensive problem statements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setMode('create')} size="lg">
                <Plus className="h-5 w-5 mr-2" />
                Create New Code Quiz
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
