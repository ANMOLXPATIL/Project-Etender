import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import {
  ArrowLeft, ArrowRight, Check, ChevronDown, CircleAlert, Clock3,
  FilePlus2, HardHat, LoaderCircle, LockKeyhole, LogOut, Pencil, Plus, RefreshCw,
  Search, ShieldCheck, Trash2, Upload, X,
} from 'lucide-react'
import {
  addSkill, deleteProject, getOwnContractorId, listContractors, ownsContractor, projectImageUrl, removeProjectImage,
  removeSkill, renameSkill, saveAvailability, saveBasics, saveExperience, saveProject,
  uploadProjectImage,
} from './lib/api'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import { validateImage, validateProject } from './lib/validation'
import { useContractor } from './lib/useContractor'
import type {
  AvailabilityStatus, Contractor, ContractorDetail, ContractorSkill, PortfolioProject, ProjectInput, ProjectStatus,
} from './types'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured)

  useEffect(() => {
    if (!supabase) return
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthReady(true)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthReady(true)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  if (!isSupabaseConfigured) return <SetupRequired />
  if (!authReady) return <main className="center-state"><LoaderCircle className="spin" /><p>Connecting to Groundwork…</p></main>
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <SiteHeader session={session} />
      <main id="main">
        <Routes>
          <Route path="/" element={<DiscoveryPage />} />
          <Route path="/sign-in" element={<AuthPage session={session} />} />
          <Route path="/contractors/:id" element={<ContractorPage session={session} />} />
          <Route path="/manage/:id" element={<ManagePage session={session} />} />
          <Route path="/demo/:id" element={<DemoPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer className="site-footer"><span>GROUNDWORK / CONTRACTOR DIRECTORY</span><span>Profiles built to keep their footing.</span></footer>
    </>
  )
}

function SetupRequired() {
  return (
    <main className="setup-screen">
      <div className="setup-card">
        <p className="eyebrow">GROUNDWORK / CLOUD CONNECTION</p>
        <h1>A real database,<br />not a demo fixture.</h1>
        <p>This workspace has no Supabase credentials configured. Groundwork deliberately does not fall back to mock data: profiles and edits only appear when connected to your Supabase cloud project.</p>
        <ol>
          <li>Copy <code>.env.example</code> to <code>.env</code>.</li>
          <li>Set the cloud project URL and publishable key in <code>.env</code>.</li>
          <li>Apply the database migration and optional development seed.</li>
          <li>Run <code>npm run dev</code>.</li>
        </ol>
        <p className="mono-note">Connect your Supabase Cloud project. See README.md for the step-by-step setup.</p>
      </div>
    </main>
  )
}

function SiteHeader({ session }: { session: Session | null }) {
  const navigate = useNavigate()
  const [signOutError, setSignOutError] = useState('')
  async function signOut() {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) setSignOutError(error.message)
    else { setSignOutError(''); navigate('/') }
  }
  return (
    <header className="site-header">
      <Link to="/" className="brand" aria-label="Groundwork home">
        <span className="brand-mark"><HardHat size={19} strokeWidth={1.6} /></span>
        <span>GROUNDWORK<span className="brand-dot">.</span></span>
      </Link>
      <nav className="main-nav" aria-label="Main navigation">
        <Link to="/">Find a contractor</Link>
        {session && <Link to="/manage/me">Manage profile</Link>}
      </nav>
      <div className="header-account">
        {session ? (
          <>
            <span className="signed-in mono-note">{session.user.email}</span>
            <button className="icon-button" onClick={() => void signOut()} aria-label="Sign out" title="Sign out"><LogOut size={17} /></button>
          </>
        ) : <Link className="nav-signin" to="/sign-in"><LockKeyhole size={14} /> Contractor sign in</Link>}
      </div>
      {signOutError && <p role="alert" className="header-error">{signOutError}</p>}
    </header>
  )
}

function DiscoveryPage() {
  const [query, setQuery] = useState('')
  const [skill, setSkill] = useState('')
  const [location, setLocation] = useState('')
  const [availability, setAvailability] = useState('')
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    const timeout = window.setTimeout(() => {
      void listContractors({ query, skill, location, availability }).then((rows) => {
        if (active) {
          setContractors(rows)
          setError('')
        }
      }).catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : 'Could not load contractor listings.')
      }).finally(() => { if (active) setLoading(false) })
    }, query || skill || location || availability ? 160 : 0)
    return () => {
      active = false
      window.clearTimeout(timeout)
    }
  }, [query, skill, location, availability])

  return (
    <>
      <section className="hero page-wrap">
        <div className="hero-copy">
          <p className="hero-kicker"><span className="hero-kicker-mark" /> A better way to build</p>
          <h1>Make your next<br />project <em>feel right.</em></h1>
          <p className="hero-description">Meet skilled local contractors, explore the work they’re proud of, and find the right fit for your home.</p>
          <div className="hero-actions">
            <a href="#directory" className="button button-primary">Find a contractor <ArrowRight size={16} /></a>
            <Link className="hero-secondary-link" to="/sign-in">I’m a contractor <ArrowRight size={15} /></Link>
          </div>
          <div className="hero-proof"><ShieldCheck size={18} /><span>Compare experience, specialties, and real project work.</span></div>
        </div>
        <div className="hero-visual">
          <img src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=85" alt="Sunlit modern home opening onto a garden" />
          <div className="hero-image-caption"><span>THE RIGHT PEOPLE. THE RIGHT PLAN.</span><span>01 / 03</span></div>
          <div className="hero-floating-card"><span className="floating-card-icon"><HardHat size={18} /></span><span><strong>Built around your project</strong><small>Find people who know your kind of work.</small></span><ArrowRight size={17} /></div>
        </div>
      </section>

      <section className="directory-section page-wrap" id="directory">
        <div className="section-heading">
          <div><p className="eyebrow">GOOD PEOPLE, GREAT WORK</p><h2>Find your fit.</h2><p className="section-intro">Get to know the people behind the projects before you make a call.</p></div>
          <p className="result-count mono-note">{loading ? 'SEARCHING…' : `${contractors.length.toString().padStart(2, '0')} CONTRACTORS`}</p>
        </div>
        <div className="search-panel">
          <label className="search-field"><span>NAME OR BUSINESS</span><span className="input-icon"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try Northline Build Co." /></span></label>
          <label className="search-field"><span>SKILL / SPECIALTY</span><input value={skill} onChange={(event) => setSkill(event.target.value)} placeholder="e.g. finish carpentry" /></label>
          <label className="search-field"><span>SERVICE LOCATION</span><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="City or neighborhood" /></label>
          <label className="search-field"><span>AVAILABILITY</span><span className="select-wrap"><select value={availability} onChange={(event) => setAvailability(event.target.value)}><option value="">Any schedule</option><option value="available">Available</option><option value="limited">Limited availability</option><option value="unavailable">Fully booked</option></select><ChevronDown size={15} /></span></label>
        </div>
        {error && <Notice kind="error">{error}</Notice>}
        <div className="contractor-grid" aria-live="polite">
          {loading ? <div className="loading-row"><LoaderCircle className="spin" /> Searching verified profiles…</div> :
            contractors.map((contractor, index) => <ContractorCard contractor={contractor} index={index} key={contractor.id} />)}
        </div>
        {!loading && !error && contractors.length === 0 && <div className="empty-state"><Search size={23} /><h3>No matches yet.</h3><p>Try a broader skill, location, or availability filter.</p></div>}
      </section>
      <section className="black-band">
        <div className="black-band-inner page-wrap">
          <p className="eyebrow">FOR THE PEOPLE DOING THE WORK</p>
          <h2>Your next project<br />shouldn't erase<br /><em>your last one.</em></h2>
          <p className="band-copy">Update availability, skills, qualifications, and individual projects on their own. Your profile stays intact while the work keeps moving.</p>
          <Link className="button button-inverse" to="/sign-in">Manage your profile <ArrowRight size={16} /></Link>
        </div>
      </section>
      <section className="page-wrap update-callout">
        <span className="callout-rule" />
        <div><p className="eyebrow">BUILT FOR MORE THAN ONE SESSION</p><h2>Updates that don't<br />overwrite each other.</h2></div>
        <p>Independent sections save independently. If another session changes the same section first, Groundwork catches the stale edit and gives you a chance to refresh.</p>
      </section>
    </>
  )
}

function ContractorCard({ contractor, index }: { contractor: Contractor; index: number }) {
  const [skills, setSkills] = useState<string[]>([])
  const [availability, setAvailability] = useState<string | null>(null)
  useEffect(() => {
    if (!supabase) return
    let active = true
    void Promise.all([
      supabase.from('contractor_skills').select('skill').eq('contractor_id', contractor.id).limit(3).returns<{ skill: string }[]>(),
      supabase.from('contractor_availability').select('status').eq('contractor_id', contractor.id).maybeSingle(),
    ]).then(([skillResult, availabilityResult]) => {
      if (active) {
        setSkills(skillResult.data?.map((row) => row.skill) ?? [])
        setAvailability(availabilityResult.data?.status ?? null)
      }
    })
    return () => { active = false }
  }, [contractor.id])
  return (
    <article className="contractor-card">
      <div className="card-topline"><span className="mono-note">PROFILE / {String(index + 1).padStart(2, '0')}</span><span className="card-arrow"><ArrowUpRight /></span></div>
      <h3><Link to={`/contractors/${contractor.id}`}>{contractor.business_name}</Link></h3>
      <p className="card-location">{contractor.service_location || 'Service area on request'}</p>
      <p className="card-description">{contractor.description || 'A local contractor ready to share more about their work.'}</p>
      <div className="skill-list">{skills.length ? skills.map((name) => <span key={name}>{name}</span>) : <span>Specialties on profile</span>}</div>
      <div className="card-bottom"><span className="availability-label"><i />{availability ? availability.replace('_', ' ') : 'Schedule not listed'}</span><Link to={`/contractors/${contractor.id}`} aria-label={`View ${contractor.business_name}`}><ArrowRight size={17} /></Link></div>
    </article>
  )
}

function ArrowUpRight() { return <ArrowRight size={16} className="arrow-up-right" /> }

function ContractorPage({ session }: { session: Session | null }) {
  const { id } = useParams()
  const { contractor, loading, error } = useContractor(id)
  const [isOwner, setIsOwner] = useState(false)
  const [ownerChecked, setOwnerChecked] = useState(!session)
  useEffect(() => {
    let active = true
    if (session && id) {
      setOwnerChecked(false)
      void ownsContractor(id).then((owned) => {
        if (active) { setIsOwner(owned); setOwnerChecked(true) }
      }).catch(() => {
        if (active) { setIsOwner(false); setOwnerChecked(true) }
      })
    }
    return () => { active = false }
  }, [session, id])
  if (loading) return <LoadingState label="Opening contractor profile…" />
  if (!contractor) return <ErrorPage message={error} />
  if (session && !ownerChecked) return <LoadingState label="Checking profile access…" />
  return (
    <div className="page-wrap detail-page">
      <Link className="back-link" to="/"><ArrowLeft size={15} /> Back to directory</Link>
      <div className="detail-header">
        <div><p className="eyebrow">CONTRACTOR / {contractor.profile.id.slice(0, 8).toUpperCase()}</p><h1>{contractor.profile.business_name}</h1><p className="detail-location">{contractor.profile.service_location}</p></div>
        <div className="profile-actions">
          <Link className="button button-secondary" to={`/demo/${contractor.profile.id}`}>Concurrency demo <ArrowRight size={15} /></Link>
          {isOwner && <Link className="button button-primary" to={`/manage/${contractor.profile.id}`}><Pencil size={15} /> Edit profile</Link>}
        </div>
      </div>
      <div className="detail-grid">
        <section className="detail-main">
          <SectionTitle number="01" title="About the work" />
          <p className="detail-description">{contractor.profile.description || 'This contractor has not added a description yet.'}</p>
          <SectionTitle number="02" title="Selected projects" />
          {contractor.projects.length ? <div className="detail-projects">{contractor.projects.map((project) => <ProjectCard key={project.id} project={project} editable={false} />)}</div> :
            <p className="muted-copy">No portfolio projects have been shared yet.</p>}
        </section>
        <aside className="detail-aside">
          <div className="aside-block"><p className="eyebrow">SPECIALTIES</p><div className="detail-skills">{contractor.skills.length ? contractor.skills.map((item) => <span key={item.id}>{item.skill}</span>) : <span>Not listed</span>}</div></div>
          <div className="aside-block"><p className="eyebrow">EXPERIENCE</p><strong>{contractor.experience.years_experience} years</strong><p>{contractor.experience.qualifications || 'Qualifications not listed'}</p></div>
          <div className="aside-block"><p className="eyebrow">AVAILABILITY</p><strong className="availability-status">{contractor.availability.status.replace('_', ' ')}</strong><p>{contractor.availability.note || 'Contact contractor for current scheduling.'}</p></div>
          <div className="aside-block"><p className="eyebrow">PROFILE UPDATED</p><p className="mono-note">{formatDate(contractor.profile.updated_at)}</p><p className="mono-note">VERSION {contractor.profile.version}</p></div>
          {!session && <Link className="contact-link" to="/sign-in">Contractor? Manage your profile <ArrowRight size={14} /></Link>}
        </aside>
      </div>
    </div>
  )
}

function ManagePage({ session }: { session: Session | null }) {
  const { id } = useParams()
  if (!session) return <Navigate to="/sign-in" replace state={{ from: `/manage/${id}` }} />
  if (id === 'me') return <MyProfileRedirect />
  return <ManageForUser id={id} />
}

function MyProfileRedirect() {
  const [target, setTarget] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    void getOwnContractorId().then((id) => { if (active) setTarget(id) }).catch((caught: unknown) => {
      if (active) setError(caught instanceof Error ? caught.message : 'Unable to find your contractor profile.')
    })
    return () => { active = false }
  }, [])
  if (target) return <Navigate to={`/manage/${target}`} replace />
  return error ? <ErrorPage message={error} /> : <LoadingState label="Opening your contractor profile…" />
}

function ManageForUser({ id }: { id: string | undefined }) {
  const { contractor, loading, error, reload, realtimeStatus } = useContractor(id, true)
  const [initialized, setInitialized] = useState(false)
  const [basicDraft, setBasicDraft] = useState({ businessName: '', description: '', location: '', email: '', phone: '' })
  const [basicBaseline, setBasicBaseline] = useState({ businessName: '', description: '', location: '', email: '', phone: '' })
  const [experienceDraft, setExperienceDraft] = useState({ years: '0', qualifications: '' })
  const [availabilityDraft, setAvailabilityDraft] = useState({ status: 'available' as AvailabilityStatus, note: '' })
  const [versions, setVersions] = useState({
    basics: 1,
    basicFields: { businessName: 1, description: 1, serviceLocation: 1, email: 1, phone: 1 },
    experience: 1,
    availability: 1,
  })
  const [notice, setNotice] = useState('')
  const [errorNotice, setErrorNotice] = useState('')
  const [busy, setBusy] = useState('')
  const [isOwner, setIsOwner] = useState(false)
  const [ownerChecked, setOwnerChecked] = useState(false)
  useEffect(() => {
    let active = true
    if (contractor) {
      setOwnerChecked(false)
      void ownsContractor(contractor.profile.id).then((owned) => {
        if (active) { setIsOwner(owned); setOwnerChecked(true) }
      }).catch(() => {
        if (active) { setIsOwner(false); setOwnerChecked(true) }
      })
    }
    return () => { active = false }
  }, [contractor?.profile.id])

  function hydrate(data: ContractorDetail) {
    const basicValues = {
      businessName: data.profile.business_name,
      description: data.profile.description,
      location: data.profile.service_location,
      email: data.contact?.email ?? '',
      phone: data.contact?.phone ?? '',
    }
    setBasicDraft(basicValues)
    setBasicBaseline(basicValues)
    setExperienceDraft({ years: String(data.experience.years_experience), qualifications: data.experience.qualifications })
    setAvailabilityDraft({ status: data.availability.status, note: data.availability.note })
    setVersions({
      basics: data.profile.version,
      basicFields: {
        businessName: data.profile.business_name_version,
        description: data.profile.description_version,
        serviceLocation: data.profile.service_location_version,
        email: data.contact?.email_version ?? 1,
        phone: data.contact?.phone_version ?? 1,
      },
      experience: data.experience.version,
      availability: data.availability.version,
    })
    setInitialized(true)
  }
  useEffect(() => {
    if (contractor && !initialized) hydrate(contractor)
  }, [contractor, initialized])

  async function refreshAndReview() {
    const fresh = await reload()
    if (fresh) {
      hydrate(fresh)
      setNotice('Latest saved values loaded. Review the fields before saving again.')
      setErrorNotice('')
    } else {
      setErrorNotice(error || 'The latest saved values could not be loaded.')
    }
  }
  async function saveSection(section: 'basics' | 'experience' | 'availability', action: () => Promise<{ version?: number }>) {
    setBusy(section)
    setNotice('')
    setErrorNotice('')
    try {
      const result = await action()
      if (result.version) setVersions((current) => ({ ...current, [section]: result.version! }))
      const fresh = await reload()
      if (fresh) setNotice(`${section === 'basics' ? 'Basic information' : section === 'experience' ? 'Experience and qualifications' : 'Availability'} saved.`)
      else setErrorNotice('The update was saved, but the latest profile could not be reloaded.')
    } catch (caught) {
      if (caught instanceof Error && caught.message === 'conflict') {
        setErrorNotice(`A newer ${section} edit exists. Your draft is still here; refresh to review the saved values before retrying.`)
      } else setErrorNotice(caught instanceof Error ? caught.message : 'The update could not be saved.')
    } finally {
      setBusy('')
    }
  }

  if (loading || (contractor && (!initialized || !ownerChecked))) return <LoadingState label="Loading editable profile…" />
  if (!contractor) return <ErrorPage message={error} />
  if (!isOwner) return <ErrorPage message="This profile belongs to another account. Sign in with its owner account to edit it." />
  const isStaleBasics = (basicDraft.businessName !== contractor.profile.business_name && versions.basicFields.businessName !== contractor.profile.business_name_version)
    || (basicDraft.description !== contractor.profile.description && versions.basicFields.description !== contractor.profile.description_version)
    || (basicDraft.location !== contractor.profile.service_location && versions.basicFields.serviceLocation !== contractor.profile.service_location_version)
    || (basicDraft.email !== (contractor.contact?.email ?? '') && versions.basicFields.email !== (contractor.contact?.email_version ?? 1))
    || (basicDraft.phone !== (contractor.contact?.phone ?? '') && versions.basicFields.phone !== (contractor.contact?.phone_version ?? 1))
  const isStaleExperience = versions.experience !== contractor.experience.version
  const isStaleAvailability = versions.availability !== contractor.availability.version

  return (
    <div className="page-wrap manage-page">
      <Link className="back-link" to={`/contractors/${contractor.profile.id}`}><ArrowLeft size={15} /> View public profile</Link>
      <div className="manage-header">
        <div><p className="eyebrow">PROFILE MANAGEMENT / PRIVATE WORKSPACE</p><h1>Keep the record<br /><em>current.</em></h1><p>Basic fields, experience, availability, skills, and portfolio records version independently. An edit to one field won't block a different field or project.</p></div>
        <div className="version-card"><ShieldCheck size={21} /><span>PROFILE ID</span><strong>{contractor.profile.id.slice(0, 8).toUpperCase()}</strong><span>LAST UPDATED</span><strong>{formatDate(contractor.profile.updated_at)}</strong><span>SECTION VERSIONS</span><strong className="versions-line">B {contractor.profile.version} · E {contractor.experience.version} · A {contractor.availability.version}</strong></div>
      </div>
      <div className="sync-note"><span className={`sync-dot ${realtimeStatus === 'SUBSCRIBED' ? 'sync-live' : ''}`} /><span>{realtimeStatus === 'SUBSCRIBED' ? 'Cross-session updates are live.' : 'Cross-session updates are not connected; refresh to check saved data.'} This page keeps your unsaved drafts while saved data refreshes.</span><button onClick={() => void refreshAndReview()}><RefreshCw size={14} /> Refresh & review</button></div>
      {(notice || errorNotice) && <Notice kind={errorNotice ? 'error' : 'success'}>{errorNotice || notice}{errorNotice.includes('refresh') && <button className="notice-action" onClick={() => void refreshAndReview()}>Refresh values</button>}</Notice>}

      <div className="editor-grid">
        <SectionEditor title="Basic information" number="01" version={versions.basics} stale={isStaleBasics} busy={busy === 'basics'} onSave={() => saveSection('basics', async () => {
          const draftToSave = { ...basicDraft }
          const result = await saveBasics({
            contractorId: contractor.profile.id,
            expectedVersions: versions.basicFields,
            changedFields: {
              businessName: draftToSave.businessName !== basicBaseline.businessName,
              description: draftToSave.description !== basicBaseline.description,
              serviceLocation: draftToSave.location !== basicBaseline.location,
              email: draftToSave.email !== basicBaseline.email,
              phone: draftToSave.phone !== basicBaseline.phone,
            },
            businessName: draftToSave.businessName,
            description: draftToSave.description,
            serviceLocation: draftToSave.location,
            email: draftToSave.email,
            phone: draftToSave.phone,
          })
          setBasicBaseline(draftToSave)
          setVersions((current) => ({
            ...current,
            basics: result.version ?? current.basics,
            basicFields: {
              businessName: result.business_name_version ?? current.basicFields.businessName,
              description: result.description_version ?? current.basicFields.description,
              serviceLocation: result.service_location_version ?? current.basicFields.serviceLocation,
              email: result.email_version ?? current.basicFields.email,
              phone: result.phone_version ?? current.basicFields.phone,
            },
          }))
          return result
        })}>
          <p className="mono-note field-version-list">FIELD VERSIONS / NAME {versions.basicFields.businessName} · DESCRIPTION {versions.basicFields.description} · LOCATION {versions.basicFields.serviceLocation} · EMAIL {versions.basicFields.email} · PHONE {versions.basicFields.phone}</p>
          <label>Business or full name<input required minLength={2} maxLength={120} value={basicDraft.businessName} onChange={(e) => setBasicDraft({ ...basicDraft, businessName: e.target.value })} /></label>
          <label>Professional description<textarea maxLength={2000} rows={4} value={basicDraft.description} onChange={(e) => setBasicDraft({ ...basicDraft, description: e.target.value })} /></label>
          <label>Service location<input maxLength={160} value={basicDraft.location} onChange={(e) => setBasicDraft({ ...basicDraft, location: e.target.value })} /></label>
          <div className="form-pair"><label>Contact email <span className="field-private">PRIVATE</span><input type="email" maxLength={254} value={basicDraft.email} onChange={(e) => setBasicDraft({ ...basicDraft, email: e.target.value })} /></label><label>Phone <span className="field-private">PRIVATE</span><input type="tel" maxLength={40} value={basicDraft.phone} onChange={(e) => setBasicDraft({ ...basicDraft, phone: e.target.value })} /></label></div>
        </SectionEditor>
        <SectionEditor title="Experience & qualifications" number="02" version={versions.experience} stale={isStaleExperience} busy={busy === 'experience'} onSave={() => saveSection('experience', () => saveExperience({
          contractorId: contractor.profile.id, expectedVersion: versions.experience,
          years: Number(experienceDraft.years), qualifications: experienceDraft.qualifications,
        }))}>
          <label>Years of experience<input type="number" min="0" max="80" value={experienceDraft.years} onChange={(e) => setExperienceDraft({ ...experienceDraft, years: e.target.value })} /></label>
          <label>Certifications & qualifications<textarea rows={4} maxLength={2000} value={experienceDraft.qualifications} onChange={(e) => setExperienceDraft({ ...experienceDraft, qualifications: e.target.value })} /></label>
        </SectionEditor>
        <SectionEditor title="Availability" number="03" version={versions.availability} stale={isStaleAvailability} busy={busy === 'availability'} onSave={() => saveSection('availability', () => saveAvailability({
          contractorId: contractor.profile.id, expectedVersion: versions.availability,
          status: availabilityDraft.status, note: availabilityDraft.note,
        }))}>
          <label>Current schedule <span className="select-wrap"><select value={availabilityDraft.status} onChange={(e) => setAvailabilityDraft({ ...availabilityDraft, status: e.target.value as AvailabilityStatus })}><option value="available">Available for projects</option><option value="limited">Limited availability</option><option value="unavailable">Fully booked</option></select><ChevronDown size={15} /></span></label>
          <label>Availability note<textarea rows={3} maxLength={500} value={availabilityDraft.note} onChange={(e) => setAvailabilityDraft({ ...availabilityDraft, note: e.target.value })} /></label>
        </SectionEditor>
        <SkillsEditor contractorId={contractor.profile.id} skills={contractor.skills} onChange={async () => {
          if (!await reload()) throw new Error('refresh failed')
        }} />
        <ProjectsEditor contractor={contractor} onChange={async () => {
          if (!await reload()) throw new Error('refresh failed')
        }} />
      </div>
    </div>
  )
}

function SectionEditor({ title, number, version, stale, busy, onSave, children }: {
  title: string; number: string; version: number; stale: boolean; busy: boolean; onSave: () => Promise<void>; children: ReactNode
}) {
  const [localError, setLocalError] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault()
    setLocalError('')
    await onSave()
  }
  return (
    <form className="editor-card" onSubmit={(event) => void submit(event)}>
      <div className="editor-card-header"><span className="editor-number">{number}</span><div><h2>{title}</h2><span className="mono-note">SECTION VERSION {version}</span></div><Check size={17} /></div>
      {stale && <div className="stale-inline"><CircleAlert size={14} /> Newer saved values are available. Refresh before retrying.</div>}
      <div className="editor-fields">{children}</div>
      {localError && <Notice kind="error">{localError}</Notice>}
      <button className="button button-primary save-button" type="submit" disabled={busy}>{busy ? <><LoaderCircle className="spin" size={15} /> Saving…</> : <>Save {title} <ArrowRight size={15} /></>}</button>
    </form>
  )
}

function SkillsEditor({ contractorId, skills, onChange }: { contractorId: string; skills: ContractorSkill[]; onChange: () => Promise<void> }) {
  const [newSkill, setNewSkill] = useState('')
  const [editing, setEditing] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)
  async function run(action: () => Promise<unknown>, message: string) {
    setBusy(true); setError(''); setSuccess('')
    try { await action() }
    catch (caught) {
      setError(caught instanceof Error && caught.message === 'conflict' ? 'This skill changed in another session. Refresh the page to review the latest version.' : caught instanceof Error ? caught.message : 'Skill update failed.')
      setBusy(false)
      return
    }
    try { await onChange(); setSuccess(message) }
    catch (caught) { setError(`Skill saved, but the latest list could not be loaded: ${caught instanceof Error ? caught.message : 'refresh failed'}`) }
    finally { setBusy(false) }
  }
  return (
    <section className="editor-card editor-card-wide">
      <div className="editor-card-header"><span className="editor-number">04</span><div><h2>Skills & specializations</h2><span className="mono-note">EACH SKILL SAVES INDEPENDENTLY</span></div><HardHat size={17} /></div>
      <p className="editor-intro">Add, rename, or remove one specialty at a time. Duplicate specialties are prevented by a database constraint.</p>
      <div className="skill-editor-list">{skills.map((skill) => <div className="skill-editor-row" key={skill.id}>
        <input aria-label={`Skill ${skill.skill}`} maxLength={64} minLength={2} value={editing[skill.id] ?? skill.skill} onChange={(e) => setEditing({ ...editing, [skill.id]: e.target.value })} />
        <span className="mono-note">V{skill.version}</span>
        <button className="small-action" type="button" disabled={busy || (editing[skill.id] ?? skill.skill) === skill.skill} onClick={() => void run(() => renameSkill(skill.id, skill.version, editing[skill.id] ?? skill.skill), 'Skill updated.')}>Save</button>
        <button className="small-action danger-action" type="button" disabled={busy} aria-label={`Remove ${skill.skill}`} onClick={() => void run(() => removeSkill(skill.id, skill.version), 'Skill removed.')}><Trash2 size={15} /></button>
      </div>)}
      {!skills.length && <p className="muted-copy">No skills added yet.</p>}</div>
      <form className="inline-add" onSubmit={(event) => { event.preventDefault(); if (newSkill.trim()) void run(() => addSkill(contractorId, newSkill), 'Skill added.').then(() => setNewSkill('')) }}>
        <label className="sr-only" htmlFor="new-skill">Add a skill</label><input id="new-skill" minLength={2} maxLength={64} required value={newSkill} onChange={(e) => setNewSkill(e.target.value)} placeholder="Add a skill or specialization" />
        <button className="button button-secondary" type="submit" disabled={busy}><Plus size={15} /> Add skill</button>
      </form>
      {error && <Notice kind="error">{error}</Notice>}{success && <Notice kind="success">{success}</Notice>}
    </section>
  )
}

const blankProject: ProjectInput = {
  title: '', category: '', description: '', status: 'completed', completed_on: '', location: '', image_path: null, project_value: null,
}

function ProjectsEditor({ contractor, onChange }: { contractor: ContractorDetail; onChange: () => Promise<void> }) {
  const [draft, setDraft] = useState<ProjectInput>(blankProject)
  const [editingId, setEditingId] = useState<string | undefined>()
  const [editingVersion, setEditingVersion] = useState<number | undefined>()
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)
  function edit(project: PortfolioProject) {
    setEditingId(project.id)
    setEditingVersion(project.version)
    setDraft({
      title: project.title, category: project.category, description: project.description, status: project.status,
      completed_on: project.completed_on ?? '', location: project.location, image_path: project.image_path, project_value: project.project_value,
    })
    setFile(null); setError(''); setSuccess('')
  }
  function clearForm() {
    setEditingId(undefined); setEditingVersion(undefined); setDraft(blankProject); setFile(null)
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    const issue = validateProject({ title: draft.title, category: draft.category, description: draft.description, projectValue: draft.project_value === null ? '' : String(draft.project_value) })
    if (issue) { setError(issue); return }
    setBusy(true); setError(''); setSuccess('')
    let uploadedPath: string | null = null
    try {
      let imagePath = draft.image_path
      if (file) {
        uploadedPath = await uploadProjectImage(contractor.profile.id, file)
        imagePath = uploadedPath
      }
      const previousImage = draft.image_path
      const result = await saveProject({
        contractorId: contractor.profile.id,
        project: { ...draft, title: draft.title.trim(), category: draft.category.trim(), completed_on: draft.completed_on || null, image_path: imagePath },
        projectId: editingId,
        expectedVersion: editingVersion,
      })
      const wasEditing = Boolean(editingId)
      clearForm()
      setSuccess(wasEditing ? `Project updated · version ${result.version ?? editingVersion ?? 1}.` : `Project added · version ${result.version ?? 1}.`)
      try {
        await onChange()
      } catch (refreshError) {
        setError(`Project saved, but this page could not refresh: ${refreshError instanceof Error ? refreshError.message : 'refresh failed'}`)
      }
      if (previousImage && previousImage !== imagePath) {
        try { await removeProjectImage(previousImage) }
        catch (cleanupError) {
          setError(`Project saved, but its previous image could not be removed: ${cleanupError instanceof Error ? cleanupError.message : 'storage error'}`)
        }
      }
    } catch (caught) {
      if (uploadedPath) {
        try { await removeProjectImage(uploadedPath) } catch (cleanupError) {
          setError(`Project save failed; the uploaded image could not be cleaned up (${cleanupError instanceof Error ? cleanupError.message : 'storage error'}).`)
          setBusy(false)
          return
        }
      }
      setError(caught instanceof Error && caught.message === 'conflict'
        ? 'This project changed in another session. Your draft is intact; refresh the project list and review it before retrying.'
        : caught instanceof Error ? caught.message : 'Project could not be saved.')
    } finally { setBusy(false) }
  }
  async function remove(project: PortfolioProject) {
    if (!window.confirm(`Remove “${project.title}” from your portfolio?`)) return
    setBusy(true); setError(''); setSuccess('')
    try {
      await deleteProject(project.id, project.version)
      setSuccess('Project removed.')
      try { await onChange() }
      catch (refreshError) { setError(`Project removed, but this page could not refresh: ${refreshError instanceof Error ? refreshError.message : 'refresh failed'}`) }
      if (project.image_path) {
        try { await removeProjectImage(project.image_path) }
        catch (cleanupError) { setError(`Project removed, but its image could not be deleted: ${cleanupError instanceof Error ? cleanupError.message : 'storage error'}`) }
      }
    } catch (caught) {
      setError(caught instanceof Error && caught.message === 'conflict' ? 'This project changed in another session. Refresh the list before removing it.' : caught instanceof Error ? caught.message : 'Project could not be removed.')
    } finally { setBusy(false) }
  }
  function selectImage(selected: File | undefined) {
    setError('')
    if (!selected) { setFile(null); return }
    const issue = validateImage(selected)
    if (issue) { setError(issue); return }
    setFile(selected)
  }
  return (
    <section className="editor-card editor-card-wide">
      <div className="editor-card-header"><span className="editor-number">05</span><div><h2>Project portfolio</h2><span className="mono-note">ONE PROJECT / ONE VERSION</span></div><FilePlus2 size={17} /></div>
      <p className="editor-intro">Projects are independent records. Adding or changing a project never replaces profile details, skills, or another project.</p>
      <div className="manage-project-list">
        {contractor.projects.map((project) => <div className="manage-project-row" key={project.id}>
          <div><span className="mono-note">V{project.version} / {project.status.replace('_', ' ').toUpperCase()}</span><h3>{project.title}</h3><p>{project.category} · {project.location || contractor.profile.service_location}</p></div>
          <div className="row-actions"><button className="small-action" type="button" onClick={() => edit(project)}><Pencil size={14} /> Edit</button><button className="small-action danger-action" type="button" disabled={busy} onClick={() => void remove(project)} aria-label={`Remove ${project.title}`}><Trash2 size={15} /></button></div>
        </div>)}
        {!contractor.projects.length && <p className="muted-copy">No projects yet. Add a completed project below.</p>}
      </div>
      <form className="project-form" onSubmit={(event) => void submit(event)}>
        <div className="project-form-heading"><h3>{editingId ? 'Edit project' : 'Add a project'}</h3>{editingId && <button type="button" className="small-action" onClick={clearForm}><X size={14} /> Cancel edit</button>}</div>
        <div className="project-fields">
          <label>Project title<input required minLength={2} maxLength={140} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label>
          <label>Category<input required minLength={2} maxLength={80} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} /></label>
          <label>Description<textarea rows={3} maxLength={2000} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></label>
          <div className="form-pair">
            <label>Status <span className="select-wrap"><select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as ProjectStatus })}><option value="completed">Completed</option><option value="in_progress">In progress</option><option value="planned">Planned</option></select><ChevronDown size={15} /></span></label>
            <label>Completion date<input type="date" value={draft.completed_on ?? ''} onChange={(e) => setDraft({ ...draft, completed_on: e.target.value })} /></label>
          </div>
          <div className="form-pair"><label>Project location<input maxLength={160} value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} /></label><label>Project value<input type="number" min="0" step="0.01" value={draft.project_value ?? ''} onChange={(e) => setDraft({ ...draft, project_value: e.target.value ? Number(e.target.value) : null })} /></label></div>
          <label>Optional image <span className="field-private">JPG / PNG / WEBP · 5 MB MAX</span><span className="file-control"><Upload size={15} /><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => selectImage(e.target.files?.[0])} />{file?.name ?? (draft.image_path ? 'Current image attached' : 'Choose an image')}</span></label>
          {draft.image_path && !file && <button className="text-action" type="button" onClick={() => setDraft({ ...draft, image_path: null })}>Remove current image</button>}
        </div>
        <div className="project-form-footer"><span className="mono-note">VERSION {editingVersion ?? 'NEW'}</span><button className="button button-primary" type="submit" disabled={busy}>{busy ? <><LoaderCircle className="spin" size={15} /> Saving…</> : <>{editingId ? 'Save project' : 'Add project'} <ArrowRight size={15} /></>}</button></div>
      </form>
      {error && <Notice kind="error">{error}</Notice>}{success && <Notice kind="success">{success}</Notice>}
    </section>
  )
}

function DemoPage() {
  const { id } = useParams()
  const { contractor, loading, error } = useContractor(id)
  if (loading) return <LoadingState label="Preparing the concurrency demonstration…" />
  if (!contractor) return <ErrorPage message={error} />
  return (
    <div className="demo-page">
      <section className="demo-banner">
        <div className="page-wrap">
          <Link className="demo-back" to={`/contractors/${contractor.profile.id}`}><ArrowLeft size={14} /> Contractor profile</Link>
          <p className="eyebrow">LIVE UPDATE DEMONSTRATION / PROFILE {contractor.profile.id.slice(0, 8).toUpperCase()}</p>
          <h1>Two sessions.<br /><em>No lost work.</em></h1>
          <p>Open this contractor profile in two tabs. Each editor keeps its own section versions, even when both sessions are signed in to the same account.</p>
          <div className="demo-tab-actions"><button className="button button-inverse" onClick={() => window.open(`/manage/${contractor.profile.id}?session=A`, '_blank', 'noopener,noreferrer')}>Open session A <ArrowRight size={15} /></button><button className="button button-inverse" onClick={() => window.open(`/manage/${contractor.profile.id}?session=B`, '_blank', 'noopener,noreferrer')}>Open session B <ArrowRight size={15} /></button></div>
        </div>
      </section>
      <section className="page-wrap demo-steps">
        <div className="section-heading"><div><p className="eyebrow">REPEATABLE TEST / 02 SESSIONS</p><h2>Run the test.</h2></div><span className="mono-note">OPTIMISTIC CONCURRENCY / POSTGRESQL</span></div>
        <div className="demo-step-grid">
          <DemoStep number="01" title="Make independent changes" body="In session A, add or rename a skill. In session B, add a portfolio project. Save both. Each action writes only its own row and both should appear here after refresh." icon={<FilePlus2 />} />
          <DemoStep number="02" title="Create a same-section conflict" body="In both sessions, edit Basic information while both show the same version. Save session A first. Then save session B: the conditional database update rejects the stale version instead of overwriting A." icon={<CircleAlert />} />
          <DemoStep number="03" title="Review the committed state" body="Use Refresh & review in the editor, then return to the directory. The database is the source of truth; searches query the newest committed profiles." icon={<RefreshCw />} />
        </div>
        <div className="demo-state"><div><span className="sync-dot" /><strong>Database version now</strong><span className="mono-note">B {contractor.profile.version} · E {contractor.experience.version} · A {contractor.availability.version} · {contractor.projects.length} PROJECTS</span></div><Link className="button button-secondary" to="/">Check directory <ArrowRight size={15} /></Link></div>
        <p className="demo-caveat"><Clock3 size={15} /> Updates synchronize via Supabase Realtime on the detail and editor pages. If a realtime event is missed, reopen or refresh the page to revalidate. Unsaved drafts are never replaced by background refresh.</p>
      </section>
    </div>
  )
}

function DemoStep({ number, title, body, icon }: { number: string; title: string; body: string; icon: ReactNode }) {
  return <article className="demo-step"><span className="demo-step-number">{number}</span><span className="demo-step-icon">{icon}</span><h3>{title}</h3><p>{body}</p></article>
}

function AuthPage({ session }: { session: Session | null }) {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [location, setLocation] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  if (session) return <Navigate to="/" replace />
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return
    setBusy(true); setError(''); setMessage('')
    try {
      if (mode === 'signin') {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
        if (authError) throw authError
        navigate('/')
      } else {
        const { data, error: authError } = await supabase.auth.signUp({
          email, password, options: { data: { business_name: businessName.trim(), service_location: location.trim() } },
        })
        if (authError) throw authError
        if (data.session) navigate('/manage/me')
        else setMessage('Check your email to confirm your account, then sign in.')
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Authentication failed.')
    } finally { setBusy(false) }
  }
  return (
    <div className="auth-page page-wrap">
      <div className="auth-copy"><p className="eyebrow">CONTRACTOR WORKSPACE</p><h1>Keep good work<br /><em>on the record.</em></h1><p>Sign in to manage your public profile. Each section and portfolio project can be updated independently.</p><div className="auth-private"><LockKeyhole size={17} /> Private contact details stay visible only to you.</div></div>
      <form className="auth-form" onSubmit={(event) => void submit(event)}>
        <div className="auth-switch"><button type="button" className={mode === 'signin' ? 'active' : ''} onClick={() => { setMode('signin'); setError(''); setMessage('') }}>Sign in</button><button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); setError(''); setMessage('') }}>Create profile</button></div>
        <h2>{mode === 'signin' ? 'Welcome back.' : 'Start your profile.'}</h2>
        {mode === 'signup' && <><label>Business or full name<input required minLength={2} maxLength={120} value={businessName} onChange={(e) => setBusinessName(e.target.value)} /></label><label>Service location<input maxLength={160} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, state" /></label></>}
        <label>Email address<input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Password<input required type="password" minLength={6} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {error && <Notice kind="error">{error}</Notice>}{message && <Notice kind="success">{message}</Notice>}
        <button className="button button-primary auth-submit" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'} <ArrowRight size={16} /></button>
        {import.meta.env.DEV && <p className="mono-note demo-login">SEE README FOR LOCAL DEMO ACCOUNTS</p>}
      </form>
    </div>
  )
}

function ProjectCard({ project, editable }: { project: PortfolioProject; editable: boolean }) {
  const image = projectImageUrl(project.image_path)
  const value = project.project_value === null
    ? null
    : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(project.project_value)
  return (
    <article className="project-card">
      {image && <img src={image} alt={`${project.title} project`} className="project-image" />}
      <div className="project-card-top"><span className="mono-note">{project.category.toUpperCase()}</span><span className="mono-note">{project.status.replace('_', ' ').toUpperCase()}</span></div>
      <h3>{project.title}</h3><p>{project.description}</p>
      <div className="project-card-bottom"><span>{project.location || 'Location not listed'}</span><span>{project.completed_on ? formatDate(project.completed_on) : 'Date not listed'}</span>{value && <span>{value}</span>}</div>
      {editable && <span className="mono-note">VERSION {project.version}</span>}
    </article>
  )
}

function SectionTitle({ number, title }: { number: string; title: string }) {
  return <div className="detail-section-title"><span className="mono-note">{number}</span><h2>{title}</h2></div>
}

function Notice({ kind, children }: { kind: 'error' | 'success'; children: ReactNode }) {
  return <div className={`notice notice-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>{kind === 'error' ? <CircleAlert size={16} /> : <Check size={16} />}<span>{children}</span></div>
}

function LoadingState({ label }: { label: string }) {
  return <div className="center-state"><LoaderCircle className="spin" /><p>{label}</p></div>
}

function ErrorPage({ message }: { message: string }) {
  return <div className="page-wrap error-page"><CircleAlert size={24} /><p className="eyebrow">UNABLE TO LOAD</p><h1>We couldn't open<br />this record.</h1><p>{message || 'Try returning to the directory.'}</p><Link className="button button-primary" to="/">Return to directory <ArrowRight size={15} /></Link></div>
}

function NotFound() {
  return <ErrorPage message="That page does not exist." />
}

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(date)
}

export default App
