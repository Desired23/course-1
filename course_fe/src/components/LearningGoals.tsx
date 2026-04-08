import { Check } from "lucide-react"
import { ImageWithFallback } from "./figma/ImageWithFallback"
import { Button } from "./ui/button"
import { useTranslation } from "react-i18next"

export function LearningGoals() {
  const { t } = useTranslation()

  const goals = [
    t('learning_goals.goal_latest_skills'),
    t('learning_goals.goal_career'),
    t('learning_goals.goal_certificate'),
    t('learning_goals.goal_upskill'),
  ]

  return (
    <section className="py-16 px-4 bg-white dark:bg-gray-950">
      <div className="container mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-3xl font-bold">
              {t('learning_goals.title')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              {t('learning_goals.subtitle')}
            </p>
            
            <div className="space-y-4">
              {goals.map((goal, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-gray-800 dark:text-gray-200">{goal}</span>
                </div>
              ))}
            </div>

            <Button size="lg" className="mt-6">
              {t('learning_goals.view_plans')}
            </Button>
          </div>

          <div className="relative">
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1610540604745-3e96fba9ccef?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsZWFybmluZyUyMGdvYWxzJTIwZWR1Y2F0aW9uJTIwdGFyZ2V0fGVufDF8fHx8MTc1OTE1NjA0NHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
              alt={t('learning_goals.image_alt')}
              className="w-full h-auto rounded-lg"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
