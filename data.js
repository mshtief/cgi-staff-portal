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
    description: "You'll need a fresh fingerprint-based background check. Complete an IdentoGO appointment using the codes below, then upload your receipt.",
    type: "external-task",
    duration: "~45 min",
    provider: "IdentoGO (NJ-approved vendor)",
    action: "Follow the steps below to book and complete your appointment, then upload the receipt.",
    appliesIf: { fpStatus: "new" },
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

  "fingerprints-renewal": {
    id: "fingerprints-renewal",
    title: "Fingerprint Renewal (sign to certify)",
    category: "paperwork",
    description: "Since you were fingerprinted with us within the last 3 years, you don't need a new appointment — just certify nothing has changed. Fill out the form below; we'll print it, notarize it, and file it.",
    type: "fillable-form",
    formKind: "renewal-letter",
    duration: "3 min",
    provider: "Camp",
    appliesIf: { fpStatus: "renew" },
    completionMethod: "submit-form",
    certifyText: "I hereby certify that the results of my fingerprint-based criminal history record remain unchanged from the date they were performed.",
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
    appliesIf: { bgStatus: "new" },
    completionMethod: "auto-confirmed",
    resources: []
  },

  "bg-renewal-letter": {
    id: "bg-renewal-letter",
    title: "Background Check Renewal Letter",
    category: "paperwork",
    description: "Since we have a background check on file for you from the last 3 years, you just need to certify nothing has changed. Fill out the form below — we'll print it, notarize it, and file it.",
    type: "fillable-form",
    formKind: "renewal-letter",
    duration: "3 min",
    provider: "Camp",
    appliesIf: { bgStatus: "renew" },
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
  "fingerprints-identogo",     // US 18+ — needs new fingerprints (upload receipt)
  "fingerprints-renewal",      // US 18+ — fingerprinted in last 3 yrs (sign to certify)
  "bg-check-invite",           // US 18+ — needs a new background check
  "bg-renewal-letter",         // US 18+ — bg on file in last 3 yrs (sign to certify)
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
  if (c.fpStatus !== undefined) {
    const fp = staff.fpStatus || ((staff.is18Plus && staff.isFromUS) ? "new" : "na");
    if (c.fpStatus !== fp) return false;
  }
  if (c.bgStatus !== undefined) {
    const bg = staff.bgStatus || ((staff.is18Plus && staff.isFromUS) ? "new" : "na");
    if (c.bgStatus !== bg) return false;
  }
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
// Division theme-calendar images — the actual 2026 JPEGs parents receive,
// hotlinked from the camp's public parent-portal asset folder (ganisrael.org/app/).
// These are stable, public URLs; if a calendar is ever revised, the staff portal
// reflects it automatically. Empty = a placeholder note shows instead.
const CALENDAR_IMAGES = {
  boys: "https://ganisrael.org/app/calendar-boys-2026.jpg",
  girls: "https://ganisrael.org/app/calendar-girls-2026.jpg",
  kiddie: "https://ganisrael.org/app/calendar-kiddie-2026.jpg"
};

const INFO_PAGES = [
  { id: "job-description", title: "Your Job Description", icon: "🧑‍🏫", blurb: "Exactly what your role does, day to day" },
  { id: "first-day",      title: "Your First Day",         icon: "📍", blurb: "Where to go, when to arrive, what to do first" },
  { id: "daily-schedule", title: "The Camp Day",           icon: "🕘", blurb: "How a typical day flows, start to finish" },
  { id: "camp-calendar",  title: "Calendar & Themes",      icon: "📅", blurb: "Season dates, days off, and this summer's themes" },
  { id: "key-policies",   title: "Key Policies",           icon: "📋", blurb: "Phone, dress, boundaries, reporting, food" },
  { id: "photos",         title: "Camp Photos — Upload Access", icon: "📸", blurb: "Your photo-upload login and how to take great camp photos", photoAccessOnly: true },
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
  { id: "caring-for-campers", title: "Caring for Your Campers — What Parents Count On", html:
    `<p>Above everything else, your most important job is the <strong>safety and care of every camper — physically and emotionally.</strong> We love your energy, creativity, and dedication, and we need all of it — but a camper's safety and wellbeing always comes first. Parents trust us with the most precious thing in their world, and the way we care for their child is what they remember most.</p>
<p><strong>Physical care &amp; safety:</strong></p>
<ul>
<li>Always know where every one of your campers is, and supervise constantly.</li>
<li><strong>Make sure every camper actually eats their snack and lunch.</strong> On a busy, fun day this is easy to forget — but a hungry child is a real problem, and parents care about it deeply. Check that each camper has eaten.</li>
<li>Keep campers hydrated, sun-safe, and comfortable.</li>
</ul>
<p><strong>Swimming is a top priority for parents.</strong> One of the biggest reasons families send their children to camp is so they swim and get swim lessons. Make sure your campers participate, listen to the instructors, and get the most out of every swim — and never take your eyes off a camper near the water.</p>
<p><strong>Go easy on sugar.</strong> Parents do <em>not</em> want their children loaded up with candy and sweets. <strong>Don't hand out sugar or treats on your own — always clear it with the leadership team first.</strong></p>
<p><strong>Emotional care.</strong> Every camper should feel seen, included, and cared for. Watch for the child who is quiet, left out, or having a hard day, and make sure no one slips through the cracks.</p>
<p><strong>Keep parents in the know — through leadership.</strong> Parents deeply value knowing what's going on with their child. If anything comes up — a bump, an upset, a struggle, anything physical or emotional — <strong>bring it to your Head Counselor or the Directors</strong> so the family can be kept informed appropriately. Never let something a parent would want to know about go unreported.</p>
<p>In short: bring your best energy and spirit — and let the safety, health, and emotional care of every camper guide everything you do.</p>` },

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
<p><strong>The camp day runs Monday–Thursday 9:00 AM – 3:30 PM, and Friday 9:00 AM – 2:00 PM</strong> (we end early for Shabbos).</p>
<ul>
  <li><strong>Counselors & staff:</strong> arrive <strong>8:45 AM</strong> and stay until <strong>3:45 PM</strong> (Fridays until <strong>2:15 PM</strong>) — fifteen minutes before and after the camp day, to set up and see every camper off.</li>
  <li><strong>Head staff & leadership</strong> (Head Counselors, Assistant Directors, Kiddie Camp Director): <strong>8:30 AM – 4:00 PM</strong> (Fridays <strong>8:30 AM – 2:30 PM</strong>).</li>
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
  "boys-counselor": `<p><strong>Job Title:</strong> Counselor</p>
<p><strong>Reports to:</strong> Head Counselor</p>

<h2>Thank You &amp; Camp Mission</h2>
<p>Thank you for your interest in spending your summer with us here at <strong>Gan Israel Day Camps Morristown, NJ</strong>. It is because of your dedication and commitment that, IYH, this summer will be a smashing success.</p>
<p>Our camp mission is to provide a <strong>safe, fun, and uplifting</strong> summer day camp experience for Jewish children—a place where <strong>love for Judaism</strong> is taught through <strong>fun, joy,</strong> and a true love for every staff member, camper, and each member of their families.</p>
<p>In order to eliminate as much uncertainty and confusion as possible, below we have outlined some of the <strong>basic responsibilities</strong> of a counselor in CGI.</p>

<h2>Counselor Role Summary</h2>
<ol>
  <li><strong>Leadership in Bunk Management and Activities</strong><br>As the <strong>primary leader</strong>, you will be responsible for running your bunk efficiently throughout the day. This includes setting a <strong>positive example</strong>, leading activities, and being the <strong>role model</strong> the campers look up to. <strong>Your leadership is key in ensuring a smooth and engaging day-to-day camp experience.</strong></li>
  <li><strong>Camper Wellbeing</strong><br>In this pivotal role, you are the <strong>primary guardian</strong> of the campers' spiritual, physical, and emotional wellbeing. Your responsibilities involve actively ensuring their safety, comfort, and overall health. This includes being vigilant about their needs and creating a nurturing environment for all campers.</li>
  <li><strong>Inspiration</strong><br>Beyond supervision, your role is to <strong>inspire</strong>. This involves fostering a <strong>positive and energetic</strong> atmosphere, encouraging campers to engage deeply in camp activities and to grow personally. Your goal is to ensure that every camper leaves with memorable experiences and life lessons from their time at camp.</li>
</ol>

<h2>Dates &amp; Hours</h2>
<ul>
  <li><strong>Camp Dates</strong>: Monday, <strong>June 29</strong> – Friday, <strong>August 14, 2026</strong></li>
  <li><strong>Staff Arrival</strong>: <strong>June 28, 2026 (Morning)</strong></li>
  <li><strong>Staff Training</strong>: Takes place on <strong>June 28</strong>, 2026, for camp preparation and orientation</li>
  <li><strong>Daily Schedule</strong>:
    <ul>
      <li><strong>Mondays to Thursdays</strong>: Camp hours are 9:00 AM to 3:30 PM. Staff must arrive by <strong>8:45 AM</strong> and may leave by <strong>3:45 PM</strong>.</li>
      <li><strong>Fridays</strong>: Camp hours are 9:00 AM to 2:00 PM. Staff may leave by <strong>2:15 PM</strong>.</li>
    </ul>
  </li>
  <li><strong>Cell Phone Policy</strong>: Counselors may <strong>not</strong> use a personal phone during camp. Radios will be provided for regular communication.</li>
  <li><strong>Timeliness</strong>: Staff are expected to attend <strong>every single day</strong> of camp <strong>on time</strong>. In case of illness or unavoidable delay, please notify the Directors as soon as possible.</li>
</ul>

<h2>Pre-Season Preparation</h2>
<ul>
  <li><strong>In-Person Sessions</strong>: Will occur on the Sunday before camp starts. Specific times will be communicated.</li>
  <li><strong>Online Training</strong>: Mandatory online webinars and training will be scheduled. All online training <strong>must be completed</strong> at least two weeks prior to camp.</li>
</ul>

<h2>Responsibilities</h2>
<ol>
  <li><strong>Ensure that campers are kept safe both physically and emotionally.</strong></li>
  <li>Provide <strong>proper supervision</strong> of every camper at all times.</li>
  <li>Be aware of and implement all <strong>safety guidelines</strong>.</li>
  <li>Be proactive in identifying and responding to <strong>safety hazards</strong>.</li>
  <li>Follow <strong>safety and security</strong> protocols when campers are in public, while <strong>presenting a positive image</strong> of the camp.</li>
  <li>Apply <strong>basic and appropriate "disciplinary" action</strong> when necessary.</li>
  <li>Recognize and reward campers for <strong>individual and team achievements</strong>.</li>
</ol>

<h3>Running and Participating in Age-Appropriate Davening and Learning</h3>
<ul>
  <li>Prepare daily for the <strong>learning class</strong>; it should not take more than <strong>15-30 minutes</strong>. A curriculum with detailed teaching instructions will be provided.</li>
  <li>Learning will be led by the counselors. Curriculum will be prepared for you before camp with instructions on what you will be teaching.</li>
  <li>If you have something specific that you would like to teach, please let the HC know about that prior to that day's learning class.</li>
  <li>Learning should be <strong>fun, interesting,</strong> and <strong>interactive</strong>. We encourage you to include small activities, stories, props, and other ideas to keep the kids engaged and excited to learn.</li>
  <li>Run an <strong>engaging Davening</strong> with your group that is age-appropriate and includes <strong>songs, energy, and incentives</strong> to ensure that campers start off the day with maximum Jewish energy.</li>
</ul>

<h3>Keep Campers Engaged</h3>
<ul>
  <li>Keep your campers stimulated and excited throughout the camp day.</li>
  <li>Familiarize yourself with the <strong>day's schedule</strong> before lineup.</li>
  <li>Bring <strong>energy and enthusiasm</strong> to all camp activities and encourage your campers to participate fully.</li>
  <li>Take an active part in the <strong>songs, games, and other amusements on bus rides</strong>.</li>
  <li>When applicable, <strong>join activities</strong> as an active participant, including those led by professional instructors.</li>
  <li>Be <strong>present and vigilant</strong> with the campers during swim times by overseeing them in the pool and water play area.</li>
  <li>Be prepared to <strong>improvise</strong> when necessary, in case an activity is canceled or does not proceed as planned.</li>
</ul>

<h3>Role Model &amp; Mentchlichkeit</h3>
<ul>
  <li>Be a <strong>role model</strong> to campers and staff in your attitude and behavior.</li>
  <li>Follow and uphold all <strong>safety and security rules and procedures</strong>.</li>
  <li>Set a <strong>good example</strong> and follow general camp procedures and practices including sanitation, schedule, and sportsmanship.</li>
  <li><strong>Mentchlichkeit</strong> is of utmost importance. It is expected that counselors will be making a <strong>kiddush Hashem</strong> at all times in all areas.</li>
  <li>Guide and respect the <strong>Junior Counselors</strong>; treat and respect them as fellow staff members while providing guidance and supervision.</li>
</ul>

<h3>Instill Love of Judaism</h3>
<ul>
  <li>Instill a <strong>love of Judaism and Torah</strong> in the campers by being a good role model and by educating them through stories and activities.</li>
</ul>

<h2>Respect</h2>
<h3>Facility</h3>
<p>Ensure that your campers respect the camp facility at all times. This includes maintaining cleanliness by not leaving garbage around, making appropriate use of school property, and ensuring the noise level within the building is kept to an appropriate volume. <strong>Campers are not to be left alone</strong> in any area of the facility and should only be present in designated camp areas.</p>
<h3>Camp Property</h3>
<p>Ensure that <strong>supplies are returned</strong> to their proper place after use. This includes sports equipment, arts &amp; crafts supplies, special activity supplies, games, etc. Additionally, ensure that <strong>all equipment</strong> is treated with care and respect.</p>
<h3>Human Interactions</h3>
<p>We trust that all counselors will <strong>respect campers</strong>, fellow staff members, and the staff members of the school's facility.</p>

<h2>Organization &amp; Communication</h2>
<ol>
  <li><strong>Take attendance</strong> first thing each morning.</li>
  <li>Cooperate with the <strong>Head Counselor (HC)</strong> plans and schedules, assisting in any preparations as needed.</li>
  <li><strong>Contribute to ensuring</strong> that camp activities run on time <strong>according to the schedule</strong> at all times.</li>
  <li>Clean up after your bunk activities. Ensure all supplies are properly stored for use by other bunks, and dispose of all garbage.</li>
  <li>At the end of the day, ensure your bunk room and designated areas are clean, supplies organized and put away, and all garbage is in bins.</li>
  <li><strong>Report any mishaps</strong> or incidents to prevent future occurrences.</li>
  <li>Document disciplinary problems and the actions taken to address them in <strong>incident reports</strong>, and submit these to the HC.</li>
  <li><strong>Actively participate</strong> in all meetings with the HC and/or directors.</li>
  <li>Inform the HC of any <strong>camper or staff issues</strong>.</li>
  <li>Inform the directors of any <strong>serious camper or staff issues</strong>.</li>
  <li>Maintain <strong>clear and open communication</strong> with the camp directors and head counselors. We are here to support you and ensure a fun, meaningful summer for our staff.</li>
</ol>

<h2>Other Duties</h2>
<ul>
  <li>Participate in <strong>extracurricular activities</strong>, including but not limited to family events and any other special activities.</li>
  <li>Demonstrate <strong>flexibility</strong> and a <strong>positive attitude</strong> when additional camp assistance is needed.</li>
  <li>Additional duties may be assigned as necessary.</li>
  <li>Greet campers, parents, and fellow staff members with a <strong>smile</strong> at pick-up and drop-off times!</li>
</ul>

<h2>Dress Code</h2>
<p>Our staff dress code include, but are not limited to, the following requirements:</p>
<p>All staff must wear:</p>
<ul>
  <li>Button down shirts for davening and learning class.</li>
  <li>T-shirts and other shirts are allowed during other activities, but no tight fit shirts or shirts with inappropriate pictures or writing.</li>
  <li>No jeans or shorts.</li>
  <li>Appropriate haircuts. If you are unsure about something, please ask. In general, we keep to the basic standards of Yeshivos, unless otherwise stated.</li>
</ul>
<p>This is very important to us and not "negotiable".</p>

<h2>Professional Development</h2>
<ol>
  <li>Complete our <strong>counselor application form</strong>.</li>
  <li>Participate in a <strong>Post-hire meeting</strong> to review the basics of what to expect at our camp.</li>
  <li>Participate in the <strong>online training</strong> that will take place before camp; there will be a few webinars that you must watch and take the test on. You will be emailed the times and dates.</li>
  <li>Be present at <strong>Staff meetings</strong> which will take place on Friday and Sunday before camp.</li>
  <li>Participate in setting up and <strong>preparing the campgrounds</strong> on the Sunday before camp.</li>
</ol>

<h2>General Requirements</h2>
<ul>
  <li><strong>Read and adhere</strong> to the policies and procedures outlined in the <strong>Staff Handbook</strong> (provided).</li>
  <li><strong>Formal training</strong> and <strong>conference training calls</strong> will take place before camp, reviewing these procedures in greater detail.</li>
</ul>

<h2>Compensation</h2>
<ul>
  <li>Your stipend and payment schedule are detailed in your <strong>signed contract</strong>.</li>
  <li>To show our undying appreciation to our staff, we <strong>occasionally sponsor after-camp counselor outings</strong> and trips.</li>
</ul>

<p>We wish you <strong>Hatzlocho Rabba</strong> and look forward to being actively involved and working together with you.</p>
<p>Remember, our goal is to make sure <strong>everyone</strong>—campers and staff—has a <strong>positive and meaningful</strong> summer experience. If at any time you feel that something above is not in line with this goal, please let us know. We value feedback and will work hard to resolve any issues.</p>
<p><strong>Please feel free</strong> to ask any questions or discuss any issues with the camp office, should you feel it necessary.</p>
<p>To learn more about our camp program or to complete an application form, visit our website: <strong>www.ganisrael.org</strong></p>`,

  "girls-counselor": `<p><strong>Job Title:</strong> Counselor</p>
<p><strong>Reports to:</strong> Head Counselor</p>

<h2>Thank You &amp; Camp Mission</h2>
<p>Thank you for your interest in spending your summer with us here at <strong>Gan Israel Day Camps Morristown, NJ</strong>. It is because of your dedication and commitment that, IYH, this summer will be a smashing success.</p>
<p>Our camp mission is to provide a <strong>safe, fun, and uplifting</strong> summer day camp experience for Jewish children—a place where <strong>love for Judaism</strong> is taught through <strong>fun, joy,</strong> and a true love for every staff member, camper, and each member of their families.</p>
<p>In order to eliminate as much uncertainty and confusion as possible, below we have outlined some of the <strong>basic responsibilities</strong> of a counselor in CGI.</p>

<h2>Counselor Role Summary</h2>
<ol>
  <li><strong>Leadership in Bunk Management and Activities</strong><br>As the <strong>primary leader</strong>, you will be responsible for running your bunk efficiently throughout the day. This includes setting a <strong>positive example</strong>, leading activities, and being the <strong>role model</strong> the campers look up to. <strong>Your leadership is key in ensuring a smooth and engaging day-to-day camp experience.</strong></li>
  <li><strong>Camper Wellbeing</strong><br>In this pivotal role, you are the <strong>primary guardian</strong> of the campers' spiritual, physical, and emotional wellbeing. Your responsibilities involve actively ensuring their safety, comfort, and overall health. This includes being vigilant about their needs and creating a nurturing environment for all campers.</li>
  <li><strong>Inspiration</strong><br>Beyond supervision, your role is to <strong>inspire</strong>. This involves fostering a <strong>positive and energetic</strong> atmosphere, encouraging campers to engage deeply in camp activities and to grow personally. Your goal is to ensure that every camper leaves with memorable experiences and life lessons from their time at camp.</li>
</ol>

<h2>Dates &amp; Hours</h2>
<ul>
  <li><strong>Camp Dates</strong>: Monday, <strong>June 29</strong> – Friday, <strong>August 14, 2026</strong></li>
  <li><strong>Staff Training</strong>: Takes place on <strong>June 26</strong> and <strong>June 28</strong>, 2026, for camp preparation and orientation</li>
  <li><strong>Daily Schedule</strong>:
    <ul>
      <li><strong>Mondays to Thursdays</strong>: Camp hours are 9:00 AM to 3:30 PM. Staff must arrive by <strong>8:45 AM</strong> and may leave by <strong>3:45 PM</strong>.</li>
      <li><strong>Fridays</strong>: Camp hours are 9:00 AM to 2:00 PM. Staff may leave by <strong>2:15 PM</strong>.</li>
    </ul>
  </li>
  <li><strong>Cell Phone Policy</strong>: Counselors may <strong>not</strong> use a personal phone during camp. Radios will be provided for regular communication.</li>
  <li><strong>Timeliness</strong>: Staff are expected to attend <strong>every single day</strong> of camp <strong>on time</strong>. In case of illness or unavoidable delay, please notify the Directors as soon as possible.</li>
</ul>

<h2>Pre-Season Preparation</h2>
<ul>
  <li><strong>In-Person Sessions</strong>: Will occur on the Friday and Sunday before camp starts. Specific times will be communicated.</li>
  <li><strong>Online Training</strong>: Mandatory online webinars and training will be scheduled. All online training <strong>must be completed</strong> at least two weeks prior to camp.</li>
</ul>

<h2>Responsibilities</h2>
<ol>
  <li><strong>Ensure that campers are kept safe both physically and emotionally.</strong></li>
  <li>Provide <strong>proper supervision</strong> of every camper at all times.</li>
  <li>Be aware of and implement all <strong>safety guidelines</strong>.</li>
  <li>Be proactive in identifying and responding to <strong>safety hazards</strong>.</li>
  <li>Follow <strong>safety and security</strong> protocols when campers are in public, while <strong>presenting a positive image</strong> of the camp.</li>
  <li>Apply <strong>basic and appropriate "disciplinary" action</strong> when necessary.</li>
  <li>Recognize and reward campers for <strong>individual and team achievements</strong>.</li>
</ol>

<h3>Running and Participating in Age-Appropriate Davening and Learning</h3>
<ul>
  <li>Prepare daily for the <strong>learning class</strong>; it should not take more than <strong>10–15 minutes</strong>. A curriculum with detailed teaching instructions will be provided.</li>
  <li>Learning should be <strong>fun, interesting,</strong> and <strong>interactive</strong>. We encourage you to include small activities, stories, props, and other ideas to keep the kids engaged and excited to learn.</li>
  <li>Run an <strong>engaging Davening</strong> with your group that is age-appropriate and includes <strong>songs, energy, and incentives</strong> to ensure that campers start off the day with maximum Jewish energy.</li>
</ul>

<h3>Keep Campers Engaged</h3>
<ul>
  <li>Keep your campers stimulated and excited throughout the camp day.</li>
  <li>Familiarize yourself with the <strong>day's schedule</strong> before lineup.</li>
  <li>Bring <strong>energy and enthusiasm</strong> to all camp activities and encourage your campers to participate fully.</li>
  <li>Take an active part in the <strong>songs, games, and other amusements on bus rides</strong>.</li>
  <li>When applicable, <strong>join activities</strong> as an active participant, including those led by professional instructors.</li>
  <li>Be <strong>present and vigilant</strong> with the campers during swim times by overseeing them in the pool and water play area.</li>
  <li>Be prepared to <strong>improvise</strong> when necessary, in case an activity is canceled or does not proceed as planned.</li>
</ul>

<h3>Role Model &amp; Mentchlichkeit</h3>
<ul>
  <li>Be a <strong>role model</strong> to campers and staff in your attitude and behavior.</li>
  <li>Follow and uphold all <strong>safety and security rules and procedures</strong>.</li>
  <li>Set a <strong>good example</strong> and follow general camp procedures and practices including sanitation, schedule, and sportsmanship.</li>
  <li><strong>Mentchlichkeit</strong> is of utmost importance. It is expected that counselors will be making a <strong>kiddush Hashem</strong> at all times in all areas.</li>
  <li>Guide and respect the <strong>Junior Counselors</strong>; treat and respect them as fellow staff members while providing guidance and supervision.</li>
</ul>

<h3>Instill Love of Judaism</h3>
<ul>
  <li>Instill a <strong>love of Judaism and Torah</strong> in the campers by being a good role model and by educating them through stories and activities.</li>
</ul>

<h2>Respect</h2>
<h3>Facility</h3>
<p>Ensure that your campers respect the camp facility at all times. This includes maintaining cleanliness by not leaving garbage around, making appropriate use of school property, and ensuring the noise level within the building is kept to an appropriate volume. <strong>Campers are not to be left alone</strong> in any area of the facility and should only be present in designated camp areas.</p>
<h3>Camp Property</h3>
<p>Ensure that <strong>supplies are returned</strong> to their proper place after use. This includes sports equipment, arts &amp; crafts supplies, special activity supplies, games, etc. Additionally, ensure that <strong>all equipment</strong> is treated with care and respect.</p>
<h3>Human Interactions</h3>
<p>We trust that all counselors will <strong>respect campers</strong>, fellow staff members, and the staff members of the school's facility.</p>

<h2>Organization &amp; Communication</h2>
<ol>
  <li><strong>Take attendance</strong> first thing each morning.</li>
  <li>Cooperate with the <strong>Head Counselor (HC)</strong> plans and schedules, assisting in any preparations as needed.</li>
  <li><strong>Contribute to ensuring</strong> that camp activities run on time <strong>according to the schedule</strong> at all times.</li>
  <li>Clean up after your bunk activities. Ensure all supplies are properly stored for use by other bunks, and dispose of all garbage.</li>
  <li>At the end of the day, ensure your bunk room and designated areas are clean, supplies organized and put away, and all garbage is in bins.</li>
  <li><strong>Report any mishaps</strong> or incidents to prevent future occurrences.</li>
  <li>Document disciplinary problems and the actions taken to address them in <strong>incident reports</strong>, and submit these to the HC.</li>
  <li><strong>Actively participate</strong> in all meetings with the HC and/or directors.</li>
  <li>Inform the HC of any <strong>camper or staff issues</strong>.</li>
  <li>Inform the directors of any <strong>serious camper or staff issues</strong>.</li>
  <li>Maintain <strong>clear and open communication</strong> with the camp directors and head counselors. We are here to support you and ensure a fun, meaningful summer for our staff.</li>
</ol>

<h2>Other Duties</h2>
<ul>
  <li>Participate in <strong>extracurricular activities</strong>, including but not limited to family events and any other special activities.</li>
  <li>Demonstrate <strong>flexibility</strong> and a <strong>positive attitude</strong> when additional camp assistance is needed.</li>
  <li>Additional duties may be assigned as necessary.</li>
  <li>Greet campers, parents, and fellow staff members with a <strong>smile</strong> at pick-up and drop-off times!</li>
</ul>

<h2>Dress Code</h2>
<p>Our staff dress code adheres to <strong>Tznius</strong> standards, which include, but are not limited to, the following requirements:</p>
<ul>
  <li><strong>Skirts</strong> must cover the knees at all times, without any slits.</li>
  <li><strong>Sleeves</strong> must cover the elbows at all times.</li>
  <li><strong>Necklines</strong> must be covered at all times.</li>
</ul>
<p>Adherence to the dress code is <strong>very important</strong> to us and is <strong>not negotiable</strong>.</p>

<h2>Professional Development</h2>
<ol>
  <li>Complete our <strong>counselor application form</strong>.</li>
  <li>Participate in a <strong>Post-hire meeting</strong> to review the basics of what to expect at our camp.</li>
  <li>Participate in the <strong>online training</strong> that will take place before camp; there will be a few webinars that you must watch and take the test on. You will be emailed the times and dates.</li>
  <li>Be present at <strong>Staff meetings</strong> which will take place on Friday and Sunday before camp.</li>
  <li>Participate in setting up and <strong>preparing the campgrounds</strong> on the Sunday before camp.</li>
</ol>

<h2>General Requirements</h2>
<ul>
  <li><strong>Read and adhere</strong> to the policies and procedures outlined in the <strong>Staff Handbook</strong> (provided).</li>
  <li><strong>Formal training</strong> and <strong>conference training calls</strong> will take place before camp, reviewing these procedures in greater detail.</li>
</ul>

<h2>Compensation</h2>
<ul>
  <li>Your stipend and payment schedule are detailed in your <strong>signed contract</strong>.</li>
  <li>To show our undying appreciation to our staff, we <strong>occasionally sponsor after-camp counselor outings</strong> and trips.</li>
</ul>

<p>We wish you <strong>Hatzlocho Rabba</strong> and look forward to being actively involved and working together with you.</p>
<p>Remember, our goal is to make sure <strong>everyone</strong>—campers and staff—has a <strong>positive and meaningful</strong> summer experience. If at any time you feel that something above is not in line with this goal, please let us know. We value feedback and will work hard to resolve any issues.</p>
<p><strong>Please feel free</strong> to ask any questions or discuss any issues with the camp office, should you feel it necessary.</p>
<p>To learn more about our camp program or to complete an application form, visit our website: <strong>www.ganisrael.org</strong></p>`,

  "boys-junior-counselor": `<p><strong>Job Title:</strong> Junior Counselor</p>
<p><strong>Reports to:</strong> Counselor</p>

<p>Thank you for your interest in spending your summer with us here at Gan Israel Day Camps Morristown NJ! It is because of your dedication and commitment that IYH this summer will be a smashing success.</p>
<p>Our camp mission is to provide a safe, fun and uplifting summer day camp experience for Jewish children; a place where love for Judaism is taught through fun, joy, and a true love for every staff member, camper and each member of their families.</p>
<p>In order to eliminate as much uncertainty and confusion as possible, below we have outlined some of the basic responsibilities of a junior counselor in CGI.</p>

<h2>Junior Counselor Role Summary</h2>
<ol>
  <li><strong>Assisting in Activity Leadership:</strong> Support the lead counselor in conducting activities. This involves helping with the organization and preparation of supplies needed for each activity.</li>
  <li><strong>Camper Wellbeing:</strong> Actively contribute to safeguarding the campers' spiritual, physical, and emotional wellbeing. This includes being vigilant about their safety and comfort at all times.</li>
  <li><strong>Supervision and Inspiration:</strong> Provide consistent supervision to ensure a safe and enjoyable camp experience. Be a source of inspiration and positive energy, encouraging campers to engage in camp activities and to embrace camp values.</li>
</ol>

<h2>Dates &amp; Hours</h2>
<ul>
  <li><strong>Camp Dates:</strong> Monday, June 29 - Friday, August 14, 2026.</li>
  <li><strong>Staff Training:</strong> Takes place on June 28, 2026, for camp preparation and orientation.</li>
  <li><strong>Daily Schedule:</strong>
    <ul>
      <li>Mondays to Thursdays: Camp hours are 9:00 am to 3:30 pm. Staff must arrive by 8:45 am and may leave by 3:45 pm.</li>
      <li>Fridays: Camp hours are 9:00 am to 2:00 pm. Staff may leave by 2:15 pm.</li>
    </ul>
  </li>
  <li><strong>Cell Phone Policy:</strong> Junior Counselors may not use a personal phone during camp. Radios provided for regular communication.</li>
  <li><strong>Timeliness:</strong> Staff are expected to attend every single day of camp on time. In case of illness or unavoidable delay, please notify the Directors ASAP.</li>
</ul>

<h3>Pre-Season Preparation</h3>
<ul>
  <li><strong>In-Person Sessions:</strong> Will occur on the Friday and Sunday before camp starts. Specific times will be communicated.</li>
  <li><strong>Online Training:</strong> Mandatory online webinars and training will be scheduled. All online training must be completed at least two weeks prior to camp.</li>
</ul>

<h2>Responsibilities</h2>
<ol>
  <li>Assist counselor throughout the day: lineup, davening &amp; learning class, lunch, transition time, and all other activities and trips.</li>
  <li>There are often campers in a bunk that require more individualized attention or assistance. You can offer that extra help while the counselor moves on with the rest of the bunk.</li>
  <li>Always ask for help when unsure of how to proceed or if the health or safety of a camper or staff member is in question.</li>
  <li>Make sure to smile and use positive word choice and encouragement throughout the day. Leave all "disciplinary action" to the discretion of the counselor.</li>
  <li>Always follow the counselor's lead. When a counselor or head counselor is asking for quiet, immediately place your finger over your lips and point towards the person speaking so that your campers will follow suit. Your assistance in getting quiet is one of the biggest helps in moving through the amazing CGI schedule!</li>
  <li>Be a role model to campers and set a good example and follow general camp procedures and practices including sanitation, schedule, and sportsmanship.</li>
  <li>Communication:
    <ol>
      <li>Stay with the bunk you are assigned to. If you need a break, make sure it's ok with the staff member in charge. If you feel like you are not doing enough, ask our Head Counselor, "I'm wondering what else I can do to help?"</li>
      <li>If you have an issue, speak to a Head Counselor. They are here to make you comfortable and assist with anything you may be wondering about. If you need more assistance, speak to the Directors. The only stupid question is the one not asked, so please ask us before a small inconvenience becomes a big problem.</li>
    </ol>
  </li>
  <li>Other Duties:
    <ol>
      <li>Participation in extracurricular activities, including, but not limited to, Family BBQ, and other special activities.</li>
      <li>Greet campers and parents (and staff!) with a smile at pick up and drop off!</li>
    </ol>
  </li>
</ol>

<h2>Dress Code</h2>
<p>Standards of Tznius for our staff include but are not limited to:</p>
<ul>
  <li>A) T-shirt or button down shirt. No tank tops.</li>
  <li>B) Long pants.</li>
  <li>C) Tzitzit and Kippah. (Baseball cap also works)</li>
  <li>D) Camp shirt on trip days.</li>
</ul>

<h2>Professional Development</h2>
<ol>
  <li>Participate in counselor webinars and in-person training. Details will follow closer to the summer.</li>
  <li>Be present at the staff meeting &amp; camp set up which will take place the Sunday before camp.</li>
</ol>

<h2>Compensation</h2>
<ol>
  <li>Your stipend and payment schedule are detailed in your signed contract.</li>
  <li>To show our undying appreciation to our staff, we occasionally sponsor after camp counselor outings and trips.</li>
</ol>

<p>We wish you Hatzlacha Rabba and look forward to being actively involved and working together with you. Please feel free to ask any questions or discuss any issues with the camp office, should you feel necessary.</p>
<p>To learn more about our camp program or to complete an application form, visit our website: <strong>www.ganisrael.org</strong></p>`,

  "girls-junior-counselor": `<p><strong>Job Title:</strong> Junior Counselor</p>
<p><strong>Reports to:</strong> Counselor</p>

<p>Thank you for your interest in spending your summer with us here at Gan Israel Day Camps Morristown NJ! It is because of your dedication and commitment that IYH this summer will be a smashing success.</p>
<p>Our camp mission is to provide a safe, fun and uplifting summer day camp experience for Jewish children; a place where love for Judaism is taught through fun, joy, and a true love for every staff member, camper and each member of their families.</p>
<p>In order to eliminate as much uncertainty and confusion as possible, below we have outlined some of the basic responsibilities of a junior counselor in CGI.</p>

<h2>Junior Counselor Role Summary</h2>
<ol>
  <li><strong>Assisting in Activity Leadership:</strong> Support the lead counselor in conducting activities. This involves helping with the organization and preparation of supplies needed for each activity.</li>
  <li><strong>Camper Wellbeing:</strong> Actively contribute to safeguarding the campers' spiritual, physical, and emotional wellbeing. This includes being vigilant about their safety and comfort at all times.</li>
  <li><strong>Supervision and Inspiration:</strong> Provide consistent supervision to ensure a safe and enjoyable camp experience. Be a source of inspiration and positive energy, encouraging campers to engage in camp activities and to embrace camp values.</li>
</ol>

<h2>Dates &amp; Hours</h2>
<ul>
  <li><strong>Camp Dates:</strong> Monday, June 29 - Friday, August 14, 2026.</li>
  <li><strong>Staff Training:</strong> Takes place on June 26, 2026, for camp preparation and orientation.</li>
  <li><strong>Daily Schedule:</strong>
    <ul>
      <li>Mondays to Thursdays: Camp hours are 9:00 am to 3:30 pm. Staff must arrive by 8:45 am and may leave by 3:45 pm.</li>
      <li>Fridays: Camp hours are 9:00 am to 2:00 pm. Staff may leave by 2:15 pm.</li>
    </ul>
  </li>
  <li><strong>Cell Phone Policy:</strong> Junior Counselors may not use a personal phone during camp. Radios provided for regular communication.</li>
  <li><strong>Timeliness:</strong> Staff are expected to attend every single day of camp on time. In case of illness or unavoidable delay, please notify the Directors ASAP.</li>
</ul>

<h3>Pre-Season Preparation</h3>
<ul>
  <li><strong>In-Person Sessions:</strong> Will occur on the Friday and Sunday before camp starts. Specific times will be communicated.</li>
  <li><strong>Online Training:</strong> Mandatory online webinars and training will be scheduled. All online training must be completed at least two weeks prior to camp.</li>
</ul>

<h2>Responsibilities</h2>
<ol>
  <li>Assist counselor throughout the day: lineup, davening &amp; learning class, lunch, transition time, and all other activities and trips.</li>
  <li>There are often campers in a bunk that require more individualized attention or assistance. You can offer that extra help while the counselor moves on with the rest of the bunk.</li>
  <li>Always ask for help when unsure of how to proceed or if the health or safety of a camper or staff member is in question.</li>
  <li>Make sure to smile and use positive word choice and encouragement throughout the day. Leave all "disciplinary action" to the discretion of the counselor.</li>
  <li>Always follow the counselor's lead. When a counselor or head counselor is asking for quiet, immediately place your finger over your lips and point towards the person speaking so that your campers will follow suit. Your assistance in getting quiet is one of the biggest helps in moving through the amazing CGI schedule!</li>
  <li>Be a role model to campers and set a good example and follow general camp procedures and practices including sanitation, schedule, and sportsmanship.</li>
  <li>Communication:
    <ol>
      <li>Stay with the bunk you are assigned to. If you need a break, make sure it's ok with the staff member in charge. If you feel like you are not doing enough, ask our Head Counselor, "I'm wondering what else I can do to help?"</li>
      <li>If you have an issue, speak to a Head Counselor. They are here to make you comfortable and assist with anything you may be wondering about. If you need more assistance, speak to the Directors. The only stupid question is the one not asked, so please ask us before a small inconvenience becomes a big problem.</li>
    </ol>
  </li>
  <li>Other Duties:
    <ol>
      <li>Participation in extracurricular activities, including, but not limited to, Family BBQ, and other special activities.</li>
      <li>Greet campers and parents (and staff!) with a smile at pick up and drop off!</li>
    </ol>
  </li>
</ol>

<h2>Dress Code</h2>
<p>Standards of Tznius for our staff include but are not limited to:</p>
<ul>
  <li>A) All staff must wear skirts which cover the knees at all times with no slits at all.</li>
  <li>B) Leg coverings which are no shorter than knee socks.</li>
  <li>C) Sleeves which cover the elbows at all times.</li>
  <li>D) Necklines covered at all times.</li>
</ul>
<p>This is very important to us and not "negotiable".</p>

<h2>Professional Development</h2>
<ol>
  <li>Participate in counselor webinars and in-person training. Details will follow closer to the summer.</li>
  <li>Be present at the staff meeting &amp; camp set up which will take place the Sunday before camp.</li>
</ol>

<h2>Compensation</h2>
<ol>
  <li>Your stipend and payment schedule are detailed in your signed contract.</li>
  <li>To show our undying appreciation to our staff, we occasionally sponsor after camp counselor outings and trips.</li>
</ol>

<p>We wish you Hatzlacha Rabba and look forward to being actively involved and working together with you. Please feel free to ask any questions or discuss any issues with the camp office, should you feel necessary.</p>
<p>To learn more about our camp program or to complete an application form, visit our website: <strong>www.ganisrael.org</strong></p>`,

  "boys-head-counselor": `<h1>Head Counselor – Boys Division</h1>
<p><strong>Camp Gan Israel of Morristown, NJ – Summer 2026</strong></p>
<p><strong>Job Title:</strong> Head Counselor – Boys Division<br>
<strong>Reports To:</strong> Camp Director<br>
<strong>Works Closely With:</strong> Assistant Director</p>

<h2>Welcome / Mission</h2>
<p>Thank you for your interest in spending your summer with us at Camp Gan Israel of Morristown, NJ.</p>
<p>Our mission is to provide a safe, fun, and uplifting summer day camp experience for Jewish children — a place where love for Judaism is taught through joy, warmth, fun, and a true love for every camper, staff member, and family.</p>
<p>This role is a major part of making that kind of summer happen in practice.</p>
<p>A Head Counselor is not just a "senior counselor." You are a mini-director of counselors — responsible for the daily success of the division through leadership, energy, and organization. Your job is to help camp feel strong, clear, and exciting from the inside.</p>

<h2>1) Head Counselor Role Summary: What You Own</h2>
<p>Your job has three pillars, and when they are working well the whole division feels clearer, stronger, and more alive:</p>
<h3>A. Leadership – Empowering and Supporting Counselors</h3>
<ul>
  <li>You are the <strong>primary day-to-day supervisor of counselors</strong> in your division.</li>
  <li>Your job is to help counselors succeed: set expectations, coach, motivate, correct, and guide.</li>
  <li>You lead by example — professionalism, warmth, consistency, mentchlichkeit.</li>
</ul>
<h3>B. Energy – Creating the CGI Vibe</h3>
<ul>
  <li><strong>Energy is everything. From the moment campers arrive until they leave, they should feel CGI energy.</strong></li>
  <li>You set the tone in: lineup, transitions, lunch, trips, sports, bus games, and general camp spirit.</li>
  <li>Your job is to create leaders, not perform alone — empower counselors to bring the vibe too, so the boys feel that camp energy all day.</li>
</ul>
<h3>C. Organization – Making Camp Run Smoothly</h3>
<ul>
  <li>You make sure the day runs on time and activities are prepared properly.</li>
  <li>You ensure counselors know what's happening next and what they're responsible for.</li>
  <li>You prevent chaos by planning ahead.</li>
</ul>

<h2>2) Dates, Hours, and Core Expectations (Summer 2026)</h2>
<h3>Camp Dates &amp; Hours</h3>
<ul>
  <li><strong>Camp Dates:</strong> Monday, <strong>June 29</strong> – Friday, <strong>August 14</strong>, 2026</li>
  <li><strong>Camp Closed:</strong> Friday, <strong>July 3</strong>, 2026</li>
  <li><strong>Hours:</strong>
    <ul>
      <li><strong>Mon–Thu:</strong> 8:30 AM – 4:00 PM</li>
      <li><strong>Fri:</strong> 8:30 AM – 2:30 PM</li>
    </ul>
  </li>
</ul>
<h3>Attendance &amp; Timeliness</h3>
<ul>
  <li>Head Counselors must be present, on time, and fully engaged every day.</li>
  <li>If sick or delayed, notify leadership ASAP so coverage can be arranged.</li>
</ul>
<h3>Cell Phones &amp; Radios</h3>
<ul>
  <li>Phones are for emergencies only.</li>
  <li><strong>No phones during activities</strong> (especially swimming/water play).</li>
  <li>Radios are used for regular camp communication.</li>
</ul>

<h2>3) Pre-Season Responsibilities &amp; Timelines (Very Important)</h2>
<p>A strong summer comes from strong preparation. These responsibilities begin as soon as you are hired and must be completed by the deadlines below. The better you prepare, the less confusion and scrambling camp will feel.</p>
<h3>A. Build your "Summer Vision" (As soon as you're hired)</h3>
<ul>
  <li>Write down the best memories you have from camp.</li>
  <li>Think about what kind of memories you want the campers to leave with this summer.</li>
  <li>This becomes your framework for how you lead energy, staff, and vibe.</li>
</ul>
<h3>B. Plan the Energy (Start immediately; refine continuously)</h3>
<p><strong>Everything in camp is ENERGY. Your job is to bring energy from the moment campers arrive until they leave, and to help counselors carry that energy with you.</strong></p>
<ul>
  <li>Prepare ideas for: songs/cheers, lineup structure, bus games, transitions, spirit moments.</li>
  <li>Empower counselors to contribute, not just watch you do it.</li>
</ul>
<h3>C. Incentive Structure (Begin early; finalize before camp)</h3>
<p>Work with leadership to develop an incentive plan that keeps boys excited, reinforces good behavior and Jewish pride, avoids unhealthy competition, and stays budget-aware:</p>
<ul>
  <li>keeps campers excited</li>
  <li>reinforces good behavior and Jewish pride</li>
  <li>avoids unhealthy competition</li>
  <li>stays budget-aware</li>
</ul>
<h3>D. Know the Schedule + Plan Activities (Begin early; ready before camp)</h3>
<ul>
  <li>The Director sets major structure (trips, swim, learning, shows, etc.).</li>
  <li>Your job is to strengthen the schedule with activities, sports, energy, and execution plans.</li>
  <li>New creative ideas are encouraged and welcomed.</li>
</ul>
<h3>E. Master Supply List (Due at least 3 weeks before camp begins)</h3>
<p>Prepare a master list of supplies you will need for:</p>
<ul>
  <li>your planned activities and sports</li>
  <li>prizes/incentives you recommend</li>
  <li>division-level needs<br>Include links when possible (Amazon/Walmart/etc.).</li>
</ul>
<h3>F. Staff Connection Before Camp (Begin once you have counselor list)</h3>
<ul>
  <li>Introduce yourself to your counselors before camp.</li>
  <li>Start building trust, tone, and expectations.</li>
  <li>The Director will provide contact information.</li>
</ul>
<h3>G. Trainings, Meetings, and Setup (Mandatory)</h3>
<ul>
  <li>Attend all required training sessions and meetings (virtual and/or in-person).</li>
  <li>Complete all online webinars and required follow-up assessments <strong>at least 2 weeks before camp</strong>.</li>
  <li>Be present for pre-camp setup/orientation in the week before camp (schedule provided).</li>
</ul>
<h3>H. Present Your Summer Plan (Due before camp begins)</h3>
<ul>
  <li>Present your plan to the Director (and leadership team as requested), including:
    <ul>
      <li>energy plan</li>
      <li>key activity plans</li>
      <li>supply needs</li>
      <li>execution strategy</li>
    </ul>
  </li>
</ul>

<h2>4) Chain of Command (This Prevents Overlap)</h2>
<p>To keep camp running smoothly, we follow a clear structure:</p>
<h3>Head Counselor (You)</h3>
<ul>
  <li>You are the <strong>main leader of counselors and the day's flow</strong> in the Boys Division.</li>
  <li>Counselors should experience you as their primary supervisor.</li>
  <li>Leadership disagreements should never be expressed in front of staff or campers. Differences should be discussed privately and resolved through proper channels.</li>
</ul>
<h3>Assistant Director – Boys Division</h3>
<ul>
  <li>The Assistant Director is on-site leadership, supports you, and helps ensure camp runs smoothly. He is there to guide, back you up, and help camp stay strong.</li>
  <li>He is the "eyes and ears" of camp and the brains behind smooth operations, staff welfare, and larger issues. Open communication with him makes the division better.</li>
  <li>He also handles routine staff conflicts when needed, particularly when issues escalate beyond light coaching or require leadership-level conversation, while still leaving you the space to lead.</li>
</ul>
<h3>Camp Director</h3>
<ul>
  <li>Final authority for major decisions, serious escalations, and any unresolved disagreement.</li>
</ul>
<p><strong>If you and the Assistant Director disagree on how to handle something:</strong> bring it to the Director to decide. No power struggles in front of staff.</p>

<h2>5) Working With the Assistant Director (Practical Rules)</h2>
<h3>How direction should flow</h3>
<ul>
  <li>Whenever possible, instructions to counselors should come from the Head Counselor so structure stays clear.</li>
  <li>The Assistant Director will often see things in real time; if it is not safety, he will generally touch base with the Head Counselor to make you aware and coordinate a response. The goal is open communication and backup, not overlap.</li>
  <li>If it's a <strong>safety issue</strong>, leadership steps in immediately.</li>
</ul>
<h3>In-the-moment involvement (Assistant Director)</h3>
<ul>
  <li>The Assistant Director may give quick reminders that protect safety and professionalism (example: "Phones away at swim," "We need coverage here now").</li>
  <li>If it's not safety, the goal is: <strong>inform you, guide you, support you — not replace you.</strong></li>
</ul>

<h2>6) Staff Supervision &amp; Coaching (Who Handles What)</h2>
<h3>Light coaching (Head Counselor)</h3>
<p>You handle:</p>
<ul>
  <li>small performance corrections</li>
  <li>coaching energy</li>
  <li>transitions and timing</li>
  <li>helping a counselor run activities better</li>
  <li>basic professionalism reminders</li>
  <li>quick private corrections</li>
</ul>
<h3>Serious sit-downs (Assistant Director, with you looped in)</h3>
<p>The Assistant Director generally handles:</p>
<ul>
  <li>repeated lateness or chronic low performance</li>
  <li>attitude / morale issues that need deeper attention</li>
  <li>staff conflict that doesn't resolve</li>
  <li>repeated phone policy violations</li>
  <li>anything "bigger than the moment" that requires leadership-level conversation</li>
</ul>
<h3>Trigger list (when to bring it to Assistant Director)</h3>
<p>Bring it to the Assistant Director when you notice:</p>
<ul>
  <li>a pattern forming (not a one-off)</li>
  <li>staff conflict that isn't resolving</li>
  <li>burnout / emotional instability / social issues spilling into work</li>
  <li>repeated professionalism issues</li>
  <li>anything that needs more than on-the-spot coaching</li>
</ul>

<h2>7) Discipline &amp; Camper Behavior (3-Tier System)</h2>
<p>We use a consistent, calm discipline approach:</p>
<h3>Tier 1 – Head Counselor handles first response</h3>
<ul>
  <li>reset the camper</li>
  <li>coach the counselor</li>
  <li>small consequences inside the moment (brief break, refocus, change activity structure)</li>
  <li>keep it respectful and calm</li>
</ul>
<h3>Tier 2 – Assistant Director handles escalation</h3>
<ul>
  <li>patterns of behavior</li>
  <li>parent calls/emails during the day</li>
  <li>formal incident documentation process</li>
  <li>stronger interventions</li>
</ul>
<h3>Tier 3 – Camp Director for major consequences</h3>
<ul>
  <li>decisions like sending a camper home</li>
  <li>severe/recurring issues requiring top-level decision</li>
</ul>
<p><strong>Important: Serious issues should not be first communicated at pickup/dropoff. Parent communication for significant issues should happen during the day through leadership so families experience camp as warm, proactive, and responsibly run.</strong></p>

<h2>8) Activities, Schedule, and Daily Execution (Your Core Job)</h2>
<p>You are responsible for:</p>
<ul>
  <li>knowing the schedule clearly</li>
  <li>ensuring activities are ready <strong>before they start</strong></li>
  <li>ensuring counselors are in the right places</li>
  <li>keeping camp on time</li>
  <li>preventing dead-time and chaos</li>
</ul>
<h3>Supplies &amp; Preparation (Daily)</h3>
<ul>
  <li>Supplies for major activities should be prepared in advance (ideally the day before).</li>
  <li>Keep a running list of supplies needed and communicate early so ordering is on time.</li>
</ul>
<h3>When something is failing mid-activity</h3>
<ul>
  <li><strong>You own the moment</strong> — fix it, pivot, restructure it, and keep camp moving.</li>
  <li>The Assistant Director supports with ideas and backup.</li>
  <li>End-of-day: quick debrief to improve for tomorrow (no blaming).</li>
</ul>
<h3>Lineup</h3>
<ul>
  <li>Lineup energy and structure are <strong>your area</strong>.</li>
  <li>Make lineup exciting, organized, and uplifting.</li>
</ul>

<h2>9) Drop-Off &amp; Pick-Up Presence (Leadership Visibility)</h2>
<p>Parents should see a strong, present leadership team and get the feeling that camp is warm, organized, and in control.</p>
<ul>
  <li>Head Counselors, Assistant Director, and Director should all be visible when possible.</li>
  <li>Your job at drop-off/pick-up:
    <ul>
      <li>greet warmly</li>
      <li>help set tone for the day</li>
      <li>assist with quick practical needs</li>
      <li>model professionalism and excitement</li>
    </ul>
  </li>
</ul>
<p><strong>Parent communication split:</strong></p>
<ul>
  <li><strong>Head Counselor: quick, friendly in-person touchpoints + positives, while more serious matters get handled through leadership during the day.</strong></li>
  <li><strong>Assistant Director:</strong> emails/phone calls during the day + serious matters + official follow-ups.</li>
</ul>

<h2>10) Attendance, Reporting, and UltraCamp Flow</h2>
<h3>Attendance &amp; morning structure (Head Counselor)</h3>
<ul>
  <li>Ensure bunk attendance is collected each morning and communicated properly.</li>
  <li>Ensure counselors understand coverage needs for the day.</li>
</ul>
<h3>Incident reporting / logging (Assistant Director)</h3>
<ul>
  <li>Counselors fill out incident forms as needed.</li>
  <li>Assistant Director decides what is formally logged and ensures it's uploaded appropriately.</li>
</ul>

<h2>11) Trips (Clear Division of Responsibility)</h2>
<p>Trips succeed when roles are divided clearly.</p>
<h3>Head Counselor owns: staffing + campers + flow</h3>
<p>You are responsible for:</p>
<ul>
  <li>staffing coverage</li>
  <li>camper flow and behavior</li>
  <li>timing, bathrooms, shirts, first aid, water</li>
  <li>getting everyone to the bus on time</li>
  <li>headcounts with your staff</li>
  <li>transitions before/after the trip</li>
</ul>
<h3>Assistant Director owns: waivers + vendor coordination + payments</h3>
<p>Assistant Director handles:</p>
<ul>
  <li>waivers collection / verification</li>
  <li>vendor confirmations and coordination</li>
  <li>payments and logistics with venues</li>
</ul>
<p>You and the Assistant Director stay in close touch (example: "Bus in 5 minutes — bring the boys down now.")</p>

<h2>12) Safety, Respect, and Facility Care</h2>
<p>You are responsible to ensure your division models respect in three areas: safety, camp property, and human interactions.</p>
<ul>
  <li>follows all safety protocols</li>
  <li>treats the facility respectfully and leaves spaces the right way</li>
  <li>returns supplies properly and does not treat camp property carelessly</li>
  <li>keeps areas clean as the day moves along</li>
  <li>never leaves campers unsupervised</li>
</ul>
<p>At no point may campers be left unsupervised. If staffing becomes thin, leadership must be notified immediately.</p>
<p>Correct any staff behavior that puts campers at risk immediately (privately when possible). Safety always overrides hierarchy, and the way we speak to people should reflect mentchlichkeit and Kiddush Hashem.</p>

<h2>13) Organization &amp; Communication (Daily Leadership)</h2>
<ul>
  <li>Visit bunks regularly during the day both to supervise and to build relationships with campers and staff.</li>
  <li>Monitor counselor and camper assignments for the day.</li>
  <li>Report preventable mishaps and incidents so camp improves.</li>
  <li>Document disciplinary issues and actions taken, and ensure they reach leadership appropriately.</li>
  <li>Take an active role in leadership meetings as scheduled.</li>
  <li>Keep open communication with leadership.</li>
</ul>

<h2>14) After-Camp / Off-Hours Staff Life (Clear Split)</h2>
<p>We want staff to have a healthy, positive off-hours culture that supports camp success.</p>
<h3>Head Counselor = Culture Leader (final say on plans)</h3>
<ul>
  <li>You have final say on weekday-night plans (within reason), and should use that role to build healthy, inclusive, upbeat staff culture.</li>
  <li>You set the tone for healthy staff culture, mentchlichkeit, and staff buy-in.</li>
  <li>You lead the Torah learning vibe:
    <ul>
      <li>encourage consistency</li>
      <li>recruit someone to give a short shiur when possible</li>
      <li>help counselors buy in</li>
    </ul>
  </li>
</ul>
<h3>Assistant Director = Logistics + Welfare</h3>
<ul>
  <li>Assistant Director communicates budget, transportation limits, and camp-arranged details, including when camp is covering an Uber or other practical needs.</li>
  <li>Assistant Director helps with logistics and steps in for bigger morale/social issues.</li>
</ul>
<h3>Unhealthy social situation guideline</h3>
<ul>
  <li>Small concern → Head Counselor addresses first.</li>
  <li>If it grows / becomes bigger → bring it to Assistant Director.</li>
</ul>

<h2>15) Communication and "Open Door" Without Undermining Leadership</h2>
<p>We want staff to feel comfortable speaking to leadership — including the Director — while still keeping structure intact.</p>
<ul>
  <li>Staff may speak to the Director or Assistant Director.</li>
  <li>Leadership may respond with:
    <ul>
      <li>"Have you spoken to your Head Counselor yet? Please do, and keep us in the loop."</li>
    </ul>
  </li>
  <li>This maintains trust and keeps a healthy chain of command.</li>
</ul>

<h2>16) Dress Code and Professional Standards</h2>
<p>Head Counselors are held to a higher role-model standard because campers and counselors notice what you do more than what you say.</p>
<ul>
  <li>Davening/learning: button-down shirt (tie optional if worn).</li>
  <li>Activities: modest camp-appropriate clothing.</li>
  <li>No inappropriate graphics or tight clothing.</li>
  <li>Haircuts in line with yeshiva standards.</li>
  <li>If unsure — ask. Standards are here to protect the tone of camp, not to create interference.</li>
</ul>

<h2>17) Qualifications &amp; Physical Requirements</h2>
<p>Minimum requirements include:</p>
<ul>
  <li>prior camp experience</li>
  <li>leadership ability</li>
  <li>strong communication</li>
  <li>safety awareness / risk management</li>
  <li>ability to supervise children actively all day</li>
  <li>ability to assist in emergencies and maintain constant supervision of campers</li>
</ul>

<h2>18) After-Camp Daily Expectations (During the Summer)</h2>
<ul>
  <li>Prep for tomorrow should be done today (especially Fridays), so the next day starts calm and ready.</li>
  <li>Keep supplies, planning, and any trip or activity needs organized so camp runs smoothly.</li>
  <li>If last-minute supplies are needed, follow the camp process for communication and reimbursement; sometimes a practical run may still be necessary.</li>
</ul>
<h3>Transportation (Out-of-Town Head Counselors)</h3>
<p>If the Head Counselor has a valid license and camp vehicle access, he may be placed on insurance to help with transportation. Otherwise, camp may provide rideshare options and logs as needed, especially for out-of-town transportation needs.</p>

<h2>19) Professional Development</h2>
<ul>
  <li>Complete the Head Counselor application form (if required).</li>
  <li>Participate in a post-hire meeting that goes through expectations for the role.</li>
  <li>Complete all online training/webinars and any required follow-up assessments by the deadlines provided (at least 2 weeks before camp), and read through Super Staff Supervision before camp; if appropriate, ask whether there is an incentive for completing it.</li>
  <li>Be present at all required in-person staff meetings and trainings (including pre-camp setup days as scheduled).</li>
</ul>

<h2>20) General Requirements</h2>
<ul>
  <li><strong>Read and adhere</strong> to the policies and procedures outlined in the <strong>CGI Staff Handbook</strong> (provided).</li>
  <li>Formal training calls and/or meetings will take place before camp to review these procedures in greater detail.</li>
  <li>Uphold all camp policies and procedures consistently, including safety, supervision, discipline process, professionalism, and appropriate staff-camper interactions, while modeling mentchlichkeit and a Kiddush Hashem in how you speak, lead, and respond.</li>
  <li>Maintain clear and open communication with the Director and Assistant Director. If something doesn't feel aligned with the stated goals of camp, bring it up — we want feedback and will work hard to resolve issues.</li>
</ul>

<h2>21) Other Duties / Flexibility</h2>
<ul>
  <li>Participate in extracurricular activities when applicable (family events, special programs, staff initiatives).</li>
  <li>Be flexible when camp needs additional assistance, with a good attitude and willingness to help.</li>
  <li>Other duties may be assigned as necessary to support the success of the camp day and the Boys Division.</li>
</ul>

<h2>22) Compensation</h2>
<ul>
  <li><strong>REMUNERATION:</strong> Compensation is as agreed upon in the contract.</li>
  <li>Payment timing and method will be specified in the Summer 2026 contract provided to you.</li>
  <li>To show our appreciation, camp may occasionally sponsor after-camp counselor outings and treats (as applicable).</li>
</ul>

<h2>Closing</h2>
<p>We wish you <strong>Hatzlocha Rabba</strong> and look forward to working together.</p>
<p>Remember, our goal is to make sure everyone — <strong>campers and staff</strong> — has a positive, safe, meaningful, and exciting summer experience. If at any time you feel something in this job description is not lining up with that goal, please let us know. We love feedback and will work hard to resolve issues.</p>
<p>Please feel free to reach out with questions or concerns as needed.</p>
<p>To learn more about our camp program or to complete an application form, visit our website: <strong>www.ganisrael.org</strong></p>`,

  "girls-head-counselor": `<h1>Head Counselor – Girls Division</h1>
<p>Camp Gan Israel of Morristown, NJ – Summer 2026</p>
<p><strong>Job Title:</strong> Head Counselor – Girls Division<br>
<strong>Reports To:</strong> Camp Director<br>
<strong>Works Closely With:</strong> Assistant Director</p>

<h2>Welcome / Mission</h2>
<p>Thank you for your interest in joining the Camp Gan Israel team and for the commitment this role takes.</p>
<p>Our mission is to create a camp that is safe, upbeat, organized, and full of Jewish pride — a place where love for Yiddishkeit is taught through fun, joy, warmth, and genuine care, where campers feel cared for, staff feel supported, and the division runs with structure, clarity, and energy.</p>
<p>A Head Counselor is not just a "senior counselor." You are the day-to-day leader of your division — responsible for the tone, the staff, and the success of the camp day. More than keeping order, your job is to help camp feel clear, alive, and well-led.</p>

<h2>1) Head Counselor Role Summary: What You Own</h2>
<p>At a high level, your job is to make sure your division feels strong, structured, and alive — not just on paper, but in real time. That means leading people, not just managing tasks, so campers and staff feel the difference all day.</p>
<p>Your role breaks down into three core areas:</p>
<h3>A. Leadership – Running the Counselor Team</h3>
<p>You are responsible for your counselors. They should feel guided, supported, and clear on expectations at all times, with as little confusion as possible.</p>
<ul>
  <li>You are the primary day-to-day supervisor of counselors</li>
  <li>You set expectations, coach, motivate, correct, and guide</li>
  <li>You address issues early so they don't grow</li>
  <li>Counselors should experience you as their main leader</li>
</ul>
<h3>B. Energy – Creating the Division Tone</h3>
<p>Camp energy is not automatic — it is built intentionally. From the moment campers arrive until they leave, the division should feel like CGI: upbeat, alive, warm, and organized.</p>
<ul>
  <li>You set the tone for lineup, transitions, lunch, trips, and overall vibe</li>
  <li>You build energy through the staff — not by doing everything yourself</li>
  <li>You balance warmth and positivity with structure and expectations</li>
</ul>
<h3>C. Organization – Making Camp Run Smoothly</h3>
<p>Your job is to make sure the day actually runs the way it's supposed to — not just on paper, but in real time. You're always thinking one step ahead.</p>
<ul>
  <li>You ensure the day runs on time and activities are prepared</li>
  <li>You make sure counselors know what's happening next</li>
  <li>You prevent confusion, downtime, and last-minute scrambling</li>
</ul>

<h2>2) Dates, Hours, and Core Expectations (Summer 2026)</h2>
<p>This role requires consistency, reliability, and strong daily presence. The success of the division depends on you showing up fully every day.</p>
<h3>Camp Dates &amp; Hours</h3>
<ul>
  <li>Camp Dates: June 29 – August 14, 2026</li>
  <li>Required Arrival: <strong>out-of-town</strong> staff arrive <strong>Thursday, June 25</strong>; <strong>in-town</strong> staff come for staff training (<strong>Friday, June 26</strong> and Sunday, June 28)</li>
  <li>Hours:
    <ul>
      <li>Mon–Thu: 8:30 AM – 4:00 PM</li>
      <li>Fri: 8:30 AM – 2:30 PM</li>
    </ul>
  </li>
</ul>
<h3>Attendance &amp; Timeliness</h3>
<ul>
  <li>You are expected to be present, on time, and fully engaged every day</li>
  <li>If something comes up, leadership should know as early as possible</li>
</ul>
<h3>Cell Phones &amp; Radios</h3>
<ul>
  <li>Phones are for emergencies only.</li>
  <li>No phones during activities (especially swimming/water play).</li>
  <li>Radios are used for regular camp communication.</li>
</ul>
<h3>Leadership Presence</h3>
<p>Camp doesn't run from one location — it runs from your awareness and presence.</p>
<ul>
  <li>You should be consistently visible throughout the division</li>
  <li>Your presence should be felt during lineup, transitions, lunch, and dismissal</li>
</ul>

<h2>3) Pre-Season Responsibilities &amp; Timelines (Very Important)</h2>
<p>A strong summer doesn't happen by accident. It comes from clear thinking, strong systems, and early preparation before camp begins.</p>
<h3>A. Build Your Summer Vision</h3>
<p>Before camp starts, you should have a clear picture of what your division will feel like — for campers, counselors, and parents.</p>
<ul>
  <li>Define tone, structure, routines, and expectations</li>
  <li>Think through how you want campers and staff to experience the day</li>
</ul>
<h3>B. Plan Energy &amp; Systems</h3>
<p>Energy and structure need to be built into the system — not improvised every day or left to chance.</p>
<ul>
  <li>Prepare lineup structure, songs, transitions, routines, and the overall feel from arrival through dismissal</li>
  <li>Develop incentive systems that are motivating, positive, and healthy — reinforcing good behavior, mentchlichkeit, and Jewish pride without over-relying on competition</li>
</ul>
<h3>C. Know the Schedule + Plan Activities</h3>
<p>You can't lead the day if you don't fully understand it.</p>
<ul>
  <li>Learn the schedule thoroughly</li>
  <li>Prepare activity ideas early</li>
  <li>Make sure counselors understand what strong preparation looks like</li>
</ul>
<h3>D. Master Supply List</h3>
<p>Strong logistics make everything else easier, and respect for camp property starts with leadership.</p>
<ul>
  <li>Build a full list of supplies for activities, incentives, and division needs</li>
  <li>Coordinate with leadership so everything is ready before camp begins</li>
</ul>
<h3>E. Staff Connection Before Camp</h3>
<p>Leadership starts before day one.</p>
<ul>
  <li>Begin building relationships with counselors early so trust, warmth, and clear expectations are in place before day one</li>
  <li>Set tone, expectations, and communication standards</li>
</ul>
<h3>F. Trainings &amp; Setup</h3>
<ul>
  <li>Attend all required trainings and meetings, and read through Super Staff Supervision before camp; if appropriate, ask whether there is an incentive for completing it</li>
  <li>Be present for pre-camp setup</li>
  <li>Be familiar with policies, systems, and camper information</li>
</ul>
<h3>G. Final Preparation</h3>
<p>You should enter camp with a clear, realistic plan — not figuring things out as you go.</p>

<h2>4) Chain of Command (This Prevents Overlap)</h2>
<p>Clear structure keeps leadership strong, prevents confusion, and helps everyone know where to turn.</p>
<h3>Head Counselor (You)</h3>
<ul>
  <li>You are the main leader of counselors and daily division flow</li>
  <li>Counselors should receive direction primarily from you</li>
</ul>
<h3>Assistant Director</h3>
<ul>
  <li>Supports logistics and larger operational needs</li>
  <li>Steps in when issues go beyond in-the-moment coaching</li>
</ul>
<h3>Camp Director</h3>
<ul>
  <li>Final authority for major decisions</li>
</ul>
<p>If something becomes bigger than a one-off issue, bring in leadership early. Directors are there to guide, support, and help you succeed — not just to step in when something goes wrong.</p>

<h2>5) Working With the Assistant Director (Practical Rules)</h2>
<p>This relationship works best when roles are clear, coordinated, and respectful of each person's lane.</p>
<h3>Direction Flow</h3>
<p>To maintain structure, counselors should generally receive direction through you, since you are the primary day-to-day leader of the division.</p>
<h3>Collaboration</h3>
<ul>
  <li>You lead counselor culture, real-time coaching, and daily execution</li>
  <li>The Assistant Director supports logistics, follow-through, and backup support so your role is strengthened — not replaced</li>
</ul>
<h3>When to Loop In</h3>
<p>Good leadership means knowing when not to handle something alone and when immediate leadership backup is appropriate.</p>
<ul>
  <li>Safety concerns or urgent issues that need immediate step-in</li>
  <li>Patterns forming that should not just simmer</li>
  <li>Parent-facing, repeated, or sensitive situations</li>
  <li>Issues that go beyond quick coaching or need follow-through after the moment</li>
</ul>

<h2>6) Staff Supervision &amp; Coaching</h2>
<p>Your role is not just to manage staff — it is to actively shape, coach, and strengthen the counselor team throughout the summer.</p>
<h3>In Real Time</h3>
<ul>
  <li>Coach counselors in real time during the day</li>
  <li>Give clear, respectful feedback that helps them improve</li>
  <li>Address small issues before they become bigger problems or repeated habits</li>
</ul>
<h3>When to Escalate</h3>
<p>Bring in leadership when something becomes more than a one-off and should not be left to simmer:</p>
<ul>
  <li>Ongoing patterns or repeated weak follow-through</li>
  <li>Staff conflict or tension affecting the team</li>
  <li>Emotional or social struggles that need broader support</li>
  <li>Repeated professionalism issues or concerns beyond ordinary coaching</li>
</ul>
<h3>Big Picture</h3>
<p>A strong Head Counselor builds a stronger staff — not just a smoother day — by coaching in the moment and addressing bigger patterns early.</p>

<h2>7) Camper Support, Discipline &amp; Safety</h2>
<p>You are the first line of response when it comes to camper behavior when you are available. How you respond sets the tone for the entire division and should reflect calm leadership, mentchlichkeit, and the kind of Kiddush Hashem we want camp to represent.</p>
<ul>
  <li>Handle behavior issues with calm, respectful, and consistent leadership</li>
  <li>Coach counselors to manage situations effectively and with dignity</li>
</ul>
<h3>Escalation</h3>
<ul>
  <li>Repeated, sensitive, or parent-heavy issues → involve leadership, and do not let serious matters first come up casually at pickup. Families should experience camp as warm, proactive, and responsibly run.</li>
</ul>
<h3>Safety</h3>
<ul>
  <li>No camper is ever unsupervised, and safety concerns should be addressed immediately</li>
  <li>Maintain strong supervision standards at all times and loop matters upward when they become serious</li>
</ul>
<h3>Emergency</h3>
<ul>
  <li>Call Hatzalah / 911 first</li>
  <li>Then notify leadership</li>
</ul>

<h2>8) Activities, Schedule &amp; Daily Execution (Core Job)</h2>
<p>Your job is to make sure the day actually runs — not just that it exists on a schedule.</p>
<ul>
  <li>Know the schedule clearly</li>
  <li>Ensure activities are prepared before they begin</li>
  <li>Keep camp moving and on time</li>
  <li>Prevent downtime and confusion</li>
</ul>
<h3>When Something Isn't Working</h3>
<p>Strong leadership shows up in these moments.</p>
<ul>
  <li>Step in immediately</li>
  <li>Adjust, fix, or redirect</li>
  <li>Keep the energy and flow moving</li>
</ul>

<h2>9) Trips &amp; Special Events</h2>
<p>Trips are where structure matters most, and the lane split should stay clear.</p>
<h3>You Own</h3>
<ul>
  <li>Staffing and counselor supervision</li>
  <li>Camper flow and group management</li>
  <li>Headcounts and overall awareness</li>
  <li>Division tone, energy, and how the day feels for campers</li>
</ul>
<h3>Before Trips</h3>
<ul>
  <li>Make sure everything on the counselor/camper side is prepared ahead of time, while staying aligned with the Assistant Director on waivers, vendors, and outside logistics</li>
</ul>
<h3>During Trips</h3>
<ul>
  <li>Stay organized, flexible, and aware while keeping ownership of campers, staffing, and flow as the Assistant Director handles outside logistics and practical coordination</li>
</ul>

<h2>10) Logistics, Supplies &amp; Organization</h2>
<p>Behind every strong day is strong preparation, organization, and respect for camp resources.</p>
<ul>
  <li>Maintain systems so your division is ready</li>
  <li>Catch issues early before they affect the day, the facility, or how people treat one another</li>
  <li>Hold counselors accountable for setup and cleanup</li>
</ul>

<h2>11) Leadership Presence (Arrival, Lunch, Dismissal)</h2>
<p>These are key moments where leadership is most visible, and they strongly shape how families experience camp.</p>
<ul>
  <li>Be present at drop-off and pickup so parents and campers feel leadership is visible and engaged</li>
  <li>Keep transitions calm, organized, and upbeat — including lunch flow and dismissal</li>
  <li>Model professionalism with parents, knowing those moments help define the feeling of camp</li>
</ul>

<h2>12) Communication, Systems &amp; Media</h2>
<p>Strong communication prevents problems before they happen.</p>
<ul>
  <li>Keep leadership informed</li>
  <li>Use camp systems responsibly</li>
  <li>Make sure important information is shared</li>
</ul>

<h2>13) General Outlook &amp; Success Metrics</h2>
<p>Success is not one thing — it is the overall feel of the division and the standards that campers absorb from it.</p>
<ul>
  <li>Camp feels warm, upbeat, structured, and full of mentchlichkeit</li>
  <li>Campers are engaged and happy</li>
  <li>Staff are growing and supported</li>
</ul>

<h2>14) Routines &amp; Daily Presence</h2>
<p>Your awareness throughout the day is what keeps everything running smoothly.</p>
<ul>
  <li>Stay present and involved</li>
  <li>Watch for weak spots early</li>
  <li>Step in before issues grow</li>
</ul>

<h2>15) Suggested Daily Rhythm (Guide)</h2>
<p>This is a framework — not a rigid schedule.</p>
<ul>
  <li>Morning: Prep, staff check-in, set tone</li>
  <li>Midday: Activities, supervision, coaching</li>
  <li>Afternoon: Maintain energy and flow</li>
  <li>End of day: Cleanup, preparation, dismissal</li>
</ul>

<h2>16) Dress Code &amp; Standards</h2>
<p>As a visible leader in camp, you are expected to model the standards of the division clearly and consistently. Because campers and counselors watch you more closely, your example carries extra weight. This includes both professionalism and tznius standards.</p>
<ul>
  <li>Skirts must cover the knees at all times and may not have slits</li>
  <li>Leg coverings should be no shorter than knee socks</li>
  <li>Sleeves must cover the elbows at all times</li>
  <li>Necklines must remain covered at all times</li>
</ul>
<p>These standards are important to us and are not negotiable. The goal is not to interfere — it is to protect the tone, values, and role-model standard of camp.</p>

<h2>17) Pre-Camp Meetings &amp; Discussion Items</h2>
<p>Before the summer begins, the Head Counselor should meet with leadership to clarify expectations, responsibilities, and how the division will run in practice.</p>
<p>Topics may include:</p>
<ul>
  <li>Division vision, lineup tone, and counselor culture</li>
  <li>Discipline structure and escalation guidelines</li>
  <li>Schedule, trips, activities, and division routines</li>
  <li>Supply requests, printing, incentives, and practical needs</li>
  <li>Chain of command between Director, Assistant Director, and Head Counselor</li>
  <li>Counselor standards around supervision, phone use, preparedness, and professionalism</li>
  <li>After-hours expectations and leadership boundaries</li>
  <li>Post-summer wrap-up, evaluations, and recommendations for next year</li>
</ul>

<h2>18) Terms &amp; Logistics</h2>
<p>The practical details of this role should be clear before the summer begins.</p>
<ul>
  <li>Compensation: As agreed upon in the contract</li>
  <li>Payment Method: Check, issued via 1099 unless otherwise specified in your contract</li>
  <li>Housing Benefits: Provided by camp for eligible out-of-town staff</li>
  <li>Transportation: May be provided as needed; all rides must be coordinated and logged</li>
  <li>Food: Meals are provided by the camp</li>
  <li>Shabbos: You are not required to stay in camp for Shabbos</li>
  <li>Administrative Support: Assist when possible, help prepare the next day before camp ends, and communicate meaningful changes to leadership</li>
  <li>Errands: You may occasionally assist with practical camp needs, including last-minute supply runs when relevant</li>
</ul>

<h2>19) Physical Requirements</h2>
<p>This is a highly active role and requires constant movement, awareness, and stamina throughout the camp day.</p>
<ul>
  <li>Walk and stand for extended periods</li>
  <li>Participate in camp activities as needed</li>
  <li>Lift and carry supplies when required</li>
  <li>Respond quickly to emergencies</li>
</ul>

<h2>20) Post-Summer Wrap-Up &amp; Evaluation</h2>
<p>At the end of the summer, the Head Counselor still plays an important leadership role, especially in helping camp close out in an organized way.</p>
<ul>
  <li>Organize and store supplies properly so usable materials are easy to find and use again</li>
  <li>Share feedback on what worked, what created confusion, and what should be strengthened</li>
  <li>Provide input on staff performance, growth, and recommendations moving forward</li>
</ul>

<h2>21) After-Camp / Off-Hours Staff Life</h2>
<p>For the Girls Division Head Counselor, after-camp time still matters because it influences staff culture, morale, and how prepared the division feels the next morning.</p>
<h3>Role Summary</h3>
<p>You are the primary culture leader for the division after hours. Help create a positive, inclusive, healthy staff environment, set a tone that supports the next day, and do not leave tomorrow's needs for tomorrow when they can be handled earlier.</p>
<h3>Key Functions</h3>
<ol>
  <li>Build a healthy, positive, and inclusive staff culture</li>
  <li>Support after-camp plans and staff connection in a way that keeps the environment upbeat and appropriate</li>
  <li>Notice when staff need support or when bigger dynamics are developing, and address them rather than ignoring them</li>
  <li>Maintain professionalism, positivity, and healthy boundaries</li>
  <li>Communicate larger concerns to leadership when needed, especially when after-hours dynamics could affect the next day</li>
</ol>

<h2>Closing</h2>
<p>We wish you <strong>Hatzlocha Rabba</strong> and look forward to working together.</p>
<p>Remember, our goal is to make sure everyone — <strong>campers and staff</strong> — has a positive, safe, meaningful, and exciting summer experience. If at any time you feel something in this job description is not lining up with that goal, please let us know. We love feedback and will work hard to resolve issues.</p>
<p>Please feel free to reach out with questions or concerns as needed.</p>
<p>To learn more about our camp program or to complete an application form, visit our website: <strong>www.ganisrael.org</strong></p>`,

  "kiddie-lead-teacher": `<p><strong>Job Title:</strong> Counselor</p>
<p><strong>Reports to:</strong> Kiddie Camp Director</p>

<h2>Thank You &amp; Camp Mission</h2>
<p>Thank you for your interest in spending your summer with us here at <strong>Gan Israel Day Camps Morristown, NJ</strong>. It is because of your dedication and commitment that, IYH, this summer will be a smashing success.</p>
<p>Our camp mission is to provide a <strong>safe, fun, and uplifting</strong> summer day camp experience for Jewish children—a place where <strong>love for Judaism</strong> is taught through <strong>fun, joy,</strong> and a true love for every staff member, camper, and each member of their families.</p>
<p>In order to eliminate as much uncertainty and confusion as possible, below we have outlined some of the <strong>basic responsibilities</strong> of a counselor in CGI.</p>

<h2>Counselor Role Summary</h2>
<ol>
  <li><strong>Leadership in Bunk Management and Activities</strong><br>As the <strong>primary leader</strong>, you will be responsible for running your bunk efficiently throughout the day. This includes setting a <strong>positive example</strong>, leading activities, and being the <strong>role model</strong> the campers look up to. <strong>Your leadership is key in ensuring a smooth and engaging day-to-day camp experience.</strong></li>
  <li><strong>Camper Wellbeing</strong><br>In this pivotal role, you are the <strong>primary guardian</strong> of the campers' spiritual, physical, and emotional wellbeing. Your responsibilities involve actively ensuring their safety, comfort, and overall health. This includes being vigilant about their needs and creating a nurturing environment for all campers.</li>
  <li><strong>Inspiration</strong><br>Beyond supervision, your role is to <strong>inspire</strong>. This involves fostering a <strong>positive and energetic</strong> atmosphere, encouraging campers to engage deeply in camp activities and to grow personally. Your goal is to ensure that every camper leaves with memorable experiences and life lessons from their time at camp.</li>
</ol>

<h2>Dates &amp; Hours</h2>
<ul>
  <li><strong>Camp Dates</strong>: Monday, <strong>June 29</strong> – Friday, <strong>August 14, 2026</strong></li>
  <li><strong>Staff Training</strong>: Takes place on <strong>June 26,</strong> 2026, for camp preparation and orientation</li>
  <li><strong>Daily Schedule</strong>:
    <ul>
      <li><strong>Mondays to Thursdays</strong>: Camp hours are 9:00 AM to 3:30 PM. Staff must arrive by <strong>8:45 AM</strong> and may leave by <strong>3:45 PM</strong>.</li>
      <li><strong>Fridays</strong>: Camp hours are 9:00 AM to 2:00 PM. Staff may leave by <strong>2:15 PM</strong>.</li>
    </ul>
  </li>
  <li><strong>Cell Phone Policy</strong>: Use is limited to <strong>emergency calls</strong> only. Radios will be provided for regular communication.</li>
  <li><strong>Timeliness</strong>: Staff are expected to attend <strong>every single day</strong> of camp <strong>on time</strong>. In case of illness or unavoidable delay, please notify the Directors as soon as possible.</li>
</ul>

<h2>Pre-Season Preparation</h2>
<ul>
  <li><strong>In-Person Sessions</strong>: Will occur on the Friday before camp starts. Specific times will be communicated.</li>
  <li><strong>Online Training</strong>: Mandatory online webinars and training will be scheduled. All online training <strong>must be completed</strong> at least two weeks prior to camp.</li>
</ul>

<h2>Responsibilities for Kiddie Camp Counselor</h2>
<ol>
  <li><strong>Ensure that campers are kept safe both physically and emotionally.</strong>
    <ol>
      <li>Provide proper supervision of every camper at all times.</li>
      <li>Be aware of and implement all safety guidelines.</li>
      <li>Be proactive in identifying and responding to safety hazards.</li>
      <li>Follow safety and security protocols when campers are in public while presenting a positive image of the camp.</li>
      <li>Apply basic and appropriate "disciplinary" action when necessary.</li>
      <li>Recognize and reward campers for individual and team achievements</li>
    </ol>
  </li>
  <li><strong>Running age-appropriate Davening and Learning.</strong>
    <ol>
      <li>Run circle time daily, which includes Davening and a mix of Jewish stories, Parsha, and special dates on the calendar. (Davening could be in the morning and learning in the afternoon, depending on the day's schedule.) We will provide curriculum resources upon request to support these sessions.</li>
      <li>Learning should be fun, interesting, and interactive. We encourage you to include small activities, stories, props, and other creative ideas to keep the kids engaged and excited to learn.</li>
    </ol>
  </li>
  <li><strong>Keep your campers stimulated and excited throughout the camp day.</strong>
    <ol>
      <li>Most of the schedule is provided to Kiddie Camp counselors; however, counselors are responsible for preparing two daily activities and ensuring they have all necessary supplies. Resources can be provided upon request.</li>
      <li>Requests for supplies should be submitted to the office at least one week in advance to ensure availability when needed.</li>
      <li>Familiarize yourself with the day's schedule before the lineup.</li>
      <li>Bring energy and enthusiasm to all camp activities and encourage your campers to participate fully.</li>
      <li>Take an active part in the songs, games, and other amusements on bus rides.</li>
      <li>When applicable, join the activities as an active participant, including those led by professional instructors.</li>
      <li>Be present and vigilant with the campers during swim times by overseeing the kids in the pool and water play area.</li>
      <li>Be prepared to improvise when necessary, in case an activity is canceled or does not proceed as planned.</li>
    </ol>
  </li>
  <li><strong>Be a role model to campers and staff in your attitude and behavior</strong>
    <ol>
      <li>Follow and uphold all safety and security rules and procedures.</li>
      <li>Set a good example and follow general camp procedures and practices including sanitation, schedule, and sportsmanship.</li>
      <li>Mentchlichkeit is of utmost importance. It is expected that counselors will be making a kiddush Hashem at all times in all areas.</li>
      <li>Guide and respect the Junior Counselors; treat and respect them as fellow staff members while providing guidance and supervision over them and their work.</li>
      <li>Instill a love of Judaism and Torah in the campers by being a good role model and by educating the campers through stories and activities.</li>
    </ol>
  </li>
  <li><strong>Respect</strong>
    <ol>
      <li><strong>Facility</strong>: Ensure that your campers respect the camp facility at all times. This includes maintaining cleanliness by not leaving garbage around, making appropriate use of school property, and ensuring the noise level within the building is kept to an appropriate volume. Ensure that campers are not left alone in any area of the facility and are only present in areas designated for camp activities.</li>
      <li><strong>Camp Property</strong>: Ensure that supplies are returned to their proper place after use. This includes sports equipment, arts &amp; crafts supplies, special activity supplies, games, etc. Additionally, ensure that all equipment is treated with care and respect.</li>
      <li><strong>Human Interactions</strong>: We trust that all counselors will respect campers, fellow staff members, and the staff members of the school's facility.</li>
    </ol>
  </li>
  <li><strong>Organization &amp; Communication</strong>
    <ol>
      <li>Take attendance promptly each morning to ensure all campers are accounted for.</li>
      <li>Collaborate with the Kiddie Camp Coordinator's plans and schedules, actively contributing to any necessary preparations.</li>
      <li>Ensure that camp activities commence and conclude on schedule, maintaining punctuality throughout the day.</li>
      <li>Clean up after your bunk activities. Make sure all supplies are returned to their appropriate places for use by other groups, and properly dispose of all garbage.</li>
      <li>By the end of each day, ensure that your bunk area and any designated spaces are tidy, with supplies organized and stored correctly, and all garbage collected in bins.</li>
      <li>Promptly report any mishaps or incidents to the Kiddie Camp Coordinator to help improve future camp operations.</li>
      <li>Record disciplinary issues and the measures taken to resolve them, submitting detailed reports to the Kiddie Camp Coordinator.</li>
      <li>Engage actively in meetings with the Kiddie Camp Coordinator and other relevant staff to stay aligned with camp goals and updates.</li>
      <li>Communicate any camper or staff concerns directly to the Kiddie Camp Coordinator promptly.</li>
      <li>For significant issues involving campers or staff, escalate the matter to the camp directors through the Kiddie Camp Coordinator.</li>
      <li>Maintain open and clear communication with the Kiddie Camp Coordinator and camp directors. We are committed to supporting you in creating a nurturing, enjoyable, and meaningful summer experience for our young campers.</li>
    </ol>
  </li>
  <li><strong>Other Duties:</strong>
    <ol>
      <li>Participate in extracurricular activities, including but not limited to family events and any other special activities.</li>
      <li>Demonstrate flexibility and a positive attitude when additional camp assistance is needed.</li>
      <li>Additional duties may be assigned as necessary.</li>
      <li>Greet campers, parents, and fellow staff members with a smile at pick-up and drop-off times!</li>
    </ol>
  </li>
  <li><strong>Dress code:</strong>
    <ol>
      <li>Our dress code, based on standards of Tznius, is essential and includes, but is not limited to, the following requirements for all staff:
        <ol>
          <li>Skirts must cover the knees at all times and should not have any slits.</li>
          <li>Sleeves must cover the elbows at all times.</li>
          <li>Necklines must be covered at all times.</li>
        </ol>
      </li>
      <li>Adherence to these dress code standards is very important to us and is not negotiable.</li>
    </ol>
  </li>
</ol>

<h2>Professional Development</h2>
<ol>
  <li>Complete our staff application form.</li>
  <li>Participate in a Post-hire meeting that will go through the basics of what to expect at our camp.</li>
  <li>Participate in the online training that will take place before camp; there will be a few webinars that you must watch and take the test on. You will be emailed the times and dates.</li>
  <li>Be present at Staff meetings which will take place on Friday before camp.</li>
  <li>Participate in setting up and preparing your classroom before camp.</li>
</ol>

<h2>General Requirements</h2>
<ol>
  <li>Read and Adhere to the policies and procedures outlined in the Staff Handbook (provided).</li>
  <li>Formal training and conference training calls will take place before camp which will review these procedures in greater detail.</li>
</ol>

<h2>Payment</h2>
<ol>
  <li>Your pay and payment schedule are detailed in your signed contract.</li>
  <li>To show our undying appreciation to our staff, we occasionally sponsor after camp counselor outings and trips.</li>
</ol>

<p>We wish you Hatzlocho Rabba and look forward to being actively involved and working together with you.</p>
<p>It's important to remember that our goal is to ensure that everyone in camp - both campers and staff - has a positive and meaningful summer experience. If you ever feel that something is not aligned with this goal, please let us know. We value feedback and will do our best to resolve any issues that may arise.</p>
<p>Please feel free to ask any questions or discuss any issues with the camp office, should you feel necessary.</p>
<p>To learn more about our camp program or to complete an application form, visit our website: <strong>www.ganisrael.org</strong></p>`,

  "kiddie-assistant": `<p><strong>Job Title:</strong> Assistant Counselor</p>
<p><strong>Reports to:</strong> Kiddie Camp Counselor and Kiddie Camp Director</p>

<h2>Thank You &amp; Camp Mission</h2>
<p>Thank you for your interest in spending your summer with us here at <strong>Gan Israel Day Camps Morristown, NJ</strong>. It is because of your dedication and commitment that, IYH, this summer will be a smashing success.</p>
<p>Our camp mission is to provide a <strong>safe, fun, and uplifting</strong> summer day camp experience for Jewish children—a place where <strong>love for Judaism</strong> is taught through <strong>fun, joy,</strong> and a true love for every staff member, camper, and each member of their families.</p>
<p>In order to eliminate as much uncertainty and confusion as possible, below we have outlined some of the basic responsibilities of an assistant counselor in CGI.</p>

<h2>Assistant Counselor Role Summary</h2>
<ol>
  <li><strong>Support in Bunk Management and Activities</strong><br>As an important support to the lead counselor, you will assist in helping your bunk run efficiently throughout the day. This includes setting a positive example, helping with activities, and supporting the lead counselor in creating a smooth and engaging day-to-day camp experience.</li>
  <li><strong>Camper Wellbeing</strong><br>In this important support role, you help ensure the campers' spiritual, physical, and emotional wellbeing together with the lead counselor. Your responsibilities include helping maintain their safety, comfort, and overall health, while contributing to a nurturing environment for all campers.</li>
  <li><strong>Inspiration</strong><br>Beyond supervision, your role is to help inspire. This involves helping foster a positive and energetic atmosphere, encouraging campers to participate in camp activities and to grow personally. Your goal is to support the lead counselor in ensuring that every camper leaves with memorable experiences and life lessons from their time at camp.</li>
</ol>

<h2>Dates &amp; Hours</h2>
<ul>
  <li><strong>Camp Dates</strong>: Monday, <strong>June 29</strong> – Friday, <strong>August 14, 2026</strong></li>
  <li><strong>Staff Training</strong>: Takes place on <strong>June 26,</strong> 2026, for camp preparation and orientation</li>
  <li><strong>Daily Schedule</strong>:
    <ul>
      <li><strong>Mondays to Thursdays</strong>: Camp hours are 9:00 AM to 3:30 PM. Staff must arrive by <strong>8:45 AM</strong> and may leave by <strong>3:45 PM</strong>.</li>
      <li><strong>Fridays</strong>: Camp hours are 9:00 AM to 2:00 PM. Staff may leave by <strong>2:15 PM</strong>.</li>
    </ul>
  </li>
  <li><strong>Cell Phone Policy</strong>: Use is limited to <strong>emergency calls</strong> only. Radios will be provided for regular communication.</li>
  <li><strong>Timeliness</strong>: Staff are expected to attend <strong>every single day</strong> of camp <strong>on time</strong>. In case of illness or unavoidable delay, please notify the Directors as soon as possible.</li>
</ul>

<h2>Pre-Season Preparation</h2>
<ul>
  <li><strong>In-Person Sessions</strong>: Will occur on the Friday before camp starts. Specific times will be communicated.</li>
  <li><strong>Online Training</strong>: Mandatory online webinars and training will be scheduled. All online training <strong>must be completed</strong> at least two weeks prior to camp.</li>
</ul>

<h2>Responsibilities for Kiddie Camp Assistant Counselor</h2>
<ol>
  <li><strong>Ensure that campers are kept safe both physically and emotionally.</strong>
    <ol>
      <li>Provide proper supervision of every camper at all times.</li>
      <li>Be aware of and implement all safety guidelines.</li>
      <li>Be proactive in identifying and responding to safety hazards.</li>
      <li>Follow safety and security protocols when campers are in public while presenting a positive image of the camp.</li>
      <li>Support the lead counselor with basic and appropriate "disciplinary" action when necessary.</li>
      <li>Recognize and reward campers for individual and team achievements</li>
    </ol>
  </li>
  <li><strong>Assist the lead counselor with age-appropriate Davening and Learning.</strong>
    <ol>
      <li>Assist the lead counselor with circle time, which includes Davening and a mix of Jewish stories, Parsha, and special dates on the calendar. (Davening could be in the morning and learning in the afternoon, depending on the day's schedule.) We will provide curriculum resources upon request to support these sessions.</li>
      <li>Learning should be fun, interesting, and interactive. We encourage you to help with small activities, stories, props, and other creative ideas to keep the kids engaged and excited to learn.</li>
    </ol>
  </li>
  <li><strong>Help keep your campers stimulated and excited throughout the camp day.</strong>
    <ol>
      <li>Most of the schedule is provided to Kiddie Camp counselors; assistant counselors should help the lead counselor prepare and run daily activities and ensure the necessary supplies are ready. Resources can be provided upon request.</li>
      <li>Requests for supplies should be submitted to the office at least one week in advance to ensure availability when needed.</li>
      <li>Familiarize yourself with the day's schedule before the lineup.</li>
      <li>Bring energy and enthusiasm to all camp activities and encourage your campers to participate fully.</li>
      <li>Take an active part in the songs, games, and other amusements on bus rides.</li>
      <li>When applicable, join the activities as an active participant, including those led by professional instructors.</li>
      <li>Be present and vigilant with the campers during swim times by overseeing the kids in the pool and water play area.</li>
      <li>Be prepared to help improvise when necessary, in case an activity is canceled or does not proceed as planned.</li>
    </ol>
  </li>
  <li><strong>Be a role model to campers and staff in your attitude and behavior</strong>
    <ol>
      <li>Follow and uphold all safety and security rules and procedures.</li>
      <li>Set a good example and follow general camp procedures and practices including sanitation, schedule, and sportsmanship.</li>
      <li>Mentchlichkeit is of utmost importance. It is expected that counselors will be making a kiddush Hashem at all times in all areas.</li>
      <li>Respect Junior Counselors and fellow staff members, and work together with them in a positive and helpful way.</li>
      <li>Instill a love of Judaism and Torah in the campers by being a good role model and by supporting the lead counselor in stories and activities.</li>
    </ol>
  </li>
  <li><strong>Respect</strong>
    <ol>
      <li><strong>Facility:</strong> Help ensure that your campers respect the camp facility at all times. This includes maintaining cleanliness by not leaving garbage around, making appropriate use of school property, and ensuring the noise level within the building is kept to an appropriate volume. Ensure that campers are not left alone in any area of the facility and are only present in areas designated for camp activities.</li>
      <li><strong>Camp Property:</strong> Help ensure that supplies are returned to their proper place after use. This includes sports equipment, arts &amp; crafts supplies, special activity supplies, games, etc. Additionally, ensure that all equipment is treated with care and respect.</li>
      <li><strong>Human Interactions</strong>: We trust that all counselors will respect campers, fellow staff members, and the staff members of the school's facility.</li>
    </ol>
  </li>
  <li><strong>Organization &amp; Communication</strong>
    <ol>
      <li>Assist with taking attendance each morning to ensure all campers are accounted for.</li>
      <li>Support the lead counselor and Kiddie Camp Director's plans and schedules, helping with preparations as necessary.</li>
      <li>Aid in maintaining a punctual schedule for camp activities, helping transitions run smoothly throughout the day.</li>
      <li>Help clean up after bunk activities. Make sure all supplies are returned to their appropriate places for use by other groups, and properly dispose of all garbage.</li>
      <li>By the end of each day, help ensure that your bunk area and any designated spaces are tidy, with supplies organized and stored correctly, and all garbage collected in bins.</li>
      <li>Promptly report any mishaps or incidents to the lead counselor and Kiddie Camp Director to help improve future camp operations.</li>
      <li>Share disciplinary issues and the measures taken with the lead counselor, who will escalate or document them as needed.</li>
      <li>Engage actively in meetings with the Kiddie Camp Director, lead counselor, and other relevant staff to stay aligned with camp goals and updates.</li>
      <li>Communicate any camper or staff concerns directly to the lead counselor and Kiddie Camp Director promptly.</li>
      <li>For significant issues involving campers or staff, escalate the matter to the camp directors through the lead counselor or Kiddie Camp Director.</li>
      <li>Maintain open and clear communication with the lead counselor, Kiddie Camp Director, and camp directors. We are committed to supporting you in creating a nurturing, enjoyable, and meaningful summer experience for our young campers.</li>
    </ol>
  </li>
  <li><strong>Other Duties:</strong>
    <ol>
      <li>Participate in extracurricular activities, including but not limited to family events and any other special activities.</li>
      <li>Demonstrate flexibility and a positive attitude when additional camp assistance is needed.</li>
      <li>Additional duties may be assigned as necessary.</li>
      <li>Greet campers, parents, and fellow staff members with a smile at pick-up and drop-off times!</li>
    </ol>
  </li>
  <li><strong>Dress code:</strong>
    <ol>
      <li>Our dress code, based on standards of Tznius, is essential and includes, but is not limited to, the following requirements for all staff:
        <ol>
          <li>Skirts must cover the knees at all times and should not have any slits.</li>
          <li>Sleeves must cover the elbows at all times.</li>
          <li>Necklines must be covered at all times.</li>
        </ol>
      </li>
      <li>Adherence to these dress code standards is very important to us and is not negotiable.</li>
    </ol>
  </li>
</ol>

<h2>Professional Development</h2>
<ol>
  <li>Complete our staff application form.</li>
  <li>Participate in a Post-hire meeting that will go through the basics of what to expect at our camp.</li>
  <li>Participate in the online training that will take place before camp; there will be a few webinars that you must watch and take the test on. You will be emailed the times and dates.</li>
  <li>Be present at Staff meetings which will take place on Friday before camp.</li>
  <li>Participate in setting up and preparing your classroom before camp.</li>
</ol>

<h2>General Requirements</h2>
<ol>
  <li>Read and Adhere to the policies and procedures outlined in the Staff Handbook (provided).</li>
  <li>Formal training and conference training calls will take place before camp which will review these procedures in greater detail.</li>
</ol>

<h2>Payment</h2>
<ol>
  <li>Your pay and payment schedule are detailed in your signed contract.</li>
  <li>To show our undying appreciation to our staff, we occasionally sponsor after camp counselor outings and trips.</li>
</ol>

<p>We wish you Hatzlocho Rabba and look forward to being actively involved and working together with you.</p>
<p>It's important to remember that our goal is to ensure that everyone in camp - both campers and staff - has a positive and meaningful summer experience. If you ever feel that something is not aligned with this goal, please let us know. We value feedback and will do our best to resolve any issues that may arise.</p>
<p>Please feel free to ask any questions or discuss any issues with the camp office, should you feel necessary.</p>
<p>To learn more about our camp program or to complete an application form, visit our website: <strong>www.ganisrael.org</strong></p>`,

  "kiddie-director": `<h2>Kiddie Camp Director Job Description – Summer 2026</h2>
<h3>Job Title</h3>
<p>Kiddie Camp Director / Counselor (depending on camp size)</p>
<h3>Reports To</h3>
<p>Camp Director</p>
<h3>Welcome Message</h3>
<p>We are thrilled to have you join us at Camp Gan Israel of Morristown, NJ, for the summer of <strong>5786/2026</strong>. Your role as Kiddie Camp Director/Counselor is pivotal in ensuring our campers (ages 3–5) experience a joyful, safe, and meaningful Jewish summer. With your dedication and enthusiasm, we are confident that this summer will be a resounding success.</p>
<h3>Camp Mission</h3>
<p>At Gan Israel, our mission is to provide a safe, fun, and uplifting summer day camp experience for Jewish children. Through laughter, engaging activities, and a love for Judaism, we aim to inspire campers, staff, and their families.</p>
<h3>General Overview</h3>
<p>This role encompasses full responsibility for overseeing the operations of Kiddie Camp from pre-summer planning and preparation through the daily running of camp during the summer, and post-season wrap-up. The Kiddie Camp Director will also play a teaching role depending on enrollment. If we run <strong>five groups (approximately 60 campers)</strong>, the Director's position is <strong>full-time administrative</strong>. If we have fewer campers, the Director may teach half-days in addition to administrative duties. In such cases, refer to the counselor responsibilities outlined below for teaching duties.</p>

<h3>Dates and Hours (2026)</h3>
<ul>
  <li><strong>Employment begins:</strong> Pre-camp work is flexible and self-scheduled but must begin promptly, with steady progress.</li>
  <li><strong>Camp Dates:</strong> Monday, <strong>June 29, 2026 – Friday, August 14, 2026</strong>. Camp is closed on <strong>Friday, July 3</strong>.</li>
  <li><strong>Daily Schedule:</strong>
    <ul>
      <li><strong>Mondays to Thursdays:</strong> 8:30 AM – 4:00 PM.</li>
      <li><strong>Fridays:</strong> 8:30 AM – 2:30 PM.</li>
      <li><strong>Morning (Teaching Hours, if applicable):</strong> 8:45 AM – 1:00 PM.</li>
      <li><strong>Afternoon (Director/Administrative Hours):</strong> 1:00 PM – end of camp day.</li>
    </ul>
  </li>
  <li><strong>Pre-Season Training:</strong>
    <ul>
      <li><strong>Friday before camp (9 AM–2 PM):</strong> Camp setup and orientation; mandatory for all staff.</li>
      <li><strong>Sunday before camp:</strong> In-person training session. Pending</li>
      <li><strong>Online training:</strong> Mandatory webinars to be completed at least two weeks prior to camp; links and details will be sent via email.</li>
    </ul>
  </li>
</ul>

<h3>Pre-Camp Responsibilities</h3>
<p><strong>Staffing</strong></p>
<ul>
  <li>Hire, interview, and onboard all Kiddie Camp staff (counselors, assistant counselors, junior counselors, CITs).</li>
  <li>Conduct introductory calls or video sessions with staff members to build rapport and set expectations.</li>
  <li>Present recommended hires and proposed wages for final approval by camp leadership.</li>
  <li>Collaborate with the Camp Director to ensure salaries remain within budget.</li>
</ul>
<p><strong>Scheduling and Theme Planning</strong></p>
<ul>
  <li>Plan and create a detailed <strong>theme calendar</strong> integrating educational, recreational, and Judaic activities.</li>
  <li>Include weekly highlights: one trip day (if applicable), dress-up day, food day, general camp activity day, and two theme-related activities.</li>
  <li>Develop high-energy moments such as lineup/circle-up, theme song, lunch games, and bus games to foster camp spirit. Lineup should be structured and intentional: campers gather in a circle or organized lines, <strong>recite the 12 Pesukim together</strong>, and sing Jewish and camp songs as a group, with clear expectations so that every child feels included and engaged.</li>
  <li>Provide detailed instructions for each activity in a printable format for staff, including necessary supplies and sanitation considerations. All supplies must be clearly organized and easy for staff to access, and there must be enough of each item for all groups. Activities should be set up in a way that staff have everything they need in advance, allowing them to stay organized and focus on retaining camper engagement throughout the full time block, with appropriate backup plans in place.</li>
  <li>Integrate camp-wide events, trips, and shows into the Kiddie Camp calendar; coordinate with other divisions for use of shared spaces (fields, gym).</li>
  <li>Submit the finalized theme calendar and daily schedules for review and approval at least two weeks before Pesach.</li>
  <li>Submit the finalized daily schedules for the first 2 weeks of camp for review and approval at least one month before camp.</li>
  <li>Complete the remaining schedule at least 2 weeks in advance of the camp week.</li>
</ul>
<p><strong>Supplies and Classroom Setup</strong></p>
<ul>
  <li>Compile a master shopping list with all necessary items for the summer, including links for online orders (e.g., Amazon, Walmart).</li>
  <li>Ensure all supplies are ordered and ready at least three weeks before camp.</li>
  <li>Oversee classroom customization and setup with staff members.</li>
  <li>Organize and distribute supplies to appropriate classrooms, ensuring materials are easily accessible to staff and returned properly after use.</li>
</ul>
<p><strong>Communication</strong></p>
<ul>
  <li>Customize and finalize all parent communication documents, including supply lists and instructions for camp days and special events.</li>
  <li>Ensure camper information (allergies, emergency contacts, medical notes) is updated in UltraCamp and accessible to staff.</li>
  <li>Work with the Camp Director to align parent communications with camp-wide messaging.</li>
</ul>
<p><strong>Staff Training</strong></p>
<ul>
  <li>Plan and lead staff training sessions.</li>
  <li>Provide a comprehensive handbook outlining roles, responsibilities, expectations, and key policies (e.g., health and safety protocols, behavior management strategies, camper engagement techniques, Jewish programming guidelines).</li>
  <li>Ensure all lead counselors obtain CPR and First Aid certification before camp; the camp will cover certification costs. In addition, staff may be asked to attend a post-hire meeting and complete a short follow-up assessment after online training to ensure clarity and preparedness.</li>
  <li>Collect therapy note forms and other pre-camp documentation from staff; staff should inform the Director of any health concerns or issues that may affect their ability to perform their role.</li>
</ul>

<h3>Final Camp Prep (One Month to Camp)</h3>
<ul>
  <li><strong>Classroom and Supply Preparation:</strong> Confirm all items needed for classrooms are ordered, delivered, and ready for use; oversee setup.</li>
  <li><strong>Staff Coordination:</strong> Create a WhatsApp (or RingCentral) group for staff communication; coordinate with staff assisting on the Friday before camp to finalize setup; contact all staff to establish rapport and answer questions.</li>
  <li><strong>System Familiarization:</strong> Become proficient with UltraCamp for accessing camper lists, allergies, phone numbers, emails, and the medical section; print necessary documents such as schedules, rosters, and activity plans.</li>
  <li><strong>First-Day Preparation:</strong> Review and finalize logistics to ensure a smooth first day for staff and campers.</li>
</ul>

<h3>During the Summer Responsibilities</h3>
<h4>Morning (Counselor Duties) – if teaching</h4>
<ul>
  <li><strong>Teaching and Supervision:</strong> Lead your classroom, ensuring the physical, emotional, and spiritual wellbeing of all campers. Conduct daily circle time incorporating davening and Parsha stories. <strong>On Fridays, the camp day should conclude with a camp-wide Shabbat party (approximately 1:00–1:30 PM), including Parsha stories, review, songs, and Shabbat spirit. For older groups, include short Parsha questions or engaging take-home Parsha content when appropriate.</strong> Prepare and lead two daily activities, ensuring all materials are organized and ready. Supervise campers during water play, lunch, and transitions, adhering to safety protocols.</li>
  <li><strong>Religious Programming:</strong> Ensure each group <strong>davens daily</strong> and learns the Parsha at least twice a week. Campers should be familiar with the weekly Parsha by the time they go home on Friday. Introduce mitzvot, Jewish holidays, and special days on the Chabad calendar. Use inclusive language and translate Hebrew terms when needed to meet families of diverse backgrounds.</li>
  <li><strong>Camper Engagement:</strong> Promote positive camper engagement through enthusiasm, creativity, and active participation. Recognize and celebrate individual and team achievements, including participation, good middos, teamwork, and effort.</li>
</ul>
<h4>Afternoon (Director Duties) – administrative</h4>
<ul>
  <li><strong>Program Execution:</strong> Oversee the daily schedule and ensure activities align with the theme calendar and camp-wide schedule. Adjust plans as needed for camper and staff needs or unforeseen challenges (e.g., weather, supply issues).</li>
  <li><strong>Staff Management:</strong> Conduct <strong>daily check-ins</strong> with counselors and junior staff. Provide feedback, support, and guidance; arrange coverage when staff are absent.</li>
  <li><strong>Parent and Staff Communication:</strong> Act as the primary contact for parents via RingCentral, email, and WhatsApp. Counselors may communicate directly with parents for minor needs but should include the Director when issues might become significant. Escalate serious concerns to the Camp Director.</li>
  <li><strong>Parent Engagement:</strong> Maintain professional, consistent communication; prepare weekly newsletters and updates by Thursday afternoon.</li>
  <li><strong>Supply and Logistics Management:</strong> Monitor classroom supplies daily and replenish as needed. Ensure first aid kits are stocked and accessible.</li>
  <li><strong>Programming Oversight:</strong> Ensure all groups adhere to <strong>Camp Gan Israel's programming expectations</strong>, and support counselors in making content accessible for families with varying backgrounds.</li>
  <li><strong>Collaboration:</strong> Coordinate with other divisions (e.g., Boys Division) to avoid scheduling conflicts for shared spaces (fields, gym). Bring any conflicts to the Camp Director's attention.</li>
  <li><strong>Incident Reporting:</strong> Counselors should fill out incident forms for mishaps or disciplinary issues. The Kiddie Camp Director logs significant incidents in UltraCamp's medical section.</li>
  <li><strong>Staff Appreciation:</strong> Coordinate occasional after-camp outings or treats during the camp season to thank staff for their hard work.</li>
</ul>
<h4>Ongoing Director Responsibilities (Broad Operations)</h4>
<ul>
  <li><strong>Health and Safety:</strong> Maintain high standards of health and safety for campers and staff. Be vigilant to personal and health needs; administer first aid as trained; consult with the Camp Director or health consultant when necessary. Regularly inspect equipment and facilities and oversee water play and transportation with strict adherence to safety protocols.</li>
  <li><strong>Respect and Role Modeling:</strong> Treat campers, staff, and facility members with respect at all times. Be a role model of positivity, enthusiasm, and mentchlichkeit. Foster Jewish pride and celebrate our community and traditions.</li>
  <li><strong>Facility and Property Care:</strong> Keep the camp facility clean and organized. Ensure supplies and equipment are returned to proper locations. Delegate clean-up tasks so the campgrounds are tidied before the end of each day.</li>
  <li><strong>Organization and Communication:</strong> Collect bunk attendance promptly each morning; maintain proper record-keeping. Inspect bunks and facilities regularly. Participate in meetings with camp leadership; communicate updates, concerns, and suggestions; maintain open communication with the Camp Director to resolve challenges effectively.</li>
  <li><strong>Staff Oversight and Mentoring:</strong> Monitor counselor and camper assignments daily to ensure proper coverage and engagement. Mentor, encourage, and support counselors; address staff actions that jeopardize camper safety or health immediately (in private if possible). Step in to lead activities or supervise bunks if a counselor is absent or if staff transitions occur.</li>
  <li><strong>Evaluation and Feedback:</strong> Provide daily check-ins with staff to monitor morale and performance. Conduct a mid-season review (after two to three weeks) to discuss improvements. After camp, prepare a paragraph about each staff member noting strengths and areas for growth.</li>
  <li><strong>Emergency Response:</strong> Familiarize yourself with the camp's emergency response plan. In an emergency, follow the camp's procedures and ensure counselors and campers are safe.</li>
  <li><strong>Other Duties:</strong> Participate in extracurricular activities, such as family events or special programs. Greet campers, parents, and staff warmly at pick-up and drop-off times. Uphold all camp policies and procedures; be open to other duties as communicated by camp leadership.</li>
</ul>
<h4>Key Expectations Throughout the Summer</h4>
<ul>
  <li>Be a role model in attitude, behavior, and professionalism, instilling Jewish values in campers and staff.</li>
  <li>Maintain open communication with staff and parents to foster a collaborative and enjoyable camp environment.</li>
  <li>Be proactive in identifying and addressing challenges to ensure smooth operation of Kiddie Camp.</li>
  <li>Uphold standards of health, safety, and organization across all camp activities and spaces.</li>
  <li>Demonstrate flexibility and a positive attitude when additional help is needed, including extracurricular events or unforeseen challenges.</li>
</ul>

<h3>Staff Guidelines and Expectations (Applies to All Staff)</h3>
<p><strong>Cell Phone Policy</strong></p>
<p>Cell phone use by the Kiddie Camp Director is for camp operations, in addition to emergency calls and taking camp photos. Radios will be provided for regular communication during camp hours. Phones should remain out of sight during activities to maintain focus on the campers.</p>
<p><strong>Timeliness</strong></p>
<p>Staff are expected to attend every single day of camp on time. In case of illness or unavoidable delays, notify the Camp Director or Kiddie Camp Director as soon as possible to ensure appropriate coverage.</p>
<p><strong>Pre-Season Preparation</strong></p>
<ul>
  <li><strong>In-Person Sessions:</strong> Mandatory sessions will be held on the Friday (9 AM–2 PM) and Sunday before camp begins. Attendance is required to ensure all staff are fully prepared for the camp season.</li>
  <li><strong>Online Training:</strong> Complete assigned webinars and training sessions at least two weeks before camp.</li>
  <li><strong>Application and Forms:</strong> Submit staff applications, therapy note forms, health information, and any required paperwork before camp begins. Staff should notify the Director of any health concerns or issues that may affect their ability to perform their job.</li>
</ul>
<p><strong>Professionalism and Collaboration</strong></p>
<ul>
  <li>Participate in meetings with camp leadership; communicate updates, concerns, and suggestions.</li>
  <li>Demonstrate flexibility and a positive attitude when additional assistance is needed (including extracurricular events or unforeseen challenges).</li>
  <li>Ask questions or seek clarification whenever uncertain about a policy or procedure.</li>
  <li>Work collaboratively with other staff (counselors, assistant counselors, junior counselors, CITs) to ensure smooth daily operations.</li>
  <li>Greet campers, parents, and fellow staff warmly at pick-up and drop-off times to create a welcoming atmosphere.</li>
</ul>
<p><strong>Incident Reporting and Communication</strong></p>
<ul>
  <li><strong>Minor issues</strong> (small scrapes, occasional minor behavior) may be documented on a simple form; no UltraCamp entry is required unless the issue becomes recurring or more serious.</li>
  <li><strong>Significant issues</strong> (repeated hitting, toileting problems in an older group, injuries requiring more than a bandaid, or requiring parent contact) must be documented on an incident form and given to the Kiddie Camp Director for final review and uploading into UltraCamp's medical section.</li>
  <li>Counselors may communicate directly with parents about minor needs; the Director must be included when issues might become significant.</li>
  <li>Follow the camp's emergency response plan (detailed in the staff handbook) during emergencies.</li>
</ul>

<h3>Post-Season Responsibilities</h3>
<ul>
  <li>Ensure classrooms are cleaned and restored to their original condition.</li>
  <li>Compile and submit a detailed report on the summer, including recommendations for future improvements.</li>
  <li>Submit an inventory of remaining supplies and suggestions for next year's orders.</li>
  <li>Plan and coordinate a staff appreciation outing or treat during or immediately after camp.</li>
</ul>

<h3>Qualifications and Requirements</h3>
<p><strong>Minimum Education and Experience</strong></p>
<ul>
  <li>Previous camp staff experience is required.</li>
  <li>Ability to work collaboratively as part of a team to accomplish the camp's goals.</li>
  <li>Creativity and ability to lead and assist with programs, facilities, and staff.</li>
  <li>Must be at least 18 years of age or a high school graduate.</li>
  <li>Must be able to obtain or become certified in First Aid/CPR before camp (camp covers certification).</li>
  <li>Submission of necessary health information is required prior to employment.</li>
</ul>
<p><strong>Leadership Skills and Abilities</strong></p>
<ul>
  <li>Understanding of the developmental needs of youth.</li>
  <li>Ability to relate to and interact with youth and adults in a positive manner.</li>
  <li>Strong communication and leadership skills to effectively manage staff and campers.</li>
  <li>Strong risk management and safety awareness to ensure a secure camp environment.</li>
  <li>Desire and ability to supervise staff and campers, fostering a safe, enriching atmosphere.</li>
  <li>Familiarity with Chabad customs and calendar is preferred; training and resources will be provided.</li>
</ul>
<p><strong>Necessary Physical Abilities</strong></p>
<ul>
  <li>Ability to communicate verbally and provide clear instructions to children and staff at various age and skill levels.</li>
  <li>Visual and auditory ability to identify and respond to environmental and other hazards during camp activities.</li>
  <li>Physical ability to respond appropriately in emergency situations (fire, evacuation, illness, or injury), including assisting campers.</li>
  <li>Strength and endurance required to maintain constant supervision of campers and engage in active camp activities.</li>
  <li>Ability to observe camper and staff behavior, assess appropriateness, and apply effective behavior-management techniques.</li>
</ul>
<p><strong>Dress Code</strong></p>
<ul>
  <li>Skirts must cover the knees at all times, with no slits.</li>
  <li>Sleeves must cover the elbows at all times.</li>
  <li>Necklines must be fully covered.</li>
  <li>These dress code requirements are non-negotiable and reflect the spirit and mission of our camp.</li>
</ul>
<p><strong>General Requirements</strong></p>
<ul>
  <li>Read and adhere to the policies and procedures outlined in the <strong>Staff Handbook</strong> (to be provided). The handbook will include detailed emergency response protocols, guidance on communicating Jewish content to families of varying backgrounds, and other policies referenced in this description.</li>
  <li>Attend formal training sessions and conference calls prior to camp to review these procedures in detail.</li>
  <li>Maintain a positive, professional attitude and serve as a role model reflecting the values of Camp Gan Israel.</li>
  <li>Uphold all camp policies and procedures; be flexible and open to other duties as directed.</li>
</ul>

<h3>Payment</h3>
<ul>
  <li>Your compensation and payment schedule are detailed in your <strong>signed contract</strong>.</li>
  <li>Occasional staff outings or treats may be provided during the summer to show appreciation.</li>
</ul>`,

  "boys-assistant-director": `<h1>Assistant Camp Director – Boys Division</h1>

<h2>Employment Details</h2>
<ul>
  <li><strong>Camp Dates:</strong> June 29 – August 14 2026</li>
  <li><strong>Work dates Pre-Summer:</strong> Flexible</li>
  <li><strong>Required Arrival:</strong> arrive <strong>Sunday, June 28</strong> with the boys division — or earlier to help with pre-camp setup (coordinate your dates with the Director)</li>
  <li><strong>Hours:</strong> Monday–Thursday, 8:30 AM – 4:00 PM; Friday, 8:30 AM – 2:30 PM</li>
  <li><strong>Reports To:</strong> Camp Director</li>
</ul>

<h2>Position Summary</h2>
<p>The Assistant Director of the Boys Division is a key member of the leadership team at Camp Gan Israel. The purpose of this role is to support and guide the Head Counselors and general staff in executing a high-quality, engaging, and safe camp experience. Your role is also to help ensure camp runs smoothly, professionally, and with positive energy throughout the day. While this role is supervisory, it is designed to empower the Head Counselors to lead effectively – not to override their authority. The Assistant Director will work in close partnership with the Camp Director and serve as a liaison between leadership and staff.</p>

<h2>Core Responsibilities</h2>
<h3>1. Staff &amp; Program Support</h3>
<ul>
  <li>Support Head Counselors in implementing the daily schedule and preparing for each activity.</li>
  <li>Ensure that every activity is logistically prepared: supplies, location, timing, responsibilities, setup, and cleanup.</li>
  <li>Help Head Counselors review and finalize weekly activity plans to ensure variety and camper engagement.</li>
  <li>Guide them in preparing an incentive system for davening, lineup, and positive behavior.</li>
</ul>
<h3>2. Pre-Season Responsibilities &amp; Orientation</h3>
<ul>
  <li><strong>Staff Hiring &amp; Onboarding:</strong> Provide suggestions and leads for prospective staff and assist with onboarding communications. The Director will conduct interviews, handle paperwork, and send contracts. Serve as a liaison to communicate expectations and gather feedback from potential staff.</li>
  <li><strong>Curriculum Development &amp; Vision:</strong> Draft and refine age-appropriate curricula for each bunk. Ensure counselors understand the learning schedule and that materials are prepared on time. All curricula and materials should be completed before camp begins. Work closely with the Director to align the educational and programmatic vision.</li>
  <li><strong>Staff Training:</strong> Help plan and lead pre-season training sessions (virtual and in person). Incorporate guidance from resources such as Rabbi Zalmy Kudan's training and Michael Brandwein's books to promote a positive, child-centered approach to camp education and staff leadership.</li>
  <li><strong>Vision Alignment:</strong> Regularly consult with the Camp Director to ensure that initiatives balance professionalism and polish with the camp's warm, fun, and welcoming vibe. Schedule check-ins or WhatsApp conversations as needed during planning to stay aligned. Encourage creativity and professionalism while keeping the broader camp mission in focus.</li>
  <li><strong>Camp Handbook &amp; UltraCamp Expertise:</strong> Study the camp handbook thoroughly and work with the Director to update policies (e.g. discipline) as needed before the summer. Become proficient in UltraCamp and train Head Counselors on its use for attendance, camper profiles, and communication.</li>
</ul>
<h3>3. Pre-Camp Logistics</h3>
<ul>
  <li><strong>Arrival &amp; Setup:</strong> Arrive ahead of opening to assist with pre-camp setup and orientation — coordinate your exact dates with the Director. Help prepare bunks, classrooms, and common areas for opening day.</li>
  <li><strong>Staff Arrival Logistics:</strong> Coordinate with the Director to arrange rooms for staff. Travel arrangements such as flights will be handled by the Director. Assist with local transportation (e.g. airport pickups, rides from Crown Heights) if needed.</li>
  <li><strong>Orientation Support:</strong> Receive the general framework and resources from the Director, then lead orientation sessions together with Head Counselors. Guide staff through camp structure, logistics, and expectations.</li>
  <li><strong>Safety &amp; Documentation:</strong> Review camp safety documents and ensure Head Counselors and staff are familiar with camper allergies, behavioral notes, and general safety alerts shared by the Camp Director.</li>
  <li><strong>Supply Preparation:</strong> Coordinate with Head Counselors to ensure all necessary supplies for the first week are ordered, delivered, and ready to go.</li>
  <li><strong>Final Preparations:</strong> Assist with last-minute tasks such as setting up beds, organizing storage areas, and verifying that facilities and equipment are ready for the first day of camp.</li>
  <li><strong>Camper Needs Review:</strong> Before camp begins, review each camper's UltraCamp profile to understand allergies, medical needs, preferences, and special requests. Coordinate with the Director about any necessary parent communications and ensure Head Counselors are aware of critical information.</li>
</ul>
<h3>4. Oversight Without Overstepping</h3>
<ul>
  <li>Encourage leadership from Head Counselors while offering your experience and suggestions as needed.</li>
  <li>Avoid directly taking over decisions unless it relates to camper safety or a clear breakdown in protocol.</li>
  <li>Use reflective, supportive language when giving feedback to Head Counselors (e.g., "How do you feel lineup is going?").</li>
  <li>Discuss counselor performance concerns with Head Counselors before intervening directly unless there is a safety concern.</li>
  <li><strong>Day-to-Day Authority:</strong> Handle routine staff conflicts and operational issues to keep camp running smoothly. Collaborate with Head Counselors to resolve problems and maintain harmony. Consult the Director before reassigning counselors or campers to different bunks; any changes to bunk assignments (staff or campers) must be approved by the Director to preserve the camp's structure and professionalism.</li>
  <li><strong>Supporting CITs &amp; Junior Counselors:</strong> Recognize that CITs and junior counselors work with and under the guidance of counselors and Head Counselors. Provide assistance and mentorship when appropriate, but do not overstep the Head Counselors' role in supervising them. Step in only when necessary and avoid jumping in prematurely.</li>
</ul>
<h3>5. Camper Support &amp; Safety</h3>
<ul>
  <li>Be available to assist with behavioral issues or camper conflicts that Head Counselors cannot resolve.</li>
  <li>Follow up on incidents, injuries, or health concerns by communicating with the camper and parent when appropriate.</li>
  <li>Ensure incident reports are submitted by staff and uploaded into UltraCamp.</li>
  <li>Help ensure supervision standards are met throughout camp: no camper should be left alone or without staff presence.</li>
  <li>Enforce the camp's no-phones policy for staff during activities—especially during swimming—in a positive, consistent manner.</li>
  <li><strong>Emergency Response:</strong> In the event of a medical or safety emergency, call Hatzalah or 911 immediately before notifying the Director. For urgent but non-emergency situations where guidance is needed, consult the Director as soon as practicable. Keeping campers safe always takes priority over protocol.</li>
</ul>
<h3>6. Trips &amp; Special Events</h3>
<ul>
  <li>Work with Head Counselors to ensure trips depart on time and are fully prepared. Confirm that attendance sheets are accurate and that shirts, first aid supplies, water, and other essentials are packed.</li>
  <li>Ensure all required trip waivers are collected and submit payments to vendors as needed. Communicate with trip venues and bus companies to confirm details and ensure bus drivers know pickup and return times.</li>
  <li>Oversee head counts and attendance sheets; verify that final camper counts match the number on check-in sheets. Any discrepancies should be reported to the Director.</li>
  <li>In consultation with Head Counselors, decide whether to accompany a trip based on complexity. For routine trips, Head Counselors may lead; when one division goes out and the other stays in camp, you typically remain on site.</li>
  <li>Be flexible in helping assess where supervision or support is most needed on trip days and adjust plans accordingly.</li>
  <li><strong>Bus Logistics:</strong> While you coordinate attendance, waivers, payments, and vendor communication, changes to bus driver instructions and departure timing are handled by the Director, and seating assignments are managed by the Head Counselors. Communicate any observed issues but do not assume responsibility for these logistics unless specifically asked by the Director.</li>
</ul>
<h3>7. Electives &amp; Rainy-Day Activities</h3>
<ul>
  <li>Help plan and oversee in-house electives (e.g., sports, science, baking) to reduce vendor costs while maintaining excitement.</li>
  <li>Work with Head Counselors and staff to assign responsibility and structure for each elective.</li>
  <li>Support the Head Counselors in preparing rainy-day plans in advance and guiding their implementation.</li>
</ul>
<h3>8. Logistics, Supplies &amp; Budget</h3>
<ul>
  <li>Work with Head Counselors to gather weekly supply lists and coordinate timely ordering (via Instacart, Amazon, or other vendors). Meet with the Director before camp to determine supply budgets and approval processes, and ensure all orders stay within those budgets. Coordinate last-minute supply runs (e.g., trips to Walmart) when unexpected needs arise, staying flexible and solution-oriented.</li>
  <li>Oversee sports equipment, water-play materials, and craft supplies—ensuring items are set up, used properly, and returned.</li>
  <li>Ensure educational supplies (copies, printouts, materials) are prepared for each day before leaving.</li>
  <li>Supervise water play and swim to ensure staff are attentive and safety protocols are being followed.
    <ul>
      <li>Monitor inventory of all supplies and snacks; replenish stock as needed in consultation with the Director and Head Counselors.</li>
    </ul>
  </li>
</ul>
<h3>9. Lunch, Arrival &amp; Dismissal</h3>
<ul>
  <li>Oversee lunch delivery and confirm all runs smoothly.</li>
  <li>Guide Head Counselors on best practices for lunch supervision and benching structure.</li>
  <li>Be outside to greet parents and campers during morning drop-off and afternoon pickup, modeling enthusiasm and professionalism.</li>
  <li>Support end-of-day cleanup, dismissal logistics, and management of lost and found.</li>
</ul>
<h3>10. Staff Coordination</h3>
<ul>
  <li><strong>Head Counselor Meetings &amp; Debriefs:</strong> Meet daily with Head Counselors to review plans, issues, and improvements. Keep end-of-day debriefs brief and focused on positive reinforcement; schedule longer feedback sessions at other times unless urgent.</li>
  <li><strong>Counselor Follow-Up:</strong> Follow up with counselors as needed in collaboration with Head Counselors.</li>
  <li><strong>Staff Motivation &amp; Morale:</strong> Take an active role in nurturing staff morale. Organize occasional incentives or treats, and plan exciting outings or small events so staff have experiences to look forward to. Advise Head Counselors to do the same, and ensure staff feel appreciated and energized throughout the summer.</li>
  <li>If a counselor is out, help identify a suitable substitute and coordinate with the Director.</li>
  <li><strong>Daily Check-Ins with Director:</strong> During the summer, meet with the Director at least daily—typically in the morning and midday—to review schedules, discuss any issues, and adjust plans as needed.</li>
  <li><strong>Staff Scheduling &amp; Attendance:</strong> Monitor staff attendance and punctuality. Coordinate with Head Counselors to ensure counselors and junior staff arrive on time for lineup and activities. If you notice a staff member is absent or late while Head Counselors are occupied, help wake or locate the counselor to ensure coverage. Staff scheduling and timesheet administration remain with the Director or administrative team; your role is to ensure day-to-day attendance and support are maintained.</li>
  <li><strong>Staff Evaluations:</strong> Provide feedback to counselors and junior staff in a supportive, conversational manner. A standard evaluation form is available for your personal note-taking if desired, but evaluation meetings should feel like collaborative discussions rather than formal interviews. Use these notes to track progress and inform end-of-summer evaluations.</li>
</ul>
<h3>11. Communication, Technology, and Media</h3>
<ul>
  <li>Use UltraCamp to access camper information, update records, and train Head Counselors in its use.</li>
  <li>Collect photos and ensure they are forwarded daily to the social-media coordinator; no need to upload content to the camp website yourself.</li>
  <li>See to it that newsletter content is submitted by Head Counselors weekly.</li>
  <li>Handle day-to-day camp phone calls and emails regarding behaviour, camper needs, and staff needs. Direct registration questions or general parent inquiries to the Director, and consult the Director on serious matters before responding.</li>
  <li><strong>Administrative Awareness:</strong> Maintain awareness of bunk lists, bus schedules, and other administrative details. Ensure Head Counselors record campers' elective choices and submit this information promptly. Coordinate with director to keep rosters and schedules up to date and accurate.</li>
</ul>
<h3>12. General Outlook &amp; Success Metrics</h3>
<ul>
  <li><strong>Camper Happiness &amp; Staff Satisfaction:</strong> Prioritise creating a positive, energetic environment where campers are happy, confident, and engaged. Use camper happiness as a key barometer of success and ensure staff satisfaction and a growth-oriented culture are equally valued.</li>
  <li><strong>Alignment With Camp Vision:</strong> Balance professionalism and polish with the camp's warm, welcoming vibe. Consult regularly with the Director to ensure that programs and decisions support the camp mission. Encourage creativity and initiative while staying aligned with overarching goals.</li>
  <li><strong>Professional Development:</strong> Engage in ongoing professional development by exploring resources such as Rabbi Zalmy Kudan's training and Michael Brandwein's books to enhance your understanding of positive, child-centered camp education and staff leadership. These resources are optional suggestions, and the camp will happily provide access to books or trainings upon request.</li>
  <li><strong>Success Evaluation:</strong> Evaluate success through multiple lenses—camper joy, staff morale, smooth program execution, and the overall camp atmosphere. Consider indicators such as campers asking to return for more weeks and parents enthusiastically raving about camp. Solicit feedback from staff and families and adjust approaches as needed to maintain a positive vibe.</li>
</ul>
<h3>13. Routines &amp; Daily Presence</h3>
<ul>
  <li><strong>Camp Tidiness &amp; Lost-and-Found:</strong> Take ownership of routines that are easily forgotten. Focus on three key areas—the classrooms, the pool area, and the picnic area—to ensure they remain tidy. Encourage campers and staff to put away sports equipment and camp supplies properly and to collect personal items before leaving each area. General maintenance will be handled by the general manager or custodian, but you should step in when children create a significant mess or when camp supplies are not being cared for appropriately.</li>
  <li><strong>On-The-Ground Presence:</strong> Minimise continuous office or computer time; this is a hands-on role. Limit any computer sessions to brief tasks and spend the majority of each day moving through camp. Your job is to be the eyes and ears of camp—observing activities, supporting staff, and ensuring campers are engaged and transitions are smooth.</li>
  <li><strong>Hands-On Support:</strong> Step in to help set up and execute activities (e.g., slip-and-slide or water play) when head counselors or staff need assistance. Use intuition to decide when to act versus delegate, understanding that getting things done sometimes requires personal involvement.</li>
  <li><strong>Engagement Monitoring:</strong> Ensure full participation in swimming and other scheduled activities. Promptly address situations where campers are idle or disengaged, and work with counselors to adapt plans to maintain energy.</li>
  <li><strong>Camper Engagement:</strong> Actively look for campers who are not participating or seem disengaged. Work with counselors and the Director to find solutions and encourage every child to take part in activities.</li>
  <li><strong>End-of-Day Cleanup &amp; Lockup:</strong> Oversee end-of-day cleanup, lockup, and lost-and-found management. Ensure lights, air conditioners, and equipment are turned off and supplies are stored properly before leaving.</li>
</ul>
<h3>Suggested Daily Schedule (Sample)</h3>
<p>While daily timing will vary based on trips, special events, and the specific activities planned by Head Counselors, the outline below illustrates a typical day for the Assistant Director. Use it as a framework rather than a rigid schedule, adjusting as needed to support staff and campers.</p>
<ul>
  <li><strong>8:45 AM – Staff Arrival &amp; Morning Prep:</strong> Ensure all staff are present, equipped with working radios, and ready to greet campers. Review the day's schedule with Head Counselors and set a positive tone for the day.</li>
  <li><strong>9:15 AM – Attendance &amp; Morning Walkthrough:</strong> Collect and review attendance sheets from bunks and Head Counselors. Address any camper absences by contacting parents. Conduct a brief camp walkthrough to confirm all activities are starting smoothly. Catch up on any parent emails or phone calls.</li>
  <li><strong>10:00 AM – Rounds &amp; Engagement Checks:</strong> Conduct routine inspections of all camp areas multiple times throughout the day to ensure smooth operations and full engagement from staff and campers.</li>
  <li><strong>11:30 AM – Lunch Supervision:</strong> Oversee lunch delivery and ensure all campers are well-fed. If you are teaching during this time, coordinate with Head Counselors to supervise lunchtime (including benching) and maintain order.</li>
  <li><strong>1:00 PM – Swim &amp; Special Activities:</strong> Supervise swim activities and special programs. Confirm that enough staff are present and attentive during swim times and other water play activities, and encourage full camper participation.</li>
  <li><strong>3:00 PM – End-of-Day Wrap-Up:</strong> Begin end-of-day procedures by ensuring classrooms, picnic areas, and pool areas are clean, supplies are stored properly, and lost-and-found is organized.</li>
  <li><strong>3:15–3:40 PM – Dismissal:</strong> Oversee dismissal preparation and ensure campers are accounted for and safely picked up. Follow up with parents of any campers remaining after dismissal and assist with end-of-day coordination as needed.</li>
</ul>
<p>Remember, this schedule is a guide. Your presence should remain flexible so you can respond to unexpected needs, assist with trips, or step into teaching and supervision roles when necessary.</p>
<h3>14. Discipline &amp; Parent Communication</h3>
<ul>
  <li><strong>Compassionate Discipline:</strong> Work with the Director before camp to develop and agree upon discipline guidelines. Apply a consistent progressive approach—start with a warning, then a reminder, and then involve parents if behavior does not improve. Avoid using missed activities as punishment and strive for gentle correction and clear expectations.</li>
  <li><strong>Parent Collaboration:</strong> As the primary contact for parents, communicate behavioral concerns, progress, or achievements after warnings have been issued. Partner with families to support each child's experience and ensure transparency. Consult the Director on serious or recurring issues before escalating.</li>
  <li><strong>Counselor Partnership:</strong> Coordinate disciplinary matters with Head Counselors, ensuring that any interventions align with camp policy and the three-chance approach. Consult with the Director before escalating to sending a camper home.</li>
</ul>

<h2>Pre-Camp Meetings &amp; Discussion Items</h2>
<p>Before the summer begins, the Assistant Director will meet with the Director to clarify expectations and delegate responsibilities in areas that require shared decision-making. Topics may include:</p>
<ul>
  <li><strong>Supply Budgets:</strong> Agree on a budget and approval process for ordering snacks, water, and activity supplies. Determine whether the Assistant Director or Director will place orders and how last-minute purchases will be handled.</li>
  <li><strong>Discipline Process:</strong> Finalise the discipline and parent-communication guidelines, including the three-step warning system and escalation procedures.</li>
  <li><strong>Travel &amp; Logistics:</strong> Decide who will coordinate local travel arrangements for staff arrivals (e.g. airport pickups) and how flight booking will be managed.</li>
  <li><strong>Trip Itineraries &amp; Program Input:</strong> Discuss how the Assistant Director can share ideas for trips, schedules, activities, and the learning program while respecting that the Director sets the overall schedule and Head Counselors plan specific activities.</li>
  <li><strong>General Camp Vision &amp; Roles:</strong> Align on the camp's vision, discuss areas such as pool and lifeguarding oversight, and clarify boundaries between Director, Head Counselors, and Assistant Director responsibilities.</li>
  <li><strong>Coordination With Other Divisions &amp; General Manager:</strong> Clarify the chain of command for collaborating with other divisions on site. Determine when to go directly to the Director versus when small assistance requests can be made of the general manager.</li>
  <li><strong>Off-Hours Involvement:</strong> As an out-of-town staff member, housing, food, and Sunday outings are all part of the package. We'll talk through your level of participation in weekend and evening staff activities, trips, and meals.</li>
  <li><strong>Post-Summer Wrap-Up &amp; Success Report:</strong> Determine expectations for end-of-summer pack-up and evaluation. Outline how you will work with Head Counselors to store supplies and organize the shed and how you will prepare a brief report summarizing successes and areas for improvement.</li>
</ul>

<h2>Terms &amp; Logistics</h2>
<ul>
  <li><strong>Compensation:</strong> To be determined after your response to this job description.</li>
  <li><strong>Payment Method:</strong> Check, issued via 1099.</li>
  <li><strong>Housing benefits:</strong> Provided by camp.</li>
  <li><strong>Vehicle:</strong> A staff car will be available; typically driven by Head Counselors. You are not required to join every outing unless desired.</li>
  <li><strong>Food:</strong> Meals are provided by the camp.</li>
  <li><strong>Shabbos:</strong> Not required to stay in camp for Shabbos. If you'd like to join the staff program, please inform the Director.</li>
  <li><strong>Administrative Support:</strong> Assist when possible. Report any needed staff or camp changes to the Director.</li>
  <li><strong>Errands:</strong> If available, you may be asked to assist with last-minute camp errands.</li>
</ul>

<h2>Physical Requirements</h2>
<p>This role is highly active and requires the ability to move throughout the camp property and participate in daily activities. Applicants should be prepared to:</p>
<ul>
  <li>Walk and stand for extended periods while monitoring activities across multiple areas of camp.</li>
  <li>Participate in physical camp activities as needed, including assisting with setup, supervision, and cleanup of sports, water play, and special events.</li>
  <li>Lift and carry supplies, equipment, or storage bins (up to approximately 30 pounds) to support camp operations.</li>
  <li>Respond quickly to emergencies and assist campers or staff in the event of accidents or injuries.</li>
</ul>
<p>The Assistant Director must maintain sufficient stamina and agility to provide continuous, hands-on supervision and support throughout the camp day.</p>

<h2>Post-Summer Wrap-Up &amp; Evaluation</h2>
<p>At the conclusion of the summer, the Assistant Director plays a key role in closing out the season and laying groundwork for future improvement. Responsibilities include:</p>
<ul>
  <li><strong>Supply Pack-Up &amp; Storage:</strong> Work with Head Counselors and counselors to ensure all supplies, equipment, and learning materials are collected, inventoried, and stored properly.</li>
  <li><strong>Success &amp; Improvement Report:</strong> Prepare a brief post-summer report summarizing what went well, what challenges arose, and recommendations for the following year. Discuss your observations with the Director and Head Counselors.</li>
  <li><strong>Staff Evaluations:</strong> Compile your notes from evaluation conversations into a summary for the Director. Offer constructive feedback and highlight strengths and growth areas for each staff member.</li>
</ul>
<p>These wrap-up duties help ensure continuity and improvement across seasons and reinforce your role as a reflective leader in camp operations.</p>

<h2>Learning Director Responsibilities</h2>
<p>The following duties were previously part of the Learning Director role and are now incorporated into the Assistant Director's responsibilities. These duties may be adjusted based on pre-camp planning and available support.</p>
<h3>Role Summary</h3>
<p>You will plan, prepare, and supervise the seven-week learning program for grades 1–6, guaranteeing that every camper receives quality, age-appropriate Jewish learning each day.</p>
<h3>Key Functions</h3>
<ol>
  <li><strong>Curriculum Design:</strong> Create a seven-week curriculum for each bunk (1st–6th) that is engaging, goal-oriented, and rich in Parsha, Jewish-calendar themes, and Jewish values.</li>
  <li><strong>Materials &amp; Booklets:</strong> Prepare and submit all print-ready booklets at least two weeks before camp; distribute and replenish throughout the summer.</li>
  <li><strong>Staff Training &amp; Support:</strong> Train and mentor counselors/learning teachers; provide clear daily prep guidelines and ongoing feedback.</li>
  <li><strong>Direct Teaching &amp; Coaching:</strong> Whenever available, teach or co-teach 4th–6th-grade boys' classes (~45–60 minutes) and coach counselors during learning sessions. The primary focus is on supporting and mentoring rather than assuming a daily teaching load.</li>
  <li><strong>Program Oversight:</strong> Supervise morning learning, coordinate with head staff, and keep the Director informed of progress and needs.</li>
  <li><strong>Davening Oversight:</strong> Work with head counselors to guide and supervise boys' morning tefillah.</li>
</ol>
<h3>Pre-Season Responsibilities</h3>
<ol>
  <li><strong>Curriculum Development</strong> – Draft full learning plans with clear goals and pacing:
    <ul>
      <li>Younger bunks – 30 min/day</li>
      <li>Non-Cheder bunks – 15–30 min/day</li>
      <li>3rd grade – 45 min/day</li>
      <li>4th grade – 1 hour/day</li>
      <li>5th &amp; 6th grade – 1½ hours/day</li>
      <li>Incorporate weekly Parsha and calendar dates (Chabad &amp; general).</li>
    </ul>
  </li>
  <li><strong>Booklet Preparation</strong> – Design/adapt booklets; submit print files at least two weeks before camp.</li>
  <li><strong>Coordination &amp; Resources</strong> – Share all digital materials (PDFs) with the Director via Google Drive or similar for ease of access and reprinting. Consult the Director before ordering prizes or incentives to determine budget.</li>
</ol>
<h3>Camp Responsibilities (During Summer)</h3>
<ol>
  <li><strong>Daily Learning Support &amp; Supervision</strong> – Equip each bunk with materials; answer counselors' questions. Conduct daily check-ins. Observe classes and adjust pacing for trips or special events. Teach when available. Collaborate with head staff to fit learning smoothly into the daily schedule.</li>
  <li><strong>Leadership, Health &amp; Safety</strong> – Maintain top standards of safety; provide first aid within certification level. Report hazards promptly; follow all campus security protocols. When assigned, supervise campers during transportation or field trips. Prep daily materials in advance; monitor counselor assignments; step in if a counselor is absent. Uphold all camp policies and emergency procedures.</li>
  <li><strong>Role Modeling &amp; Camp Culture</strong> – Model positivity, professionalism, Torah values, and mentchlichkeit. Mentor and encourage counselors; guide campers' growth in Jewish pride. Oversee and participate in boys' morning davening.</li>
  <li><strong>Respect for Facility &amp; Property</strong> – Maintain clean, quiet, respectful use of all spaces; ensure supplies are stored properly. Demonstrate respectful interactions with campers, staff, and school personnel.</li>
  <li><strong>Organization &amp; Communication</strong> – Document and report incidents or disciplinary issues the same day. Coordinate with the Director on any certificates, quizzes, progress reports, or end-of-summer siyum you wish to implement. Relay important updates to parents (or assist the Director) when needed. Participate in all head-staff meetings and evaluations.</li>
  <li><strong>After-Camp &amp; Transportation</strong> – Finish prep for the next day before leaving (especially Fridays). Transportation clause: if the Learning Director has a valid license and camp vehicle is available, he may be placed on camp insurance to drive counselors to and from camp or staff outings/trips; if not, camp will provide an Uber account for staff; all rides must be logged.</li>
  <li><strong>Dress Code</strong> – Morning davening &amp; learning: button-down shirt (and tie if worn). Other activities/trips: modest camp T-shirt or similar; no tight shirts, jeans, or shorts. Haircuts in line with standard yeshiva guidelines.</li>
  <li><strong>Professional Development &amp; General Requirements</strong> – Complete the CGI staff-application form. Attend all required trainings and the Sunday setup before camp. Read and adhere to the CGI Staff Handbook and all policies reviewed in pre-camp calls.</li>
</ol>`,

  "girls-assistant-director": `<h1>Assistant Camp Director – Girls Division</h1>
<p>Camp Gan Israel of Morristown, NJ – Summer 2026</p>

<h3>Employment Details</h3>
<ul>
  <li><strong>Camp Dates:</strong> June 29 – August 14, 2026</li>
  <li><strong>Work dates Pre-Summer:</strong> Flexible</li>
  <li><strong>Required Arrival:</strong> out-of-town staff arrive <strong>Thursday, June 25</strong>; in-town staff come for staff training (<strong>Friday, June 26</strong> and Sunday, June 28)</li>
  <li><strong>Hours</strong>: Monday–Thursday, 8:30 AM – 4:00 PM; Friday, 8:30 AM – 2:30 PM</li>
  <li><strong>Reports To</strong>: Camp Director</li>
</ul>

<h3>Position Summary</h3>
<p>The Assistant Camp Director of the Girls Division is a key member of the leadership team at Camp Gan Israel. The purpose of this role is to support and strengthen the Head Counselor while ensuring that camp actually runs smoothly on a day-to-day basis with warmth, structure, and follow-through.</p>
<p>This is not a passive oversight role. Your job is to make sure that plans are carried out, details are handled, and gaps are filled in real time. While this role is supervisory, it is designed to reinforce the Head Counselor's leadership — not replace it — so camp feels supported rather than scattered.</p>
<p>You will work in close partnership with the Camp Director and serve as a bridge between planning and execution, helping translate structure into a well-run, positive camp day that feels calm, upbeat, and cared for.</p>

<h3>Core Responsibilities</h3>
<h2>1. Staff &amp; Program Support</h2>
<p>Your role is to help ensure that the program side of camp actually works in practice — not just on paper — and that the Head Counselor has real backup when practical execution is needed.</p>
<ul>
  <li>Support the Head Counselor in implementing the daily schedule</li>
  <li>Ensure activities are logistically prepared (supplies, setup, timing, responsibilities)</li>
  <li>Help review and finalize activity plans so camp has structure and variety</li>
  <li>Make sure that when the Head Counselor identifies a need, follow-through happens</li>
</ul>
<h2>2. Pre-Season Responsibilities &amp; Orientation</h2>
<p>Strong execution starts with strong preparation, especially in a role built around follow-through.</p>
<ul>
  <li>Provide input on potential staff and assist with onboarding communication when needed</li>
  <li>Participate in all required training sessions (in-person and online), and read through Super Staff Supervision before camp.</li>
  <li>Work closely with the Director to understand camp systems, expectations, and structure</li>
  <li>Become familiar with the camp handbook and UltraCamp systems</li>
</ul>
<h2>3. Pre-Camp Logistics</h2>
<p>Before camp begins, your role is to help ensure everything is actually ready so the first days feel organized instead of reactive.</p>
<ul>
  <li>Arrive by June 25 to assist with setup and orientation</li>
  <li>Help ensure supplies for the first week are ordered and ready</li>
  <li>Assist with last-minute setup and organization</li>
  <li>Review camper needs, allergies, and safety alerts relevant to your role</li>
</ul>
<h2>4. Oversight Without Overstepping</h2>
<p>One of the most important parts of this role is maintaining strong structure without blurring leadership or becoming passive.</p>
<ul>
  <li>Support the Head Counselor without taking over their role or unnecessarily stepping into the Head Counselor lane</li>
  <li>Step in when there is a safety issue, urgent need, coverage gap, or practical follow-through that camp cannot leave hanging</li>
  <li>Handle real-time operational issues when necessary so there is real support and accountability</li>
  <li>Keep the Director informed when issues go beyond a small one-off, while still taking responsibility for appropriate matters</li>
</ul>
<h2>5. Camper Support &amp; Safety</h2>
<p>You are a secondary layer of support when camper issues arise, especially when the Head Counselor is occupied or follow-up is needed.</p>
<ul>
  <li>Assist with behavioral issues, minor practical follow-up, and support when needed</li>
  <li>Ensure incidents, including minor injuries and meaningful follow-up, are properly documented</li>
  <li>Maintain strong supervision standards across camp, and bring bigger or sensitive matters to the Camp Director</li>
  <li>Oversee swim sessions so they run safely, efficiently, and with strong practical oversight.</li>
  <li>Confirm that lifeguards, instructors, and counselors are fulfilling their roles properly during swim.</li>
  <li>Confirm campers are supervised appropriately in locker rooms, pool areas, and in the water.</li>
  <li>Help ensure swim transitions back to camp activities are timely, organized, and well managed.</li>
</ul>
<h3>Emergency Response</h3>
<ul>
  <li>Call Hatzalah / 911 first when necessary</li>
  <li>Then notify the Director immediately</li>
</ul>
<h2>6. Trips &amp; Special Events</h2>
<p>You are responsible for the logistical side of trips and special programming so the Head Counselor can stay focused on campers, counselors, and flow.</p>
<ul>
  <li>Ensure waivers are collected and verified</li>
  <li>Confirm details with vendors and handle coordination</li>
  <li>Manage setup, supplies, transportation details, and practical logistics</li>
  <li>Support the Head Counselor so they can focus on campers, staff, and program flow</li>
  <li>As a practical rule, attend girls division field trips and be present on all trips unless the Director assigns otherwise.</li>
  <li>Serve as the central practical point of coordination during trips while allowing the Head Counselor to lead the groups.</li>
  <li>Maintain communication with the Director during trips so leadership stays aligned and support is available when needed.</li>
</ul>
<h2>7. Electives &amp; Rainy-Day Activities</h2>
<p>Camp rarely goes exactly as planned — your role is to help it adjust smoothly.</p>
<ul>
  <li>Help prepare electives and backup plans</li>
  <li>Support transitions when schedules change</li>
  <li>Ensure structure remains intact during unexpected shifts</li>
</ul>
<h2>8. Logistics, Supplies &amp; Budget</h2>
<p>Your job is to make sure practical needs do not fall through the cracks, and that camp property, supplies, and shared spaces are treated responsibly.</p>
<ul>
  <li>Arrange supplies and setup based on program needs</li>
  <li>Monitor inventory and communicate shortages early</li>
  <li>Handle real-time operational needs when others are occupied</li>
  <li>Keep shared spaces and systems organized</li>
</ul>
<h2>9. Lunch, Arrival &amp; Dismissal</h2>
<p>These are key operational windows where your presence matters most and where steady visibility helps camp feel under control.</p>
<ul>
  <li>Oversee lunch flow and logistics, including receipt of lunch and serving flow</li>
  <li>Help ensure supervision during staff rotations, fill gaps, and keep transitions steady</li>
  <li>Be visible during arrival (8:50–9:10 AM) and dismissal (3:15–3:40 PM) so families and staff experience reliable leadership presence</li>
</ul>
<h2>10. Staff Coordination</h2>
<p>You help keep staff functioning smoothly throughout the day by solving practical issues, filling gaps, and supporting a steady camp feeling.</p>
<ul>
  <li>Ensure staff are where they need to be</li>
  <li>Help solve coverage gaps in real time</li>
  <li>Support staff morale and practical needs</li>
  <li>Identify and address day-to-day challenges proactively rather than waiting for issues to grow.</li>
  <li>Give reminders and redirection in a respectful, professional tone when staff need clarification, coverage, or follow-through.</li>
</ul>
<h3>Communication with Director</h3>
<ul>
  <li>Maintain regular check-ins</li>
  <li>Keep leadership informed of meaningful issues</li>
</ul>
<h2>11. Communication, Technology, and Media</h2>
<p>You are expected to handle appropriate communication independently while keeping leadership informed and practical follow-through moving. Communication should be warm, clear, and never create confusion about bigger issues.</p>
<ul>
  <li>Handle short parent calls, emails, minor updates, and minor injury follow-up when appropriate</li>
  <li>Follow up on small matters rather than escalating everything, and take responsibility where it makes sense</li>
  <li>Keep the Director in the loop beyond very small one-off situations, since she remains the primary parent contact for bigger matters</li>
  <li>Take photos of camp activities throughout the day in an appropriate, timely, and organized way.</li>
  <li>Upload photos to the camp Photo WhatsApp group in a timely and organized manner.</li>
</ul>
<h2>12. General Outlook &amp; Success Metrics</h2>
<p>Success in this role is measured by how smoothly camp runs and how much steadier the day feels because you are there.</p>
<ul>
  <li>Camp flow is organized and consistent</li>
  <li>Practical needs are handled without stress</li>
  <li>The Head Counselor is supported and effective</li>
  <li>Camp feels structured, calm, and upbeat</li>
</ul>
<h2>13. Routines &amp; Daily Presence</h2>
<p>Your presence and awareness are what keep camp running well.</p>
<ul>
  <li>Stay hands-on and active throughout the day</li>
  <li>Watch for areas where things are slipping</li>
  <li>Step in early before problems grow</li>
</ul>
<h2>14. Suggested Daily Schedule (Sample)</h2>
<p>This is a framework, not a rigid schedule.</p>
<ul>
  <li>8:45 AM – Staff arrival and preparation</li>
  <li>9:15 AM – Arrival supervision and early problem-solving</li>
  <li>10:00 AM – Rounds and operational checks</li>
  <li>11:30 AM – Lunch supervision and logistics</li>
  <li>1:00 PM – Support activities, swim, or trips</li>
  <li>3:00 PM – End-of-day preparation</li>
  <li>3:15–3:40 PM – Dismissal support</li>
</ul>
<h2>15. Discipline &amp; Parent Communication</h2>
<ul>
  <li>Follow the camp's discipline structure and Director guidance, supporting consistency without creating mixed messages</li>
  <li>Support the Head Counselor in maintaining consistency</li>
  <li>Handle minor communication when appropriate, but serious issues should not first surface casually at pickup</li>
</ul>
<p>Serious or repeated issues should be brought to the Director, who remains the primary parent contact for bigger matters.</p>
<h2>16. Dress Code &amp; Standards</h2>
<p>As a visible leader in camp, you are expected to model the standards of the division clearly and consistently. This includes both professionalism and tznius standards.</p>
<ul>
  <li>Skirts must cover the knees at all times and may not have slits</li>
  <li>Leg coverings should be no shorter than knee socks</li>
  <li>Sleeves must cover the elbows at all times</li>
  <li>Necklines must remain covered at all times</li>
</ul>
<p>These standards are important to us and are not negotiable.</p>
<h2>17. Pre-Camp Meetings &amp; Discussion Items</h2>
<p>Before camp begins, meet with the Director to clarify:</p>
<ul>
  <li>Supply budgets and approval process</li>
  <li>Discipline and communication guidelines</li>
  <li>Travel, logistics, and responsibilities</li>
  <li>Leadership roles and expectations</li>
</ul>
<h2>18. Terms &amp; Logistics</h2>
<ul>
  <li>Compensation: As agreed upon in contract</li>
  <li>Payment method and timing per contract</li>
  <li>Housing: Provided if applicable</li>
  <li>Transportation: As arranged by camp</li>
  <li>Food: Provided</li>
  <li>Shabbos: Not required</li>
</ul>
<h2>19. Physical Requirements</h2>
<p>This is an active role requiring:</p>
<ul>
  <li>Standing and walking for extended periods</li>
  <li>Participating in camp activities</li>
  <li>Lifting supplies when needed</li>
  <li>Responding quickly to emergencies</li>
</ul>
<h2>20. Post-Summer Wrap-Up &amp; Evaluation</h2>
<ul>
  <li>Assist with supply pack-up and storage</li>
  <li>Provide feedback on camp operations</li>
  <li>Support staff evaluations and reporting</li>
</ul>
<h2>21. After-Camp / Off-Hours Staff Role</h2>
<p>This role has limited after-hours responsibility and is not the main culture-building role after camp. When needed, your off-hours contribution is practical support, not taking over the Head Counselor role.</p>
<ul>
  <li>Provide practical support when needed</li>
  <li>Assist with logistics or staff welfare concerns that should not wait</li>
  <li>Maintain professionalism and boundaries</li>
  <li>Avoid taking over the Head Counselor's culture-building role; support it only in a limited practical way</li>
</ul>

<h2>Closing</h2>
<p>We wish you <strong>Hatzlocha Rabba</strong> and look forward to working together.</p>
<p>Remember, our goal is to make sure everyone — <strong>campers and staff</strong> — has a positive, safe, meaningful, and exciting summer experience. If at any time you feel something in this job description is not lining up with that goal, please let us know. We love feedback and will work hard to resolve issues.</p>
<p>Please feel free to reach out with questions or concerns as needed.</p>
<p>To learn more about our camp program or to complete an application form, visit our website: <strong>www.ganisrael.org</strong></p>`,

  "bus-monitor": `<p><strong>Role summary:</strong> Bus monitors keep the bus safe, calm, and orderly, and are the main link between parents, campers, and camp leadership.</p><p><strong>Hours depend on your route:</strong> pickup as early as 7:45 AM, arrival ~9:00 AM, departure 3:30 PM, final drop-off as late as 4:45 PM. Timeliness is critical.</p><p><strong>Core requirements:</strong> maintain order, assist children on/off safely, build positive relationships, communicate clearly, take accurate attendance, and have a working personal phone available at all times.</p><p><strong>Pickup:</strong> help each child board and reach their seat, take attendance, and make sure every camper is buckled the whole ride.</p><p><strong>Drop-off:</strong> help children off safely, release a child only to an authorized person on the Child Release Form (request ID when needed), walk the bus so no child is left behind, and take attendance.</p><p><strong>While the bus is in motion:</strong> everyone seated and buckled; keep it calm so the driver can focus; know the route and assist substitute drivers if needed.</p><p><strong>Leadership &amp; organization:</strong> stay calm and positive, never yell, ensure no camper is harmed physically or verbally, report serious concerns to the camp office immediately, keep a daily bus list (who is scheduled, who rode, who each child was released to), and run a parent WhatsApp group (share live location during pickup/drop-off, communicate delays). Battery packs / data reimbursement available if needed.</p><p><strong>Communication:</strong> report any concern about camper safety, behavior, or emotional wellbeing immediately, not at the end of the day; document incidents as required.</p><p><strong>Professional development:</strong> participate in the safety orientation at staff training and become fully familiar with all bus procedures.</p>`
};

window.PORTAL_DATA = {
  TRAININGS,
  ROLE_TEMPLATES,
  BASELINE_REQUIRED,
  OPTIONAL_OFFERED,
  INFO_PAGES,
  CALENDAR_IMAGES,
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
