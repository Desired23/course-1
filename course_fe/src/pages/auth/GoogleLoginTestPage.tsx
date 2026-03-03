import { useAuth } from '../../contexts/AuthContext'
import { GoogleLoginButton } from '../../components/GoogleLoginButton'
import { GoogleUserInfo } from '../../components/GoogleUserInfo'
import { Button } from '../../components/ui/button'
import { useRouter } from '../../components/Router'
import { toast } from 'sonner@2.0.3'
import { CheckCircle, XCircle, AlertCircle, ExternalLink } from 'lucide-react'
import { GOOGLE_OAUTH_CONFIG, validateGoogleOAuthConfig } from '../../config/googleOAuth'

/**
 * Google Login Test Page
 * For testing Google OAuth integration
 */
export function GoogleLoginTestPage() {
  const { isAuthenticated, user, logout } = useAuth()
  const { navigate } = useRouter()

  // Validate configuration
  const configValidation = validateGoogleOAuthConfig()

  const handleGoogleSuccess = () => {
    toast.success('🎉 Google login successful!', {
      description: `Welcome ${user?.name || 'User'}!`
    })
  }

  const handleGoogleError = (error: Error) => {
    toast.error('❌ Google login failed', {
      description: error.message
    })
  }

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Google OAuth Test Page</h1>
          <p className="text-gray-600">Test Google Login integration</p>
        </div>

        {/* Configuration Status */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Configuration Status
          </h2>

          <div className="space-y-3">
            {/* Validation Result */}
            <div className={`flex items-start gap-3 p-3 rounded-lg ${
              configValidation.valid ? 'bg-green-50' : 'bg-red-50'
            }`}>
              {configValidation.valid ? (
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="font-medium">
                  {configValidation.valid ? 'Configuration Valid ✅' : 'Configuration Invalid ❌'}
                </div>
                {!configValidation.valid && (
                  <ul className="mt-2 space-y-1 text-sm text-red-700">
                    {configValidation.errors.map((error, idx) => (
                      <li key={idx}>• {error}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Client ID */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-700 mb-1">Client ID:</div>
              <code className="text-xs bg-white px-2 py-1 rounded border break-all">
                {GOOGLE_OAUTH_CONFIG.clientId}
              </code>
            </div>

            {/* Redirect URI */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-700 mb-1">Redirect URI:</div>
              <code className="text-xs bg-white px-2 py-1 rounded border break-all">
                {GOOGLE_OAUTH_CONFIG.redirectUri}
              </code>
            </div>

            {/* Scopes */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-700 mb-1">Scopes:</div>
              <code className="text-xs bg-white px-2 py-1 rounded border break-all">
                {GOOGLE_OAUTH_CONFIG.scope}
              </code>
            </div>
          </div>

          {/* Help Links */}
          <div className="mt-4 pt-4 border-t space-y-2">
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:text-primary/80"
            >
              <ExternalLink className="w-4 h-4" />
              Google Cloud Console
            </a>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/docs/GOOGLE_CONSOLE_SETUP.md')}
              className="w-full"
            >
              View Setup Documentation
            </Button>
          </div>
        </div>

        {/* Login Section */}
        {!isAuthenticated ? (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold mb-4">Login with Google</h2>
            
            <div className="space-y-4">
              <p className="text-gray-600 text-sm">
                Click the button below to test Google OAuth login:
              </p>

              <GoogleLoginButton
                useCustomButton={true}
                buttonText="Test Google Login"
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                className="w-full"
              />

              <div className="text-xs text-gray-500 space-y-1">
                <p>ℹ️ <strong>Note:</strong> After clicking, you'll see Google's account picker.</p>
                <p>✅ New users will be auto-created with "user" role.</p>
                <p>🔄 Existing users will update their avatar from Google.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* User Info */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Login Successful!
              </h2>
              
              <GoogleUserInfo />
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="font-semibold mb-3">Quick Actions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => navigate('/')}
                >
                  Go to Homepage
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/profile')}
                >
                  View Profile
                </Button>
                {user?.roles.includes('instructor') && (
                  <Button
                    variant="outline"
                    onClick={() => navigate('/instructor/dashboard')}
                  >
                    Instructor Dashboard
                  </Button>
                )}
                {user?.roles.includes('admin') && (
                  <Button
                    variant="outline"
                    onClick={() => navigate('/admin/dashboard')}
                  >
                    Admin Dashboard
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </div>
            </div>

            {/* User Data (Debug) */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="font-semibold mb-3">User Data (Debug)</h3>
              <pre className="text-xs bg-gray-50 p-4 rounded overflow-auto max-h-96">
                {JSON.stringify(user, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Troubleshooting */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            Troubleshooting
          </h3>
          
          <div className="space-y-2 text-sm text-gray-700">
            <div>
              <strong>❌ "redirect_uri_mismatch"</strong>
              <p className="ml-4 text-gray-600">
                → Add <code className="bg-white px-1 rounded">http://localhost:5173/auth/google/callback</code> to Google Console
              </p>
            </div>
            
            <div>
              <strong>❌ "origin_mismatch"</strong>
              <p className="ml-4 text-gray-600">
                → Add <code className="bg-white px-1 rounded">http://localhost:5173</code> to Authorized JavaScript origins
              </p>
            </div>
            
            <div>
              <strong>❌ Button not showing</strong>
              <p className="ml-4 text-gray-600">
                → Check browser console (F12), verify internet connection, disable AdBlock
              </p>
            </div>
            
            <div>
              <strong>❌ "Google Client ID is not configured"</strong>
              <p className="ml-4 text-gray-600">
                → Check <code className="bg-white px-1 rounded">.env</code> file has <code className="bg-white px-1 rounded">VITE_GOOGLE_CLIENT_ID</code>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>Need help? Check the documentation files:</p>
          <div className="flex gap-4 justify-center mt-2">
            <button
              onClick={() => window.open('/GOOGLE_LOGIN_QUICKSTART.md', '_blank')}
              className="text-primary hover:text-primary/80"
            >
              Quick Start
            </button>
            <button
              onClick={() => window.open('/docs/GOOGLE_CONSOLE_SETUP.md', '_blank')}
              className="text-primary hover:text-primary/80"
            >
              Console Setup
            </button>
            <button
              onClick={() => window.open('/docs/GOOGLE_LOGIN_IMPLEMENTATION.md', '_blank')}
              className="text-primary hover:text-primary/80"
            >
              Implementation
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
