import { useState, useEffect } from "react"
import { FilterComponents } from "../../components/FilterComponents"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Badge } from "../../components/ui/badge"
import { Card } from "../../components/ui/card"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog-fixed"
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
} from "../../components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { 
  Search, 
  Plus, 
  MoreVertical, 
  Edit, 
  Trash2,
  Tag,
  TrendingUp,
  DollarSign,
  Users,
  Calendar
} from "lucide-react"
import { cn } from "../../components/ui/utils"
import { toast } from "sonner"
import { getPromotions, createPromotion, deletePromotion } from '../../services/promotions.api'
import type { Promotion } from '../../services/promotions.api'

interface Discount {
  id: string
  code: string
  type: 'percentage' | 'fixed'
  value: number
  description: string
  usageLimit: number
  usedCount: number
  expiry: string
  status: 'active' | 'expired' | 'disabled'
  createdBy: string
  creatorRole: 'admin' | 'instructor'
  applicableTo: 'all' | 'specific'
  courses?: string[]
}

export function AdminDiscountsPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [selectedType, setSelectedType] = useState<string>("all")
  
  const [newDiscount, setNewDiscount] = useState({
    code: '',
    type: 'percentage' as 'percentage' | 'fixed',
    value: '',
    description: '',
    usageLimit: '',
    expiry: '',
    applicableTo: 'all' as 'all' | 'specific'
  })

  const [discounts, setDiscounts] = useState<Discount[]>([])

  useEffect(() => {
    const fetchDiscounts = async () => {
      try {
        const res = await getPromotions()
        const list: Promotion[] = Array.isArray(res) ? res : (res as any).results ?? []
        setDiscounts(list.map((p: Promotion) => ({
          id: String(p.id),
          code: p.code,
          type: p.discount_type,
          value: Number(p.discount_value),
          description: p.description || '',
          usageLimit: p.usage_limit || 0,
          usedCount: p.used_count,
          expiry: p.end_date ? new Date(p.end_date).toISOString().split('T')[0] : '',
          status: p.status === 'expired' ? 'expired' : p.status === 'inactive' ? 'disabled' : 'active',
          createdBy: p.admin ? 'Admin' : 'Instructor',
          creatorRole: p.admin ? 'admin' as const : 'instructor' as const,
          applicableTo: (p.applicable_courses?.length || p.applicable_categories?.length) ? 'specific' as const : 'all' as const,
          courses: []
        })))
      } catch { toast.error('Không thể tải mã giảm giá') }
    }
    fetchDiscounts()
  }, [])

  const filteredDiscounts = discounts.filter(discount => {
    const matchesSearch = discount.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         discount.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = selectedStatus === 'all' || discount.status === selectedStatus
    const matchesType = selectedType === 'all' || discount.type === selectedType
    
    return matchesSearch && matchesStatus && matchesType
  })

  const getStatusBadge = (status: string) => {
    const config = {
      active: { variant: 'default' as const, className: 'bg-green-500/10 text-green-600 dark:text-green-400' },
      expired: { variant: 'secondary' as const, className: 'bg-gray-500/10 text-gray-600 dark:text-gray-400' },
      disabled: { variant: 'destructive' as const, className: '' },
    }
    return config[status as keyof typeof config] || config.active
  }

  const handleCreateDiscount = async () => {
    if (!newDiscount.code || !newDiscount.value || !newDiscount.expiry) {
      toast.error('Please fill in all required fields')
      return
    }
    try {
      const created = await createPromotion({
        code: newDiscount.code,
        discount_type: newDiscount.type,
        discount_value: Number(newDiscount.value),
        description: newDiscount.description,
        usage_limit: newDiscount.usageLimit ? Number(newDiscount.usageLimit) : undefined,
        start_date: new Date().toISOString(),
        end_date: new Date(newDiscount.expiry).toISOString(),
        status: 'active'
      })
      setDiscounts(prev => [...prev, {
        id: String(created.id),
        code: created.code,
        type: created.discount_type,
        value: Number(created.discount_value),
        description: created.description || '',
        usageLimit: created.usage_limit || 0,
        usedCount: 0,
        expiry: newDiscount.expiry,
        status: 'active' as const,
        createdBy: 'Admin',
        creatorRole: 'admin' as const,
        applicableTo: newDiscount.applicableTo,
        courses: []
      }])
      toast.success('Discount code created successfully!')
      setIsCreateDialogOpen(false)
      setNewDiscount({ code: '', type: 'percentage', value: '', description: '', usageLimit: '', expiry: '', applicableTo: 'all' })
    } catch { toast.error('Tạo mã giảm giá thất bại') }
  }

  const handleDeleteDiscount = async (discountId: string) => {
    try {
      await deletePromotion(Number(discountId))
      setDiscounts(prev => prev.filter(d => d.id !== discountId))
      toast.success('Discount code deleted')
    } catch { toast.error('Xóa thất bại') }
  }

  const totalRevenue = discounts.reduce((sum, d) => sum + (d.usedCount * d.value), 0)
  const totalUsage = discounts.reduce((sum, d) => sum + d.usedCount, 0)
  const activeDiscounts = discounts.filter(d => d.status === 'active').length

  return (
    <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Tag className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="font-medium">Discount Codes</h1>
                  <p className="text-sm text-muted-foreground">
                    Manage platform-wide and instructor discount codes
                  </p>
                </div>
              </div>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Discount
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create Discount Code</DialogTitle>
                    <DialogDescription>
                      Create a new discount code for the platform
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="code">Discount Code *</Label>
                        <Input
                          id="code"
                          value={newDiscount.code}
                          onChange={(e) => setNewDiscount(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                          placeholder="SUMMER2024"
                          className="mt-1.5 uppercase"
                        />
                      </div>
                      <div>
                        <Label htmlFor="type">Type *</Label>
                        <Select 
                          value={newDiscount.type} 
                          onValueChange={(value: any) => setNewDiscount(prev => ({ ...prev, type: value }))}
                        >
                          <SelectTrigger className="mt-1.5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage</SelectItem>
                            <SelectItem value="fixed">Fixed Amount</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="value">
                        {newDiscount.type === 'percentage' ? 'Percentage (%)' : 'Amount ($)'} *
                      </Label>
                      <Input
                        id="value"
                        type="number"
                        value={newDiscount.value}
                        onChange={(e) => setNewDiscount(prev => ({ ...prev, value: e.target.value }))}
                        placeholder={newDiscount.type === 'percentage' ? '30' : '10'}
                        className="mt-1.5"
                      />
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Input
                        id="description"
                        value={newDiscount.description}
                        onChange={(e) => setNewDiscount(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Summer sale discount"
                        className="mt-1.5"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="usageLimit">Usage Limit</Label>
                        <Input
                          id="usageLimit"
                          type="number"
                          value={newDiscount.usageLimit}
                          onChange={(e) => setNewDiscount(prev => ({ ...prev, usageLimit: e.target.value }))}
                          placeholder="1000"
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label htmlFor="expiry">Expiry Date *</Label>
                        <Input
                          id="expiry"
                          type="date"
                          value={newDiscount.expiry}
                          onChange={(e) => setNewDiscount(prev => ({ ...prev, expiry: e.target.value }))}
                          className="mt-1.5"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="applicableTo">Applicable To</Label>
                      <Select 
                        value={newDiscount.applicableTo} 
                        onValueChange={(value: any) => setNewDiscount(prev => ({ ...prev, applicableTo: value }))}
                      >
                        <SelectTrigger className="mt-1.5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Courses</SelectItem>
                          <SelectItem value="specific">Specific Courses</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex gap-3 justify-end pt-4">
                      <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateDiscount}>
                        Create Discount
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Tag className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Codes</p>
                  <p className="text-2xl font-bold">{activeDiscounts}</p>
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Usage</p>
                  <p className="text-2xl font-bold">{totalUsage.toLocaleString()}</p>
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Revenue Impact</p>
                  <p className="text-2xl font-bold">${totalRevenue.toLocaleString()}</p>
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Discount</p>
                  <p className="text-2xl font-bold">23%</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Filters */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by code or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <FilterComponents.Select
                label=""
                value={selectedType}
                options={[
                  { value: 'all', label: 'All Types' },
                  { value: 'percentage', label: 'Percentage' },
                  { value: 'fixed', label: 'Fixed Amount' }
                ]}
                onChange={setSelectedType}
                className="w-full md:w-48"
              />
              <FilterComponents.Select
                label=""
                value={selectedStatus}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'active', label: 'Active' },
                  { value: 'expired', label: 'Expired' },
                  { value: 'disabled', label: 'Disabled' }
                ]}
                onChange={setSelectedStatus}
                className="w-full md:w-48"
              />
            </div>
          </div>

          {/* Discounts Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDiscounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No discount codes found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDiscounts.map((discount) => {
                    const statusBadge = getStatusBadge(discount.status)
                    const usagePercent = (discount.usedCount / discount.usageLimit) * 100
                    
                    return (
                      <TableRow key={discount.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{discount.code}</p>
                            <p className="text-sm text-muted-foreground">{discount.description}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {discount.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {discount.type === 'percentage' ? `${discount.value}%` : `$${discount.value}`}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{discount.usedCount} / {discount.usageLimit}</p>
                            <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                              <div 
                                className="bg-primary h-1.5 rounded-full" 
                                style={{ width: `${Math.min(usagePercent, 100)}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{discount.createdBy}</span>
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-xs",
                                discount.creatorRole === 'admin' 
                                  ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                                  : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                              )}
                            >
                              {discount.creatorRole}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {discount.expiry}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={statusBadge.variant}
                            className={cn("capitalize", statusBadge.className)}
                          >
                            {discount.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteDiscount(discount.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
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
          </div>
    </div>
  )
}
