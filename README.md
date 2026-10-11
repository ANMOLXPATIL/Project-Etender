<div align="center">

# GROUNDWORK

### See the work. Discover the people behind it. Get the job started.

**A work-first contractor discovery platform for India.**

Explore real projects, discover skilled contractors, compare their experience, and approach the right person with a project quote request.

</div>

---

## The idea

Groundwork rethinks the traditional contractor directory.

Instead of choosing a contractor from a name and a phone number alone, customers can discover contractors through the work they showcase: renovation projects, electrical installations, plumbing work, carpentry, painting, construction, and more.

The product direction is **social discovery for contractors' work**. The work is the starting point: people browse portfolios, understand a contractor's approach and experience, then contact them through a quote request. It combines the discovery feel of a work-sharing community with the practical tools of a contractor directory and quotation marketplace.

> **Discover the work. Evaluate the experience. Approach the contractor.**

## What Groundwork does

### Discover contractors

- Browse contractor profiles and completed projects.
- Filter contractors by skill, location, and availability.
- Explore India-focused trades and services, including home renovation, modular kitchens, painting, plumbing, electrical work, waterproofing, flooring, and solar installation.
- View experience, specializations, and portfolio details before reaching out.

### Request a quote

- Customers can prepare a quote request before signing in.
- Sending a request requires authentication.
- Requests can include a work description, location, timeline, and up to three optional photos.
- Draft text fields are preserved in the current browser session if a customer signs out while preparing a request.
- Customers and contractors have role-specific account flows.

### Manage contractor profiles

- Contractor accounts can manage their profile, skills, experience, availability, and portfolio.
- Portfolio projects can be managed separately from unrelated profile information.
- Contractors can upload up to three images per portfolio project.
- Contractors can respond to customer quote requests.

### Handle concurrent profile updates

The hackathon challenge focuses on a common reliability problem: two changes may happen before a contractor's profile has been refreshed.

Groundwork uses independent profile sections and records, version checks, and atomic database operations to help ensure that:

- Updates to different fields or records can both be saved.
- Adding a portfolio project does not replace an unrelated skills update.
- Stale edits to the same field are detected instead of silently overwriting newer data.
- The interface can refresh saved data while preserving unsaved drafts.

The concurrency walkthrough is designed to demonstrate the behavior using two editing sessions. The SQL concurrency and authorization assertions are kept separately from the frontend unit tests.

## How it works

1. **Explore** — Browse contractor profiles, skills, locations, availability, and project portfolios.
2. **Evaluate** — Review the work and experience relevant to your needs.
3. **Approach** — Prepare a quote request with the job details, location, timeline, and optional photos.
4. **Connect** — Sign in to send the request and use the customer or contractor workflow.
5. **Keep profiles current** — Contractors update skills and projects independently, with conflict handling for competing edits.

## Built with

| Area | Technology | Purpose |
| --- | --- | --- |
| Frontend | React 18, TypeScript, Vite | Application UI and development build |
| Styling | Tailwind CSS and project styles | Responsive UI and the Minimalist Monochrome visual system |
| Navigation | React Router | Page and workflow navigation |
| Icons | Lucide React | Consistent line icons |
| Database | Supabase PostgreSQL | Persistent relational data and transactional operations |
| Authentication | Supabase Auth | Account sessions and role-based workflows |
| Security | PostgreSQL Row Level Security (RLS) | Restricts access to data and authorized writes |
| Media | Supabase Storage | Project and quote-request images |
| Synchronization | Supabase Realtime | Refreshes saved profile data across sessions where configured |
| Tests | Vitest | Frontend unit and validation tests |

## Design direction

Groundwork uses a **Minimalist Monochrome** design system: editorial typography, black and white, precise alignment, sharp rectangular elements, strong rules, and generous negative space.

- **Palette:** black `#000000`, white `#FFFFFF`, off-white `#F5F5F5`, secondary text `#525252`, subtle dividers `#E5E5E5`.
- **Typography:** Playfair Display for major headlines, Source Serif 4 for body copy, and JetBrains Mono for metadata.
- **Components:** square corners, clear borders, high-contrast buttons, visible keyboard focus, and mobile-friendly touch targets.
- **Responsive layout:** supports desktop, tablet, and narrow phone screens, including layouts down to 320px.

The goal is to make project work and contractor experience the focus, not to bury them inside a generic dashboard.

## Demo data

The supplied demo dataset includes **12 contractor profiles** covering trades across India.

| Contractor | Specialty | Location |
| --- | --- | --- |
| Aarav Build & Restore | Residential construction | Pune, Maharashtra |
| Fieldwork Renovation India | Kitchen and bathroom renovation | Mumbai, Maharashtra |
| Stone & Timber Studio | Woodwork and masonry | Bengaluru, Karnataka |
| Form & Finish Works | Finish carpentry | Hyderabad, Telangana |
| BrightWire Electricals | Electrical work and solar | Chennai, Tamil Nadu |
| AquaFix Plumbing & Pumps | Plumbing and water systems | Delhi |
| Rangrez Paint & Finish | Interior and exterior painting | Ahmedabad, Gujarat |
| RoofRight Waterproofing | Terrace and roof repairs | Jaipur, Rajasthan |
| Surya Solar & Electrical | Rooftop solar and electrical | Bengaluru, Karnataka |
| TileCraft Flooring Studio | Floor and wall tiling | Pune, Maharashtra |
| CoolBreeze AC & Home Services | AC and home maintenance | Hyderabad, Telangana |
| Mitra Home Renovations | End-to-end home renovation | Kolkata, West Bengal |

The demo content uses Indian trades and locations, phone-number formatting for India, and project values displayed in Indian rupees (INR).

### Demo account

The project summary lists the following contractor demo account:

- **Email:** `priya@brightwire.example`
- **Password:** `groundwork-demo`

Seed scripts and demo accounts are for development only. Check the current `supabase/seed.sql` before relying on a particular account, and never use demo credentials in production. **Do not run the demo seed against a production database.**

## Getting started

Groundwork uses Supabase Cloud for authentication, PostgreSQL, storage, and application data. A Supabase project and valid frontend credentials are required for the complete application flow.

### 1. Requirements

- Node.js and npm.
- A Supabase account and project: [supabase.com/dashboard](https://supabase.com/dashboard).
- The Supabase CLI, invoked through `npx` in the commands below.

### 2. Install dependencies

From the repository root:

```powershell
npm ci
Copy-Item .env.example .env
```

If you use macOS or Linux, the equivalent copy command is:

```bash
cp .env.example .env
```

### 3. Configure environment variables

In the Supabase dashboard, open **Project Settings → API** or **API Keys**. Copy the project URL and publishable key, then add them to `.env`:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Replace the placeholders with values from your own project. Restart the Vite development server after changing environment variables.

> Never put a Supabase `service_role` key or secret key in frontend environment variables. Vite variables prefixed with `VITE_` are exposed to the browser.

### 4. Log in and link the Supabase CLI

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
```

Use the project reference shown in the Supabase dashboard. Follow the CLI prompts to authenticate and link the project.

### 5. Apply database migrations

Review the SQL files in `supabase/migrations/`, especially before applying them to a project that already contains data. Then push the version-controlled schema and policies:

```bash
npx supabase db push
```

The migration set covers the application schema, ownership and access policies, profile update functions, quote requests, image storage policies, and demo-data adjustments. Use migrations as the source of truth for the deployed schema.

### 6. Seed demo data (optional)

Use a **disposable development or test project only**. Review `supabase/seed.sql` first, then run the project's supported seed command. If the repository's `package.json` defines the seed script, use:

```bash
npm run seed
```

The Supabase CLI file-based alternative documented for this project is:

```bash
npx supabase db query --linked --file supabase/seed.sql
```

Use one seed method, not both. If the CLI version does not support `db query --linked --file`, use the SQL Editor in the Supabase dashboard or the available project script. Do not seed a production database.

### 7. Configure Supabase Auth

In **Authentication → URL Configuration**:

- Set the development Site URL to `http://localhost:5173`.
- Add `http://localhost:5173/**` to the allowed redirect URLs if required by the configured auth flow.
- Choose the email-confirmation policy appropriate for your development setup. If confirmation is enabled, users may need to verify their email before signing in.

For deployment, replace the development URL with the production domain and configure the corresponding redirect URLs.

### 8. Start the application

```bash
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`.

## Concurrency demo walkthrough

Use this workflow to demonstrate the core hackathon challenge:

1. Sign in with a seeded contractor account or create a contractor account.
2. Open the contractor directory, apply a skill or location filter, and open the contractor's profile.
3. Open **Concurrency demo** and launch Session A and Session B in separate tabs. For truly independent authentication sessions, use a separate browser profile for the second session. Both sessions must be authorized to edit the same contractor.
4. In Session A, add a skill. In Session B, add a portfolio project. Save both changes and verify that both remain after refreshing the profile.
5. In both sessions, load and edit the same basic field before either session saves.
6. Save Session A first. Submit the stale edit from Session B.
7. Confirm Session B reports a conflict instead of silently overwriting Session A's saved value.
8. Use **Refresh & review**, then return to contractor discovery to check that the latest committed information appears in the profile and filters.

## Architecture and data integrity

- **Authentication:** Supabase Auth manages user sessions. A private ownership mapping associates an authenticated user with their contractor profile.
- **Relational data:** PostgreSQL stores contractor details, profile sections, skills, quote requests, and individual portfolio project records.
- **Concurrency:** Version checks and atomic PostgreSQL functions detect stale changes while allowing independent records or fields to be updated without replacing the entire profile.
- **Access control:** Row Level Security and owner-checking database functions restrict writes to authorized users. Public views should expose only fields intended for discovery.
- **Images:** Supabase Storage holds project and quote-request images, with access policies controlling who can upload and retrieve them.
- **Realtime:** Supabase Realtime refreshes saved profile data where configured, without treating unsaved client drafts as authoritative.
- **Secrets:** The browser uses only the project URL and publishable key. A Supabase service-role or secret key must never be bundled into the frontend.

## Testing and build

Run frontend tests and a production build from the repository root:

```bash
npm test
npm run build
```

The supplied completion summary reports **5/5 frontend test cases passing** and a successful production build. Re-run these commands against your current checkout to verify its present state.

Frontend tests cover areas including contractor search filters, quote-form validation, image upload validation, project data, and navigation. SQL concurrency and authorization assertions are located in `supabase/tests/profile_concurrency.test.sql`; they require a compatible database test runner and are not executed by the frontend test command.

## Known limitations and production considerations

- A configured Supabase Cloud project is required for live application data and authentication.
- Project image upload and the associated database write are separate operations. If the database write fails after upload, the app attempts to remove the uploaded image and reports cleanup errors.
- Before production deployment, review RLS policies, public/private field exposure, email verification, allowed redirect URLs, rate limiting, image access policies, privacy requirements, and operational monitoring.
- Demo accounts and seed data are strictly for development and demonstration.
- The product direction emphasizes work discovery and direct quote requests. Social features such as following contractors, likes, comments, and a personalized activity feed should be treated as future additions unless they exist in the current codebase.

## Roadmap ideas

- Work feed for newly completed projects and contractor updates.
- Follow contractors or trades to personalize discovery.
- Likes, comments, and project questions, with moderation controls.
- Reviews and ratings tied to completed jobs.
- Quote negotiation and revision workflow.
- Customer-contractor messaging and notifications.
- Contractor analytics for profile views and quote requests.
- Admin tools for verification and content moderation.

## Project status

Groundwork is a functional contractor discovery and quote-request prototype with role-based workflows, portfolio management, responsive layouts, Supabase-backed data, and a concurrency-focused profile update design. Verify the current code, migrations, and tests before describing a particular deployment as production-ready.

---

<div align="center">

**Groundwork — built around the work, not just the listing.**

</div>
