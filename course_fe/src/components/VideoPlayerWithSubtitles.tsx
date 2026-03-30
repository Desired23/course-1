import { useState, useRef, useEffect } from 'react'
import { Button } from './ui/button'
import { Slider } from './ui/slider'
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Settings,
  Subtitles,
  SkipForward,
  SkipBack
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator
} from './ui/dropdown-menu'
import { useTranslation } from 'react-i18next'

interface Subtitle {
  start: number
  end: number
  text: string
}

interface VideoPlayerWithSubtitlesProps {
  videoUrl: string
  subtitles?: Subtitle[]
  availableLanguages?: { code: string; label?: string }[]
  onProgress?: (time: number) => void
  startTime?: number
  autoplay?: boolean
}

export function VideoPlayerWithSubtitles({
  videoUrl,
  subtitles = [],
  availableLanguages = [
    { code: 'en' },
    { code: 'vi' },
    { code: 'off' }
  ],
  onProgress,
  startTime = 0,
  autoplay = false
}: VideoPlayerWithSubtitlesProps) {
  const { t } = useTranslation()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(startTime)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [currentSubtitle, setCurrentSubtitle] = useState<string>('')
  const [subtitleLanguage, setSubtitleLanguage] = useState('en')
  const [quality, setQuality] = useState('auto')

  useEffect(() => {
    if (videoRef.current && startTime > 0) {
      videoRef.current.currentTime = startTime
    }
  }, [startTime])

  useEffect(() => {
    if (autoplay && videoRef.current) {
      videoRef.current.play()
      setIsPlaying(true)
    }
  }, [autoplay])

  // Update subtitles based on current time
  useEffect(() => {
    if (subtitleLanguage === 'off') {
      setCurrentSubtitle('')
      return
    }

    const subtitle = subtitles.find(
      sub => currentTime >= sub.start && currentTime <= sub.end
    )
    setCurrentSubtitle(subtitle?.text || '')
  }, [currentTime, subtitles, subtitleLanguage])

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime
      setCurrentTime(time)
      onProgress?.(time)
    }
  }

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
    }
  }

  const handleSeek = (value: number[]) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value[0]
      setCurrentTime(value[0])
    }
  }

  const handleVolumeChange = (value: number[]) => {
    if (videoRef.current) {
      const vol = value[0]
      videoRef.current.volume = vol
      setVolume(vol)
      setIsMuted(vol === 0)
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const handlePlaybackRateChange = (rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate
      setPlaybackRate(rate)
    }
  }

  const handleFullscreen = () => {
    if (videoRef.current?.parentElement) {
      if (document.fullscreenElement) {
        document.exitFullscreen()
      } else {
        videoRef.current.parentElement.requestFullscreen()
      }
    }
  }

  const skip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds
    }
  }

  const formatTime = (time: number) => {
    const hours = Math.floor(time / 3600)
    const minutes = Math.floor((time % 3600) / 60)
    const seconds = Math.floor(time % 60)
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="relative bg-black rounded-lg overflow-hidden group">
      {/* Video Element */}
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full aspect-video"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onClick={handlePlayPause}
      />

      {/* Subtitles Overlay */}
      {currentSubtitle && subtitleLanguage !== 'off' && (
        <div className="absolute bottom-20 left-0 right-0 text-center">
          <div className="inline-block bg-black/80 text-white px-4 py-2 rounded text-lg">
            {currentSubtitle}
          </div>
        </div>
      )}

      {/* Controls Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Progress Bar */}
        <Slider
          value={[currentTime]}
          min={0}
          max={duration || 100}
          step={0.1}
          onValueChange={handleSeek}
          className="mb-4"
        />

        {/* Controls */}
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            {/* Play/Pause */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePlayPause}
              className="text-white hover:bg-white/20"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>

            {/* Skip Backward */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => skip(-10)}
              className="text-white hover:bg-white/20"
            >
              <SkipBack className="w-5 h-5" />
            </Button>

            {/* Skip Forward */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => skip(10)}
              className="text-white hover:bg-white/20"
            >
              <SkipForward className="w-5 h-5" />
            </Button>

            {/* Volume */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
                className="text-white hover:bg-white/20"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume]}
                min={0}
                max={1}
                step={0.1}
                onValueChange={handleVolumeChange}
                className="w-24"
              />
            </div>

            {/* Time */}
            <span className="text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Subtitles */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                >
                  <Subtitles className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {availableLanguages.map(lang => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => setSubtitleLanguage(lang.code)}
                  >
                    {lang.code === 'en'
                      ? t('video_player_with_subtitles.languages.en')
                      : lang.code === 'vi'
                        ? t('video_player_with_subtitles.languages.vi')
                        : lang.code === 'off'
                          ? t('video_player_with_subtitles.languages.off')
                          : lang.label}
                    {subtitleLanguage === lang.code && ' ✓'}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Settings */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                >
                  <Settings className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    {t('video_player_with_subtitles.speed')}: {playbackRate}x
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(rate => (
                      <DropdownMenuItem
                        key={rate}
                        onClick={() => handlePlaybackRateChange(rate)}
                      >
                        {rate}x {playbackRate === rate && '✓'}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    {t('video_player_with_subtitles.quality')}: {quality}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {['auto', '1080p', '720p', '480p', '360p'].map(q => (
                      <DropdownMenuItem
                        key={q}
                        onClick={() => setQuality(q)}
                      >
                        {q} {quality === q && '✓'}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Fullscreen */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleFullscreen}
              className="text-white hover:bg-white/20"
            >
              <Maximize className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
