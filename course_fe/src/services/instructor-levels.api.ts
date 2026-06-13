









import { http } from './http'



export interface InstructorLevel {
  id: number
  name: string
  description: string | null
  min_students: number
  min_revenue: string
  commission_rate: string
  plan_commission_rate: string
  min_plan_minutes: number
  instructor_count: number
  created_at: string
  updated_at: string
}




export async function getInstructorLevels(): Promise<InstructorLevel[]> {
  return http.get<InstructorLevel[]>('/instructor-levels/')
}


export async function getInstructorLevelById(levelId: number): Promise<InstructorLevel> {
  return http.get<InstructorLevel>(`/instructor-levels/${levelId}/`)
}

export type InstructorLevelInput = Partial<
  Pick<InstructorLevel, 'name' | 'description' | 'min_students' | 'min_revenue' | 'commission_rate' | 'plan_commission_rate' | 'min_plan_minutes'>
>

export async function createInstructorLevel(data: InstructorLevelInput): Promise<InstructorLevel> {
  return http.post<InstructorLevel>('/instructor-levels/', data)
}

export async function updateInstructorLevel(
  levelId: number,
  data: InstructorLevelInput
): Promise<InstructorLevel> {
  return http.patch<InstructorLevel>(`/instructor-levels/${levelId}/`, data)
}

export async function deleteInstructorLevel(levelId: number): Promise<{ message?: string }> {
  return http.delete<{ message?: string }>(`/instructor-levels/${levelId}/`)
}



export function parseDecimal(value: string | null | undefined): number {
  if (!value) return 0
  return parseFloat(value) || 0
}

export function getInstructorShare(commissionRate: string): number {
  return 100 - parseDecimal(commissionRate)
}
