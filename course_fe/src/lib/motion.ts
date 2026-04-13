import type { Transition, Variants } from 'motion/react'
import type { CSSProperties } from 'react'

export const MOTION_DURATIONS = {
  fast: 0.16,
  base: 0.24,
  slow: 0.36,
} as const

export const MOTION_EASING = {
  standard: [0.22, 1, 0.36, 1],
  exit: [0.4, 0, 1, 1],
} as const

export const routeTransition: Transition = {
  duration: MOTION_DURATIONS.base,
  ease: MOTION_EASING.standard,
}

export const routeTransitionVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

export const reducedRouteTransitionVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

export const dashboardContentTransition: Transition = {
  duration: MOTION_DURATIONS.fast,
  ease: MOTION_EASING.standard,
}

export const dashboardContentVariants: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
}

export const reducedDashboardContentVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

export const interactiveTransitionStyle: CSSProperties = {
  transitionDuration: 'var(--motion-duration-base)',
  transitionTimingFunction: 'var(--motion-ease-standard)',
}

export const listItemTransition = (index: number): Transition => ({
  duration: MOTION_DURATIONS.base,
  ease: MOTION_EASING.standard,
  delay: Math.min(index * 0.035, 0.2),
})
