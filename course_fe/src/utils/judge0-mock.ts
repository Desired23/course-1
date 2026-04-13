


import type { SubmissionPayload, SubmissionResult, TestCase, TestResult } from './judge0'

function normalizeText(value?: string | null): string {
  return (value || '').replace(/\r\n/g, '\n').trim()
}

function compareOutputs(expected: string, actual?: string | null): boolean {
  return normalizeText(expected) === normalizeText(actual)
}


function evaluateJavaScriptCode(code: string, input: string): { output: string; error: string | null } {
  try {

    const inputs = input.split('\n')
    const mockArgv = ['node', 'script.js', ...inputs]


    const mockConsoleOutput: string[] = []
    const mockConsole = {
      log: (...args: any[]) => {
        mockConsoleOutput.push(args.map(String).join(' '))
      }
    }


    const wrappedCode = `
      const process = { argv: ${JSON.stringify(mockArgv)} };
      const console = ${JSON.stringify(mockConsole)};
      ${code}
      return ${JSON.stringify(mockConsoleOutput)}.join('\\n');
    `


    const func = new Function(wrappedCode)
    const output = func()

    return {
      output: output || mockConsoleOutput.join('\n'),
      error: null
    }
  } catch (error) {
    return {
      output: '',
      error: error instanceof Error ? error.message : 'Execution error'
    }
  }
}


export async function mockSubmitCode(payload: SubmissionPayload): Promise<{ token: string }> {
  await new Promise(resolve => setTimeout(resolve, 300))
  return { token: `mock_${Date.now()}` }
}


export async function mockGetSubmissionResult(
  token: string,
  payload?: SubmissionPayload
): Promise<SubmissionResult> {
  await new Promise(resolve => setTimeout(resolve, 500))

  if (!payload) {
    return {
      stdout: 'Mock output (no code to execute)',
      stderr: null,
      compile_output: null,
      message: null,
      time: '0.01',
      memory: 1024,
      status: { id: 3, description: 'Accepted' },
      token,
    }
  }


  if (payload.language_id === 63) {
    const result = evaluateJavaScriptCode(payload.source_code, payload.stdin || '')

    return {
      stdout: result.output,
      stderr: result.error,
      compile_output: null,
      message: result.error ? 'Runtime Error' : null,
      time: '0.02',
      memory: 2048,
      status: {
        id: result.error ? 12 : 3,
        description: result.error ? 'Runtime Error' : 'Accepted'
      },
      token,
    }
  }


  return {
    stdout: payload.expected_output || 'Mock output',
    stderr: null,
    compile_output: null,
    message: null,
    time: '0.01',
    memory: 1024,
    status: { id: 3, description: 'Accepted' },
    token,
  }
}


export async function mockRunTestCases(
  sourceCode: string,
  languageId: number,
  testCases: TestCase[],
  onProgress?: (current: number, total: number) => void
): Promise<TestResult[]> {
  const results: TestResult[] = []

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i]

    if (onProgress) {
      onProgress(i + 1, testCases.length)
    }


    await new Promise(resolve => setTimeout(resolve, 800))

    try {
      const payload: SubmissionPayload = {
        source_code: sourceCode,
        language_id: languageId,
        stdin: testCase.input,
        expected_output: testCase.expectedOutput,
      }

      const result = await mockGetSubmissionResult('mock_token', payload)

      const passed = compareOutputs(testCase.expectedOutput, result.stdout) && result.status.id === 3

      results.push({
        ...testCase,
        actualOutput: result.stdout,
        passed,
        error: result.stderr || result.message || undefined,
        time: result.time || undefined,
        memory: result.memory || undefined,
      })
    } catch (error) {
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


export async function isJudge0Available(): Promise<boolean> {
  try {
    const response = await fetch('https://judge0-ce.p.rapidapi.com/about', {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': 'ecec505edbmsh875f227dbb9bbeap1221c1jsn547ff02bf628',
        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
      },
    })
    return response.ok
  } catch {
    return false
  }
}
