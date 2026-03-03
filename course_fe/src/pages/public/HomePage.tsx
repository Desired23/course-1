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

export function HomePage() {
  return (
    <>
      <HeroSection />
      <TrustedCompanies />
      <FeaturesSection />
      <Categories />
      <FeaturedCourses />
      <LearningGoals />
      <TrendingCourses />
      <PopularSkillsSection />
      <TestimonialsSection />
      <StatsSection />
      <InstructorPromo />
      <NewsletterSection />
    </>
  )
}