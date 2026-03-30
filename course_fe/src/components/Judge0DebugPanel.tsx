import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Alert, AlertDescription } from '../components/ui/alert'
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Activity,
  RefreshCw,
  Info,
  Zap,
  BarChart3,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import {
  getApiStatus,
  resetApiFailureCount,
  checkApiHealth,
  getRequestStats,
  resetRequestStats,
} from '../utils/judge0'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

export function Judge0DebugPanel() {
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

  const handleHealthCheck = async () => {
    setIsCheckingHealth(true)
    try {
      const healthy = await checkApiHealth()
      setLastHealthCheck({ healthy, timestamp: Date.now() })

      if (healthy) {
        toast.success(t('judge0_debug_panel.api_healthy'))
      } else {
        toast.error(t('judge0_debug_panel.api_unreachable'))
      }
    } catch {
      toast.error(t('judge0_debug_panel.health_check_failed'))
      setLastHealthCheck({ healthy: false, timestamp: Date.now() })
    } finally {
      setIsCheckingHealth(false)
    }
  }

  const handleResetFailures = () => {
    resetApiFailureCount()
    setApiStatus(getApiStatus())
    toast.success(t('judge0_debug_panel.failure_reset'))
  }

  const handleResetRequestStats = () => {
    resetRequestStats()
    setRequestStats(getRequestStats())
    toast.success(t('judge0_debug_panel.stats_reset'))
  }

  return (
    <Card className="mb-6 border-2 border-blue-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          {t('judge0_debug_panel.title')}
        </CardTitle>
        <CardDescription>{t('judge0_debug_panel.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{apiStatus.failureCount}</div>
            <div className="text-xs text-muted-foreground">{t('judge0_debug_panel.failures')}</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{apiStatus.maxFailures}</div>
            <div className="text-xs text-muted-foreground">{t('judge0_debug_panel.max_before_mock')}</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold">
              {apiStatus.isMockMode ? <Badge variant="secondary">MOCK</Badge> : <Badge variant="default">LIVE</Badge>}
            </div>
            <div className="text-xs text-muted-foreground">{t('judge0_debug_panel.current_mode')}</div>
          </div>
        </div>

        {apiStatus.isMockMode ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>{t('judge0_debug_panel.mock_mode_active')}</strong> {t('judge0_debug_panel.mock_mode_body', {
                count: apiStatus.failureCount,
              })}
            </AlertDescription>
          </Alert>
        ) : apiStatus.failureCount > 0 ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>{t('judge0_debug_panel.api_issues_detected')}</strong>{' '}
              {t('judge0_debug_panel.api_issues_body', {
                count: apiStatus.failureCount,
                max: apiStatus.maxFailures,
                remaining: apiStatus.maxFailures - apiStatus.failureCount,
              })}
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              <strong>{t('judge0_debug_panel.api_operational')}</strong> {t('judge0_debug_panel.api_operational_body')}
            </AlertDescription>
          </Alert>
        )}

        {lastHealthCheck && (
          <div
            className={`p-3 rounded-lg border ${
              lastHealthCheck.healthy
                ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
                : 'bg-red-50 dark:bg-red-900/20 border-red-500'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              {lastHealthCheck.healthy ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span className="font-medium text-sm">
                {t('judge0_debug_panel.last_health_check', {
                  result: lastHealthCheck.healthy
                    ? t('judge0_debug_panel.passed')
                    : t('judge0_debug_panel.failed'),
                })}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{new Date(lastHealthCheck.timestamp).toLocaleTimeString()}</p>
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={handleHealthCheck} disabled={isCheckingHealth} variant="outline" className="flex-1">
            {isCheckingHealth ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                {t('judge0_debug_panel.checking')}
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                {t('judge0_debug_panel.check_health')}
              </>
            )}
          </Button>

          <Button
            onClick={handleResetFailures}
            disabled={apiStatus.failureCount === 0}
            variant="outline"
            className="flex-1"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('judge0_debug_panel.reset_failures')}
          </Button>

          <Button
            onClick={handleResetRequestStats}
            disabled={requestStats.submissions === 0 && requestStats.polls === 0}
            variant="outline"
            className="flex-1"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('judge0_debug_panel.reset_stats')}
          </Button>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-4 w-4 text-blue-600" />
            <h4 className="font-semibold text-blue-900 dark:text-blue-100">{t('judge0_debug_panel.request_stats_title')}</h4>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2 bg-white/50 dark:bg-black/20 rounded">
              <div className="text-xl font-bold text-blue-700 dark:text-blue-300">{requestStats.submissions}</div>
              <div className="text-xs text-blue-600 dark:text-blue-400">{t('judge0_debug_panel.submissions')}</div>
            </div>
            <div className="text-center p-2 bg-white/50 dark:bg-black/20 rounded">
              <div className="text-xl font-bold text-blue-700 dark:text-blue-300">{requestStats.polls}</div>
              <div className="text-xs text-blue-600 dark:text-blue-400">{t('judge0_debug_panel.polls')}</div>
            </div>
            <div className="text-center p-2 bg-white/50 dark:bg-black/20 rounded">
              <div className="text-xl font-bold text-blue-700 dark:text-blue-300">
                {requestStats.submissions + requestStats.polls}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400">{t('judge0_debug_panel.total')}</div>
            </div>
          </div>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">{t('judge0_debug_panel.request_stats_hint')}</p>
        </div>

        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
          <p>
            <strong>{t('judge0_debug_panel.configuration')}</strong>
          </p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>{t('judge0_debug_panel.config.initial_poll_interval')}</li>
            <li>{t('judge0_debug_panel.config.max_poll_interval')}</li>
            <li>{t('judge0_debug_panel.config.backoff_multiplier')}</li>
            <li>{t('judge0_debug_panel.config.min_request_interval')}</li>
            <li>{t('judge0_debug_panel.config.submission_retry')}</li>
            <li>{t('judge0_debug_panel.config.sequential_execution')}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
