import { useCallback, useEffect, useRef, useState } from 'react'
import { Bot } from 'lucide-react'

import { AiLearningPathDialog } from './AiLearningPathDialog'
import type { LearningPathDetail } from '../services/learning-paths.api'

const OPEN_EVENT = 'ai-learning-path:open'
const SAVED_EVENT = 'ai-learning-path:saved'

interface OpenAiLearningPathEventDetail {
  pathId?: number | null
}

type LauncherContrastMode = 'light-surface' | 'dark-surface'

function parseRgbaColor(color: string): { r: number; g: number; b: number; a: number } | null {
  const normalized = color.trim().toLowerCase()
  if (!normalized || normalized === 'transparent') return null

  const match = normalized.match(/^rgba?\((\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)(?:,\s*(\d*(?:\.\d+)?))?\)$/)
  if (!match) return null

  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3]),
    a: match[4] === undefined || match[4] === '' ? 1 : Number(match[4]),
  }
}

function getRelativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((value) => {
    const scaled = value / 255
    return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

export function openAiLearningPath(pathId?: number | null) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<OpenAiLearningPathEventDetail>(OPEN_EVENT, { detail: { pathId } }))
}

export function onAiLearningPathSaved(callback: (path: LearningPathDetail) => void) {
  if (typeof window === 'undefined') return () => {}

  const handler = (event: Event) => {
    const custom = event as CustomEvent<LearningPathDetail>
    if (custom.detail) callback(custom.detail)
  }

  window.addEventListener(SAVED_EVENT, handler)
  return () => window.removeEventListener(SAVED_EVENT, handler)
}

export function AiLearningPathLauncher() {
  const [open, setOpen] = useState(false)
  const [selectedPathId, setSelectedPathId] = useState<number | null>(null)
  const [contrastMode, setContrastMode] = useState<LauncherContrastMode>('dark-surface')
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  const updateLauncherContrast = useCallback(() => {
    if (typeof window === 'undefined' || !buttonRef.current) return

    const rect = buttonRef.current.getBoundingClientRect()
    const sampleX = Math.min(window.innerWidth - 1, Math.max(0, rect.left + rect.width / 2))
    const sampleY = Math.min(window.innerHeight - 1, Math.max(0, rect.top + rect.height / 2))

    let node = document.elementFromPoint(sampleX, sampleY) as HTMLElement | null
    let colorData: { r: number; g: number; b: number; a: number } | null = null

    while (node && node !== document.body) {
      const currentColor = parseRgbaColor(window.getComputedStyle(node).backgroundColor)
      if (currentColor && currentColor.a > 0.12) {
        colorData = currentColor
        break
      }
      node = node.parentElement
    }

    if (!colorData) {
      colorData = parseRgbaColor(window.getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 }
    }

    const luminance = getRelativeLuminance(colorData.r, colorData.g, colorData.b)
    setContrastMode(luminance >= 0.45 ? 'light-surface' : 'dark-surface')
  }, [])

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<OpenAiLearningPathEventDetail>
      setSelectedPathId(custom.detail?.pathId ?? null)
      setOpen(true)
    }

    window.addEventListener(OPEN_EVENT, handler)
    return () => window.removeEventListener(OPEN_EVENT, handler)
  }, [])

  useEffect(() => {
    let frameId = 0

    const scheduleUpdate = () => {
      if (frameId) window.cancelAnimationFrame(frameId)
      frameId = window.requestAnimationFrame(updateLauncherContrast)
    }

    scheduleUpdate()
    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate)

    return () => {
      if (frameId) window.cancelAnimationFrame(frameId)
      window.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
    }
  }, [updateLauncherContrast])

  const launcherClassName =
    contrastMode === 'light-surface'
      ? 'fixed z-[260] flex h-14 w-14 items-center justify-center rounded-full border border-slate-800/85 bg-slate-900/90 text-cyan-200 shadow-[0_10px_28px_rgba(15,23,42,0.55)] ring-2 ring-white/30 backdrop-blur-md transition hover:scale-105 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-300'
      : 'fixed z-[260] flex h-14 w-14 items-center justify-center rounded-full border border-white/80 bg-white/90 text-slate-900 shadow-[0_10px_28px_rgba(2,6,23,0.35)] ring-2 ring-black/10 backdrop-blur-md transition hover:scale-105 hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label="Mở AI tư vấn lộ trình"
        onClick={() => {
          setSelectedPathId(null)
          setOpen(true)
        }}
        style={{
          left: 'calc(env(safe-area-inset-left, 0px) + 1rem)',
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 5rem)',
        }}
        className={launcherClassName}
      >
        <Bot className="h-6 w-6" />
      </button>

      <AiLearningPathDialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen)
          if (!nextOpen) setSelectedPathId(null)
        }}
        initialPathId={selectedPathId}
        onSaved={(path) => {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent<LearningPathDetail>(SAVED_EVENT, { detail: path }))
          }
        }}
      />
    </>
  )
}
