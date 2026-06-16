import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from './ui/badge'
import { Card } from './ui/card'
import { ScrollArea } from './ui/scroll-area'
import { AlertCircle, PlayCircle } from 'lucide-react'
import { toast } from 'sonner'
import { formatTranscriptTime, type LessonTranscriptDTO } from '../services/transcript.api'

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

  const activeSegmentId = useMemo(() => {
    if (!transcript) return null
    const currentMs = Math.floor(currentTime * 1000)
    const active = transcript.segments.find(
      (segment) => currentMs >= segment.start_ms && currentMs <= segment.end_ms
    )
    return active?.id ?? null
  }, [currentTime, transcript])

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

  const seekToTime = (seconds: number) => {
    if (!videoRef.current) return
    videoRef.current.currentTime = seconds
    setCurrentTime(seconds)
  }

  useEffect(() => {
    if (!externalSeekRequest || !videoRef.current) return
    const safeSeconds = Math.max(0, Math.min(externalSeekRequest.seconds, duration || Number.MAX_SAFE_INTEGER))
    videoRef.current.currentTime = safeSeconds
    setCurrentTime(safeSeconds)
  }, [externalSeekRequest, duration])

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
      <Card className="overflow-hidden">
        <div className="border-b px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-medium">{title}</h3>
              {transcript && (
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">Transcript</Badge>
                  <span>{transcript.language_code}</span>
                </div>
              )}
            </div>
          </div>
        </div>
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
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Transcript</h4>
            <span className="text-xs text-muted-foreground">{formatTranscriptTime(currentTime * 1000)}</span>
          </div>
        </div>
        {!transcript ? (
          <div className="p-6 text-sm text-muted-foreground">Published transcript is not available for this lesson.</div>
        ) : (
          <ScrollArea className="h-[32rem]">
            <div className="space-y-2 p-4">
              {transcript.segments.map((segment) => (
                <button
                  key={segment.id}
                  type="button"
                  onClick={() => seekToTime(segment.start_ms / 1000)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    activeSegmentId === segment.id ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                  }`}
                >
                  <div className="mb-2 flex items-center gap-2 text-xs text-primary">
                    <PlayCircle className="h-3.5 w-3.5" />
                    <span>{formatTranscriptTime(segment.start_ms)}</span>
                  </div>
                  <p className="text-sm leading-6">{segment.text}</p>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </Card>
    </div>
  )
}
