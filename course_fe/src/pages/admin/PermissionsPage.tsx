import React, { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Checkbox } from '../../components/ui/checkbox'
import { Label } from '../../components/ui/label'
import { Separator } from '../../components/ui/separator'
import { Search, Plus, Edit, Trash2, Shield, Users, UserCheck, Settings, Eye, Save } from 'lucide-react'
import { useAuth, UserRole, Permission, PERMISSIONS } from '../../contexts/AuthContext'
import { toast } from 'sonner'
import { getAllUsers, adminUpdateUser, getAdmins, updateAdmin } from '../../services/admin.api'
import type { UserItem, AdminUser } from '../../services/admin.api'
import { useTranslation } from 'react-i18next'


interface UserWithPermissions {
  id: string
  name: string
  email: string
  avatar?: string
  roles: UserRole[]
  permissions: string[]
  createdAt: Date
  lastLogin: Date
  status: 'active' | 'inactive' | 'suspended'
  adminLevel?: 'super' | 'sub'
}

interface RoleTemplate {
  id: string
  name: string
  description: string
  permissions: string[]
  isDefault: boolean
}

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



export function PermissionsPage() {
  const { canAccess } = useAuth()
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('users')
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all')
  const [selectedUser, setSelectedUser] = useState<UserWithPermissions | null>(null)
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<RoleTemplate | null>(null)
  const [editingUser, setEditingUser] = useState<UserWithPermissions | null>(null)
  const [users, setUsers] = useState<UserWithPermissions[]>([])
  const [roleTemplates, setRoleTemplates] = useState<RoleTemplate[]>([])

  const getRoleLabel = (role: UserRole) => t(`permissions_page.roles.${role}`)
  const getAdminLevelLabel = (level: 'super' | 'sub') =>
    level === 'super' ? t('permissions_page.super_admin') : t('permissions_page.sub_admin')
  const getStatusLabel = (status: UserWithPermissions['status']) => t(`permissions_page.statuses.${status}`)
  const buildRoleTemplates = (uniqueAdminPermissions: string[]): RoleTemplate[] => ([
    {
      id: 'user',
      name: t('permissions_page.role_templates.users_name'),
      description: t('permissions_page.role_templates.users_description'),
      permissions: ['user.profile.view', 'user.profile.edit', 'user.courses.enroll', 'user.reviews.create'],
      isDefault: true,
    },
    {
      id: 'instructor',
      name: t('permissions_page.role_templates.instructors_name'),
      description: t('permissions_page.role_templates.instructors_description'),
      permissions: ['instructor.courses.create', 'instructor.courses.edit', 'instructor.earnings.view', 'instructor.students.manage'],
      isDefault: false,
    },
    {
      id: 'admin',
      name: t('permissions_page.role_templates.admins_name'),
      description: t('permissions_page.role_templates.admins_description'),
      permissions: uniqueAdminPermissions,
      isDefault: false,
    },
  ])

  useEffect(() => {
    const load = async () => {
      try {
        const [apiUsers, apiAdmins] = await Promise.all([getAllUsers(), getAdmins()])
        const adminMap = new Map<number, AdminUser>()
        apiAdmins.forEach(a => adminMap.set(a.user.id, a))
        setUsers(apiUsers.map(u => {
          const admin = adminMap.get(u.id)
          const roles: UserRole[] = []
          if (u.user_type === 'student' || u.user_type === 'user') roles.push('user')
          if (u.user_type === 'instructor') roles.push('user', 'instructor')
          if (admin) roles.push('admin')
          return {
            id: String(u.id),
            name: u.full_name || u.username,
            email: u.email,
            avatar: u.avatar || undefined,
            roles,
            permissions: admin ? admin.permissions : [],
            createdAt: new Date(u.created_at),
            lastLogin: u.last_login ? new Date(u.last_login) : new Date(),
            status: u.status as any,
            adminLevel: admin ? (admin.is_super_admin ? 'super' : 'sub') : undefined
          }
        }))
        const uniqueAdminPermissions = Array.from(new Set(apiAdmins.flatMap(admin => admin.permissions || [])))
        setRoleTemplates(buildRoleTemplates(uniqueAdminPermissions))
      } catch {
        toast.error(t('permissions_page.load_failed'))
      }
    }
    load()
  }, [t])

  if (!canAccess(['admin'], ['admin.permissions.manage'])) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p>{t('permissions_page.permission_denied')}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = roleFilter === 'all' || user.roles.includes(roleFilter)
    return matchesSearch && matchesRole
  })

  const auditEntries = [
    {
      id: 'admins',
      title: t('permissions_page.audit_entries.admins_title'),
      description: t('permissions_page.audit_entries.admins_description', {
        count: users.filter((user) => user.roles.includes('admin')).length,
      }),
      badge: t('permissions_page.audit_entries.admins_badge'),
      variant: 'destructive' as const,
    },
    {
      id: 'instructors',
      title: t('permissions_page.audit_entries.instructors_title'),
      description: t('permissions_page.audit_entries.instructors_description', {
        count: users.filter((user) => user.roles.includes('instructor')).length,
      }),
      badge: t('permissions_page.audit_entries.instructors_badge'),
      variant: 'default' as const,
    },
    {
      id: 'permissions',
      title: t('permissions_page.audit_entries.permissions_title'),
      description: t('permissions_page.audit_entries.permissions_description', {
        count: users.reduce((total, user) => total + user.permissions.length, 0),
      }),
      badge: t('permissions_page.audit_entries.permissions_badge'),
      variant: 'secondary' as const,
    },
  ]

  const handleEditUser = (user: UserWithPermissions) => {
    setEditingUser({ ...user })
    setIsUserDialogOpen(true)
  }

  const handleSaveUser = async () => {
    if (!editingUser) return
    try {
      await adminUpdateUser(Number(editingUser.id), {
        user_type: editingUser.roles.includes('admin') ? 'admin' : editingUser.roles.includes('instructor') ? 'instructor' : 'student'
      })
      setUsers(prev => prev.map(u => u.id === editingUser.id ? editingUser : u))
      toast.success(t('permissions_page.update_success'))
      setIsUserDialogOpen(false)
      setEditingUser(null)
    } catch { toast.error(t('permissions_page.update_failed')) }
  }

  const handleTogglePermission = (permissionId: string) => {
    if (!editingUser) return

    const hasPermission = editingUser.permissions.includes(permissionId)
    const updatedPermissions = hasPermission
      ? editingUser.permissions.filter(p => p !== permissionId)
      : [...editingUser.permissions, permissionId]

    setEditingUser({ ...editingUser, permissions: updatedPermissions })
  }

  const handleToggleRole = (role: UserRole) => {
    if (!editingUser) return

    const hasRole = editingUser.roles.includes(role)
    const updatedRoles = hasRole
      ? editingUser.roles.filter(r => r !== role)
      : [...editingUser.roles, role]

    setEditingUser({ ...editingUser, roles: updatedRoles })
  }

  const getPermissionsByCategory = () => {
    const categories = PERMISSIONS.reduce((acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = []
      }
      acc[permission.category].push(permission)
      return acc
    }, {} as Record<string, Permission[]>)

    return categories
  }

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'destructive'
      case 'instructor': return 'default'
      case 'user': return 'secondary'
      default: return 'outline'
    }
  }

  return (
    <motion.div
      className="p-6 space-y-6 overflow-x-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div className="space-y-6" variants={sectionStagger} initial="hidden" animate="show">
      <motion.div className="flex justify-between items-center" variants={fadeInUp}>
        <div>
          <h1 className="text-3xl font-bold">{t('permissions_page.title')}</h1>
          <p className="text-muted-foreground">{t('permissions_page.subtitle')}</p>
        </div>
        <Badge variant="outline">{t('permissions_page.badges.backend_backed')}</Badge>
      </motion.div>

      <motion.div variants={fadeInUp}>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="relative grid w-full grid-cols-4 p-1">
          <TabsTrigger value="users" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            {activeTab === 'users' && <motion.span layoutId="permissions-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}
            <span className="relative z-10">{t('permissions_page.tabs.users')}</span>
          </TabsTrigger>
          <TabsTrigger value="roles" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            {activeTab === 'roles' && <motion.span layoutId="permissions-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}
            <span className="relative z-10">{t('permissions_page.tabs.roles')}</span>
          </TabsTrigger>
          <TabsTrigger value="permissions" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            {activeTab === 'permissions' && <motion.span layoutId="permissions-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}
            <span className="relative z-10">{t('permissions_page.tabs.permissions')}</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            {activeTab === 'audit' && <motion.span layoutId="permissions-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}
            <span className="relative z-10">{t('permissions_page.tabs.audit')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('permissions_page.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={(value: 'all' | UserRole) => setRoleFilter(value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t('permissions_page.filter_by_role')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('permissions_page.all_roles')}</SelectItem>
                <SelectItem value="admin">{t('common.admin')}</SelectItem>
                <SelectItem value="instructor">{t('common.instructor')}</SelectItem>
                <SelectItem value="user">{t('permissions_page.user_role')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('permissions_page.table.user')}</TableHead>
                    <TableHead>{t('permissions_page.table.roles')}</TableHead>
                    <TableHead>{t('permissions_page.table.permissions')}</TableHead>
                    <TableHead>{t('permissions_page.table.status')}</TableHead>
                    <TableHead>{t('permissions_page.table.last_login')}</TableHead>
                    <TableHead>{t('permissions_page.table.table_actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.roles.map((role) => (
                            <Badge key={role} variant={getRoleBadgeVariant(role)} className="text-xs">
                              {getRoleLabel(role)}
                              {user.adminLevel && role === 'admin' && ` (${getAdminLevelLabel(user.adminLevel)})`}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {t('permissions_page.permissions_assigned', { count: user.permissions.length })}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.status === 'active' ? 'default' :
                                     user.status === 'inactive' ? 'secondary' : 'destructive'}>
                          {getStatusLabel(user.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.lastLogin.toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => setSelectedUser(user)}>
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleEditUser(user)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {roleTemplates.map((role) => (
              <Card key={role.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{role.name}</CardTitle>
                      <CardDescription className="mt-1">{role.description}</CardDescription>
                    </div>
                    {role.isDefault && <Badge variant="outline">{t('permissions_page.default')}</Badge>}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium mb-2">{t('permissions_page.role_permissions_count', { count: role.permissions.length })}</p>
                      <div className="flex flex-wrap gap-1">
                        {role.permissions.slice(0, 3).map((permissionId) => {
                          const permission = PERMISSIONS.find(p => p.id === permissionId)
                          return permission ? (
                            <Badge key={permissionId} variant="secondary" className="text-xs">
                              {permission.name}
                            </Badge>
                          ) : null
                        })}
                        {role.permissions.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            {t('permissions_page.more_permissions', { count: role.permissions.length - 3 })}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" onClick={() => setSelectedRole(role)}>
                        <Eye className="h-3 w-3 mr-1" />
                        {t('permissions_page.view')}
                      </Button>
                      <Button size="sm" variant="outline" disabled>
                        <Edit className="h-3 w-3 mr-1" />
                        {t('permissions_page.view_only')}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('permissions_page.all_permissions_title')}</CardTitle>
              <CardDescription>{t('permissions_page.all_permissions_description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(getPermissionsByCategory()).map(([category, permissions]) => (
                  <div key={category}>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      {category}
                    </h3>
                    <div className="grid gap-3">
                      {permissions.map((permission) => (
                        <div key={permission.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{permission.name}</p>
                            <p className="text-sm text-muted-foreground">{t(permission.description)}</p>
                            <code className="text-xs bg-muted px-2 py-1 rounded mt-1 inline-block">
                              {permission.id}
                            </code>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('permissions_page.audit_title')}</CardTitle>
              <CardDescription>{t('permissions_page.audit_description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {auditEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{entry.title}</p>
                      <p className="text-sm text-muted-foreground">{entry.description}</p>
                    </div>
                    <Badge variant={entry.variant}>{entry.badge}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </motion.div>
      </motion.div>


      {editingUser && (
        <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('permissions_page.edit_user_permissions')}</DialogTitle>
              <DialogDescription>
                {t('permissions_page.manage_roles_permissions', { name: editingUser.name })}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div>
                <Label className="text-base font-semibold">{t('permissions_page.user_roles')}</Label>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  {(['user', 'instructor', 'admin'] as UserRole[]).map((role) => (
                    <div key={role} className="flex items-center space-x-2">
                      <Checkbox
                        id={`role-${role}`}
                        checked={editingUser.roles.includes(role)}
                        onCheckedChange={() => handleToggleRole(role)}
                      />
                      <Label htmlFor={`role-${role}`}>{getRoleLabel(role)}</Label>
                    </div>
                  ))}
                </div>

                {editingUser.roles.includes('admin') && (
                  <div className="mt-4">
                    <Label>{t('permissions_page.admin_level')}</Label>
                    <Select
                      value={editingUser.adminLevel || 'sub'}
                      onValueChange={(value: 'super' | 'sub') =>
                        setEditingUser({ ...editingUser, adminLevel: value })
                      }
                    >
                      <SelectTrigger className="w-40 mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sub">{t('permissions_page.sub_admin')}</SelectItem>
                        <SelectItem value="super">{t('permissions_page.super_admin')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <Label className="text-base font-semibold">{t('permissions_page.individual_permissions')}</Label>
                <div className="space-y-4 mt-3">
                  {Object.entries(getPermissionsByCategory()).map(([category, permissions]) => (
                    <div key={category}>
                      <h4 className="font-medium text-sm text-muted-foreground mb-2">{category}</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {permissions.map((permission) => (
                          <div key={permission.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={permission.id}
                              checked={editingUser.permissions.includes(permission.id)}
                              onCheckedChange={() => handleTogglePermission(permission.id)}
                            />
                            <Label htmlFor={permission.id} className="text-sm">
                              {permission.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsUserDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSaveUser}>
                <Save className="h-4 w-4 mr-2" />
                {t('common.save')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {selectedRole && (
        <Dialog open={!!selectedRole} onOpenChange={() => setSelectedRole(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedRole.name}</DialogTitle>
              <DialogDescription>{selectedRole.description}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant={selectedRole.isDefault ? 'outline' : 'secondary'}>
                  {selectedRole.isDefault ? t('permissions_page.default') : t('permissions_page.badges.custom_backed')}
                </Badge>
                <Badge variant="outline">
                  {t('permissions_page.role_permissions_count', { count: selectedRole.permissions.length })}
                </Badge>
              </div>

              <div className="grid gap-2 max-h-72 overflow-y-auto">
                {selectedRole.permissions.length === 0 && (
                  <p className="text-sm text-muted-foreground">{t('permissions_page.no_explicit_permissions')}</p>
                )}
                {selectedRole.permissions.map((permissionId) => {
                  const permission = PERMISSIONS.find((item) => item.id === permissionId)

                  return (
                    <div key={permissionId} className="flex items-center justify-between rounded border p-3">
                      <div>
                        <p className="font-medium">{permission?.name || permissionId}</p>
                        <p className="text-sm text-muted-foreground">
                          {permission?.description || t('permissions_page.backend_permission_mapping')}
                        </p>
                      </div>
                      <Badge variant="outline">{permission?.category || t('permissions_page.backend_label')}</Badge>
                    </div>
                  )
                })}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}


      {selectedUser && (
        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('permissions_page.user_details')}</DialogTitle>
              <DialogDescription>
                {t('permissions_page.user_details_description')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedUser.avatar} />
                  <AvatarFallback className="text-lg">
                    {selectedUser.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">{selectedUser.name}</h3>
                  <p className="text-muted-foreground">{selectedUser.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {selectedUser.roles.map((role) => (
                      <Badge key={role} variant={getRoleBadgeVariant(role)}>
                        {getRoleLabel(role)}
                        {selectedUser.adminLevel && role === 'admin' && ` (${getAdminLevelLabel(selectedUser.adminLevel)})`}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label>{t('permissions_page.created')}</Label>
                  <p>{selectedUser.createdAt.toLocaleDateString()}</p>
                </div>
                <div>
                  <Label>{t('permissions_page.table.last_login')}</Label>
                  <p>{selectedUser.lastLogin.toLocaleDateString()}</p>
                </div>
                <div>
                  <Label>{t('permissions_page.table.status')}</Label>
                  <Badge variant={selectedUser.status === 'active' ? 'default' : 'secondary'}>
                    {getStatusLabel(selectedUser.status)}
                  </Badge>
                </div>
                <div>
                  <Label>{t('permissions_page.table.permissions')}</Label>
                  <p>{t('permissions_page.permissions_assigned', { count: selectedUser.permissions.length })}</p>
                </div>
              </div>

              <Separator />

              <div>
                <Label className="font-semibold">{t('permissions_page.assigned_permissions')}</Label>
                <div className="grid grid-cols-1 gap-2 mt-2 max-h-40 overflow-y-auto">
                  {selectedUser.permissions.map((permissionId) => {
                    const permission = PERMISSIONS.find(p => p.id === permissionId)
                    return permission ? (
                      <div key={permissionId} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm">{permission.name}</span>
                        <Badge variant="outline" className="text-xs">{permission.category}</Badge>
                      </div>
                    ) : null
                  })}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </motion.div>
  )
}

