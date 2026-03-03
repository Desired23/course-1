import { motion } from 'motion/react'
import { Button } from '../components/ui/button'
import { useRouter } from '../components/Router'
import { Play, Users, Trophy, Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function InstructorPromo() {
  const { t } = useTranslation()
  const { navigate } = useRouter()

  const benefits = [
    {
      icon: Users,
      title: t('instructor_promo.benefit_reach_title'),
      description: t('instructor_promo.benefit_reach_desc')
    },
    {
      icon: Trophy,
      title: t('instructor_promo.benefit_earn_title'),
      description: t('instructor_promo.benefit_earn_desc')
    },
    {
      icon: Clock,
      title: t('instructor_promo.benefit_flexible_title'),
      description: t('instructor_promo.benefit_flexible_desc')
    }
  ]

  return (
    <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
      <div className="container mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl font-bold mb-6">
              {t('instructor_promo.title')}
            </h2>
            <p className="text-xl mb-8 opacity-90">
              {t('instructor_promo.subtitle')}
            </p>
            
            <div className="space-y-6 mb-8">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="flex items-start gap-4"
                >
                  <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                    <benefit.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">{benefit.title}</h3>
                    <p className="opacity-90">{benefit.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <Button 
              size="lg" 
              onClick={() => navigate('/teach')}
              className="font-semibold shadow-lg hover:scale-105 transition-all hover:bg-gray-100 border-none"
              style={{ backgroundColor: '#ffffff', color: '#2563eb' }}
            >
              {t('instructor_promo.start_teaching')}
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="aspect-video bg-white/10 rounded-lg backdrop-blur-sm flex items-center justify-center">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center hover:scale-110 transition-transform cursor-pointer">
                <Play className="w-10 h-10 ml-1" />
              </div>
            </div>
            <div className="absolute -bottom-6 -right-6 bg-white text-gray-900 rounded-lg p-6 shadow-2xl max-w-xs">
              <div className="text-3xl font-bold text-purple-600 mb-2">$10K+</div>
              <div className="text-sm">{t('instructor_promo.avg_earnings')}</div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}