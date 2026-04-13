





import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

export type PlaybackRate = 0.5 | 0.75 | 1 | 1.25 | 1.5 | 1.75 | 2
export type VideoQuality = 'auto' | '360p' | '480p' | '720p' | '1080p'

interface PlayerState {

  playing: boolean
  playbackRate: PlaybackRate
  volume: number
  muted: boolean


  quality: VideoQuality
  subtitlesEnabled: boolean
  subtitleLanguage: string


  controlsVisible: boolean
  fullscreen: boolean
  theaterMode: boolean
  pipMode: boolean


  sidebarOpen: boolean
  sidebarTab: 'content' | 'notes' | 'qa' | 'reviews'


  setPlaying: (playing: boolean) => void
  setPlaybackRate: (rate: PlaybackRate) => void
  setVolume: (volume: number) => void
  toggleMute: () => void
  setQuality: (quality: VideoQuality) => void
  toggleSubtitles: () => void
  setSubtitleLanguage: (language: string) => void
  toggleFullscreen: () => void
  toggleTheaterMode: () => void
  togglePiP: () => void
  setControlsVisible: (visible: boolean) => void
  setSidebarOpen: (open: boolean) => void
  setSidebarTab: (tab: PlayerState['sidebarTab']) => void


  reset: () => void
}

const DEFAULT_STATE = {
  playing: false,
  playbackRate: 1 as PlaybackRate,
  volume: 1,
  muted: false,
  quality: 'auto' as VideoQuality,
  subtitlesEnabled: false,
  subtitleLanguage: 'vi',
  controlsVisible: true,
  fullscreen: false,
  theaterMode: false,
  pipMode: false,
  sidebarOpen: true,
  sidebarTab: 'content' as const
}

export const usePlayerStore = create<PlayerState>()(
  devtools(
    persist(
      (set, get) => ({
        ...DEFAULT_STATE,

        setPlaying: (playing) => set({ playing }),

        setPlaybackRate: (rate) => set({ playbackRate: rate }),

        setVolume: (volume) => {
          const clampedVolume = Math.max(0, Math.min(1, volume))
          set({ volume: clampedVolume, muted: clampedVolume === 0 })
        },

        toggleMute: () => set((state) => ({
          muted: !state.muted
        })),

        setQuality: (quality) => set({ quality }),

        toggleSubtitles: () => set((state) => ({
          subtitlesEnabled: !state.subtitlesEnabled
        })),

        setSubtitleLanguage: (language) => set({
          subtitleLanguage: language,
          subtitlesEnabled: true
        }),

        toggleFullscreen: () => {
          const newFullscreen = !get().fullscreen
          set({ fullscreen: newFullscreen })


          if (newFullscreen) {
            document.documentElement.requestFullscreen?.()
          } else {
            document.exitFullscreen?.()
          }
        },

        toggleTheaterMode: () => set((state) => ({
          theaterMode: !state.theaterMode
        })),

        togglePiP: () => set((state) => ({
          pipMode: !state.pipMode
        })),

        setControlsVisible: (visible) => set({ controlsVisible: visible }),

        setSidebarOpen: (open) => set({ sidebarOpen: open }),

        setSidebarTab: (tab) => set({ sidebarTab: tab }),

        reset: () => set(DEFAULT_STATE)
      }),
      {
        name: 'player-store',
        partialize: (state) => ({

          playbackRate: state.playbackRate,
          volume: state.volume,
          muted: state.muted,
          quality: state.quality,
          subtitlesEnabled: state.subtitlesEnabled,
          subtitleLanguage: state.subtitleLanguage,
          theaterMode: state.theaterMode,
          sidebarOpen: state.sidebarOpen,
          sidebarTab: state.sidebarTab

        })
      }
    ),
    { name: 'Player Store' }
  )
)


export const selectPlaybackRate = (state: PlayerState) => state.playbackRate
export const selectVolume = (state: PlayerState) => state.volume
export const selectQuality = (state: PlayerState) => state.quality
export const selectSubtitles = (state: PlayerState) => ({
  enabled: state.subtitlesEnabled,
  language: state.subtitleLanguage
})
