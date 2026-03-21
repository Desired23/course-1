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

interface BatchSubmissionCreateItem {
  token?: string
  [key: string]: unknown
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
  debugLogs?: string[]
  time?: string
  memory?: number
  statusId?: number
  statusDescription?: string
  stderr?: string | null
  compileOutput?: string | null
  message?: string | null
}

export interface RunTestOptions {
  timeLimit?: number
  memoryLimit?: number
}

const DEBUG_STDERR_START = '__CODEQUIZ_DEBUG_START__'
const DEBUG_STDERR_END = '__CODEQUIZ_DEBUG_END__'

function normalizeText(value?: string | null): string {
  return (value || '').replace(/\r\n/g, '\n').trim()
}

function tryParseJson(value: string): unknown | undefined {
  try {
    return JSON.parse(value)
  } catch {
    return undefined
  }
}

function parseScalarToken(raw: string): unknown {
  const token = raw.trim()
  if (!token.length) return ''

  const jsonParsed = tryParseJson(token)
  if (jsonParsed !== undefined) return jsonParsed

  if (/^true$/i.test(token)) return true
  if (/^false$/i.test(token)) return false
  if (/^null$/i.test(token)) return null
  if (/^-?\d+$/.test(token)) return Number.parseInt(token, 10)
  if (/^-?(?:\d+\.\d+|\d+\.\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(token)) {
    return Number.parseFloat(token)
  }
  if ((token.startsWith("'") && token.endsWith("'")) || (token.startsWith('"') && token.endsWith('"'))) {
    return token.slice(1, -1)
  }

  return token
}

function tryParseCsvLike(value: string): unknown[] | undefined {
  if (!value.includes(',')) return undefined
  return value.split(',').map((part) => parseScalarToken(part))
}

function parseLooseValue(raw: string): unknown {
  const value = raw.trim()
  if (!value.length) return ''

  const jsonParsed = tryParseJson(value)
  if (jsonParsed !== undefined) return jsonParsed

  const csvParsed = tryParseCsvLike(value)
  if (csvParsed) return csvParsed

  return parseScalarToken(value)
}

function toComparableValue(raw: string): unknown {
  const normalized = normalizeText(raw)
  if (!normalized) return ''

  const lines = normalized.split('\n').map((line) => line.trim())
  if (lines.length > 1) {
    return lines.map((line) => parseLooseValue(line))
  }

  return parseLooseValue(normalized)
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (typeof a !== typeof b) return false

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false
    }
    return true
  }

  if (
    a &&
    b &&
    typeof a === 'object' &&
    typeof b === 'object' &&
    !Array.isArray(a) &&
    !Array.isArray(b)
  ) {
    const aObj = a as Record<string, unknown>
    const bObj = b as Record<string, unknown>
    const aKeys = Object.keys(aObj).sort()
    const bKeys = Object.keys(bObj).sort()
    if (!deepEqual(aKeys, bKeys)) return false

    for (const key of aKeys) {
      if (!deepEqual(aObj[key], bObj[key])) return false
    }
    return true
  }

  return false
}

function outputsMatch(expectedRaw: string, actualRaw?: string | null): boolean {
  const expected = normalizeText(expectedRaw)
  const actual = normalizeText(actualRaw)

  if (expected === actual) return true

  const expectedValue = toComparableValue(expected)
  const actualValue = toComparableValue(actual)
  if (deepEqual(expectedValue, actualValue)) return true

  if (Array.isArray(expectedValue) && Array.isArray(actualValue)) {
    const stringifyItem = (item: unknown) => {
      if (item && typeof item === 'object') {
        try {
          return JSON.stringify(item)
        } catch {
          return String(item)
        }
      }
      return String(item)
    }
    return deepEqual(expectedValue.map(stringifyItem), actualValue.map(stringifyItem))
  }

  return false
}

export function extractDebugLogs(stderr?: string | null): { cleanStderr: string | null; debugLogs: string[] } {
  const content = stderr || ''
  if (!content.includes(DEBUG_STDERR_START)) {
    const normalized = normalizeText(content)
    return { cleanStderr: normalized || null, debugLogs: [] }
  }

  const debugLogs: string[] = []
  let clean = content
  const blockRegex = new RegExp(`${DEBUG_STDERR_START}\\n?([\\s\\S]*?)\\n?${DEBUG_STDERR_END}`, 'g')
  clean = clean.replace(blockRegex, (_, debugBlock: string) => {
    const normalized = normalizeText(debugBlock)
    if (normalized) {
      debugLogs.push(normalized)
    }
    return ''
  })

  const cleanStderr = normalizeText(clean) || null
  return { cleanStderr, debugLogs }
}

export function shouldWrapUserCode(userCode: string, language: string): boolean {
  const lang = language.toLowerCase()
  const source = userCode || ''

  if (!['javascript', 'typescript', 'python'].includes(lang)) {
    return false
  }

  if (lang === 'javascript' || lang === 'typescript') {
    const usesStdin = /(fs\.readFileSync|process\.stdin|readline\.createInterface)/.test(source)
    const hasFunction = /(function\s+\w+\s*\(|const\s+\w+\s*=\s*\([^)]*\)\s*=>|let\s+\w+\s*=\s*\([^)]*\)\s*=>)/.test(source)
    return hasFunction && !usesStdin
  }

  const usesStdin = /(sys\.stdin|input\(|stdin\.read|for\s+.*\s+in\s+sys\.stdin)/.test(source)
  const hasFunction = /def\s+\w+\s*\(/.test(source)
  return hasFunction && !usesStdin
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
export function wrapUserCode(userCode: string, language: string, _testInput: string = ''): string {
  const lang = language.toLowerCase()
  let cleanedCode = userCode || ''

  if (lang === 'javascript' || lang === 'typescript') {
    cleanedCode = cleanedCode
      .replace(/const\s+fs\s*=\s*require\(['"]fs['"]\);?\s*/g, '')
      .replace(/const\s+readline\s*=\s*require\(['"]readline['"]\);?\s*/g, '')
      .replace(/const\s+input\s*=\s*fs\.readFileSync\([^)]+\)[^;]*;?\s*/g, '')
      .replace(/const\s+input\s*=\s*process\.argv\[[^\]]+\][^;]*;?\s*/g, '')
      .trim()
  } else if (lang === 'python') {
    cleanedCode = cleanedCode
      .replace(/^\s*import\s+sys\s*$/gm, '')
      .replace(/^\s*input_lines\s*=\s*sys\.stdin.*$/gm, '')
      .trim()
  }

  const functionMatch =
    cleanedCode.match(/function\s+([A-Za-z_]\w*)\s*\(/) ||
    cleanedCode.match(/def\s+([A-Za-z_]\w*)\s*\(/) ||
    cleanedCode.match(new RegExp('([A-Za-z_]\\w*)\\s*=\\s*\\([^)]*\\)\\s*=>'))
  const functionName = functionMatch ? functionMatch[1] : 'solution'

  if (lang === 'javascript' || lang === 'typescript') {
    return `const fs = require('fs');
const DEBUG_START = '${DEBUG_STDERR_START}';
const DEBUG_END = '${DEBUG_STDERR_END}';
const rawInput = fs.readFileSync(0, 'utf-8');
const lines = rawInput.length === 0 ? [] : rawInput.replace(/\\r\\n/g, '\\n').split('\\n').filter((line, idx, arr) => !(idx === arr.length - 1 && line === ''));

// ============ USER CODE START ============
${cleanedCode}
// ============ USER CODE END ============

function parseScalar(token) {
  const value = token.trim();
  if (!value.length) return '';
  try { return JSON.parse(value); } catch {}
  if (/^true$/i.test(value)) return true;
  if (/^false$/i.test(value)) return false;
  if (/^null$/i.test(value)) return null;
  if (/^-?\\d+$/.test(value)) return parseInt(value, 10);
  if (/^-?(?:\\d+\\.\\d+|\\d+\\.\\d*|\\.\\d+)(?:[eE][+-]?\\d+)?$/.test(value)) return parseFloat(value);
  if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) return value.slice(1, -1);
  return value;
}

function parseInput(line) {
  const value = (line || '').trim();
  if (!value.length) return '';
  try { return JSON.parse(value); } catch {}
  if (value.includes(',')) return value.split(',').map(parseScalar);
  return parseScalar(value);
}

function stringifyAny(value) {
  if (typeof value === 'string') return value;
  try { return JSON.stringify(value); } catch { return String(value); }
}

function formatResult(value) {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) {
    if (value.length > 0 && value.every((item) => typeof item === 'string')) return value.join('\\n');
    return value.map((item) => stringifyAny(item)).join(',');
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

const inputs = lines.map(parseInput);
const debugLogs = [];
const originalLog = console.log;
const originalError = console.error;
console.log = (...args) => { debugLogs.push(args.map((arg) => stringifyAny(arg)).join(' ')); };
console.error = (...args) => { debugLogs.push(args.map((arg) => stringifyAny(arg)).join(' ')); };

let result;
let runtimeError = null;
try {
  result = ${functionName}(...inputs);
} catch (err) {
  runtimeError = err;
} finally {
  console.log = originalLog;
  console.error = originalError;
  if (debugLogs.length > 0) {
    process.stderr.write(DEBUG_START + '\\n' + debugLogs.join('\\n') + '\\n' + DEBUG_END + '\\n');
  }
}

if (runtimeError) throw runtimeError;
if (result !== undefined && result !== null) {
  process.stdout.write(formatResult(result));
} else if (debugLogs.length > 0) {
  process.stdout.write(debugLogs.join('\\n'));
} else {
  process.stdout.write('');
}`
  }

  if (lang === 'python') {
    return `import sys
import json
import builtins

DEBUG_START = '${DEBUG_STDERR_START}'
DEBUG_END = '${DEBUG_STDERR_END}'
raw_input = sys.stdin.read()
lines = [] if raw_input == '' else raw_input.replace('\\r\\n', '\\n').split('\\n')
if lines and lines[-1] == '':
    lines = lines[:-1]

# ============ USER CODE START ============
${cleanedCode}
# ============ USER CODE END ============

def parse_scalar(token):
    value = token.strip()
    if value == '':
        return ''
    try:
        return json.loads(value)
    except:
        pass
    lowered = value.lower()
    if lowered == 'true':
        return True
    if lowered == 'false':
        return False
    if lowered == 'null':
        return None
    try:
        if '.' in value or 'e' in lowered:
            return float(value)
        return int(value)
    except:
        pass
    if (value.startswith("'") and value.endswith("'")) or (value.startswith('"') and value.endswith('"')):
        return value[1:-1]
    return value

def parse_input(line):
    value = (line or '').strip()
    if value == '':
        return ''
    try:
        return json.loads(value)
    except:
        pass
    if ',' in value:
        return [parse_scalar(part) for part in value.split(',')]
    return parse_scalar(value)

def stringify_any(value):
    if isinstance(value, str):
        return value
    try:
        return json.dumps(value)
    except:
        return str(value)

def format_result(value):
    if value is None:
        return ''
    if isinstance(value, list):
        if len(value) > 0 and all(isinstance(x, str) for x in value):
            return '\\n'.join(value)
        return ','.join([stringify_any(x) for x in value])
    if isinstance(value, dict):
        return json.dumps(value)
    return str(value)

inputs = [parse_input(line) for line in lines]
debug_logs = []
original_print = builtins.print

def capture_print(*args, **kwargs):
    sep = kwargs.get('sep', ' ')
    end = kwargs.get('end', '\\n')
    message = sep.join([str(arg) for arg in args]) + end
    debug_logs.append(message[:-1] if message.endswith('\\n') else message)

builtins.print = capture_print
result = None
runtime_error = None
try:
    result = ${functionName}(*inputs)
except Exception as e:
    runtime_error = e
finally:
    builtins.print = original_print
    if len(debug_logs) > 0:
        sys.stderr.write(DEBUG_START + '\\n' + '\\n'.join(debug_logs) + '\\n' + DEBUG_END + '\\n')

if runtime_error is not None:
    raise runtime_error
if result is not None:
    sys.stdout.write(format_result(result))
elif len(debug_logs) > 0:
    sys.stdout.write('\\n'.join(debug_logs))
else:
    sys.stdout.write('')
`
  }

  return cleanedCode
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
async function submitBatch(payloads: SubmissionPayload[]): Promise<{ token: string }[]> {
  if (apiFailureCount >= MAX_FAILURES_BEFORE_MOCK) {
    return payloads.map((_, index) => ({ token: `mock_batch_${Date.now()}_${index}` }))
  }

  return new Promise((resolve, reject) => {
    requestQueue = requestQueue.then(async () => {
      try {
        await waitForRateLimit()

        const result = await retryWithBackoff(async () => {
          const response = await fetch(
            `${JUDGE0_API_URL}/submissions/batch?base64_encoded=false`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-RapidAPI-Key': RAPIDAPI_KEY,
                'X-RapidAPI-Host': RAPIDAPI_HOST,
              },
              body: JSON.stringify({ submissions: payloads }),
            }
          )

          if (!response.ok) {
            const errorText = await response.text().catch(() => response.statusText)
            throw new Error(`Judge0 batch create error: ${response.status} - ${errorText}`)
          }

          const data = await response.json()
          const items: BatchSubmissionCreateItem[] = Array.isArray(data) ? data : (data?.submissions || [])
          if (!Array.isArray(items) || items.length !== payloads.length) {
            throw new Error('Judge0 batch create returned an unexpected response shape')
          }

          return items.map((item, index) => {
            if (!item?.token || typeof item.token !== 'string') {
              throw new Error(`Judge0 batch create failed for submission ${index + 1}`)
            }
            return { token: item.token }
          })
        }, 3, 2000)

        if (apiFailureCount > 0) {
          apiFailureCount = 0
        }

        requestCounter.submissions++
        resolve(result)
      } catch (error) {
        console.error('Judge0 batch submission error:', error)
        apiFailureCount++
        reject(error)
      }
    })
  })
}

async function getBatchSubmissionResults(tokens: string[]): Promise<SubmissionResult[]> {
  if (tokens.some((token) => token.startsWith('mock_batch_')) || apiFailureCount >= MAX_FAILURES_BEFORE_MOCK) {
    return tokens.map((token) => ({
      stdout: 'Mock output',
      stderr: null,
      compile_output: null,
      message: null,
      time: '0.01',
      memory: 1024,
      status: { id: 3, description: 'Accepted' },
      token,
    }))
  }

  await waitForRateLimit()

  const response = await fetch(
    `${JUDGE0_API_URL}/submissions/batch?base64_encoded=false&tokens=${tokens.join(',')}`,
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
    throw new Error(`Judge0 batch get error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const items = Array.isArray(data) ? data : (data?.submissions || [])
  if (!Array.isArray(items)) {
    throw new Error('Judge0 batch get returned an unexpected response shape')
  }

  requestCounter.polls++

  return items.map((item: any, index: number) => ({
    stdout: item?.stdout ?? null,
    stderr: item?.stderr ?? null,
    compile_output: item?.compile_output ?? null,
    message: item?.message ?? null,
    time: item?.time ?? null,
    memory: item?.memory ?? null,
    status: item?.status ?? {
      id: typeof item?.status_id === 'number' ? item.status_id : 13,
      description: 'Unknown',
    },
    token: item?.token ?? tokens[index] ?? '',
  }))
}

function mapSubmissionResultToTestResult(testCase: TestCase, result: SubmissionResult): TestResult {
  const { cleanStderr, debugLogs } = extractDebugLogs(result.stderr)
  const passed = outputsMatch(testCase.expectedOutput, result.stdout) && result.status.id === 3

  return {
    ...testCase,
    actualOutput: result.stdout,
    passed,
    error: cleanStderr || result.compile_output || result.message || undefined,
    debugLogs,
    time: result.time || undefined,
    memory: result.memory || undefined,
    statusId: result.status?.id,
    statusDescription: result.status?.description,
    stderr: cleanStderr,
    compileOutput: result.compile_output,
    message: result.message,
  }
}

async function runTestCasesSequential(
  sourceCode: string,
  languageId: number,
  testCases: TestCase[],
  options: RunTestOptions,
  onProgress?: (current: number, total: number) => void
): Promise<TestResult[]> {
  const results: TestResult[] = []

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i]

    onProgress?.(i + 1, testCases.length)

    try {
      const result = await submitAndWait({
        source_code: sourceCode,
        language_id: languageId,
        stdin: testCase.input,
        cpu_time_limit: options.timeLimit || 3,
        memory_limit: options.memoryLimit || 256000,
      })

      results.push(mapSubmissionResultToTestResult(testCase, result))

      if (i < testCases.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 800))
      }
    } catch (error) {
      console.error(`Test case ${i + 1} failed:`, error)

      if (apiFailureCount >= MAX_FAILURES_BEFORE_MOCK) {
        const remainingTests = testCases.slice(i)
        const mockResults = await mockRunTestCases(
          sourceCode,
          languageId,
          remainingTests,
          (current) => onProgress?.(i + current, testCases.length)
        )
        results.push(...mockResults)
        break
      }

      results.push({
        ...testCase,
        actualOutput: null,
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        statusDescription: 'Execution failed',
      })
    }
  }

  return results
}

export async function runTestCases(
  sourceCode: string,
  languageId: number,
  testCases: TestCase[],
  optionsOrProgress?: RunTestOptions | ((current: number, total: number) => void),
  maybeOnProgress?: (current: number, total: number) => void
): Promise<TestResult[]> {
  const options: RunTestOptions =
    typeof optionsOrProgress === 'function' ? {} : (optionsOrProgress || {})
  const onProgress =
    typeof optionsOrProgress === 'function' ? optionsOrProgress : maybeOnProgress

  if (apiFailureCount >= MAX_FAILURES_BEFORE_MOCK) {
    return mockRunTestCases(sourceCode, languageId, testCases, onProgress)
  }

  if (testCases.length === 0) return []

  try {
    const payloads: SubmissionPayload[] = testCases.map((testCase) => ({
      source_code: sourceCode,
      language_id: languageId,
      stdin: testCase.input,
      cpu_time_limit: options.timeLimit || 3,
      memory_limit: options.memoryLimit || 256000,
    }))

    const tokenResponses = await submitBatch(payloads)
    const tokens = tokenResponses.map((item) => item.token)

    if (tokens.some((token) => token.startsWith('mock_batch_'))) {
      return mockRunTestCases(sourceCode, languageId, testCases, onProgress)
    }

    let pollInterval = INITIAL_POLL_INTERVAL

    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      await new Promise(resolve => setTimeout(resolve, pollInterval))

      try {
        const batchResults = await getBatchSubmissionResults(tokens)
        const completedCount = batchResults.filter((result) => result.status?.id > 2).length
        onProgress?.(completedCount, testCases.length)

        if (completedCount === testCases.length) {
          return testCases.map((testCase, index) =>
            mapSubmissionResultToTestResult(testCase, batchResults[index])
          )
        }

        pollInterval = Math.min(pollInterval * POLL_BACKOFF_MULTIPLIER, MAX_POLL_INTERVAL)
      } catch (error) {
        if (error instanceof Error && error.message.includes('429')) {
          pollInterval = Math.min(pollInterval * 2, MAX_POLL_INTERVAL)
        } else {
          throw error
        }
      }
    }

    throw new Error(`Batch submission timeout - took longer than ${Math.round(MAX_POLL_ATTEMPTS * INITIAL_POLL_INTERVAL / 1000)}s to execute`)
  } catch (error) {
    console.warn('Batch mode failed, falling back to sequential execution:', error)
    return runTestCasesSequential(sourceCode, languageId, testCases, options, onProgress)
  }
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
