import React, { useState, useEffect } from 'react'
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



export function PermissionsPage() {
  const { canAccess, user: currentUser } = useAuth()
  const [activeTab, setActiveTab] = useState('users')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserWithPermissions | null>(null)
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false)
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<RoleTemplate | null>(null)
  const [editingUser, setEditingUser] = useState<UserWithPermissions | null>(null)
  const [users, setUsers] = useState<UserWithPermissions[]>([])
  const [roleTemplates, setRoleTemplates] = useState<RoleTemplate[]>([
    { id: '1', name: 'Basic Student', description: 'Standard student with basic learning features', permissions: ['user.profile.view', 'user.profile.edit', 'user.courses.enroll', 'user.reviews.create'], isDefault: true },
    { id: '2', name: 'Premium Student', description: 'Student with additional features and privileges', permissions: ['user.profile.view', 'user.profile.edit', 'user.courses.enroll', 'user.reviews.create'], isDefault: false },
    { id: '3', name: 'Content Creator', description: 'Instructor with course creation capabilities', permissions: ['instructor.courses.create', 'instructor.courses.edit', 'instructor.earnings.view', 'instructor.students.manage'], isDefault: false },
    { id: '4', name: 'Course Manager', description: 'Admin role for managing courses and content', permissions: ['admin.courses.manage', 'admin.blog.approve', 'admin.statistics.view'], isDefault: false }
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
      } catch {
        toast.error('Không thể tải danh sách người dùng')
      }
    }
    load()
  }, [])

  if (!canAccess(['admin'], ['admin.permissions.manage'])) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p>You don't have permission to manage permissions.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
      toast.success('Cập nhật quyền thành công')
      setIsUserDialogOpen(false)
      setEditingUser(null)
    } catch { toast.error('Cập nhật thất bại') }
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
    <div className="p-6 space-y-6 overflow-x-hidden">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Permissions Management</h1>
          <p className="text-muted-foreground">Manage user roles and permissions</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Create Role
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Role Template</DialogTitle>
                <DialogDescription>Create a reusable role template with predefined permissions</DialogDescription>
              </DialogHeader>
              {/* Role creation form would go here */}
            </DialogContent>
          </Dialog>
          
          <Button>
            <UserCheck className="h-4 w-4 mr-2" />
            Bulk Actions
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="roles">Role Templates</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="instructor">Instructor</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Actions</TableHead>
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
                              {role}
                              {user.adminLevel && role === 'admin' && ` (${user.adminLevel})`}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {user.permissions.length} permissions
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.status === 'active' ? 'default' : 
                                     user.status === 'inactive' ? 'secondary' : 'destructive'}>
                          {user.status}
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
                    {role.isDefault && <Badge variant="outline">Default</Badge>}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium mb-2">Permissions ({role.permissions.length})</p>
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
                            +{role.permissions.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" onClick={() => setSelectedRole(role)}>
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
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
              <CardTitle>All Permissions</CardTitle>
              <CardDescription>Complete list of available permissions in the system</CardDescription>
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
                            <p className="text-sm text-muted-foreground">{permission.description}</p>
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
              <CardTitle>Permission Audit Log</CardTitle>
              <CardDescription>Track permission changes and user activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">Admin permissions granted to Jane Smith</p>
                    <p className="text-sm text-muted-foreground">
                      User elevated to admin role by {currentUser?.name} • 2 hours ago
                    </p>
                  </div>
                  <Badge variant="default">Role Change</Badge>
                </div>
                
                <div className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">Blog creation permission removed from John Doe</p>
                    <p className="text-sm text-muted-foreground">
                      Permission revoked by {currentUser?.name} • 1 day ago
                    </p>
                  </div>
                  <Badge variant="destructive">Permission Removed</Badge>
                </div>
                
                <div className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">New user registered: Mike Johnson</p>
                    <p className="text-sm text-muted-foreground">
                      Automatically assigned user role • 3 days ago
                    </p>
                  </div>
                  <Badge variant="secondary">User Created</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      {editingUser && (
        <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit User Permissions</DialogTitle>
              <DialogDescription>
                Manage roles and permissions for {editingUser.name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              <div>
                <Label className="text-base font-semibold">User Roles</Label>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  {(['user', 'instructor', 'admin'] as UserRole[]).map((role) => (
                    <div key={role} className="flex items-center space-x-2">
                      <Checkbox
                        id={`role-${role}`}
                        checked={editingUser.roles.includes(role)}
                        onCheckedChange={() => handleToggleRole(role)}
                      />
                      <Label htmlFor={`role-${role}`} className="capitalize">{role}</Label>
                    </div>
                  ))}
                </div>
                
                {editingUser.roles.includes('admin') && (
                  <div className="mt-4">
                    <Label>Admin Level</Label>
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
                        <SelectItem value="sub">Sub Admin</SelectItem>
                        <SelectItem value="super">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              
              <Separator />
              
              <div>
                <Label className="text-base font-semibold">Individual Permissions</Label>
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
                Cancel
              </Button>
              <Button onClick={handleSaveUser}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* View User Details Dialog */}
      {selectedUser && (
        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
              <DialogDescription>
                View detailed information about this user
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
                        {role}
                        {selectedUser.adminLevel && role === 'admin' && ` (${selectedUser.adminLevel})`}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label>Created</Label>
                  <p>{selectedUser.createdAt.toLocaleDateString()}</p>
                </div>
                <div>
                  <Label>Last Login</Label>
                  <p>{selectedUser.lastLogin.toLocaleDateString()}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <Badge variant={selectedUser.status === 'active' ? 'default' : 'secondary'}>
                    {selectedUser.status}
                  </Badge>
                </div>
                <div>
                  <Label>Permissions</Label>
                  <p>{selectedUser.permissions.length} permissions assigned</p>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <Label className="font-semibold">Assigned Permissions</Label>
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
    </div>
  )
}