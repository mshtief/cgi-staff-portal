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
  backendUrl: "https://script.google.com/macros/s/AKfycbx0Hq7pLHyb6r3sb9OExh8ULw4b3cgxBTpdGjqxfn_HoLN-AUhuDKWG19Rel4Qbkyyxlg/exec"
};
