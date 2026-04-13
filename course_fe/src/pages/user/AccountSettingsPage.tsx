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
import { motion, type Variants } from "motion/react"

const sectionStagger: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
}

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.34,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
}


const validateEmail = (email: string): string | null => {
  if (!email) return "account_settings.validation.email_required"
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) return "account_settings.validation.invalid_email"
  return null
}

const validatePassword = (password: string): string | null => {
  if (!password) return "account_settings.validation.password_required"
  if (password.length < 8) return "account_settings.validation.password_min"
  if (!/[A-Z]/.test(password)) return "account_settings.validation.password_uppercase"
  if (!/[a-z]/.test(password)) return "account_settings.validation.password_lowercase"
  if (!/[0-9]/.test(password)) return "account_settings.validation.password_number"
  return null
}

const validateUsername = (username: string): string | null => {
  if (!username) return "account_settings.validation.username_required"
  if (username.length < 3) return "account_settings.validation.username_min"
  if (username.length > 30) return "account_settings.validation.username_max"
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) return "account_settings.validation.username_format"
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
  const { t } = useTranslation()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    if (requirePassword && !password) {
      toast.error(t('account_settings.password_required'))
      return
    }

    setLoading(true)
    try {
      await onConfirm(requirePassword ? password : undefined)
      setPassword('')
      onOpenChange(false)
    } catch {

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
            <Label htmlFor="confirm-password">{t('account_settings.confirm_password_prompt')}</Label>
            <Input
              id="confirm-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('account_settings.confirm_password_placeholder')}
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
            {t('common.cancel')}
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
  const languageOptions = [
    { value: 'en', label: t('account_settings.languages.en') },
    { value: 'vi', label: t('account_settings.languages.vi') },
    { value: 'es', label: t('account_settings.languages.es') },
    { value: 'fr', label: t('account_settings.languages.fr') },
    { value: 'de', label: t('account_settings.languages.de') },
    { value: 'ja', label: t('account_settings.languages.ja') },
  ]
  const timezoneOptions = [
    { value: 'UTC+7', label: t('account_settings.timezones.utc_plus_7') },
    { value: 'UTC', label: t('account_settings.timezones.utc') },
    { value: 'UTC-5', label: t('account_settings.timezones.utc_minus_5') },
    { value: 'UTC-8', label: t('account_settings.timezones.utc_minus_8') },
    { value: 'UTC+1', label: t('account_settings.timezones.utc_plus_1') },
    { value: 'UTC+9', label: t('account_settings.timezones.utc_plus_9') },
  ]
  const currencyOptions = [
    { value: 'VND', label: t('account_settings.currencies.vnd') },
    { value: 'USD', label: t('account_settings.currencies.usd') },
    { value: 'EUR', label: t('account_settings.currencies.eur') },
    { value: 'GBP', label: t('account_settings.currencies.gbp') },
    { value: 'JPY', label: t('account_settings.currencies.jpy') },
  ]


  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    username: user?.username || user?.email?.split('@')[0] || '',
    email: user?.email || '',
    bio: user?.bio || '',
    phone: user?.phone || '',
    website: user?.website || '',
    twitter: user?.twitter || '',
    linkedin: user?.linkedin || '',
    facebook: user?.facebook || '',
  })

  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({})


  const [showPassword, setShowPassword] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({})


  const [accountSettings, setAccountSettings] = useState({
    language: 'en',
    timezone: 'UTC+7',
    currency: 'VND'
  })


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


  const [privacy, setPrivacy] = useState({
    profilePublic: true,
    showProgress: true,
    showCertificates: true,
    showCourses: true,
    allowMessages: true,
    showOnlineStatus: true
  })


  const [confirmDialogs, setConfirmDialogs] = useState({
    email: false,
    password: false,
    deactivate: false,
    delete: false
  })

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)


  const validateProfile = (): boolean => {
    const errors: Record<string, string> = {}

    const emailError = validateEmail(profileData.email)
    if (emailError) errors.email = t(emailError)

    const usernameError = validateUsername(profileData.username)
    if (usernameError) errors.username = t(usernameError)

    if (!profileData.name || profileData.name.length < 2) {
      errors.name = t('account_settings.validation.name_min')
    }

    if (profileData.bio && profileData.bio.length > 500) {
      errors.bio = t('account_settings.validation.bio_max')
    }

    setProfileErrors(errors)
    return Object.keys(errors).length === 0
  }


  const validatePasswordChange = (): boolean => {
    const errors: Record<string, string> = {}

    if (!passwordData.currentPassword) {
      errors.currentPassword = t('account_settings.validation.current_password_required')
    }

    const newPasswordError = validatePassword(passwordData.newPassword)
    if (newPasswordError) errors.newPassword = t(newPasswordError)

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = t('account_settings.validation.password_mismatch')
    }

    if (passwordData.newPassword === passwordData.currentPassword) {
      errors.newPassword = t('account_settings.validation.password_same_as_current')
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
        toast.error(getApiErrorMessage(error, t('account_settings.load_failed')))
      })
    return () => { cancelled = true }
  }, [])


  const handleProfileUpdate = async () => {
    if (!validateProfile()) {
      toast.error(t('account_settings.fix_validation_errors'))
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
      toast.error(getApiErrorMessage(error, t('account_settings.update_profile_failed')))
    } finally {
      setIsSaving(false)
    }
  }


  const handleEmailChange = () => {
    const emailError = validateEmail(profileData.email)
    if (emailError) {
      toast.error(t(emailError))
      return
    }

    if (profileData.email === user?.email) {
      toast.error(t('account_settings.email_already_current'))
      return
    }

    setConfirmDialogs({ ...confirmDialogs, email: true })
  }

  const confirmEmailChange = async () => {
    try {
      await updateProfile({ email: profileData.email })
      toast.success(t('account_settings.email_updated'))
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('account_settings.update_email_failed')))
      throw error
    }
  }


  const handlePasswordChange = () => {
    if (!validatePasswordChange()) {
      toast.error(t('account_settings.fix_validation_errors'))
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
      toast.success(t('account_settings.password_changed'))
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
      setPasswordErrors({})
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('account_settings.change_password_failed')))
      throw error
    }
  }

  const handleAccountSettingsSave = async () => {
    setIsSavingSettings(true)
    try {
      await updateMyUserSettings({ account_preferences: accountSettings })
      toast.success(t('account_settings.account_settings_saved'))
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('account_settings.save_account_settings_failed')))
    } finally {
      setIsSavingSettings(false)
    }
  }


  const handleNotificationSave = async () => {
    setIsSavingSettings(true)
    try {
      await updateMyUserSettings({ notification_preferences: notifications })
      toast.success(t('account_settings.notification_preferences_saved'))
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('account_settings.save_notification_preferences_failed')))
    } finally {
      setIsSavingSettings(false)
    }
  }


  const handlePrivacySave = async () => {
    setIsSavingSettings(true)
    try {
      await updateMyUserSettings({ privacy_preferences: privacy })
      toast.success(t('account_settings.privacy_settings_saved'))
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('account_settings.save_privacy_settings_failed')))
    } finally {
      setIsSavingSettings(false)
    }
  }


  const handleDeactivate = async (password?: string) => {
    if (!password) {
      toast.error(t('account_settings.password_required'))
      return
    }
    try {
      await deactivateMyAccount(password)
      toast.success(t('account_settings.account_deactivated'))
      logout()
      window.location.href = '/login'
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('account_settings.deactivate_account_failed')))
      throw error
    }
  }


  const handleDelete = async (password?: string) => {
    if (!password) {
      toast.error(t('account_settings.password_required'))
      return
    }
    try {
      await deleteMyAccount(password)
      toast.success(t('account_settings.account_deleted'))
      logout()
      window.location.href = '/login'
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('account_settings.delete_account_failed')))
      throw error
    }
  }


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
      if (!avatarUrl) throw new Error(t('account_settings.upload_failed'))
      await updateProfile({ avatar: avatarUrl })
      toast.success(t('account_settings.avatar_updated'))
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('account_settings.upload_avatar_failed')))
    } finally {
      event.target.value = ''
      setIsUploadingAvatar(false)
    }
  }

  const handleRemoveAvatar = async () => {
    try {
      await updateProfile({ avatar: '' })
      toast.success(t('account_settings.avatar_removed'))
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('account_settings.remove_avatar_failed')))
    }
  }

  return (
    <motion.div
      className="mx-auto max-w-4xl px-4 py-6 sm:p-8"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div className="mb-8" variants={fadeInUp} initial="hidden" animate="show">
        <h1 className="text-2xl font-bold sm:text-3xl">{t('account_settings.title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('account_settings.manage_settings')}
        </p>
      </motion.div>

      <motion.div className="space-y-6" variants={sectionStagger} initial="hidden" animate="show">

        <motion.div variants={fadeInUp}>
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

            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={user?.avatar} />
                <AvatarFallback className="text-2xl">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button size="sm" onClick={handleAvatarUpload} disabled={isUploadingAvatar} className="w-full sm:w-auto">
                    {isUploadingAvatar ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Camera className="h-4 w-4 mr-2" />}
                    {t('account_settings.upload_photo')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleRemoveAvatar} disabled={isUploadingAvatar} className="w-full sm:w-auto">
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
                  placeholder={t('account_settings.placeholders.username')}
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


            <div>
              <Label htmlFor="bio">{t('account_settings.bio')}</Label>
              <Textarea
                id="bio"
                value={profileData.bio}
                onChange={(e) => {
                  setProfileData({ ...profileData, bio: e.target.value })
                  setHasUnsavedChanges(true)
                }}
                placeholder={t('account_settings.placeholders.bio')}
                rows={4}
                className={profileErrors.bio ? 'border-destructive' : ''}
              />
              <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                {profileErrors.bio && (
                  <p className="text-sm text-destructive">{profileErrors.bio}</p>
                )}
                <p className="text-sm text-muted-foreground ml-auto">
                  {profileData.bio.length}/500
                </p>
              </div>
            </div>


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
                  placeholder={t('account_settings.placeholders.phone')}
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
                  placeholder={t('account_settings.placeholders.website')}
                />
              </div>
            </div>


            <div>
              <Label className="mb-3 block">{t('account_settings.social_links')}</Label>
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  placeholder={t('account_settings.placeholders.twitter')}
                  value={profileData.twitter}
                  onChange={(e) => {
                    setProfileData({ ...profileData, twitter: e.target.value })
                    setHasUnsavedChanges(true)
                  }}
                />
                <Input
                  placeholder={t('account_settings.placeholders.linkedin')}
                  value={profileData.linkedin}
                  onChange={(e) => {
                    setProfileData({ ...profileData, linkedin: e.target.value })
                    setHasUnsavedChanges(true)
                  }}
                />
                <Input
                  placeholder={t('account_settings.placeholders.facebook')}
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
              {isSaving ? t('account_settings.saving') : t('account_settings.save_changes')}
            </Button>
          </CardContent>
        </Card>
        </motion.div>


        <motion.div variants={fadeInUp}>
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

            <div>
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {t('account_settings.email_address')} <span className="text-destructive">*</span>
              </Label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
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
                  className="w-full sm:w-auto"
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
        </motion.div>


        <motion.div variants={fadeInUp}>
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
                    {languageOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
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
                    {timezoneOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
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
                <SelectTrigger id="currency" className="mt-1 w-full sm:max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencyOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleAccountSettingsSave} disabled={isSavingSettings}>
              {isSavingSettings && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('account_settings.save_settings')}
            </Button>
          </CardContent>
        </Card>
        </motion.div>


        <motion.div variants={fadeInUp}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              {t('account_settings.notification_preferences_title')}
            </CardTitle>
            <CardDescription>
              {t('account_settings.notification_preferences_desc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Label>{t('account_settings.email_notifications')}</Label>
                <p className="text-sm text-muted-foreground">{t('account_settings.notification_preferences.email_notifications_desc')}</p>
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
                <Label>{t('account_settings.course_updates')}</Label>
                <p className="text-sm text-muted-foreground">{t('account_settings.notification_preferences.course_updates_desc')}</p>
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
                <Label>{t('account_settings.instructor_messages')}</Label>
                <p className="text-sm text-muted-foreground">{t('account_settings.notification_preferences.instructor_messages_desc')}</p>
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
                <Label>{t('account_settings.weekly_digest')}</Label>
                <p className="text-sm text-muted-foreground">{t('account_settings.notification_preferences.weekly_digest_desc')}</p>
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
                <Label>{t('account_settings.promotions_offers')}</Label>
                <p className="text-sm text-muted-foreground">{t('account_settings.notification_preferences.promotions_desc')}</p>
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
                <Label>{t('account_settings.course_recommendations')}</Label>
                <p className="text-sm text-muted-foreground">{t('account_settings.notification_preferences.course_recommendations_desc')}</p>
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
                <Label>{t('account_settings.new_features')}</Label>
                <p className="text-sm text-muted-foreground">{t('account_settings.notification_preferences.new_features_desc')}</p>
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
                <Label>{t('account_settings.announcements')}</Label>
                <p className="text-sm text-muted-foreground">{t('account_settings.notification_preferences.announcements_desc')}</p>
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
                {t('account_settings.save_preferences')}
              </Button>
            </div>
          </CardContent>
        </Card>
        </motion.div>


        <motion.div variants={fadeInUp}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              {t('account_settings.privacy_settings')}
            </CardTitle>
            <CardDescription>
              {t('account_settings.privacy_desc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>{t('account_settings.profile_public')}</Label>
                <p className="text-sm text-muted-foreground">{t('account_settings.privacy_preferences.profile_public_desc')}</p>
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
                <Label>{t('account_settings.show_progress')}</Label>
                <p className="text-sm text-muted-foreground">{t('account_settings.privacy_preferences.show_progress_desc')}</p>
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
                <Label>{t('account_settings.show_certificates')}</Label>
                <p className="text-sm text-muted-foreground">{t('account_settings.privacy_preferences.show_certificates_desc')}</p>
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
                <Label>{t('account_settings.show_courses')}</Label>
                <p className="text-sm text-muted-foreground">{t('account_settings.privacy_preferences.show_courses_desc')}</p>
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
                <Label>{t('account_settings.allow_messages')}</Label>
                <p className="text-sm text-muted-foreground">{t('account_settings.privacy_preferences.allow_messages_desc')}</p>
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
                <Label>{t('account_settings.show_online_status')}</Label>
                <p className="text-sm text-muted-foreground">{t('account_settings.privacy_preferences.show_online_status_desc')}</p>
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
                {t('account_settings.save_settings')}
              </Button>
            </div>
          </CardContent>
        </Card>
        </motion.div>


        <motion.div variants={fadeInUp}>
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {t('account_settings.danger_zone')}
            </CardTitle>
            <CardDescription>
              {t('account_settings.danger_zone_desc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h4 className="font-medium mb-1">{t('account_settings.deactivate_account')}</h4>
                <p className="text-sm text-muted-foreground">
                  {t('account_settings.deactivate_account_desc')}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setConfirmDialogs({ ...confirmDialogs, deactivate: true })}
                className="w-full sm:w-auto"
              >
                {t('account_settings.deactivate')}
              </Button>
            </div>

            <div className="flex flex-col gap-3 rounded-lg border border-destructive p-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h4 className="font-medium mb-1 text-destructive">{t('account_settings.delete_account')}</h4>
                <p className="text-sm text-muted-foreground">
                  {t('account_settings.delete_account_desc')}
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => setConfirmDialogs({ ...confirmDialogs, delete: true })}
                className="w-full sm:w-auto"
              >
                {t('account_settings.delete_account')}
              </Button>
            </div>
          </CardContent>
        </Card>
        </motion.div>
      </motion.div>


      <ConfirmDialog
        open={confirmDialogs.email}
        onOpenChange={(open) => setConfirmDialogs({ ...confirmDialogs, email: open })}
        title={t('account_settings.dialogs.change_email.title')}
        description={t('account_settings.dialogs.change_email.description')}
        confirmText={t('account_settings.dialogs.change_email.confirm')}
        onConfirm={confirmEmailChange}
      />

      <ConfirmDialog
        open={confirmDialogs.password}
        onOpenChange={(open) => setConfirmDialogs({ ...confirmDialogs, password: open })}
        title={t('account_settings.dialogs.change_password.title')}
        description={t('account_settings.dialogs.change_password.description')}
        confirmText={t('account_settings.dialogs.change_password.confirm')}
        onConfirm={confirmPasswordChange}
      />

      <ConfirmDialog
        open={confirmDialogs.deactivate}
        onOpenChange={(open) => setConfirmDialogs({ ...confirmDialogs, deactivate: open })}
        title={t('account_settings.dialogs.deactivate.title')}
        description={t('account_settings.dialogs.deactivate.description')}
        confirmText={t('account_settings.dialogs.deactivate.confirm')}
        onConfirm={handleDeactivate}
        variant="destructive"
        requirePassword={true}
      />

      <ConfirmDialog
        open={confirmDialogs.delete}
        onOpenChange={(open) => setConfirmDialogs({ ...confirmDialogs, delete: open })}
        title={t('account_settings.dialogs.delete.title')}
        description={t('account_settings.dialogs.delete.description')}
        confirmText={t('account_settings.dialogs.delete.confirm')}
        onConfirm={handleDelete}
        variant="destructive"
        requirePassword={true}
      />
    </motion.div>
  )
}
