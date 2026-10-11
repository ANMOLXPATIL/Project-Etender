import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type {
  Contractor,
  ContractorContact,
  ContractorDetail,
  CustomerQuote,
  AccountType,
  ProjectInput,
  QuoteRequest,
  QuoteStatus,
  RpcResult,
} from '../types'

function client(): SupabaseClient {
  if (!supabase) throw new Error('Supabase is not configured. Add the project URL and publishable key to .env.')
  return supabase
}

function assertRpcSuccess(data: RpcResult[] | null, error: { message: string } | null): RpcResult {
  if (error) throw new Error(error.message)
  const result = data?.[0]
  if (!result) throw new Error('The database returned no update result.')
  if (result.status === 'forbidden') throw new Error('You are not authorized to edit this contractor.')
  if (result.status === 'invalid') throw new Error('The submitted information did not pass database validation.')
  return result
}

export async function listContractors(filters: {
  skill?: string
  location?: string
  availability?: string
}): Promise<Contractor[]> {
  const db = client()
  const constraints: string[][] = []
  if (filters.skill?.trim()) {
    const { data, error } = await db.from('contractor_skills')
      .select('contractor_id').ilike('skill', `%${filters.skill.trim()}%`).returns<{ contractor_id: string }[]>()
    if (error) throw new Error(error.message)
    constraints.push([...new Set((data ?? []).map((row) => row.contractor_id))])
  }

  if (filters.availability) {
    const { data, error } = await db.from('contractor_availability')
      .select('contractor_id').eq('status', filters.availability).returns<{ contractor_id: string }[]>()
    if (error) throw new Error(error.message)
    constraints.push([...new Set((data ?? []).map((row) => row.contractor_id))])
  }
  const narrowedIds = constraints.reduce((ids, next) => ids.filter((id) => next.includes(id)), constraints[0] ?? [])
  if (constraints.length > 0 && narrowedIds.length === 0) return []

  let query = db.from('contractor_listings').select('*').order('updated_at', { ascending: false })
  if (filters.location?.trim()) query = query.ilike('service_location', `%${filters.location.trim()}%`)
  if (constraints.length > 0) query = query.in('id', narrowedIds)
  const { data, error } = await query.returns<Contractor[]>()
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function submitQuoteRequest(input: {
  contractorId: string
  accessToken: string
  customerId: string
  customerName: string
  customerEmail: string
  customerPhone: string
  projectType: string
  projectLocation: string
  projectDescription: string
  budgetRange: string
  timeline: string
  projectImagePaths: string[]
}): Promise<void> {
  const { error } = await client().rpc('submit_quote_request', {
    p_contractor_id: input.contractorId,
    p_access_token: input.accessToken,
    p_customer_id: input.customerId,
    p_customer_name: input.customerName.trim(),
    p_customer_email: input.customerEmail.trim(),
    p_customer_phone: input.customerPhone.trim(),
    p_project_type: input.projectType.trim(),
    p_project_location: input.projectLocation.trim(),
    p_project_description: input.projectDescription.trim(),
    p_budget_range: input.budgetRange,
    p_timeline: input.timeline,
    p_project_image_paths: input.projectImagePaths,
  })
  if (error) throw new Error(error.message)
}

export async function getCustomerQuote(accessToken: string): Promise<CustomerQuote> {
  const { data, error } = await client().rpc('get_customer_quote', { p_access_token: accessToken })
  if (error) throw new Error(error.message)
  const request = (data as CustomerQuote[] | null)?.[0]
  if (!request) throw new Error('This quote link is invalid or has expired.')
  return (await addQuoteImageUrls([request]))[0]
}

export async function listContractorQuotes(contractorId: string): Promise<QuoteRequest[]> {
  const { data, error } = await client().rpc('list_contractor_quotes', { p_contractor_id: contractorId })
  if (error) throw new Error(error.message)
  return addQuoteImageUrls((data as QuoteRequest[] | null) ?? [])
}

export async function listMyQuoteRequests(): Promise<CustomerQuote[]> {
  const { data, error } = await client().rpc('list_my_quote_requests')
  if (error) throw new Error(error.message)
  return addQuoteImageUrls((data as CustomerQuote[] | null) ?? [])
}

async function addQuoteImageUrls<T extends { project_image_paths: string[] }>(requests: T[]): Promise<T[]> {
  if (!requests.some((request) => request.project_image_paths?.length)) return requests
  const db = client()
  return Promise.all(requests.map(async (request) => {
    const paths = request.project_image_paths ?? []
    if (!paths.length) return { ...request, project_images: [] }
    const { data, error } = await db.storage.from('quote-images').createSignedUrls(paths, 3600)
    if (error) throw new Error(`Quote images could not be loaded: ${error.message}`)
    const failedImage = data?.find((item) => item.error || !item.signedUrl)
    if (failedImage) throw new Error(`A quote photo could not be loaded: ${failedImage.error ?? 'signed URL missing'}`)
    return { ...request, project_images: (data ?? []).map((item) => item.signedUrl).filter((url): url is string => Boolean(url)) }
  }))
}

export async function uploadQuoteImages(customerId: string, files: File[]): Promise<string[]> {
  const db = client()
  const uploaded: string[] = []
  try {
    for (const file of files) {
      const extension = file.name.split('.').pop()?.toLowerCase() ?? 'img'
      const path = `${customerId}/${crypto.randomUUID()}.${extension}`
      const { error } = await db.storage.from('quote-images').upload(path, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: false,
      })
      if (error) throw new Error(error.message)
      uploaded.push(path)
    }
    return uploaded
  } catch (error) {
    if (uploaded.length) {
      const { error: cleanupError } = await db.storage.from('quote-images').remove(uploaded)
      if (cleanupError) throw new Error(`Quote image upload failed, and uploaded images could not be cleaned up: ${cleanupError.message}`)
    }
    throw error
  }
}

export async function removeQuoteImages(paths: string[]): Promise<void> {
  if (!paths.length) return
  const { error } = await client().storage.from('quote-images').remove(paths)
  if (error) throw new Error(error.message)
}

export async function getMyAccountType(): Promise<AccountType> {
  const { data, error } = await client().rpc('get_my_account_type')
  if (error) throw new Error(error.message)
  if (data !== 'customer' && data !== 'contractor') throw new Error('Your account type could not be verified.')
  return data
}

export async function saveContractorQuote(input: {
  requestId: string
  status: Exclude<QuoteStatus, 'new'>
  amount: number | null
  message: string
}): Promise<void> {
  const { data, error } = await client().rpc('respond_to_quote_request', {
    p_request_id: input.requestId,
    p_status: input.status,
    p_quote_amount: input.amount,
    p_quote_message: input.message.trim(),
  })
  const result = assertRpcSuccess(data, error)
  if (result.status !== 'ok') throw new Error('The quotation could not be saved.')
}

export async function getContractor(id: string, includePrivate = false): Promise<ContractorDetail> {
  const db = client()
  const [profileResult, experienceResult, availabilityResult, skillsResult, projectsResult] = await Promise.all([
    db.from('contractor_listings').select('*').eq('id', id).maybeSingle(),
    db.from('contractor_experience').select('*').eq('contractor_id', id).maybeSingle(),
    db.from('contractor_availability').select('*').eq('contractor_id', id).maybeSingle(),
    db.from('contractor_skills').select('*').eq('contractor_id', id).order('skill'),
    db.from('portfolio_projects').select('*').eq('contractor_id', id).order('created_at', { ascending: false }),
  ])
  for (const error of [profileResult.error, experienceResult.error, availabilityResult.error, skillsResult.error, projectsResult.error]) {
    if (error) throw new Error(error.message)
  }
  if (!profileResult.data || !experienceResult.data || !availabilityResult.data) {
    throw new Error('This contractor profile could not be found.')
  }

  let contact: ContractorContact | null = null
  if (includePrivate) {
    const { data, error } = await db.from('contractor_contacts').select('*').eq('contractor_id', id).maybeSingle()
    if (error) throw new Error(error.message)
    contact = data
  }
  return {
    profile: profileResult.data,
    contact,
    experience: experienceResult.data,
    availability: availabilityResult.data,
    skills: skillsResult.data ?? [],
    projects: projectsResult.data ?? [],
  }
}

export async function ownsContractor(contractorId: string): Promise<boolean> {
  const { data, error } = await client().rpc('is_contractor_owner', { p_contractor_id: contractorId })
  if (error) throw new Error(error.message)
  return data === true
}

export async function getOwnContractorId(): Promise<string> {
  const { data, error } = await client().rpc('get_my_contractor_id')
  if (error) throw new Error(error.message)
  if (typeof data !== 'string') throw new Error('No contractor profile is linked to this account.')
  return data
}

export async function saveBasics(input: {
  contractorId: string
  expectedVersions: {
    businessName: number
    description: number
    serviceLocation: number
    email: number
    phone: number
  }
  changedFields: {
    businessName: boolean
    description: boolean
    serviceLocation: boolean
    email: boolean
    phone: boolean
  }
  businessName: string
  description: string
  serviceLocation: string
  email: string
  phone: string
}): Promise<RpcResult> {
  const { data, error } = await client().rpc('save_contractor_basics', {
    p_contractor_id: input.contractorId,
    p_expected_business_name_version: input.expectedVersions.businessName,
    p_expected_description_version: input.expectedVersions.description,
    p_expected_service_location_version: input.expectedVersions.serviceLocation,
    p_expected_email_version: input.expectedVersions.email,
    p_expected_phone_version: input.expectedVersions.phone,
    p_update_business_name: input.changedFields.businessName,
    p_update_description: input.changedFields.description,
    p_update_service_location: input.changedFields.serviceLocation,
    p_update_email: input.changedFields.email,
    p_update_phone: input.changedFields.phone,
    p_business_name: input.businessName,
    p_description: input.description,
    p_service_location: input.serviceLocation,
    p_email: input.email,
    p_phone: input.phone,
  })
  const result = assertRpcSuccess(data, error)
  if (result.status === 'conflict') throw new Error('conflict')
  return result
}

export async function saveExperience(input: {
  contractorId: string
  expectedVersion: number
  years: number
  qualifications: string
}): Promise<RpcResult> {
  const { data, error } = await client().rpc('save_contractor_experience', {
    p_contractor_id: input.contractorId,
    p_expected_version: input.expectedVersion,
    p_years_experience: input.years,
    p_qualifications: input.qualifications,
  })
  const result = assertRpcSuccess(data, error)
  if (result.status === 'conflict') throw new Error('conflict')
  return result
}

export async function saveAvailability(input: {
  contractorId: string
  expectedVersion: number
  status: string
  note: string
}): Promise<RpcResult> {
  const { data, error } = await client().rpc('save_contractor_availability', {
    p_contractor_id: input.contractorId,
    p_expected_version: input.expectedVersion,
    p_status: input.status,
    p_note: input.note,
  })
  const result = assertRpcSuccess(data, error)
  if (result.status === 'conflict') throw new Error('conflict')
  return result
}

export async function addSkill(contractorId: string, skill: string): Promise<RpcResult> {
  const { data, error } = await client().rpc('add_contractor_skill', {
    p_contractor_id: contractorId,
    p_skill: skill,
  })
  const result = assertRpcSuccess(data, error)
  if (result.status === 'duplicate') throw new Error('That skill is already listed.')
  return result
}

export async function renameSkill(skillId: string, expectedVersion: number, skill: string): Promise<RpcResult> {
  const { data, error } = await client().rpc('rename_contractor_skill', {
    p_skill_id: skillId,
    p_expected_version: expectedVersion,
    p_skill: skill,
  })
  const result = assertRpcSuccess(data, error)
  if (result.status === 'conflict') throw new Error('conflict')
  if (result.status === 'duplicate') throw new Error('That skill is already listed.')
  return result
}

export async function removeSkill(skillId: string, expectedVersion: number): Promise<void> {
  const { data, error } = await client().rpc('delete_contractor_skill', {
    p_skill_id: skillId,
    p_expected_version: expectedVersion,
  })
  const result = assertRpcSuccess(data, error)
  if (result.status === 'conflict') throw new Error('conflict')
}

export async function uploadProjectImage(contractorId: string, file: File): Promise<string> {
  const db = client()
  const extension = file.name.split('.').pop()?.toLowerCase() ?? 'img'
  const path = `${contractorId}/${crypto.randomUUID()}.${extension}`
  const { error } = await db.storage.from('portfolio-images').upload(path, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false,
  })
  if (error) throw new Error(error.message)
  return path
}

export function projectImageUrl(imagePath: string | null): string | null {
  if (!imagePath || !supabase) return null
  if (/^https?:\/\//i.test(imagePath)) return imagePath
  return supabase.storage.from('portfolio-images').getPublicUrl(imagePath).data.publicUrl
}

export async function removeProjectImage(imagePath: string): Promise<void> {
  if (/^https?:\/\//i.test(imagePath)) return
  const { error } = await client().storage.from('portfolio-images').remove([imagePath])
  if (error) throw new Error(error.message)
}

export async function saveProject(input: {
  contractorId: string
  project: ProjectInput
  projectId?: string
  expectedVersion?: number
}): Promise<RpcResult> {
  const project = input.project
  const db = client()
  const result = input.projectId
    ? await db.rpc('update_portfolio_project', {
        p_project_id: input.projectId,
        p_expected_version: input.expectedVersion ?? 0,
        p_title: project.title,
        p_category: project.category,
        p_description: project.description,
        p_status: project.status,
        p_completed_on: project.completed_on,
        p_location: project.location,
        p_image_path: project.image_path,
        p_project_value: project.project_value,
      })
    : await db.rpc('create_portfolio_project', {
        p_contractor_id: input.contractorId,
        p_title: project.title,
        p_category: project.category,
        p_description: project.description,
        p_status: project.status,
        p_completed_on: project.completed_on,
        p_location: project.location,
        p_image_path: project.image_path,
        p_project_value: project.project_value,
      })
  const outcome = assertRpcSuccess(result.data, result.error)
  if (outcome.status === 'conflict') throw new Error('conflict')
  if (outcome.status === 'duplicate') throw new Error('A project with this title already appears in your portfolio.')
  return outcome
}

export async function deleteProject(projectId: string, expectedVersion: number): Promise<void> {
  const { data, error } = await client().rpc('delete_portfolio_project', {
    p_project_id: projectId,
    p_expected_version: expectedVersion,
  })
  const result = assertRpcSuccess(data, error)
  if (result.status === 'conflict') throw new Error('conflict')
}

export function subscribeToContractor(id: string, onChange: () => void, onStatus: (status: string) => void): () => void {
  const db = client()
  const channel = db.channel(`contractor-${id}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'contractors', filter: `id=eq.${id}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'contractor_experience', filter: `contractor_id=eq.${id}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'contractor_availability', filter: `contractor_id=eq.${id}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'contractor_skills', filter: `contractor_id=eq.${id}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'portfolio_projects', filter: `contractor_id=eq.${id}` }, onChange)
    .subscribe((status) => onStatus(status))
  return () => { void db.removeChannel(channel) }
}
