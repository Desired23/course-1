import { useState, useRef, useEffect } from 'react'
import { Button } from './ui/button'
import { Slider } from './ui/slider'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  Settings,
  SkipBack,
  SkipForward,
  Bookmark,
  CheckCircle
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

interface VideoPlayerProps {
  url?: string
  title: string
  onProgress?: (progress: VideoProgressPayload) => void
  onComplete?: () => void
  savedProgress?: number
  lessonId?: number
  bookmarks?: number[]
  onBookmarksChange?: (bookmarks: number[]) => void | Promise<void>
  completionThresholdPercent?: number
  restrictForwardSeeking?: boolean
  seekToleranceSeconds?: number
  externalSeekRequest?: VideoSeekRequest | null
}

export interface VideoProgressPayload {
  percentage: number
  currentTime: number
  duration: number
  maxWatchedTime: number
}

export interface VideoSeekRequest {
  seconds: number
  nonce: number
}


declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady: () => void
  }
}

export function VideoPlayer({
  url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  title,
  onProgress,
  onComplete,
  savedProgress = 0,
  lessonId,
  bookmarks = [],
  onBookmarksChange,
  completionThresholdPercent = 85,
  restrictForwardSeeking = true,
  seekToleranceSeconds = 2,
  externalSeekRequest = null,
}: VideoPlayerProps) {
  const { t } = useTranslation()
  const playerRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLDivElement>(null)
  const isMountedRef = useRef(true)
  const progressIntervalRef = useRef<NodeJS.Timeout>()

  const [playing, setPlaying] = useState(false)
  const [volume, setVolume] = useState(80)
  const [muted, setMuted] = useState(false)
  const [played, setPlayed] = useState(savedProgress / 100)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1.0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [playerReady, setPlayerReady] = useState(false)

  const controlsTimeoutRef = useRef<NodeJS.Timeout>()
  const maxWatchedTimeRef = useRef(0)
  const completionTriggeredRef = useRef(false)
  const lastBlockedToastAtRef = useRef(0)


  const getYouTubeVideoId = (url: string): string | null => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/
    const match = url.match(regExp)
    return (match && match[7].length === 11) ? match[7] : null
  }

  const videoId = getYouTubeVideoId(url)


  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      const firstScriptTag = document.getElementsByTagName('script')[0]
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
    }

    return () => {
      isMountedRef.current = false
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
      completionTriggeredRef.current = false
    }
  }, [])


  useEffect(() => {
    if (!videoId || !iframeRef.current) return

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player) {
        setTimeout(initPlayer, 100)
        return
      }


      if (playerRef.current) {
        playerRef.current.destroy()
      }

      playerRef.current = new window.YT.Player(iframeRef.current, {
        videoId: videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 0,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          fs: 0,
          playsinline: 1
        },
        events: {
          onReady: (event: any) => {
            setPlayerReady(true)
            const playerDuration = event.target.getDuration()
            setDuration(playerDuration)
            event.target.setVolume(volume)
            completionTriggeredRef.current = false

            const initialWatched = Math.max(
              0,
              Math.min(playerDuration, (savedProgress / 100) * playerDuration)
            )
            setPlayed(playerDuration > 0 ? initialWatched / playerDuration : 0)
            maxWatchedTimeRef.current = initialWatched
            if (initialWatched > 0) {
              event.target.seekTo(initialWatched, true)
            }


            progressIntervalRef.current = setInterval(() => {
              if (playerRef.current && isMountedRef.current) {
                try {
                  const currentTime = playerRef.current.getCurrentTime()
                  const duration = playerRef.current.getDuration()
                  if (!duration || duration <= 0) return

                  const maxAllowedTime = Math.min(duration, maxWatchedTimeRef.current + seekToleranceSeconds)
                  if (restrictForwardSeeking && currentTime > maxAllowedTime + 0.5) {
                    playerRef.current.seekTo(maxWatchedTimeRef.current, true)
                    const now = Date.now()
                    if (now - lastBlockedToastAtRef.current > 3000) {
                      toast.warning(t('video_player.forward_seek_locked'))
                      lastBlockedToastAtRef.current = now
                    }
                    return
                  }

                  const updatedMaxWatched = Math.max(maxWatchedTimeRef.current, currentTime)
                  if (updatedMaxWatched !== maxWatchedTimeRef.current) {
                    maxWatchedTimeRef.current = updatedMaxWatched
                  }

                  const playedFraction = currentTime / duration
                  const watchedPercent = (updatedMaxWatched / duration) * 100

                  setPlayed(playedFraction)

                  if (onProgress) {
                    onProgress({
                      percentage: Math.min(watchedPercent, 100),
                      currentTime,
                      duration,
                      maxWatchedTime: updatedMaxWatched,
                    })
                  }


                  if (!completionTriggeredRef.current && watchedPercent >= completionThresholdPercent && onComplete) {
                    completionTriggeredRef.current = true
                    onComplete()
                  }
                } catch (err) {

                }
              }
            }, 1000)
          },
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              setPlaying(true)
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              setPlaying(false)
            } else if (event.data === window.YT.PlayerState.ENDED) {
              setPlaying(false)
              if (!completionTriggeredRef.current && onComplete) {
                completionTriggeredRef.current = true
                onComplete()
              }
            }
          }
        }
      })
    }

    initPlayer()

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
      if (playerRef.current) {
        try {
          playerRef.current.destroy()
        } catch (err) {

        }
      }
    }
  }, [videoId, lessonId])


  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      if (!playerRef.current || !playerReady) {
        return
      }

      try {
        switch (e.key) {
          case ' ':
            e.preventDefault()
            togglePlay()
            break
          case 'ArrowLeft':
            e.preventDefault()
            skipBackward()
            break
          case 'ArrowRight':
            e.preventDefault()
            skipForward()
            break
          case 'ArrowUp':
            e.preventDefault()
            setVolume(v => {
              const newVol = Math.min(100, v + 10)
              playerRef.current?.setVolume(newVol)
              return newVol
            })
            break
          case 'ArrowDown':
            e.preventDefault()
            setVolume(v => {
              const newVol = Math.max(0, v - 10)
              playerRef.current?.setVolume(newVol)
              return newVol
            })
            break
          case 'm':
            e.preventDefault()
            toggleMute()
            break
          case 'f':
            e.preventDefault()
            toggleFullscreen()
            break
          case 'b':
            e.preventDefault()
            addBookmark()
            break
        }
      } catch (err) {
        console.log('Keyboard shortcut not available yet')
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [playerReady, volume, muted])


  const handleMouseMove = () => {
    setShowControls(true)
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (playing) {
        setShowControls(false)
      }
    }, 3000)
  }

  const togglePlay = () => {
    if (!playerRef.current || !playerReady) return

    try {
      const state = playerRef.current.getPlayerState()
      if (state === window.YT.PlayerState.PLAYING) {
        playerRef.current.pauseVideo()
      } else {
        playerRef.current.playVideo()
      }
    } catch (err) {
      console.log('Play/pause not available yet')
    }
  }

  const handleSeek = (value: number[]) => {
    if (!playerRef.current || !playerReady) return

    try {
      const seekTime = (value[0] / 100) * duration
      const maxAllowedTime = Math.min(duration, maxWatchedTimeRef.current + seekToleranceSeconds)
      const safeSeekTime = restrictForwardSeeking ? Math.min(seekTime, maxAllowedTime) : seekTime

      if (safeSeekTime + 0.5 < seekTime) {
        toast.warning(t('video_player.seek_within_watched'))
      }

      playerRef.current.seekTo(safeSeekTime, true)
      setPlayed(duration > 0 ? safeSeekTime / duration : 0)
    } catch (err) {
      console.log('Seek not available yet')
    }
  }

  const skipForward = () => {
    if (!playerRef.current || !playerReady) return

    try {
      const currentTime = playerRef.current.getCurrentTime()
      const desiredTime = Math.min(duration, currentTime + 10)
      const maxAllowedTime = Math.min(duration, maxWatchedTimeRef.current + seekToleranceSeconds)
      const newTime = restrictForwardSeeking ? Math.min(desiredTime, maxAllowedTime) : desiredTime
      if (newTime + 0.5 < desiredTime) {
        toast.warning(t('video_player.skip_unwatched_blocked'))
      }
      playerRef.current.seekTo(newTime, true)
    } catch (err) {
      console.log('Skip forward not available yet')
    }
  }

  const skipBackward = () => {
    if (!playerRef.current || !playerReady) return

    try {
      const currentTime = playerRef.current.getCurrentTime()
      const newTime = Math.max(0, currentTime - 10)
      playerRef.current.seekTo(newTime, true)
    } catch (err) {
      console.log('Skip backward not available yet')
    }
  }

  const toggleMute = () => {
    if (!playerRef.current || !playerReady) return

    try {
      if (muted) {
        playerRef.current.unMute()
        setMuted(false)
      } else {
        playerRef.current.mute()
        setMuted(true)
      }
    } catch (err) {
      console.log('Mute not available yet')
    }
  }

  const handleVolumeChange = (value: number[]) => {
    if (!playerRef.current || !playerReady) return

    try {
      const newVolume = value[0]
      playerRef.current.setVolume(newVolume)
      setVolume(newVolume)
      if (newVolume > 0 && muted) {
        playerRef.current.unMute()
        setMuted(false)
      }
    } catch (err) {
      console.log('Volume change not available yet')
    }
  }

  const handlePlaybackRateChange = (rate: number) => {
    if (!playerRef.current || !playerReady) return

    try {
      playerRef.current.setPlaybackRate(rate)
      setPlaybackRate(rate)
    } catch (err) {
      console.log('Playback rate change not available yet')
    }
  }

  const addBookmark = () => {
    if (!playerRef.current || !playerReady) return

    try {
      const currentTime = playerRef.current.getCurrentTime()
      const roundedTime = Math.floor(currentTime)
      const nextBookmarks = Array.from(new Set([...bookmarks, roundedTime])).sort((a, b) => a - b)
      void onBookmarksChange?.(nextBookmarks)
      toast.success(t('video_player.bookmark_added', { time: formatTime(currentTime) }))
    } catch (err) {
      console.log('Bookmark not available yet')
    }
  }

  const jumpToBookmark = (time: number) => {
    if (!playerRef.current || !playerReady) return

    try {
      const maxAllowedTime = Math.min(duration, maxWatchedTimeRef.current + seekToleranceSeconds)
      const safeTime = restrictForwardSeeking ? Math.min(time, maxAllowedTime) : time
      if (safeTime + 0.5 < time) {
        toast.warning(t('video_player.bookmark_unavailable'))
      }
      playerRef.current.seekTo(safeTime, true)
    } catch (err) {
      console.log('Jump to bookmark not available yet')
    }
  }

  useEffect(() => {
    if (!externalSeekRequest || !playerRef.current || !playerReady) return

    try {
      const requestedTime = Math.max(0, externalSeekRequest.seconds)
      const maxAllowedTime = Math.min(duration, maxWatchedTimeRef.current + seekToleranceSeconds)
      const safeTime = restrictForwardSeeking ? Math.min(requestedTime, maxAllowedTime) : requestedTime

      if (safeTime + 0.5 < requestedTime) {
        toast.warning(t('video_player.seek_within_watched'))
      }

      playerRef.current.seekTo(safeTime, true)
      setPlayed(duration > 0 ? safeTime / duration : 0)
    } catch {

    }
  }, [externalSeekRequest, duration, playerReady, restrictForwardSeeking, seekToleranceSeconds, t])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const getVolumeIcon = () => {
    if (muted || volume === 0) return <VolumeX className="w-4 h-4" />
    if (volume < 50) return <Volume1 className="w-4 h-4" />
    return <Volume2 className="w-4 h-4" />
  }

  return (
    <div
      ref={containerRef}
      className="relative bg-black group"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => playing && setShowControls(false)}
    >

      <div className="w-full" style={{ aspectRatio: '16/9' }}>
        <div ref={iframeRef} className="w-full h-full" />
      </div>


      <div
        className="absolute inset-0 flex items-center justify-center cursor-pointer"
        onClick={togglePlay}
      >
        {!playing && playerReady && (
          <div className="bg-black/50 rounded-full p-4 backdrop-blur-sm transition-opacity">
            <Play className="w-12 h-12 text-white" />
          </div>
        )}
      </div>


      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="p-4 space-y-2">

          <div className="flex items-center gap-2">
            <Slider
              value={[played * 100]}
              onValueChange={handleSeek}
              max={100}
              step={0.1}
              className="flex-1"
            />
          </div>


          {bookmarks.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {bookmarks.map((bookmark, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  onClick={() => jumpToBookmark(bookmark)}
                  className="h-6 px-2 text-xs text-white hover:bg-white/20"
                >
                  <Bookmark className="w-3 h-3 mr-1" />
                  {formatTime(bookmark)}
                </Button>
              ))}
            </div>
          )}


          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-2">

              <Button
                variant="ghost"
                size="sm"
                onClick={togglePlay}
                className="text-white hover:bg-white/20"
              >
                {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </Button>


              <Button
                variant="ghost"
                size="sm"
                onClick={skipBackward}
                className="text-white hover:bg-white/20"
              >
                <SkipBack className="w-4 h-4" />
              </Button>


              <Button
                variant="ghost"
                size="sm"
                onClick={skipForward}
                className="text-white hover:bg-white/20"
              >
                <SkipForward className="w-4 h-4" />
              </Button>


              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMute}
                  className="text-white hover:bg-white/20"
                >
                  {getVolumeIcon()}
                </Button>
                <Slider
                  value={[muted ? 0 : volume]}
                  onValueChange={handleVolumeChange}
                  max={100}
                  step={1}
                  className="w-20"
                />
              </div>


              <span className="text-sm">
                {formatTime(played * duration)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2">

              <Button
                variant="ghost"
                size="sm"
                onClick={addBookmark}
                className="text-white hover:bg-white/20"
                title="Add Bookmark (B)"
              >
                <Bookmark className="w-4 h-4" />
              </Button>


              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                  >
                    <Settings className="w-4 h-4 mr-1" />
                    {playbackRate}x
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(rate => (
                    <DropdownMenuItem
                      key={rate}
                      onClick={() => handlePlaybackRateChange(rate)}
                      className={playbackRate === rate ? 'bg-accent' : ''}
                    >
                      {rate}x {playbackRate === rate && <CheckCircle className="w-4 h-4 ml-2" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>


              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullscreen}
                className="text-white hover:bg-white/20"
                title="Fullscreen (F)"
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </Button>
            </div>
          </div>


          <div className="text-xs text-white/60 text-center">
            Shortcuts: Space (Play/Pause) • ← → (Skip 10s) • ↑ ↓ (Volume) • M (Mute) • F (Fullscreen) • B (Bookmark)
          </div>
        </div>
      </div>
    </div>
  )
}
