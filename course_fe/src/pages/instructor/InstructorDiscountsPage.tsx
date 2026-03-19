import { useState, useEffect, useMemo } from "react"

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
import { Checkbox } from "../../components/ui/checkbox"
import { 
  Search, 
  Plus, 
  MoreVertical, 
  Edit, 
  Trash2,
  Tag,
  DollarSign,
  Users,
  Calendar,
  Copy
} from "lucide-react"
import { cn } from "../../components/ui/utils"
import { UserPagination } from "../../components/UserPagination"
import { toast } from "sonner"
import { useAuth } from "../../contexts/AuthContext"
import { getMyInstructorProfile } from "../../services/instructor.api"
import {
  getInstructorPromotions,
  getInstructorPromotionsPage,
  createPromotion,
  updatePromotion,
  deletePromotion,
  parseDecimal,
  type Promotion,
  type PromotionStatus,
} from "../../services/promotions.api"
import { getAllCourses, type CourseListItem } from "../../services/course.api"

// Adapter type that maps BE Promotion to what the UI expects
interface Discount {
  id: number
  code: string
  type: 'percentage' | 'fixed'
  value: number
  description: string
  usageLimit: number
  usedCount: number
  expiry: string
  status: 'active' | 'expired' | 'disabled'
  applicableCourses: string[]
  applicableCourseIds: number[]
  revenue: number
}

const ITEMS_PER_PAGE = 10

/** Map BE Promotion → FE Discount for UI display */
function promotionToDiscount(p: Promotion, coursesMap: Map<number, string>): Discount {
  const statusMap: Record<PromotionStatus, 'active' | 'expired' | 'disabled'> = {
    active: 'active',
    expired: 'expired',
    inactive: 'disabled',
  }
  return {
    id: p.id,
    code: p.code,
    type: p.discount_type,
    value: parseDecimal(p.discount_value),
    description: p.description || '',
    usageLimit: p.usage_limit ?? 0,
    usedCount: p.used_count,
    expiry: p.end_date ? p.end_date.split('T')[0] : '',
    status: statusMap[p.status] ?? 'active',
    applicableCourses: p.applicable_courses.map(id => coursesMap.get(id) || `Course #${id}`),
    applicableCourseIds: p.applicable_courses,
    revenue: 0, // BE doesn't track per-promotion revenue
  }
}

export function InstructorDiscountsPage() {
  const { user } = useAuth()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [selectedCourse, setSelectedCourse] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  
  const [newDiscount, setNewDiscount] = useState({
    code: '',
    type: 'percentage' as 'percentage' | 'fixed',
    value: '',
    description: '',
    usageLimit: '',
    expiry: '',
    selectedCourses: [] as string[]
  })

  // Instructor's courses from API
  const [instructorCourses, setInstructorCourses] = useState<{ id: string; title: string }[]>([])
  // Instructor ID for API calls
  const [instructorId, setInstructorId] = useState<number | null>(null)
  const [coursesMap, setCoursesMap] = useState<Map<number, string>>(new Map())

  // State for current page discounts
  const [discounts, setDiscounts] = useState<Discount[]>([])
  // State for summary cards
  const [allDiscountsForStats, setAllDiscountsForStats] = useState<Discount[]>([])

  const backendStatus = useMemo<PromotionStatus | undefined>(() => {
    if (selectedStatus === 'all') return undefined
    if (selectedStatus === 'disabled') return 'inactive'
    return selectedStatus as PromotionStatus
  }, [selectedStatus])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim())
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch base instructor/courses info
  useEffect(() => {
    if (!user?.id) return
    let cancelled = false

    async function fetchData() {
      try {
        setIsLoading(true)
        const profile = await getMyInstructorProfile(user!.id)
        if (cancelled) return
        setInstructorId(profile.id)

        const courses = await getAllCourses({ instructor_id: profile.id })
        if (cancelled) return

        const nextCoursesMap = new Map<number, string>()
        const coursesList: { id: string; title: string }[] = []
        courses.forEach((c: CourseListItem) => {
          nextCoursesMap.set(c.id, c.title)
          coursesList.push({ id: String(c.id), title: c.title })
        })
        setCoursesMap(nextCoursesMap)
        setInstructorCourses(coursesList)
      } catch (err) {
        console.error('Failed to load discounts data:', err)
        toast.error('Failed to load discount codes')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, [user?.id])

  // Fetch table data from BE with server-side pagination/filter
  useEffect(() => {
    if (!instructorId) return
    let cancelled = false

    async function fetchDiscountsPage() {
      try {
        setIsLoading(true)
        const res = await getInstructorPromotionsPage({
          instructor_id: instructorId,
          page: currentPage,
          page_size: ITEMS_PER_PAGE,
          status: backendStatus,
          search: debouncedSearch || undefined,
          course_id: selectedCourse === 'all' ? undefined : Number(selectedCourse),
        })
        if (cancelled) return
        const mapped = (Array.isArray(res.results) ? res.results : []).map((p) => promotionToDiscount(p, coursesMap))
        setDiscounts(mapped)
        setTotalCount(res.count || 0)
        setTotalPages(Math.max(1, res.total_pages || Math.ceil((res.count || 0) / ITEMS_PER_PAGE)))
      } catch (err) {
        console.error('Failed to load discounts data:', err)
        if (!cancelled) {
          setDiscounts([])
          setTotalCount(0)
          setTotalPages(1)
          toast.error('Failed to load discount codes')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchDiscountsPage()
    return () => { cancelled = true }
  }, [instructorId, currentPage, backendStatus, debouncedSearch, selectedCourse, coursesMap, refreshKey])

  // Fetch all promotions only for summary cards
  useEffect(() => {
    if (!instructorId) return
    let cancelled = false

    async function fetchSummaryStats() {
      try {
        const promotions = await getInstructorPromotions(instructorId)
        if (cancelled) return
        const mapped = (Array.isArray(promotions) ? promotions : []).map((p) => promotionToDiscount(p, coursesMap))
        setAllDiscountsForStats(mapped)
      } catch (err) {
        console.error('Failed to load discount stats:', err)
      }
    }

    fetchSummaryStats()
    return () => { cancelled = true }
  }, [instructorId, coursesMap, refreshKey])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedStatus, selectedCourse])

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const getStatusBadge = (status: string) => {
    const config = {
      active: { variant: 'default' as const, className: 'bg-green-500/10 text-green-600 dark:text-green-400' },
      expired: { variant: 'secondary' as const, className: 'bg-gray-500/10 text-gray-600 dark:text-gray-400' },
      disabled: { variant: 'destructive' as const, className: '' },
    }
    return config[status as keyof typeof config] || config.active
  }

  const handleCourseToggle = (courseId: string) => {
    setNewDiscount(prev => ({
      ...prev,
      selectedCourses: prev.selectedCourses.includes(courseId)
        ? prev.selectedCourses.filter(id => id !== courseId)
        : [...prev.selectedCourses, courseId]
    }))
  }

  const handleCreateDiscount = async () => {
    if (!newDiscount.code || !newDiscount.value || !newDiscount.expiry) {
      toast.error('Please fill in all required fields')
      return
    }

    if (newDiscount.selectedCourses.length === 0) {
      toast.error('Please select at least one course')
      return
    }

    try {
      setIsSubmitting(true)
      const courseIds = newDiscount.selectedCourses.map(Number)
      const created = await createPromotion({
        code: newDiscount.code,
        discount_type: newDiscount.type,
        discount_value: Number(newDiscount.value),
        description: newDiscount.description || undefined,
        start_date: new Date().toISOString().split('T')[0],
        end_date: newDiscount.expiry,
        usage_limit: Number(newDiscount.usageLimit) || undefined,
        applicable_courses: courseIds,
        instructor: instructorId ?? undefined,
        status: 'active',
      })

      if (created) {
        setRefreshKey((prev) => prev + 1)
      }
      toast.success('Discount code created successfully!')
      setIsCreateDialogOpen(false)
      setNewDiscount({
        code: '',
        type: 'percentage',
        value: '',
        description: '',
        usageLimit: '',
        expiry: '',
        selectedCourses: []
      })
    } catch (err: any) {
      console.error('Create discount failed:', err)
      toast.error(err?.message || 'Failed to create discount code')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditDiscount = (discount: Discount) => {
    setEditingDiscount(discount)
    setNewDiscount({
      code: discount.code,
      type: discount.type,
      value: discount.value.toString(),
      description: discount.description,
      usageLimit: discount.usageLimit.toString(),
      expiry: discount.expiry,
      selectedCourses: discount.applicableCourseIds.map(String)
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdateDiscount = async () => {
    if (!editingDiscount) return

    if (!newDiscount.code || !newDiscount.value || !newDiscount.expiry) {
      toast.error('Please fill in all required fields')
      return
    }

    if (newDiscount.selectedCourses.length === 0) {
      toast.error('Please select at least one course')
      return
    }

    try {
      setIsSubmitting(true)
      const courseIds = newDiscount.selectedCourses.map(Number)
      const updated = await updatePromotion(editingDiscount.id, {
        code: newDiscount.code,
        discount_type: newDiscount.type,
        discount_value: Number(newDiscount.value),
        description: newDiscount.description || undefined,
        end_date: newDiscount.expiry,
        usage_limit: Number(newDiscount.usageLimit) || undefined,
        applicable_courses: courseIds,
      })

      if (updated) {
        setRefreshKey((prev) => prev + 1)
      }

      toast.success('Discount updated successfully!')
      setIsEditDialogOpen(false)
      setEditingDiscount(null)
      setNewDiscount({
        code: '',
        type: 'percentage',
        value: '',
        description: '',
        usageLimit: '',
        expiry: '',
        selectedCourses: []
      })
    } catch (err: any) {
      console.error('Update discount failed:', err)
      toast.error(err?.message || 'Failed to update discount code')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success('Code copied to clipboard!')
  }

  const handleDeleteDiscount = async (discountId: number) => {
    const discount = discounts.find(d => d.id === discountId)
    if (discount && confirm(`Delete discount code "${discount.code}"?`)) {
      try {
        await deletePromotion(discountId)
        setRefreshKey((prev) => prev + 1)
        toast.success('Discount code deleted')
      } catch (err: any) {
        console.error('Delete discount failed:', err)
        toast.error(err?.message || 'Failed to delete discount code')
      }
    }
  }

  const handleToggleStatus = async (discountId: number) => {
    const discount = discounts.find(d => d.id === discountId)
    if (!discount) return
    const newStatus: PromotionStatus = discount.status === 'active' ? 'inactive' : 'active'
    try {
      await updatePromotion(discountId, { status: newStatus })
      setRefreshKey((prev) => prev + 1)
      toast.success('Discount status updated')
    } catch (err: any) {
      console.error('Toggle status failed:', err)
      toast.error(err?.message || 'Failed to update status')
    }
  }

  const totalRevenue = allDiscountsForStats.reduce((sum, d) => sum + d.revenue, 0)
  const totalUsage = allDiscountsForStats.reduce((sum, d) => sum + d.usedCount, 0)
  const activeDiscounts = allDiscountsForStats.filter(d => d.status === 'active').length

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
                  <h1 className="font-medium">My Discount Codes</h1>
                  <p className="text-sm text-muted-foreground">
                    Create and manage discount codes for your courses
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
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create Discount Code</DialogTitle>
                    <DialogDescription>
                      Create a discount code for your courses
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
                          placeholder="REACT50"
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
                        placeholder={newDiscount.type === 'percentage' ? '50' : '20'}
                        className="mt-1.5"
                      />
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Input
                        id="description"
                        value={newDiscount.description}
                        onChange={(e) => setNewDiscount(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Special discount for my students"
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
                          placeholder="500"
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
                      <Label className="mb-3 block">Applicable Courses *</Label>
                      <div className="space-y-2 border rounded-lg p-4">
                        {instructorCourses.map((course) => (
                          <div
                            key={course.id}
                            className="flex items-center gap-3 p-3 hover:bg-muted/50 rounded-lg cursor-pointer"
                            onClick={() => handleCourseToggle(course.id)}
                          >
                            <Checkbox
                              id={`course-${course.id}`}
                              checked={newDiscount.selectedCourses.includes(course.id)}
                              onCheckedChange={() => handleCourseToggle(course.id)}
                            />
                            <Label htmlFor={`course-${course.id}`} className="cursor-pointer flex-1">
                              {course.title}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-3 justify-end pt-4">
                      <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateDiscount} disabled={isSubmitting}>
                        {isSubmitting ? 'Creating...' : 'Create Discount'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
                  <p className="text-sm text-muted-foreground">Revenue Generated</p>
                  <p className="text-2xl font-bold">${totalRevenue.toLocaleString()}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Filters */}
          <div className="mb-6 flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by code or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger className="w-60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {instructorCourses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                  <TableHead>Courses</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Loading discount codes...
                    </TableCell>
                  </TableRow>
                ) : discounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No discount codes found. Create your first one!
                    </TableCell>
                  </TableRow>
                ) : (
                  discounts.map((discount) => {
                    const statusBadge = getStatusBadge(discount.status)
                    const usagePercent = discount.usageLimit > 0 ? (discount.usedCount / discount.usageLimit) * 100 : 0
                    
                    return (
                      <TableRow key={discount.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div>
                              <p className="font-medium">{discount.code}</p>
                              <p className="text-sm text-muted-foreground">{discount.description}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleCopyCode(discount.code)}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
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
                            <p className="font-medium text-sm">{discount.usedCount} / {discount.usageLimit}</p>
                            <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                              <div 
                                className="bg-primary h-1.5 rounded-full" 
                                style={{ width: `${Math.min(usagePercent, 100)}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {discount.applicableCourses.length} courses
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-green-600 dark:text-green-400">
                          ${discount.revenue.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
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
                              <DropdownMenuItem onClick={() => handleEditDiscount(discount)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleCopyCode(discount.code)}>
                                <Copy className="h-4 w-4 mr-2" />
                                Copy Code
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

          {totalCount > 0 && (
            <div className="mt-4">
              <div className="text-sm text-muted-foreground mb-3">
                Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, totalCount)}
                -
                {Math.min((currentPage - 1) * ITEMS_PER_PAGE + discounts.length, totalCount)}
                {' '}of {totalCount} discount codes
              </div>
              <UserPagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}

          {/* Edit Discount Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Discount Code</DialogTitle>
                <DialogDescription>
                  Update discount code details
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-code">Discount Code *</Label>
                    <Input
                      id="edit-code"
                      value={newDiscount.code}
                      onChange={(e) => setNewDiscount(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      placeholder="REACT50"
                      className="mt-1.5 uppercase"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-type">Type *</Label>
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
                  <Label htmlFor="edit-value">
                    {newDiscount.type === 'percentage' ? 'Percentage (%)' : 'Amount ($)'} *
                  </Label>
                  <Input
                    id="edit-value"
                    type="number"
                    value={newDiscount.value}
                    onChange={(e) => setNewDiscount(prev => ({ ...prev, value: e.target.value }))}
                    placeholder={newDiscount.type === 'percentage' ? '50' : '20'}
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Input
                    id="edit-description"
                    value={newDiscount.description}
                    onChange={(e) => setNewDiscount(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Special discount for my students"
                    className="mt-1.5"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-usageLimit">Usage Limit</Label>
                    <Input
                      id="edit-usageLimit"
                      type="number"
                      value={newDiscount.usageLimit}
                      onChange={(e) => setNewDiscount(prev => ({ ...prev, usageLimit: e.target.value }))}
                      placeholder="500"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-expiry">Expiry Date *</Label>
                    <Input
                      id="edit-expiry"
                      type="date"
                      value={newDiscount.expiry}
                      onChange={(e) => setNewDiscount(prev => ({ ...prev, expiry: e.target.value }))}
                      className="mt-1.5"
                    />
                  </div>
                </div>

                <div>
                  <Label className="mb-3 block">Applicable Courses *</Label>
                  <div className="space-y-2 border rounded-lg p-4">
                    {instructorCourses.map((course) => (
                      <div
                        key={course.id}
                        className="flex items-center gap-3 p-3 hover:bg-muted/50 rounded-lg cursor-pointer"
                        onClick={() => handleCourseToggle(course.id)}
                      >
                        <Checkbox
                          id={`edit-course-${course.id}`}
                          checked={newDiscount.selectedCourses.includes(course.id)}
                          onCheckedChange={() => handleCourseToggle(course.id)}
                        />
                        <Label htmlFor={`edit-course-${course.id}`} className="cursor-pointer flex-1">
                          {course.title}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4">
                  <Button variant="outline" onClick={() => {
                    setIsEditDialogOpen(false)
                    setEditingDiscount(null)
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateDiscount} disabled={isSubmitting}>
                    {isSubmitting ? 'Updating...' : 'Update Discount'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
    </div>
  )
}
