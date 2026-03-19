import { Moon, Sun } from 'lucide-react'
import { Button } from './ui/button'
import { useUIStore } from '../stores'

export function DarkModeToggle() {
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
          <span className="hidden sm:inline">Light</span>
        </>
      ) : (
        <>
          <Moon className="h-4 w-4" />
          <span className="hidden sm:inline">Dark</span>
        </>
      )}
    </Button>
  )
}
