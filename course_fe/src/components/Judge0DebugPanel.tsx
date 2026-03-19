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
  BarChart3
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { 
  getApiStatus, 
  resetApiFailureCount, 
  checkApiHealth,
  getRequestStats,
  resetRequestStats
} from '../utils/judge0'
import { toast } from 'sonner'

export function Judge0DebugPanel() {
  const [apiStatus, setApiStatus] = useState(getApiStatus())
  const [requestStats, setRequestStats] = useState(getRequestStats())
  const [isCheckingHealth, setIsCheckingHealth] = useState(false)
  const [lastHealthCheck, setLastHealthCheck] = useState<{ healthy: boolean; timestamp: number } | null>(null)

  // Update status every 2 seconds
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
        toast.success('Judge0 API is healthy! ✅')
      } else {
        toast.error('Judge0 API is unreachable ❌')
      }
    } catch (error) {
      toast.error('Health check failed')
      setLastHealthCheck({ healthy: false, timestamp: Date.now() })
    } finally {
      setIsCheckingHealth(false)
    }
  }

  const handleResetFailures = () => {
    resetApiFailureCount()
    setApiStatus(getApiStatus())
    toast.success('Failure count reset!')
  }

  const handleResetRequestStats = () => {
    resetRequestStats()
    setRequestStats(getRequestStats())
    toast.success('Request stats reset!')
  }

  return (
    <Card className="mb-6 border-2 border-blue-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Judge0 API Status
        </CardTitle>
        <CardDescription>
          Monitor API health and auto-fallback to mock mode
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Overview */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{apiStatus.failureCount}</div>
            <div className="text-xs text-muted-foreground">Failures</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{apiStatus.maxFailures}</div>
            <div className="text-xs text-muted-foreground">Max Before Mock</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold">
              {apiStatus.isMockMode ? (
                <Badge variant="secondary">MOCK</Badge>
              ) : (
                <Badge variant="default">LIVE</Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground">Current Mode</div>
          </div>
        </div>

        {/* Status Indicator */}
        {apiStatus.isMockMode ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Mock Mode Active</strong> - API has failed {apiStatus.failureCount} times. 
              Using mock responses for testing. Reset failures to try API again.
            </AlertDescription>
          </Alert>
        ) : apiStatus.failureCount > 0 ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>API Issues Detected</strong> - {apiStatus.failureCount}/{apiStatus.maxFailures} failures. 
              Will switch to mock mode after {apiStatus.maxFailures - apiStatus.failureCount} more failure(s).
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              <strong>API Operational</strong> - No failures detected. Running in live mode.
            </AlertDescription>
          </Alert>
        )}

        {/* Health Check Result */}
        {lastHealthCheck && (
          <div className={`p-3 rounded-lg border ${
            lastHealthCheck.healthy 
              ? 'bg-green-50 dark:bg-green-900/20 border-green-500' 
              : 'bg-red-50 dark:bg-red-900/20 border-red-500'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              {lastHealthCheck.healthy ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span className="font-medium text-sm">
                Last Health Check: {lastHealthCheck.healthy ? 'Passed' : 'Failed'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(lastHealthCheck.timestamp).toLocaleTimeString()}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            onClick={handleHealthCheck}
            disabled={isCheckingHealth}
            variant="outline"
            className="flex-1"
          >
            {isCheckingHealth ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Check Health
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
            Reset Failures
          </Button>
          
          <Button 
            onClick={handleResetRequestStats}
            disabled={requestStats.submissions === 0 && requestStats.polls === 0}
            variant="outline"
            className="flex-1"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset Stats
          </Button>
        </div>

        {/* Request Stats */}
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-4 w-4 text-blue-600" />
            <h4 className="font-semibold text-blue-900 dark:text-blue-100">📊 Request Stats (Current Session)</h4>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2 bg-white/50 dark:bg-black/20 rounded">
              <div className="text-xl font-bold text-blue-700 dark:text-blue-300">
                {requestStats.submissions}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400">POST (Submissions)</div>
            </div>
            <div className="text-center p-2 bg-white/50 dark:bg-black/20 rounded">
              <div className="text-xl font-bold text-blue-700 dark:text-blue-300">
                {requestStats.polls}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400">GET (Polls)</div>
            </div>
            <div className="text-center p-2 bg-white/50 dark:bg-black/20 rounded">
              <div className="text-xl font-bold text-blue-700 dark:text-blue-300">
                {requestStats.submissions + requestStats.polls}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400">Total</div>
            </div>
          </div>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
            💡 Expected: 1 POST + 1-3 GETs per test case (depending on Judge0 processing speed)
          </p>
        </div>

        {/* Configuration Info */}
        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
          <p><strong>Configuration:</strong></p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Initial poll interval: 1500ms (1.5s)</li>
            <li>Max poll interval: 5000ms (5s)</li>
            <li>Poll backoff multiplier: 1.5x</li>
            <li>Min request interval: 500ms</li>
            <li>Submission retry: 3 attempts (2s → 4s → 8s backoff)</li>
            <li>Sequential test execution (prevents rate limiting)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}