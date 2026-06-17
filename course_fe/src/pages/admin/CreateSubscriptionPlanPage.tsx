import { useState, useEffect, useMemo } from 'react'
import { motion } from 'motion/react'
import { Select as AntSelect } from 'antd'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Badge } from '../../components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Switch } from '../../components/ui/switch'
import { ArrowLeft, Plus, Trash2, Loader2, Percent } from 'lucide-react'
import { useRouter } from '../../components/Router'
import { toast } from 'sonner'
import { createSubscriptionPlan } from '../../services/admin.api'
import { getCourses, type CourseListItem } from '../../services/course.api'
import { useTranslation } from 'react-i18next'

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

export function CreateSubscriptionPlanPage() {
  const { t } = useTranslation()
  const { navigate } = useRouter()

  const [planForm, setPlanForm] = useState({
    name: '',
    description: '',
    price: '',
    annual_monthly_price: '',
    status: 'active',
    is_featured: false,
    features: [''],
  })
  const [planCourseSearch, setPlanCourseSearch] = useState('')
  const [planCourseOptions, setPlanCourseOptions] = useState<CourseListItem[]>([])
  const [selectedPlanCourseIds, setSelectedPlanCourseIds] = useState<number[]>([])
  const [selectedPlanCourseLabels, setSelectedPlanCourseLabels] = useState<Record<number, string>>({})
  const [planCoursesLoading, setPlanCoursesLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    const timeoutId = window.setTimeout(async () => {
      try {
        setPlanCoursesLoading(true)
        const res = await getCourses({
          page: 1,
          page_size: 50,
          status: 'published',
          search: planCourseSearch.trim() || undefined,
          ordering: '-total_students',
        })
        if (!cancelled) {
          setPlanCourseOptions(res.results || [])
        }
      } catch {
        if (!cancelled) {
          setPlanCourseOptions([])
          toast.error(t('subscriptions_page.admin.form.courses_load_failed'))
        }
      } finally {
        if (!cancelled) setPlanCoursesLoading(false)
      }
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [planCourseSearch, t])

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)

  const monthlyPrice = Number(planForm.price)
  const annualMonthlyPrice = Number(planForm.annual_monthly_price)
  const hasAnnualMonthlyPrice = planForm.annual_monthly_price.trim() !== '' && Number.isFinite(annualMonthlyPrice) && annualMonthlyPrice > 0
  const annualTotalPrice = hasAnnualMonthlyPrice ? annualMonthlyPrice * 12 : 0
  const annualDiscountPercent = Number.isFinite(monthlyPrice) && monthlyPrice > 0 && hasAnnualMonthlyPrice
    ? Math.max(0, ((monthlyPrice - annualMonthlyPrice) / monthlyPrice) * 100)
    : 0

  const getCourseOptionLabel = (course: CourseListItem) =>
    `${course.title}${course.instructor_name ? ` - ${course.instructor_name}` : ''}`

  const planCourseSelectOptions = useMemo(() => {
    const optionMap = new Map<number, string>()
    planCourseOptions.forEach((course) => optionMap.set(course.id, getCourseOptionLabel(course)))
    Object.entries(selectedPlanCourseLabels).forEach(([courseId, label]) => {
      optionMap.set(Number(courseId), label)
    })
    return Array.from(optionMap.entries()).map(([value, label]) => ({ value, label }))
  }, [planCourseOptions, selectedPlanCourseLabels])

  const updatePlanFeature = (index: number, value: string) => {
    setPlanForm(prev => ({
      ...prev,
      features: prev.features.map((item, itemIndex) => itemIndex === index ? value : item),
    }))
  }

  const addPlanFeature = () => {
    setPlanForm(prev => ({ ...prev, features: [...prev.features, ''] }))
  }

  const removePlanFeature = (index: number) => {
    setPlanForm(prev => ({
      ...prev,
      features: prev.features.length === 1 ? [''] : prev.features.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  const handlePlanCoursesChange = (courseIds: number[]) => {
    setSelectedPlanCourseIds(courseIds)
    setSelectedPlanCourseLabels(prev => {
      const next: Record<number, string> = {}
      courseIds.forEach((courseId) => {
        const course = planCourseOptions.find((item) => item.id === courseId)
        next[courseId] = course ? getCourseOptionLabel(course) : prev[courseId] || String(courseId)
      })
      return next
    })
  }

  const handleCreatePlan = async () => {
    const parsedPrice = Number(planForm.price)
    if (!planForm.name.trim() || !Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      toast.error(t('subscriptions_page.admin.validation.name_price_required'))
      return
    }
    const parsedAnnualMonthlyPrice = planForm.annual_monthly_price.trim()
      ? Number(planForm.annual_monthly_price)
      : 0
    if (planForm.annual_monthly_price.trim() && (!Number.isFinite(parsedAnnualMonthlyPrice) || parsedAnnualMonthlyPrice <= 0)) {
      toast.error(t('subscriptions_page.admin.validation.annual_monthly_price_invalid'))
      return
    }
    if (parsedAnnualMonthlyPrice > parsedPrice) {
      toast.error(t('subscriptions_page.admin.validation.annual_monthly_price_too_high'))
      return
    }
    const calculatedYearlyDiscountPercent = parsedAnnualMonthlyPrice > 0
      ? Math.max(0, ((parsedPrice - parsedAnnualMonthlyPrice) / parsedPrice) * 100)
      : 0
    try {
      setSubmitting(true)
      await createSubscriptionPlan({
        name: planForm.name.trim(),
        description: planForm.description.trim() || undefined,
        duration_type: 'monthly',
        duration_days: 30,
        price: parsedPrice,
        status: planForm.status,
        is_featured: planForm.is_featured,
        yearly_discount_percent: Number(calculatedYearlyDiscountPercent.toFixed(2)),
        yearly_price: parsedAnnualMonthlyPrice > 0 ? parsedAnnualMonthlyPrice * 12 : undefined,
        features: planForm.features.map(item => item.trim()).filter(Boolean),
        course_ids: selectedPlanCourseIds,
      })
      toast.success(t('subscriptions_page.admin.create_success'))
      navigate('/admin/subscriptions')
    } catch {
      toast.error(t('subscriptions_page.admin.create_failed'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.div
      className="p-8 max-w-4xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div className="space-y-6" variants={sectionStagger} initial="hidden" animate="show">
        <motion.div variants={fadeInUp}>
          <Button
            variant="ghost"
            onClick={() => navigate('/admin/subscriptions')}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('subscriptions_page.admin.title')}
          </Button>
          <h1 className="text-3xl font-bold">{t('subscriptions_page.admin.create_plan_dialog_title')}</h1>
          <p className="text-muted-foreground">{t('subscriptions_page.admin.create_plan_dialog_description')}</p>
        </motion.div>

        <motion.div variants={fadeInUp}>
          <Card>
            <CardContent className="space-y-5 pt-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('subscriptions_page.admin.plan_name')}</Label>
                  <Input
                    placeholder={t('subscriptions_page.admin.plan_name_placeholder')}
                    value={planForm.name}
                    onChange={(e) => setPlanForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('subscriptions_page.admin.form.status')}</Label>
                  <Select value={planForm.status} onValueChange={(value) => setPlanForm(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{t('subscriptions_page.admin.form.status_active')}</SelectItem>
                      <SelectItem value="inactive">{t('subscriptions_page.admin.form.status_inactive')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('subscriptions_page.admin.form.monthly_price')}</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="100000"
                    value={planForm.price}
                    onChange={(e) => setPlanForm(prev => ({ ...prev, price: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('subscriptions_page.admin.form.annual_monthly_price')}</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="90000"
                    value={planForm.annual_monthly_price}
                    onChange={(e) => setPlanForm(prev => ({ ...prev, annual_monthly_price: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid gap-3 rounded-md border bg-muted/20 p-3 text-sm md:grid-cols-2">
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('subscriptions_page.admin.form.yearly_discount_percent')}</span>
                  <span className="font-semibold">{annualDiscountPercent.toFixed(annualDiscountPercent % 1 === 0 ? 0 : 1)}%</span>
                </div>
                <div className="text-muted-foreground">
                  {hasAnnualMonthlyPrice
                    ? t('subscriptions_page.admin.form.annual_price_summary', {
                        monthly: formatCurrency(annualMonthlyPrice),
                        total: formatCurrency(annualTotalPrice),
                      })
                    : t('subscriptions_page.admin.form.no_annual_discount')}
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('subscriptions_page.admin.description')}</Label>
                <Input
                  placeholder={t('subscriptions_page.admin.description_placeholder')}
                  value={planForm.description}
                  onChange={(e) => setPlanForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="flex items-center justify-between rounded-md border px-3 py-3">
                <div>
                  <Label className="block">{t('subscriptions_page.admin.mark_popular')}</Label>
                  <p className="text-xs text-muted-foreground">{t('subscriptions_page.admin.form.featured_hint')}</p>
                </div>
                <Switch
                  checked={planForm.is_featured}
                  onCheckedChange={(checked) => setPlanForm(prev => ({ ...prev, is_featured: checked }))}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>{t('subscriptions_page.admin.features')}</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addPlanFeature}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('subscriptions_page.admin.form.add_feature')}
                  </Button>
                </div>
                <div className="space-y-2">
                  {planForm.features.map((feature, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder={t('subscriptions_page.admin.form.feature_placeholder')}
                        value={feature}
                        onChange={(e) => updatePlanFeature(index, e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label={t('subscriptions_page.admin.form.remove_feature')}
                        onClick={() => removePlanFeature(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeInUp}>
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>{t('subscriptions_page.admin.form.plan_courses')}</CardTitle>
                <Badge variant="outline">
                  {t('subscriptions_page.admin.form.courses_selected', { count: selectedPlanCourseIds.length })}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <AntSelect
                mode="multiple"
                allowClear
                showSearch
                filterOption={false}
                maxTagCount="responsive"
                value={selectedPlanCourseIds}
                options={planCourseSelectOptions}
                loading={planCoursesLoading}
                placeholder={t('subscriptions_page.admin.form.course_search_placeholder')}
                notFoundContent={planCoursesLoading ? t('common.loading') : t('subscriptions_page.admin.form.courses_empty')}
                onSearch={setPlanCourseSearch}
                onChange={handlePlanCoursesChange}
                style={{ width: '100%' }}
              />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div className="flex gap-3 justify-end" variants={fadeInUp}>
          <Button variant="outline" onClick={() => navigate('/admin/subscriptions')} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleCreatePlan} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('subscriptions_page.admin.form.save_plan')}
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
