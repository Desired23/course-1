import { Globe, Facebook, Twitter, Youtube, Linkedin, Instagram } from "lucide-react"
import { Button } from "./ui/button"
import { useRouter } from "./Router"
import { getActiveCategories, type Category } from "../services/category.api"
import { cn } from "./ui/utils"
import { useTranslation } from "react-i18next"
import { useState, useEffect } from "react"
import { useSiteBranding } from "../hooks/useSiteBranding"

export function Footer() {
  const { t, i18n } = useTranslation()
  const { navigate, currentRoute } = useRouter()
  const [apiCategories, setApiCategories] = useState<Category[]>([])
  const { siteLogo, siteName } = useSiteBranding()
  const siteInitial = siteName?.charAt(0)?.toUpperCase() || "U"
  
  const isUserDashboard = 
    currentRoute.startsWith('/my-learning') ||
    currentRoute.startsWith('/cart') ||
    currentRoute.startsWith('/wishlist') ||
    currentRoute.startsWith('/user/') ||
    currentRoute.startsWith('/profile') ||
    currentRoute.startsWith('/notifications') ||
    currentRoute.startsWith('/account-settings');

  // Fetch categories from API
  useEffect(() => {
    let cancelled = false
    getActiveCategories({ page_size: 6 })
      .then(res => {
        if (!cancelled) {
          setApiCategories(res.results.filter(c => !c.parent_category).slice(0, 6))
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const footerSections = [
    {
      title: t('footer.top_categories'),
      links: apiCategories.map(cat => ({ name: cat.name, action: () => navigate('/courses', undefined, { category: String(cat.id) }) }))
    },
    {
      title: t('footer.quick_links'),
      links: [
        { name: t('footer.teach'), action: () => navigate('/teaching') },
        { name: t('footer.get_app'), action: () => navigate('/mobile') },
        { name: t('footer.about_us'), action: () => navigate('/about') },
        { name: t('footer.contact_us'), action: () => navigate('/contact') },
        { name: t('footer.careers'), action: () => navigate('/careers') }
      ]
    },
    {
      title: t('footer.community'),
      links: [
        { name: t('footer.blog'), action: () => navigate('/blog') },
        { name: t('footer.help_support'), action: () => navigate('/support') },
        { name: t('footer.affiliate'), action: () => navigate('/affiliate') },
        { name: t('footer.investors'), action: () => navigate('/investors') },
        { name: t('footer.sitemap'), action: () => navigate('/sitemap') }
      ]
    },
    {
      title: t('footer.legal'),
      links: [
        { name: t('footer.terms'), action: () => navigate('/terms') },
        { name: t('footer.privacy_policy'), action: () => navigate('/privacy') },
        { name: t('footer.cookie_settings'), action: () => {} },
        { name: t('footer.accessibility'), action: () => navigate('/accessibility') }
      ]
    }
  ]

  const socialLinks = [
    { icon: Facebook, label: t('footer.social.facebook'), url: "https://facebook.com/udemy" },
    { icon: Twitter, label: t('footer.social.twitter'), url: "https://twitter.com/udemy" },
    { icon: Youtube, label: t('footer.social.youtube'), url: "https://youtube.com/udemy" },
    { icon: Linkedin, label: t('footer.social.linkedin'), url: "https://linkedin.com/company/udemy" },
    { icon: Instagram, label: t('footer.social.instagram'), url: "https://instagram.com/udemy" }
  ]

  return (
    <footer className="bg-gray-900 text-white py-12 mt-auto">
      <div className={cn(
        "container mx-auto px-4",
        isUserDashboard && "md:pl-[80px]"
      )}>
        {/* Main Footer Content */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
          {footerSections.map((section, index) => (
            <div key={index}>
              <h3 className="font-semibold mb-4 text-white">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <button 
                      onClick={link.action}
                      className="text-gray-300 hover:text-white hover:underline transition-colors text-sm text-left"
                    >
                      {link.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          
          {/* Language Selector */}
          <div className="flex flex-col gap-4">
            <Button 
              variant="outline" 
              size="sm"
              className="bg-transparent border-gray-600 text-gray-300 hover:bg-gray-800 w-full justify-start"
            >
              <Globe className="w-4 h-4 mr-2" />
              {i18n.language === 'vi' ? t('language_switcher.vietnamese') : t('language_switcher.english')}
            </Button>
            
            {/* Social Links */}
            <div className="mt-4">
              <h3 className="font-semibold mb-3 text-white text-sm">{t('footer.follow_us')}</h3>
              <div className="flex gap-2">
                {socialLinks.map((social) => {
                  const Icon = social.icon
                  return (
                    <a
                      key={social.label}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
                      aria-label={social.label}
                    >
                      <Icon className="w-4 h-4" />
                    </a>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Newsletter Section */}
        <div className="border-t border-gray-800 pt-8 pb-8">
          <div className="max-w-2xl">
            <h3 className="font-semibold mb-2 text-white">{t('footer.stay_updated')}</h3>
            <p className="text-gray-400 text-sm mb-4">
              {t('footer.newsletter_desc')}
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder={t('footer.newsletter_placeholder')}
                className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-primary text-white placeholder-gray-500"
              />
              <Button 
                className="px-6 hover:bg-gray-200 border-none" 
                style={{ backgroundColor: '#ffffff', color: '#000000' }}
              >
                {t('footer.subscribe')}
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            {siteLogo ? (
              <img
                src={siteLogo}
                alt={siteName}
                className="h-8 w-auto max-w-[132px] object-contain shrink-0"
              />
            ) : (
              <>
                <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
                  <span className="text-black font-bold">{siteInitial}</span>
                </div>
                <span className="font-bold text-xl">{siteName}</span>
              </>
            )}
          </div>
          
          <p className="text-gray-400 text-sm text-center">
            {t('footer.copyright')}
          </p>
          
          <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
            <button onClick={() => navigate('/terms')} className="hover:text-white dark:hover:text-gray-200 transition-colors">
              {t('footer.terms')}
            </button>
            <span>•</span>
            <button onClick={() => navigate('/privacy')} className="hover:text-white dark:hover:text-gray-200 transition-colors">
              {t('footer.privacy')}
            </button>
            <span>•</span>
            <button className="hover:text-white dark:hover:text-gray-200 transition-colors">
              {t('footer.do_not_sell')}
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}
