# NagarDrishti — नगरदृष्टि

**AI-Enabled Civic Issue Reporting & Resolution Tracking for Uttar Pradesh**

NagarDrishti is a bilingual (Hindi 🇮🇳 + English) civic platform where citizens report local problems — waterlogging, garbage, road damage, streetlights, drainage — with photos and GPS location, and government authorities track, update, verify and resolve them.

---

## ✨ Features

### For Citizens (नागरिक)
- **Report an issue** (`/report`) — upload a photo, write a description, pick location on a map or use GPS, choose ward
- **AI classification** — the photo + description are auto-analysed to suggest category, severity (1–3) and a Hindi summary
- **Reference number** — every complaint gets a unique ID like `NG-00101` for tracking
- **Track status** (`/track`) — look up any complaint by reference number and see a 5-step timeline (दर्ज → जांच → निर्धारित → हल हुआ → सत्यापित) with official notes and work photos
- **Language toggle** — full Hindi/English switch in the header (default: Hindi)

### For Authorities (अधिकारी)
- **Secure government-ID login** (`/authority`) — only officials whose government ID is pre-registered in the database (e.g. `UP-GOV-2026-001`) can create an authority account; everyone else signs up as a citizen with no dashboard access
- **Dashboard** — totals, category/ward/status filters, priority-scored cluster hotspots on the map, category charts, pending-work per ward
- **Resolution workflow** — update status with notes, upload work-in-progress and completion photos, verify completed work (✓ कार्य सत्यापित)
- **Full history** — every step of every complaint with date, note and photo

### Intelligence
- **Clustering & priority scoring** — nearby complaints (within 150 m) are grouped into hotspots and ranked by severity × count × recency; runs transparently client-side with configurable parameters (`src/lib/civic.ts`)

---

## 🗺️ Pages

| Page | Purpose |
| --- | --- |
| `/` | Live map of complaints, stats, category grid |
| `/report` | File a new complaint (photo, AI classify, map/GPS location) |
| `/track` | Track a complaint by reference number |
| `/authority` | Government-ID login + authority dashboard |

---

## 🛠️ Tech Stack

**Frontend**
- React 19 + TypeScript
- TanStack Start (full-stack React framework) with TanStack Router & TanStack Query
- Tailwind CSS v4 (earthy oklch palette, Mukta + Rozha One fonts)
- Leaflet + OpenStreetMap for maps
- Sonner for toast notifications

**Backend — Lovable Cloud (powered by Supabase)**
- PostgreSQL database with Row-Level Security (RLS)
- Email authentication
- Private `report-photos` storage bucket (photos shown via signed URLs)
- Server functions (`createServerFn`) for app logic

**AI**
- Lovable AI Gateway (`openai/gpt-6-astra`) for photo + text classification with structured JSON output

---

## 🗄️ Database

| Table | Purpose |
| --- | --- |
| `reports` | Complaints: reference_id, category, description, latitude/longitude, ward, image_path, severity (1–3), status, ai_category, ai_confidence |
| `resolution_records` | Official updates: report_id, status, note, evidence_image_path, updated_by |
| `user_roles` | Roles: `authority` \| `citizen` (kept separate from user-editable metadata) |
| `authority_ids` | Pre-issued government IDs; each usable once, then marked used |
| `has_role()` | Security-definer helper used in RLS policies |

**Access rules (RLS)**
- Anyone can **read** reports and updates, and **submit** new reports
- Only accounts with the `authority` role can **change status** or **add resolution records**
- Statuses: `reported → inspection → assigned → resolved → verified`

---

## 🚀 Run Locally

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

Open the printed local URL. To use the full backend (database, auth, AI, photos), run the project through Lovable where Lovable Cloud is already connected.

### Try it
1. Open **/report**, upload a photo and describe the problem in Hindi or English — AI suggests the category
2. Copy the reference number (e.g. `NG-00101`) and track it on **/track**
3. On **/authority**, create an account with a pre-issued government ID to open the dashboard

---

## 📁 Project Structure (key files)

```
src/
├── routes/
│   ├── index.tsx        # Home — map + stats
│   ├── report.tsx       # Report a complaint
│   ├── track.tsx        # Track by reference number
│   ├── authority.tsx    # Gov-ID login + dashboard
│   └── __root.tsx       # App shell, fonts, theme
├── lib/
│   ├── civic.ts         # Categories, clustering, priority scoring
│   ├── i18n.tsx         # Hindi/English language system
│   ├── classify.functions.ts  # AI classification (server fn)
│   └── reports.ts       # Data queries + photo upload
├── components/          # IssueMap, LazyMap, SiteHeader
└── integrations/supabase/  # Generated database clients
```

---

## 🔐 Notes

- The **first** authority ID issued (`UP-GOV-2026-001`) is for the project owner; new IDs can be added on request
- Every government ID can be used only once — no one can self-assign authority
- Email verification is required for sign-in (accounts can be confirmed on request during setup)
- Citizen photos are stored privately; even the public map shows them only through expiring signed URLs

---

Built with [Lovable](https://lovable.dev).
