// =============================================================================
// CGI Staff Onboarding Portal — seed data + requirements model (v3)
//
// Built from Mendel's spec (June 2026). Key rules:
//   • Roles: junior-counselor, counselor, head-counselor, kiddie-lead-teacher,
//     kiddie-assistant
//   • Baseline (EVERYONE): employment history, handbook, Kudan child-safety
//     video, in-person staff training (attendance), Watchdog (admin-run),
//     1099 ONLY if compensation > $1,500
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
//   • Optional/recommended (NOT counted): First Aid/CPR & Mandated Reporter →
//     "I'm interested" emails Chana@ganisrael.org
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
    description: "Because your summer pay is over $1,500, we need a W-9 on file to issue your 1099 at year end. Download the form below, fill out and sign page 1, then upload it.",
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
    title: "First Aid / CPR & Mandated Reporter (Free)",
    category: "optional",
    description: "Optional but highly encouraged! We offer a free Zoom course for First Aid/CPR and Mandated Reporter training. The camp covers the cost for anyone 16+. Tap below and Chana will reach out to schedule you.",
    type: "optional-request",
    duration: "Optional",
    provider: "Camp (free Zoom course)",
    optional: true,
    recommended: true,
    optionalRoles: "all",
    requestEmail: CHANA_EMAIL,
    requestSubject: "First Aid/CPR & Mandated Reporter — sign me up",
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
  { title: "Welcome & Our Mission", html:
    "<p>Camp Gan Israel is a Chabad day camp built on one idea: <em>awaken the spark, fan the flame, and create an inferno of Judaism in every Jewish child.</em> Our mission is a safe, fun, uplifting summer where love for Yiddishkeit is taught through joy.</p><p>You're not signing up for an hourly summer job — you have a real opportunity to change a child's life. This summer's theme is <strong>\"Flying — Lighting Up the World.\"</strong></p>" },
  { title: "Our Campers", html:
    "<p>Campers are ages 3–11: <strong>Kiddie Camp (3–5)</strong> and the <strong>older divisions (6–11)</strong>, grouped by age. They come from a wide range of backgrounds and observance levels. Every camper is treated fairly and with respect — we only speak nicely about others in this camp.</p>" },
  { title: "Supervision & Ratios", html:
    "<p>Campers are supervised <strong>at all times</strong> — a camper may never wander off without a staff member, under any circumstance.</p><ul style='padding-left:20px;line-height:1.7;'><li>Ratios are legal minimums: older divisions <strong>1:8</strong>, Kiddie <strong>1:7</strong></li><li>At least <strong>two staff</strong> at: swim, trips, sports fields, electives, baking with appliances, archery</li><li>Changing rooms: at least two staff present</li></ul>" },
  { title: "How We Talk to Campers", html:
    "<p>Every kid wants to feel important in your eyes. The basics:</p><ul style='padding-left:20px;line-height:1.7;'><li>Listen and use first names</li><li>Never scream — a calm, low voice is total control</li><li>Praise constantly (younger campers publicly, older ones privately)</li><li>Avoid labels; keep your word</li><li>Offer choices about <em>how</em>, not <em>whether</em></li><li>About to blow up? Walk away, get water, come back calm.</li></ul>" },
  { title: "Discipline", html:
    "<p>We use positive guidance — redirection and prevention, never punishment. The <strong>CPR of Discipline: Consistent, Prompt, Reasonable.</strong> The behavior is the problem, not the camper.</p><p><strong>Always inform the Camp Directors of any disciplinary measure.</strong></p><p>Never deprive a camper of sleep, food, or bathroom; never isolate a camper unsupervised; never use ridicule, shaming, threats, physical contact, or exercise as punishment.</p>" },
  { title: "Bullying & Sensitive Issues", html:
    "<p>Intervene early, separate, support the camper who was hurt, and report up the chain. Teach the difference between <strong>reporting</strong> (getting someone out of danger) and tattling.</p><p>For sensitive topics (family situations, observance level, etc.), consult the Camp Directors and never discuss your own personal life with campers.</p>" },
  { title: "Boundaries, Safety & Harassment Prevention", html:
    "<p><strong>The Rule of Three:</strong> never be alone one-on-one with a camper in a private space — always two staff, or staff + a group. Only high-fives or brief side-hugs.</p><ul style='padding-left:20px;line-height:1.7;'><li><strong>Never</strong> private-message a camper (Instagram, WhatsApp, Snapchat, etc.) or share personal contact info</li><li>Every staff member is a <strong>mandatory reporter</strong> under NJ law</li><li>Reporting chain: your Head Counselor → Assistant Director → Camp Directors</li><li>If you ever suspect a child is being harmed, NJ law requires an <strong>immediate</strong> report to the state child-abuse hotline: <strong>1-877-652-2873</strong> (1-877-NJ-ABUSE) — then notify the Camp Directors</li></ul><p>Self-check: <em>\"Would I be comfortable if a parent or director saw this interaction?\"</em></p>" },
  { title: "Daily Conduct & Work Rules", html:
    "<ul style='padding-left:20px;line-height:1.7;'><li><strong>Phones:</strong> no personal use during camp — emergencies and camp photos only; communicate by walkie-talkie</li><li><strong>Dress:</strong> neat, clean, and consistent with camp standards (see your role's dress code)</li><li>Participate fully in activities and dress-up days; be a role model (Kiddush Hashem)</li><li>Route camper/parent/staff issues through your direct supervisor — not parents directly</li><li>Smoke-free, alcohol/drug-free, weapon-free campus</li></ul>" },
  { title: "Health & Emergencies", html:
    "<ul style='padding-left:20px;line-height:1.7;'><li><strong>Daily health check:</strong> keep an eye on your campers each morning for signs of illness or anything concerning, and report it</li><li>Medication goes to the nurse's office; know your bunk's allergies on Day 1</li><li>Wash hands often (before food, after bathroom) — basic infection control keeps everyone healthy</li><li>After any injury or serious incident, complete an <strong>incident report</strong></li><li>Every trip group carries a radio; epi-pens/inhalers travel with the group</li><li><strong>Never lose track of a camper.</strong> Do regular head counts; know the lost-camper and lost-swimmer procedures, and raise the alarm immediately if a camper is missing</li><li>Know your emergency exits and the plan for fire / evacuation / lockdown (covered at in-person training)</li><li>In an emergency, call <strong>Hatzoloh / 911 first</strong>, then notify leadership</li></ul>" },
  { title: "Food Policy", html:
    "<p>This is a <strong>nut-free and meat-free</strong> camp. Camper lunches must be dairy or parve — no meat, no nuts, no glass containers. Help campers at lunch and enforce these rules.</p>" },
  { title: "Pickup, Dismissal & Buses", html:
    "<p>Supervise campers until they're picked up. Children are only released to <strong>authorized pickup people</strong> — no child is released to an unauthorized driver without director permission. On buses: campers stay seated, arms in, follow the driver; report any issue.</p>" },
  { title: "Before Camp Starts", html:
    "<p>Complete your online requirements before camp: background checks and the Rabbi Kudan ChinuchTools course(s) — forward your certificate to the camp office. Attend your division's in-person training, and read this handbook. Your onboarding checklist in this portal lists exactly what you need.</p>" }
];

// =============================================================================
// RECENT ACTIVITY FEED — empty until the live backend records real activity.
// (No sample names shown in the portal.)
// =============================================================================
const RECENT_ACTIVITY = [];

// =============================================================================
// EXPORT
// =============================================================================
window.PORTAL_DATA = {
  TRAININGS,
  ROLE_TEMPLATES,
  BASELINE_REQUIRED,
  OPTIONAL_OFFERED,
  INFO_PAGES,
  HANDBOOK_TOPICS,
  STAFF,
  RECENT_ACTIVITY,
  CHANA_EMAIL,
  DIRECTOR_EMAIL,
  resolveRequired,
  resolveOptional,
  resolveAdminItems
};

})();  // end IIFE
