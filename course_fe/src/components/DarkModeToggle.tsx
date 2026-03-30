import { Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useUIStore } from '../stores'
import { Button } from './ui/button'

export function DarkModeToggle() {
  const { t } = useTranslation()
  const darkMode = useUIStore((state) => state.darkMode)
  const toggleTheme = useUIStore((state) => state.toggleTheme)

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      className="gap-2"
    >
      {darkMode ? (
        <>
          <Sun className="h-4 w-4" />
          <span className="hidden sm:inline">{t('dark_mode_toggle.light')}</span>
        </>
      ) : (
        <>
          <Moon className="h-4 w-4" />
          <span className="hidden sm:inline">{t('dark_mode_toggle.dark')}</span>
        </>
      )}
    </Button>
  )
}
