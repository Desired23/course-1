import { HeroSection } from "../../components/HeroSection"
import { TrustedCompanies } from "../../components/TrustedCompanies"
import { Categories } from "../../components/Categories"
import { FeaturedCourses } from "../../components/FeaturedCourses"
import { FeaturesSection } from "../../components/FeaturesSection"
import { TrendingCourses } from "../../components/TrendingCourses"
import { TestimonialsSection } from "../../components/TestimonialsSection"
import { StatsSection } from "../../components/StatsSection"
import { InstructorPromo } from "../../components/InstructorPromo"

export function SimpleHomePage() {
  return (
    <>
      <HeroSection />
      <TrustedCompanies />
      <FeaturesSection />
      <Categories />
      <FeaturedCourses />
      <StatsSection />
      <TrendingCourses />
      <TestimonialsSection />
      <InstructorPromo />
    </>
  )
}