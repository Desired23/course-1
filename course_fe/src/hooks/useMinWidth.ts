import { useEffect, useState } from "react"

export function useMinWidth(minWidth: number) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined") return false
    return window.innerWidth >= minWidth
  })

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(min-width: ${minWidth}px)`)
    const updateMatch = () => setMatches(window.innerWidth >= minWidth)

    updateMatch()
    mediaQuery.addEventListener("change", updateMatch)

    return () => mediaQuery.removeEventListener("change", updateMatch)
  }, [minWidth])

  return matches
}
