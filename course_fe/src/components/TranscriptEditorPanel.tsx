import { useEffect, useMemo, useRef, useState } from 'react'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { ScrollArea } from './ui/scroll-area'
import { Textarea } from './ui/textarea'
import { Loader2, RefreshCw, PlayCircle, UploadCloud, Eye, FileAudio } from 'lucide-react'
import { toast } from 'sonner'
import {
  formatTranscriptTime,
  generateLessonTranscript,
  getLessonTranscriptEditor,
  publishTranscript,
  type TranscriptEditorPayload,
  updateTranscript,
} from '../services/transcript.api'

interface TranscriptEditorPanelProps {
  lessonId: number
  videoUrl?: string | null
}

function isDirectVideoUrl(url?: string | null): boolean {
  if (!url) return false
  return !/(youtube\.com|youtu\.be)/i.test(url)
}

function statusTone(status?: string | null): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (!status) return 'outline'
  if (status === 'published') return 'default'
  if (status === 'failed' || status === 'stale') return 'destructive'
  if (status === 'processing' || status === 'queued') return 'secondary'
  return 'outline'
}

export function TranscriptEditorPanel({ lessonId, videoUrl }: TranscriptEditorPanelProps) {
  const [payload, setPayload] = useState<TranscriptEditorPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [editedSegments, setEditedSegments] = useState<Record<number, string>>({})
  const [currentTime, setCurrentTime] = useState(0)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const editableTranscript = payload?.latest
  const publishedTranscript = payload?.published
  const displayedTranscript = editableTranscript || publishedTranscript
  const latestJob = payload?.latest_job

  const activeSegmentId = useMemo(() => {
    if (!displayedTranscript) return null
    const currentMs = Math.floor(currentTime * 1000)
    const active = displayedTranscript.segments.find(
      (segment) => currentMs >= segment.start_ms && currentMs <= segment.end_ms
    )
    return active?.id ?? null
  }, [currentTime, displayedTranscript])

  const loadEditorState = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const data = await getLessonTranscriptEditor(lessonId)
      setPayload(data)
      const nextEdited: Record<number, string> = {}
      ;(data.latest?.segments || []).forEach((segment) => {
        nextEdited[segment.id] = segment.text
      })
      setEditedSegments(nextEdited)
    } catch (error: any) {
      if (!silent) toast.error(error?.message || 'Failed to load transcript state')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    void loadEditorState()
  }, [lessonId])

  useEffect(() => {
    if (!latestJob) return
    if (!['queued', 'processing'].includes(latestJob.status)) return
    const timer = window.setInterval(() => {
      void loadEditorState(true)
    }, 5000)
    return () => window.clearInterval(timer)
  }, [latestJob?.id, latestJob?.status])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const job = await generateLessonTranscript(lessonId)
      setPayload((prev) => prev ? { ...prev, latest_job: job } : { latest: null, published: null, latest_job: job })
      toast.success('Transcript generation queued')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to queue transcript generation')
    } finally {
      setGenerating(false)
    }
  }

  const handleSaveDraft = async () => {
    if (!editableTranscript) return
    setSaving(true)
    try {
      const updated = await updateTranscript(editableTranscript.id, {
        segments: editableTranscript.segments.map((segment) => ({
          id: segment.id,
          text: editedSegments[segment.id] ?? segment.text,
        })),
      })
      setPayload((prev) => prev ? { ...prev, latest: updated } : prev)
      toast.success('Transcript draft saved')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save transcript')
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    if (!editableTranscript) return
    setPublishing(true)
    try {
      const published = await publishTranscript(editableTranscript.id)
      setPayload((prev) => prev ? { ...prev, latest: published, published } : prev)
      toast.success('Transcript published')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to publish transcript')
    } finally {
      setPublishing(false)
    }
  }

  const seekToSegment = (segment: { start_ms: number }) => {
    if (videoRef.current) {
      videoRef.current.currentTime = segment.start_ms / 1000
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Transcript</h3>
            <Badge variant={statusTone(editableTranscript?.status || latestJob?.status || publishedTranscript?.status)}>
              {editableTranscript?.status || latestJob?.status || publishedTranscript?.status || 'empty'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Draft can be edited and previewed before publish. Students only receive the published version.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void loadEditorState()} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleGenerate} disabled={generating}>
            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileAudio className="mr-2 h-4 w-4" />}
            {editableTranscript || publishedTranscript ? 'Regenerate' : 'Generate'}
          </Button>
          <Button onClick={handleSaveDraft} disabled={!editableTranscript || saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
            Save Draft
          </Button>
          <Button onClick={handlePublish} disabled={!editableTranscript || publishing}>
            {publishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
            Publish
          </Button>
        </div>
      </div>

      {latestJob?.status === 'failed' && latestJob.error_message && (
        <Card className="border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {latestJob.error_message}
        </Card>
      )}

      {!displayedTranscript ? (
        <Card className="border-dashed p-8 text-center text-sm text-muted-foreground">
          No transcript version exists yet. Generate one after the video is uploaded.
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,1fr)]">
          <Card className="overflow-hidden">
            <div className="border-b px-4 py-3">
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline">v{displayedTranscript.version}</Badge>
                <span className="text-muted-foreground">Language: {displayedTranscript.language_code}</span>
                {publishedTranscript && (
                  <Badge variant="secondary">Published v{publishedTranscript.version}</Badge>
                )}
              </div>
            </div>
            {isDirectVideoUrl(videoUrl) ? (
              <div className="bg-black">
                <video
                  ref={videoRef}
                  src={videoUrl || undefined}
                  controls
                  className="aspect-video w-full"
                  onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
                />
              </div>
            ) : (
              <div className="flex aspect-video items-center justify-center bg-muted text-sm text-muted-foreground">
                Direct video preview is unavailable for this source. Timestamp editing still works.
              </div>
            )}
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b px-4 py-3 text-sm font-medium">Segments</div>
            <ScrollArea className="h-[32rem]">
              <div className="space-y-3 p-4">
                {displayedTranscript.segments.map((segment) => {
                  const isEditable = editableTranscript?.id === displayedTranscript.id
                  return (
                    <div
                      key={segment.id}
                      className={`rounded-lg border p-3 ${activeSegmentId === segment.id ? 'border-primary bg-primary/5' : ''}`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 text-sm font-medium text-primary"
                          onClick={() => seekToSegment(segment)}
                        >
                          <PlayCircle className="h-4 w-4" />
                          {formatTranscriptTime(segment.start_ms)}
                        </button>
                        <span className="text-xs text-muted-foreground">{formatTranscriptTime(segment.end_ms)}</span>
                      </div>
                      {isEditable ? (
                        <Textarea
                          value={editedSegments[segment.id] ?? segment.text}
                          onChange={(event) =>
                            setEditedSegments((prev) => ({
                              ...prev,
                              [segment.id]: event.target.value,
                            }))
                          }
                          rows={3}
                        />
                      ) : (
                        <p className="text-sm leading-6">{segment.text}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </Card>
        </div>
      )}
    </div>
  )
}
