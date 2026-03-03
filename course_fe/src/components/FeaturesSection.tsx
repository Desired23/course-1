import { motion } from 'motion/react'
import { Card, CardContent } from '../components/ui/card'
import { Zap, Shield, Award, Smartphone, Globe, HeadphonesIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function FeaturesSection() {
  const { t } = useTranslation()

  const features = [
    {
      icon: Zap,
      title: t('features.learn_pace_title'),
      description: t('features.learn_pace_desc'),
      color: 'text-yellow-500 bg-yellow-500/10'
    },
    {
      icon: Shield,
      title: t('features.lifetime_title'),
      description: t('features.lifetime_desc'),
      color: 'text-blue-500 bg-blue-500/10'
    },
    {
      icon: Award,
      title: t('features.certificates_title'),
      description: t('features.certificates_desc'),
      color: 'text-purple-500 bg-purple-500/10'
    },
    {
      icon: Smartphone,
      title: t('features.mobile_title'),
      description: t('features.mobile_desc'),
      color: 'text-green-500 bg-green-500/10'
    },
    {
      icon: Globe,
      title: t('features.global_title'),
      description: t('features.global_desc'),
      color: 'text-orange-500 bg-orange-500/10'
    },
    {
      icon: HeadphonesIcon,
      title: t('features.support_title'),
      description: t('features.support_desc'),
      color: 'text-red-500 bg-red-500/10'
    }
  ]

  return (
    <section className="py-20 px-4 bg-white dark:bg-gray-950">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold mb-4">{t('features.title')}</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('features.subtitle')}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="h-full hover:shadow-xl transition-all hover:-translate-y-1">
                <CardContent className="p-6">
                  <div className={`w-14 h-14 rounded-lg ${feature.color} flex items-center justify-center mb-4`}>
                    <feature.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}