import { http } from './http'

export interface PlatformConfig {
  site_name: string
  site_logo: string
  social_links: Record<string, string>
  contact_email: string
  min_payout: string
  auto_approve_payout: boolean
  auto_approve_instructor_application: boolean
}

export async function getPlatformConfig(): Promise<PlatformConfig> {
  return http.get<PlatformConfig>('/platform-settings/config/')
}

export async function updatePlatformConfig(payload: Partial<PlatformConfig>): Promise<PlatformConfig> {
  return http.patch<PlatformConfig>('/platform-settings/config/', payload)
}

export type PolicyKey = 'terms' | 'privacy' | 'refund' | 'community'

export type LegalPolicies = Record<PolicyKey, string>

interface PolicyDocumentsResponse {
  legal_policies: LegalPolicies
}

export async function getPolicyDocuments(): Promise<LegalPolicies> {
  const res = await http.get<PolicyDocumentsResponse>('/platform-settings/policies/')
  return res.legal_policies
}

export async function updatePolicyDocuments(policies: LegalPolicies): Promise<LegalPolicies> {
  const res = await http.patch<PolicyDocumentsResponse>('/platform-settings/policies/', { legal_policies: policies })
  return res.legal_policies
}

export async function getPublicPolicies(): Promise<LegalPolicies> {
  const res = await http.get<PolicyDocumentsResponse>('/platform-settings/public/policies/')
  return res.legal_policies
}
