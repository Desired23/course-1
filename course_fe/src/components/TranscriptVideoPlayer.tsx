import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { LessonTranscriptDTO } from '../services/transcript.api'

export interface TranscriptVideoProgressPayload {
  percentage: number
  currentTime: number
  duration: number
  maxWatchedTime: number
}

interface TranscriptVideoPlayerProps {
  url: string
  title: string
  transcript: LessonTranscriptDTO | null
  onProgress?: (progress: TranscriptVideoProgressPayload) => void
  onComplete?: () => void
  savedProgress?: number
  completionThresholdPercent?: number
  restrictForwardSeeking?: boolean
  seekToleranceSeconds?: number
  externalSeekRequest?: { seconds: number; nonce: number } | null
}

export function TranscriptVideoPlayer({
  url,
  title,
  transcript,
  onProgress,
  onComplete,
  savedProgress = 0,
  completionThresholdPercent = 85,
  restrictForwardSeeking = true,
  seekToleranceSeconds = 2,
  externalSeekRequest = null,
}: TranscriptVideoPlayerProps) {
  const { t } = useTranslation()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const completionTriggeredRef = useRef(false)
  const maxWatchedTimeRef = useRef(0)
  const lastBlockedToastAtRef = useRef(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [videoError, setVideoError] = useState<string | null>(null)

  useEffect(() => {
    completionTriggeredRef.current = false
    maxWatchedTimeRef.current = 0
    setCurrentTime(0)
    setDuration(0)
    setVideoError(null)
  }, [url])

  const syncProgress = (nextCurrentTime: number, nextDuration: number) => {
    const updatedMaxWatched = Math.max(maxWatchedTimeRef.current, nextCurrentTime)
    maxWatchedTimeRef.current = updatedMaxWatched
    const watchedPercent = nextDuration > 0 ? (updatedMaxWatched / nextDuration) * 100 : 0
    onProgress?.({
      percentage: Math.min(watchedPercent, 100),
      currentTime: nextCurrentTime,
      duration: nextDuration,
      maxWatchedTime: updatedMaxWatched,
    })
    if (!completionTriggeredRef.current && watchedPercent >= completionThresholdPercent) {
      completionTriggeredRef.current = true
      onComplete?.()
    }
  }

  const handleLoadedMetadata = () => {
    const element = videoRef.current
    if (!element) return
    const nextDuration = element.duration || 0
    setVideoError(null)
    setDuration(nextDuration)
    const initialSeconds = nextDuration > 0 ? Math.min(nextDuration, (savedProgress / 100) * nextDuration) : 0
    element.currentTime = initialSeconds
    setCurrentTime(initialSeconds)
    maxWatchedTimeRef.current = initialSeconds
  }

  const handleTimeUpdate = () => {
    const element = videoRef.current
    if (!element) return
    const nextCurrentTime = element.currentTime
    const nextDuration = element.duration || duration
    setCurrentTime(nextCurrentTime)
    setDuration(nextDuration)
    syncProgress(nextCurrentTime, nextDuration)
  }

  const handleSeeking = () => {
    const element = videoRef.current
    if (!element || !restrictForwardSeeking) return
    const allowedTime = Math.min(duration || element.duration || 0, maxWatchedTimeRef.current + seekToleranceSeconds)
    if (element.currentTime <= allowedTime + 0.5) return
    element.currentTime = maxWatchedTimeRef.current
    const now = Date.now()
    if (now - lastBlockedToastAtRef.current > 3000) {
      toast.warning(t('video_player.seek_within_watched'))
      lastBlockedToastAtRef.current = now
    }
  }

  useEffect(() => {
    if (!externalSeekRequest || !videoRef.current) return
    const safeSeconds = Math.max(0, Math.min(externalSeekRequest.seconds, duration || Number.MAX_SAFE_INTEGER))
    videoRef.current.currentTime = safeSeconds
    setCurrentTime(safeSeconds)
  }, [externalSeekRequest, duration])

  return (
    <div className="bg-black">
      {videoError ? (
        <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 px-6 text-center text-white/80">
          <AlertCircle className="h-10 w-10 text-red-300" />
          <div>
            <p className="font-medium text-white">{t('video_player.unavailable_title')}</p>
            <p className="mt-1 text-sm text-white/70">{videoError}</p>
          </div>
        </div>
      ) : (
        <video
          ref={videoRef}
          src={url}
          controls
          className="aspect-video w-full"
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onSeeking={handleSeeking}
          onError={() => setVideoError(t('video_player.source_load_failed'))}
          onEnded={() => {
            if (!completionTriggeredRef.current) {
              completionTriggeredRef.current = true
              onComplete?.()
            }
          }}
          controlsList="nodownload"
          onContextMenu={e => e.preventDefault()}
        />
      )}
    </div>
  )
}
