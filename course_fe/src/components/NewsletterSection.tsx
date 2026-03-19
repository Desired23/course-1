import { useState } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Mail, Check } from "lucide-react"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"

export function NewsletterSection() {
  const { t } = useTranslation()
  const [email, setEmail] = useState("")
  const [isSubscribed, setIsSubscribed] = useState(false)

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !email.includes("@")) {
      toast.error(t('newsletter.invalid_email'))
      return
    }

    setIsSubscribed(true)
    toast.success(t('newsletter.subscribed_success'))
    setEmail("")
    
    setTimeout(() => setIsSubscribed(false), 3000)
  }

  return (
    <section className="py-16 px-4 bg-gradient-to-r from-primary to-purple-600 text-white">
      <div className="container mx-auto">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8" />
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t('newsletter.title')}
          </h2>
          
          <p className="text-lg mb-8 opacity-90">
            {t('newsletter.subtitle')}
          </p>

          {!isSubscribed ? (
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <Input
                type="email"
                placeholder={t('newsletter.placeholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-white text-gray-900 border-none"
                required
              />
              <Button 
                type="submit"
                size="lg"
                className="bg-white !text-gray-900 hover:bg-gray-100 border-none"
              >
                {t('newsletter.subscribe')}
              </Button>
            </form>
          ) : (
            <div className="flex items-center justify-center gap-2 bg-white/20 rounded-lg p-4 max-w-md mx-auto">
              <Check className="w-6 h-6 text-green-400" />
              <span className="font-medium">{t('newsletter.thank_you')}</span>
            </div>
          )}

          <p className="mt-6 text-sm opacity-75">
            {t('newsletter.privacy_note')}
          </p>
        </div>
      </div>
    </section>
  )
}