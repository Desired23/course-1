import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import {
  Award,
  BookOpen,
  ChevronRight,
  Mail,
  Search,
  Shield,
  Star,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from "lucide-react"
import { Button } from "../../components/ui/button"
import { Card, CardContent } from "../../components/ui/card"
import { Input } from "../../components/ui/input"
import { useAuth } from "../../contexts/AuthContext"
import { useOwnedCourses } from "../../hooks/useOwnedCourses"
import { useRouter } from "../../components/Router"
import { useIsMobile } from "../../components/ui/use-mobile"
import { CourseCard } from "../../components/CourseCard"
import {
  formatDuration,
  formatPrice,
  getAllCourses,
  getCourses,
  getEffectivePrice,
  getLevelLabel,
  getPublicStats,
  hasActiveDiscount,
  parseDecimal,
  type CourseListItem,
  type CourseListParams,
} from "../../services/course.api"
import { HeroSection } from "../../components/HeroSection"
import { TrustedCompanies } from "../../components/TrustedCompanies"
import { Categories } from "../../components/Categories"
import { FeaturedCourses } from "../../components/FeaturedCourses"
import { TrendingCourses } from "../../components/TrendingCourses"
import { LearningGoals } from "../../components/LearningGoals"
import { TestimonialsSection } from "../../components/TestimonialsSection"
import { StatsSection } from "../../components/StatsSection"
import { InstructorPromo } from "../../components/InstructorPromo"
import { NewsletterSection } from "../../components/NewsletterSection"
import { FeaturesSection } from "../../components/FeaturesSection"
import { PopularSkillsSection } from "../../components/PopularSkillsSection"
import { resolveLocalizedText, type HomeSection, type HomeSectionType } from "./schema"

const LEGACY_COMPONENTS: Record<string, JSX.Element> = {
  HeroSection: <HeroSection />,
  TrustedCompanies: <TrustedCompanies />,
  FeaturesSection: <FeaturesSection />,
  Categories: <Categories />,
  FeaturedCourses: <FeaturedCourses />,
  LearningGoals: <LearningGoals />,
  TrendingCourses: <TrendingCourses />,
  PopularSkills: <PopularSkillsSection />,
  TestimonialsSection: <TestimonialsSection />,
  StatsSection: <StatsSection />,
  InstructorPromo: <InstructorPromo />,
  NewsletterSection: <NewsletterSection />,
}

const ICONS: Record<string, JSX.Element> = {
  Award: <Award className="h-5 w-5" />,
  Users: <Users className="h-5 w-5" />,
  Star: <Star className="h-5 w-5" />,
  BookOpen: <BookOpen className="h-5 w-5" />,
  TrendingUp: <TrendingUp className="h-5 w-5" />,
  Shield: <Shield className="h-5 w-5" />,
  Zap: <Zap className="h-5 w-5" />,
  Trophy: <Trophy className="h-5 w-5" />,
  Mail: <Mail className="h-5 w-5" />,
}

function formatLargeNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M+`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K+`
  return `${n}`
}

function getContainerClass(container: string): string {
  if (container === "full") return "w-full"
  if (container === "wide") return "mx-auto max-w-6xl px-4"
  return "container mx-auto px-4"
}

function getSpacingClass(value: string, isTop: boolean): string {
  const prefix = isTop ? "pt" : "pb"
  if (value === "sm") return `${prefix}-8`
  if (value === "lg") return `${prefix}-20`
  return `${prefix}-14`
}

function getBackgroundClass(background: string): string {
  if (background === "muted") return "bg-gray-50 dark:bg-gray-900"
  if (background === "brand") return "bg-gradient-to-r from-primary to-blue-600 text-white"
  return ""
}

function shouldShowSection(section: HomeSection, isMobile: boolean, isAuthenticated: boolean): boolean {
  if (!section.enabled) return false

  const devices = section.display_rules.devices
  if (isMobile && !devices.includes("mobile")) return false
  if (!isMobile && !devices.includes("desktop")) return false

  const audience = section.display_rules.audience
  if (audience === "guest" && isAuthenticated) return false
  if (audience === "logged_in" && !isAuthenticated) return false

  return true
}

function HeroDynamicSection({ section }: { section: HomeSection }) {
  const { i18n } = useTranslation()
  const locale = i18n.language
  const { navigate } = useRouter()
  const { isAuthenticated } = useAuth()
  const [query, setQuery] = useState("")
  const [stats, setStats] = useState<{ total_students: number; total_courses: number; avg_rating: number } | null>(null)

  const content = section.content
  const title = resolveLocalizedText(content.title, locale)
  const subtitle = resolveLocalizedText(content.subtitle, locale)
  const badge = resolveLocalizedText(content.badge, locale)
  const primaryCtaLabel = resolveLocalizedText(content.primary_cta_label, locale)
  const secondaryCtaLabel = resolveLocalizedText(content.secondary_cta_label, locale)
  const primaryCtaLink = typeof content.primary_cta_link === "string" && content.primary_cta_link ? content.primary_cta_link : "/courses"
  const secondaryCtaLink = typeof content.secondary_cta_link === "string" && content.secondary_cta_link ? content.secondary_cta_link : "/signup"
  const imageUrl = typeof content.image_url === "string" ? content.image_url : ""
  const showSearch = content.show_search !== false
  const showStats = content.show_stats !== false

  useEffect(() => {
    if (!showStats) return
    getPublicStats().then(setStats).catch(() => {})
  }, [showStats])

  const onSearch = (event: React.FormEvent) => {
    event.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return
    navigate("/courses", undefined, { query: trimmed })
  }

  return (
    <div className="grid items-center gap-10 md:grid-cols-2">
      <div className="space-y-6">
        {badge && (
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-medium shadow-sm dark:bg-gray-800">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span>{badge}</span>
          </div>
        )}

        <h1 className="text-4xl font-bold leading-tight md:text-6xl">{title}</h1>
        <p className="text-lg text-muted-foreground md:text-xl dark:text-gray-200">{subtitle}</p>

        {showSearch && (
          <form onSubmit={onSearch} className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-12 pl-11"
              placeholder={locale.startsWith("en") ? "Search courses" : "Tim khoa hoc"}
            />
          </form>
        )}

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => navigate(primaryCtaLink)}>{primaryCtaLabel || (locale.startsWith("en") ? "Explore" : "Kham pha")}</Button>
          <Button variant="outline" onClick={() => navigate(isAuthenticated ? "/courses" : secondaryCtaLink)}>
            {secondaryCtaLabel || (locale.startsWith("en") ? "Sign up" : "Dang ky")}
          </Button>
        </div>

        {showStats && (
          <div className="grid grid-cols-3 gap-4 border-t pt-4">
            <div>
              <p className="text-2xl font-bold">{stats ? formatLargeNumber(stats.total_students) : "..."}</p>
              <p className="text-xs text-muted-foreground dark:text-gray-300">{locale.startsWith("en") ? "Students" : "Hoc vien"}</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{stats ? formatLargeNumber(stats.total_courses) : "..."}</p>
              <p className="text-xs text-muted-foreground dark:text-gray-300">{locale.startsWith("en") ? "Courses" : "Khoa hoc"}</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{stats ? `${stats.avg_rating.toFixed(1)}?` : "..."}</p>
              <p className="text-xs text-muted-foreground dark:text-gray-300">{locale.startsWith("en") ? "Rating" : "Danh gia"}</p>
            </div>
          </div>
        )}
      </div>

      <div>
        {imageUrl ? (
          <img src={imageUrl} alt={title} className="w-full rounded-2xl object-cover shadow-xl" />
        ) : (
          <div className="flex min-h-[320px] items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 p-8 text-center dark:from-gray-800 dark:to-gray-700">
            <p className="text-lg font-medium text-gray-700 dark:text-gray-100">{locale.startsWith("en") ? "Add hero image" : "Them anh hero"}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function applyCourseListClientFilters(courses: CourseListItem[], section: HomeSection): CourseListItem[] {
  const dataSource = section.data_source
  const filters = typeof dataSource.filters === "object" && dataSource.filters ? (dataSource.filters as Record<string, unknown>) : {}
  const priceType = typeof filters.price_type === "string" ? filters.price_type : "all"

  if (priceType === "free") {
    return courses.filter((course) => getEffectivePrice(course) <= 0)
  }

  if (priceType === "paid") {
    return courses.filter((course) => getEffectivePrice(course) > 0)
  }

  return courses
}

function createCourseQuery(section: HomeSection): CourseListParams {
  const dataSource = section.data_source
  const filters = typeof dataSource.filters === "object" && dataSource.filters ? (dataSource.filters as Record<string, unknown>) : {}
  const categoryIds = Array.isArray(filters.category_ids) ? filters.category_ids.map((id) => Number(id)).filter(Number.isFinite) : []
  const topicIds = Array.isArray(filters.topic_ids) ? filters.topic_ids.map((id) => Number(id)).filter(Number.isFinite) : []
  const sort = typeof dataSource.sort === "string" ? dataSource.sort : "featured"

  const orderingMap: Record<string, string> = {
    newest: "-created_at",
    rating: "-rating",
    popular: "-total_students",
    price_low: "price",
    price_high: "-price",
    featured: "-created_at",
  }

  return {
    page: 1,
    page_size: 100,
    status: "published",
    is_featured: filters.is_featured === true,
    category_id: categoryIds[0],
    subcategory_ids: topicIds.length > 0 ? topicIds.join(",") : undefined,
    level: typeof filters.level === "string" && filters.level ? filters.level : undefined,
    rating_min: typeof filters.rating_min === "number" ? filters.rating_min : undefined,
    ordering: orderingMap[sort] || "-created_at",
  }
}

function CourseListSection({ section }: { section: HomeSection }) {
  const { i18n } = useTranslation()
  const { navigate } = useRouter()
  const { isOwned, getProgress } = useOwnedCourses()
  const locale = i18n.language
  const [courses, setCourses] = useState<CourseListItem[]>([])
  const [loading, setLoading] = useState(true)

  const content = section.content
  const dataSource = section.data_source

  const heading = resolveLocalizedText(content.heading, locale)
  const subheading = resolveLocalizedText(content.subheading, locale)
  const viewAllLabel = resolveLocalizedText(content.view_all_label, locale)
  const viewAllLink = typeof content.view_all_link === "string" && content.view_all_link ? content.view_all_link : "/courses"

  const mode = typeof dataSource.mode === "string" ? dataSource.mode : "hybrid"
  const limit = typeof dataSource.limit === "number" ? Math.max(1, Math.min(24, dataSource.limit)) : 8
  const pinnedIds = Array.isArray(dataSource.pinned_course_ids)
    ? dataSource.pinned_course_ids.map((id) => Number(id)).filter(Number.isFinite)
    : []

  useEffect(() => {
    let cancelled = false

    async function loadCourses() {
      setLoading(true)
      try {
        const query = createCourseQuery(section)
        const [autoResult, allCourses] = await Promise.all([
          mode === "manual" ? Promise.resolve([] as CourseListItem[]) : getCourses(query).then((res) => res.results),
          mode === "auto" || pinnedIds.length === 0 ? Promise.resolve([] as CourseListItem[]) : getAllCourses({ status: "published" }),
        ])

        const pinned = pinnedIds.length
          ? allCourses
              .filter((course) => pinnedIds.includes(course.id))
              .sort((a, b) => pinnedIds.indexOf(a.id) - pinnedIds.indexOf(b.id))
          : []

        let merged: CourseListItem[] = []
        if (mode === "manual") merged = pinned
        else if (mode === "auto") merged = autoResult
        else {
          const map = new Map<number, CourseListItem>()
          for (const course of pinned) map.set(course.id, course)
          for (const course of autoResult) {
            if (!map.has(course.id)) map.set(course.id, course)
          }
          merged = Array.from(map.values())
        }

        const filtered = applyCourseListClientFilters(merged, section).slice(0, limit)

        if (!cancelled) {
          setCourses(filtered)
          setLoading(false)
        }
      } catch {
        if (!cancelled) {
          setCourses([])
          setLoading(false)
        }
      }
    }

    void loadCourses()

    return () => {
      cancelled = true
    }
  }, [mode, limit, pinnedIds.join(","), section])

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold">{heading}</h2>
          {subheading ? <p className="mt-1 text-muted-foreground">{subheading}</p> : null}
        </div>
        <Button variant="outline" onClick={() => navigate(viewAllLink)}>
          {viewAllLabel || (locale.startsWith("en") ? "View all" : "Xem tat ca")}
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: Math.min(limit, 4) }).map((_, index) => (
            <div key={index} className="h-72 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {locale.startsWith("en") ? "No courses match this section configuration." : "Khong co khoa hoc phu hop cau hinh section."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              title={course.title}
              instructor={course.instructor_name || "Unknown"}
              image={course.thumbnail || ""}
              rating={parseDecimal(course.rating)}
              reviews={course.total_reviews}
              price={formatPrice(getEffectivePrice(course))}
              originalPrice={hasActiveDiscount(course) ? formatPrice(parseDecimal(course.price)) : undefined}
              duration={formatDuration(course.duration)}
              students={course.total_students >= 1000 ? `${Math.floor(course.total_students / 1000)}K+` : `${course.total_students}`}
              level={getLevelLabel(course.level)}
              category={course.category_name || ""}
              isOwned={isOwned(course.id)}
              progress={getProgress(course.id)}
              courseId={`course-${course.id}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function PromoBannerSection({ section }: { section: HomeSection }) {
  const { i18n } = useTranslation()
  const { navigate } = useRouter()
  const locale = i18n.language
  const content = section.content

  const title = resolveLocalizedText(content.title, locale)
  const description = resolveLocalizedText(content.description, locale)
  const ctaLabel = resolveLocalizedText(content.cta_label, locale)
  const ctaLink = typeof content.cta_link === "string" ? content.cta_link : "/courses"
  const imageUrl = typeof content.image_url === "string" ? content.image_url : ""
  const style = typeof content.style_variant === "string" ? content.style_variant : "solid"

  const backgroundClass =
    style === "outline"
      ? "border border-primary/40 bg-white dark:bg-gray-900"
      : "bg-gradient-to-r from-orange-500 to-pink-600 text-white"

  return (
    <div className={`overflow-hidden rounded-2xl ${backgroundClass}`}>
      <div className="grid items-center gap-6 p-6 md:grid-cols-2 md:p-10">
        <div>
          <h3 className="text-3xl font-bold">{title}</h3>
          <p className={`mt-3 ${style === "outline" ? "text-muted-foreground" : "text-white/90"}`}>{description}</p>
          <Button className="mt-6" variant={style === "outline" ? "default" : "secondary"} onClick={() => navigate(ctaLink)}>
            {ctaLabel || (locale.startsWith("en") ? "Explore" : "Kham pha")}
          </Button>
        </div>
        {imageUrl ? <img src={imageUrl} alt={title} className="max-h-[280px] w-full rounded-xl object-cover" /> : null}
      </div>
    </div>
  )
}

function BadgeStripSection({ section }: { section: HomeSection }) {
  const { i18n } = useTranslation()
  const locale = i18n.language
  const content = section.content
  const heading = resolveLocalizedText(content.heading, locale)
  const subheading = resolveLocalizedText(content.subheading, locale)
  const items = Array.isArray(content.items) ? content.items : []

  return (
    <div>
      {(heading || subheading) && (
        <div className="mb-6 text-center">
          {heading ? <h2 className="text-3xl font-bold">{heading}</h2> : null}
          {subheading ? <p className="mt-2 text-muted-foreground">{subheading}</p> : null}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item, index) => {
          const record = typeof item === "object" && item ? (item as Record<string, unknown>) : {}
          const iconName = typeof record.icon === "string" ? record.icon : "Award"
          const label = resolveLocalizedText(record.label, locale)
          const sublabel = resolveLocalizedText(record.sublabel, locale)

          return (
            <Card key={index}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-full bg-primary/10 p-2 text-primary">{ICONS[iconName] || ICONS.Award}</div>
                <div>
                  <p className="font-medium">{label}</p>
                  {sublabel ? <p className="text-sm text-muted-foreground">{sublabel}</p> : null}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function FeatureGridSection({ section }: { section: HomeSection }) {
  const { i18n } = useTranslation()
  const locale = i18n.language
  const content = section.content
  const heading = resolveLocalizedText(content.heading, locale)
  const subheading = resolveLocalizedText(content.subheading, locale)
  const items = Array.isArray(content.items) ? content.items : []

  return (
    <div>
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold">{heading}</h2>
        {subheading ? <p className="mt-2 text-muted-foreground">{subheading}</p> : null}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => {
          const record = typeof item === "object" && item ? (item as Record<string, unknown>) : {}
          const iconName = typeof record.icon === "string" ? record.icon : "Zap"
          const title = resolveLocalizedText(record.title, locale)
          const description = resolveLocalizedText(record.description, locale)

          return (
            <Card key={index} className="h-full">
              <CardContent className="space-y-3 p-6">
                <div className="inline-flex rounded-full bg-primary/10 p-2 text-primary">{ICONS[iconName] || ICONS.Zap}</div>
                <h3 className="text-xl font-semibold">{title}</h3>
                <p className="text-muted-foreground">{description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function TestimonialSection({ section }: { section: HomeSection }) {
  const { i18n } = useTranslation()
  const locale = i18n.language
  const content = section.content
  const heading = resolveLocalizedText(content.heading, locale)
  const subheading = resolveLocalizedText(content.subheading, locale)
  const items = Array.isArray(content.items) ? content.items : []

  return (
    <div>
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold">{heading}</h2>
        {subheading ? <p className="mt-2 text-muted-foreground">{subheading}</p> : null}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => {
          const record = typeof item === "object" && item ? (item as Record<string, unknown>) : {}
          const name = typeof record.name === "string" ? record.name : ""
          const role = typeof record.role === "string" ? record.role : ""
          const contentText = resolveLocalizedText(record.content, locale)
          const rating = typeof record.rating === "number" ? Math.max(1, Math.min(5, Math.round(record.rating))) : 5

          return (
            <Card key={index} className="h-full">
              <CardContent className="space-y-4 p-6">
                <div className="flex text-yellow-500">
                  {Array.from({ length: rating }).map((_, starIndex) => (
                    <Star key={starIndex} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="italic text-muted-foreground">"{contentText}"</p>
                <div>
                  <p className="font-semibold">{name}</p>
                  {role ? <p className="text-sm text-muted-foreground">{role}</p> : null}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function StatsDynamicSection({ section }: { section: HomeSection }) {
  const { i18n } = useTranslation()
  const locale = i18n.language
  const content = section.content
  const [apiStats, setApiStats] = useState<{ total_students: number; total_courses: number; total_instructors: number; avg_rating: number } | null>(null)

  const usePublicStats = content.use_public_stats !== false

  useEffect(() => {
    if (!usePublicStats) return
    getPublicStats().then(setApiStats).catch(() => {})
  }, [usePublicStats])

  const heading = resolveLocalizedText(content.heading, locale)
  const subheading = resolveLocalizedText(content.subheading, locale)

  const configuredItems = Array.isArray(content.items) ? content.items : []

  const fallbackItems = [
    { label: locale.startsWith("en") ? "Students" : "Hoc vien", value: apiStats ? formatLargeNumber(apiStats.total_students) : "...", icon: "Users" },
    { label: locale.startsWith("en") ? "Courses" : "Khoa hoc", value: apiStats ? formatLargeNumber(apiStats.total_courses) : "...", icon: "BookOpen" },
    { label: locale.startsWith("en") ? "Instructors" : "Giang vien", value: apiStats ? formatLargeNumber(apiStats.total_instructors) : "...", icon: "Award" },
    { label: locale.startsWith("en") ? "Rating" : "Danh gia", value: apiStats ? `${apiStats.avg_rating.toFixed(1)}/5` : "...", icon: "Star" },
  ]

  const items = configuredItems.length > 0
    ? configuredItems.map((item) => {
        const record = typeof item === "object" && item ? (item as Record<string, unknown>) : {}
        return {
          label: resolveLocalizedText(record.label, locale),
          value: typeof record.value === "string" ? record.value : "",
          sublabel: resolveLocalizedText(record.sublabel, locale),
          icon: typeof record.icon === "string" ? record.icon : "Award",
        }
      })
    : fallbackItems

  return (
    <div>
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold">{heading}</h2>
        {subheading ? <p className="mt-2 text-muted-foreground">{subheading}</p> : null}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {items.map((item, index) => (
          <Card key={index}>
            <CardContent className="space-y-2 p-5 text-center">
              <div className="mx-auto inline-flex rounded-full bg-primary/10 p-2 text-primary">{ICONS[item.icon] || ICONS.Award}</div>
              <p className="text-2xl font-bold">{item.value}</p>
              <p className="text-sm text-muted-foreground">{item.label}</p>
              {item.sublabel ? <p className="text-xs text-muted-foreground">{item.sublabel}</p> : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function NewsletterDynamicSection({ section }: { section: HomeSection }) {
  const { i18n } = useTranslation()
  const locale = i18n.language
  const [email, setEmail] = useState("")
  const [subscribed, setSubscribed] = useState(false)
  const content = section.content

  const title = resolveLocalizedText(content.title, locale)
  const subtitle = resolveLocalizedText(content.subtitle, locale)
  const placeholder = resolveLocalizedText(content.email_placeholder, locale)
  const subscribeLabel = resolveLocalizedText(content.subscribe_label, locale)
  const privacyNote = resolveLocalizedText(content.privacy_note, locale)

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const trimmed = email.trim()
    if (!trimmed || !trimmed.includes("@")) {
      toast.error(locale.startsWith("en") ? "Invalid email" : "Email khong hop le")
      return
    }

    setSubscribed(true)
    setEmail("")
    toast.success(locale.startsWith("en") ? "Subscribed successfully" : "Dang ky thanh cong")
    setTimeout(() => setSubscribed(false), 3000)
  }

  return (
    <div className="rounded-2xl bg-gradient-to-r from-primary to-blue-600 px-6 py-10 text-white md:px-12">
      <div className="mx-auto max-w-3xl text-center">
        <div className="mx-auto mb-4 inline-flex rounded-full bg-white/20 p-3">
          <Mail className="h-6 w-6" />
        </div>
        <h2 className="text-3xl font-bold">{title}</h2>
        <p className="mt-3 text-white/90">{subtitle}</p>

        {!subscribed ? (
          <form onSubmit={handleSubmit} className="mx-auto mt-6 flex max-w-md flex-col gap-2 sm:flex-row">
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="bg-white text-gray-900"
              placeholder={placeholder || (locale.startsWith("en") ? "Enter email" : "Nhap email")}
            />
            <Button type="submit" className="bg-white text-gray-900 hover:bg-gray-100">
              {subscribeLabel || (locale.startsWith("en") ? "Subscribe" : "Dang ky")}
            </Button>
          </form>
        ) : (
          <div className="mx-auto mt-6 max-w-md rounded-lg bg-white/20 px-4 py-3">{locale.startsWith("en") ? "Thanks for subscribing!" : "Cam on ban da dang ky!"}</div>
        )}

        {privacyNote ? <p className="mt-4 text-xs text-white/80">{privacyNote}</p> : null}
      </div>
    </div>
  )
}

function CustomHtmlSection({ section }: { section: HomeSection }) {
  const { i18n } = useTranslation()
  const locale = i18n.language
  const content = section.content
  const title = resolveLocalizedText(content.title, locale)
  const html = typeof content.html === "string" ? content.html : ""

  return (
    <div>
      {title ? <h2 className="mb-4 text-3xl font-bold">{title}</h2> : null}
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}

function LegacySection({ section }: { section: HomeSection }) {
  const dataSource = section.data_source
  const componentName = typeof dataSource.component === "string" ? dataSource.component : ""

  if (!componentName) return null

  const component = LEGACY_COMPONENTS[componentName]
  if (!component) {
    console.warn(`[home-schema] Unknown legacy component: ${componentName}`)
    return null
  }

  return component
}

export interface SectionRegistryItem {
  type: HomeSectionType
  defaults: () => HomeSection
  validate: (section: HomeSection) => HomeSection
  render: (section: HomeSection) => JSX.Element | null
  adminForm?: string
}

function renderSectionByType(section: HomeSection): JSX.Element | null {
  switch (section.type) {
    case "hero":
      return <HeroDynamicSection section={section} />
    case "course_list":
      return <CourseListSection section={section} />
    case "promo_banner":
      return <PromoBannerSection section={section} />
    case "badge_strip":
      return <BadgeStripSection section={section} />
    case "feature_grid":
      return <FeatureGridSection section={section} />
    case "testimonial":
      return <TestimonialSection section={section} />
    case "stats":
      return <StatsDynamicSection section={section} />
    case "newsletter":
      return <NewsletterDynamicSection section={section} />
    case "custom_html":
      return <CustomHtmlSection section={section} />
    case "legacy_component":
      return <LegacySection section={section} />
    default:
      console.warn(`[home-schema] Unsupported section type: ${(section as { type?: string }).type}`)
      return null
  }
}

export function DynamicHomeSections({ sections, previewMode = false }: { sections: HomeSection[]; previewMode?: boolean }) {
  const isMobile = useIsMobile()
  const { isAuthenticated } = useAuth()

  const visibleSections = useMemo(
    () =>
      [...sections]
        .filter((section) => (previewMode ? section.enabled : shouldShowSection(section, isMobile, isAuthenticated)))
        .sort((a, b) => a.order - b.order),
    [sections, isMobile, isAuthenticated, previewMode],
  )

  return (
    <>
      {visibleSections.map((section) => {
        const layout = section.layout
        const wrapperClass = [
          getBackgroundClass(layout.background),
          getSpacingClass(layout.spacing_top, true),
          getSpacingClass(layout.spacing_bottom, false),
        ]
          .filter(Boolean)
          .join(" ")

        return (
          <section key={section.id} className={wrapperClass} data-home-section-type={section.type}>
            <div className={getContainerClass(layout.container)}>{renderSectionByType(section)}</div>
          </section>
        )
      })}
    </>
  )
}
