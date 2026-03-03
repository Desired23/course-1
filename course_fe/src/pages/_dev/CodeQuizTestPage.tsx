import { CodeQuizPlayer, type CodeQuestion } from '../../components/CodeQuizPlayer'
import { Judge0DebugPanel } from '../../components/Judge0DebugPanel'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { useRouter } from '../../components/Router'
import { Code2, ArrowLeft, CheckCircle2 } from 'lucide-react'

// Test questions
const twoSumQuestion: CodeQuestion = {
  id: 1,
  title: 'Two Sum',
  difficulty: 'Easy',
  points: 10,
  description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers that add up to `target`.',
  constraints: [
    '2 <= nums.length <= 10^4',
    '-10^9 <= nums[i] <= 10^9',
    'Only one valid answer exists'
  ],
  examples: [
    {
      input: '2,7,11,15\\n9',
      output: '0,1',
      explanation: 'nums[0] + nums[1] = 2 + 7 = 9'
    }
  ],
  starterCode: `function twoSum(nums, target) {
  // Your code here
  
}`,
  testCases: [
    {
      id: 1,
      input: '2,7,11,15\\n9',
      expectedOutput: '0,1',
      points: 3
    },
    {
      id: 2,
      input: '3,2,4\\n6',
      expectedOutput: '1,2',
      points: 4
    },
    {
      id: 3,
      input: '3,3\\n6',
      expectedOutput: '0,1',
      points: 3
    }
  ]
}

const fizzBuzzQuestion: CodeQuestion = {
  id: 2,
  question: "FizzBuzz Challenge",
  description: "Write a function that returns an array of strings from 1 to n. For multiples of 3, use 'Fizz' instead of the number. For multiples of 5, use 'Buzz'. For multiples of both 3 and 5, use 'FizzBuzz'.",
  type: 'code',
  allowedLanguages: [63, 71, 62, 54, 50], // JS, Python, Java, C++, C
  starterCode: `function fizzBuzz(n) {
  // Your code here
  // Return an array of strings
  
}`,
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
  difficulty: 'easy',
  points: 30,
  hints: [
    "Check divisibility by 15 first (both 3 and 5)",
    "Use the modulo operator (%) to check divisibility",
    "Use a loop from 1 to n and return an array"
  ]
}

export function CodeQuizTestPage() {
  const { navigate } = useRouter()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Code Quiz Test Page</h1>
              <p className="text-sm text-muted-foreground">
                Test Judge0 integration with Two Sum & FizzBuzz challenges
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Judge0 Debug Panel */}
        <Judge0DebugPanel />
        
        {/* Info Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code2 className="h-6 w-6" />
              Test Code Quiz System
            </CardTitle>
            <CardDescription>
              Đây là trang test riêng cho Code Quiz. Trong production, code quiz sẽ nằm trong CoursePlayerPage.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">✅ Features Implemented</h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Multi-language support (13+ languages)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Judge0 API integration
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Test cases (visible & hidden)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Auto-grading & scoring
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Hints system
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Execution stats (time, memory)
                  </li>
                </ul>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">📍 Production Location</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Vào khóa học để test trong môi trường thật:
                </p>
                <Button 
                  onClick={() => navigate('/course-player')}
                  className="w-full"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: '#ffffff',
                    border: 'none',
                  }}
                >
                  Go to Course Player →
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Course: "The Complete 2024 Web Development Bootcamp"<br />
                  Lesson 7: Programming Challenge - Code Quiz
                </p>
              </div>
            </div>

            {/* Quick Tips */}
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">💡 Quick Testing Tips</h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Click "Run Tests" để test code với Judge0</li>
                <li>• Xem results trong Summary hoặc Details tab</li>
                <li>• Dùng Hints nếu cần gợi ý</li>
                <li>• Submit solution khi pass all tests</li>
                <li>• Có thể switch language và reset code</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Challenges */}
        <div className="space-y-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="secondary">Challenge 1</Badge>
              <Badge>Medium</Badge>
              <span className="text-sm text-muted-foreground">50 points</span>
            </div>
            <CodeQuizPlayer
              question={twoSumQuestion}
              onComplete={(passed, score) => {
                console.log('Two Sum completed:', { passed, score })
              }}
              onSubmit={(code, languageId) => {
                console.log('Two Sum submitted:', { code, languageId })
              }}
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="secondary">Challenge 2</Badge>
              <Badge variant="default">Easy</Badge>
              <span className="text-sm text-muted-foreground">30 points</span>
            </div>
            <CodeQuizPlayer
              question={fizzBuzzQuestion}
              onComplete={(passed, score) => {
                console.log('FizzBuzz completed:', { passed, score })
              }}
              onSubmit={(code, languageId) => {
                console.log('FizzBuzz submitted:', { code, languageId })
              }}
            />
          </div>
        </div>

        {/* Solutions (Hidden by default) */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>📚 Example Solutions (Spoiler Alert!)</CardTitle>
            <CardDescription>
              Chỉ xem khi bạn đã thử code tự mình nhé!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <details className="space-y-4">
              <summary className="cursor-pointer font-semibold hover:text-primary">
                Click để xem solutions →
              </summary>
              
              <div className="mt-4 space-y-6">
                <div>
                  <h4 className="font-semibold mb-2">Two Sum - JavaScript Solution:</h4>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
{`function twoSum(nums, target) {
  const map = new Map();
  
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  
  return [];
}`}
                  </pre>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">FizzBuzz - JavaScript Solution:</h4>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
{`function fizzBuzz(n) {
  const result = [];
  
  for (let i = 1; i <= n; i++) {
    if (i % 15 === 0) {
      result.push('FizzBuzz');
    } else if (i % 3 === 0) {
      result.push('Fizz');
    } else if (i % 5 === 0) {
      result.push('Buzz');
    } else {
      result.push(i.toString());
    }
  }
  
  return result;
}`}
                  </pre>
                </div>

                {/* Comparison: fs vs readline */}
                <div className="border-t pt-6">
                  <h4 className="font-semibold mb-3 text-lg">📚 STDIN Input Methods Comparison:</h4>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Method 1: fs.readFileSync */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="default">✅ Recommended</Badge>
                        <span className="font-semibold">fs.readFileSync(0)</span>
                      </div>
                      <pre className="bg-green-50 dark:bg-green-900/20 p-3 rounded text-xs border border-green-200">
{`// ✅ Simple & Standard
const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8').trim();

// Parse
const lines = input.split('\\n');
const nums = lines[0].split(',').map(Number);
console.log(nums);`}
                      </pre>
                      <div className="text-xs space-y-1 text-muted-foreground">
                        <div>✅ 1 line to read all input</div>
                        <div>✅ Synchronous (simple)</div>
                        <div>✅ Standard in competitive programming</div>
                        <div>✅ Used by Codeforces, AtCoder, HackerRank</div>
                      </div>
                    </div>

                    {/* Method 2: readline */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">⚠️ Complex</Badge>
                        <span className="font-semibold">readline module</span>
                      </div>
                      <pre className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded text-xs border border-orange-200">
{`// ❌ Overkill for small inputs
const readline = require('readline');
let lines = [];

const rl = readline.createInterface({
  input: process.stdin,
  terminal: false
});

rl.on('line', (line) => {
  lines.push(line);
});

rl.on('close', () => {
  const nums = lines[0].split(',').map(Number);
  console.log(nums);
});`}
                      </pre>
                      <div className="text-xs space-y-1 text-muted-foreground">
                        <div>⚠️ 15+ lines of boilerplate</div>
                        <div>⚠️ Async (event-based)</div>
                        <div>⚠️ Only for huge inputs (&gt;100MB)</div>
                        <div>⚠️ Rarely used in competitive programming</div>
                      </div>
                    </div>
                  </div>

                  {/* Common mistake */}
                  <div className="mt-4 p-4 bg-destructive/10 border border-destructive rounded-lg">
                    <div className="flex items-start gap-2">
                      <span className="text-destructive font-semibold">❌ Common Mistake:</span>
                    </div>
                    <pre className="bg-destructive/20 p-3 rounded text-xs mt-2">
{`// ❌ WRONG: Using process.argv (doesn't work in Judge0!)
const input = process.argv[2].split(',').map(Number);
//                      ^^^^ undefined!

// Error: TypeError: Cannot read property 'split' of undefined
// Status: Runtime Error (NZEC)`}
                    </pre>
                    <div className="text-sm mt-2 text-muted-foreground">
                      <strong>Why?</strong> Judge0 sends input via <code className="bg-muted px-1 rounded">stdin</code>, NOT command line arguments!
                    </div>
                  </div>
                </div>
              </div>
            </details>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}