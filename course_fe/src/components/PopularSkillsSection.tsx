import { useRouter } from "./Router"
import { getHomepageConfig } from "../data/db-extended"
import { TrendingUp } from "lucide-react"
import { useTranslation } from "react-i18next"

export function PopularSkillsSection() {
  const { t } = useTranslation()
  const { navigate } = useRouter()
  const config = getHomepageConfig()
  const skills = config.popular_skills

  return (
    <section className="py-16 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4">
            <TrendingUp className="w-5 h-5" />
            <span className="text-sm font-semibold">{t('popular_skills.trending_label')}</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t('popular_skills.title')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            {t('popular_skills.subtitle')}
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 max-w-5xl mx-auto">
          {skills.map((skill, index) => (
            <button
              key={index}
              onClick={() => navigate('/courses', { query: skill })}
              className="group px-6 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-full hover:border-primary hover:bg-primary/5 transition-all duration-300 hover:scale-105"
            >
              <span className="font-medium text-gray-700 dark:text-gray-300 group-hover:text-primary">
                {skill}
              </span>
            </button>
          ))}
        </div>


        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-8 bg-white dark:bg-gray-800 px-8 py-4 rounded-lg shadow-md">
            <div>
              <div className="text-3xl font-bold text-primary">5,000+</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{t('popular_skills.courses_count')}</div>
            </div>
            <div className="w-px h-12 bg-gray-200 dark:bg-gray-700"></div>
            <div>
              <div className="text-3xl font-bold text-primary">800K+</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{t('popular_skills.students_count')}</div>
            </div>
            <div className="w-px h-12 bg-gray-200 dark:bg-gray-700"></div>
            <div>
              <div className="text-3xl font-bold text-primary">1,200+</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{t('popular_skills.instructors_count')}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}