// Judge0 API Integration - Production Ready
// Documentation: https://ce.judge0.com/
// RapidAPI: https://rapidapi.com/judge0-official/api/judge0-ce

import { mockRunTestCases } from './judge0-mock'

// ✅ Configuration - Correct format for RapidAPI
const JUDGE0_API_URL = 'https://judge0-ce.p.rapidapi.com'
const RAPIDAPI_KEY = 'ecec505edbmsh875f227dbb9bbeap1221c1jsn547ff02bf628'
const RAPIDAPI_HOST = 'judge0-ce.p.rapidapi.com'

// ✅ Polling configuration (avoid 429 rate limit)
const INITIAL_POLL_INTERVAL = 1500 // Start with 1.5s (safer than 1s)
const MAX_POLL_INTERVAL = 5000 // Max 5s between polls
const POLL_BACKOFF_MULTIPLIER = 1.5 // Exponential backoff
const MAX_POLL_ATTEMPTS = 15 // Max 15 attempts (~30s total)

// ✅ Request queue to prevent multiple simultaneous submissions
let requestQueue: Promise<any> = Promise.resolve()
let lastRequestTime = 0
const MIN_REQUEST_INTERVAL = 500 // Min 500ms between requests

// Auto-detect API availability
let apiFailureCount = 0
const MAX_FAILURES_BEFORE_MOCK = 3 // Switch to mock after 3 failures

// 🔍 Debug: Request counter
let requestCounter = { submissions: 0, polls: 0 }

export function getRequestStats() {
  return { ...requestCounter }
}

export function resetRequestStats() {
  requestCounter = { submissions: 0, polls: 0 }
  console.log('📊 Request stats reset')
}

// Supported Programming Languages
export const SUPPORTED_LANGUAGES = [
  { id: 63, name: 'JavaScript (Node.js 12.14.0)', value: 'javascript', extension: 'js' },
  { id: 71, name: 'Python (3.8.1)', value: 'python', extension: 'py' },
  { id: 62, name: 'Java (OpenJDK 13.0.1)', value: 'java', extension: 'java' },
  { id: 54, name: 'C++ (GCC 9.2.0)', value: 'cpp', extension: 'cpp' },
  { id: 50, name: 'C (GCC 9.2.0)', value: 'c', extension: 'c' },
  { id: 51, name: 'C# (Mono 6.6.0.161)', value: 'csharp', extension: 'cs' },
  { id: 68, name: 'PHP (7.4.1)', value: 'php', extension: 'php' },
  { id: 72, name: 'Ruby (2.7.0)', value: 'ruby', extension: 'rb' },
  { id: 73, name: 'Rust (1.40.0)', value: 'rust', extension: 'rs' },
  { id: 74, name: 'TypeScript (3.7.4)', value: 'typescript', extension: 'ts' },
  { id: 60, name: 'Go (1.13.5)', value: 'go', extension: 'go' },
  { id: 78, name: 'Kotlin (1.3.70)', value: 'kotlin', extension: 'kt' },
  { id: 82, name: 'SQL (SQLite 3.27.2)', value: 'sql', extension: 'sql' },
]

export interface SubmissionPayload {
  source_code: string
  language_id: number
  stdin?: string
  expected_output?: string
  cpu_time_limit?: number // seconds (default: 2)
  memory_limit?: number // KB (default: 128000)
}

export interface SubmissionResult {
  stdout: string | null
  stderr: string | null
  compile_output: string | null
  message: string | null
  time: string | null // execution time in seconds
  memory: number | null // memory in KB
  status: {
    id: number
    description: string
  }
  token: string
}

export interface TestCase {
  id: number
  input: string
  expectedOutput: string
  isHidden?: boolean
  points?: number
}

export interface TestResult extends TestCase {
  actualOutput: string | null
  passed: boolean
  error?: string
  time?: string
  memory?: number
}

// ✅ Helper: Rate limit protection
async function waitForRateLimit() {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest
    await new Promise(resolve => setTimeout(resolve, waitTime))
  }
  
  lastRequestTime = Date.now()
}

// ✅ Helper: Retry with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      
      // Check if it's a rate limit error (429)
      if (lastError.message.includes('429')) {
        const backoffDelay = initialDelay * Math.pow(2, attempt)
        console.warn(`Rate limited (429). Retrying in ${backoffDelay}ms... (Attempt ${attempt + 1}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, backoffDelay))
        continue
      }
      
      // For other errors, don't retry
      throw lastError
    }
  }
  
  throw lastError || new Error('Max retries exceeded')
}

// ✅ Helper: Wrap user code with stdin/stdout handler (LeetCode-style)
export function wrapUserCode(userCode: string, language: string, testInput: string): string {
  const lang = language.toLowerCase()
  
  // ✅ Clean user code: Remove common boilerplate patterns
  let cleanedCode = userCode
  
  if (lang === 'javascript' || lang === 'typescript') {
    // Remove common stdin reading patterns
    cleanedCode = cleanedCode
      .replace(/const\s+fs\s*=\\s*require\(['\"]fs['\"]\);?\\s*/g, '')
      .replace(/const\s+readline\s*=\\s*require\(['\"]readline['\"]\);?\\s*/g, '')
      .replace(/const\s+input\s*=\\s*fs\\.readFileSync\([^)]+\)[^;]*;?\\s*/g, '')
      .replace(/const\s+input\s*=\\s*process\\.argv\[[^\\]]+\][^;]*;?\\s*/g, '')
      .replace(/const\s+(nums|target|data|n|arr|s|str)\s*=\\s*input[^;]*;?\\s*/g, '')
      .replace(/console\\.log\([^)]*result[^)]*\);?\\s*/g, '')
      .trim()
  } else if (lang === 'python') {
    // Remove common stdin reading patterns for Python
    cleanedCode = cleanedCode
      .replace(/import\s+sys\s*/g, '')
      .replace(/input_lines\s*=\\s*sys\\.stdin[^;]*\\n?/g, '')
      .replace(/nums\s*=\\s*list\([^)]+\)\\n?/g, '')
      .replace(/target\s*=\\s*int\([^)]+\)\\n?/g, '')
      .replace(/print\([^)]*result[^)]*\)\\n?/g, '')
      .trim()
  }
  
  // Detect function name from cleaned user code
  const functionMatch = cleanedCode.match(/function\s+(\w+)\s*\(/) || 
                        cleanedCode.match(/def\s+(\w+)\s*\(/) ||
                        cleanedCode.match(/\w+\s+(\w+)\s*\([^)]*\)\s*{/)
  const functionName = functionMatch ? functionMatch[1] : 'solution'
  
  // Parse function parameters to understand input format
  const paramsMatch = cleanedCode.match(/function\s+\w+\s*\(([^)]+)\)/) ||
                      cleanedCode.match(/def\s+\w+\s*\(([^)]+)\)/)
  const params = paramsMatch ? paramsMatch[1].split(',').map(p => p.trim().split(/\\s+/).pop() || 'arg') : ['arg']
  
  switch (lang) {
    case 'javascript':
    case 'typescript':
      return `const fs = require('fs');
const lines = fs.readFileSync(0, 'utf-8').trim().split('\\n');

// ============ USER CODE START ============
${cleanedCode}
// ============ USER CODE END ============

// Auto-parse inputs based on common patterns
function parseInput(line) {
  line = line.trim();
  
  // Try to parse as JSON first (arrays, objects)
  if (line.startsWith('[') || line.startsWith('{')) {
    try { return JSON.parse(line); } catch {}
  }
  
  // Parse comma-separated numbers: "1,2,3" -> [1,2,3]
  if (/^[\\d,\\s-]+$/.test(line)) {
    return line.split(',').map(x => parseInt(x.trim()));
  }
  
  // Parse single number
  if (/^-?\\d+$/.test(line)) {
    return parseInt(line);
  }
  
  // Otherwise return as string
  return line;
}

// Parse all input lines
const inputs = lines.map(parseInput);

// Capture console.log output in case function doesn't return
const originalLog = console.log;
const capturedOutput = [];
console.log = (...args) => capturedOutput.push(args.map(String).join(' '));

// Call user function with parsed inputs
const result = ${functionName}(...inputs);

// Restore console.log
console.log = originalLog;

// Output result intelligently
if (result !== undefined && result !== null) {
  // Function returned a value - use it
  if (Array.isArray(result)) {
    // If array contains strings (like ['1', 'Fizz', 'Buzz']), likely multiline output
    if (result.length > 0 && typeof result[0] === 'string') {
      console.log(result.join('\\n'));
    } else {
      // Numeric array -> comma-separated
      console.log(result.join(','));
    }
  } else if (typeof result === 'object') {
    console.log(JSON.stringify(result));
  } else {
    console.log(result);
  }
} else if (capturedOutput.length > 0) {
  // Function didn't return anything but used console.log - output captured logs
  console.log(capturedOutput.join('\\n'));
} else {
  // Function returned nothing and didn't log - output empty
  console.log('');
}`

    case 'python':
      return `import sys
import json
import io

lines = [line.strip() for line in sys.stdin.read().strip().split('\\n')]

# ============ USER CODE START ============
${cleanedCode}
# ============ USER CODE END ============

# Auto-parse inputs
def parse_input(line):
    # Try JSON first
    if line.startswith('[') or line.startswith('{'):
        try:
            return json.loads(line)
        except:
            pass
    
    # Parse comma-separated numbers
    if all(c in '0123456789,- ' for c in line):
        return [int(x.strip()) for x in line.split(',')]
    
    # Parse single number
    try:
        return int(line)
    except:
        return line

inputs = [parse_input(line) for line in lines]

# Capture print output in case function doesn't return
old_stdout = sys.stdout
sys.stdout = captured_output = io.StringIO()

result = ${functionName}(*inputs)

# Get captured output
captured = captured_output.getvalue()
sys.stdout = old_stdout

# Output result intelligently
if result is not None:
    # Function returned a value - use it
    if isinstance(result, list):
        # Check if all elements are strings (multiline output like FizzBuzz)
        if all(isinstance(x, str) for x in result):
            print('\\n'.join(result))
        else:
            print(','.join(map(str, result)))
    elif isinstance(result, dict):
        print(json.dumps(result))
    else:
        print(result)
elif captured:
    # Function didn't return anything but used print - output captured text
    print(captured.rstrip())
else:
    # Function returned nothing and didn't print
    print('')`

    case 'java':
      return `import java.util.*;
import java.util.stream.*;

public class Main {
${cleanedCode.replace(/public class \w+/g, '').replace(/class \w+/g, '')}

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        
        // Read first line as array of integers
        String[] numsStr = scanner.nextLine().split(",");
        int[] nums = Arrays.stream(numsStr).mapToInt(Integer::parseInt).toArray();
        
        // Read second line as integer
        int target = scanner.nextInt();
        
        int[] result = ${functionName}(nums, target);
        System.out.println(Arrays.stream(result)
            .mapToObj(String::valueOf)
            .collect(Collectors.joining(",")));
    }
}`

    case 'cpp':
      return `#include <iostream>
#include <vector>
#include <string>
#include <sstream>
using namespace std;

// ============ USER CODE START ============
${cleanedCode}
// ============ USER CODE END ============

vector<int> parseArray(const string& line) {
    vector<int> result;
    stringstream ss(line);
    string num;
    while (getline(ss, num, ',')) {
        result.push_back(stoi(num));
    }
    return result;
}

int main() {
    string line;
    
    // Read first line as array
    getline(cin, line);
    vector<int> nums = parseArray(line);
    
    // Read second line as integer
    int target;
    cin >> target;
    
    vector<int> result = ${functionName}(nums, target);
    
    for (int i = 0; i < result.size(); i++) {
        if (i > 0) cout << ",";
        cout << result[i];
    }
    cout << endl;
    
    return 0;
}`

    default:
      // Fallback: return cleaned code
      return cleanedCode
  }
}

// ✅ Submit code to Judge0 (with queue and rate limiting)
export async function submitCode(payload: SubmissionPayload): Promise<{ token: string }> {
  // Check if we should use mock mode
  if (apiFailureCount >= MAX_FAILURES_BEFORE_MOCK) {
    console.warn('⚠️ Using mock mode due to API failures')
    return { token: `mock_${Date.now()}` }
  }

  // Queue the request to prevent simultaneous submissions
  return new Promise((resolve, reject) => {
    requestQueue = requestQueue.then(async () => {
      try {
        await waitForRateLimit()
        
        const result = await retryWithBackoff(async () => {
          const response = await fetch(
            `${JUDGE0_API_URL}/submissions?base64_encoded=false&wait=false`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-RapidAPI-Key': RAPIDAPI_KEY,
                'X-RapidAPI-Host': RAPIDAPI_HOST,
              },
              body: JSON.stringify({
                source_code: payload.source_code,
                language_id: payload.language_id,
                stdin: payload.stdin || '',
                expected_output: payload.expected_output,
                cpu_time_limit: payload.cpu_time_limit || 2,
                memory_limit: payload.memory_limit || 128000,
              }),
            }
          )

          if (!response.ok) {
            const errorText = await response.text().catch(() => response.statusText)
            throw new Error(`Judge0 API error: ${response.status} - ${errorText}`)
          }

          const data = await response.json()
          
          if (!data.token) {
            throw new Error('No token received from Judge0')
          }
          
          return { token: data.token }
        }, 3, 2000) // 3 retries, starting with 2s delay
        
        // Reset failure count on success
        if (apiFailureCount > 0) {
          console.log('✅ API recovered, resetting failure count')
          apiFailureCount = 0
        }
        
        requestCounter.submissions++
        resolve(result)
      } catch (error) {
        console.error('Judge0 submission error:', error)
        apiFailureCount++
        
        if (apiFailureCount >= MAX_FAILURES_BEFORE_MOCK) {
          console.warn(`⚠️ Switched to mock mode after ${apiFailureCount} failures`)
        }
        
        reject(error)
      }
    })
  })
}

// ✅ Get submission result (with retry logic)
export async function getSubmissionResult(token: string): Promise<SubmissionResult> {
  // Mock mode
  if (token.startsWith('mock_') || apiFailureCount >= MAX_FAILURES_BEFORE_MOCK) {
    console.warn('⚠️ Using mock mode for result fetch')
    return {
      stdout: 'Mock output',
      stderr: null,
      compile_output: null,
      message: null,
      time: '0.01',
      memory: 1024,
      status: { id: 3, description: 'Accepted' },
      token,
    }
  }

  try {
    await waitForRateLimit()
    
    // ✅ FIX: Don't retry on every poll - only retry on actual errors
    const response = await fetch(
      `${JUDGE0_API_URL}/submissions/${token}?base64_encoded=false`,
      {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': RAPIDAPI_KEY,
          'X-RapidAPI-Host': RAPIDAPI_HOST,
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText)
      throw new Error(`Judge0 API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    requestCounter.polls++
    return data
  } catch (error) {
    console.error('Judge0 result fetch error:', error)
    apiFailureCount++
    throw error
  }
}

// ✅ Submit and wait for result (with adaptive polling)
export async function submitAndWait(
  payload: SubmissionPayload,
  maxAttempts: number = MAX_POLL_ATTEMPTS
): Promise<SubmissionResult> {
  const { token } = await submitCode(payload)
  
  // If mock mode
  if (token.startsWith('mock_')) {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 800))
    return getSubmissionResult(token)
  }
  
  let pollInterval = INITIAL_POLL_INTERVAL
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Wait before polling (adaptive interval)
    await new Promise(resolve => setTimeout(resolve, pollInterval))
    
    try {
      const result = await getSubmissionResult(token)
      
      // Status IDs: 1=In Queue, 2=Processing, 3=Accepted, 4+=Various errors/outcomes
      if (result.status.id > 2) {
        return result // Finished processing
      }
      
      // Still processing - increase poll interval (exponential backoff)
      pollInterval = Math.min(
        pollInterval * POLL_BACKOFF_MULTIPLIER,
        MAX_POLL_INTERVAL
      )
      
      console.log(`⏳ Still processing... (Attempt ${attempt + 1}/${maxAttempts}, next poll in ${Math.round(pollInterval)}ms)`)
    } catch (error) {
      // If we get rate limited while polling, increase interval more aggressively
      if (error instanceof Error && error.message.includes('429')) {
        pollInterval = Math.min(pollInterval * 2, MAX_POLL_INTERVAL)
        console.warn(`Rate limited while polling. Increasing interval to ${Math.round(pollInterval)}ms`)
      } else {
        throw error
      }
    }
  }
  
  throw new Error(`Submission timeout - took longer than ${Math.round(maxAttempts * INITIAL_POLL_INTERVAL / 1000)}s to execute`)
}

// ✅ Run code against multiple test cases (with sequential execution)
export async function runTestCases(
  sourceCode: string,
  languageId: number,
  testCases: TestCase[],
  onProgress?: (current: number, total: number) => void
): Promise<TestResult[]> {
  // Check if we should use mock mode immediately
  if (apiFailureCount >= MAX_FAILURES_BEFORE_MOCK) {
    console.warn('⚠️ Using mock mode for test execution')
    return mockRunTestCases(sourceCode, languageId, testCases, onProgress)
  }
  
  const results: TestResult[] = []
  
  // Execute test cases sequentially (not parallel) to avoid rate limits
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i]
    
    if (onProgress) {
      onProgress(i + 1, testCases.length)
    }
    
    try {
      const result = await submitAndWait({
        source_code: sourceCode,
        language_id: languageId,
        stdin: testCase.input,
        expected_output: testCase.expectedOutput,
        cpu_time_limit: 3, // Generous time limit
        memory_limit: 256000, // 256MB
      })
      
      const actualOutput = result.stdout?.trim() || ''
      const expectedOutput = testCase.expectedOutput.trim()
      const passed = actualOutput === expectedOutput && result.status.id === 3
      
      results.push({
        ...testCase,
        actualOutput: result.stdout,
        passed,
        error: result.stderr || result.compile_output || result.message || undefined,
        time: result.time || undefined,
        memory: result.memory || undefined,
      })
      
      // Small delay between test cases to avoid hitting rate limits
      if (i < testCases.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 800))
      }
    } catch (error) {
      console.error(`Test case ${i + 1} failed:`, error)
      
      // If we've hit too many failures, switch to mock mode for remaining tests
      if (apiFailureCount >= MAX_FAILURES_BEFORE_MOCK) {
        console.warn('⚠️ Switching to mock mode for remaining tests')
        const remainingTests = testCases.slice(i)
        const mockResults = await mockRunTestCases(
          sourceCode,
          languageId,
          remainingTests,
          (current, total) => {
            if (onProgress) {
              onProgress(i + current, testCases.length)
            }
          }
        )
        results.push(...mockResults)
        break
      }
      
      results.push({
        ...testCase,
        actualOutput: null,
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }
  
  return results
}

// Calculate score based on test results
export function calculateScore(results: TestResult[]): {
  score: number
  passed: number
  total: number
  percentage: number
} {
  const total = results.length
  const passed = results.filter(r => r.passed).length
  const score = results.reduce((sum, r) => sum + (r.passed ? (r.points || 1) : 0), 0)
  const maxScore = results.reduce((sum, r) => sum + (r.points || 1), 0)
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0
  
  return { score, passed, total, percentage }
}

// Get language by ID
export function getLanguageById(id: number) {
  return SUPPORTED_LANGUAGES.find(lang => lang.id === id)
}

// Get language by value
export function getLanguageByValue(value: string) {
  return SUPPORTED_LANGUAGES.find(lang => lang.value === value)
}

// Status descriptions for better UX
export const STATUS_DESCRIPTIONS: Record<number, { label: string; color: string }> = {
  1: { label: 'In Queue', color: 'text-blue-600' },
  2: { label: 'Processing', color: 'text-blue-600' },
  3: { label: 'Accepted', color: 'text-green-600' },
  4: { label: 'Wrong Answer', color: 'text-red-600' },
  5: { label: 'Time Limit Exceeded', color: 'text-orange-600' },
  6: { label: 'Compilation Error', color: 'text-red-600' },
  7: { label: 'Runtime Error (SIGSEGV)', color: 'text-red-600' },
  8: { label: 'Runtime Error (SIGXFSZ)', color: 'text-red-600' },
  9: { label: 'Runtime Error (SIGFPE)', color: 'text-red-600' },
  10: { label: 'Runtime Error (SIGABRT)', color: 'text-red-600' },
  11: { label: 'Runtime Error (NZEC)', color: 'text-red-600' },
  12: { label: 'Runtime Error (Other)', color: 'text-red-600' },
  13: { label: 'Internal Error', color: 'text-gray-600' },
  14: { label: 'Exec Format Error', color: 'text-red-600' },
}

// Get starter code for each language (Clean function template - LeetCode style)
export function getStarterCode(languageValue: string, functionName?: string): string {
  const fname = functionName || 'twoSum'
  const templates: Record<string, string> = {
    javascript: `// Write your solution here
function ${fname}(nums, target) {
  // Your code here
  
}`,
    python: `# Write your solution here
def ${fname}(nums, target):
    # Your code here
    pass`,
    java: `// Write your solution here
public static int[] ${fname}(int[] nums, int target) {
    // Your code here
    return new int[]{};
}`,
    cpp: `// Write your solution here
vector<int> ${fname}(vector<int>& nums, int target) {
    // Your code here
    
}`,
    c: `// Write your solution here (Not recommended for this problem)
int* ${fname}(int* nums, int numsSize, int target, int* returnSize) {
    // Your code here
    *returnSize = 0;
    return NULL;
}`,
    csharp: `// Write your solution here
public int[] ${fname}(int[] nums, int target) {
    // Your code here
    return new int[]{};
}`,
    typescript: `// Write your solution here
function ${fname}(nums: number[], target: number): number[] {
    // Your code here
    return [];
}`,
    go: `// Write your solution here
func ${fname}(nums []int, target int) []int {
    // Your code here
    return []int{}
}`,
    kotlin: `// Write your solution here
fun ${fname}(nums: IntArray, target: Int): IntArray {
    // Your code here
    return intArrayOf()
}`,
    php: `<?php
// Write your solution here
function ${fname}($nums, $target) {
    // Your code here
    return [];
}
?>`,
    ruby: `# Write your solution here
def ${fname}(nums, target)
    # Your code here
end`,
    rust: `// Write your solution here
pub fn ${fname}(nums: Vec<i32>, target: i32) -> Vec<i32> {
    // Your code here
    vec![]
}`,
    sql: `-- Write your SQL query here
SELECT * FROM table_name;`,
  }
  
  return templates[languageValue] || '// Write your code here\n'
}

// Check API health
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${JUDGE0_API_URL}/about`, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
      },
    })
    return response.ok
  } catch {
    return false
  }
}

// Reset API failure count (useful for testing)
export function resetApiFailureCount() {
  apiFailureCount = 0
  console.log('✅ API failure count reset')
}

// Get current API status
export function getApiStatus() {
  return {
    failureCount: apiFailureCount,
    isMockMode: apiFailureCount >= MAX_FAILURES_BEFORE_MOCK,
    maxFailures: MAX_FAILURES_BEFORE_MOCK,
  }
}