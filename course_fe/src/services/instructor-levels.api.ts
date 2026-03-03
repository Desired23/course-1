/**
 * Instructor Levels API Service
 * Level tiers for instructors (Bronze, Silver, Gold, etc.)
 *
 * Endpoints:
 *   GET    /api/instructor-levels/                    — List all levels (public)
 *   GET    /api/instructor-levels/:id/                — Level detail
 *   POST   /api/instructor-levels/upgrade-check/      — Trigger upgrade check (admin)
 */

import { http } from './http'

// ─── Types ────────────────────────────────────────────────────

export interface InstructorLevel {
  id: number
  name: string
  description: string | null
  min_students: number
  min_revenue: string // decimal
  commission_rate: string // decimal (platform %)
  plan_commission_rate: string
  min_plan_minutes: number
  instructor_count: number
  created_at: string
  updated_at: string
}

// ─── API Functions ────────────────────────────────────────────

/** List all instructor levels */
export async function getInstructorLevels(): Promise<InstructorLevel[]> {
  return http.get<InstructorLevel[]>('/instructor-levels/')
}

/** Get single level */
export async function getInstructorLevelById(levelId: number): Promise<InstructorLevel> {
  return http.get<InstructorLevel>(`/instructor-levels/${levelId}/`)
}

// ─── Helpers ──────────────────────────────────────────────────

export function parseDecimal(value: string | null | undefined): number {
  if (!value) return 0
  return parseFloat(value) || 0
}

export function getInstructorShare(commissionRate: string): number {
  return 100 - parseDecimal(commissionRate)
}
