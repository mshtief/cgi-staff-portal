// =============================================================================
// CGI Staff Onboarding Portal — seed data + requirements model (v3)
//
// Built from Mendel's spec (June 2026). Key rules:
//   • Roles: junior-counselor, counselor, head-counselor, kiddie-lead-teacher,
//     kiddie-assistant
//   • Baseline (EVERYONE): employment history, handbook, Kudan child-safety
//     video, in-person staff training (attendance), Watchdog (admin-run),
//     1099 form: shown only to staff the office designates (internal criteria)
//   • Background check by age + origin:
//       under 18 (any origin) ........ Watchdog only
//       US 18+ (incl. OOT) new ....... IdentoGO fingerprints + bg-check invite
//       US 18+ returning <5yr ........ renewal-letter form (sign → notarize)
//       international 18+ ............. upload home-country background check
//   • Kudan courses (codes: boys MOTOWN86B / girls MOTOWN86):
//       MANDATORY all staff ......... Child Safety
//       MANDATORY counselor staff ... Pickle (jr-counselor, counselor, head;
//                                     NOT kiddie lead-teacher/assistant)
//       OPTIONAL but recommended .... Difficult Camper (everyone),
//                                     Head Counselor course (head counselors only)
//   • Head Counselor Expectations (camp doc) — mandatory for head counselors
//   • Optional/recommended (NOT counted): First Aid/CPR →
//     "I'm interested" emails Chana@ganisrael.org  (mandated reporting is part of
//     in-person training — intentionally NOT a portal item)
//
// Maps to Google Sheet CGI_Morristown_Staff_Hiring_2026_MASTER_v1.
// Backend plan (v2): portal datastore of record (uploads + inspection export)
// that ALSO syncs status back to the master sheet.
//
// Wrapped in IIFE to avoid global-scope collisions with app.js.
// =============================================================================

(function() {

const CHANA_EMAIL = "Chana@ganisrael.org";
const DIRECTOR_EMAIL = "office@ganisrael.org";
const COMP_1099_THRESHOLD = 1500;

// ChinuchTools (Rabbi Kudan) — 2026 access codes (boys & girls are different).
const CHINUCH_CODES = { boys: "MOTOWN86B", girls: "MOTOWN86" };
const CHINUCH_STEPS = [
  "Download the Chinuch Tools app (App Store or Play Store) — or use a browser at chinuchtools.com",
  "Log in, or create an account if it's your first time",
  "Go to Dashboard → Access Codes",
  "Enter the access code shown above",
  "Open Library → My Courses and select the course(s) that apply to you",
  "Watch the recording",
  "(Optional) view or print the notes",
  "Take the quiz and answer all the questions",
  "Your certificate will appear in your course menu",
  "Forward your certificate to the camp director (office@ganisrael.org)"
];

// =============================================================================
// TRAINING / TASK LIBRARY
//
// type drives how the module screen renders:
//   fillable-form  → form filled IN the portal (employment history, renewal)
//   upload         → phone-friendly upload (fingerprint receipt, home bg check)
//   external-course→ link out (Kudan / chinuchtools) + access codes
//   doc-sign       → read a doc + acknowledge (handbook)
//   in-person      → attendance item (date/location, "I'll be there")
//   external-task  → camp-initiated action (bg-check email invite)
//   optional-request→ "I'm interested" → emails a coordinator (not required)
//   admin-task     → admin does it; staffVisible:false (Watchdog)
//
// appliesIf gates assignment:
//   { is18Plus, isFromUS, isReturning, minCompensation }
// staffVisible:false hides from staff dashboards (admin-tracked).
// optional:true shows in the encouraged section, never counts toward progress.
// =============================================================================
const TRAININGS = {

  // ─── Baseline paperwork (everyone) ────────────────────────────────────────
  "employment-history": {
    id: "employment-history",
    title: "Employment History & References",
    category: "paperwork",
    description: "Confirm your past employment and 3 references. We've pre-filled what you gave us on your application — just review it, fill any gaps, and add more if needed.",
    type: "fillable-form",
    formKind: "employment-history",
    duration: "10 min",
    provider: "Camp",
    completionMethod: "submit-form",
    resources: []
  },

  "staff-handbook": {
    id: "staff-handbook",
    title: "Staff Handbook",
    category: "paperwork",
    description: "Read the staff handbook — organized by topic, right here in the portal — then acknowledge.",
    type: "doc-sign",
    duration: "15 min",
    provider: "Camp",
    completionMethod: "acknowledgment",
    resources: []
  },

  "in-person-training": {
    id: "in-person-training",
    title: "In-Person Staff Training",
    category: "on-site",
    description: "Attend staff training in person on the scheduled day(s). This is where we cover day-to-day camp operations, your role, the daily flow, and what to do from the moment you arrive.",
    type: "in-person",
    duration: "Scheduled session",
    provider: "Camp",
    dateText: "Date & time to be announced — your director will let you know",
    completionMethod: "attendance-ack",
    resources: []
  },

  "1099-form": {
    id: "1099-form",
    title: "W-9 / 1099 Tax Form",
    category: "paperwork",
    description: "We'll need a W-9 on file so we can issue your 1099 at year-end. Download the form below, fill out and sign page 1, then upload it.",
    type: "upload",
    duration: "5 min",
    provider: "Camp",
    appliesIf: { minCompensation: COMP_1099_THRESHOLD },
    completionMethod: "upload",
    uploadLabel: "Upload your completed W-9 (page 1)",
    resources: [{ label: "Download the W-9 form (fill out page 1)", url: "assets/W-9.pdf" }]
  },

  // ─── Legal / background (age + origin gated) ──────────────────────────────
  "watchdog-clearance": {
    id: "watchdog-clearance",
    title: "Sex-Offender Registry Check (Watchdog)",
    category: "admin-only",
    description: "Director runs each staff member's name + city through the Watchdog sex-offender registry and files the clearance. No action needed from staff.",
    type: "admin-task",
    provider: "Camp Director (internal)",
    staffVisible: false,
    completionMethod: "admin-confirms",
    resources: []
  },

  "fingerprints-identogo": {
    id: "fingerprints-identogo",
    title: "Fingerprint Appointment (IdentoGO)",
    category: "paperwork",
    description: "Required for US staff 18+ who haven't fingerprinted with us in the last 5 years. Schedule and complete an IdentoGO appointment using the codes below, then upload your receipt.",
    type: "external-task",
    duration: "~45 min",
    provider: "IdentoGO (NJ-approved vendor)",
    action: "Follow the steps below to book and complete your appointment, then upload the receipt.",
    appliesIf: { is18Plus: true, isFromUS: true, isReturning: false },
    completionMethod: "receipt-upload",
    externalUrl: "https://uenroll.identogo.com",
    serviceCode: "2F1329",
    caseNumber: "DC0932170500087",
    instructions: [
      "Go to https://uenroll.identogo.com",
      "Enter Service Code: 2F1329 → click Go",
      "Fill out your personal information",
      "When asked for Contributor Case Number, enter: DC0932170500087",
      "Pick a fingerprinting location near you",
      "Choose an appointment time",
      "Bring a VALID photo ID (driver's license, permit, passport, or government ID)",
      "After fingerprinting: SAVE your receipt",
      "Upload a photo or PDF of the receipt below"
    ],
    allowUpload: true,
    uploadLabel: "Upload your fingerprint receipt",
    resources: []
  },

  "bg-check-invite": {
    id: "bg-check-invite",
    title: "Background Check (email invite)",
    category: "paperwork",
    description: "We'll email you (from a no-reply address) an invite to complete your background check. Watch your inbox and spam. Required for US staff 18+.",
    type: "external-task",
    duration: "10 min",
    provider: "Camp (external service)",
    action: "Watch for the invite email from a no-reply address → click the link → complete the form. Check spam if it hasn't arrived within 48 hours of being hired.",
    appliesIf: { is18Plus: true, isFromUS: true, isReturning: false },
    completionMethod: "auto-confirmed",
    resources: []
  },

  "bg-renewal-letter": {
    id: "bg-renewal-letter",
    title: "Background Check Renewal Letter",
    category: "paperwork",
    description: "Since you fingerprinted with us in the last 5 years, you just need to certify nothing has changed. Fill out the form below — we'll print it, notarize it, and file it.",
    type: "fillable-form",
    formKind: "renewal-letter",
    duration: "3 min",
    provider: "Camp",
    appliesIf: { is18Plus: true, isFromUS: true, isReturning: true },
    completionMethod: "submit-form",
    certifyText: "I hereby certify that the results of my criminal history status remain unchanged from the date they were performed.",
    resources: []
  },

  "home-country-bg-check": {
    id: "home-country-bg-check",
    title: "Home-Country Background Check",
    category: "paperwork",
    description: "As an international staff member 18+, NJ rules let you satisfy our background requirement with an equivalent criminal background check from your country of origin. Upload it here.",
    type: "upload",
    duration: "Varies",
    provider: "Your country of origin",
    action: "Obtain an official criminal background check from your home country (the equivalent of a US background check) and upload it below.",
    appliesIf: { is18Plus: true, isFromUS: false },
    completionMethod: "upload",
    uploadLabel: "Upload your home-country background check",
    resources: []
  },

  // ─── NJ Working Papers (under-18 US staff) ────────────────────────────────
  "working-papers-nj": {
    id: "working-papers-nj",
    title: "NJ Working Papers (Under 18)",
    category: "paperwork",
    description: "NJ law requires working papers for employed minors under 18. It's a quick online process. You'll need the camp's employer code (below), and a parent/guardian helps verify your age.",
    type: "external-task",
    duration: "~15 min (online)",
    provider: "NJ Dept. of Labor",
    action: "Register at the NJ working papers portal, enter the camp's 8-digit employer code, and have a parent/guardian complete their part. Approval arrives by email.",
    appliesIf: { is18Plus: false, isFromUS: true },
    completionMethod: "auto-confirmed",
    externalUrl: "https://myworkingpapers.nj.gov",
    employerCode: "00304001",
    instructions: [
      "Go to https://myworkingpapers.nj.gov",
      "Register as a young worker (first time only)",
      "Enter the camp's 8-digit Employer Unique Code (shown above)",
      "Enter your parent / guardian's name and email",
      "Your parent uploads your age verification (birth certificate or passport)",
      "Watch your email — the state notifies you when it's approved",
      "Forward your approval to the camp office"
    ],
    note: "Hours for minors: ages 14–15 up to 8 hrs/day (40/week); ages 16–17 up to 10 hrs/day (50/week).",
    resources: []
  },

  // ─── Pre-Camp Videos (segmented; each staffer sees exactly one) ────────────
  // Replaced the live Zooms. Scripts brainstormed per division, then produced
  // as avatar videos. videoUrl stays empty until each video is ready.
  "video-boys-local": {
    id: "video-boys-local",
    title: "Pre-Camp Video — Boys Division (Local)",
    category: "video",
    description: "A short video to help local boys division staff get ready for the summer — how things work, key dates, and what to expect.",
    type: "video",
    duration: "Coming soon",
    provider: "Camp",
    appliesIf: { division: "boys", outOfTown: false },
    videoUrl: "",
    comingSoon: true,
    completionMethod: "watch-ack",
    resources: []
  },
  "video-boys-oot": {
    id: "video-boys-oot",
    title: "Pre-Camp Video — Boys Division (Out-of-Town)",
    category: "video",
    description: "A video for out-of-town boys division staff — travel, arrival, housing, and what to expect when you get here.",
    type: "video",
    duration: "Coming soon",
    provider: "Camp",
    appliesIf: { division: "boys", outOfTown: true },
    videoUrl: "",
    comingSoon: true,
    completionMethod: "watch-ack",
    resources: []
  },
  "video-girls-local": {
    id: "video-girls-local",
    title: "Pre-Camp Video — Girls Division (Local)",
    category: "video",
    description: "A short video to help local girls division staff get ready for the summer — how things work, key dates, and what to expect.",
    type: "video",
    duration: "Coming soon",
    provider: "Camp",
    appliesIf: { division: "girls", outOfTown: false },
    videoUrl: "",
    comingSoon: true,
    completionMethod: "watch-ack",
    resources: []
  },
  "video-girls-oot": {
    id: "video-girls-oot",
    title: "Pre-Camp Video — Girls Division (Out-of-Town)",
    category: "video",
    description: "A video for out-of-town girls division staff — travel, arrival, housing, and what to expect when you get here.",
    type: "video",
    duration: "Coming soon",
    provider: "Camp",
    appliesIf: { division: "girls", outOfTown: true },
    videoUrl: "",
    comingSoon: true,
    completionMethod: "watch-ack",
    resources: []
  },
  "video-kiddie": {
    id: "video-kiddie",
    title: "Pre-Camp Video — Kiddie Camp Staff",
    category: "video",
    description: "A video for kiddie camp teachers & assistants — the kiddie schedule, your building, and working with our youngest campers (ages 3–5).",
    type: "video",
    duration: "Coming soon",
    provider: "Camp",
    appliesIf: { division: "kiddie" },
    videoUrl: "",
    comingSoon: true,
    completionMethod: "watch-ack",
    resources: []
  },

  // ─── Rabbi Kudan trainings (chinuchtools.com) ─────────────────────────────
  "kudan-child-safety": {
    id: "kudan-child-safety",
    title: "Making Camp Safe — Child Abuse Prevention",
    category: "safety",
    description: "Rabbi Zalmy Kudan's essential training on keeping children safe and protected. Required for ALL staff, every role.",
    type: "external-course",
    duration: "~60 min",
    provider: "ChinuchTools.com (Rabbi Zalmy Kudan)",
    action: "Log in at chinuchtools.com → enter your access code → complete the course → forward your certificate to office@ganisrael.org.",
    externalUrl: "https://www.chinuchtools.com",
    accessCodes: CHINUCH_CODES,
    instructions: CHINUCH_STEPS,
    completionMethod: "certificate-upload",
    allowUpload: true,
    uploadLabel: "Upload your completion certificate",
    resources: []
  },

  "kudan-pickle": {
    id: "kudan-pickle",
    title: "Counselor Basics: Pickle & Behavioral Management",
    category: "counselor-training",
    description: 'Practical tools for handling bunk challenges and engaging campers, using the "CPR" framework (Consistent, Prompt, Reasonable). For counselor staff.',
    type: "external-course",
    duration: "~60 min",
    provider: "ChinuchTools.com (Rabbi Zalmy Kudan)",
    action: "Log in at chinuchtools.com → enter your access code → complete the course → forward your certificate.",
    externalUrl: "https://www.chinuchtools.com",
    accessCodes: CHINUCH_CODES,
    instructions: CHINUCH_STEPS,
    completionMethod: "certificate-upload",
    allowUpload: true,
    uploadLabel: "Upload your completion certificate",
    resources: []
  },

  "kudan-difficult-camper": {
    id: "kudan-difficult-camper",
    title: "Dealing with Difficult Campers",
    category: "optional",
    description: "Optional but recommended for everyone — useful strategies for handling challenging behavior, de-escalation, and supporting campers who need extra patience.",
    type: "external-course",
    duration: "~60 min",
    provider: "ChinuchTools.com (Rabbi Zalmy Kudan)",
    action: "Log in at chinuchtools.com → enter your access code → complete the course → forward your certificate.",
    externalUrl: "https://www.chinuchtools.com",
    accessCodes: CHINUCH_CODES,
    instructions: CHINUCH_STEPS,
    optional: true,
    recommended: true,
    optionalRoles: "all",
    completionMethod: "certificate-upload",
    allowUpload: true,
    uploadLabel: "Upload your completion certificate",
    resources: []
  },

  "kudan-head-counselor": {
    id: "kudan-head-counselor",
    title: "Head Staff Training",
    category: "counselor-training",
    description: "Required for head counselors — Rabbi Kudan's leadership training on running a division, supporting staff, and managing the camp day.",
    type: "external-course",
    duration: "~60 min",
    provider: "ChinuchTools.com (Rabbi Zalmy Kudan)",
    action: "Log in at chinuchtools.com → enter your access code → complete the course → forward your certificate.",
    externalUrl: "https://www.chinuchtools.com",
    accessCodes: CHINUCH_CODES,
    instructions: CHINUCH_STEPS,
    completionMethod: "certificate-upload",
    allowUpload: true,
    uploadLabel: "Upload your completion certificate",
    resources: []
  },

  "kudan-gifting": {
    id: "kudan-gifting",
    title: "Gifting your Campers with Character",
    category: "optional",
    description: "Optional but recommended — Rabbi Kudan's training on turning challenges into teachable moments, building character (chinuch), recognizing the good, and helping campers reset and grow.",
    type: "external-course",
    duration: "~60 min",
    provider: "ChinuchTools.com (Rabbi Zalmy Kudan)",
    action: "Log in at chinuchtools.com → enter your access code → complete the course → forward your certificate.",
    externalUrl: "https://www.chinuchtools.com",
    accessCodes: CHINUCH_CODES,
    instructions: CHINUCH_STEPS,
    optional: true,
    recommended: true,
    optionalRoles: "all",
    completionMethod: "certificate-upload",
    allowUpload: true,
    uploadLabel: "Upload your completion certificate",
    resources: []
  },

  "kudan-bullyproof": {
    id: "kudan-bullyproof",
    title: "Bullyproof Your Camp",
    category: "optional",
    description: "Optional but recommended — Rabbi Kudan's training on preventing and handling bullying, building a kind bunk culture, and protecting every camper.",
    type: "external-course",
    duration: "~60 min",
    provider: "ChinuchTools.com (Rabbi Zalmy Kudan)",
    action: "Log in at chinuchtools.com → enter your access code → complete the course → forward your certificate.",
    externalUrl: "https://www.chinuchtools.com",
    accessCodes: CHINUCH_CODES,
    instructions: CHINUCH_STEPS,
    optional: true,
    recommended: true,
    optionalRoles: "all",
    completionMethod: "certificate-upload",
    allowUpload: true,
    uploadLabel: "Upload your completion certificate",
    resources: []
  },

  "head-counselor-expectations": {
    id: "head-counselor-expectations",
    title: "Head Counselor Expectations",
    category: "on-site",
    description: "Review and sign the head counselor expectations: morning readiness, phone use, active engagement, lunch leadership, transitions, swim, end-of-day, camp spirit.",
    type: "doc-sign",
    duration: "15 min",
    provider: "Camp",
    completionMethod: "signature",
    resources: [{ label: "Head Counselor Expectations Agreement (PDF)", url: "#hc-expectations-pdf" }]
  },

  // ─── Optional / encouraged (NEVER counts toward required progress) ─────────
  "first-aid-mandated-reporter": {
    id: "first-aid-mandated-reporter",
    title: "First Aid / CPR (Free)",
    category: "optional",
    description: "Optional but highly encouraged! We offer a free First Aid/CPR Zoom course, and the camp covers the cost for anyone 16+. Tap below and the office will reach out to schedule you.",
    type: "optional-request",
    duration: "Optional",
    provider: "Camp (free Zoom course)",
    optional: true,
    recommended: true,
    optionalRoles: "all",
    requestEmail: CHANA_EMAIL,
    requestSubject: "First Aid/CPR — sign me up",
    completionMethod: "request",
    resources: []
  }
};

// =============================================================================
// BASELINE — every staff member, every role, every age, every origin
// (1099 self-filters by compensation; legal items self-filter by age/origin)
// =============================================================================
const BASELINE_REQUIRED = [
  "employment-history",
  "kudan-child-safety",
  "staff-handbook",
  "in-person-training",
  "1099-form",                 // appliesIf compensation > 1500
  // Pre-camp Video pool — appliesIf picks the ONE for this staffer's segment:
  "video-boys-local",
  "video-boys-oot",
  "video-girls-local",
  "video-girls-oot",
  "video-kiddie",
  // Legal/background pool — appliesIf picks the right items per staff:
  "working-papers-nj",         // under-18 US
  "fingerprints-identogo",     // US 18+ new
  "bg-check-invite",           // US 18+ new
  "bg-renewal-letter",         // US 18+ returning
  "home-country-bg-check",     // international 18+
  "watchdog-clearance"         // admin-only (filtered out of staff view)
];

// =============================================================================
// ROLE TEMPLATES — additional required items layered on baseline
// =============================================================================
const ROLE_TEMPLATES = {
  "junior-counselor": {
    label: "Junior Counselor",
    description: "Supports counselors with bunks",
    additionalRequired: ["kudan-pickle"]
  },
  "counselor": {
    label: "Counselor",
    description: "Leads a bunk (usually out of 10th grade, 16+)",
    additionalRequired: ["kudan-pickle"]
  },
  "head-counselor": {
    label: "Head Counselor",
    description: "Oversees counselors and daily operations for a division",
    additionalRequired: [
      "kudan-pickle",
      "kudan-head-counselor",
      "head-counselor-expectations"
    ]
  },
  "kiddie-lead-teacher": {
    label: "Kiddie Lead Teacher",
    description: "Leads a Kiddie Camp group (ages 3–5)",
    additionalRequired: []   // baseline only — no Pickle/Difficult Camper
  },
  "kiddie-assistant": {
    label: "Kiddie Assistant",
    description: "Supports lead teachers in Kiddie Camp",
    additionalRequired: []   // baseline only
  }
};

// Optional items (shown separately, never counted). Each item's optionalRoles
// controls who's offered it ("all" or an array of role keys).
const OPTIONAL_OFFERED = [
  "kudan-difficult-camper",      // recommended for everyone
  "kudan-gifting",               // recommended for everyone
  "kudan-bullyproof",            // recommended for everyone
  "first-aid-mandated-reporter"  // recommended for everyone (free, emails Chana)
];

// =============================================================================
// REQUIREMENT RESOLUTION
// =============================================================================
function passesAppliesIf(t, staff) {
  if (!t.appliesIf) return true;
  const c = t.appliesIf;
  if (c.is18Plus !== undefined && c.is18Plus !== !!staff.is18Plus) return false;
  if (c.isFromUS !== undefined && c.isFromUS !== !!staff.isFromUS) return false;
  if (c.isReturning !== undefined && c.isReturning !== !!staff.isReturning) return false;
  if (c.minCompensation !== undefined && !((staff.compensation || 0) > c.minCompensation)) return false;
  if (c.division !== undefined && c.division !== staff.division) return false;
  if (c.outOfTown !== undefined && c.outOfTown !== !!staff.outOfTown) return false;
  return true;
}

// Required items a STAFF member sees (admin-only + optional excluded)
function resolveRequired(staff) {
  const role = ROLE_TEMPLATES[staff.role];
  if (!role) return [];
  const candidateIds = [...BASELINE_REQUIRED, ...role.additionalRequired];
  const seen = new Set();
  const final = [];
  for (const id of candidateIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    const t = TRAININGS[id];
    if (!t) continue;
    if (t.staffVisible === false) continue;   // admin-only (Watchdog)
    if (t.optional) continue;                 // optional never required
    if (!passesAppliesIf(t, staff)) continue;
    final.push(id);
  }
  return final;
}

// Optional items a staff member is offered (shown separately). Gated by
// optionalRoles ("all" or an array of role keys) and any appliesIf criteria.
function resolveOptional(staff) {
  return OPTIONAL_OFFERED.filter(id => {
    const t = TRAININGS[id];
    if (!t) return false;
    if (!passesAppliesIf(t, staff)) return false;
    const roles = t.optionalRoles;
    if (!roles || roles === "all") return true;
    return Array.isArray(roles) && roles.includes(staff.role);
  });
}

// Admin-only items tracked per staff (for inspection records)
function resolveAdminItems(staff) {
  return Object.values(TRAININGS)
    .filter(t => t.staffVisible === false && passesAppliesIf(t, staff))
    .map(t => t.id);
}

// =============================================================================
// SAMPLE STAFF — fictional, covering every branch of the model
// Real staff come from CGI_Morristown_Staff_Hiring_2026_MASTER_v1 (v2).
// =============================================================================
const STAFF = [
  {
    // US, under 18, junior counselor → Watchdog only (no fingerprints), no 1099
    id: "staff-001",
    name: "Aaron Stein",
    email: "aaron.stein@example.com",
    loginCode: "aaron-2026",
    role: "junior-counselor",
    division: "boys",
    gradeEntering: "9th",
    is18Plus: false,
    isFromUS: true,
    isReturning: false,
    outOfTown: false,
    compensation: 700,
    status: "in-progress",
    invitedDate: "2026-04-15",
    completed: ["employment-history"]
  },
  {
    // US, under 18, counselor (16-17), comp $1,100 → no 1099, Watchdog only
    id: "staff-002",
    name: "Rachel Morgan",
    email: "rachel.m@example.com",
    loginCode: "rachel-2026",
    role: "counselor",
    division: "girls",
    gradeEntering: "11th",
    is18Plus: false,
    isFromUS: true,
    isReturning: false,
    outOfTown: false,
    compensation: 1100,
    status: "in-progress",
    invitedDate: "2026-04-10",
    completed: ["employment-history", "staff-handbook"]
  },
  {
    // US, 18+, head counselor, NEW, comp $2,500 → fingerprints + bg invite + 1099
    id: "staff-003",
    name: "Yaakov Klein",
    email: "yaakov.k@example.com",
    loginCode: "yaakov-2026",
    role: "head-counselor",
    division: "boys",
    gradeEntering: "N/A",
    is18Plus: true,
    isFromUS: true,
    isReturning: false,
    outOfTown: true,
    compensation: 2500,
    status: "invited",
    invitedDate: "2026-04-18",
    completed: []
  },
  {
    // US, 18+, kiddie lead teacher, RETURNING, comp $16,000 → renewal letter + 1099
    id: "staff-004",
    name: "Sarah Weiss",
    email: "sarah.w@example.com",
    loginCode: "sarah-2026",
    role: "kiddie-lead-teacher",
    division: "kiddie",
    gradeEntering: "N/A",
    is18Plus: true,
    isFromUS: true,
    isReturning: true,
    outOfTown: false,
    compensation: 16000,
    status: "in-progress",
    invitedDate: "2026-03-20",
    completed: ["employment-history", "staff-handbook", "kudan-child-safety"]
  },
  {
    // INTERNATIONAL, 18+, counselor → home-country bg check (no fingerprints), comp $1,200 no 1099
    id: "staff-005",
    name: "Dovi Friedman",
    email: "dovi.f@example.com",
    loginCode: "dovi-2026",
    role: "counselor",
    division: "boys",
    gradeEntering: "N/A",
    is18Plus: true,
    isFromUS: false,
    isReturning: false,
    outOfTown: true,
    compensation: 1200,
    status: "in-progress",
    invitedDate: "2026-04-22",
    completed: ["employment-history"]
  },
  {
    // INTERNATIONAL, under 18, kiddie assistant → Watchdog only, no 1099
    id: "staff-006",
    name: "Leah Cohen",
    email: "leah.c@example.com",
    loginCode: "leah-2026",
    role: "kiddie-assistant",
    division: "kiddie",
    gradeEntering: "11th",
    is18Plus: false,
    isFromUS: false,
    isReturning: false,
    outOfTown: true,
    compensation: 900,
    status: "invited",
    invitedDate: "2026-04-25",
    completed: []
  }
];

// =============================================================================
// CAMP INFO & RESOURCES — reference pages (NOT action items, never counted).
// Shown in their own section below the checklist so the checklist stays simple.
// Content is rendered in app.js (renderInfo) and adapts to the staff member's
// division where relevant. Per Mendel's rule: no personal names on the portal —
// use "the camp office" / "Camp Directors".
// =============================================================================
const INFO_PAGES = [
  { id: "job-description", title: "Your Job Description", icon: "🧑‍🏫", blurb: "Exactly what your role does, day to day" },
  { id: "first-day",      title: "Your First Day",         icon: "📍", blurb: "Where to go, when to arrive, what to do first" },
  { id: "daily-schedule", title: "The Camp Day",           icon: "🕘", blurb: "How a typical day flows, start to finish" },
  { id: "camp-calendar",  title: "Calendar & Themes",      icon: "📅", blurb: "Season dates, days off, and this summer's themes" },
  { id: "key-policies",   title: "Key Policies",           icon: "📋", blurb: "Phone, dress, boundaries, reporting, food" },
  { id: "out-of-town",    title: "Out-of-Town Staff",      icon: "✈️", blurb: "Housing, food, arrival, Shabbos — all handled", ootOnly: true },
  { id: "contacts",       title: "Who to Contact",         icon: "📞", blurb: "Chain of command and the camp office" }
];

// =============================================================================
// STAFF HANDBOOK — topic-based, easy to read (modeled on the by-topic approach
// Mendel liked from the other director). Content condensed from the CGI
// Morristown Staff Handbook 2025; Mendel will refine the wording later.
// Rendered as browsable sections inside the "Staff Handbook" item, ending in a
// read-&-acknowledge. No personal names per the portal rule.
// =============================================================================
const HANDBOOK_TOPICS = [
  { id: "welcome-mission", title: "Welcome & Our Mission", html:
    `<p>Welcome to Camp Gan Israel, and <strong>thank you for giving your time, energy, and talent to our campers this summer.</strong> You are joining a team that takes one idea seriously: <em>to awaken the spark, fan the flame, and create an inferno of Judaism in every Jewish child.</em></p>
<p>Our mission is simple to say and big to live: <strong>provide a safe, fun, and uplifting summer where a love for Yiddishkeit is taught through joy, warmth, and genuine care</strong> for every camper, every family, and every staff member. Camp is the most natural place in the world to be a positive influence on a child, because it is fun. The "down times" — sitting next to a camper at lunch, on the bus, between activities — are often where the real connection happens. Take advantage of them.</p>
<p>This is not just an hourly summer job. You have a real chance to change a child's life. A camper who does one more mitzvah, who feels seen and valued for one summer, carries that with them long after camp ends. When you show up rested, on time, prepared, and in a good mood, you give yourself the foundation to make that happen.</p>
<p><strong>If you ever have a question, or something doesn't feel right, reach out.</strong> Contact the camp office at <strong>office@ganisrael.org</strong> or <strong>(862) 244-3420</strong>. The only bad question is the one you didn't ask — please ask us before a small thing becomes a big one.</p>` },

  { id: "our-campers", title: "Our Campers", html:
    `<p>Our campers are <strong>ages 3 to 11</strong>, grouped by age. The youngest, ages 3–5, are in <strong>Kiddie Camp</strong>. Ages 6–11 are in our <strong>older divisions</strong>. Each group does activities that fit where the children are developmentally, always wrapped in the love and care that is the heart of what we do.</p>
<p>Our campers come from a <strong>wide range of Jewish backgrounds</strong> — Chabad families, other observant families, and families not affiliated with any particular community. Some campers have one Jewish parent. Some attend Jewish schools, others public school. That mix is one of the best things about our camp: it creates a warm, welcoming place where every child can learn, grow, and make new Jewish friends that last well beyond the summer.</p>
<p><strong>Every camper is treated fairly and with respect.</strong> In this camp, we only speak nicely about others. Each child has the right to experience and grow in a safe, friendly place, free of any teasing about appearance, interests, or behavior, with caring adults helping make the summer meaningful and memorable. That is the standard, and you are one of those caring adults.</p>` },

  { id: "supervision-ratios", title: "Supervision & Ratios", html:
    `<p>This is the most important rule at camp, so we put it first: <strong>campers must be supervised at all times.</strong> A camper may never wander away from the group without a staff member, under any circumstance. You are responsible for knowing <strong>where every one of your campers is, all day long</strong> — and that means taking attendance and doing head counts at every transition, not just in the morning.</p>
<p>New Jersey sets minimum staff-to-camper ratios, and we always meet or exceed them:</p>
<ul>
  <li><strong>Older divisions (ages 6+):</strong> at least <strong>1 staff member for every 8 campers</strong>.</li>
  <li><strong>Kiddie Camp (ages 5 and under):</strong> at least <strong>1 staff member for every 7 campers</strong>.</li>
  <li><strong>On trips:</strong> extra coverage — at least 2 staff for every 16 campers in the older divisions, and 2 staff for every 10 campers in the younger division.</li>
</ul>
<p>There are specific times and places where <strong>at least two staff members must always be present</strong>. Never run these alone:</p>
<ul>
  <li>Swim and any water activities</li>
  <li>Field trips</li>
  <li>Sports fields</li>
  <li>Elective and Olympic-style activities</li>
  <li>Baking when electric appliances are used</li>
  <li>Specialty activities such as archery, bubble soccer, and the foam machine</li>
  <li><strong>Any time campers are changing</strong> (e.g., before or after swim), there must be two staff in the room</li>
</ul>
<p>If staffing ever gets thin and you cannot keep proper coverage, <strong>tell leadership immediately.</strong> Safety always comes before anything else.</p>` },

  { id: "talking-to-campers", title: "How We Talk to Campers", html:
    `<p>The heart of working with children is simple: <strong>let every camper know that he or she is important in your eyes.</strong> A child who feels heard and cared about will give you their best. Here is how we do that, every day:</p>
<ul>
  <li><strong>Listen, and show that you're listening.</strong> When a camper tells you something, reflect it back: "So you didn't like being left out of that game." Often a child just needs to feel heard, and the issue resolves on its own.</li>
  <li><strong>Use first names.</strong> A person's favorite word is their own name. First names show connection; last names sound like authority.</li>
  <li><strong>Be polite.</strong> Use "please" and "thank you" with campers, every time. It teaches by example and shows respect.</li>
  <li><strong>Praise constantly.</strong> Catch campers doing things right and say so. Praise <strong>younger campers publicly</strong>; take <strong>older campers aside and compliment them privately.</strong> When kids get attention for the good, they stop seeking it through misbehavior.</li>
  <li><strong>Avoid labels.</strong> Never call a child "my terror" or "always late." Kids live up (or down) to the labels we give them. If a camper labels himself ("I'm a troublemaker"), counter it with the good you see in him.</li>
  <li><strong>Give choices about <em>how</em>, not <em>whether</em>.</strong> "Do you want to clean up the Legos with your hands or the scoop?" gives a child ownership without a power struggle.</li>
  <li><strong>Lead by example, not by command.</strong> Instead of "Everyone bentch now," start bentching yourself and let them follow. Instead of telling kids to be quiet, put a finger to your lips and wait.</li>
</ul>
<p><strong>And the golden rule for hard moments: never scream.</strong> Yelling shows a loss of control, and campers often hear only the yelling, not the message. A calm, low voice shows you are completely in control. <strong>If you feel like you're about to blow up, walk away.</strong> Get a drink of water, take a breath, ask a head staff member to step in, and come back when you're calm. Nothing a camper does is worth damaging your relationship with them.</p>` },

  { id: "discipline", title: "Discipline", html:
    `<p>Our approach to discipline is <strong>positive guidance</strong> — we emphasize encouragement, redirection, prevention, and helping campers build self-control. We are not in the business of punishment. The most important mindset: <strong>the behavior is the problem, not the camper.</strong></p>
<p>Remember the <strong>CPR of Discipline — Consistent, Prompt, and Reasonable.</strong></p>
<ul>
  <li><strong>Consistent:</strong> Decide your expectations and consequences up front and stick to them, fairly, for every camper. No favorites. Kids deeply respect fairness.</li>
  <li><strong>Prompt:</strong> Address behavior in the moment, calmly — but never out of rage. If you're too angry, separate the campers, let everyone cool off, and handle the consequence a bit later.</li>
  <li><strong>Reasonable:</strong> Match the consequence to the behavior, and only promise what you can actually follow through on. Empty threats make a joke of all your rules.</li>
</ul>
<p>Some practical tools that work: give one clear warning, let the camper explain (they may have a real reason), discipline privately rather than embarrassing a child, and when you can, let the camper help choose a fair consequence. Often the best move is simply to <strong>keep campers busy</strong> — most behavior problems disappear when kids are engaged.</p>
<p><strong>One firm rule: always inform the Directors of any disciplinary measure you take.</strong> We need to know what's happening with our campers so we can support you and keep families informed appropriately.</p>
<p>The following are <strong>never</strong> acceptable, under any circumstances:</p>
<ul>
  <li>Depriving a camper of <strong>sleep, food, or bathroom</strong> access</li>
  <li>Leaving a camper <strong>alone and unsupervised</strong> as a consequence</li>
  <li><strong>Ridicule, shaming, threats, or name-calling</strong></li>
  <li><strong>Any physical contact</strong> as punishment — striking, grabbing, squeezing, etc. (this is grounds for immediate dismissal)</li>
  <li>Using <strong>physical exercise or restraint</strong> as a punishment</li>
</ul>` },

  { id: "bullying-sensitive-issues", title: "Bullying & Sensitive Issues", html:
    `<p><strong>Bullying is any intentional hurtful act</strong> — by one or more campers against another — where there's an imbalance of power. It shows up in three main forms: <strong>physical</strong> (hitting, shoving, taking things), <strong>verbal</strong> (name-calling, taunting, hurtful teasing), and <strong>relational</strong> (excluding, humiliating, manipulating friendships). Bullies often look like confident, well-liked leaders, so stay alert — especially for the camper who is quietly being left out.</p>
<p>Your role here is to be a <strong>hero</strong>. When you see bullying of any kind:</p>
<ul>
  <li><strong>Step in and separate</strong> the children involved.</li>
  <li><strong>Support the camper who was hurt</strong> and keep an eye on the situation.</li>
  <li><strong>Report it up the chain</strong> to your leadership right away.</li>
</ul>
<p>Because bullying usually happens when staff aren't looking, <strong>make it a regular topic with your campers</strong> so they know you take it seriously. Teach them the difference between <strong>reporting</strong> (getting someone out of danger and into safety) and tattling (trying to get someone in trouble) — and praise campers who speak up to protect a friend. Campers follow what you <em>do</em> far more than what you say, so never play favorites.</p>
<p><strong>Sensitive topics</strong> need extra care. Our campers come from every kind of family and level of observance. If a camper brings up something socially sensitive or inappropriate — or speaks badly about another person or group — gently but immediately redirect: <strong>"We only speak nicely about others in this camp. At Gan Israel everyone is treated fairly and with respect."</strong> Do it without drawing extra attention to the child.</p>
<p>Be especially thoughtful around topics known to be sensitive in our community — <strong>divorce, intermarriage, sexuality, and level of religious observance.</strong> If you're ever unsure how to handle one of these, <strong>consult the Directors.</strong> And as a rule, <strong>never discuss your own personal life with campers.</strong></p>` },

  { id: "boundaries-safety", title: "Boundaries, Safety & Harassment Prevention", html:
    `<p>The physical, emotional, and spiritual safety of every camper is our highest priority. That starts with <strong>clear personal boundaries from every staff member.</strong></p>
<p>The single most important boundary is the <strong>Rule of Three: never be alone, one-on-one, with a camper in a private or closed space.</strong> Always keep a second staff member, or the group, present. The only appropriate physical contact is a <strong>high-five or a brief side-hug</strong> when needed — nothing more.</p>
<p><strong>These behaviors are strictly prohibited:</strong></p>
<ul>
  <li>Being alone one-on-one with a camper in a private space</li>
  <li>Sharing a bed, sleeping area, or tent with a camper</li>
  <li>Any inappropriate physical contact</li>
  <li>Sexual, suggestive, or adult language around campers</li>
  <li>Sharing your personal contact info with a camper</li>
  <li>Showing favoritism, gift-giving, or forming an exclusive relationship with an individual camper</li>
</ul>
<p><strong>Never private-message a camper</strong> — no Instagram, WhatsApp, Snapchat, texting, or any direct messaging, during or after the summer. The only exceptions are when a <strong>parent is present or copied</strong>, or it's part of an organized, camp-sanctioned program. If you're not sure whether a form of contact is okay, <strong>ask the Directors first.</strong></p>
<p><strong>Every staff member is a mandatory reporter under New Jersey law.</strong> If you ever observe, suspect, or hear about abuse (physical, emotional, or sexual), inappropriate staff behavior toward a camper, or a serious boundary violation, <strong>you are legally required to report it.</strong> (This is covered in depth at in-person training.)</p>
<ul>
  <li><strong>Reporting chain:</strong> first notify your direct supervisor (Head Counselor / division head); if it's unresolved or you're uncomfortable, go straight to the Directors via <strong>office@ganisrael.org</strong> or <strong>(862) 244-3420</strong>.</li>
  <li><strong>If you suspect a child is being harmed, New Jersey law requires an immediate report to the State Central Registry child-abuse hotline: <em>1-877-NJ-ABUSE (1-877-652-2873)</em>.</strong> Then notify the Directors.</li>
</ul>
<p>We hold a <strong>zero-tolerance policy</strong> for any harassment, abuse, or misconduct toward campers or fellow staff. When in doubt, ask yourself one question: <strong>"Would I be comfortable if a parent or director saw this interaction?"</strong> If the answer is no — pause, adjust, or ask for help.</p>` },

  { id: "daily-conduct", title: "Daily Conduct & Work Rules", html:
    `<p>You are a role model from the moment you arrive until the last camper leaves. Campers notice what you <em>do</em> far more than what you say, so <strong>everything you do is a Kiddush Hashem.</strong> Here are the work rules that keep camp running and keep you at your best:</p>
<ul>
  <li><strong>Be there, on time, every day.</strong> When you agreed to your position, you agreed to be present for the whole season. If you're sick or unavoidably delayed, <strong>notify the camp office as early as possible</strong> so coverage can be arranged.</li>
  <li><strong>Be fully engaged.</strong> Stay with your group, be attentive, and jump into activities, songs, bus games, and dress-up days with real energy. Your enthusiasm sets the tone for your campers.</li>
  <li><strong>Dress neatly and according to camp standards.</strong> Clean, modest, camp-appropriate clothing, and your division's dress code (see your role and contract). Wear your camp shirt on trip days.</li>
  <li><strong>Use the chain of command.</strong> Bring any camper or staff issue to your direct supervisor promptly. <strong>Do not take issues directly to parents</strong>; route them through leadership.</li>
  <li><strong>Keep your spaces clean</strong> and return all supplies and equipment to their proper place, treating camp property with care.</li>
  <li><strong>Our campus is smoke-free, alcohol-free, drug-free, and weapon-free</strong> at all times. Bringing alcohol, drugs, or weapons onto camp property is grounds for immediate dismissal.</li>
</ul>
<p><strong>Phone policy — this depends on your role, so please read carefully:</strong></p>
<ul>
  <li><strong>Counselors and Junior Counselors may not have a phone on them at all during camp.</strong> All communication happens by walkie-talkie. If an emergency comes up, ask your supervisor to cover your group while you step away to handle it.</li>
  <li><strong>Head Counselors, Kiddie Lead Teachers, and Kiddie Assistant Teachers may keep a phone, but use it only for emergencies</strong> — not for personal calls, texting, or scrolling during the camp day, and never during swim or water activities.</li>
</ul>` },

  { id: "health-emergencies", title: "Health & Emergencies", html:
    `<p>Keeping campers healthy and safe is part of your job every single day. The basics go a long way:</p>
<ul>
  <li><strong>Do a quick daily health check.</strong> Each morning, keep an eye on your campers for any sign of illness, injury, or something that seems off, and report anything concerning.</li>
  <li><strong>Know your bunk's allergies and medical needs on Day 1.</strong> All medication is kept and administered through the <strong>nurse's office</strong> — never hold or give out medication yourself.</li>
  <li><strong>Encourage frequent handwashing</strong> — before eating and after the bathroom.</li>
  <li><strong>Never lose track of a camper.</strong> Do regular head counts, especially at every transition and around swim. Learn the <strong>lost-camper and lost-swimmer procedures</strong>, and if a camper is ever missing, <strong>raise the alarm immediately</strong> — do not wait.</li>
  <li><strong>On trips,</strong> every group carries a radio, and any epi-pens or inhalers travel with the group.</li>
</ul>
<p><strong>If a camper is injured or there's a serious incident, complete an incident report.</strong> For any fight involving real contact (hitting, kicking, biting), both campers visit the nurse to be checked, and an incident report is filed.</p>
<p><strong>In a true emergency, get help first.</strong> Call <strong>Hatzoloh / 911 immediately</strong>, then notify camp leadership. Stay calm, take command of your group, and give clear instructions.</p>
<p>You'll learn the camp's <strong>emergency procedures — fire, evacuation, and lockdown — at in-person training.</strong> Know your nearest exits and the plan before camp begins so that if anything ever happens, you can act without hesitation.</p>` },

  { id: "food-policy", title: "Food Policy", html:
    `<p>We are a <strong>nut-free camp</strong> — this is a serious safety matter, because some campers have severe allergies. Please help enforce it carefully at lunch and snack time.</p>
<p>A quick word on meat, since it sometimes causes confusion: <strong>we ask that the food campers bring from home be meat-free</strong> — dairy or parve only. This keeps lunchtime simple and avoids any kashrus mix-ups with the food kids bring in. <strong>Camp itself does serve meat at our own meals and events</strong> — so the meat-free rule is just about what comes from home, not about the food we provide.</p>
<p>To sum up the rules for food brought from home:</p>
<ul>
  <li><strong>No nuts</strong> (we are a nut-free camp)</li>
  <li><strong>No meat</strong> — dairy or parve only</li>
  <li><strong>No glass containers</strong></li>
</ul>
<p>Please help your campers at lunch, keep an eye out for anything that doesn't fit these rules, and make mealtime a warm, pleasant part of the day.</p>` },

  { id: "pickup-dismissal", title: "Pickup & Dismissal", html:
    `<p>Dismissal is one of the most safety-sensitive parts of the day, and parents judge how well-run camp is by how it feels. <strong>Supervise your campers until they are physically picked up</strong> — never let a child drift off on their own at the end of the day.</p>
<p><strong>Children are released only to authorized pickup people.</strong> If someone you don't recognize comes to pick up a camper, or a child is supposed to leave with someone not on the authorized list, <strong>do not release the camper</strong> — get a director's confirmation first.</p>
<p>At drop-off and pickup, <strong>greet campers, parents, and fellow staff with a smile.</strong> Keep these touchpoints warm and friendly. <strong>Save any serious conversation about a camper for during the day, through leadership</strong> — not at the curb at pickup.</p>
<p><em>(Bus-specific procedures are covered in the "Bus Counselors" section.)</em></p>` },


  { id: "dates-hours", title: "Camp Dates, Hours & Training", html:
    `<p>Here are the dates and times to lock in now. <strong>Camp runs Monday, June 29 through Friday, August 14, 2026, and camp is closed on Friday, July 3.</strong></p>
<p><strong>Daily hours depend on your division:</strong></p>
<ul>
  <li><strong>Boys division:</strong> Monday–Thursday <strong>8:30 AM – 4:00 PM</strong>; Friday <strong>8:30 AM – 2:30 PM</strong>.</li>
  <li><strong>Girls division & Kiddie Camp:</strong> Monday–Thursday <strong>9:00 AM – 3:30 PM</strong> (arrive by <strong>8:45 AM</strong>, leave by <strong>3:45 PM</strong>); Friday <strong>9:00 AM – 2:00 PM</strong> (leave by <strong>2:15 PM</strong>).</li>
</ul>
<p>On top of the posted hours, plan to <strong>arrive early to set up and greet campers</strong>, and <strong>stay until every camper is picked up.</strong></p>
<p><strong>In-person staff training is mandatory.</strong> This is where we walk through day-to-day operations, your role, the daily flow, emergency procedures, and mandated reporting. Training times depend on your division:</p>
<ul>
  <li><strong>Boys division:</strong> Sunday, <strong>12:00 PM – 6:00 PM</strong>. (<strong>Junior Counselors attend 12:00 PM – 3:00 PM only.</strong>)</li>
  <li><strong>Girls division:</strong> two sessions — <strong>Friday, June 26 and Sunday, June 28.</strong></li>
  <li><strong>Kiddie Camp:</strong> <strong>Friday, June 26, 9:00 AM – 2:00 PM.</strong></li>
</ul>
<p><strong>Where to go on your first training day — Boys division:</strong> when you arrive at camp, head to the <strong>picnic area</strong>. (Girls and Kiddie staff: report to the location given by the camp office for your session.)</p>
<p>If you are ever sick or running late, <strong>let the camp office know as early as possible</strong> at office@ganisrael.org or (862) 244-3420.</p>` },

  { id: "before-camp-starts", title: "Before Camp Starts", html:
    `<p>A great summer starts with good preparation. <strong>Your onboarding checklist in this portal lists exactly what you need to complete</strong> — work through it, and aim to finish your online items <strong>at least two weeks before camp begins.</strong> Here's the big picture of what's expected before Day 1:</p>
<ul>
  <li><strong>Finish your paperwork and background screening.</strong> This includes your employment history, the background-check steps for your situation, and (for certain staff we'll let you know) a W-9. The portal walks you through each item that applies to you.</li>
  <li><strong>Complete your required online training.</strong> Every staff member takes Rabbi Zalmy Kudan's <strong>"Making Camp Safe – Child Abuse Prevention"</strong> course on ChinuchTools, and counselor staff also complete the Pickle / behavioral-management course. <strong>Forward your completion certificate to the camp office (office@ganisrael.org).</strong></li>
  <li><strong>Read this handbook</strong> and acknowledge it.</li>
  <li><strong>Attend your division's in-person training</strong> (see the Camp Dates, Hours & Training section for your day and time).</li>
</ul>
<p>A few optional-but-encouraged extras are available too, including additional Rabbi Kudan courses and a <strong>free First Aid/CPR Zoom course</strong> that camp covers for staff 16 and up. You'll find these in the portal — we highly recommend them.</p>
<p>If anything on your checklist is unclear or an email hasn't arrived when you expected it, <strong>reach out to the camp office</strong> — don't let an item sit. We want you walking into camp confident and ready.</p>` }
];

// =============================================================================
// RECENT ACTIVITY FEED — empty until the live backend records real activity.
// (No sample names shown in the portal.)
// =============================================================================
const RECENT_ACTIVITY = [];

// =============================================================================
// EXPORT
// =============================================================================
const JOB_DESCRIPTIONS = {
  "boys-counselor": `<p><strong>Role summary:</strong> As a Boys Division Counselor you are the primary leader of your bunk and the main role model your campers look up to — responsible for their safety, their day-to-day experience, and inspiring a genuine love of Yiddishkeit through fun and energy.</p>
<p><strong>What you do day-to-day:</strong></p>
<ul>
<li>Take attendance first thing every morning and provide proper supervision of every camper at all times — campers are never left alone.</li>
<li>Run an engaging, age-appropriate davening with songs, energy, and incentives, and lead the daily learning class (15-30 min) from the curriculum provided; keep it fun and interactive with stories, props, and small activities.</li>
<li>Lead and run your bunk through lineup, activities, lunch, transitions, swim, and trips; bring energy, join in, and be ready to improvise if an activity falls through.</li>
<li>Be present and vigilant during swim times, overseeing campers in the pool and water-play area.</li>
<li>Apply basic, appropriate discipline when needed, and recognize and reward campers for individual and team achievements.</li>
<li>Guide and respect your Junior Counselor as a fellow staff member while supervising them.</li>
<li>Keep your bunk room and areas clean, return all supplies and equipment, and clean up after every activity.</li>
<li>Report mishaps and incidents; document disciplinary issues in incident reports and submit them to your Head Counselor.</li>
<li>Greet campers, parents, and staff with a smile at drop-off and pick-up, and model mentchlichkeit and a kiddush Hashem at all times.</li>
</ul>
<p><strong>Chain of command:</strong> You report to your Head Counselor. Bring camper or staff issues to your Head Counselor, and serious issues up to the Directors.</p>
<p><strong>Phone policy:</strong> Counselors do not carry or use a personal phone during camp. Radios are provided for communication; speak to your Head Counselor for anything you need.</p>
<p><strong>Dress code:</strong> Button-down shirts for davening and the learning class. T-shirts or other shirts are fine for other activities, but nothing tight-fitting and no inappropriate images or writing. No jeans and no shorts. Haircuts in line with standard yeshiva guidelines — if you are unsure about anything, just ask. This is important to us and is not negotiable.</p>`,

  "girls-counselor": `<p><strong>Role summary:</strong> As a Girls Division Counselor you are the primary leader of your bunk and the main role model your campers look up to — responsible for their safety, their day-to-day experience, and inspiring a genuine love of Yiddishkeit through fun and energy.</p>
<p><strong>What you do day-to-day:</strong></p>
<ul>
<li>Take attendance first thing every morning and provide proper supervision of every camper at all times — campers are never left alone.</li>
<li>Run an engaging, age-appropriate davening with songs, energy, and incentives, and lead the daily learning class (10-15 min) from the curriculum provided; keep it fun and interactive with stories, props, and small activities.</li>
<li>Lead and run your bunk through lineup, activities, lunch, transitions, swim, and trips; bring energy, join in, and be ready to improvise if an activity falls through.</li>
<li>Be present and vigilant during swim times, overseeing campers in the pool and water-play area.</li>
<li>Apply basic, appropriate discipline when needed, and recognize and reward campers for individual and team achievements.</li>
<li>Guide and respect your Junior Counselor as a fellow staff member while supervising them.</li>
<li>Keep your bunk room and areas clean, return all supplies and equipment, and clean up after every activity.</li>
<li>Report mishaps and incidents; document disciplinary issues in incident reports and submit them to your Head Counselor.</li>
<li>Greet campers, parents, and staff with a smile at drop-off and pick-up, and model mentchlichkeit and a kiddush Hashem at all times.</li>
</ul>
<p><strong>Chain of command:</strong> You report to your Head Counselor. Bring camper or staff issues to your Head Counselor, and serious issues up to the Directors.</p>
<p><strong>Phone policy:</strong> Counselors do not carry or use a personal phone during camp. Radios are provided for communication; speak to your Head Counselor for anything you need.</p>
<p><strong>Dress code:</strong> Our dress code follows the standards of tznius: skirts must cover the knees at all times with no slits, sleeves must cover the elbows at all times, and necklines must be covered at all times. This is very important to us and is not negotiable.</p>`,

  "boys-junior-counselor": `<p><strong>Role summary:</strong> As a Boys Division Junior Counselor you assist your counselor in running the bunk and caring for the campers, giving extra hands-on help and being a source of positive energy throughout the day.</p>
<p><strong>What you do day-to-day:</strong></p>
<ul>
<li>Assist your counselor through every part of the day — lineup, davening and learning class, lunch, transitions, activities, and trips.</li>
<li>Give individual attention to campers who need extra help while the counselor keeps the rest of the bunk moving.</li>
<li>Help campers stay quiet and attentive: when a counselor or Head Counselor asks for quiet, immediately put your finger to your lips and point toward the person speaking so your campers follow.</li>
<li>Stay with your assigned bunk at all times; if you need a break, clear it first with the staff member in charge.</li>
<li>Use a smile, positive words, and encouragement all day — leave disciplinary action to the counselor's discretion.</li>
<li>Always ask for help when you are unsure how to proceed or when a camper's or staff member's health or safety is in question.</li>
<li>Be a role model, follow general camp procedures (sanitation, schedule, sportsmanship), and greet campers, parents, and staff with a smile at drop-off and pick-up.</li>
</ul>
<p><strong>Chain of command:</strong> You report to your Counselor and follow their lead. If you have an issue, speak to a Head Counselor; for anything bigger, speak to the Directors.</p>
<p><strong>Phone policy:</strong> Junior Counselors do not carry or use a personal phone during camp. Radios and your counselor are your communication line — ask for help whenever you need it.</p>
<p><strong>Dress code:</strong> T-shirt or button-down shirt (no tank tops), long pants, and tzitzit and a kippah (a baseball cap also works). Wear your camp shirt on trip days. This is important to us and is not negotiable.</p>`,

  "girls-junior-counselor": `<p><strong>Role summary:</strong> As a Girls Division Junior Counselor you assist your counselor in running the bunk and caring for the campers, giving extra hands-on help and being a source of positive energy throughout the day.</p>
<p><strong>What you do day-to-day:</strong></p>
<ul>
<li>Assist your counselor through every part of the day — lineup, davening and learning class, lunch, transitions, activities, and trips.</li>
<li>Give individual attention to campers who need extra help while the counselor keeps the rest of the bunk moving.</li>
<li>Help campers stay quiet and attentive: when a counselor or Head Counselor asks for quiet, immediately put your finger to your lips and point toward the person speaking so your campers follow.</li>
<li>Stay with your assigned bunk at all times; if you need a break, clear it first with the staff member in charge.</li>
<li>Use a smile, positive words, and encouragement all day — leave disciplinary action to the counselor's discretion.</li>
<li>Always ask for help when you are unsure how to proceed or when a camper's or staff member's health or safety is in question.</li>
<li>Be a role model, follow general camp procedures (sanitation, schedule, sportsmanship), and greet campers, parents, and staff with a smile at drop-off and pick-up.</li>
</ul>
<p><strong>Chain of command:</strong> You report to your Counselor and follow their lead. If you have an issue, speak to a Head Counselor; for anything bigger, speak to the Directors.</p>
<p><strong>Phone policy:</strong> Junior Counselors do not carry or use a personal phone during camp. Radios and your counselor are your communication line — ask for help whenever you need it.</p>
<p><strong>Dress code:</strong> Our dress code follows the standards of tznius: skirts must cover the knees at all times with no slits, leg coverings no shorter than knee socks, sleeves must cover the elbows at all times, and necklines covered at all times. This is very important to us and is not negotiable.</p>`,

  "boys-head-counselor": `<p><strong>Role summary:</strong> The Boys Division Head Counselor is the day-to-day leader of the division — a "mini-director of counselors" responsible for the energy, organization, and daily success of camp. You lead through three pillars: leadership of your counselors, creating the CGI energy, and keeping the day organized and on time.</p>
<p><strong>What you do day-to-day:</strong></p>
<ul>
<li>Supervise and coach your counselors in real time — set expectations, motivate, give quick private corrections, and handle light coaching on energy, timing, and running activities.</li>
<li>Own the energy and tone of lineup, transitions, lunch, trips, sports, and bus games, and empower counselors to bring that energy with you.</li>
<li>Keep the day on time: know the schedule cold, make sure activities are prepared before they start (ideally the day before), and ensure counselors are in the right places — preventing dead time and chaos.</li>
<li>When an activity is failing mid-stream, own the moment — fix it, pivot, and keep camp moving.</li>
<li>Ensure morning bunk attendance is collected, run a calm 3-tier discipline approach (you handle first response; escalate patterns and parent-facing issues to the Assistant Director; major consequences go to the Director).</li>
<li>On trips, own staffing, camper flow and behavior, headcounts, timing, shirts, water, and first aid, and get everyone to the bus on time (the Assistant Director handles waivers, vendors, and payments).</li>
<li>Be visible and warm at drop-off and pick-up; keep serious parent matters for during the day through leadership, not at the gate.</li>
<li>Lead healthy off-hours staff culture and the Torah-learning vibe, and keep campers supervised at all times — notify leadership immediately if staffing gets thin.</li>
</ul>
<p><strong>Pre-season:</strong> Build your summer vision and energy plan, develop an incentive system with leadership, learn the schedule and plan activities, submit a master supply list at least 3 weeks before camp, connect with your counselors before day one, and complete all trainings/webinars at least 2 weeks before camp.</p>
<p><strong>Chain of command:</strong> You report to the Camp Director and work closely with the Assistant Director, who backs you up, handles serious sit-downs and escalations, and supports logistics. Leadership disagreements are never aired in front of staff or campers — bring them to the Director. Safety always overrides hierarchy.</p>
<p><strong>Phone policy:</strong> Carry your phone for emergencies only — no phone use during activities, especially swim. Radios are used for regular camp communication.</p>
<p><strong>Dress code:</strong> You are held to a higher role-model standard. Button-down shirt for davening and learning (tie optional if worn); modest, camp-appropriate clothing for activities; no tight clothing or inappropriate graphics; no jeans or shorts. Haircuts in line with yeshiva standards. If unsure, ask.</p>`,

  "girls-head-counselor": `<p><strong>Role summary:</strong> The Girls Division Head Counselor is the day-to-day leader of the division, responsible for its tone, its staff, and the success of the camp day. You lead through three pillars: running the counselor team, creating the division's upbeat energy, and keeping the day organized and on time.</p>
<p><strong>What you do day-to-day:</strong></p>
<ul>
<li>Supervise and coach your counselors in real time — set clear expectations, motivate, and give respectful feedback that addresses small issues before they grow.</li>
<li>Build and set the energy and tone for lineup, transitions, lunch, trips, and the overall vibe — through your staff, not by doing everything yourself.</li>
<li>Keep the day running on time: know the schedule thoroughly, ensure activities are prepared before they begin, and prevent downtime, confusion, and last-minute scrambling.</li>
<li>Be the first line of response for camper behavior — handle it with calm, consistent leadership and coach counselors to do the same; escalate repeated, sensitive, or parent-heavy issues to leadership.</li>
<li>Stay visibly present throughout the division, especially at lineup, lunch, dismissal, and drop-off/pick-up so families experience strong, engaged leadership.</li>
<li>On trips, own staffing, counselor supervision, camper flow, headcounts, and the overall feel of the day, staying aligned with the Assistant Director on waivers, vendors, and outside logistics.</li>
<li>Hold counselors accountable for setup and cleanup, keep your division's systems and supplies organized, and ensure no camper is ever unsupervised.</li>
<li>Lead healthy after-hours staff culture, keeping the environment positive, inclusive, and ready for the next day.</li>
</ul>
<p><strong>Pre-season:</strong> Build your summer vision; plan energy, lineup structure, routines, and a healthy incentive system; learn the schedule and prepare activity ideas; build a master supply list; begin relationships with your counselors early; attend all trainings and read through Super Staff Supervision before camp.</p>
<p><strong>Chain of command:</strong> You report to the Camp Director and work closely with the Assistant Director, who supports logistics and follow-through and steps in when issues go beyond in-the-moment coaching. The Director is the final authority. In an emergency, call Hatzalah/911 first, then notify leadership.</p>
<p><strong>Phone policy:</strong> Carry your phone for emergencies only — not during activities. Radios are used for regular camp communication.</p>
<p><strong>Dress code:</strong> As a visible leader you model the division's standards clearly and consistently, including tznius: skirts must cover the knees at all times with no slits, leg coverings no shorter than knee socks, sleeves must cover the elbows at all times, and necklines covered at all times. These standards are important to us and are not negotiable.</p>`,

  "kiddie-lead-teacher": `<p><strong>Role summary:</strong> As a Kiddie Camp Lead Teacher (counselor) you are the primary leader of your classroom of our youngest campers (ages 3-5), responsible for their physical, emotional, and spiritual wellbeing and for making their day joyful, safe, and full of Jewish warmth.</p>
<p><strong>What you do day-to-day:</strong></p>
<ul>
<li>Take attendance promptly each morning and provide proper supervision of every camper at all times — campers are never left alone.</li>
<li>Run daily circle time: davening plus a mix of Jewish stories, Parsha, and special dates on the calendar (davening and learning may fall at different points in the day). Keep it fun and interactive with activities, stories, and props.</li>
<li>Prepare and run two daily activities and make sure you have all the supplies ready — submit supply requests to the camp office at least one week in advance.</li>
<li>Keep campers engaged and excited, join songs, games, and bus amusements, and be ready to improvise if an activity is canceled.</li>
<li>Be present and vigilant during swim/water play, lunch, and transitions, following all safety protocols.</li>
<li>Apply basic, appropriate discipline when needed, and recognize and reward campers for participation, good middos, teamwork, and effort.</li>
<li>Guide and respect your Junior Counselors as fellow staff while supervising them; keep your classroom and supplies clean and organized by the end of each day.</li>
<li>Report mishaps and incidents to the Kiddie Camp Director and document disciplinary issues for them; greet campers, parents, and staff with a smile at drop-off and pick-up.</li>
</ul>
<p><strong>Chain of command:</strong> You report to the Kiddie Camp Director. Communicate camper or staff concerns to the Kiddie Camp Director promptly, and significant issues are escalated to the Directors through them.</p>
<p><strong>Phone policy:</strong> Carry your phone for emergencies only, kept out of sight during activities. Radios are provided for regular communication.</p>
<p><strong>Dress code:</strong> Our dress code follows the standards of tznius: skirts must cover the knees at all times with no slits, sleeves must cover the elbows at all times, and necklines must be covered at all times. This is very important to us and is not negotiable.</p>`,

  "kiddie-assistant": `<p><strong>Role summary:</strong> As a Kiddie Camp Assistant Teacher you support the lead teacher in running the classroom and caring for our youngest campers (ages 3-5), helping the day run smoothly and being a steady source of warmth and positive energy.</p>
<p><strong>What you do day-to-day:</strong></p>
<ul>
<li>Help take attendance each morning and assist the lead teacher with proper supervision of every camper at all times.</li>
<li>Assist with circle time — davening, Jewish stories, Parsha, and calendar dates — helping with activities, stories, and props to keep the little ones engaged.</li>
<li>Help the lead teacher prepare and run the daily activities and make sure supplies are ready.</li>
<li>Bring energy to activities, join songs, games, and bus amusements, and help improvise when an activity is canceled.</li>
<li>Be present and vigilant during swim/water play, lunch, and transitions, following all safety protocols.</li>
<li>Support the lead teacher with basic, appropriate discipline, and help recognize and reward campers for their achievements.</li>
<li>Help keep the classroom and supplies clean and organized by the end of each day, and work respectfully alongside Junior Counselors and fellow staff.</li>
<li>Report mishaps and incidents to the lead teacher and Kiddie Camp Director; greet campers, parents, and staff with a smile at drop-off and pick-up.</li>
</ul>
<p><strong>Chain of command:</strong> You report to your Kiddie Camp Lead Teacher and the Kiddie Camp Director. Share concerns with the lead teacher and Kiddie Camp Director promptly, and significant issues are escalated to the Directors through them.</p>
<p><strong>Phone policy:</strong> Carry your phone for emergencies only, kept out of sight during activities. Radios are provided for regular communication.</p>
<p><strong>Dress code:</strong> Our dress code follows the standards of tznius: skirts must cover the knees at all times with no slits, sleeves must cover the elbows at all times, and necklines must be covered at all times. This is very important to us and is not negotiable.</p>`,

  "kiddie-director": `<p><strong>Role summary:</strong> The Kiddie Camp Director owns the full operation of Kiddie Camp (campers ages 3-5) — from pre-season planning through the daily running of camp and post-season wrap-up. Depending on enrollment the role is full-time administrative, or may include teaching a classroom half-days in addition to director duties.</p>
<p><strong>What you do day-to-day (during the summer):</strong></p>
<ul>
<li>Oversee the daily schedule so activities align with the theme calendar, adjusting in real time for weather, supply, or camper and staff needs.</li>
<li>Conduct daily check-ins with counselors and junior staff, give feedback and support, and arrange coverage when staff are absent — stepping in to teach or supervise a classroom when needed.</li>
<li>Serve as the primary contact for Kiddie Camp parents (RingCentral, email, WhatsApp); counselors handle minor needs but loop you in on anything significant, and you escalate serious concerns to the Camp Director.</li>
<li>Prepare weekly newsletters/updates by Thursday afternoon and keep parent communication professional and consistent.</li>
<li>Monitor classroom supplies daily and replenish; keep first-aid kits stocked; ensure groups daven daily and learn Parsha, and run the camp-wide Shabbat party on Fridays (~1:00-1:30 PM).</li>
<li>Collect bunk attendance each morning, review incident forms, and log significant incidents in UltraCamp's medical section.</li>
<li>Maintain health, safety, and supervision standards; address any staff behavior that jeopardizes camper safety immediately (privately when possible); run a mid-season staff review and end-of-summer write-ups.</li>
<li>Coordinate with other divisions for shared spaces (fields, gym) and bring conflicts to the Camp Director.</li>
</ul>
<p><strong>Pre-season:</strong> Hire and onboard Kiddie Camp staff (presenting recommended hires and wages for leadership approval); build the theme calendar and daily schedules on the required deadlines; compile and order the master supply list at least 3 weeks before camp; set up classrooms; finalize parent communications; ensure lead counselors get CPR/First Aid certification; and become proficient in UltraCamp.</p>
<p><strong>Chain of command:</strong> You report to the Camp Director. You supervise all Kiddie Camp staff (lead teachers, assistant teachers, junior counselors, CITs). In an emergency, follow the camp's emergency response plan and ensure campers and staff are safe.</p>
<p><strong>Phone policy:</strong> Carry your phone for camp operations — you are the primary parent contact for the division and coordinate staff throughout the day. Keep it out of sight during direct camper activities; radios are used for regular communication.</p>
<p><strong>Dress code:</strong> Our dress code follows the standards of tznius: skirts must cover the knees at all times with no slits, sleeves must cover the elbows at all times, and necklines must be fully covered. These requirements are non-negotiable and reflect the spirit and mission of our camp.</p>`,

  "boys-assistant-director": `<p><strong>Role summary:</strong> The Assistant Director of the Boys Division is a key member of camp leadership, there to support and empower the Head Counselors and staff in running a high-quality, safe, energetic camp — strengthening their leadership, not overriding it. You also carry the division's learning-program responsibilities.</p>
<p><strong>What you do day-to-day:</strong></p>
<ul>
<li>Support Head Counselors in executing the daily schedule and making sure every activity is logistically ready — supplies, location, timing, setup, and cleanup.</li>
<li>Be the hands-on "eyes and ears" of camp: spend the day moving through camp (not at a computer), stepping in to set up and run activities like water play when staff need help.</li>
<li>Handle routine staff conflicts and operational issues; give Head Counselors reflective, supportive feedback and discuss counselor concerns with them before intervening directly (unless it's a safety issue). Any change to bunk assignments must be approved by the Director.</li>
<li>Oversee camper safety and supervision: follow up on incidents/injuries, ensure incident reports are submitted and uploaded to UltraCamp, and enforce the staff no-phones-during-activities policy (especially at swim).</li>
<li>On trips, handle waivers, vendor and bus-company coordination, payments, and headcount verification; decide with Head Counselors whether to accompany a trip.</li>
<li>Manage supplies and budget with Head Counselors — weekly ordering, last-minute runs, equipment, and daily educational printouts — staying within Director-approved budgets.</li>
<li>Oversee lunch delivery and benching; be outside greeting parents at drop-off and pick-up; run end-of-day cleanup, lockup, and lost-and-found.</li>
<li>Meet daily with Head Counselors for brief debriefs and with the Director; monitor staff attendance and help cover for absent or late staff; nurture staff morale.</li>
<li>Collect daily photos and forward them to the social-media coordinator, and ensure Head Counselors submit weekly newsletter content.</li>
<li><strong>Learning program:</strong> plan, prepare, and supervise the seven-week learning curriculum for grades 1-6; prepare print-ready booklets at least two weeks before camp; train and coach counselors/learning teachers; teach or co-teach 4th-6th grade classes when available; and oversee boys' morning davening.</li>
</ul>
<p><strong>Chain of command:</strong> You report to the Camp Director and partner closely with him, serving as the liaison between leadership and staff. You support — not replace — the Head Counselors, stepping in directly mainly for safety or a clear breakdown in protocol. In a medical or safety emergency, call Hatzalah/911 first, then notify the Director.</p>
<p><strong>Phone policy:</strong> Carry your phone for camp operations — you handle day-to-day camp calls and emails on camper, staff, and behavior matters and stay in constant contact with leadership. Radios are used for regular camp communication.</p>
<p><strong>Dress code:</strong> Button-down shirt (and tie if worn) for morning davening and learning; modest camp T-shirt or similar for other activities and trips — no tight shirts, jeans, or shorts. Haircuts in line with standard yeshiva guidelines.</p>`,

  "girls-assistant-director": `<p><strong>Role summary:</strong> The Assistant Director of the Girls Division is a key member of camp leadership whose job is to make sure camp actually runs smoothly day-to-day — with warmth, structure, and follow-through. This is a hands-on execution role that reinforces the Head Counselor's leadership rather than replacing it.</p>
<p><strong>What you do day-to-day:</strong></p>
<ul>
<li>Support the Head Counselor in carrying out the daily schedule and make sure activities are logistically prepared — supplies, setup, timing, and responsibilities — and that identified needs actually get followed through.</li>
<li>Stay hands-on and visible throughout the day, stepping in early when something is slipping, filling coverage gaps in real time, and handling operational issues so the day feels calm and steady.</li>
<li>Oversee swim sessions so they run safely and efficiently: confirm lifeguards, instructors, and counselors are fulfilling their roles, and that campers are properly supervised in locker rooms, pool areas, and the water.</li>
<li>Provide a second layer of camper support — assist with behavioral issues and minor follow-up, and ensure incidents and minor injuries are properly documented.</li>
<li>On trips, own the logistics: collect and verify waivers, confirm details with vendors, manage setup, supplies, and transportation, and serve as the central point of coordination while the Head Counselor leads the groups.</li>
<li>Manage supplies and inventory, communicate shortages early, and keep shared spaces and systems organized.</li>
<li>Oversee lunch flow and serving, and be visible at arrival (8:50-9:10 AM) and dismissal (3:15-3:40 PM) so families and staff experience reliable leadership.</li>
<li>Give staff respectful reminders and redirection when they need clarification, coverage, or follow-through, and support staff morale and practical needs.</li>
<li>Take timely, organized photos of camp activities and upload them to the camp Photo WhatsApp group.</li>
</ul>
<p><strong>Chain of command:</strong> You report to the Camp Director (Girls Division) and serve as a bridge between planning and execution. You reinforce — not replace — the Head Counselor, stepping in for safety issues, urgent needs, coverage gaps, or practical follow-through. In an emergency, call Hatzalah/911 first, then notify the Director immediately.</p>
<p><strong>Phone policy:</strong> Carry your phone for camp operations — you handle short parent calls, emails, and updates, run photo uploads, and stay in regular contact with the Director. Radios are used for regular camp communication.</p>
<p><strong>Dress code:</strong> As a visible leader you model the division's standards clearly, including tznius: skirts must cover the knees at all times with no slits, leg coverings no shorter than knee socks, sleeves must cover the elbows at all times, and necklines covered at all times. These standards are important to us and are not negotiable.</p>`,

  "bus-monitor": `<p><strong>Role summary:</strong> Bus monitors keep the bus safe, calm, and orderly, and are the main link between parents, campers, and camp leadership.</p><p><strong>Hours depend on your route:</strong> pickup as early as 7:45 AM, arrival ~9:00 AM, departure 3:30 PM, final drop-off as late as 4:45 PM. Timeliness is critical.</p><p><strong>Bus monitors carry a working phone at all times</strong> (the one role where that's required) to run the parent WhatsApp group and share live location.</p><p><strong>Pickup:</strong> help each child board and reach their seat, take attendance, and make sure every camper is buckled the whole ride.</p><p><strong>Drop-off:</strong> help children off safely, release a child ONLY to an authorized person on the Child Release Form (request ID when needed), walk the bus so no child is left behind, and take attendance.</p><p><strong>While moving:</strong> everyone seated and buckled; keep it calm for the driver; know the route well enough to guide a substitute.</p><p><strong>Leadership & records:</strong> stay calm, never yell, report serious concerns to the camp office immediately, keep a daily bus list (scheduled / rode / released-to), and run the parent WhatsApp group.</p>`
};

window.PORTAL_DATA = {
  TRAININGS,
  ROLE_TEMPLATES,
  BASELINE_REQUIRED,
  OPTIONAL_OFFERED,
  INFO_PAGES,
  HANDBOOK_TOPICS,
  JOB_DESCRIPTIONS,
  STAFF,
  RECENT_ACTIVITY,
  CHANA_EMAIL,
  DIRECTOR_EMAIL,
  resolveRequired,
  resolveOptional,
  resolveAdminItems
};

})();  // end IIFE
