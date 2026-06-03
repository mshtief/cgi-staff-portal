# CGI Staff Onboarding Portal — Prototype

A working frontend prototype for a personalized staff onboarding portal for Camp Gan Israel Morristown. Mobile-first, clean, simple.

**What this is:** a runnable click-through of the staff experience — login, personalized checklist (driven by role + age + US/international + returning status + pay), task screens (fillable forms, phone uploads, IdentoGO codes, in-person attendance, Kudan course links), and an admin panel. Built in vanilla HTML/CSS/JS so it works anywhere.

**What this isn't (yet):** real authentication, a backend, file storage, or a deployed site. Those come in v2.

## Requirements model (the important part)

Each staff member's checklist is computed: **baseline (everyone) + role add-ons + age/origin/pay filters.**

**Baseline — every staff member:** Employment History & References (pre-filled from application + add-more) · Staff Handbook · Kudan Child-Safety video · In-Person Staff Training (attendance) · Watchdog sex-offender check (admin-run, hidden from staff) · W-9/1099 *only if pay > $1,500*

**Background check — by age + origin:**
- Under 18 (any origin): Watchdog only
- US 18+ (incl. Brooklyn/Phoenix OOT), new: IdentoGO fingerprints + bg-check invite
- US 18+, returning within 5 yrs: Renewal Letter form (certify → notarize → file)
- International 18+: upload home-country background check

**Role training (on top of baseline):**
- Junior Counselor: + Pickle
- Counselor: + Pickle + Difficult Camper
- Head Counselor: + Pickle + Difficult Camper + Head Counselor Training + Expectations sign-off
- Kiddie Lead Teacher / Assistant: baseline only

**Optional / encouraged (never counted):** First Aid/CPR & Mandated Reporter → "I'm interested" emails Chana@ganisrael.org (free Zoom course; camp pays for 16+)

**Dropped from old model:** CARI, CHRI, separate Camp Safety course, the 5 on-site video modules (operations now taught at in-person training).

**Decisions locked:** accounts auto-create on "Contract Signed (HIRED)" · magic-link login · auto-reminders · backend = Google Sheet sync + portal datastore of record (inspection packets) · hosted at `staff.ganisrael.org`.

---

## Run it now

```bash
open ~/CodeClaude/cgi-staff-portal/index.html
```

Opens in your browser. No build, no server, nothing to install.

**Test it on your phone:** serve it locally and open the LAN URL on your phone.
```bash
cd ~/CodeClaude/cgi-staff-portal
python3 -m http.server 8000
# Phone browser: http://<your-mac-ip>:8000
```

## Demo logins

| Code | Role | Profile | What's notable |
|---|---|---|---|
| `aaron-2026` | Junior Counselor | US, under 18, $700 | Watchdog only, Pickle, no 1099 |
| `rachel-2026` | Counselor | US, under 18, $1,100 | Pickle + Difficult Camper, no fingerprints |
| `yaakov-2026` | Head Counselor | US, 18+, new, $2,500 | Fingerprints + bg invite + 1099 + head training |
| `sarah-2026` | Kiddie Lead Teacher | US, 18+, returning, $16k | Renewal Letter (not fingerprints) + 1099 |
| `dovi-2026` | Counselor | International, 18+, $1,200 | Home-country bg check (not fingerprints) |
| `leah-2026` | Kiddie Assistant | International, under 18, $900 | Watchdog only, baseline + child-safety |
| `admin` | Admin panel | — | Stats, activity, search, view-as, inspection |

Each staff member sees a different checklist based on role + age + origin + returning status + pay. Try several logins to see the branching. Progress saves to `localStorage` so a refresh remembers what's done.

## Design principles (per Mendel's direction)

1. **Mobile-first.** Full-width cards, 44px+ tap targets, 16px input font (no iOS zoom), sticky header with name + progress always visible.
2. **Name on top, always.** Every authenticated view shows the staff member's name and progress at the top of the screen.
3. **"What's next" is the hero.** The dashboard leads with ONE clearly-marked next-action card (orange-bordered, big tap target). Everything else is secondary context.
4. **Fewer words, bigger buttons.** Each training card shows: status icon, title, duration, type, chevron. That's it.
5. **Zero-dependency.** No React, no build step. Opens in any browser by double-clicking.

## File structure

```
cgi-staff-portal/
├── index.html              # Shell — views swap inside it
├── styles.css              # Mobile-first CSS, brand colors at top
├── app.js                  # Routing + login + dashboard + module + quiz + admin
├── data.js                 # Training library, role templates, sample staff
├── data/                   # (placeholder for future JSON backend)
├── assets/                 # (placeholder for logo, PDFs, video thumbs)
├── README.md               # This file
└── VIDEO-STRATEGY.md       # AI avatar tool research + production plan
```

## Data model

Three core concepts, all in `data.js`:

### TRAININGS
Every possible training keyed by `id`. Types:
- `external-course` — Kudan-style. Shows access codes, opens external link, expects certificate upload.
- `external-task` — BG check, 1099. Action + mark-complete.
- `video-quiz` — video + quiz. Completion gated by passing quiz.
- `video` — video + acknowledge.
- `document-sign` — downloadable + sign-off.

### ROLE_TEMPLATES
Default required-training list per role:
- `junior-counselor`, `counselor`, `head-counselor`, `lead-teacher`, `assistant`

### STAFF
Each record: `name`, `email`, `loginCode`, `role`, `division`, `completed[]`.

## Personalization logic

1. Staff logs in with their code.
2. App looks up their role (e.g. `counselor`).
3. `ROLE_TEMPLATES[role].required` gives the list of training IDs they need.
4. Dashboard renders each as a card, grouped by category.
5. First incomplete item becomes the "What's next" hero card.
6. Progress bar = `completed.length / required.length`.

Per-staff overrides (Aaron doesn't need first-aid, Rachel has an extra training) will live in the admin panel in v2.

## What's built vs. what's stubbed

| Feature | Built | Next phase |
|---|---|---|
| Login (code-based) | ✅ | Magic-link auth → v2 |
| Personalized dashboard | ✅ | — |
| "What's next" hero | ✅ | — |
| Progress tracking | ✅ (localStorage) | Backend sync → v2 |
| Training module viewer | ✅ | — |
| Video playback | ❌ Placeholder | Embed Cloudflare Stream / YouTube → v2 |
| Quiz engine | ✅ | — |
| Certificate upload | ❌ UI only | File upload to storage → v2 |
| Admin panel | ✅ Read-only preview | Full CRUD → v2 |
| Invitations / email | ❌ | SendGrid or Loops → v2 |
| Google Sheets sync | ❌ | Apps Script backend → v2 |

## Architecture for v2 — integrating with GanIsrael.org (WordPress)

Your main site is WordPress. Two integration approaches:

### Option A — `staff.ganisrael.org` (subdomain) ⭐ RECOMMENDED

Deploy the portal as a completely separate Cloudflare Pages / Vercel site. Point a DNS `CNAME` record from `staff.ganisrael.org` to the hosting provider.

**Pros:**
- Zero risk to your main WordPress site
- No conflicts with WP plugins, themes, or updates
- Can upgrade either site independently
- Easier auth — no WP user system to integrate with

**Cons:**
- Two sites to manage (not really — the portal updates through git/deploy)
- Slightly different URL pattern

**Link from WordPress:** add a "Staff Onboarding" button at the top of `/staff` page pointing to `https://staff.ganisrael.org`.

### Option B — WordPress plugin / embed

Stuff the portal inside WordPress as a custom plugin or page. Much more work, much more fragile. Not recommended unless you have a specific reason to keep everything under one domain with shared login.

### v2 backend — Google Sheets + Apps Script (RECOMMENDED)

You weren't sure what I was asking about "backend preference." The backend is the thing that stores the data — who's on staff, what they've completed, etc. It's the brain behind the portal. Options:

- **Google Sheets + Apps Script (free, easiest for you):** Your master staff list lives in a Google Sheet. Apps Script exposes a small web endpoint the portal calls to read/write. You edit assignments by editing the Sheet — no custom admin UI needed.
- **Airtable ($20/mo):** Like Sheets but with better UI and cleaner API.
- **Supabase (free tier):** Real database, real auth, real file uploads. More power, more to learn.

**My recommendation:** Google Sheets for year 1. You already use Sheets. When you outgrow it, migrate to Supabase without changing the frontend.

### Full recommended stack

| Layer | Choice | Cost |
|---|---|---|
| Frontend | This prototype | Free |
| Hosting | Cloudflare Pages | Free |
| Domain | `staff.ganisrael.org` | Free (if using existing domain) |
| Backend | Google Sheet + Apps Script | Free |
| Auth | Magic-link via Loops or Resend | Free up to 2–3k emails/mo |
| Videos | Cloudflare Stream | ~$5–$10/mo |
| E-sign | Dropbox Sign | $15/mo (optional year 1 — PDFs fine) |
| **Monthly total** | | **$5–$30/mo** |

## V2 build order (once you confirm direction)

1. **Decide video strategy** — read `VIDEO-STRATEGY.md`, pick HeyGen / Hedra / other
2. **Build the Google Sheet master list** — columns matching the data model in `data.js`
3. **Wire up Apps Script backend** — replace seed data in `data.js` with fetch calls
4. **Real admin UI** — CRUD on staff + assignments, send invites
5. **Magic-link auth** — staff gets a login link via email, no password
6. **Record your Day 1 + Mission videos** (your two most-valuable originals)
7. **Deploy to Cloudflare Pages → `staff.ganisrael.org`**
8. **Pilot with ~5 staff for summer 2026**

## Customization quickstart

### Change brand colors
Top of `styles.css`:
```css
:root {
  --navy: #1e3a5f;    /* primary */
  --accent: #f59e0b;  /* accent */
  ...
}
```

### Add a new training
In `data.js`, add to `TRAININGS`:
```js
"my-new-training": {
  id: "my-new-training",
  title: "Something New",
  category: "on-site",
  description: "What it's about.",
  type: "video-quiz",
  duration: "15 min",
  provider: "Camp",
  videoPlaceholder: true,
  quiz: [{ q: "...", options: [...], correct: 0 }],
  resources: []
}
```
Then add `"my-new-training"` to whichever role's `required[]` list needs it.

### Add a role
```js
"my-role": {
  label: "My Role",
  description: "What this role does",
  required: ["bg-check", "1099-form", ...]
}
```

---

**Core idea:** the architecture holds up through everything ahead — role-based assignment, unified module viewer, swappable backend, mobile-friendly by default. Everything after this is data and deployment, not re-architecture.
