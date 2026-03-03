import { motion } from 'motion/react'
import { Users, Award, BookOpen, Star } from 'lucide-react'
import { Button } from '../components/ui/button'
import { useRouter } from '../components/Router'
import { useTranslation } from 'react-i18next'
import { useState, useEffect } from 'react'
import { getPublicStats, type PublicStats } from '../services/course.api'

function formatLargeNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M+`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K+`
  return `${n}+`
}

export function StatsSection() {
  const { t } = useTranslation()
  const { navigate } = useRouter()
  const [apiStats, setApiStats] = useState<PublicStats | null>(null)

  useEffect(() => {
    getPublicStats()
      .then(setApiStats)
      .catch(() => {})
  }, [])

  const stats = [
    {
      icon: Users,
      value: apiStats ? formatLargeNumber(apiStats.total_students) : '...',
      label: t('stats.students_worldwide'),
      color: 'text-blue-500'
    },
    {
      icon: BookOpen,
      value: apiStats ? formatLargeNumber(apiStats.total_courses) : '...',
      label: t('stats.online_courses'),
      color: 'text-purple-500'
    },
    {
      icon: Award,
      value: apiStats ? formatLargeNumber(apiStats.total_instructors) : '...',
      label: t('stats.expert_instructors'),
      color: 'text-orange-500'
    },
    {
      icon: Star,
      value: apiStats ? `${apiStats.avg_rating.toFixed(1)}/5` : '...',
      label: t('stats.average_rating'),
      color: 'text-yellow-500'
    }
  ]

  return (
    <section className="py-20 px-4 bg-gradient-to-br from-purple-600 to-blue-600 text-white">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl font-bold mb-4"
          >
            {t('stats.title')}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-xl opacity-90"
          >
            {t('stats.subtitle')}
          </motion.p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="text-center"
            >
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <stat.icon className={`w-8 h-8 ${stat.color}`} />
                </div>
              </div>
              <div className="text-4xl font-bold mb-2">{stat.value}</div>
              <div className="text-lg opacity-90">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-center mt-12"
        >
          <Button 
            size="lg" 
            onClick={() => navigate('/courses')}
            className="bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-800 font-semibold shadow-lg hover:scale-105 transition-all"
          >
            {t('stats.start_learning')}
          </Button>
        </motion.div>
      </div>
    </section>
  )
}