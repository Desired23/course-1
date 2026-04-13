import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { adminUpdateUser, deleteUser as deleteUserApi, getUsers } from '../../services/admin.api'
import type { UserItem } from '../../services/admin.api'

import { FilterComponents } from "../../components/FilterComponents"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Badge } from "../../components/ui/badge"
import { Skeleton } from '../../components/ui/skeleton'
import { UserPagination } from '../../components/UserPagination'
import { AdminBulkActionBar } from '../../components/admin/AdminBulkActionBar'
import { AdminConfirmDialog } from '../../components/admin/AdminConfirmDialog'
import { Checkbox } from "../../components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "../../components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "../../components/ui/dropdown-menu"
import { useRouter } from "../../components/Router"
import {
  Search,
  Plus,
  MoreVertical,
  UserCheck,
  UserX,
  Edit,
  Trash2,
  Mail,
  Shield,
  Users,
  Loader2
} from "lucide-react"
import { motion } from 'motion/react'
import { cn } from "../../components/ui/utils"

const PAGE_SIZE = 12

const sectionStagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
}

const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1],
    },
  },
}

interface User {
  id: string
  name: string
  email: string
  roles: ('user' | 'instructor' | 'admin')[]
  status: 'active' | 'banned' | 'pending'
  enrollments: number
  coursesCreated?: number
  joinDate: string
  lastActive: string
}

interface UserCounts {
  total: number
  active: number
  banned: number
  instructors: number
  admins: number
}

function mapRoleToApi(role: string): 'student' | 'instructor' | 'admin' | undefined {
  if (role === 'all') return undefined
  if (role === 'user') return 'student'
  if (role === 'instructor') return 'instructor'
  if (role === 'admin') return 'admin'
  return undefined
}

function mapStatusToApi(status: string): 'active' | 'inactive' | 'banned' | undefined {
  if (status === 'all') return undefined
  if (status === 'pending') return 'inactive'
  if (status === 'active' || status === 'banned') return status
  return undefined
}

function mapApiUser(u: UserItem): User {
  const roles: ('user' | 'instructor' | 'admin')[] = []
  const ut = (u.user_type || '').toLowerCase()
  if (ut === 'admin') roles.push('admin')
  else if (ut === 'instructor') roles.push('instructor')
  else roles.push('user')

  return {
    id: String(u.id),
    name: u.full_name || u.username,
    email: u.email,
    roles,
    status: (u.status === 'banned' ? 'banned' : u.status === 'inactive' ? 'pending' : 'active') as 'active' | 'banned' | 'pending',
    enrollments: 0,
    coursesCreated: undefined,
    joinDate: u.created_at ? new Date(u.created_at).toLocaleDateString() : '',
    lastActive: u.last_login ? new Date(u.last_login).toLocaleDateString() : ''
  }
}

export function AdminUsersPage() {
  const { navigate } = useRouter()
  const { t } = useTranslation()

  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [selectedRole, setSelectedRole] = useState<string>("all")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [confirmState, setConfirmState] = useState<{
    open: boolean
    title: string
    description: string
    confirmLabel: string
    destructive: boolean
    loading: boolean
    action: null | (() => Promise<void>)
  }>({
    open: false,
    title: '',
    description: '',
    confirmLabel: '',
    destructive: false,
    loading: false,
    action: null,
  })
  const [counts, setCounts] = useState<UserCounts>({
    total: 0,
    active: 0,
    banned: 0,
    instructors: 0,
    admins: 0,
  })

  const renderUsersTableSkeleton = () => (
    <div className="space-y-3 p-4">
      {Array.from({ length: PAGE_SIZE }).map((_, index) => (
        <div key={`admin-user-skeleton-${index}`} className="grid grid-cols-9 gap-3 items-center">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-9 w-full col-span-2" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-10" />
        </div>
      ))}
    </div>
  )

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedRole, selectedStatus, debouncedSearch])

  useEffect(() => {
    setSelectedUserIds([])
  }, [currentPage, selectedRole, selectedStatus, debouncedSearch])

  const queryParams = useMemo(() => ({
    page: currentPage,
    page_size: PAGE_SIZE,
    search: debouncedSearch || undefined,
    status: mapStatusToApi(selectedStatus),
    user_type: mapRoleToApi(selectedRole),
  }), [currentPage, debouncedSearch, selectedStatus, selectedRole])

  async function loadCounts() {
    try {
      const [allRes, activeRes, bannedRes, instructorRes, adminRes] = await Promise.all([
        getUsers({ page: 1, page_size: 1 }),
        getUsers({ page: 1, page_size: 1, status: 'active' }),
        getUsers({ page: 1, page_size: 1, status: 'banned' }),
        getUsers({ page: 1, page_size: 1, user_type: 'instructor' }),
        getUsers({ page: 1, page_size: 1, user_type: 'admin' }),
      ])
      setCounts({
        total: allRes.count || 0,
        active: activeRes.count || 0,
        banned: bannedRes.count || 0,
        instructors: instructorRes.count || 0,
        admins: adminRes.count || 0,
      })
    } catch {

    }
  }

  useEffect(() => {
    loadCounts()
  }, [])

  useEffect(() => {
    let cancelled = false
    async function fetchUsers() {
      try {
        setLoading(true)
        const res = await getUsers(queryParams)
        if (cancelled) return
        setUsers((res.results || []).map(mapApiUser))
        setTotalPages(res.total_pages || 1)
        setTotalCount(res.count || 0)
      } catch {
        if (!cancelled) toast.error(t('admin_users.toasts.load_failed'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchUsers()
    return () => { cancelled = true }
  }, [queryParams])

  const getStatusBadge = (status: string) => {
    const config = {
      active: { variant: 'default' as const, className: 'bg-green-500/10 text-green-600 dark:text-green-400' },
      banned: { variant: 'destructive' as const, className: '' },
      pending: { variant: 'secondary' as const, className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' },
    }
    return config[status as keyof typeof config] || config.active
  }

  const getRoleBadges = (roles: string[]) => {
    const config = {
      user: { className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', label: t('admin_users.role_student') },
      instructor: { className: 'bg-purple-500/10 text-purple-600 dark:text-purple-400', label: t('admin_users.role_instructor') },
      admin: { className: 'bg-red-500/10 text-red-600 dark:text-red-400', label: t('admin_users.role_admin') },
    }
    return roles.map((role, index) => {
      const roleConfig = config[role as keyof typeof config]
      return (
        <Badge key={index} variant="secondary" className={cn("text-xs", roleConfig.className)}>
          {roleConfig.label}
        </Badge>
      )
    })
  }

  async function refreshAfterMutation() {
    await loadCounts()
    const res = await getUsers(queryParams)
    setUsers((res.results || []).map(mapApiUser))
    setTotalPages(res.total_pages || 1)
    setTotalCount(res.count || 0)
  }

  const openConfirm = (
    title: string,
    description: string,
    confirmLabel: string,
    action: () => Promise<void>,
    destructive = false
  ) => {
    setConfirmState({
      open: true,
      title,
      description,
      confirmLabel,
      destructive,
      loading: false,
      action,
    })
  }

  const runConfirmedAction = async () => {
    if (!confirmState.action) return
    try {
      setConfirmState(prev => ({ ...prev, loading: true }))
      await confirmState.action()
      setConfirmState({
        open: false,
        title: '',
        description: '',
        confirmLabel: '',
        destructive: false,
        loading: false,
        action: null,
      })
    } catch {
      setConfirmState(prev => ({ ...prev, loading: false }))
    }
  }

  const handleBanUser = async (userId: string) => {
    try {
      await adminUpdateUser(Number(userId), { status: 'banned' })
      toast.success(t('admin_users.toasts.ban_success'))
      await refreshAfterMutation()
    } catch {
      toast.error(t('admin_users.toasts.action_failed'))
    }
  }

  const handleUnbanUser = async (userId: string) => {
    try {
      await adminUpdateUser(Number(userId), { status: 'active' })
      toast.success(t('admin_users.toasts.unban_success'))
      await refreshAfterMutation()
    } catch {
      toast.error(t('admin_users.toasts.action_failed'))
    }
  }

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteUserApi(Number(userId))
      toast.success(t('admin_users.toasts.delete_success'))
      await refreshAfterMutation()
    } catch {
      toast.error(t('admin_users.toasts.action_failed'))
    }
  }

  const toggleUserSelection = (userId: string, checked: boolean) => {
    setSelectedUserIds(prev => checked ? [...prev, userId] : prev.filter(id => id !== userId))
  }

  const toggleAllCurrentPage = (checked: boolean) => {
    setSelectedUserIds(checked ? users.map(user => user.id) : [])
  }

  const bulkUpdateUsers = async (
    ids: string[],
    updater: (userId: string) => Promise<void>,
    successMessage: string
  ) => {
    try {
      for (const id of ids) {
        await updater(id)
      }
      toast.success(successMessage)
      setSelectedUserIds([])
      await refreshAfterMutation()
    } catch {
      toast.error(t('admin_users.toasts.bulk_failed'))
    }
  }

  const startIdx = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const endIdx = Math.min(currentPage * PAGE_SIZE, totalCount)

  return (
    <motion.div className="p-8" variants={sectionStagger} initial="hidden" animate="show">
      <motion.div className="mb-8" variants={fadeInUp}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-medium">{t('admin_users.title')}</h1>
              <p className="text-sm text-muted-foreground">
                {t('admin_users.subtitle')}
              </p>
            </div>
          </div>
          <Button onClick={() => navigate('/admin/users/new')} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('admin_users.create_user')}
          </Button>
        </div>
      </motion.div>

      <motion.div className="mb-6 space-y-4" variants={fadeInUp}>
        <div className="app-surface-elevated flex flex-col md:flex-row gap-4 rounded-lg p-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('admin_users.search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <FilterComponents.Select
            label=""
            value={selectedRole}
            options={[
              { value: 'all', label: t('admin_users.all_roles') },
              { value: 'user', label: t('admin_users.students_role') },
              { value: 'instructor', label: t('admin_users.instructors_role') },
              { value: 'admin', label: t('admin_users.admins_role') }
            ]}
            onChange={setSelectedRole}
            className="w-full md:w-48"
          />
          <FilterComponents.Select
            label=""
            value={selectedStatus}
            options={[
              { value: 'all', label: t('admin_users.all_status') },
              { value: 'active', label: t('admin_users.active') },
              { value: 'banned', label: t('admin_users.banned') },
              { value: 'pending', label: t('admin_users.pending') }
            ]}
            onChange={setSelectedStatus}
            className="w-full md:w-48"
          />
        </div>
      </motion.div>

      <motion.div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6" variants={fadeInUp}>
        <div className="app-interactive p-4 border rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">{t('admin_users.total_users')}</p>
          <p className="text-2xl font-bold">{counts.total}</p>
        </div>
        <div className="app-interactive p-4 border rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">{t('admin_users.active_users')}</p>
          <p className="text-2xl font-bold text-green-600">{counts.active}</p>
        </div>
        <div className="app-interactive p-4 border rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">{t('admin_users.instructors_count')}</p>
          <p className="text-2xl font-bold text-purple-600">{counts.instructors}</p>
        </div>
        <div className="app-interactive p-4 border rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">{t('admin_users.admins_count')}</p>
          <p className="text-2xl font-bold text-red-600">{counts.admins}</p>
        </div>
      </motion.div>

      <motion.div variants={fadeInUp}>
      <AdminBulkActionBar
        count={selectedUserIds.length}
        label={t('admin_users.bulk.selected_label')}
        onClear={() => setSelectedUserIds([])}
        actions={[
          {
            key: 'activate',
            label: t('admin_users.bulk.set_active'),
            onClick: () => openConfirm(
              t('admin_users.bulk.set_active_title'),
              t('admin_users.bulk.set_active_description', { count: selectedUserIds.length }),
              t('admin_users.bulk.set_active'),
              () => bulkUpdateUsers(selectedUserIds, (id) => adminUpdateUser(Number(id), { status: 'active' }), t('admin_users.toasts.bulk_active_success')),
            ),
          },
          {
            key: 'ban',
            label: t('admin_users.ban_user'),
            destructive: true,
            onClick: () => openConfirm(
              t('admin_users.bulk.ban_title'),
              t('admin_users.bulk.ban_description', { count: selectedUserIds.length }),
              t('admin_users.ban_user'),
              () => bulkUpdateUsers(selectedUserIds, (id) => adminUpdateUser(Number(id), { status: 'banned' }), t('admin_users.toasts.bulk_ban_success')),
              true,
            ),
          },
          {
            key: 'delete',
            label: t('admin_users.delete_user'),
            destructive: true,
            onClick: () => openConfirm(
              t('admin_users.bulk.delete_title'),
              t('admin_users.bulk.delete_description', { count: selectedUserIds.length }),
              t('admin_users.delete_user'),
              () => bulkUpdateUsers(selectedUserIds, (id) => deleteUserApi(Number(id)), t('admin_users.toasts.bulk_delete_success')),
              true,
            ),
          },
        ]}
      />
      </motion.div>

      <motion.div className="border rounded-lg overflow-hidden" variants={fadeInUp}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[48px]">
                <Checkbox
                  checked={users.length > 0 && selectedUserIds.length === users.length}
                  onCheckedChange={(checked) => toggleAllCurrentPage(Boolean(checked))}
                />
              </TableHead>
              <TableHead>{t('admin_users.col_user')}</TableHead>
              <TableHead>{t('admin_users.col_roles')}</TableHead>
              <TableHead>{t('admin_users.col_status')}</TableHead>
              <TableHead>{t('admin_users.col_enrollments')}</TableHead>
              <TableHead>{t('admin_users.col_courses')}</TableHead>
              <TableHead>{t('admin_users.col_join_date')}</TableHead>
              <TableHead>{t('admin_users.col_last_active')}</TableHead>
              <TableHead className="text-right">{t('admin_users.col_actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="py-10">
                  {renderUsersTableSkeleton()}
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  {t('admin_users.no_users')}
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => {
                const statusBadge = getStatusBadge(user.status)
                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedUserIds.includes(user.id)}
                        onCheckedChange={(checked) => toggleUserSelection(user.id, Boolean(checked))}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {getRoleBadges(user.roles)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={statusBadge.variant}
                        className={cn("capitalize", statusBadge.className)}
                      >
                        {user.status === 'active' ? t('admin_users.active') : user.status === 'banned' ? t('admin_users.banned') : t('admin_users.pending')}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.enrollments}</TableCell>
                    <TableCell>{user.coursesCreated || '-'}</TableCell>
                    <TableCell>{user.joinDate}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.lastActive || t('common.unknown')}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/admin/users/${user.id}/edit`)}>
                            <Edit className="h-4 w-4 mr-2" />
                            {t('admin_users.edit_user')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => window.open(`mailto:${user.email}`, '_self')}>
                            <Mail className="h-4 w-4 mr-2" />
                            {t('admin_users.send_email')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/admin/users/${user.id}/edit`)}>
                            <Shield className="h-4 w-4 mr-2" />
                            {t('admin_users.manage_roles')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {user.status === 'active' ? (
                            <DropdownMenuItem
                              onClick={() => openConfirm(
                                t('admin_users.actions.ban_title'),
                                t('admin_users.actions.ban_description', { name: user.name }),
                                t('admin_users.ban_user'),
                                () => handleBanUser(user.id),
                                true,
                              )}
                              className="text-destructive"
                            >
                              <UserX className="h-4 w-4 mr-2" />
                              {t('admin_users.ban_user')}
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => openConfirm(
                              t('admin_users.actions.unban_title'),
                              t('admin_users.actions.unban_description', { name: user.name }),
                              t('admin_users.unban_user'),
                              () => handleUnbanUser(user.id),
                            )}>
                              <UserCheck className="h-4 w-4 mr-2" />
                              {t('admin_users.unban_user')}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => openConfirm(
                              t('admin_users.actions.delete_title'),
                              t('admin_users.actions.delete_description', { name: user.name }),
                              t('admin_users.delete_user'),
                              () => handleDeleteUser(user.id),
                              true,
                            )}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('admin_users.delete_user')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </motion.div>

      {totalCount > 0 && (
        <motion.div className="mt-4" variants={fadeInUp}>
          <div className="text-sm text-muted-foreground mb-3">
            {t('admin_users.pagination_summary', { start: startIdx, end: endIdx, total: totalCount })}
          </div>
          <UserPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </motion.div>
      )}

      <AdminConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        confirmLabel={confirmState.confirmLabel}
        destructive={confirmState.destructive}
        loading={confirmState.loading}
        onOpenChange={(open) => setConfirmState(prev => ({ ...prev, open }))}
        onConfirm={runConfirmedAction}
      />
    </motion.div>
  )
}
