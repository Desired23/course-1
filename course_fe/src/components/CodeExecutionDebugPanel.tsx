import { useEffect, useMemo, useState } from 'react'
import { Alert, AlertDescription } from './ui/alert'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Textarea } from './ui/textarea'
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock3,
  Cpu,
  Loader2,
  Play,
  RefreshCw,
  TerminalSquare,
  XCircle,
} from 'lucide-react'
import {
  STATUS_DESCRIPTIONS,
  TestResult,
  checkApiHealth,
  getApiStatus,
  getRequestStats,
  resetApiFailureCount,
  resetRequestStats,
} from '../utils/judge0'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

export interface DebugExecutionResult {
  stdout: string | null
  stderr: string | null
  compileOutput: string | null
  message: string | null
  statusId?: number
  statusDescription?: string
  time?: string | null
  memory?: number | null
  debugLogs: string[]
}

interface CodeExecutionDebugPanelProps {
  results: TestResult[]
  isRunningTests: boolean
  runProgress: { current: number; total: number }
  runError: string | null
  customInput: string
  onCustomInputChange: (value: string) => void
  onRunCustom: () => void
  isRunningCustom: boolean
  customResult: DebugExecutionResult | null
  customError: string | null
}

function MetricCard({
  title,
  value,
  subtitle,
}: {
  title: string
  value: string | number
  subtitle?: string
}) {
  return (
    <div className="rounded-xl border bg-muted/30 p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {subtitle && <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div>}
    </div>
  )
}

function StatusBadge({
  statusId,
  statusDescription,
  fallbackLabel,
}: {
  statusId?: number
  statusDescription?: string
  fallbackLabel: string
}) {
  const preset = statusId ? STATUS_DESCRIPTIONS[statusId] : undefined
  const label = preset?.label || statusDescription || fallbackLabel
  const passed = statusId === 3
  return (
    <Badge variant={passed ? 'default' : 'secondary'}>
      {label}
      {statusId ? ` (${statusId})` : ''}
    </Badge>
  )
}

function DataBlock({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value?: string | null
  tone?: 'default' | 'success' | 'warning' | 'danger'
}) {
  if (!value) return null

  const toneClass =
    tone === 'success'
      ? 'border-green-200 bg-green-50 text-green-900 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-100'
      : tone === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100'
        : tone === 'danger'
          ? 'border-red-200 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-100'
          : 'border-border/50 bg-muted/40'

  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <pre className={`overflow-x-auto rounded-lg border p-3 text-xs font-mono whitespace-pre-wrap break-words ${toneClass}`}>
        {value}
      </pre>
    </div>
  )
}

function TestResultCard({ result, index, t }: { result: TestResult; index: number; t: (key: string, options?: any) => string }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">{t('code_debug_panel.test_case', { index: index + 1 })}</CardTitle>
            <CardDescription>{result.passed ? t('code_debug_panel.matched') : t('code_debug_panel.needs_attention')}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={result.passed ? 'default' : 'destructive'}>
              {result.passed ? (
                <><CheckCircle2 className="mr-1 h-3.5 w-3.5" />{t('code_debug_panel.passed')}</>
              ) : (
                <><XCircle className="mr-1 h-3.5 w-3.5" />{t('code_debug_panel.failed')}</>
              )}
            </Badge>
            <StatusBadge statusId={result.statusId} statusDescription={result.statusDescription} fallbackLabel={t('code_debug_panel.unknown')} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <DataBlock label={t('code_debug_panel.input')} value={result.input || t('code_debug_panel.empty')} />
          <DataBlock label={t('code_debug_panel.expected_output')} value={result.expectedOutput || t('code_debug_panel.empty')} />
        </div>

        <DataBlock
          label={t('code_debug_panel.actual_output')}
          value={result.actualOutput?.trim() || t('code_debug_panel.empty')}
          tone={result.passed ? 'success' : 'default'}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <MetricCard title={t('code_debug_panel.time')} value={result.time || t('code_debug_panel.empty')} subtitle={t('code_debug_panel.seconds_reported')} />
          <MetricCard title={t('code_debug_panel.memory')} value={result.memory ?? t('code_debug_panel.empty')} subtitle={t('code_debug_panel.kb_reported')} />
        </div>

        <DataBlock label={t('code_debug_panel.debug_logs')} value={result.debugLogs?.join('\n')} />
        <DataBlock label="stderr" value={result.stderr} tone="danger" />
        <DataBlock label={t('code_debug_panel.compile_output')} value={result.compileOutput} tone="warning" />
        <DataBlock label={t('code_debug_panel.judge0_message')} value={result.message} />
        <DataBlock label={t('code_debug_panel.normalized_error')} value={result.error} tone="danger" />
      </CardContent>
    </Card>
  )
}

export function CodeExecutionDebugPanel({
  results,
  isRunningTests,
  runProgress,
  runError,
  customInput,
  onCustomInputChange,
  onRunCustom,
  isRunningCustom,
  customResult,
  customError,
}: CodeExecutionDebugPanelProps) {
  const { t } = useTranslation()
  const [apiStatus, setApiStatus] = useState(getApiStatus())
  const [requestStats, setRequestStats] = useState(getRequestStats())
  const [isCheckingHealth, setIsCheckingHealth] = useState(false)
  const [lastHealthCheck, setLastHealthCheck] = useState<{ healthy: boolean; timestamp: number } | null>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      setApiStatus(getApiStatus())
      setRequestStats(getRequestStats())
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  const summary = useMemo(() => {
    const passed = results.filter((result) => result.passed).length
    const failed = results.length - passed
    return { passed, failed, total: results.length }
  }, [results])

  const handleHealthCheck = async () => {
    setIsCheckingHealth(true)
    try {
      const healthy = await checkApiHealth()
      setLastHealthCheck({ healthy, timestamp: Date.now() })
      if (healthy) {
        toast.success(t('code_debug_panel.api_healthy'))
      } else {
        toast.error(t('code_debug_panel.api_unreachable'))
      }
    } finally {
      setIsCheckingHealth(false)
    }
  }

  const modeLabel = apiStatus.isMockMode ? 'MOCK' : 'LIVE'

  return (
    <Card className="border-2 border-primary/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TerminalSquare className="h-5 w-5" />
          {t('code_debug_panel.title')}
        </CardTitle>
        <CardDescription>
          {t('code_debug_panel.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title={t('code_debug_panel.passed')} value={summary.passed} subtitle={t('code_debug_panel.total_tests', { count: summary.total })} />
          <MetricCard title={t('code_debug_panel.failed')} value={summary.failed} subtitle={t('code_debug_panel.latest_run_only')} />
          <MetricCard title={t('code_debug_panel.mode')} value={modeLabel} subtitle={`${apiStatus.failureCount}/${apiStatus.maxFailures} ${t('code_debug_panel.failures').toLowerCase()}`} />
          <MetricCard title={t('code_debug_panel.requests')} value={requestStats.submissions + requestStats.polls} subtitle={`${requestStats.submissions} POST / ${requestStats.polls} GET`} />
        </div>

        {(runError || customError) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{runError || customError}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid h-auto w-full grid-cols-4">
            <TabsTrigger value="overview">{t('code_debug_panel.overview')}</TabsTrigger>
            <TabsTrigger value="tests">{t('code_debug_panel.per_test')}</TabsTrigger>
            <TabsTrigger value="custom">{t('code_debug_panel.custom_run')}</TabsTrigger>
            <TabsTrigger value="api">API</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {isRunningTests && runProgress.total > 0 && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  {t('code_debug_panel.running_tests', { current: runProgress.current, total: runProgress.total })}
                </AlertDescription>
              </Alert>
            )}

            {results.length === 0 ? (
              <Alert>
                <Activity className="h-4 w-4" />
                <AlertDescription>{t('code_debug_panel.run_solution_tests')}</AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                {results.map((result, index) => (
                  <div key={result.id ?? index} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <div className="font-medium">{t('code_debug_panel.test_case', { index: index + 1 })}</div>
                      <div className="text-xs text-muted-foreground">
                        {t('code_debug_panel.time')}: {result.time || t('code_debug_panel.empty')}s, {t('code_debug_panel.memory')}: {result.memory ?? t('code_debug_panel.empty')} KB
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={result.passed ? 'default' : 'destructive'}>
                        {result.passed ? t('code_debug_panel.passed') : t('code_debug_panel.failed')}
                      </Badge>
                      <StatusBadge statusId={result.statusId} statusDescription={result.statusDescription} fallbackLabel={t('code_debug_panel.unknown')} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="tests" className="space-y-4">
            {results.length === 0 ? (
              <Alert>
                <Clock3 className="h-4 w-4" />
                <AlertDescription>{t('code_debug_panel.no_test_results')}</AlertDescription>
              </Alert>
            ) : (
              results.map((result, index) => <TestResultCard key={result.id ?? index} result={result} index={index} t={t} />)
            )}
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('code_debug_panel.custom_run_title')}</CardTitle>
                <CardDescription>
                  {t('code_debug_panel.custom_run_desc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={customInput}
                  onChange={(e) => onCustomInputChange(e.target.value)}
                  placeholder={'[2,7,10,11]\n9'}
                  className="min-h-28 font-mono text-sm"
                />
                <Button onClick={onRunCustom} disabled={isRunningCustom}>
                  {isRunningCustom ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('code_debug_panel.running')}
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      {t('code_debug_panel.run_custom_input')}
                    </>
                  )}
                </Button>

                {customResult && (
                  <div className="space-y-4 rounded-xl border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">{t('code_debug_panel.latest_custom_run')}</div>
                      <StatusBadge statusId={customResult.statusId} statusDescription={customResult.statusDescription} fallbackLabel={t('code_debug_panel.unknown')} />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <MetricCard title={t('code_debug_panel.time')} value={customResult.time || t('code_debug_panel.empty')} subtitle={t('code_debug_panel.seconds_reported')} />
                      <MetricCard title={t('code_debug_panel.memory')} value={customResult.memory ?? t('code_debug_panel.empty')} subtitle={t('code_debug_panel.kb_reported')} />
                    </div>
                    <DataBlock label="stdout" value={customResult.stdout || '(empty)'} tone="success" />
                    <DataBlock label={t('code_debug_panel.debug_logs')} value={customResult.debugLogs.join('\n')} />
                    <DataBlock label="stderr" value={customResult.stderr} tone="danger" />
                    <DataBlock label={t('code_debug_panel.compile_output')} value={customResult.compileOutput} tone="warning" />
                    <DataBlock label={t('code_debug_panel.judge0_message')} value={customResult.message} />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="api" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <MetricCard title={t('code_debug_panel.mode')} value={modeLabel} />
              <MetricCard title={t('code_debug_panel.failures')} value={apiStatus.failureCount} />
              <MetricCard title={t('code_debug_panel.submissions')} value={requestStats.submissions} />
              <MetricCard title={t('code_debug_panel.polls')} value={requestStats.polls} />
            </div>

            {lastHealthCheck && (
              <Alert>
                {lastHealthCheck.healthy ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                <AlertDescription>
                  {t('code_debug_panel.last_health_check', {
                    time: new Date(lastHealthCheck.timestamp).toLocaleTimeString(),
                    status: lastHealthCheck.healthy ? t('code_debug_panel.health_ok') : t('code_debug_panel.health_bad'),
                  })}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleHealthCheck} disabled={isCheckingHealth}>
                {isCheckingHealth ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Activity className="mr-2 h-4 w-4" />}
                {t('code_debug_panel.check_health')}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  resetApiFailureCount()
                  setApiStatus(getApiStatus())
                  toast.success(t('code_debug_panel.failures_reset'))
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {t('code_debug_panel.reset_failures')}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  resetRequestStats()
                  setRequestStats(getRequestStats())
                  toast.success(t('code_debug_panel.request_stats_reset'))
                }}
              >
                <Cpu className="mr-2 h-4 w-4" />
                {t('code_debug_panel.reset_request_stats')}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
