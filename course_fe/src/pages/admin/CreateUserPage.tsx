import { useState } from "react"

import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Card } from "../../components/ui/card"
import { Checkbox } from "../../components/ui/checkbox"
import { useRouter } from "../../components/Router"
import { ArrowLeft, UserPlus } from "lucide-react"
import { toast } from "sonner"
import { createUser } from '../../services/admin.api'

export function CreateUserPage() {
  const { navigate } = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    roles: [] as string[]
  })

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
    
    if (!formData.name || !formData.email || !formData.password) {
      toast.error('Please fill in all required fields')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (formData.roles.length === 0) {
      toast.error('Please select at least one role')
      return
    }

    try {
      await createUser({
        full_name: formData.name,
        email: formData.email,
        password: formData.password,
        user_type: formData.roles.includes('admin') ? 'admin' : formData.roles.includes('instructor') ? 'instructor' : 'student'
      })
      toast.success('User created successfully!')
      navigate('/admin/users')
    } catch {
      toast.error('Tạo người dùng thất bại')
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
                <UserPlus className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="font-medium">Create New User</h1>
                <p className="text-sm text-muted-foreground">
                  Add a new user to the platform
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="p-6">
              <h3 className="font-medium mb-4">User Information</h3>
              
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="••••••••"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">Confirm Password *</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="••••••••"
                      className="mt-1.5"
                    />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-medium mb-4">Roles & Permissions *</h3>
              
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

            <div className="flex gap-3 justify-end">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => navigate('/admin/users')}
              >
                Cancel
              </Button>
              <Button type="submit">
                Create User
              </Button>
            </div>
          </form>
    </div>
  )
}
