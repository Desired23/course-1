import { useEffect, useState } from "react"
import { HeroSection } from "../../components/HeroSection"
import { TrustedCompanies } from "../../components/TrustedCompanies"
import { Categories } from "../../components/Categories"
import { FeaturedCourses } from "../../components/FeaturedCourses"
import { FeaturesSection } from "../../components/FeaturesSection"
import { TrendingCourses } from "../../components/TrendingCourses"
import { TestimonialsSection } from "../../components/TestimonialsSection"
import { StatsSection } from "../../components/StatsSection"
import { InstructorPromo } from "../../components/InstructorPromo"
import { LearningGoals } from "../../components/LearningGoals"
import { NewsletterSection } from "../../components/NewsletterSection"
import { PopularSkillsSection } from "../../components/PopularSkillsSection"
import { getSystemSettings } from "../../services/admin.api"

interface HomeSectionSetting {
  component: string
  enabled?: boolean
  order?: number
}

const DEFAULT_LAYOUT: HomeSectionSetting[] = [
  { component: 'HeroSection', enabled: true, order: 1 },
  { component: 'TrustedCompanies', enabled: true, order: 2 },
  { component: 'FeaturesSection', enabled: true, order: 3 },
  { component: 'Categories', enabled: true, order: 4 },
  { component: 'FeaturedCourses', enabled: true, order: 5 },
  { component: 'LearningGoals', enabled: true, order: 6 },
  { component: 'TrendingCourses', enabled: true, order: 7 },
  { component: 'PopularSkills', enabled: true, order: 8 },
  { component: 'TestimonialsSection', enabled: true, order: 9 },
  { component: 'StatsSection', enabled: true, order: 10 },
  { component: 'InstructorPromo', enabled: true, order: 11 },
  { component: 'NewsletterSection', enabled: true, order: 12 },
]

const SECTION_COMPONENTS: Record<string, JSX.Element> = {
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

export function SimpleHomePage() {
  const [layout, setLayout] = useState<HomeSectionSetting[]>(DEFAULT_LAYOUT)

  useEffect(() => {
    const loadLayout = async () => {
      try {
        const settings = await getSystemSettings()
        const layoutSetting = settings.find(setting => setting.key === 'homepage_layout')
        if (!layoutSetting) return

        const parsed = JSON.parse(layoutSetting.value)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLayout(parsed)
        }
      } catch {
        // Fall back to the default public layout when no admin config exists.
      }
    }

    void loadLayout()
  }, [])

  return (
    <>
      {layout
        .filter(section => section.enabled !== false)
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map((section, index) => (
          <div key={`${section.component}-${index}`}>
            {SECTION_COMPONENTS[section.component] ?? null}
          </div>
        ))}
    </>
  )
}
