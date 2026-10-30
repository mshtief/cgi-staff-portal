// =============================================================================
// CGI Staff Portal — runtime config
//
// backendUrl: paste your deployed Google Apps Script web-app URL here to switch
// the portal from baked-in demo data to your LIVE master sheet.
//
//   • Empty string ("")  → PROTOTYPE MODE: uses the 6 demo staff in data.js.
//   • Apps Script URL     → LIVE MODE: pulls real hired staff from
//     CGI_Morristown_Staff_Hiring_2026_MASTER_v1 and writes completions back.
//
// The URL looks like:
//   https://script.google.com/macros/s/AKfy...long-id.../exec
//
// See backend/DEPLOY.md for the 5-minute deployment steps.
// =============================================================================
window.PORTAL_CONFIG = {
  // 2026 portal backend (Apps Script bound to the 2026 master sheet). Replace with the 2027 URL at cutover.
  backendUrl: "https://script.google.com/macros/s/AKfycbx0Hq7pLHyb6r3sb9OExh8ULw4b3cgxBTpdGjqxfn_HoLN-AUhuDKWG19Rel4Qbkyyxlg/exec",
  // 2027 application + reference backend (standalone Apps Script owned by office@ganisrael.org, writes CGI_Morristown_Staff_2027;
  // code in backend/2027/Code.gs, deployment "Staff application 2027", 2026-10-29). Empty = apply.html and reference.html
  // run in PREVIEW mode (nothing is sent).
  applyBackendUrl: "https://script.google.com/macros/s/AKfycbz13eD0W5zIgE8IYhZxeFTZgzmWRMaFGnmwTfpv4iZh2otCsCP-KZZTXiz6YpQBn1Dnfw/exec"
};
