import { type ChangeEvent, useEffect, useRef, useState } from "react"
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Separator } from "../../components/ui/separator"
import { Switch } from "../../components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Textarea } from "../../components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar"
import { Badge } from "../../components/ui/badge"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "../../components/ui/dialog"
import { Alert, AlertDescription } from "../../components/ui/alert"
import { useAuth } from "../../contexts/AuthContext"
import { changeMyPassword, deactivateMyAccount, deleteMyAccount } from "../../services/auth.api"
import { uploadFiles } from "../../services/upload.api"
import { getMyUserSettings, updateMyUserSettings } from "../../services/user-settings.api"
import type { ApiError } from "../../services/http"
import { toast } from "sonner"
import { 
  Eye, EyeOff, Mail, Lock, Globe, Bell, Shield, 
  User as UserIcon, Trash2, AlertTriangle,
  Check, X, Loader2, Camera
} from "lucide-react"
import { useTranslation } from "react-i18next"

// Validation functions
const validateEmail = (email: string): string | null => {
  if (!email) return "Email is required"
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) return "Invalid email format"
  return null
}

const validatePassword = (password: string): string | null => {
  if (!password) return "Password is required"
  if (password.length < 8) return "Password must be at least 8 characters"
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter"
  if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter"
  if (!/[0-9]/.test(password)) return "Password must contain at least one number"
  return null
}

const validateUsername = (username: string): string | null => {
  if (!username) return "Username is required"
  if (username.length < 3) return "Username must be at least 3 characters"
  if (username.length > 30) return "Username must be less than 30 characters"
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) return "Username can only contain letters, numbers, underscore and hyphen"
  return null
}

const getApiErrorMessage = (error: unknown, fallback: string): string => {
  const apiError = error as ApiError
  if (apiError?.message) return apiError.message
  if (apiError?.errors) {
    for (const value of Object.values(apiError.errors)) {
      if (Array.isArray(value) && value.length > 0) return String(value[0])
      if (typeof value === "string" && value) return value
    }
  }
  return fallback
}

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmText: string
  onConfirm: (password?: string) => Promise<void> | void
  variant?: 'default' | 'destructive'
  requirePassword?: boolean
}

function ConfirmDialog({ 
  open, 
  onOpenChange, 
  title, 
  description, 
  confirmText, 
  onConfirm,
  variant = 'default',
  requirePassword = false
}: ConfirmDialogProps) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    if (requirePassword && !password) {
      toast.error("Please enter your password")
      return
    }
    
    setLoading(true)
    try {
      await onConfirm(requirePassword ? password : undefined)
      setPassword('')
      onOpenChange(false)
    } catch {
      // keep dialog open so user can retry after seeing toast from handler
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className={variant === 'destructive' ? 'text-destructive' : ''}>
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        {requirePassword && (
          <div className="py-4">
            <Label htmlFor="confirm-password">Enter your password to confirm</Label>
            <Input
              id="confirm-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="mt-2"
            />
          </div>
        )}
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => {
              setPassword('')
              onOpenChange(false)
            }}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function AccountSettingsPage() {
  const { t } = useTranslation()
  const { user, updateProfile, logout } = useAuth()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  
  // Profile Data
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    username: user?.email?.split('@')[0] || '',
    email: user?.email || '',
    bio: user?.bio || '',
    phone: user?.phone || '',
    website: user?.website || '',
    twitter: user?.twitter || '',
    linkedin: user?.linkedin || '',
    facebook: user?.facebook || '',
  })
  
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({})
  
  // Password Data
  const [showPassword, setShowPassword] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({})
  
  // Account Settings
  const [accountSettings, setAccountSettings] = useState({
    language: 'en',
    timezone: 'UTC+7',
    currency: 'VND'
  })
  
  // Notification Settings
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    courseUpdates: true,
    promotions: false,
    announcements: true,
    weeklyDigest: true,
    instructorMessages: true,
    courseRecommendations: false,
    newFeatures: true
  })
  
  // Privacy Settings
  const [privacy, setPrivacy] = useState({
    profilePublic: true,
    showProgress: true,
    showCertificates: true,
    showCourses: true,
    allowMessages: true,
    showOnlineStatus: true
  })
  
  // Dialogs
  const [confirmDialogs, setConfirmDialogs] = useState({
    email: false,
    password: false,
    deactivate: false,
    delete: false
  })
  
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Validate Profile
  const validateProfile = (): boolean => {
    const errors: Record<string, string> = {}
    
    const emailError = validateEmail(profileData.email)
    if (emailError) errors.email = emailError
    
    const usernameError = validateUsername(profileData.username)
    if (usernameError) errors.username = usernameError
    
    if (!profileData.name || profileData.name.length < 2) {
      errors.name = "Name must be at least 2 characters"
    }
    
    if (profileData.bio && profileData.bio.length > 500) {
      errors.bio = "Bio must be less than 500 characters"
    }
    
    setProfileErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Validate Password
  const validatePasswordChange = (): boolean => {
    const errors: Record<string, string> = {}
    
    if (!passwordData.currentPassword) {
      errors.currentPassword = "Current password is required"
    }
    
    const newPasswordError = validatePassword(passwordData.newPassword)
    if (newPasswordError) errors.newPassword = newPasswordError
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match"
    }
    
    if (passwordData.newPassword === passwordData.currentPassword) {
      errors.newPassword = "New password must be different from current password"
    }
    
    setPasswordErrors(errors)
    return Object.keys(errors).length === 0
  }

  const [isSaving, setIsSaving] = useState(false)
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

  useEffect(() => {
    if (!user || hasUnsavedChanges) return
    setProfileData((prev) => ({
      ...prev,
      name: user.name || '',
      username: user.username || user.email?.split('@')[0] || '',
      email: user.email || '',
      bio: user.bio || '',
      phone: user.phone || '',
      website: user.website || '',
      twitter: user.twitter || '',
      linkedin: user.linkedin || '',
      facebook: user.facebook || '',
    }))
  }, [user, hasUnsavedChanges])

  useEffect(() => {
    let cancelled = false
    getMyUserSettings()
      .then((res) => {
        if (cancelled) return
        setAccountSettings((prev) => ({ ...prev, ...(res.account_preferences || {}) }))
        setNotifications((prev) => ({ ...prev, ...(res.notification_preferences || {}) }))
        setPrivacy((prev) => ({ ...prev, ...(res.privacy_preferences || {}) }))
      })
      .catch((error) => {
        toast.error(getApiErrorMessage(error, "Failed to load settings"))
      })
    return () => { cancelled = true }
  }, [])

  // Handle Profile Update
  const handleProfileUpdate = async () => {
    if (!validateProfile()) {
      toast.error("Please fix validation errors")
      return
    }
    
    setIsSaving(true)
    try {
      await updateProfile({ 
        name: profileData.name,
        username: profileData.username,
        email: profileData.email,
        phone: profileData.phone,
        bio: profileData.bio,
        website: profileData.website,
        twitter: profileData.twitter,
        linkedin: profileData.linkedin,
        facebook: profileData.facebook,
      })
      toast.success(t('profile.profile_updated'))
      setHasUnsavedChanges(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to update profile'))
    } finally {
      setIsSaving(false)
    }
  }

  // Handle Email Change
  const handleEmailChange = () => {
    const emailError = validateEmail(profileData.email)
    if (emailError) {
      toast.error(emailError)
      return
    }
    
    if (profileData.email === user?.email) {
      toast.error("This is already your current email")
      return
    }
    
    setConfirmDialogs({ ...confirmDialogs, email: true })
  }

  const confirmEmailChange = async () => {
    try {
      await updateProfile({ email: profileData.email })
      toast.success("Email updated successfully! Please verify your new email.")
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to update email'))
      throw error
    }
  }

  // Handle Password Change
  const handlePasswordChange = () => {
    if (!validatePasswordChange()) {
      toast.error("Please fix validation errors")
      return
    }
    
    setConfirmDialogs({ ...confirmDialogs, password: true })
  }

  const confirmPasswordChange = async () => {
    try {
      await changeMyPassword({
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword,
      })
      toast.success("Password changed successfully!")
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
      setPasswordErrors({})
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to change password'))
      throw error
    }
  }

  const handleAccountSettingsSave = async () => {
    setIsSavingSettings(true)
    try {
      await updateMyUserSettings({ account_preferences: accountSettings })
      toast.success("Account settings saved!")
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to save account settings"))
    } finally {
      setIsSavingSettings(false)
    }
  }

  // Handle Notification Settings
  const handleNotificationSave = async () => {
    setIsSavingSettings(true)
    try {
      await updateMyUserSettings({ notification_preferences: notifications })
      toast.success("Notification preferences saved!")
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to save notification preferences"))
    } finally {
      setIsSavingSettings(false)
    }
  }

  // Handle Privacy Settings
  const handlePrivacySave = async () => {
    setIsSavingSettings(true)
    try {
      await updateMyUserSettings({ privacy_preferences: privacy })
      toast.success("Privacy settings saved!")
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to save privacy settings"))
    } finally {
      setIsSavingSettings(false)
    }
  }

  // Handle Account Deactivation
  const handleDeactivate = async (password?: string) => {
    if (!password) {
      toast.error("Password is required")
      return
    }
    try {
      await deactivateMyAccount(password)
      toast.success("Account deactivated. Please login again to reactivate.")
      logout()
      window.location.href = '/login'
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to deactivate account"))
      throw error
    }
  }

  // Handle Account Deletion
  const handleDelete = async (password?: string) => {
    if (!password) {
      toast.error("Password is required")
      return
    }
    try {
      await deleteMyAccount(password)
      toast.success("Your account has been deleted.")
      logout()
      window.location.href = '/login'
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to delete account"))
      throw error
    }
  }

  // Handle Avatar Upload
  const handleAvatarUpload = () => {
    avatarInputRef.current?.click()
  }

  const handleAvatarFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploadingAvatar(true)
    try {
      const uploaded = await uploadFiles([file])
      const avatarUrl = uploaded?.[0]?.url
      if (!avatarUrl) throw new Error('Upload failed')
      await updateProfile({ avatar: avatarUrl })
      toast.success("Avatar updated successfully")
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to upload avatar"))
    } finally {
      event.target.value = ''
      setIsUploadingAvatar(false)
    }
  }

  const handleRemoveAvatar = async () => {
    try {
      await updateProfile({ avatar: '' })
      toast.success("Avatar removed")
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to remove avatar"))
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t('account_settings.title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('account_settings.manage_settings')}
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              {t('account_settings.profile_information')}
            </CardTitle>
            <CardDescription>
              {t('account_settings.profile_info_desc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={user?.avatar} />
                <AvatarFallback className="text-2xl">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAvatarUpload} disabled={isUploadingAvatar}>
                    {isUploadingAvatar ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Camera className="h-4 w-4 mr-2" />}
                    {t('account_settings.upload_photo')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleRemoveAvatar} disabled={isUploadingAvatar}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('account_settings.remove_photo')}
                  </Button>
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarFileChange}
                />
                <p className="text-sm text-muted-foreground">
                  {t('account_settings.photo_hint')}
                </p>
              </div>
            </div>

            <Separator />

            {/* Name & Username */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">
                  {t('account_settings.full_name')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={profileData.name}
                  onChange={(e) => {
                    setProfileData({ ...profileData, name: e.target.value })
                    setHasUnsavedChanges(true)
                  }}
                  className={profileErrors.name ? 'border-destructive' : ''}
                />
                {profileErrors.name && (
                  <p className="text-sm text-destructive mt-1">{profileErrors.name}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="username">
                  {t('account_settings.username')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="username"
                  value={profileData.username}
                  onChange={(e) => {
                    setProfileData({ ...profileData, username: e.target.value })
                    setHasUnsavedChanges(true)
                  }}
                  className={profileErrors.username ? 'border-destructive' : ''}
                />
                {profileErrors.username && (
                  <p className="text-sm text-destructive mt-1">{profileErrors.username}</p>
                )}
              </div>
            </div>

            {/* Bio */}
            <div>
              <Label htmlFor="bio">{t('account_settings.bio')}</Label>
              <Textarea
                id="bio"
                value={profileData.bio}
                onChange={(e) => {
                  setProfileData({ ...profileData, bio: e.target.value })
                  setHasUnsavedChanges(true)
                }}
                placeholder="Tell us about yourself..."
                rows={4}
                className={profileErrors.bio ? 'border-destructive' : ''}
              />
              <div className="flex justify-between mt-1">
                {profileErrors.bio && (
                  <p className="text-sm text-destructive">{profileErrors.bio}</p>
                )}
                <p className="text-sm text-muted-foreground ml-auto">
                  {profileData.bio.length}/500
                </p>
              </div>
            </div>

            {/* Contact Info */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">{t('account_settings.phone')}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => {
                    setProfileData({ ...profileData, phone: e.target.value })
                    setHasUnsavedChanges(true)
                  }}
                  placeholder="+84 123 456 789"
                />
              </div>
              
              <div>
                <Label htmlFor="website">{t('account_settings.website')}</Label>
                <Input
                  id="website"
                  type="url"
                  value={profileData.website}
                  onChange={(e) => {
                    setProfileData({ ...profileData, website: e.target.value })
                    setHasUnsavedChanges(true)
                  }}
                  placeholder="https://yourwebsite.com"
                />
              </div>
            </div>

            {/* Social Links */}
            <div>
              <Label className="mb-3 block">{t('account_settings.social_links')}</Label>
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  placeholder="Twitter Username"
                  value={profileData.twitter}
                  onChange={(e) => {
                    setProfileData({ ...profileData, twitter: e.target.value })
                    setHasUnsavedChanges(true)
                  }}
                />
                <Input
                  placeholder="LinkedIn URL"
                  value={profileData.linkedin}
                  onChange={(e) => {
                    setProfileData({ ...profileData, linkedin: e.target.value })
                    setHasUnsavedChanges(true)
                  }}
                />
                <Input
                  placeholder="Facebook URL"
                  value={profileData.facebook}
                  onChange={(e) => {
                    setProfileData({ ...profileData, facebook: e.target.value })
                    setHasUnsavedChanges(true)
                  }}
                />
              </div>
            </div>

            {hasUnsavedChanges && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {t('account_settings.unsaved_changes')}
                </AlertDescription>
              </Alert>
            )}

            <Button onClick={handleProfileUpdate} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
              {isSaving ? 'Saving...' : t('account_settings.save_changes')}
            </Button>
          </CardContent>
        </Card>

        {/* Account Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {t('account_settings.account_security')}
            </CardTitle>
            <CardDescription>
              {t('account_settings.account_security_desc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Email Section */}
            <div>
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {t('account_settings.email_address')} <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2 mt-2">
                <div className="flex-1">
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    className={profileErrors.email ? 'border-destructive' : ''}
                  />
                  {profileErrors.email && (
                    <p className="text-sm text-destructive mt-1">{profileErrors.email}</p>
                  )}
                </div>
                <Button 
                  onClick={handleEmailChange}
                  disabled={profileData.email === user?.email}
                >
                  {t('account_settings.update_email')}
                </Button>
              </div>
              {user?.email && (
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    {t('account_settings.verified')}
                  </Badge>
                </div>
              )}
            </div>

            <Separator />

            {/* Password Section */}
            <div className="space-y-4">
              <Label className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                {t('account_settings.change_password')}
              </Label>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="currentPassword">{t('account_settings.current_password')}</Label>
                  <Input
                    id="currentPassword"
                    type={showPassword ? "text" : "password"}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className={`mt-1 ${passwordErrors.currentPassword ? 'border-destructive' : ''}`}
                  />
                  {passwordErrors.currentPassword && (
                    <p className="text-sm text-destructive mt-1">{passwordErrors.currentPassword}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="newPassword">{t('account_settings.new_password')}</Label>
                  <div className="relative mt-1">
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className={passwordErrors.newPassword ? 'border-destructive' : ''}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {passwordErrors.newPassword && (
                    <p className="text-sm text-destructive mt-1">{passwordErrors.newPassword}</p>
                  )}
                  
                  {/* Password Strength Indicator */}
                  {passwordData.newPassword && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        {passwordData.newPassword.length >= 8 ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <X className="h-3 w-3 text-muted-foreground" />
                        )}
                        <span>{t('account_settings.at_least_8_chars')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {/[A-Z]/.test(passwordData.newPassword) ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <X className="h-3 w-3 text-muted-foreground" />
                        )}
                        <span>{t('account_settings.one_uppercase')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {/[a-z]/.test(passwordData.newPassword) ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <X className="h-3 w-3 text-muted-foreground" />
                        )}
                        <span>{t('account_settings.one_lowercase')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {/[0-9]/.test(passwordData.newPassword) ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <X className="h-3 w-3 text-muted-foreground" />
                        )}
                        <span>{t('account_settings.one_number')}</span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="confirmPassword">{t('account_settings.confirm_password')}</Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className={`mt-1 ${passwordErrors.confirmPassword ? 'border-destructive' : ''}`}
                  />
                  {passwordErrors.confirmPassword && (
                    <p className="text-sm text-destructive mt-1">{passwordErrors.confirmPassword}</p>
                  )}
                </div>
                
                <Button onClick={handlePasswordChange}>
                  <Lock className="h-4 w-4 mr-2" />
                  {t('account_settings.change_password')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              {t('account_settings.account_prefs')}
            </CardTitle>
            <CardDescription>
              {t('account_settings.account_prefs_desc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="language">{t('account_settings.language_label')}</Label>
                <Select 
                  value={accountSettings.language} 
                  onValueChange={(value) => setAccountSettings({ ...accountSettings, language: value })}
                >
                  <SelectTrigger id="language" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="vi">Tiếng Việt</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                    <SelectItem value="ja">日本語</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="timezone">{t('account_settings.timezone')}</Label>
                <Select 
                  value={accountSettings.timezone} 
                  onValueChange={(value) => setAccountSettings({ ...accountSettings, timezone: value })}
                >
                  <SelectTrigger id="timezone" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC+7">UTC+7 (Ho Chi Minh)</SelectItem>
                    <SelectItem value="UTC">UTC (London)</SelectItem>
                    <SelectItem value="UTC-5">UTC-5 (New York)</SelectItem>
                    <SelectItem value="UTC-8">UTC-8 (Los Angeles)</SelectItem>
                    <SelectItem value="UTC+1">UTC+1 (Paris)</SelectItem>
                    <SelectItem value="UTC+9">UTC+9 (Tokyo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="currency">{t('account_settings.currency')}</Label>
              <Select 
                value={accountSettings.currency} 
                onValueChange={(value) => setAccountSettings({ ...accountSettings, currency: value })}
              >
                <SelectTrigger id="currency" className="mt-1 max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VND">VND (₫)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="JPY">JPY (¥)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleAccountSettingsSave} disabled={isSavingSettings}>
              {isSavingSettings && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Settings
            </Button>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Preferences
            </CardTitle>
            <CardDescription>
              Choose what notifications you want to receive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive notifications via email</p>
              </div>
              <Switch
                checked={notifications.emailNotifications}
                onCheckedChange={(checked) => 
                  setNotifications({ ...notifications, emailNotifications: checked })
                }
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Course Updates</Label>
                <p className="text-sm text-muted-foreground">Updates about courses you're enrolled in</p>
              </div>
              <Switch
                checked={notifications.courseUpdates}
                onCheckedChange={(checked) => 
                  setNotifications({ ...notifications, courseUpdates: checked })
                }
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Instructor Messages</Label>
                <p className="text-sm text-muted-foreground">Direct messages from instructors</p>
              </div>
              <Switch
                checked={notifications.instructorMessages}
                onCheckedChange={(checked) => 
                  setNotifications({ ...notifications, instructorMessages: checked })
                }
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Weekly Digest</Label>
                <p className="text-sm text-muted-foreground">Weekly summary of your learning progress</p>
              </div>
              <Switch
                checked={notifications.weeklyDigest}
                onCheckedChange={(checked) => 
                  setNotifications({ ...notifications, weeklyDigest: checked })
                }
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Promotions & Offers</Label>
                <p className="text-sm text-muted-foreground">Special deals and promotional offers</p>
              </div>
              <Switch
                checked={notifications.promotions}
                onCheckedChange={(checked) => 
                  setNotifications({ ...notifications, promotions: checked })
                }
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Course Recommendations</Label>
                <p className="text-sm text-muted-foreground">Personalized course suggestions</p>
              </div>
              <Switch
                checked={notifications.courseRecommendations}
                onCheckedChange={(checked) => 
                  setNotifications({ ...notifications, courseRecommendations: checked })
                }
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <Label>New Features</Label>
                <p className="text-sm text-muted-foreground">Updates about new platform features</p>
              </div>
              <Switch
                checked={notifications.newFeatures}
                onCheckedChange={(checked) => 
                  setNotifications({ ...notifications, newFeatures: checked })
                }
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Platform Announcements</Label>
                <p className="text-sm text-muted-foreground">Important platform announcements</p>
              </div>
              <Switch
                checked={notifications.announcements}
                onCheckedChange={(checked) => 
                  setNotifications({ ...notifications, announcements: checked })
                }
              />
            </div>
            
            <div className="pt-4">
              <Button onClick={handleNotificationSave} disabled={isSavingSettings}>
                {isSavingSettings && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Bell className="h-4 w-4 mr-2" />
                Save Preferences
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Privacy Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Privacy Settings
            </CardTitle>
            <CardDescription>
              Control who can see your information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Public Profile</Label>
                <p className="text-sm text-muted-foreground">Allow others to view your profile</p>
              </div>
              <Switch
                checked={privacy.profilePublic}
                onCheckedChange={(checked) => 
                  setPrivacy({ ...privacy, profilePublic: checked })
                }
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Show Learning Progress</Label>
                <p className="text-sm text-muted-foreground">Display your course progress publicly</p>
              </div>
              <Switch
                checked={privacy.showProgress}
                onCheckedChange={(checked) => 
                  setPrivacy({ ...privacy, showProgress: checked })
                }
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Show Certificates</Label>
                <p className="text-sm text-muted-foreground">Display earned certificates on profile</p>
              </div>
              <Switch
                checked={privacy.showCertificates}
                onCheckedChange={(checked) => 
                  setPrivacy({ ...privacy, showCertificates: checked })
                }
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Show Enrolled Courses</Label>
                <p className="text-sm text-muted-foreground">Display courses you're enrolled in</p>
              </div>
              <Switch
                checked={privacy.showCourses}
                onCheckedChange={(checked) => 
                  setPrivacy({ ...privacy, showCourses: checked })
                }
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Allow Direct Messages</Label>
                <p className="text-sm text-muted-foreground">Let other users send you messages</p>
              </div>
              <Switch
                checked={privacy.allowMessages}
                onCheckedChange={(checked) => 
                  setPrivacy({ ...privacy, allowMessages: checked })
                }
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Show Online Status</Label>
                <p className="text-sm text-muted-foreground">Display when you're online</p>
              </div>
              <Switch
                checked={privacy.showOnlineStatus}
                onCheckedChange={(checked) => 
                  setPrivacy({ ...privacy, showOnlineStatus: checked })
                }
              />
            </div>
            
            <div className="pt-4">
              <Button onClick={handlePrivacySave} disabled={isSavingSettings}>
                {isSavingSettings && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Shield className="h-4 w-4 mr-2" />
                Save Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Irreversible and destructive actions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium mb-1">Deactivate Account</h4>
                <p className="text-sm text-muted-foreground">
                  Temporarily disable your account. You can reactivate anytime by logging back in.
                </p>
              </div>
              <Button 
                variant="outline"
                onClick={() => setConfirmDialogs({ ...confirmDialogs, deactivate: true })}
              >
                Deactivate
              </Button>
            </div>

            <div className="flex items-start justify-between p-4 border border-destructive rounded-lg">
              <div>
                <h4 className="font-medium mb-1 text-destructive">Delete Account</h4>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
              </div>
              <Button 
                variant="destructive"
                onClick={() => setConfirmDialogs({ ...confirmDialogs, delete: true })}
              >
                Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirm Dialogs */}
      <ConfirmDialog
        open={confirmDialogs.email}
        onOpenChange={(open) => setConfirmDialogs({ ...confirmDialogs, email: open })}
        title="Change Email Address"
        description="Are you sure you want to change your email address? You will need to verify your new email."
        confirmText="Change Email"
        onConfirm={confirmEmailChange}
      />

      <ConfirmDialog
        open={confirmDialogs.password}
        onOpenChange={(open) => setConfirmDialogs({ ...confirmDialogs, password: open })}
        title="Change Password"
        description="Are you sure you want to change your password? You will be logged out on all devices."
        confirmText="Change Password"
        onConfirm={confirmPasswordChange}
      />

      <ConfirmDialog
        open={confirmDialogs.deactivate}
        onOpenChange={(open) => setConfirmDialogs({ ...confirmDialogs, deactivate: open })}
        title="Deactivate Account"
        description="Your account will be temporarily disabled. You can reactivate it anytime by logging back in."
        confirmText="Deactivate Account"
        onConfirm={handleDeactivate}
        variant="destructive"
        requirePassword={true}
      />

      <ConfirmDialog
        open={confirmDialogs.delete}
        onOpenChange={(open) => setConfirmDialogs({ ...confirmDialogs, delete: open })}
        title="Delete Account Permanently"
        description="This will permanently delete your account and all associated data including courses, progress, and certificates. This action cannot be undone. Are you absolutely sure?"
        confirmText="Delete My Account"
        onConfirm={handleDelete}
        variant="destructive"
        requirePassword={true}
      />
    </div>
  )
}
