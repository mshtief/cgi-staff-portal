// =============================================================================
// CGI Staff Onboarding Portal — app logic (v2)
// Improvements: hash-based routing (browser back/forward work), toast
// notifications, breadcrumbs, clickable logo → home, admin stats + activity
// feed + search, view-as banner with clean return path.
// =============================================================================

const {
  TRAININGS, ROLE_TEMPLATES, RECENT_ACTIVITY, INFO_PAGES, HANDBOOK_TOPICS,
  CHANA_EMAIL, DIRECTOR_EMAIL,
  resolveRequired, resolveOptional, resolveAdminItems
} = window.PORTAL_DATA;

// STAFF is mutable: starts from baked-in seed, replaced by live sheet data
// when a backend URL is configured (see config.js + loadBackendStaff).
let STAFF = window.PORTAL_DATA.STAFF;

function backendUrl() {
  return (window.PORTAL_CONFIG && window.PORTAL_CONFIG.backendUrl) || "";
}

// "Online mode" = the portal is on a real web address (not file:// or localhost).
// In online mode the page holds NO staff data: it's locked, and each person's
// info is fetched from the sheet only when they log in. On your own computer it
// stays in local mode and uses the real roster in data-live.js for review.
function isOnline() {
  if (window.PORTAL_CONFIG && typeof window.PORTAL_CONFIG.online === "boolean") {
    return window.PORTAL_CONFIG.online;        // explicit override (set on the live deploy)
  }
  const h = location.hostname;
  return location.protocol !== "file:" && h !== "localhost" && h !== "127.0.0.1" && h !== "";
}

// Fetch ONE staffer by their private token/code (action=me).
async function fetchMe(token) {
  const url = backendUrl();
  if (!url || !token) return null;
  try {
    const sep = url.includes("?") ? "&" : "?";
    const res = await fetch(url + sep + "action=me&token=" + encodeURIComponent(token));
    if (!res.ok) return null;
    const s = await res.json();
    return (s && s.id && !s.error) ? s : null;
  } catch (e) { return null; }
}

// Fetch the FULL roster for admin, using the admin key (action=staff&key).
async function fetchAll(key) {
  const url = backendUrl();
  if (!url || !key) return null;
  try {
    const sep = url.includes("?") ? "&" : "?";
    const res = await fetch(url + sep + "action=staff&key=" + encodeURIComponent(key));
    if (!res.ok) return null;
    const data = await res.json();
    return (Array.isArray(data) && data.length) ? data : null;
  } catch (e) { return null; }
}

// Local mode with a backend configured: preload the roster for offline review.
async function loadBackendStaff() {
  if (isOnline()) { STAFF = []; window.PORTAL_DATA.STAFF = []; return; } // locked online
  const url = backendUrl();
  if (!url) return; // prototype mode — use seed/real data already loaded
  // (local + backend is optional; real local review uses data-live.js)
}

// Write a completion back to the sheet (best-effort; localStorage stays the cache).
function postProgress(email, trainingId) {
  const url = backendUrl();
  if (!url || !email) return;
  try {
    fetch(url, {
      method: "POST",
      body: new URLSearchParams({ action: "progress", email, trainingId })
    });
  } catch (e) { /* non-blocking */ }
}

const state = {
  currentUser: null,        // staff record or { isAdmin: true }
  viewingAsStaff: null,     // when admin previews a staff dashboard
  view: "login",
  currentTrainingId: null,
  staffSearch: ""
};

// =============================================================================
// PERSISTENCE
// =============================================================================
function saveProgress(staffId, completed) {
  localStorage.setItem(`progress-${staffId}`, JSON.stringify(completed));
}
function loadProgress(staffId, fallback) {
  const stored = localStorage.getItem(`progress-${staffId}`);
  if (stored) return JSON.parse(stored);
  if (fallback) return [...fallback];
  const staff = STAFF.find(s => s.id === staffId);
  return staff ? [...staff.completed] : [];
}
function saveSession(user) {
  if (!user) { sessionStorage.removeItem("session"); return; }
  // Store the whole record so an online session (no in-page roster) survives reload.
  sessionStorage.setItem("session", JSON.stringify(user));
}
function loadSession() {
  try {
    const raw = sessionStorage.getItem("session");
    if (!raw) return null;
    const u = JSON.parse(raw);
    if (u.isAdmin) return { isAdmin: true, name: u.name || "Admin" };
    if (!u.id) return null;
    // Local mode: prefer the in-page record; online: use the stored one.
    const staff = STAFF.find(s => s.id === u.id) || u;
    staff.completed = loadProgress(staff.id, u.completed);
    return staff;
  } catch { return null; }
}

// =============================================================================
// TOAST SYSTEM — replaces alert() with non-blocking notifications
// =============================================================================
function toast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  const icon = { success: "✓", error: "✕", info: "ℹ" }[type] || "ℹ";
  el.innerHTML = `<span class="toast-icon">${icon}</span><span>${escapeHTML(message)}</span>`;
  container.appendChild(el);
  // Auto-remove after animation (matches CSS 2.7s delay + 0.3s out = 3s)
  setTimeout(() => el.remove(), 3100);
}

// =============================================================================
// HASH-BASED ROUTING — browser back/forward just work
// Routes:
//   #/login              → login screen
//   #/home               → dashboard (staff) or admin (admin user)
//   #/training/<id>      → training module
//   #/admin              → admin panel
//   #/admin/as/<staffId> → admin previewing a staff dashboard
// =============================================================================
function navigate(hash, opts = {}) {
  if (opts.replace) {
    history.replaceState({}, "", hash);
    handleRoute();
  } else {
    location.hash = hash;  // triggers hashchange → handleRoute
  }
}

function handleRoute() {
  const hash = location.hash || "#/login";
  const parts = hash.slice(2).split("/");  // strip "#/" → "training/abc" → ["training","abc"]

  // Route: login
  if (parts[0] === "login" || parts[0] === "") {
    state.currentUser = null;
    state.viewingAsStaff = null;
    showView("login");
    return;
  }

  // Need a session for any authenticated route
  if (!state.currentUser) {
    // Try to restore session from storage
    const restored = loadSession();
    if (restored) {
      state.currentUser = restored;
    } else {
      navigate("#/login", { replace: true });
      return;
    }
  }

  // Route: home
  if (parts[0] === "home") {
    if (state.currentUser.isAdmin) {
      state.viewingAsStaff = null;
      renderAdmin();
      showView("admin");
    } else {
      renderDashboard();
      showView("dashboard");
    }
    return;
  }

  // Route: training/<id>
  if (parts[0] === "training" && parts[1]) {
    state.currentTrainingId = parts[1];
    renderModule();
    showView("module");
    return;
  }

  // Route: info/<id>  (Camp Info & Resources reference pages)
  if (parts[0] === "info" && parts[1]) {
    renderInfo(parts[1]);
    showView("module");
    return;
  }

  // Route: handbook/<index>  (individual handbook topic page)
  if (parts[0] === "handbook" && parts[1] !== undefined) {
    renderHandbookTopic(parseInt(parts[1], 10));
    showView("module");
    return;
  }

  // Route: admin
  if (parts[0] === "admin") {
    if (!state.currentUser.isAdmin) {
      navigate("#/home", { replace: true });
      return;
    }
    if (parts[1] === "as" && parts[2]) {
      const staff = STAFF.find(s => s.id === parts[2]);
      if (staff) {
        staff.completed = loadProgress(staff.id);
        state.viewingAsStaff = staff;
        renderDashboard(staff);
        showView("dashboard");
        return;
      }
    }
    state.viewingAsStaff = null;
    renderAdmin();
    showView("admin");
    return;
  }

  // Unknown route → fallback
  navigate("#/home", { replace: true });
}

window.addEventListener("hashchange", handleRoute);

// =============================================================================
// VIEW SWITCHING
// =============================================================================
function showView(viewName) {
  state.view = viewName;
  ["viewLogin", "viewDashboard", "viewModule", "viewAdmin"].forEach(id => {
    document.getElementById(id).classList.add("hidden");
  });
  const target = document.getElementById("view" + capitalize(viewName));
  if (target) target.classList.remove("hidden");

  const header = document.getElementById("siteHeader");
  const progressBar = document.getElementById("progressBar");
  const viewAsBanner = document.getElementById("viewAsBanner");

  if (viewName === "login") {
    header.classList.add("hidden");
    progressBar.classList.add("hidden");
    viewAsBanner.classList.add("hidden");
  } else {
    header.classList.remove("hidden");
    updateHeaderForUser();

    // Progress bar visible only when a staff dashboard is the focus
    const showProgress = (viewName === "dashboard" || viewName === "module") &&
                          (state.viewingAsStaff || !state.currentUser?.isAdmin);
    progressBar.classList.toggle("hidden", !showProgress);

    // View-as banner when admin is previewing a staff dashboard
    const showViewAs = state.currentUser?.isAdmin && state.viewingAsStaff;
    viewAsBanner.classList.toggle("hidden", !showViewAs);
    if (showViewAs) {
      document.getElementById("viewAsName").textContent = state.viewingAsStaff.name;
    }
  }

  window.scrollTo({ top: 0, behavior: "instant" });
}

function updateHeaderForUser() {
  const user = state.currentUser;
  if (!user) return;

  const logoSub = document.getElementById("logoSub");
  const progressLabel = document.getElementById("progressLabel");
  const progressCount = document.getElementById("progressCount");
  const progressFill = document.getElementById("progressFill");

  // If admin is viewing as a staff member, surface that staff member's progress
  const effectiveUser = state.viewingAsStaff || (user.isAdmin ? null : user);

  if (effectiveUser) {
    const required = resolveRequired(effectiveUser);
    const completed = effectiveUser.completed || [];
    const pct = Math.round((completed.length / required.length) * 100);
    progressCount.textContent = `${completed.length} of ${required.length} complete`;
    progressFill.style.width = pct + "%";
    progressLabel.textContent = pct === 100 ? "🎉 All done!" : `${effectiveUser.name.split(" ")[0]}'s progress`;
    logoSub.textContent = user.isAdmin ? "Admin view" : "Staff Portal";
  } else if (user.isAdmin) {
    logoSub.textContent = "Admin Panel";
  }
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// =============================================================================
// LOGIN
// =============================================================================
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const raw = document.getElementById("loginCode").value.trim();
  const code = raw.toLowerCase();

  // LOCAL mode (your computer): validate against the real roster in the page.
  if (!isOnline()) {
    if (code === "admin") {
      state.currentUser = { isAdmin: true, name: "Mendel (Admin)" };
      saveSession(state.currentUser);
      navigate("#/admin");
      return;
    }
    const staff = STAFF.find(s => s.loginCode.toLowerCase() === code);
    if (!staff) {
      toast("Login not recognized. Please use the link from your email, or contact the camp office.", "error");
      return;
    }
    staff.completed = loadProgress(staff.id);
    state.currentUser = staff;
    saveSession(staff);
    toast(`Welcome back, ${staff.name.split(" ")[0]}!`, "success");
    navigate("#/home");
    return;
  }

  // ONLINE mode (live site): the page holds nothing — ask the sheet.
  if (!backendUrl()) {
    toast("The portal isn't connected to the office yet. Please check back shortly.", "info");
    return;
  }
  toast("Signing you in…", "info");
  const me = await fetchMe(raw);
  if (me) {
    me.completed = loadProgress(me.id, me.completed);
    state.currentUser = me;
    saveSession(me);
    toast(`Welcome, ${me.name.split(" ")[0]}!`, "success");
    navigate("#/home");
    return;
  }
  const roster = await fetchAll(raw);          // maybe this is the admin key
  if (roster) {
    STAFF = roster; window.PORTAL_DATA.STAFF = roster;
    state.currentUser = { isAdmin: true, name: "Admin" };
    saveSession(state.currentUser);
    navigate("#/admin");
    return;
  }
  toast("Login not recognized. Please use the link from your email, or contact the camp office.", "error");
});

// Header nav
document.getElementById("navLogout").addEventListener("click", (e) => {
  e.preventDefault();
  saveSession(null);
  state.currentUser = null;
  state.viewingAsStaff = null;
  document.getElementById("loginCode").value = "";
  navigate("#/login");
});

// Logo click + home link both go to home (handled by href="#/home")
// No JS needed — the hashchange event fires on click.

// =============================================================================
// DASHBOARD VIEW
// =============================================================================
function renderDashboard(forceStaff) {
  const user = forceStaff || state.viewingAsStaff || state.currentUser;
  if (!user || user.isAdmin) return;

  // Locked account — contract not yet returned. Show a friendly hold screen.
  // Admins (viewing as a staffer) bypass the lock so they can review everything.
  if (user.locked && !(state.currentUser && state.currentUser.isAdmin)) {
    document.getElementById("viewDashboard").innerHTML = `
      <div class="welcome-banner">
        <h2>Hi ${escapeHTML(user.name.split(" ")[0])} 👋</h2>
        <p>Welcome — we're excited you're joining us!</p>
      </div>
      <div class="card" style="text-align:center;padding:32px 20px;">
        <div style="font-size:48px;">🔒</div>
        <h2 style="color:var(--navy);margin:12px 0 8px;">Your account is almost ready</h2>
        <p style="color:var(--text-muted);line-height:1.6;">
          We're just waiting on your <strong>signed contract</strong>. As soon as we receive it,
          your full onboarding checklist unlocks right here.
        </p>
        <p style="color:var(--text-muted);line-height:1.6;margin-top:12px;">
          Already sent it? Give us a day to process — or reach the camp office:<br>
          <strong>office@ganisrael.org · (862) 244-3420</strong>
        </p>
      </div>
    `;
    updateHeaderForUser();
    return;
  }

  const role = ROLE_TEMPLATES[user.role];
  const required = resolveRequired(user);
  const todo = required.filter(tId => !user.completed.includes(tId));
  const done = user.completed.length;
  const total = required.length;

  const nextUp = todo.length > 0 ? TRAININGS[todo[0]] : null;

  const groups = {
    "paperwork": { label: "📋 Paperwork & Compliance", items: [] },
    "safety": { label: "🛡️ Safety Training", items: [] },
    "counselor-training": { label: "🎓 Counselor Training", items: [] },
    "video": { label: "📹 Pre-Camp Videos", items: [] },
    "on-site": { label: "🏕️ Camp Training", items: [] }
  };
  required.forEach(tId => {
    const t = TRAININGS[tId];
    if (!t) return;
    (groups[t.category] || groups["paperwork"]).items.push(t);
  });

  // Optional / encouraged items (never counted toward progress)
  const optional = resolveOptional(user).map(id => TRAININGS[id]).filter(Boolean);

  const allDone = todo.length === 0;

  const html = `
    <div class="welcome-banner">
      <h2>Hi ${escapeHTML(user.name.split(" ")[0])} 👋</h2>
      <p>${escapeHTML(role.label)} · ${escapeHTML(capitalize(user.division))} Division</p>
    </div>

    ${allDone ? `
      <div class="card" style="text-align: center; padding: 32px 20px; background: var(--green-light); border-color: var(--green);">
        <div style="font-size: 48px;">🎉</div>
        <h2 style="color: var(--green); margin: 12px 0 6px;">You're all set!</h2>
        <p style="color: #065f46;">All ${total} of your required trainings are complete. We're excited to have you at camp!</p>
      </div>
    ` : `
      <div class="next-up-section">
        <div class="next-up-label">What's next</div>
        <a href="#/training/${nextUp.id}" class="next-up-card">
          <h3>${escapeHTML(nextUp.title)}</h3>
          <div class="meta">${escapeHTML(nextUp.duration)} · ${escapeHTML(formatType(nextUp.type))}</div>
          <div class="cta">${escapeHTML(ctaFor(nextUp.type))} →</div>
        </a>
      </div>
    `}

    ${Object.values(groups).filter(g => g.items.length > 0).map(g => `
      <div class="section-title">${g.label}</div>
      <div class="training-grid">
        ${g.items.map(t => renderTrainingCard(t, user.completed.includes(t.id))).join("")}
      </div>
    `).join("")}

    ${optional.length > 0 ? `
      <div class="section-title">✨ Optional but Recommended</div>
      <p style="font-size:13px;color:var(--text-muted);margin:-6px 4px 12px;">Not required, but genuinely useful — these don't affect your completion.</p>
      <div class="training-grid">
        ${optional.map(t => renderTrainingCard(t, user.completed.includes(t.id), true)).join("")}
      </div>
    ` : ""}

    ${INFO_PAGES && INFO_PAGES.length > 0 ? `
      <div class="section-title">📘 Camp Info &amp; Resources</div>
      <p style="font-size:13px;color:var(--text-muted);margin:-6px 4px 12px;">Good to know — reference anytime. Nothing to complete here.</p>
      <div class="training-grid">
        ${INFO_PAGES.filter(p => !p.ootOnly || user.outOfTown).map(p => `
          <a href="#/info/${p.id}" class="training-card">
            <div class="status-icon" style="background:#eef2ff;color:var(--navy);">${p.icon}</div>
            <div class="body">
              <h3>${escapeHTML(p.title)}</h3>
              <div class="meta"><span>${escapeHTML(p.blurb)}</span></div>
            </div>
            <div class="chevron">›</div>
          </a>
        `).join("")}
      </div>
    ` : ""}
  `;

  document.getElementById("viewDashboard").innerHTML = html;
  updateHeaderForUser();
}

function renderTrainingCard(t, isDone, isOptional) {
  return `
    <a href="#/training/${t.id}" class="training-card ${isDone ? 'done' : ''}">
      <div class="status-icon ${isDone ? 'done' : (isOptional ? 'optional' : 'todo')}">${isDone ? '✓' : (isOptional ? '✨' : '')}</div>
      <div class="body">
        <h3>${escapeHTML(t.title)}</h3>
        <div class="meta">
          <span>${escapeHTML(t.duration)}</span>
          <span>${escapeHTML(formatType(t.type))}</span>
        </div>
      </div>
      <div class="chevron">›</div>
    </a>
  `;
}

function formatType(type) {
  const map = {
    "external-task": "Action needed",
    "external-course": "Online course",
    "fillable-form": "Fill out form",
    "upload": "Upload",
    "doc-sign": "Read & sign",
    "in-person": "In person",
    "video": "Video",
    "optional-request": "Request"
  };
  return map[type] || type;
}

// Call-to-action verb that matches what the item actually is (not always "training").
function ctaFor(type) {
  const map = {
    "external-task": "See what to do",
    "external-course": "Start this course",
    "fillable-form": "Fill out this form",
    "upload": "Upload your document",
    "doc-sign": "Read & sign",
    "in-person": "See the details",
    "video": "Watch the video",
    "optional-request": "Learn more"
  };
  return map[type] || "Open";
}

// =============================================================================
// MODULE VIEW (with breadcrumbs)
// =============================================================================
function renderModule() {
  const t = TRAININGS[state.currentTrainingId];
  const user = state.viewingAsStaff || state.currentUser;
  if (!t || !user) {
    toast("Training not found.", "error");
    navigate("#/home", { replace: true });
    return;
  }
  const isDone = user.completed && user.completed.includes(t.id);
  const container = document.getElementById("viewModule");

  // Breadcrumb home link depends on context
  const homeHref = state.viewingAsStaff ? `#/admin/as/${state.viewingAsStaff.id}` : "#/home";
  const homeLabel = state.currentUser?.isAdmin && state.viewingAsStaff
    ? `${state.viewingAsStaff.name.split(" ")[0]}'s Dashboard`
    : "My Training";

  let html = `
    <nav class="breadcrumbs" aria-label="Breadcrumbs">
      <a href="${homeHref}">← ${escapeHTML(homeLabel)}</a>
      <span class="separator">/</span>
      <span class="current">${escapeHTML(t.title)}</span>
    </nav>

    <div class="module-header">
      <h1>${escapeHTML(t.title)}</h1>
      <div class="meta">
        <span>⏱ ${escapeHTML(t.duration)}</span>
        <span>👤 ${escapeHTML(t.provider)}</span>
        <span>${formatType(t.type)}</span>
        ${isDone ? '<span style="color: var(--green); font-weight: 600;">✓ Complete</span>' : ''}
      </div>
      <p class="description">${escapeHTML(t.description)}</p>
    </div>
  `;

  // ─── External course (Kudan / chinuchtools) ───
  if (t.type === "external-course") {
    // Code depends on whether the STAFF MEMBER is a boy or girl (not the division).
    // codeGroup is set per staff; fallback: boys division -> boys, else girls.
    const codeKey = user.codeGroup || (user.division === 'boys' ? 'boys' : 'girls');
    html += `
      <div class="external-card">
        <h4>📚 Online course — ${escapeHTML(t.provider)}</h4>
        <p>${escapeHTML(t.action)}</p>
        ${t.accessCodes ? `
          <div class="access-codes">
            <strong>Your access code</strong>
            <code>${t.accessCodes[codeKey]}</code>
          </div>
        ` : ""}
        ${t.externalUrl ? `<a href="${t.externalUrl}" target="_blank" rel="noopener" class="btn btn-accent btn-full">Open ${escapeHTML(t.provider)} →</a>` : ""}
      </div>
    `;
  }

  // ─── External task (IdentoGO fingerprints, bg-check invite) ───
  if (t.type === "external-task") {
    html += `
      <div class="external-card">
        <h4>📝 What to do</h4>
        <p>${escapeHTML(t.action || "Complete the task below.")}</p>
        ${t.externalUrl ? `<a href="${escapeHTML(t.externalUrl)}" target="_blank" rel="noopener" class="btn btn-accent btn-full" style="margin-top:8px;">Open ${escapeHTML(t.provider || "link")} →</a>` : ""}
      </div>
    `;
  }

  // ─── Important codes (IdentoGO service/case, or NJ working-papers employer code) ───
  if (t.serviceCode || t.caseNumber || t.employerCode) {
    html += `
      <div class="card" style="background:#eff6ff;border-color:#bfdbfe;">
        <h3 style="color:#1e40af;">🔑 Important codes — write these down</h3>
        ${t.serviceCode ? `
          <div style="margin-bottom:10px;">
            <div style="font-size:12px;color:var(--text-muted);font-weight:600;">Service Code</div>
            <div class="code-chip">${escapeHTML(t.serviceCode)}</div>
          </div>` : ""}
        ${t.caseNumber ? `
          <div>
            <div style="font-size:12px;color:var(--text-muted);font-weight:600;">Contributor Case Number</div>
            <div class="code-chip">${escapeHTML(t.caseNumber)}</div>
          </div>` : ""}
        ${t.employerCode ? `
          <div>
            <div style="font-size:12px;color:var(--text-muted);font-weight:600;">Camp Employer Code (8-digit)</div>
            <div class="code-chip">${escapeHTML(t.employerCode)}</div>
          </div>` : ""}
      </div>
    `;
  }

  // ─── Step-by-step instructions ───
  if (t.instructions && t.instructions.length > 0) {
    html += `
      <div class="card">
        <h3>Step-by-step</h3>
        <ol style="padding-left:24px;line-height:1.7;">
          ${t.instructions.map(step => `<li style="margin-bottom:6px;">${escapeHTML(step)}</li>`).join("")}
        </ol>
      </div>
    `;
  }

  // ─── Fillable form: Employment History ───
  if (t.type === "fillable-form" && t.formKind === "employment-history") {
    html += renderEmploymentHistoryForm(user, isDone);
  }

  // ─── Fillable form: W-9 ───
  if (t.type === "fillable-form" && t.formKind === "w9") {
    html += `
      <div class="card">
        <h3>W-9 — Request for Taxpayer ID</h3>
        <p style="color:var(--text-muted);font-size:13px;margin-bottom:12px;">This is the standard IRS Form W-9 that contractors complete so we can issue your 1099. Fill it in below.</p>
        <form id="dataForm">
          ${formField("1. Full legal name (as on your tax return)", "w9name", user.name, isDone)}
          ${formField("2. Business name / disregarded entity (if different — otherwise leave blank)", "w9biz", "", isDone)}
          <label style="display:block;font-size:13px;font-weight:600;margin:10px 0 4px;">3. Federal tax classification</label>
          <select id="w9class" ${isDone ? "disabled" : ""} style="width:100%;padding:12px 14px;border:1.5px solid var(--border);border-radius:8px;font-size:16px;background:white;">
            <option>Individual / sole proprietor or single-member LLC</option>
            <option>C Corporation</option>
            <option>S Corporation</option>
            <option>Partnership</option>
            <option>Trust / estate</option>
            <option>Limited liability company (LLC)</option>
            <option>Other</option>
          </select>
          ${formField("4. Address (number, street, apt)", "w9addr", "", isDone)}
          ${formField("5. City, State, ZIP", "w9csz", "", isDone)}
          ${formField("6. Taxpayer ID — SSN (individuals) or EIN", "w9tin", "", isDone, "###-##-#### or ##-#######")}
          <p style="background:#f9fafb;border-left:3px solid var(--navy);padding:10px 12px;border-radius:6px;font-size:13px;margin:14px 0;">By signing, you certify (under penalties of perjury) that the TIN above is correct, that you are not subject to backup withholding, and that you are a U.S. person.</p>
          ${formField("Signature (type your full name)", "w9sig", "", isDone)}
          ${formField("Date", "w9date", "", isDone, "MM/DD/YYYY")}
          <button type="submit" class="btn btn-primary btn-full mt-3" ${isDone ? 'disabled' : ''}>
            ${isDone ? '✓ Submitted' : 'Submit W-9'}
          </button>
        </form>
        <p style="font-size:12px;color:var(--text-muted);margin-top:10px;">🔒 Private — used only to issue your 1099. (Final version will match the official IRS W-9 PDF.)</p>
      </div>
    `;
  }

  // ─── Fillable form: Renewal Letter (certify + e-sign) ───
  if (t.type === "fillable-form" && t.formKind === "renewal-letter") {
    html += `
      <div class="card">
        <h3>Certification</h3>
        <p style="background:#f9fafb;border-left:3px solid var(--navy);padding:12px 14px;border-radius:6px;font-style:italic;margin-bottom:16px;">
          "${escapeHTML(t.certifyText)}"
        </p>
        <form id="dataForm">
          ${formField("Full name", "rlName", user.name, isDone)}
          ${formField("Signature (type your full name)", "rlSig", "", isDone)}
          ${formField("Date", "rlDate", "", isDone, "MM/DD/YYYY")}
          <label class="quiz-option" style="margin-top:8px;">
            <input type="checkbox" id="rlAgree" ${isDone ? 'checked disabled' : 'required'}>
            <span>I certify the above statement is true.</span>
          </label>
          <button type="submit" class="btn btn-primary btn-full mt-3" ${isDone ? 'disabled' : ''}>
            ${isDone ? '✓ Submitted — ready to print & notarize' : 'Submit certification'}
          </button>
        </form>
        <p style="font-size:12px;color:var(--text-muted);margin-top:10px;">After you submit, the office prints this, has it notarized, and files it.</p>
      </div>
    `;
  }

  // ─── Upload (home-country bg check, or any allowUpload item) ───
  if (t.type === "upload" || t.allowUpload) {
    html += renderUploadCard(t, isDone);
  }

  // ─── Staff Handbook: clickable table of contents (tap a topic to read it) ───
  if (t.id === "staff-handbook" && HANDBOOK_TOPICS && HANDBOOK_TOPICS.length) {
    html += `<p style="color:var(--text-muted);margin:-4px 4px 14px;">Tap any topic to read it. When you've gone through them, acknowledge at the bottom.</p>`;
    html += `<div class="training-grid">` + HANDBOOK_TOPICS.map((topic, i) => `
      <a href="#/handbook/${i}" class="training-card">
        <div class="status-icon" style="background:#eef2ff;color:var(--navy);font-size:13px;">${i + 1}</div>
        <div class="body"><h3>${escapeHTML(topic.title)}</h3></div>
        <div class="chevron">›</div>
      </a>
    `).join("") + `</div>`;
    html += `
      <div class="card" style="margin-top:16px;">
        ${!isDone ? `
          <label class="quiz-option">
            <input type="checkbox" id="docAgree" required>
            <span>I have read and understand the Staff Handbook.</span>
          </label>
          <button class="btn btn-primary btn-full mt-3" id="docSignBtn">I agree</button>
        ` : `<p style="color:var(--green);font-weight:600;">✓ Acknowledged — thank you!</p>`}
      </div>
    `;
  }

  // ─── Doc-sign (other read-&-sign docs, e.g. head-counselor expectations) ───
  else if (t.type === "doc-sign") {
    html += `
      <div class="card">
        <h3>Read &amp; acknowledge</h3>
        <p style="color:var(--text-muted);margin-bottom:14px;">Please read the document, then confirm below.</p>
        ${(t.resources || []).map(r => `
          <a href="${r.url}" class="btn btn-ghost btn-full" style="margin-bottom:10px;">📄 ${escapeHTML(r.label)}</a>
        `).join("")}
        ${!isDone ? `
          <label class="quiz-option" style="margin-top:8px;">
            <input type="checkbox" id="docAgree" required>
            <span>I have read and understand this document.</span>
          </label>
          <button class="btn btn-primary btn-full mt-3" id="docSignBtn">I agree</button>
        ` : `<p style="color:var(--green);font-weight:600;">✓ Acknowledged</p>`}
      </div>
    `;
  }

  // ─── Pre-camp Video ───
  if (t.type === "video") {
    if (t.comingSoon && !t.videoUrl) {
      html += `
        <div class="video-placeholder">
          <div class="content">
            <div class="play-icon">🎬</div>
            <strong>Video coming soon</strong>
            <div class="note">Your director is preparing this video. Check back — it'll appear here when it's ready.</div>
          </div>
        </div>
      `;
    } else {
      html += `
        <div class="video-embed">
          ${t.videoUrl
            ? `<iframe src="${escapeHTML(t.videoUrl)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="width:100%;aspect-ratio:16/9;border:0;border-radius:var(--radius);"></iframe>`
            : ""}
        </div>
        ${!isDone ? `
          <div class="card"><h3>When you've watched it</h3>
            <button class="btn btn-primary btn-full" id="watchBtn">✓ I've watched this video</button>
          </div>
        ` : `<div class="card"><p style="color:var(--green);font-weight:600;">✓ Watched</p></div>`}
      `;
    }
  }

  // ─── In-person attendance (dates differ by division) ───
  if (t.type === "in-person") {
    const d = user.division;
    let when;
    if (d === "girls") {
      when = "Staff training: <strong>Friday, June 26</strong> and <strong>Sunday, June 28</strong>" +
             (user.outOfTown ? "<br><span style='font-size:14px;'>Out-of-town: arrive <strong>Thursday, June 25</strong></span>" : "");
    } else if (d === "kiddie") {
      when = "Training &amp; setup: <strong>Friday, June 26 · 9:00 AM – 2:00 PM</strong>";
    } else {
      const jc = user.role === "junior-counselor";
      when = "Staff training: <strong>Sunday, June 28 · " + (jc ? "12:00 PM – 3:00 PM" : "12:00 PM – 6:00 PM") + "</strong>" +
             (jc ? "<br><span style='font-size:14px;'>Junior Counselors: 12:00–3:00. All other boys staff stay until 6:00.</span>"
                 : "<br><span style='font-size:14px;'>Boys staff training runs 12:00–6:00 PM.</span>") +
             (user.outOfTown ? "<br><span style='font-size:14px;'>Out-of-town: arrive <strong>Sunday morning, June 28</strong>.</span>" : "");
    }
    html += `
      <div class="card">
        <h3>📅 When &amp; where</h3>
        <p style="font-size:16px;color:var(--navy);margin-bottom:6px;">${when}</p>
        <p style="color:var(--text-muted);">Taught in person — we cover daily camp operations, your role, the daily flow, safety, and working with kids. Plan to be there. (Your director will confirm the exact location.)</p>
        ${!isDone ? `
          <button class="btn btn-primary btn-full mt-3" id="attendBtn">✓ Got it — I'll be there</button>
        ` : `<p style="color:var(--green);font-weight:600;margin-top:12px;">✓ Confirmed</p>`}
      </div>
    `;
  }

  // ─── Optional request (First Aid / Mandated Reporter) ───
  if (t.type === "optional-request") {
    const mailto = `mailto:${encodeURIComponent(t.requestEmail)}?subject=${encodeURIComponent(t.requestSubject)}&body=${encodeURIComponent(`Hi Chana,\n\nI'd like to sign up for the free First Aid/CPR training.\n\nName: ${user.name}\nRole: ${ROLE_TEMPLATES[user.role].label}\n\nThanks!`)}`;
    html += `
      <div class="card" style="background:#fffbeb;border-color:#fde68a;">
        <h3 style="color:#92400e;">✨ Want in? It's free.</h3>
        <p style="color:#78350f;margin-bottom:14px;">Tap below and Chana will reach out to schedule you for the free Zoom course. The camp covers the cost for staff 16 and over.</p>
        ${!isDone ? `
          <a href="${mailto}" class="btn btn-accent btn-full" id="requestBtn">🙋 I'm interested — let Chana know</a>
        ` : `<p style="color:var(--green);font-weight:600;">✓ Request sent — Chana will be in touch</p>`}
      </div>
    `;
  }

  // ─── Resources (generic) ───
  if (t.resources && t.resources.length > 0 && t.type !== "doc-sign") {
    html += `
      <div class="card">
        <h3>Resources</h3>
        <ul class="resources-list">
          ${t.resources.map(r => `
            <li><a href="${r.url}"><div class="file-icon">📄</div><span>${escapeHTML(r.label)}</span></a></li>
          `).join("")}
        </ul>
      </div>
    `;
  }

  // ─── Generic mark-complete (only for external-course; tasks handle their own) ───
  if (t.type === "external-course" && !isDone) {
    html += `
      <div class="card">
        <h3>When you're done</h3>
        <button class="btn btn-primary btn-full" id="markCompleteBtn">I've finished the course &amp; uploaded my certificate</button>
      </div>
    `;
  }

  container.innerHTML = html;
  wireModuleHandlers(t, isDone);
}

// =============================================================================
// MODULE — form/upload helpers
// =============================================================================
function formField(label, id, value, disabled, placeholder) {
  return `
    <label style="display:block;font-size:13px;font-weight:600;margin:10px 0 4px;">${escapeHTML(label)}</label>
    <input type="text" id="${id}" value="${escapeHTML(value || "")}" ${placeholder ? `placeholder="${escapeHTML(placeholder)}"` : ""} ${disabled ? "disabled" : ""}
      style="width:100%;padding:12px 14px;border:1.5px solid var(--border);border-radius:8px;font-size:16px;">
  `;
}

// =============================================================================
// STAFF HANDBOOK — individual topic page (tap-through from the contents)
// =============================================================================
function renderHandbookTopic(i) {
  const topics = HANDBOOK_TOPICS || [];
  if (isNaN(i) || i < 0 || i >= topics.length) { navigate("#/training/staff-handbook", { replace: true }); return; }
  const topic = topics[i];
  const prev = i > 0 ? `<a href="#/handbook/${i - 1}" class="btn btn-ghost btn-sm">← ${escapeHTML(topics[i-1].title)}</a>` : "<span></span>";
  const next = i < topics.length - 1 ? `<a href="#/handbook/${i + 1}" class="btn btn-ghost btn-sm">${escapeHTML(topics[i+1].title)} →</a>` : `<a href="#/training/staff-handbook" class="btn btn-primary btn-sm">Done — back to contents ✓</a>`;
  document.getElementById("viewModule").innerHTML = `
    <nav class="breadcrumbs" aria-label="Breadcrumbs">
      <a href="#/home">← Home</a>
      <span class="separator">/</span>
      <a href="#/training/staff-handbook">Handbook</a>
      <span class="separator">/</span>
      <span class="current">${escapeHTML(topic.title)}</span>
    </nav>
    <div class="module-header">
      <h1>${i + 1}. ${escapeHTML(topic.title)}</h1>
    </div>
    <div class="card">${topic.html}</div>
    <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;margin-top:4px;flex-wrap:wrap;">
      ${prev}${next}
    </div>
  `;
}

// =============================================================================
// CAMP INFO & RESOURCES — reference pages (read-only, division/role aware)
// =============================================================================
// Which job-description key applies to a staffer (role + division + position).
// The backend supplies user.jdKey; this is the fallback for local/seed data.
function jdKeyFor(user) {
  if (user.jdKey) return user.jdKey;
  const d = user.division, r = user.role, pos = (user.position || "").toLowerCase();
  if (d === "kiddie") {
    if (r === "kiddie-lead-teacher") return /director/.test(pos) ? "kiddie-director" : "kiddie-lead-teacher";
    return "kiddie-assistant";
  }
  const pre = d === "girls" ? "girls" : "boys";
  if (r === "head-counselor") return /assistant director/.test(pos) ? pre + "-assistant-director" : pre + "-head-counselor";
  if (r === "junior-counselor") return pre + "-junior-counselor";
  return pre + "-counselor";
}

function renderInfo(id) {
  const user = state.viewingAsStaff || state.currentUser || {};
  const div = user.division || "boys";
  const isHead = user.role === "head-counselor";
  const isKiddie = div === "kiddie";
  const isTznius = div === "girls" || div === "kiddie";
  const meta = (INFO_PAGES || []).find(p => p.id === id) || { title: "Camp Info", icon: "📘" };

  // section helper
  const sec = (h, bodyHtml) => `<div class="card"><h3>${h}</h3>${bodyHtml}</div>`;
  const ul = (items) => `<ul style="padding-left:20px;line-height:1.7;margin:0;">${items.map(i => `<li>${i}</li>`).join("")}</ul>`;

  let body = "";

  if (id === "job-description") {
    const JDS = window.PORTAL_DATA.JOB_DESCRIPTIONS || {};
    const main = JDS[jdKeyFor(user)];
    body = main
      ? `<div class="card">${main}</div>`
      : sec("Your Job Description", "<p>Your role's job description will be added shortly. Questions? Contact the camp office at <strong>office@ganisrael.org</strong>.</p>");
    if (user.busMonitor && JDS["bus-monitor"]) {
      body += `<div class="card"><h3>🚌 You're also a Bus Monitor</h3>${JDS["bus-monitor"]}</div>`;
    }
  }

  else if (id === "first-day") {
    const where = isKiddie
      ? "<strong>Kiddie Camp is at the Rabbinical College (RCA campus).</strong> Head to your classroom and get it set up."
      : div === "girls"
      ? "<strong>Girls Division is at the Sussex Avenue School, 226 Sussex Avenue</strong> (about a minute from the Rabbinical College)."
      : "<strong>Boys Division is at the Rabbinical College (RCA campus).</strong> When you arrive, head to the <strong>picnic area</strong> for morning lineup; afternoon pickup is at the First Circle by the Boys' Cheder.";
    const arrive = isHead ? "8:30 AM" : "8:45 AM";
    body =
      sec("🎉 Welcome!", `<p>Camp starts <strong>Monday, June 29, 2026</strong>. We're so glad you're on the team.</p>`) +
      sec("📍 Where to go", `<p>${where}</p>`) +
      sec("⏰ When to arrive", `<p>Be fully ready by <strong>${arrive}</strong> (camp runs 9:00 AM–3:30 PM Mon–Thu, and 9:00 AM–2:00 PM Friday).</p>`) +
      sec("✅ First things to do", ul([
        "Find your Head Counselor / division head and check in",
        "Take attendance for your bunk first thing",
        "Learn your bunk's allergies and any medical notes",
        "Have your charged walkie-talkie and the day's schedule on you"
      ])) +
      sec("🎒 Come prepared", `<p>Daven and eat breakfast before camp, dress for the weather, and bring a water bottle. <strong>Phone policy depends on your role:</strong> Counselors and Junior Counselors don't carry a phone during camp (you'll use a walkie-talkie); Head Counselors and Kiddie staff may keep a phone for emergencies only.</p>`);
  }

  else if (id === "daily-schedule") {
    body =
      sec("🕘 Camp hours", `<p><strong>Mon–Thu:</strong> 9:00 AM – 3:30 PM<br><strong>Friday:</strong> 9:00 AM – 2:00 PM (early for Shabbos)</p>`) +
      sec("📋 A typical day", ul([
        "<strong>9:00</strong> — Welcome &amp; Lineup",
        "<strong>9:30</strong> — Davening",
        "<strong>10:00</strong> — Electives / activities",
        "<strong>10:45</strong> — Learning &amp; snack",
        "<strong>11:00</strong> — Activities / art / swim rotation begins",
        "<strong>12:00</strong> — Lunch",
        "<strong>12:45–3:00</strong> — Swim (staggered) &amp; afternoon activities",
        "<strong>3:00</strong> — Snack",
        "<strong>3:15</strong> — Group Jam (camp-wide closing)",
        "<strong>3:25–3:40</strong> — Dismissal"
      ])) +
      sec("🏊 Swim", `<p>${
        div === "girls"
          ? "Girls swim at <strong>Morristown High School</strong>."
          : div === "kiddie"
          ? "Kiddie Camp swims at the <strong>Rabbinical College campus</strong>."
          : "Boys swim at the <strong>Rabbinical College campus</strong>."
      } Swim days <strong>vary by division and week</strong> (for example, none during the Nine Days) — check your weekly schedule, and remind campers to bring a suit &amp; towel on swim days.</p>`) +
      sec("💡 Good to know", ul([
        "Lunch is at noon, and the day ends with a short camp-wide \"Group Jam\" (song &amp; dance) before dismissal",
        "Fridays end early (2:00 PM) for Shabbos",
        "After dismissal, review the day and prep for tomorrow before you leave"
      ]));
  }

  else if (id === "camp-calendar") {
    body =
      sec("📅 Season", `<p><strong>Monday, June 29 – Friday, August 14, 2026</strong> (7 weeks). Fridays end at 2:00 PM.</p>`) +
      sec("🚫 Days off", ul([
        "Friday, July 4 — No camp",
        "Wednesday, July 30 — No camp (Tisha B'Av)"
      ])) +
      sec("✈️ This summer's theme: \"Flying\"", ul([
        "Week 1 — Flying into the Summer",
        "Week 2 — Flying into Space",
        "Week 3 — Flying Wild &amp; Wacky",
        "Week 4 — Flying High",
        "Week 5 — Flying Around the World",
        "Week 6 — Flying with Friends",
        "Week 7 — Flying into the Future"
      ])) +
      sec("🎨 Each week", `<p>There's a dress-up day and a Friday Shabbat Party every week. Your Head Counselor will share the specifics and how to prep.</p>`) +
      sec("🚌 Trips", `<p>Each division goes on trips throughout the summer (arcades, gymnastics, farms, amusement parks, and more). <strong>Wear your camp shirt on trip days.</strong> The big <strong>Grand Trip to Dorney Park</strong> is for Division A on August 11. Your Head Counselor will give you each week's trip details.</p>`);
  }

  else if (id === "key-policies") {
    const dress = isTznius
      ? "<strong>Tznius dress:</strong> skirts cover the knees with no slits, sleeves cover the elbows, necklines covered — at all times. Not negotiable."
      : "<strong>Boys dress:</strong> button-down shirt for davening &amp; learning; modest camp-appropriate clothing otherwise; no jeans or shorts; haircuts to yeshiva standards. Not negotiable.";
    body =
      sec("📵 Phones", `<p>No personal phone use during the camp day — <strong>emergencies and camp photos only</strong>. Communicate by walkie-talkie.</p>`) +
      sec("👕 Dress code", `<p>${dress}</p>`) +
      sec("🛡️ Boundaries — the Rule of Three", ul([
        "Never be alone one-on-one with a camper — always two staff, or staff + a group",
        "Only high-fives or brief side-hugs; no lap-sitting or prolonged contact",
        "Never private-message a camper (Instagram, WhatsApp, Snapchat, etc.) — ever"
      ])) +
      sec("📣 Mandated reporting", `<p>Every staff member is a mandatory reporter. Report any concern up the chain: <strong>your Head Counselor → Assistant Director → Camp Directors</strong>. In an emergency, call Hatzoloh / 911 first, then notify leadership.</p>`) +
      sec("🥪 Food", `<p>This is a <strong>nut-free and meat-free</strong> camp. Camper lunches must be dairy or parve — no meat, no nuts, no glass.</p>`) +
      sec("👀 Supervision", ul([
        "Campers are never left unattended",
        "Ratios are legal requirements (older divisions 1:8, Kiddie 1:7)",
        "Swim, trips, sports and archery always need at least two staff"
      ]));
  }

  else if (id === "contacts") {
    body =
      sec("📞 Camp office", `<p><strong>office@ganisrael.org</strong><br>(862) 244-3420</p>`) +
      sec("🧭 Chain of command", `<p>${isKiddie
        ? "Assistant Counselor → Counselor → Kiddie Camp Director → Camp Directors"
        : "Junior Counselor → Counselor → Head Counselor → Assistant Director → Camp Directors"}</p><p style="color:var(--text-muted);font-size:13px;">Bring day-to-day questions to your direct supervisor first; serious or sensitive matters go up the chain.</p>`) +
      sec("❓ Before camp", `<p>Questions about onboarding? Reply to your onboarding email or contact the camp office above.</p>`);
  }

  else if (id === "out-of-town") {
    const boys = div === "boys";
    body =
      sec("✈️ You're taken care of", `<p>As an out-of-town staff member, we handle your housing, food, and travel so you can focus on camp. Here's how it works.</p>`) +
      sec("📅 Arrival & departure", `<p>Arrive: <strong>${boys ? "Sunday morning, June 28" : "Thursday, June 25"}</strong>.<br>Leave: <strong>Sunday, August 16</strong> — or right after camp on <strong>August 14</strong> if you're heading somewhere local (like Crown Heights).</p>`) +
      sec("🏠 Where you'll stay", boys
        ? `<p>Room and board at the <strong>Rabbinical College / Yeshiva</strong>, with a washer and dryer available. Bring your own linens.</p>`
        : `<p>Housed in <strong>Morristown on Tikva Way</strong> — three per room, with basic furniture provided. Pillows and blankets are available on request (especially if you're flying in). Bring your own linens if you like something fresh, or just ask and we'll provide them.</p>`) +
      sec("🍽️ Food", boys
        ? `<p>All meals are served at the <strong>Yeshiva kitchen</strong>, and lunch is at camp.</p>`
        : `<p>A hot dinner every night — usually <strong>three delivered, one BBQ, and one night out</strong> (camp chips in $10–$20). You're also welcome to <strong>cook together once or twice a week</strong> — send us the list and we'll stock it. Breakfast: we <strong>fully stock your house</strong> (kosher order placed Sunday afternoon, arrives Monday after camp; plus a weekly Walmart/ShopRite run). Lunch is at camp.</p>`) +
      sec("🚗 Travel", `<p>The camp books your flight to <strong>Newark (EWR)</strong> — we'd rather pay for the flight directly than reimburse. We arrange an <strong>Uber</strong> from Newark to camp. (Flights over $300 may reduce the stipend.)</p>`) +
      sec("🕙 Curfew", `<p><strong>10:00 PM</strong> back at your living quarters. Need an extension? Arrange it with your head counselor or a director.</p>`) +
      sec(boys ? "🕊️ Davening" : "📖 Learning", boys
        ? `<p><strong>Minyan at 7:40 AM</strong> every morning (with the on-time minyan bonus), plus a staff seder.</p>`
        : `<p>A <strong>weekly shiur</strong> given by one of the Rabbis or Rebbetzins.</p>`) +
      sec("🕯️ Shabbos — always looked after", boys
        ? `<p>You'll never be on your own for Shabbos. Your options: stay at the Yeshiva, get set up as shluchim, or go to Crown Heights — and the directors host you, usually for two Shabboses.</p>`
        : `<p>You'll never be on your own for Shabbos. Your options: stay on Tikva Way, visit someone nearby, go to Crown Heights, get paired with a host family, or join the directors — usually for two or three Shabbosim.</p>`);
  }

  else {
    body = sec("Coming soon", "<p>This page is being prepared.</p>");
  }

  document.getElementById("viewModule").innerHTML = `
    <nav class="breadcrumbs" aria-label="Breadcrumbs">
      <a href="#/home">← Home</a>
      <span class="separator">/</span>
      <span class="current">${escapeHTML(meta.title)}</span>
    </nav>
    <div class="module-header">
      <h1>${meta.icon} ${escapeHTML(meta.title)}</h1>
    </div>
    ${body}
  `;
}

function renderEmploymentHistoryForm(user, isDone) {
  // References are pre-filled from the master sheet / application where available.
  const ref1 = user.ref1 || "";
  const ref2 = user.ref2 || "";
  const hasRefs = ref1 || ref2;
  return `
    <div class="card">
      <h3>Your employment history &amp; references</h3>
      <p style="color:var(--text-muted);font-size:13px;margin-bottom:14px;">
        ${hasRefs ? "We pre-filled the references you gave on your application — review them, fix anything, and add what's missing." : "Add your past employment and 3 references below."}
      </p>
      <form id="dataForm">
        <div style="font-size:12px;font-weight:700;color:var(--navy);text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px;">Most recent employer</div>
        <div style="background:#f9fafb;border-radius:10px;padding:14px;margin-bottom:12px;">
          ${formField("Employer / organization", "eh1org", "", isDone)}
          ${formField("Address & phone", "eh1addr", "", isDone)}
          ${formField("Dates (from – to)", "eh1dates", "", isDone)}
          ${formField("Supervisor name & contact", "eh1sup", "", isDone)}
        </div>
        <div id="extraJobs"></div>
        ${!isDone ? `<button type="button" class="btn btn-ghost btn-full" id="addJobBtn" style="margin-bottom:14px;">＋ Add another job</button>` : ""}

        <div style="font-size:12px;font-weight:700;color:var(--navy);text-transform:uppercase;letter-spacing:.04em;margin:8px 0 6px;">3 References (name &amp; phone)</div>
        ${formField("Reference 1", "ref1", ref1, isDone)}
        ${formField("Reference 2", "ref2", ref2, isDone)}
        ${formField("Reference 3", "ref3", "", isDone)}

        <button type="submit" class="btn btn-primary btn-full mt-3" ${isDone ? 'disabled' : ''}>
          ${isDone ? '✓ Submitted' : 'Submit employment history'}
        </button>
      </form>
    </div>
  `;
}

function renderUploadCard(t, isDone) {
  const label = t.uploadLabel || "Upload your document";
  if (isDone) {
    return `<div class="card"><h3>${escapeHTML(label)}</h3><p style="color:var(--green);font-weight:600;">✓ Uploaded</p></div>`;
  }
  return `
    <div class="card">
      <h3>${escapeHTML(label)}</h3>
      <p style="color:var(--text-muted);font-size:13px;margin-bottom:14px;">Snap a photo or pick a PDF from your phone. One tap.</p>
      <label class="upload-drop" id="uploadDrop">
        <input type="file" id="uploadInput" accept="image/*,application/pdf" capture="environment" style="display:none;">
        <div class="upload-icon">📷</div>
        <div class="upload-text">Tap to upload</div>
        <div class="upload-sub">Photo or PDF</div>
      </label>
      <div id="uploadFileName" style="display:none;margin-top:12px;font-size:14px;"></div>
      <button class="btn btn-primary btn-full mt-3" id="uploadConfirmBtn" style="display:none;">Submit upload</button>
    </div>
  `;
}

// =============================================================================
// MODULE — event wiring (all handlers in one place after render)
// =============================================================================
function wireModuleHandlers(t, isDone) {
  const markBtn = document.getElementById("markCompleteBtn");
  if (markBtn) markBtn.addEventListener("click", () => markTrainingComplete(t.id));

  // Generic data form (employment history, w9, renewal letter)
  const dataForm = document.getElementById("dataForm");
  if (dataForm && !isDone) {
    dataForm.addEventListener("submit", (e) => {
      e.preventDefault();
      toast("Saved & submitted ✓", "success");
      setTimeout(() => markTrainingComplete(t.id), 600);
    });
  }

  // Add-another-job (employment history)
  const addJobBtn = document.getElementById("addJobBtn");
  if (addJobBtn) {
    let n = 0;
    addJobBtn.addEventListener("click", () => {
      n++;
      const wrap = document.createElement("div");
      wrap.style = "background:#f9fafb;border-radius:10px;padding:14px;margin-bottom:12px;";
      wrap.innerHTML = `
        <div style="font-size:12px;font-weight:700;color:var(--navy);text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px;">Additional job ${n}</div>
        ${formField("Employer / organization", "ehx-org-" + n, "", false)}
        ${formField("Address & phone", "ehx-addr-" + n, "", false)}
        ${formField("Dates (from – to)", "ehx-dates-" + n, "", false)}
        ${formField("Supervisor name & contact", "ehx-sup-" + n, "", false)}
      `;
      document.getElementById("extraJobs").appendChild(wrap);
    });
  }

  // Upload control
  const uploadInput = document.getElementById("uploadInput");
  if (uploadInput) {
    uploadInput.addEventListener("change", () => {
      const file = uploadInput.files[0];
      if (!file) return;
      const nameEl = document.getElementById("uploadFileName");
      nameEl.style.display = "block";
      nameEl.innerHTML = `📎 <strong>${escapeHTML(file.name)}</strong> ready`;
      document.getElementById("uploadConfirmBtn").style.display = "block";
    });
    const confirmBtn = document.getElementById("uploadConfirmBtn");
    confirmBtn.addEventListener("click", () => {
      const file = uploadInput.files[0];
      if (!file) { toast("Pick a file first.", "error"); return; }
      uploadFileToBackend(file, t.id);
    });
  }

  // Doc-sign acknowledge
  const docSignBtn = document.getElementById("docSignBtn");
  if (docSignBtn) {
    docSignBtn.addEventListener("click", () => {
      const agree = document.getElementById("docAgree");
      if (!agree.checked) { toast("Please check the box first.", "error"); return; }
      markTrainingComplete(t.id);
    });
  }

  // In-person attendance
  const attendBtn = document.getElementById("attendBtn");
  if (attendBtn) attendBtn.addEventListener("click", () => markTrainingComplete(t.id));

  // Video watched
  const watchBtn = document.getElementById("watchBtn");
  if (watchBtn) watchBtn.addEventListener("click", () => markTrainingComplete(t.id));

  // Optional request (mailto opens; we also mark it as "requested")
  const requestBtn = document.getElementById("requestBtn");
  if (requestBtn) {
    requestBtn.addEventListener("click", () => {
      toast("Opening your email to Chana…", "info");
      setTimeout(() => markTrainingComplete(t.id), 400);
    });
  }
}

// Send an uploaded file to the backend, which saves it to the staffer's Drive
// folder and flips their hiring-sheet row to "Yes". Falls back to local-complete
// if there's no backend (e.g., reviewing on your computer).
function uploadFileToBackend(file, trainingId) {
  const url = backendUrl();
  const user = state.viewingAsStaff || state.currentUser;
  if (!url || !user || !user.email) {
    toast("Uploaded ✓", "success");
    setTimeout(() => markTrainingComplete(trainingId), 400);
    return;
  }
  toast("Uploading…", "info");
  const reader = new FileReader();
  reader.onload = () => {
    const data = String(reader.result).split(",")[1] || "";   // strip "data:...;base64,"
    fetch(url, {
      method: "POST",
      body: new URLSearchParams({
        action: "upload", email: user.email, name: user.name || "",
        trainingId, filename: file.name,
        mimeType: file.type || "application/octet-stream", data
      })
    })
      .then(r => r.json())
      .then(res => {
        if (res && res.ok) { toast("Uploaded ✓", "success"); markTrainingComplete(trainingId); }
        else { toast("Upload failed — try again, or email the office.", "error"); }
      })
      .catch(() => toast("Upload failed — check your connection.", "error"));
  };
  reader.onerror = () => toast("Couldn't read that file.", "error");
  reader.readAsDataURL(file);
}

function markTrainingComplete(trainingId) {
  const user = state.viewingAsStaff || state.currentUser;
  if (!user || user.isAdmin && !state.viewingAsStaff) return;
  if (!user.completed.includes(trainingId)) {
    user.completed.push(trainingId);
    saveProgress(user.id, user.completed);
    postProgress(user.email, trainingId);   // best-effort write to the sheet
    toast("Training completed!", "success");
  }
  navigate(state.viewingAsStaff ? `#/admin/as/${user.id}` : "#/home");
}

// =============================================================================
// ADMIN VIEW (with stats, activity feed, search, quick actions)
// =============================================================================
function renderAdmin() {
  const query = state.staffSearch.toLowerCase();
  const allStaff = STAFF.map(s => {
    const withProgress = { ...s, completed: loadProgress(s.id) };
    return { ...withProgress, required: resolveRequired(withProgress) };
  });
  const filtered = query
    ? allStaff.filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query) ||
        ROLE_TEMPLATES[s.role].label.toLowerCase().includes(query) ||
        s.division.toLowerCase().includes(query))
    : allStaff;

  // Stats
  const totalStaff = allStaff.length;
  const completeCount = allStaff.filter(s => s.completed.length === s.required.length).length;
  const avgPct = Math.round(
    allStaff.reduce((sum, s) => sum + (s.completed.length / s.required.length), 0) / totalStaff * 100
  );
  const needAttention = allStaff.filter(s => s.completed.length === 0).length;

  const html = `
    <div class="prototype-banner">
      📌 <strong>Prototype preview:</strong> v2 auto-creates accounts when you mark someone HIRED, sends magic-link invites + auto-reminders, stores uploads as your inspection record, and syncs status back to your master sheet.
    </div>

    <div class="admin-hero">
      <h1>Staff Admin</h1>
      <p>Summer 2026 · ${totalStaff} staff on file</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${totalStaff}</div>
        <div class="stat-label">Total staff</div>
      </div>
      <div class="stat-card ${avgPct >= 70 ? 'success' : avgPct >= 40 ? '' : 'alert'}">
        <div class="stat-value">${avgPct}%</div>
        <div class="stat-label">Avg complete</div>
      </div>
      <div class="stat-card ${needAttention > 0 ? 'alert' : 'success'}">
        <div class="stat-value">${needAttention}</div>
        <div class="stat-label">Not started</div>
      </div>
    </div>

    <div class="quick-actions">
      <button class="action-chip" data-action="invite">➕ Invite new staff</button>
      <button class="action-chip" data-action="remind">📧 Send reminder</button>
      <button class="action-chip" data-action="inspection">🗂️ Inspection packet</button>
      <button class="action-chip" data-action="export">📊 Export to sheet</button>
      <button class="action-chip" data-action="assignments">🎯 Edit assignments</button>
    </div>

    ${RECENT_ACTIVITY && RECENT_ACTIVITY.length > 0 ? `
      <div class="activity-feed">
        <h2>📬 Recent activity</h2>
        ${RECENT_ACTIVITY.slice(0, 5).map(a => `
          <div class="activity-item">
            <div class="activity-icon" style="background: ${a.color || 'var(--green-light)'}; color: ${a.textColor || 'var(--green)'};">${a.icon || '✓'}</div>
            <div class="activity-body">
              <strong>${escapeHTML(a.who)}</strong> ${escapeHTML(a.what)}
              <div class="activity-time">${escapeHTML(a.when)}</div>
            </div>
          </div>
        `).join("")}
      </div>
    ` : ""}

    <div class="admin-search">
      <span class="search-icon">🔍</span>
      <input
        type="search"
        id="staffSearch"
        placeholder="Search staff by name, email, or role…"
        value="${escapeHTML(state.staffSearch)}"
      />
    </div>

    <div class="section-title">Staff (${filtered.length})</div>
    <div class="staff-list">
      ${filtered.length === 0 ? `
        <div style="text-align: center; padding: 32px; color: var(--text-muted); background: var(--card); border-radius: var(--radius); border: 1px dashed var(--border);">
          No staff match "${escapeHTML(state.staffSearch)}"
        </div>
      ` : filtered.map(s => {
        const pct = Math.round((s.completed.length / s.required.length) * 100);
        const status = s.locked ? "locked" : (pct === 100 ? "complete" : (s.completed.length > 0 ? "in-progress" : "not-started"));
        return `
          <a href="#/admin/as/${s.id}" class="staff-card">
            <div class="staff-avatar">${escapeHTML(s.name.charAt(0))}</div>
            <div class="info">
              <div class="name">${escapeHTML(s.name)}</div>
              <div class="role">${escapeHTML(ROLE_TEMPLATES[s.role].label)} · ${escapeHTML(capitalize(s.division))}</div>
              <div class="staff-tags">
                <span class="tag">${s.is18Plus ? '18+' : 'Under 18'}</span>
                <span class="tag">${s.isFromUS ? 'US' : 'International'}</span>
                ${s.isReturning ? '<span class="tag">Returning</span>' : ''}
                ${(s.compensation || 0) > 1500 ? '<span class="tag">1099</span>' : ''}
              </div>
              <div class="progress-inline">
                <div class="progress-inline-fill" style="width: ${pct}%"></div>
              </div>
              <div class="role" style="margin-top: 4px; font-size: 12px;">${s.completed.length} / ${s.required.length} complete (${pct}%)</div>
            </div>
            <span class="status-pill ${status}">${status.replace("-", " ")}</span>
          </a>
        `;
      }).join("")}
    </div>

    <div class="roles-preview">
      <h2>Training Library</h2>
      <p>${Object.keys(TRAININGS).length} items · ${Object.keys(ROLE_TEMPLATES).length} roles · baseline applies to everyone, then role + age + origin add on</p>
      ${Object.values(ROLE_TEMPLATES).map(r => `
        <div class="role-row">
          <strong>${escapeHTML(r.label)}</strong> — ${r.additionalRequired.length} role-specific item${r.additionalRequired.length === 1 ? '' : 's'} (+ baseline)
          <small>${escapeHTML(r.description)}</small>
        </div>
      `).join("")}
    </div>
  `;

  document.getElementById("viewAdmin").innerHTML = html;

  // Wire up search
  const searchInput = document.getElementById("staffSearch");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      state.staffSearch = e.target.value;
      renderAdmin();
      // Preserve focus after re-render
      const newInput = document.getElementById("staffSearch");
      if (newInput) {
        newInput.focus();
        newInput.setSelectionRange(newInput.value.length, newInput.value.length);
      }
    });
  }

  // Wire up quick actions (stubs for v2)
  document.querySelectorAll(".action-chip").forEach(btn => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.action;
      const messages = {
        invite: "Preview only — nothing is sent yet. Once live: when you mark someone HIRED in your sheet, the portal auto-creates their account and emails them their login link. You won't have to click anything per person.",
        remind: "In v2: emails an auto-reminder to everyone with incomplete items (scheduled + a push the week before camp).",
        inspection: "In v2: generates a per-staff inspection packet (employment history, references, sex-offender clearance, fingerprints/bg or home-country check) — everything you need on hand for inspection.",
        export: "In v2: syncs everyone's completion status back to CGI_Morristown_Staff_Hiring_2026_MASTER_v1.",
        assignments: "In v2: opens a matrix to override which items a specific staff member needs."
      };
      toast(messages[action] || "Coming in v2", "info");
    });
  });
}

// =============================================================================
// HELPERS
// =============================================================================
function escapeHTML(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

// =============================================================================
// INIT — load live staff (if backend configured), then restore session & route
// =============================================================================
// Magic-link auto-login: a staffer taps a link like  …/?code=THEIRCODE  and is
// logged straight in — no password to type. Returns true if it handled login.
async function tryMagicLink() {
  let code = "";
  try {
    const q = new URLSearchParams(location.search);
    code = q.get("code") || q.get("token") || "";
  } catch (e) {}
  if (!code) {
    const m = (location.hash || "").match(/[?&](?:code|token)=([^&]+)/);
    if (m) code = decodeURIComponent(m[1]);
  }
  if (!code) return false;
  const raw = code.trim();
  // strip the code from the URL so the link isn't left in history/bookmarks
  try { history.replaceState(null, "", location.pathname); } catch (e) {}

  // ONLINE: resolve the token against the sheet (page holds no roster).
  if (isOnline()) {
    const me = await fetchMe(raw);
    if (me) {
      me.completed = loadProgress(me.id, me.completed);
      state.currentUser = me; saveSession(me);
      navigate("#/home", { replace: true });
      return true;
    }
    navigate("#/login", { replace: true });
    return false;
  }

  // LOCAL: resolve against the in-page roster.
  const lc = raw.toLowerCase();
  if (lc === "admin") {
    state.currentUser = { isAdmin: true, name: "Mendel (Admin)" };
    saveSession(state.currentUser);
    navigate("#/admin", { replace: true });
    return true;
  }
  const staff = STAFF.find(s => s.loginCode.toLowerCase() === lc);
  if (!staff) { navigate("#/login", { replace: true }); return false; }
  staff.completed = loadProgress(staff.id);
  state.currentUser = staff; saveSession(staff);
  navigate("#/home", { replace: true });
  return true;
}

// When the live site is running on sample data (no real roster loaded), show a
// clear banner so it's never mistaken for the real staff list.
function maybeShowPreviewBanner() {
  if (isOnline()) return;  // live site is the real locked portal, not a sample
  const isDemo = STAFF.length && STAFF.every(s => /example\.com$/i.test(s.email || ""));
  if (!isDemo || document.getElementById("previewBanner")) return;
  const bar = document.createElement("div");
  bar.id = "previewBanner";
  bar.textContent = "PREVIEW · sample data — real staff load privately";
  bar.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:9999;background:#b45309;color:#fff;" +
    "font:600 12px/1.4 -apple-system,Segoe UI,Roboto,sans-serif;text-align:center;padding:5px 10px;letter-spacing:.02em;";
  document.body.appendChild(bar);
  document.body.style.paddingTop = "26px";
}

async function init() {
  await loadBackendStaff();
  maybeShowPreviewBanner();
  if (await tryMagicLink()) return;
  const restored = loadSession();
  if (restored) {
    state.currentUser = restored;
    if (!location.hash || location.hash === "#/login") {
      navigate("#/home", { replace: true });
    } else {
      handleRoute();
    }
  } else {
    if (!location.hash) navigate("#/login", { replace: true });
    else handleRoute();
  }
}
init();
