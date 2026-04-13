import { useRouter } from "./Router"
import { Button } from "./ui/button"
import { useSiteBranding } from "../hooks/useSiteBranding"
import { useTranslation } from "react-i18next"

export function HeaderSimple() {
  const { navigate } = useRouter()
  const { siteLogo, siteName } = useSiteBranding()
  const { t } = useTranslation()

  return (
    <header className="border-b bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            {siteLogo ? (
              <img
                src={siteLogo}
                alt={siteName}
                className="h-8 w-auto max-w-[132px] object-contain shrink-0"
              />
            ) : (
              <>
                <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
                  <span className="text-primary-foreground font-bold">U</span>
                </div>
                <span className="font-bold text-xl">{siteName}</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <Button onClick={() => navigate('/login')}>{t('auth.login')}</Button>
            <Button onClick={() => navigate('/signup')}>{t('auth.signup')}</Button>
          </div>
        </div>
      </div>
    </header>
  )
}
