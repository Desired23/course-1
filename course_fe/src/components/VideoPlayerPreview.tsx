import { useState, useRef } from 'react'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Slider } from './ui/slider'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Settings,
  SkipBack,
  SkipForward
} from 'lucide-react'
import { cn } from './ui/utils'
import { useTranslation } from 'react-i18next'

interface VideoPlayerPreviewProps {
  videoUrl?: string
  title: string
  duration: string
  className?: string
}

export function VideoPlayerPreview({
  videoUrl,
  title,
  duration,
  className
}: VideoPlayerPreviewProps) {
  const { t } = useTranslation()
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState([75])
  const [progress, setProgress] = useState([0])
  const [showControls, setShowControls] = useState(true)
  const [hasError, setHasError] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const handleVolumeChange = (value: number[]) => {
    setVolume(value)
    if (videoRef.current) {
      videoRef.current.volume = value[0] / 100
    }
  }

  const handleProgressChange = (value: number[]) => {
    setProgress(value)
    if (videoRef.current) {
      videoRef.current.currentTime = (value[0] / 100) * videoRef.current.duration
    }
  }

  const skip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Card
      className={cn("overflow-hidden bg-black relative group", className)}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(isPlaying ? false : true)}
    >

      <div className="relative aspect-video bg-black flex items-center justify-center">
        {videoUrl && !hasError ? (
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full"
            onClick={togglePlay}
            onTimeUpdate={(e) => {
              const video = e.currentTarget
              if (video.duration && !isNaN(video.duration)) {
                const progress = (video.currentTime / video.duration) * 100
                setProgress([progress])
              }
            }}
            onError={() => setHasError(true)}
            onLoadedMetadata={() => setHasError(false)}
          >
            <source src={videoUrl} type="video/mp4" />
            {t('video_player_preview.unsupported_video')}
          </video>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 text-white/60">
            <Play className="h-16 w-16" />
            <p className="text-sm">
              {hasError ? t('video_player_preview.unable_to_load') : t('video_player_preview.no_video')}
            </p>
          </div>
        )}


        {!isPlaying && videoUrl && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
          >
            <div className="bg-white/90 hover:bg-white rounded-full p-4 transition-colors">
              <Play className="h-8 w-8 text-black fill-black ml-1" />
            </div>
          </button>
        )}


        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300",
            showControls ? "opacity-100" : "opacity-0"
          )}
        >

          <Slider
            value={progress}
            onValueChange={handleProgressChange}
            max={100}
            step={0.1}
            className="mb-3 cursor-pointer"
          />


          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">

              <Button
                size="sm"
                variant="ghost"
                onClick={togglePlay}
                className="text-white hover:text-white hover:bg-white/20"
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </Button>


              <Button
                size="sm"
                variant="ghost"
                onClick={() => skip(-10)}
                className="text-white hover:text-white hover:bg-white/20"
              >
                <SkipBack className="h-4 w-4" />
              </Button>


              <Button
                size="sm"
                variant="ghost"
                onClick={() => skip(10)}
                className="text-white hover:text-white hover:bg-white/20"
              >
                <SkipForward className="h-4 w-4" />
              </Button>


              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={toggleMute}
                  className="text-white hover:text-white hover:bg-white/20"
                >
                  {isMuted || volume[0] === 0 ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>
                <Slider
                  value={volume}
                  onValueChange={handleVolumeChange}
                  max={100}
                  step={1}
                  className="w-20 cursor-pointer"
                />
              </div>


              <span className="text-xs text-white/80 ml-2">
                {videoRef.current
                  ? formatTime(videoRef.current.currentTime)
                  : '0:00'
                } / {duration || '0:00'}
              </span>
            </div>

            <div className="flex items-center gap-2">

              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:text-white hover:bg-white/20"
              >
                <Settings className="h-4 w-4" />
              </Button>


              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:text-white hover:bg-white/20"
                onClick={() => {
                  if (videoRef.current?.parentElement?.requestFullscreen) {
                    videoRef.current.parentElement.requestFullscreen()
                  }
                }}
              >
                <Maximize className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>


      <div className="p-4 bg-background border-t">
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t('video_player_preview.duration')}: {duration}
        </p>
      </div>
    </Card>
  )
}
