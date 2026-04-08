import { useEffect, useState } from 'react'
import { BrainCircuit } from 'lucide-react'

import { AiLearningPathDialog } from './AiLearningPathDialog'
import type { LearningPathDetail } from '../services/learning-paths.api'

const OPEN_EVENT = 'ai-learning-path:open'
const SAVED_EVENT = 'ai-learning-path:saved'

interface OpenAiLearningPathEventDetail {
  pathId?: number | null
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

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<OpenAiLearningPathEventDetail>
      setSelectedPathId(custom.detail?.pathId ?? null)
      setOpen(true)
    }

    window.addEventListener(OPEN_EVENT, handler)
    return () => window.removeEventListener(OPEN_EVENT, handler)
  }, [])

  return (
    <>
      <button
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
        className="fixed z-[260] flex h-14 w-14 items-center justify-center rounded-full border border-blue-300/60 bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-[0_10px_30px_rgba(14,165,233,0.45)] transition hover:scale-105 hover:from-blue-400 hover:to-cyan-300 focus:outline-none focus:ring-2 focus:ring-blue-300"
      >
        <BrainCircuit className="h-6 w-6" />
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
