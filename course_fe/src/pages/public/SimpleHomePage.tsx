import { useEffect, useState } from "react"
import { motion } from "motion/react"
import { DynamicHomeSections } from "../../features/home/DynamicHomeRenderer"
import { loadHomeSchemaV2 } from "../../features/home/service"
import { getDefaultHomeSchemaV2, normalizeHomeSchemaV2, type HomeSchemaV2, type HomeSection } from "../../features/home/schema"

const HOMEPAGE_SCHEMA_CACHE_KEY = "homepage_schema_v2_cached"

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

function getCachedHomeSchema(): HomeSchemaV2 | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(HOMEPAGE_SCHEMA_CACHE_KEY)
    if (!raw) return null
    return normalizeHomeSchemaV2(JSON.parse(raw))
  } catch {
    return null
  }
}

function cacheHomeSchema(schema: HomeSchemaV2): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(HOMEPAGE_SCHEMA_CACHE_KEY, JSON.stringify(schema))
  } catch {

  }
}

function SectionSkeleton({ section }: { section: HomeSection }) {
  const baseClass = "animate-pulse rounded-2xl bg-muted"

  if (section.type === "hero" || section.type === "legacy_component") {
    return (
      <section className="grid items-center gap-8 md:grid-cols-2">
        <div className="space-y-5">
          <div className="h-8 w-36 rounded-full bg-muted" />
          <div className="space-y-3">
            <div className="h-10 w-5/6 rounded bg-muted" />
            <div className="h-10 w-4/6 rounded bg-muted" />
          </div>
          <div className="space-y-2">
            <div className="h-5 w-full rounded bg-muted" />
            <div className="h-5 w-11/12 rounded bg-muted" />
            <div className="h-5 w-8/12 rounded bg-muted" />
          </div>
          <div className="h-12 w-full max-w-xl rounded-xl bg-muted" />
          <div className="flex flex-wrap gap-3">
            <div className="h-11 w-36 rounded-xl bg-muted" />
            <div className="h-11 w-32 rounded-xl bg-muted" />
          </div>
        </div>
        <div className="h-[340px] rounded-3xl bg-muted" />
      </section>
    )
  }

  if (section.type === "course_list") {
    return (
      <section className="space-y-5">
        <div className="space-y-2">
          <div className="h-8 w-56 rounded bg-muted" />
          <div className="h-5 w-80 max-w-full rounded bg-muted" />
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="overflow-hidden rounded-2xl border bg-card">
              <div className="h-40 bg-muted" />
              <div className="space-y-3 p-4">
                <div className="h-5 w-3/4 rounded bg-muted" />
                <div className="h-4 w-full rounded bg-muted" />
                <div className="h-4 w-2/3 rounded bg-muted" />
                <div className="flex items-center justify-between pt-2">
                  <div className="h-5 w-20 rounded bg-muted" />
                  <div className="h-5 w-16 rounded bg-muted" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (section.type === "badge_strip") {
    return (
      <section className="space-y-4">
        <div className="flex gap-3 overflow-hidden">
          <div className="h-16 w-48 rounded-2xl bg-muted" />
          <div className="h-16 w-52 rounded-2xl bg-muted" />
          <div className="h-16 w-44 rounded-2xl bg-muted" />
          <div className="h-16 w-56 rounded-2xl bg-muted" />
        </div>
      </section>
    )
  }

  if (section.type === "feature_grid" || section.type === "stats") {
    return (
      <section className="grid gap-5 md:grid-cols-3">
        <div className="h-36 rounded-3xl bg-muted" />
        <div className="h-36 rounded-3xl bg-muted" />
        <div className="h-36 rounded-3xl bg-muted" />
      </section>
    )
  }

  if (section.type === "testimonial") {
    return (
      <section className="grid gap-5 md:grid-cols-3">
        <div className="space-y-3 rounded-3xl border p-5">
          <div className="h-5 w-24 rounded bg-muted" />
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-5/6 rounded bg-muted" />
          <div className="h-4 w-3/5 rounded bg-muted" />
        </div>
        <div className="space-y-3 rounded-3xl border p-5">
          <div className="h-5 w-24 rounded bg-muted" />
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-5/6 rounded bg-muted" />
          <div className="h-4 w-3/5 rounded bg-muted" />
        </div>
        <div className="space-y-3 rounded-3xl border p-5">
          <div className="h-5 w-24 rounded bg-muted" />
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-5/6 rounded bg-muted" />
          <div className="h-4 w-3/5 rounded bg-muted" />
        </div>
      </section>
    )
  }

  if (section.type === "promo_banner" || section.type === "newsletter" || section.type === "custom_html") {
    return <section className={`h-44 ${baseClass}`} />
  }

  return <section className={`h-32 ${baseClass}`} />
}

function HomeLoadingSkeleton({ schema }: { schema: HomeSchemaV2 | null }) {
  const sections = schema?.sections?.length ? schema.sections.filter((section) => section.enabled) : getDefaultHomeSchemaV2().sections

  return (
    <motion.div
      className="min-h-screen bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div className="mx-auto max-w-6xl space-y-12 px-4 py-10 md:py-14" variants={sectionStagger} initial="hidden" animate="show">
        {sections.map((section) => (
          <motion.div key={section.id} variants={fadeInUp}>
            <SectionSkeleton section={section} />
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  )
}

export function SimpleHomePage() {
  const [schema, setSchema] = useState<HomeSchemaV2 | null>(getCachedHomeSchema)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const loaded = await loadHomeSchemaV2()
        setSchema(loaded.schema)
        cacheHomeSchema(loaded.schema)
      } catch {
        const fallback = getDefaultHomeSchemaV2()
        setSchema(fallback)
        cacheHomeSchema(fallback)
      } finally {
        setIsReady(true)
      }
    }

    void load()
  }, [])

  if (!isReady || !schema) {
    return <HomeLoadingSkeleton schema={schema} />
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      variants={sectionStagger}
    >
      <motion.div variants={fadeInUp}>
        <DynamicHomeSections sections={schema.sections} />
      </motion.div>
    </motion.div>
  )
}
