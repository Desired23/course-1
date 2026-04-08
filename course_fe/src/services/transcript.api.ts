import { http } from './http'

export type TranscriptStatus =
  | 'queued'
  | 'processing'
  | 'failed'
  | 'draft'
  | 'reviewed'
  | 'published'
  | 'stale'

export type TranscriptProvider = 'local_whisper'

export interface TranscriptWordDTO {
  id?: number
  word_index?: number
  text: string
  start_ms: number
  end_ms: number
  confidence?: number | null
}

export interface TranscriptSegmentDTO {
  id: number
  segment_index: number
  start_ms: number
  end_ms: number
  text: string
  confidence?: number | null
  speaker_label?: string | null
  words?: TranscriptWordDTO[] | null
}

export interface TranscriptChunkDTO {
  id: number
  chunk_index: number
  start_ms: number
  end_ms: number
  text: string
  token_count: number
  source_segment_start: number
  source_segment_end: number
}

export interface LessonTranscriptDTO {
  id: number
  lesson_id: number
  language_code: string
  detected_language_code: string
  status: TranscriptStatus
  origin: 'asr' | 'manual' | 'regenerated'
  provider: TranscriptProvider
  version: number
  published_at: string | null
  created_at: string
  updated_at: string
  segments: TranscriptSegmentDTO[]
  chunks?: TranscriptChunkDTO[] | null
}

export interface TranscriptJobDTO {
  id: number
  lesson_id: number
  status: 'queued' | 'processing' | 'completed' | 'failed'
  trigger_source: 'auto_upload' | 'video_updated' | 'manual'
  provider: TranscriptProvider
  language_code: string
  error_message: string
  attempts: number
  created_at: string
  updated_at: string
  started_at: string | null
  finished_at: string | null
}

export interface TranscriptEditorPayload {
  latest: LessonTranscriptDTO | null
  published: LessonTranscriptDTO | null
  latest_job: TranscriptJobDTO | null
}

export interface TranscriptJobStatusPayload {
  lesson_id: number
  results: TranscriptJobDTO[]
}

export async function generateLessonTranscript(lessonId: number): Promise<TranscriptJobDTO> {
  return http.post<TranscriptJobDTO>(`/lessons/${lessonId}/transcript/generate`, {})
}

export async function getLessonTranscript(lessonId: number, includeWords = false): Promise<LessonTranscriptDTO> {
  const qs = includeWords ? '?include_words=true' : ''
  return http.get<LessonTranscriptDTO>(`/lessons/${lessonId}/transcript${qs}`)
}

export async function getLessonTranscriptEditor(lessonId: number): Promise<TranscriptEditorPayload> {
  return http.get<TranscriptEditorPayload>(`/lessons/${lessonId}/transcript/editor`)
}

export async function updateTranscript(
  transcriptId: number,
  data: {
    status?: 'draft' | 'reviewed'
    segments?: Array<{ id: number; text: string }>
  }
): Promise<LessonTranscriptDTO> {
  return http.patch<LessonTranscriptDTO>(`/transcripts/${transcriptId}`, data)
}

export async function publishTranscript(transcriptId: number): Promise<LessonTranscriptDTO> {
  return http.post<LessonTranscriptDTO>(`/transcripts/${transcriptId}/publish`, {})
}

export async function getTranscriptJobs(lessonId: number): Promise<TranscriptJobStatusPayload> {
  return http.get<TranscriptJobStatusPayload>(`/transcript-jobs/${lessonId}`)
}

export function formatTranscriptTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
