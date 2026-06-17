import { useState, useEffect, useMemo } from "react"
import { motion } from 'motion/react'
import {
  Button as AntButton,
  Input as AntInput,
  Modal as AntModal,
  Select as AntSelect,
} from 'antd'

import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Badge } from "../../components/ui/badge"
import { Card } from "../../components/ui/card"
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
  Users,
  Calendar,
  Copy
} from "lucide-react"
import { cn } from "../../components/ui/utils"
import { UserPagination } from "../../components/UserPagination"
import { toast } from "sonner"
import { useAuth } from "../../contexts/AuthContext"
import { getMyInstructorProfile } from "../../services/instructor.api"
import { useTranslation } from "react-i18next"
import { confirmDialog } from "../../utils/confirmDialog"
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
}

const ITEMS_PER_PAGE = 10

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
  }
}

export function InstructorDiscountsPage() {
  const { user } = useAuth()
  const { t } = useTranslation()
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


  const [instructorCourses, setInstructorCourses] = useState<{ id: string; title: string }[]>([])

  const [instructorId, setInstructorId] = useState<number | null>(null)
  const [coursesMap, setCoursesMap] = useState<Map<number, string>>(new Map())


  const [discounts, setDiscounts] = useState<Discount[]>([])

  const [allDiscountsForStats, setAllDiscountsForStats] = useState<Discount[]>([])

  const courseOptions = useMemo(
    () => instructorCourses.map((course) => ({ value: course.id, label: course.title })),
    [instructorCourses],
  )

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
        console.error(t('instructor_discounts_page.errors.load_discounts_console'), err)
        toast.error(t('instructor_discounts_page.toasts.failed_to_load_discount_codes'))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, [user?.id])


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
        console.error(t('instructor_discounts_page.errors.load_discounts_console'), err)
        if (!cancelled) {
          setDiscounts([])
          setTotalCount(0)
          setTotalPages(1)
          toast.error(t('instructor_discounts_page.toasts.failed_to_load_discount_codes'))
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchDiscountsPage()
    return () => { cancelled = true }
  }, [instructorId, currentPage, backendStatus, debouncedSearch, selectedCourse, coursesMap, refreshKey, t])


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
      console.error(t('instructor_discounts_page.errors.load_discount_stats_console'), err)
    }
  }

  fetchSummaryStats()
  return () => { cancelled = true }
  }, [instructorId, coursesMap, refreshKey, t])

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

  const getStatusLabel = (status: string) => {
    if (status === 'active') return t('instructor_discounts_page.status.active')
    if (status === 'expired') return t('instructor_discounts_page.status.expired')
    if (status === 'disabled') return t('instructor_discounts_page.status.disabled')
    return status
  }

  const getTypeLabel = (type: string) => {
    return type === 'percentage'
      ? t('instructor_discounts_page.types.percentage')
      : t('instructor_discounts_page.types.fixed_amount')
  }

  const resetDiscountForm = () => {
    setNewDiscount({
      code: '',
      type: 'percentage',
      value: '',
      description: '',
      usageLimit: '',
      expiry: '',
      selectedCourses: []
    })
  }

  const closeCreateDialog = () => {
    setIsCreateDialogOpen(false)
    resetDiscountForm()
  }

  const closeEditDialog = () => {
    setIsEditDialogOpen(false)
    setEditingDiscount(null)
    resetDiscountForm()
  }

  const handleCreateDiscount = async () => {
    if (!newDiscount.code || !newDiscount.value || !newDiscount.expiry) {
      toast.error(t('instructor_discounts_page.toasts.fill_required_fields'))
      return
    }

    if (newDiscount.selectedCourses.length === 0) {
      toast.error(t('instructor_discounts_page.toasts.select_at_least_one_course'))
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
      toast.success(t('instructor_discounts_page.toasts.discount_created'))
      setIsCreateDialogOpen(false)
      resetDiscountForm()
    } catch (err: any) {
      console.error(t('instructor_discounts_page.errors.create_discount_console'), err)
      toast.error(err?.message || t('instructor_discounts_page.toasts.failed_to_create_discount'))
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
      toast.error(t('instructor_discounts_page.toasts.fill_required_fields'))
      return
    }

    if (newDiscount.selectedCourses.length === 0) {
      toast.error(t('instructor_discounts_page.toasts.select_at_least_one_course'))
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

      toast.success(t('instructor_discounts_page.toasts.discount_updated'))
      setIsEditDialogOpen(false)
      setEditingDiscount(null)
      resetDiscountForm()
    } catch (err: any) {
      console.error(t('instructor_discounts_page.errors.update_discount_console'), err)
      toast.error(err?.message || t('instructor_discounts_page.toasts.failed_to_update_discount'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success(t('instructor_discounts_page.toasts.code_copied'))
  }

  const handleDeleteDiscount = async (discountId: number) => {
    const discount = discounts.find(d => d.id === discountId)
    if (discount && await confirmDialog(t('instructor_discounts_page.confirms.delete_discount', { code: discount.code }))) {
      try {
        await deletePromotion(discountId)
        setRefreshKey((prev) => prev + 1)
        toast.success(t('instructor_discounts_page.toasts.discount_deleted'))
      } catch (err: any) {
        console.error(t('instructor_discounts_page.errors.delete_discount_console'), err)
        toast.error(err?.message || t('instructor_discounts_page.toasts.failed_to_delete_discount'))
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
      toast.success(t('instructor_discounts_page.toasts.discount_status_updated'))
    } catch (err: any) {
      console.error(t('instructor_discounts_page.errors.toggle_status_console'), err)
      toast.error(err?.message || t('instructor_discounts_page.toasts.failed_to_update_status'))
    }
  }

  const totalUsage = allDiscountsForStats.reduce((sum, d) => sum + d.usedCount, 0)
  const activeDiscounts = allDiscountsForStats.filter(d => d.status === 'active').length

  const renderDiscountForm = (mode: 'create' | 'edit') => {
    const isEdit = mode === 'edit'
    const submitLabel = isSubmitting
      ? t(isEdit ? 'instructor_discounts_page.actions.updating' : 'instructor_discounts_page.actions.creating')
      : t(isEdit ? 'instructor_discounts_page.actions.update_discount' : 'instructor_discounts_page.actions.create_discount')
    const handleSubmit = isEdit ? handleUpdateDiscount : handleCreateDiscount
    const handleCancel = isEdit ? closeEditDialog : closeCreateDialog

    return (
      <div className="space-y-4 pt-2">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              {t('instructor_discounts_page.form.discount_code')}
            </label>
            <AntInput
              value={newDiscount.code}
              onChange={(e) => setNewDiscount(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
              placeholder={t('instructor_discounts_page.form.discount_code_placeholder')}
              className="uppercase"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              {t('instructor_discounts_page.form.type')}
            </label>
            <AntSelect
              value={newDiscount.type}
              onChange={(value: 'percentage' | 'fixed') => setNewDiscount(prev => ({ ...prev, type: value }))}
              options={[
                { value: 'percentage', label: t('instructor_discounts_page.types.percentage') },
                { value: 'fixed', label: t('instructor_discounts_page.types.fixed_amount') },
              ]}
              className="w-full"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">
            {newDiscount.type === 'percentage'
              ? t('instructor_discounts_page.form.percentage_value')
              : t('instructor_discounts_page.form.amount_value')}
          </label>
          <AntInput
            type="number"
            value={newDiscount.value}
            onChange={(e) => setNewDiscount(prev => ({ ...prev, value: e.target.value }))}
            placeholder={newDiscount.type === 'percentage'
              ? t('instructor_discounts_page.form.percentage_placeholder')
              : t('instructor_discounts_page.form.amount_placeholder')}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">
            {t('instructor_discounts_page.form.description')}
          </label>
          <AntInput
            value={newDiscount.description}
            onChange={(e) => setNewDiscount(prev => ({ ...prev, description: e.target.value }))}
            placeholder={t('instructor_discounts_page.form.description_placeholder')}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              {t('instructor_discounts_page.form.usage_limit')}
            </label>
            <AntInput
              type="number"
              value={newDiscount.usageLimit}
              onChange={(e) => setNewDiscount(prev => ({ ...prev, usageLimit: e.target.value }))}
              placeholder={t('instructor_discounts_page.form.usage_limit_placeholder')}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              {t('instructor_discounts_page.form.expiry_date')}
            </label>
            <AntInput
              type="date"
              value={newDiscount.expiry}
              onChange={(e) => setNewDiscount(prev => ({ ...prev, expiry: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">
            {t('instructor_discounts_page.form.applicable_courses')}
          </label>
          <AntSelect
            mode="multiple"
            showSearch
            allowClear
            value={newDiscount.selectedCourses}
            options={courseOptions}
            optionFilterProp="label"
            placeholder={t('instructor_discounts_page.form.applicable_courses')}
            maxTagCount="responsive"
            onChange={(selectedCourses) => setNewDiscount(prev => ({ ...prev, selectedCourses }))}
            className="w-full"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <AntButton onClick={handleCancel}>
            {t('instructor_discounts_page.actions.cancel')}
          </AntButton>
          <AntButton type="primary" onClick={handleSubmit} loading={isSubmitting}>
            {submitLabel}
          </AntButton>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className="p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div className="space-y-6" variants={sectionStagger} initial="hidden" animate="show">

          <motion.div className="mb-8" variants={fadeInUp}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Tag className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="font-medium">{t('instructor_discounts_page.title')}</h1>
                  <p className="text-sm text-muted-foreground">
                    {t('instructor_discounts_page.subtitle')}
                  </p>
                </div>
              </div>
              <AntButton type="primary" onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                {t('instructor_discounts_page.actions.create_discount')}
              </AntButton>
            </div>
          </motion.div>


          <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6" variants={fadeInUp}>
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Tag className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('instructor_discounts_page.stats.active_codes')}</p>
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
                  <p className="text-sm text-muted-foreground">{t('instructor_discounts_page.stats.total_usage')}</p>
                  <p className="text-2xl font-bold">{totalUsage.toLocaleString()}</p>
                </div>
              </div>
            </Card>
          </motion.div>


          <motion.div className="mb-6 flex gap-4" variants={fadeInUp}>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('instructor_discounts_page.filters.search_placeholder')}
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
                <SelectItem value="all">{t('instructor_discounts_page.filters.all_status')}</SelectItem>
                <SelectItem value="active">{t('instructor_discounts_page.status.active')}</SelectItem>
                <SelectItem value="expired">{t('instructor_discounts_page.status.expired')}</SelectItem>
                <SelectItem value="disabled">{t('instructor_discounts_page.status.disabled')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger className="w-60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('instructor_discounts_page.filters.all_courses')}</SelectItem>
                {instructorCourses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </motion.div>


          <motion.div className="border rounded-lg overflow-hidden" variants={fadeInUp}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('instructor_discounts_page.table.headers.code')}</TableHead>
                  <TableHead>{t('instructor_discounts_page.table.headers.type')}</TableHead>
                  <TableHead>{t('instructor_discounts_page.table.headers.value')}</TableHead>
                  <TableHead>{t('instructor_discounts_page.table.headers.usage')}</TableHead>
                  <TableHead>{t('instructor_discounts_page.table.headers.courses')}</TableHead>
                  <TableHead>{t('instructor_discounts_page.table.headers.expiry')}</TableHead>
                  <TableHead>{t('instructor_discounts_page.table.headers.status')}</TableHead>
                  <TableHead className="text-right">{t('instructor_discounts_page.table.headers.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {t('instructor_discounts_page.table.loading')}
                    </TableCell>
                  </TableRow>
                ) : discounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {t('instructor_discounts_page.table.empty')}
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
                            {getTypeLabel(discount.type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {discount.type === 'percentage' ? `${discount.value}%` : `${Number(discount.value).toLocaleString('vi-VN')}₫`}
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
                            {t('instructor_discounts_page.table.courses_count', {
                              count: discount.applicableCourses.length,
                            })}
                          </div>
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
                            {getStatusLabel(discount.status)}
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
                                {t('instructor_discounts_page.actions.edit')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleCopyCode(discount.code)}>
                                <Copy className="h-4 w-4 mr-2" />
                                {t('instructor_discounts_page.actions.copy_code')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteDiscount(discount.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {t('instructor_discounts_page.actions.delete')}
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
                {t('instructor_discounts_page.pagination.showing', {
                  from: Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, totalCount),
                  to: Math.min((currentPage - 1) * ITEMS_PER_PAGE + discounts.length, totalCount),
                  total: totalCount,
                })}
              </div>
              <UserPagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </motion.div>
          )}
      </motion.div>


          <AntModal
            open={isCreateDialogOpen}
            title={t('instructor_discounts_page.create_dialog.title')}
            onCancel={closeCreateDialog}
            footer={null}
            width={720}
            destroyOnClose
          >
            <p className="mb-4 text-sm text-muted-foreground">
              {t('instructor_discounts_page.create_dialog.description')}
            </p>
            {renderDiscountForm('create')}
          </AntModal>

          <AntModal
            open={isEditDialogOpen}
            title={t('instructor_discounts_page.edit_dialog.title')}
            onCancel={closeEditDialog}
            footer={null}
            width={720}
            destroyOnClose
          >
            <p className="mb-4 text-sm text-muted-foreground">
              {t('instructor_discounts_page.edit_dialog.description')}
            </p>
            {renderDiscountForm('edit')}
          </AntModal>
    </motion.div>
  )
}
