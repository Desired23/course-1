export function cloudinarySecondsToLessonMinutes(seconds?: number | null): number | undefined {
  if (seconds == null) return undefined
  const value = Number(seconds)
  if (!Number.isFinite(value) || value <= 0) return undefined
  return Math.max(1, Math.round(value / 60))
}

export function formatLessonDurationInput(minutes?: number | null, fallback = '5 min'): string {
  if (minutes == null || minutes <= 0) return fallback
  return `${Math.round(minutes)} min`
}

export function parseLessonDurationInputToMinutes(raw?: string): number | undefined {
  if (!raw) return undefined

  const normalized = raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  if (!normalized) return undefined

  const hourText = normalized.match(/^(\d+(?:\.\d+)?)\s*(?:h|hour|hours|gio)(?:\s*(\d+(?:\.\d+)?)\s*(?:m|min|minute|minutes|phut))?/)
  if (hourText) {
    const hours = Number(hourText[1])
    const minutes = hourText[2] ? Number(hourText[2]) : 0
    return Math.round(hours * 60 + minutes)
  }

  const mmss = normalized.match(/^(\d+):(\d{1,2})$/)
  if (mmss) {
    const totalSeconds = Number(mmss[1]) * 60 + Number(mmss[2])
    return Math.max(1, Math.round(totalSeconds / 60))
  }

  const minuteText = normalized.match(/^(\d+(?:\.\d+)?)\s*(?:m|min|minute|minutes|phut)/)
  if (minuteText) {
    return Math.round(Number(minuteText[1]))
  }

  const asNumber = Number(normalized)
  if (!Number.isNaN(asNumber) && asNumber >= 0) {
    return Math.round(asNumber)
  }

  return undefined
}
