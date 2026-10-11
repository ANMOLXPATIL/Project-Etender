import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import {
  ArrowLeft, ArrowRight, Check, ChevronDown, CircleAlert, Clock3,
  ClipboardList, FilePlus2, HardHat, LoaderCircle, LockKeyhole, LogOut, Pencil, Plus, RefreshCw,
  Search, Send, ShieldCheck, Trash2, Upload, X,
} from 'lucide-react'
import {
  addSkill, deleteProject, getCustomerQuote, getMyAccountType, getOwnContractorId, listContractorQuotes,
  listContractors, listMyQuoteRequests,
  ownsContractor, projectImageUrl, removeProjectImage, removeQuoteImages, removeSkill, renameSkill, saveAvailability,
  saveBasics, saveContractorQuote, saveExperience, saveProject, submitQuoteRequest, uploadProjectImage, uploadQuoteImages,
} from './lib/api'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import { validateImage, validateProject, validateQuoteRequest } from './lib/validation'
import { useContractor } from './lib/useContractor'
import type {
  AccountType, AvailabilityStatus, Contractor, ContractorDetail, ContractorSkill, CustomerQuote, PortfolioProject,
  ProjectInput, ProjectStatus, QuoteRequest, QuoteStatus,
} from './types'

function App() {
  const location = useLocation()
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured)

  useEffect(() => {
    if (!location.hash) {
      window.scrollTo(0, 0)
      return
    }
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({ behavior: 'smooth' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [location.key, location.pathname, location.hash])

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
          <Route path="/my-quotes" element={<MyQuotesPage session={session} />} />
          <Route path="/quotes/:token" element={<CustomerQuotePage />} />
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
  const accountType = session?.user.user_metadata.account_type === 'customer' ? 'customer' : 'contractor'
  return (
    <header className="site-header">
      <Link to="/" className="brand" aria-label="Groundwork home">
        <span className="brand-mark"><HardHat size={19} strokeWidth={1.6} /></span>
        <span>GROUNDWORK<span className="brand-dot">.</span></span>
      </Link>
      <nav className="main-nav" aria-label="Main navigation">
        <Link to="/#directory">Find a contractor</Link>
        {session && accountType === 'customer' && <Link to="/my-quotes">My quote requests</Link>}
        {session && accountType === 'contractor' && <Link to="/manage/me">Manage profile</Link>}
      </nav>
      <div className="header-account">
        {session ? (
          <>
            <span className="signed-in mono-note">{session.user.email}</span>
            <button className="icon-button" onClick={() => void signOut()} aria-label="Sign out" title="Sign out"><LogOut size={17} /></button>
          </>
        ) : <Link className="nav-signin" to="/sign-in"><LockKeyhole size={14} /> Log in</Link>}
      </div>
      {signOutError && <p role="alert" className="header-error">{signOutError}</p>}
    </header>
  )
}

function DiscoveryPage() {
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
      void listContractors({ skill, location, availability }).then((rows) => {
        if (active) {
          setContractors(rows)
          setError('')
        }
      }).catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : 'Could not load contractor listings.')
      }).finally(() => { if (active) setLoading(false) })
    }, skill || location || availability ? 160 : 0)
    return () => {
      active = false
      window.clearTimeout(timeout)
    }
  }, [skill, location, availability])

  return (
    <>
      <section className="hero page-wrap">
        <div className="hero-copy">
          <p className="hero-kicker"><span className="hero-kicker-mark" /> A better way to build</p>
          <h1>Make your next<br />project <em>feel right.</em></h1>
          <p className="hero-description">Meet skilled local contractors, explore the work they’re proud of, and find the right fit for your home.</p>
          <div className="hero-actions">
            <Link to="/#directory" className="button button-primary">Find a contractor <ArrowRight size={16} /></Link>
            <Link className="hero-secondary-link" to="/sign-in?account=contractor">I’m a contractor <ArrowRight size={15} /></Link>
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
          <div><p className="eyebrow">YOUR PROJECT STARTS WITH THE RIGHT PEOPLE</p><h2>Find a contractor<br />who gets your vision.</h2><p className="section-intro">Discover skilled professionals across India. Compare real work, then share your project brief and request a quote.</p></div>
          <p className="result-count mono-note">{loading ? 'UPDATING MATCHES…' : `${contractors.length.toString().padStart(2, '0')} MATCHING PROS`}</p>
        </div>
        <div className="search-feature">
          <div className="search-feature-heading"><div><span className="search-feature-icon"><Search size={18} /></span><span><strong>What are you planning?</strong><small>Choose a specialty, area, or availability to find your match.</small></span></div><span className="search-india-badge">BUILT AROUND INDIA</span></div>
          <div className="search-panel">
            <label className="search-field"><span>WHAT WORK DO YOU NEED?</span><input value={skill} onChange={(event) => setSkill(event.target.value)} placeholder="e.g. kitchen renovation, painting" /></label>
            <label className="search-field"><span>WHERE IS THE PROJECT?</span><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="City, area or PIN code" /></label>
            <label className="search-field"><span>CONTRACTOR AVAILABILITY</span><span className="select-wrap"><select value={availability} onChange={(event) => setAvailability(event.target.value)}><option value="">Any schedule</option><option value="available">Available now</option><option value="limited">Limited availability</option><option value="unavailable">Fully booked</option></select><ChevronDown size={15} /></span></label>
          </div>
          <div className="search-suggestions"><span>POPULAR:</span>{['Home renovation', 'Modular kitchen', 'Painting', 'Plumbing'].map((item) => <button type="button" key={item} onClick={() => setSkill(item)}>{item}</button>)}</div>
          {(skill || location || availability) && <button className="search-clear" type="button" onClick={() => { setSkill(''); setLocation(''); setAvailability('') }}>Clear filters <X size={13} /></button>}
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
          <h2>Let your work<br />do the talking<br /><em>for you.</em></h2>
          <p className="band-copy">Showcase real projects with photos, highlight your specialties, and receive detailed enquiries from homeowners ready to get started.</p>
          <Link className="button button-inverse" to="/sign-in">Manage your profile <ArrowRight size={16} /></Link>
        </div>
      </section>
      <section className="page-wrap update-callout">
        <span className="callout-rule" />
        <div><p className="eyebrow">A CLEARER WAY TO GET STARTED</p><h2>From project idea<br />to a useful quote.</h2></div>
        <p>Explore a contractor’s work, share your project scope and timing, then keep your private link to review their estimate and next steps.</p>
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
  const image = projectImageUrl(contractor.featured_image_path)
  return (
    <article className="contractor-card">
      {image && <Link className="contractor-card-image" to={`/contractors/${contractor.id}`} tabIndex={-1} aria-hidden="true"><img src={image} alt="" loading="lazy" /></Link>}
      <div className="card-topline"><span className="mono-note">LOCAL PROFESSIONAL / {String(index + 1).padStart(2, '0')}</span></div>
      <h3><Link to={`/contractors/${contractor.id}`}>{contractor.business_name}</Link></h3>
      <p className="card-location">{contractor.service_location || 'Service area on request'}</p>
      <p className="card-description">{contractor.description || 'A local contractor ready to share more about their work.'}</p>
      <div className="skill-list">{skills.length ? skills.map((name) => <span key={name}>{name}</span>) : <span>Specialties on profile</span>}</div>
      <div className="card-bottom"><span className="availability-label"><i />{availability ? availability.replace('_', ' ') : 'Schedule not listed'}</span><Link to={`/contractors/${contractor.id}`} aria-label={`View ${contractor.business_name}`}><ArrowRight size={17} /></Link></div>
    </article>
  )
}

function QuoteRequestForm({ contractor, session }: { contractor: Contractor; session: Session | null }) {
  const location = useLocation()
  const navigate = useNavigate()
  const draftKey = `quote-draft:${contractor.id}`
  const emptyFields = {
    customerName: '', customerEmail: '', customerPhone: '', projectType: '',
    projectLocation: '', projectDescription: '', budgetRange: '', timeline: '',
  }
  const [fields, setFields] = useState(() => {
    const saved = sessionStorage.getItem(draftKey)
    if (!saved) return emptyFields
    try { return { ...emptyFields, ...JSON.parse(saved) as Partial<typeof emptyFields> } }
    catch { sessionStorage.removeItem(draftKey); return emptyFields }
  })
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [pendingPhotos, setPendingPhotos] = useState(() => sessionStorage.getItem(`${draftKey}:photos`) === 'pending')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file))
    setPreviews(urls)
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [files])

  useEffect(() => {
    if (!session || session.user.user_metadata.account_type !== 'customer') return
    setFields((current: typeof emptyFields) => ({
      ...current,
      customerName: current.customerName || session.user.user_metadata.full_name || '',
      customerEmail: current.customerEmail || session.user.email || '',
    }))
  }, [session])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!session || session.user.user_metadata.account_type !== 'customer') {
      sessionStorage.setItem(draftKey, JSON.stringify(fields))
      if (files.length) sessionStorage.setItem(`${draftKey}:photos`, 'pending')
      const from = `${location.pathname}#request-quote`
      if (session) {
        if (!supabase) { setError('Authentication is not available. Please try again.'); return }
        const { error: signOutError } = await supabase.auth.signOut()
        if (signOutError) { setError(signOutError.message); return }
      }
      navigate(`/sign-in?account=customer&from=${encodeURIComponent(from)}`)
      return
    }
    const requestFields = { ...fields, customerEmail: session.user.email ?? fields.customerEmail }
    const issue = validateQuoteRequest(requestFields)
    if (issue) { setError(issue); return }
    if (!session.user.email) { setError('Your customer account needs an email address to send a quote request.'); return }
    setBusy(true)
    setError('')
    const accessToken = crypto.randomUUID()
    let uploadedPaths: string[] = []
    try {
      uploadedPaths = files.length ? await uploadQuoteImages(session.user.id, files) : []
      await submitQuoteRequest({
        contractorId: contractor.id, accessToken, customerId: session.user.id,
        ...fields, customerEmail: session.user.email, projectImagePaths: uploadedPaths,
      })
      sessionStorage.removeItem(draftKey)
      sessionStorage.removeItem(`${draftKey}:photos`)
      navigate('/my-quotes')
    } catch (caught) {
      if (uploadedPaths.length) {
        try { await removeQuoteImages(uploadedPaths) }
        catch (cleanupError) {
          setError(`Quote request failed and the uploaded photos could not be cleaned up: ${cleanupError instanceof Error ? cleanupError.message : 'storage error'}`)
          setBusy(false)
          return
        }
      }
      setError(caught instanceof Error ? caught.message : 'Your request could not be sent.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="quote-request-section" id="request-quote">
      <div className="quote-request-copy">
        <p className="eyebrow">START A CONVERSATION</p>
        <h2>Tell {contractor.business_name} about your project.</h2>
        <p>Share a few details to request an estimate. Track the contractor’s response in My quote requests.</p>
      </div>
      <form className="quote-form" onSubmit={(event) => void submit(event)}>
        <div className="form-pair">
          <label>Your name<input required minLength={2} maxLength={120} autoComplete="name" value={fields.customerName} onChange={(event) => setFields({ ...fields, customerName: event.target.value })} /></label>
          <label>Email address<input type="email" required maxLength={254} autoComplete="email" value={session?.user.email ?? fields.customerEmail} onChange={(event) => setFields({ ...fields, customerEmail: event.target.value })} disabled={session?.user.user_metadata.account_type === 'customer'} /></label>
        </div>
        <div className="form-pair">
          <label>Phone (optional)<input type="tel" maxLength={40} autoComplete="tel" value={fields.customerPhone} onChange={(event) => setFields({ ...fields, customerPhone: event.target.value })} /></label>
          <label>What work do you need?<input required minLength={2} maxLength={100} placeholder="e.g. Kitchen renovation" value={fields.projectType} onChange={(event) => setFields({ ...fields, projectType: event.target.value })} /></label>
        </div>
        <div className="form-pair">
          <label>Project location<input maxLength={160} autoComplete="street-address" placeholder="e.g. Pune, Maharashtra" value={fields.projectLocation} onChange={(event) => setFields({ ...fields, projectLocation: event.target.value })} /></label>
          <label>Estimated budget
            <select value={fields.budgetRange} onChange={(event) => setFields({ ...fields, budgetRange: event.target.value })}>
              <option value="">Not sure yet</option><option>Under ₹50,000</option><option>₹50,000–₹2 lakh</option>
              <option>₹2–₹10 lakh</option><option>₹10 lakh+</option>
            </select>
          </label>
        </div>
        <label>When would you like to start?
          <select value={fields.timeline} onChange={(event) => setFields({ ...fields, timeline: event.target.value })}>
            <option value="">Flexible</option><option>As soon as possible</option><option>Within 1–3 months</option>
            <option>Within 3–6 months</option><option>Just planning</option>
          </select>
        </label>
        <label>How do you want it done?<textarea required minLength={20} maxLength={2000} rows={5} placeholder="Describe the scope, materials, finish, measurements, and anything else the contractor should know." value={fields.projectDescription} onChange={(event) => setFields({ ...fields, projectDescription: event.target.value })} /></label>
        {pendingPhotos && <Notice kind="success">Your project details were saved while you signed in. Please reattach the photos you selected before logging in.</Notice>}
        <label>Project photos (optional) <span className="field-private">JPG / PNG / WEBP · UP TO 3 PHOTOS · 5 MB EACH</span>
          <span className="file-control"><Upload size={15} /><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => {
            const selected = Array.from(event.target.files ?? [])
            const next = [...files, ...selected]
            if (next.length > 3) { setError('Attach no more than 3 photos.'); event.target.value = ''; return }
            const issue = selected.map(validateImage).find(Boolean)
            if (issue) { setError(issue); event.target.value = ''; return }
            setFiles(next); setError(''); setPendingPhotos(false); sessionStorage.removeItem(`${draftKey}:photos`)
          }} />{files.length ? `${files.length} photo${files.length === 1 ? '' : 's'} selected` : 'Add photos of the space or inspiration'}</span>
        </label>
        {!!previews.length && <div className="quote-photo-previews">{previews.map((src, index) => <div key={src}><img src={src} alt={`Project attachment ${index + 1}`} /><button type="button" className="icon-button" aria-label={`Remove photo ${index + 1}`} onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}><X size={15} /></button></div>)}</div>}
        {!session && <p className="quote-privacy">Sign in or create a customer account to send this request. Your project details will be saved while you log in.</p>}
        {error && <Notice kind="error">{error}</Notice>}
        <button className="button button-primary quote-submit" type="submit" disabled={busy}>{busy ? <><LoaderCircle size={15} className="spin" /> Sending…</> : !session || session.user.user_metadata.account_type !== 'customer' ? <><LockKeyhole size={15} /> Sign in to send quote</> : <>Send quote <Send size={15} /></>}</button>
        <p className="quote-privacy">Your contact details are shared only with this contractor. Track their response under My quote requests.</p>
      </form>
    </section>
  )
}

function CustomerQuotePage() {
  const { token } = useParams()
  const [request, setRequest] = useState<CustomerQuote | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function refresh() {
    if (!token) { setError('This quote link is invalid.'); setLoading(false); return }
    setLoading(true)
    setError('')
    try { setRequest(await getCustomerQuote(token)) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'The quote request could not be loaded.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void refresh() }, [token])

  if (loading && !request) return <LoadingState label="Opening your quote request…" />
  if (error && !request) return <ErrorPage message={error} />
  if (!request) return <ErrorPage message="This quote request could not be found." />
  return (
    <div className="page-wrap quote-tracker-page">
      <Link className="back-link" to={`/contractors/${request.contractor_id}`}><ArrowLeft size={15} /> Contractor profile</Link>
      <div className="quote-tracker-card">
        <p className="eyebrow">PRIVATE QUOTE TRACKER</p>
        <h1>{request.status === 'new' ? 'Request sent.' : request.status === 'quoted' ? 'Your estimate is ready.' : 'An update on your project.'}</h1>
        <p className="quote-tracker-intro">{request.contractor_name} · {request.project_type}</p>
        <div className={`quote-status quote-status-${request.status}`}>{request.status === 'new' ? 'Awaiting contractor response' : request.status === 'quoted' ? 'Estimate received' : 'Contractor unavailable'}</div>
        <div className="quote-summary"><strong>Your project</strong><p>{request.project_description}</p><span>{request.project_location || 'Location not provided'} · {request.timeline || 'Flexible timing'} · {request.budget_range || 'Budget not specified'}</span></div>
        <QuotePhotos images={request.project_images ?? []} />
        {request.status === 'quoted' && <div className="quote-response"><span>ESTIMATED PROJECT COST</span><strong>{formatRupees(request.quote_amount ?? 0)}</strong>{request.quote_message && <p>{request.quote_message}</p>}</div>}
        {request.status === 'declined' && <div className="quote-response"><strong>This contractor cannot take on the project right now.</strong>{request.quote_message && <p>{request.quote_message}</p>}</div>}
        {error && <Notice kind="error">{error}</Notice>}
        <button className="button button-secondary" type="button" onClick={() => void refresh()} disabled={loading}><RefreshCw size={15} /> {loading ? 'Refreshing…' : 'Refresh response'}</button>
        <p className="quote-privacy">Keep this private link to check for updates. No email notification is sent when the contractor responds.</p>
      </div>
    </div>
  )
}

function MyQuotesPage({ session }: { session: Session | null }) {
  const [requests, setRequests] = useState<CustomerQuote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [accountType, setAccountType] = useState<AccountType | null>(null)

  async function refresh() {
    setLoading(true)
    setError('')
    try {
      const type = await getMyAccountType()
      setAccountType(type)
      if (type !== 'customer') {
        setRequests([])
        return
      }
      setRequests(await listMyQuoteRequests())
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Your quote requests could not be loaded.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { void refresh() }, [session])

  if (!session) return <Navigate to="/sign-in?account=customer&from=%2Fmy-quotes" replace />
  if (loading) return <LoadingState label="Loading your quote requests…" />
  if (accountType === 'contractor') return <ErrorPage message="This page is for customer accounts. Sign out and log in as a customer to see quote requests." />
  return (
    <div className="page-wrap my-quotes-page">
      <div className="quote-inbox-heading"><div><p className="eyebrow">YOUR PROJECTS</p><h2>My quote requests</h2></div><button className="button button-secondary" type="button" onClick={() => void refresh()} disabled={loading}><RefreshCw size={14} /> Refresh</button></div>
      {error && <Notice kind="error">{error}</Notice>}
      {!error && !requests.length ? <div className="empty-state"><ClipboardList size={23} /><h3>No quote requests yet.</h3><p>Explore contractor work and send a project enquiry when you’re ready.</p><Link className="button button-primary" to="/#directory">Find a contractor <ArrowRight size={15} /></Link></div> :
        <div className="my-quotes-list">{requests.map((request) => <article className="my-quote-card" key={request.id}>
          <div className="my-quote-heading"><div><span className={`quote-status quote-status-${request.status}`}>{request.status === 'new' ? 'Awaiting response' : request.status === 'quoted' ? 'Quote received' : 'Declined'}</span><h3>{request.project_type}</h3><Link to={`/contractors/${request.contractor_id}`}>{request.contractor_name} <ArrowRight size={13} /></Link></div><time>{formatDate(request.created_at)}</time></div>
          <p>{request.project_description}</p>
          <QuotePhotos images={request.project_images ?? []} />
          {request.status === 'quoted' && <div className="quote-response"><span>ESTIMATED PROJECT COST</span><strong>{formatRupees(request.quote_amount ?? 0)}</strong>{request.quote_message && <p>{request.quote_message}</p>}</div>}
          {request.status === 'declined' && request.quote_message && <p className="quote-decline-message">{request.quote_message}</p>}
        </article>)}</div>}
    </div>
  )
}

function QuoteInbox({ contractorId }: { contractorId: string }) {
  const [requests, setRequests] = useState<QuoteRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  async function refresh() {
    setLoading(true)
    setError('')
    try { setRequests(await listContractorQuotes(contractorId)) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Enquiries could not be loaded.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void refresh() }, [contractorId])
  return (
    <section className="quote-inbox">
      <div className="quote-inbox-heading"><div><p className="eyebrow">CUSTOMER ENQUIRIES</p><h2>Quote requests <span>{requests.length}</span></h2></div><button className="button button-secondary" type="button" onClick={() => void refresh()} disabled={loading}><RefreshCw size={14} /> Refresh</button></div>
      {error && <Notice kind="error">{error}</Notice>}
      {loading && !requests.length ? <div className="loading-row"><LoaderCircle className="spin" /> Loading enquiries…</div> :
        requests.length ? <div className="quote-inbox-list">{requests.map((request) => <QuoteRequestRow key={request.id} request={request} onSaved={refresh} />)}</div> :
          !error && <p className="quote-inbox-empty">No enquiries yet. Customer requests will appear here.</p>}
    </section>
  )
}

function QuoteRequestRow({ request, onSaved }: { request: QuoteRequest; onSaved: () => Promise<void> }) {
  const [amount, setAmount] = useState(request.quote_amount === null ? '' : String(request.quote_amount))
  const [message, setMessage] = useState(request.quote_message)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function save(nextStatus: Exclude<QuoteStatus, 'new'>) {
    if (nextStatus === 'quoted' && (!amount.trim() || !Number.isFinite(Number(amount)) || Number(amount) < 0)) {
      setError('Enter a valid, non-negative estimate before sending a quote.')
      return
    }
    const quoteAmount = nextStatus === 'quoted' ? Number(amount) : null
    setBusy(true); setError(''); setNotice('')
    try {
      await saveContractorQuote({ requestId: request.id, status: nextStatus, amount: quoteAmount, message })
      await onSaved()
      setNotice(nextStatus === 'quoted' ? 'Quotation saved. The customer can view it from their private link.' : 'Response saved.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Your response could not be saved.')
    } finally { setBusy(false) }
  }

  return (
    <article className="quote-request-card">
      <div className="quote-request-card-heading"><div><span className={`quote-status quote-status-${request.status}`}>{request.status === 'new' ? 'New enquiry' : request.status === 'quoted' ? 'Quote sent' : 'Declined'}</span><h3>{request.project_type}</h3></div><time>{formatDate(request.created_at)}</time></div>
      <p className="quote-project-description">{request.project_description}</p>
      <QuotePhotos images={request.project_images ?? []} />
      <div className="quote-request-meta"><span>{request.project_location || 'Location not provided'}</span><span>{request.timeline || 'Flexible timeline'}</span><span>{request.budget_range || 'Budget not specified'}</span></div>
      <div className="quote-customer-contact"><strong>{request.customer_name}</strong><a href={`mailto:${request.customer_email}`}>{request.customer_email}</a>{request.customer_phone && <a href={`tel:${request.customer_phone}`}>{request.customer_phone}</a>}</div>
      <div className="quote-reply-form">
        <label>Estimate (₹)<input type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" /></label>
        <label>Response to customer<textarea rows={3} maxLength={2000} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Share what is included, next steps, or any questions." /></label>
        <div className="quote-reply-actions"><button className="button button-primary" type="button" disabled={busy} onClick={() => void save('quoted')}>{busy ? 'Saving…' : <>{request.status === 'quoted' ? 'Update quote' : 'Send quotation'} <Send size={14} /></>}</button><button className="text-action" type="button" disabled={busy} onClick={() => void save('declined')}>Decline request</button></div>
      </div>
      {error && <Notice kind="error">{error}</Notice>}{notice && <Notice kind="success">{notice}</Notice>}
    </article>
  )
}


function QuotePhotos({ images }: { images: string[] }) {
  if (!images.length) return null
  return <div className="quote-photos">{images.map((src, index) => <a key={src} href={src} target="_blank" rel="noreferrer"><img src={src} alt={`Customer project reference ${index + 1}`} loading="lazy" /></a>)}</div>
}

function formatRupees(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

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
          <a className="button button-secondary" href="#request-quote"><ClipboardList size={15} /> Request a quote</a>
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
      <QuoteRequestForm contractor={contractor.profile} session={session} />
    </div>
  )
}

function ManagePage({ session }: { session: Session | null }) {
  const { id } = useParams()
  if (!session) return <Navigate to="/sign-in" replace state={{ from: `/manage/${id}` }} />
  if (session.user.user_metadata.account_type === 'customer') return <Navigate to="/my-quotes" replace />
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
        <div><p className="eyebrow">PROFILE MANAGEMENT / PRIVATE WORKSPACE</p><h1>Build trust.<br /><em>Win better work.</em></h1><p>Keep your details and availability current, showcase your best project work, and respond to customer enquiries from one place.</p></div>
        <div className="version-card"><ShieldCheck size={21} /><span>PROFILE ID</span><strong>{contractor.profile.id.slice(0, 8).toUpperCase()}</strong><span>LAST UPDATED</span><strong>{formatDate(contractor.profile.updated_at)}</strong><span>SECTION VERSIONS</span><strong className="versions-line">B {contractor.profile.version} · E {contractor.experience.version} · A {contractor.availability.version}</strong></div>
      </div>
      <div className="sync-note"><span className={`sync-dot ${realtimeStatus === 'SUBSCRIBED' ? 'sync-live' : ''}`} /><span>{realtimeStatus === 'SUBSCRIBED' ? 'Cross-session updates are live.' : 'Cross-session updates are not connected; refresh to check saved data.'} This page keeps your unsaved drafts while saved data refreshes.</span><button onClick={() => void refreshAndReview()}><RefreshCw size={14} /> Refresh & review</button></div>
      {(notice || errorNotice) && <Notice kind={errorNotice ? 'error' : 'success'}>{errorNotice || notice}{errorNotice.includes('refresh') && <button className="notice-action" onClick={() => void refreshAndReview()}>Refresh values</button>}</Notice>}

      <QuoteInbox contractorId={contractor.profile.id} />
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
          <div className="form-pair"><label>Project location<input maxLength={160} value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} /></label><label>Project value (₹)<input type="number" min="0" step="0.01" value={draft.project_value ?? ''} onChange={(e) => setDraft({ ...draft, project_value: e.target.value ? Number(e.target.value) : null })} /></label></div>
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
  const [searchParams] = useSearchParams()
  const requestedAccount = searchParams.get('account')
  const returnTo = searchParams.get('from')
  const safeReturnTo = returnTo?.startsWith('/') && !returnTo.startsWith('//') ? returnTo : null
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [accountType, setAccountType] = useState<AccountType>(requestedAccount === 'customer' ? 'customer' : 'contractor')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [location, setLocation] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  if (session) return <Navigate to={safeReturnTo ?? (session.user.user_metadata.account_type === 'customer' ? '/my-quotes' : '/manage/me')} replace />
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return
    setBusy(true); setError(''); setMessage('')
    try {
      if (mode === 'signin') {
        const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
        if (authError) throw authError
        const actualAccount = data.user.user_metadata.account_type === 'customer' ? 'customer' : 'contractor'
        if (actualAccount !== accountType) {
          await supabase.auth.signOut()
          throw new Error(`This account is registered as a ${actualAccount}. Choose “${actualAccount === 'customer' ? 'Customer' : 'Contractor'}” to log in.`)
        }
        navigate(safeReturnTo ?? (accountType === 'customer' ? '/my-quotes' : '/manage/me'), { replace: true })
      } else {
        const { data, error: authError } = await supabase.auth.signUp({
          email, password, options: { data: accountType === 'contractor'
            ? { account_type: accountType, business_name: businessName.trim(), service_location: location.trim() }
            : { account_type: accountType, full_name: fullName.trim() } },
        })
        if (authError) throw authError
        if (data.session) navigate(safeReturnTo ?? (accountType === 'customer' ? '/my-quotes' : '/manage/me'), { replace: true })
        else setMessage('Check your email to confirm your account, then sign in.')
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Authentication failed.')
    } finally { setBusy(false) }
  }
  return (
    <div className="auth-page page-wrap">
      <div className="auth-copy"><p className="eyebrow">GROUNDWORK / YOUR PROJECT STARTS HERE</p><h1>Good work begins<br /><em>with the right fit.</em></h1><p>Customers can find trusted local pros and request estimates. Contractors can showcase their work and manage new enquiries.</p><div className="auth-private"><LockKeyhole size={17} /> Choose how you want to use Groundwork.</div></div>
      <form className="auth-form" onSubmit={(event) => void submit(event)}>
        <p className="auth-role-label">CONTINUE AS</p>
        <div className="auth-role-switch">
          <button type="button" className={accountType === 'customer' ? 'active' : ''} onClick={() => { setAccountType('customer'); setError(''); setMessage('') }}><Search size={16} /> Customer</button>
          <button type="button" className={accountType === 'contractor' ? 'active' : ''} onClick={() => { setAccountType('contractor'); setError(''); setMessage('') }}><HardHat size={16} /> Contractor</button>
        </div>
        <div className="auth-switch"><button type="button" className={mode === 'signin' ? 'active' : ''} onClick={() => { setMode('signin'); setError(''); setMessage('') }}>Sign in</button><button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); setError(''); setMessage('') }}>Create profile</button></div>
        <h2>{mode === 'signin' ? `Welcome back, ${accountType === 'customer' ? 'customer' : 'contractor'}.` : accountType === 'customer' ? 'Create your customer account.' : 'Start your contractor profile.'}</h2>
        {mode === 'signup' && (accountType === 'contractor'
          ? <><label>Business or full name<input required minLength={2} maxLength={120} value={businessName} onChange={(e) => setBusinessName(e.target.value)} /></label><label>Service location<input maxLength={160} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Pune, Maharashtra" /></label></>
          : <label>Your name<input required minLength={2} maxLength={120} autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} /></label>)}
        <label>Email address<input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Password<input required type="password" minLength={6} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {error && <Notice kind="error">{error}</Notice>}{message && <Notice kind="success">{message}</Notice>}
        <button className="button button-primary auth-submit" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'signin' ? `Log in as ${accountType}` : 'Create account'} <ArrowRight size={16} /></button>
        {import.meta.env.DEV && <p className="mono-note demo-login">SEE README FOR LOCAL DEMO ACCOUNTS</p>}
      </form>
    </div>
  )
}

function ProjectCard({ project, editable }: { project: PortfolioProject; editable: boolean }) {
  const image = projectImageUrl(project.image_path)
  const value = project.project_value === null
    ? null
    : formatRupees(project.project_value)
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
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date)
}

export default App
