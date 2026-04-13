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
import { motion } from 'motion/react'

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

export function HomePage() {
  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      variants={sectionStagger}
      className="overflow-x-hidden"
    >
      <motion.div variants={fadeInUp}>
        <HeroSection />
      </motion.div>
      <motion.div variants={fadeInUp}>
        <TrustedCompanies />
      </motion.div>
      <motion.div variants={fadeInUp}>
        <FeaturesSection />
      </motion.div>
      <motion.div variants={fadeInUp}>
        <Categories />
      </motion.div>
      <motion.div variants={fadeInUp}>
        <FeaturedCourses />
      </motion.div>
      <motion.div variants={fadeInUp}>
        <LearningGoals />
      </motion.div>
      <motion.div variants={fadeInUp}>
        <TrendingCourses />
      </motion.div>
      <motion.div variants={fadeInUp}>
        <PopularSkillsSection />
      </motion.div>
      <motion.div variants={fadeInUp}>
        <TestimonialsSection />
      </motion.div>
      <motion.div variants={fadeInUp}>
        <StatsSection />
      </motion.div>
      <motion.div variants={fadeInUp}>
        <InstructorPromo />
      </motion.div>
      <motion.div variants={fadeInUp}>
        <NewsletterSection />
      </motion.div>
    </motion.main>
  )
}