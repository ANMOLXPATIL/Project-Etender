export type AvailabilityStatus = 'available' | 'limited' | 'unavailable'
export type ProjectStatus = 'completed' | 'in_progress' | 'planned'

export interface Contractor {
  id: string
  business_name: string
  description: string
  service_location: string
  version: number
  business_name_version: number
  description_version: number
  service_location_version: number
  created_at: string
  updated_at: string
}

export interface ContractorContact {
  contractor_id: string
  email: string
  email_version: number
  phone: string
  phone_version: number
  updated_at: string
}

export interface ContractorExperience {
  contractor_id: string
  years_experience: number
  qualifications: string
  version: number
  updated_at: string
}

export interface ContractorAvailability {
  contractor_id: string
  status: AvailabilityStatus
  note: string
  version: number
  updated_at: string
}

export interface ContractorSkill {
  id: string
  contractor_id: string
  skill: string
  version: number
  created_at: string
}

export interface PortfolioProject {
  id: string
  contractor_id: string
  title: string
  category: string
  description: string
  status: ProjectStatus
  completed_on: string | null
  location: string
  image_path: string | null
  project_value: number | null
  version: number
  created_at: string
  updated_at: string
}

export interface ContractorDetail {
  profile: Contractor
  contact: ContractorContact | null
  experience: ContractorExperience
  availability: ContractorAvailability
  skills: ContractorSkill[]
  projects: PortfolioProject[]
}

export interface RpcResult {
  status: 'ok' | 'conflict' | 'forbidden' | 'invalid' | 'duplicate'
  version?: number
  updated_at?: string
  business_name_version?: number
  description_version?: number
  service_location_version?: number
  email_version?: number
  phone_version?: number
  skill_id?: string
  skill?: string
  project_id?: string
}

export interface ProjectInput {
  title: string
  category: string
  description: string
  status: ProjectStatus
  completed_on: string | null
  location: string
  image_path: string | null
  project_value: number | null
}
