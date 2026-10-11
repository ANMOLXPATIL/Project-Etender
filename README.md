# Groundwork e-tender contractor directory

Groundwork is a React + TypeScript contractor directory and profile manager using Supabase Cloud for authentication, PostgreSQL, image storage, and realtime updates. The app does not use mock data or local persistence for contractor records.

## Step-by-step Supabase Cloud setup

### 1. Create a Supabase project

Create a project at [supabase.com/dashboard](https://supabase.com/dashboard). Choose a strong database password and keep it private. Wait for the project to finish provisioning.

### 2. Copy the project API settings

In the project dashboard, open **Project Settings → API** (or **API Keys**):

- Copy the **Project URL**.
- Copy the **Publishable key** (the legacy `anon` key is also accepted).
- Never use or expose a `service_role` or secret key in this frontend.

### 3. Configure the frontend

From the repository root, run:

```powershell
npm ci
Copy-Item .env.example .env
```

Open `.env` and set the values:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Save the file. `.env` is ignored by Git and must not be committed.

### 4. Link the Supabase CLI to the cloud project

Install/use the CLI through `npx`—no Docker or local database is needed:

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
```

Use the project reference shown in the dashboard URL or project settings. If prompted, enter the database password you chose when creating the project.

### 5. Apply the database migration

Push the version-controlled schema, ownership policies, atomic update functions, image bucket, and realtime configuration:

```powershell
npx supabase db push
```

The migrations are in `supabase/migrations/`. Review them before applying to an existing project. Later migrations add quote requests, separate customer and contractor accounts, and featured project images. Migrations `202610110003` and `202610110005` remove the Pune profiles named `neptune` and `neptune india` (including orphaned contractor rows). Migration `202610110006` removes the specifically identified placeholder portfolio project shown in the report screenshot by matching its title, category, location, and ₹67,000 value. Review these targeted deletions before applying them to any other Supabase project. The cleanup migration removes the project record but does not delete files directly from Supabase Storage; remove an orphaned image through the Supabase Storage API or dashboard if needed.

### 6. (Optional) Seed demo contractors

For a **disposable development/test Supabase project only**, run:

```powershell
npx supabase db query --linked --file supabase/seed.sql
```

This seeds twelve demo contractor accounts with India-focused trades and portfolio projects, illustrative project photos, and INR project values. All demo accounts use password `groundwork-demo`:

| Contractor | Location | Email |
| --- | --- | --- |
| Aarav Build & Restore | Pune, Maharashtra | `maya@northline.example` |
| Fieldwork Renovation India | Mumbai, Maharashtra | `james@fieldwork.example` |
| Stone & Timber Studio | Bengaluru, Karnataka | `aisha@stoneandtimber.example` |
| Form & Finish Works | Hyderabad, Telangana | `leo@formandfinish.example` |
| BrightWire Electricals | Chennai, Tamil Nadu | `priya@brightwire.example` |
| AquaFix Plumbing & Pumps | Delhi, Delhi | `rohan@aquafix.example` |
| Rangrez Paint & Finish | Ahmedabad, Gujarat | `meera@rangrez.example` |
| RoofRight Waterproofing | Jaipur, Rajasthan | `arjun@roofright.example` |
| Surya Solar & Electrical | Bengaluru, Karnataka | `kavya@surya.example` |
| TileCraft Flooring Studio | Pune, Maharashtra | `vikram@tilecraft.example` |
| CoolBreeze AC & Home Services | Hyderabad, Telangana | `farah@coolbreeze.example` |
| Mitra Home Renovations | Kolkata, West Bengal | `sana@mitrahome.example` |

The seed is safe to rerun for these sample records: it updates matching demo portfolio projects rather than duplicating them. **Do not run the demo seed on a production project.** You can skip this step and create an account through the app instead.

### 7. Configure Supabase Auth

In the Supabase dashboard, open **Authentication → URL Configuration**:

- Set the **Site URL** to `http://localhost:5173` for development.
- Add `http://localhost:5173/**` to the allowed redirect URLs if prompted.
- Keep email confirmation enabled if you want verified accounts. New users can edit their profile after confirming and signing in.

### 8. Start the app

```powershell
npm run dev
```

Open the local URL Vite prints (normally `http://localhost:5173`). Restart the dev server after changing `.env`.

## Hackathon concurrency walkthrough

1. Sign in with a seeded demo account, or create a contractor account.
2. Search the directory by contractor name, skill, location, or availability. Open the profile.
3. For contractor concurrency testing, open **Session A** and **Session B** in separate tabs. Both must be signed in as the contractor who owns that profile. For independently authenticated sessions, use a separate browser profile for the second tab.
4. In session A, add a skill. In session B, add a portfolio project. Both changes should remain after the profile refreshes.
5. In both sessions, edit the same basic field before either saves. Save session A first, then submit session B. Session B should report a stale-field conflict instead of replacing A's saved value.
6. Select **Refresh & review** in B, then revisit the contractor listing and search to verify the committed data.

## Architecture and security

- React, TypeScript, Vite, Tailwind CSS, and React Router power the frontend.
- Supabase Auth owns account sessions. A private ownership mapping links each authenticated user to their contractor. Public listings omit ownership and private contact details.
- Login and account creation distinguish customer and contractor accounts. Customers manage their sent enquiries; contractors manage their profile and incoming requests.
- PostgreSQL stores normalized contractor sections, individual skills, and portfolio projects. Row Level Security and owner-checking RPCs protect writes and private contact data.
- Signed-in customers can request a project estimate from a contractor profile, describe the work and preferred finish, attach up to three reference photos, and track replies from **My quote requests**. Contractors review enquiries and send or decline INR estimates from their private workspace.
- Basic profile fields (business name, description, service location, email, phone), experience, availability, individual skills, and individual projects use independent version checks. Atomic PostgreSQL functions detect stale writes while allowing independent fields/records to save concurrently.
- Supabase Storage holds project portfolio images; owner policies restrict uploads and changes. The latest uploaded portfolio image is featured in directory cards.
- Only the project URL and publishable key are used by the browser. No Supabase service-role key belongs in `.env` or frontend code.

## Checks

```powershell
npm test
npm run build
```

The SQL concurrency and authorization assertions are in `supabase/tests/profile_concurrency.test.sql`. They require a database test runner and are not run by the frontend test command. The frontend tests check project validation and image type/size limits.

## Known limitations

- A Supabase Cloud project and valid URL/publishable key are required for app data and authentication.
- Customers need to create an account and sign in before sending an enquiry. Quote updates are available in **My quote requests**; email notifications are not configured.
- Sample contractor profiles, phone numbers, locations, and project values are illustrative India-oriented demo data, not verified businesses or actual estimates.
- Public quote requests do not yet have CAPTCHA or automated rate limiting; add abuse controls before promoting the form broadly.
- Optional image upload and the related database write are separate Storage and PostgreSQL operations; if saving fails after upload, the app attempts to remove the uploaded image and reports cleanup errors.
- Before production deployment, configure the production Site URL and redirect URLs, decide the email verification policy, and review privacy, rate limiting, and operational requirements.
