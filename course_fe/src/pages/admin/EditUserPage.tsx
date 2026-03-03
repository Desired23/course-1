import { useState, useEffect } from "react"

import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Card } from "../../components/ui/card"
import { Checkbox } from "../../components/ui/checkbox"
import { Badge } from "../../components/ui/badge"
import { useRouter } from "../../components/Router"
import { ArrowLeft, Save, UserCog, Shield } from "lucide-react"
import { toast } from "sonner"
import { getUserById, adminUpdateUser } from '../../services/admin.api'

export function EditUserPage() {
  const { navigate, currentRoute } = useRouter()
  const userId = currentRoute.split('/')[3] // Extract user ID from URL
  
  // Fetch user data from API
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    status: 'active' as 'active' | 'banned' | 'pending',
    roles: [] as string[]
  })

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const numId = Number(userId)
        if (!numId) return
        const user = await getUserById(numId)
        const ut = (user.user_type || '').toLowerCase()
        const roles: string[] = []
        if (ut === 'admin') roles.push('admin')
        else if (ut === 'instructor') roles.push('instructor')
        else roles.push('user')
        setFormData({
          name: user.full_name || user.username,
          email: user.email,
          status: (user.status === 'banned' ? 'banned' : user.status === 'inactive' ? 'pending' : 'active') as any,
          roles
        })
      } catch {
        toast.error('Không thể tải thông tin người dùng')
      }
    }
    fetchUser()
  }, [userId])

  const availableRoles = [
    { id: 'user', label: 'Student', description: 'Can enroll in courses' },
    { id: 'instructor', label: 'Instructor', description: 'Can create and teach courses' },
    { id: 'admin', label: 'Admin', description: 'Full platform access' }
  ]

  const handleRoleToggle = (roleId: string) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.includes(roleId)
        ? prev.roles.filter(r => r !== roleId)
        : [...prev.roles, roleId]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.email) {
      toast.error('Please fill in all required fields')
      return
    }

    if (formData.roles.length === 0) {
      toast.error('Please select at least one role')
      return
    }

    try {
      await adminUpdateUser(Number(userId), {
        full_name: formData.name,
        email: formData.email,
        status: formData.status === 'pending' ? 'inactive' : formData.status,
        user_type: formData.roles.includes('admin') ? 'admin' : formData.roles.includes('instructor') ? 'instructor' : 'student'
      })
      toast.success('User updated successfully!')
      navigate('/admin/users')
    } catch {
      toast.error('Cập nhật thất bại')
    }
  }

  return (
    <div className="p-8 max-w-3xl">
          {/* Header */}
          <div className="mb-8">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/admin/users')}
              className="mb-4 -ml-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Users
            </Button>
            
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <UserCog className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="font-medium">Edit User</h1>
                <p className="text-sm text-muted-foreground">
                  Update user information and permissions
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">User Information</h3>
                <Badge variant={formData.status === 'active' ? 'default' : 'destructive'} className="capitalize">
                  {formData.status}
                </Badge>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="John Doe"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="john@example.com"
                    className="mt-1.5"
                  />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-medium">Roles & Permissions *</h3>
              </div>
              
              <div className="space-y-3">
                {availableRoles.map((role) => (
                  <div
                    key={role.id}
                    className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleRoleToggle(role.id)}
                  >
                    <Checkbox
                      id={`role-${role.id}`}
                      checked={formData.roles.includes(role.id)}
                      onCheckedChange={() => handleRoleToggle(role.id)}
                    />
                    <div className="flex-1">
                      <Label htmlFor={`role-${role.id}`} className="cursor-pointer">
                        {role.label}
                      </Label>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {role.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-medium mb-4">Account Status</h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant={formData.status === 'active' ? 'default' : 'outline'}
                    onClick={() => setFormData(prev => ({ ...prev, status: 'active' }))}
                  >
                    Active
                  </Button>
                  <Button
                    type="button"
                    variant={formData.status === 'banned' ? 'destructive' : 'outline'}
                    onClick={() => setFormData(prev => ({ ...prev, status: 'banned' }))}
                  >
                    Banned
                  </Button>
                  <Button
                    type="button"
                    variant={formData.status === 'pending' ? 'secondary' : 'outline'}
                    onClick={() => setFormData(prev => ({ ...prev, status: 'pending' }))}
                  >
                    Pending
                  </Button>
                </div>
              </div>
            </Card>

            <div className="flex gap-3 justify-end">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => navigate('/admin/users')}
              >
                Cancel
              </Button>
              <Button type="submit" className="gap-2">
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </form>
    </div>
  )
}
