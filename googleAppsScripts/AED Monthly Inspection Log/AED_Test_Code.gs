// =============================================
// AED MONTHLY INSPECTION LOG — TEST UI (TOUCH-FRIENDLY)
// =============================================
//
// A separate GAS web app that provides a modern, touch-friendly
// single-month-at-a-time interface for AED inspections.
// Uses the SAME Google Sheets backend as the production version.
//
// IMPORTANT — AUTO-INCREMENT VERSION ON EVERY COMMIT:
//   Whenever you (Claude Code) make ANY change to this file and commit,
//   you MUST also increment the VERSION variable by 0.01.
// =============================================

// =============================================
// PROJECT CONFIG
// =============================================
var VERSION = "01.31g";
var TITLE = "AED Inspection Log (Touch UI)";

var AUTO_REFRESH = true;
var SHOW_VERSION = true;

// Google Sheets (same backend as production)
var SPREADSHEET_ID   = "1JhpU30Vd08lYPD6bWNR-BlYaKf4iAz1mY1IykCYMwSQ";
var SHEET_NAME       = "Live_Sheet";
var CONFIG_SHEET     = "AED_Config";
var INSPECT_SHEET    = "AED_Inspections";
var STATS_SHEET      = "API_Stats";

// GitHub
var GITHUB_OWNER     = "PFCAssociates";
var GITHUB_REPO      = "PFC_Website";
var GITHUB_BRANCH    = "main";
var FILE_PATH        = "googleAppsScripts/AED Monthly Inspection Log/AED_Test_Code.gs";

// Apps Script Deployment (will need its own deployment ID once deployed)
var DEPLOYMENT_ID    = "AKfycbwaSHfUXawOQnQFFIfyL0imXFwvP09aSchvIYg4FQaQLw7KIA-s_LXa0YTdkbPyrwhk";

var EMBED_PAGE_URL   = "https://pfcassociates.github.io/PFC_Website/testaed.html";

var MONTHS = ["January","February","March","April","May","June",
              "July","August","September","October","November","December"];

var COL_HEADERS = [
  "AED secure in case, with no cracks, broken parts or damage",
  "Expiration dates checked on pads and batteries",
  "AED Operation Verified *(click for list)",
  "PPE/Ready Kit Stocked and in place **(click for list)",
  "Electrodes in place",
  "Extra sets of electrodes are sealed in their package"
];

var COL_ICONS = ["shield-check","calendar-clock","cpu","briefcase-medical","zap","package"];
// =============================================

// =============================================
// AUTH — Get the active Google user's info
// =============================================

function getUserInfo(opt_token) {
  var cache = CacheService.getScriptCache();
  var cacheKey = opt_token ? "userinfo_" + opt_token.substr(-20) : "userinfo_session_" + (Session.getActiveUser().getEmail() || "none");
  var cached = cache.get(cacheKey);
  if (cached) {
    try { return JSON.parse(cached); } catch(e) {}
  }
  var email = "";
  if (opt_token) {
    try {
      var resp = UrlFetchApp.fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { "Authorization": "Bearer " + opt_token },
        muteHttpExceptions: true
      });
      if (resp.getResponseCode() === 200) {
        var info = JSON.parse(resp.getContentText());
        email = info.email || "";
      }
    } catch(e) {}
  }
  if (!email) {
    email = Session.getActiveUser().getEmail();
  }
  if (!email) {
    return { status: "not_signed_in" };
  }
  var prefix = email.split("@")[0];
  var displayName = prefix.split(/[._-]/).map(function(part) {
    return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
  }).join(" ");
  var result = { status: "authorized", email: email, displayName: displayName };
  cache.put(cacheKey, JSON.stringify(result), 300);
  return result;
}

function checkSpreadsheetAccess(email, opt_ss) {
  if (!email) return false;
  var lowerEmail = email.toLowerCase();
  var cache = CacheService.getScriptCache();
  var cacheKey = "access_" + lowerEmail;
  var cached = cache.get(cacheKey);
  if (cached !== null) return cached === "1";
  var ss = opt_ss || SpreadsheetApp.openById(SPREADSHEET_ID);
  var editors = ss.getEditors();
  for (var i = 0; i < editors.length; i++) {
    if (editors[i].getEmail().toLowerCase() === lowerEmail) {
      cache.put(cacheKey, "1", 600);
      return true;
    }
  }
  var viewers = ss.getViewers();
  for (var i = 0; i < viewers.length; i++) {
    if (viewers[i].getEmail().toLowerCase() === lowerEmail) {
      cache.put(cacheKey, "1", 600);
      return true;
    }
  }
  cache.put(cacheKey, "0", 600);
  return false;
}

// =============================================
// WEB APP ENTRY POINT
// =============================================

function doGet(e) {
  var token = (e && e.parameter && e.parameter.token) || "";
  var html = buildFormHtml(token);
  return HtmlService.createHtmlOutput(html)
    .setTitle(TITLE)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function buildFormHtml(opt_token) {
  return '<!DOCTYPE html>\
<html lang="en">\
<head>\
  <meta charset="UTF-8">\
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">\
  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">\
  <style>\
    :root {\
      --blue: #1565c0;\
      --blue-light: #e3f2fd;\
      --blue-dark: #0d47a1;\
      --green: #2e7d32;\
      --green-light: #e8f5e9;\
      --green-bg: #c8e6c9;\
      --red: #d32f2f;\
      --gray-50: #fafafa;\
      --gray-100: #f5f5f5;\
      --gray-200: #eeeeee;\
      --gray-300: #e0e0e0;\
      --gray-400: #bdbdbd;\
      --gray-500: #9e9e9e;\
      --gray-700: #616161;\
      --gray-900: #212121;\
      --radius: 12px;\
      --shadow: 0 2px 8px rgba(0,0,0,.08);\
      --shadow-lg: 0 4px 20px rgba(0,0,0,.12);\
    }\
    * { box-sizing: border-box; margin: 0; padding: 0; }\
    html, body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--gray-100); color: var(--gray-900); -webkit-tap-highlight-color: transparent; }\
\
    /* ---- TOP BAR (title + config) ---- */\
    .topbar { background: #fff; border-bottom: 1px solid var(--gray-300); padding: 8px 16px; display: flex; align-items: center; flex-wrap: wrap; gap: 4px 14px; flex-shrink: 0; font-size: 12px; color: var(--gray-700); }\
    .topbar h1 { font-size: 15px; font-weight: 700; color: var(--gray-900); }\
    .topbar .user-pill { display: none; background: var(--blue-light); color: var(--blue); font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 20px; white-space: nowrap; max-width: 180px; overflow: hidden; text-overflow: ellipsis; margin-left: auto; margin-right: 70px; }\
    .topbar .user-pill.show { display: block; }\
    .cfg-item { display: flex; align-items: center; gap: 4px; }\
    .cfg-label { font-weight: 600; color: var(--gray-900); white-space: nowrap; }\
    .cfg-input { border: none; border-bottom: 1.5px solid var(--gray-300); background: transparent; font-size: 12px; color: var(--gray-700); padding: 2px 4px; outline: none; min-width: 50px; max-width: 120px; font-family: inherit; }\
    .cfg-input:focus { border-bottom-color: var(--blue); }\
\
    /* ---- MONTH NAVIGATION ---- */\
    .month-nav { background: #fff; border-bottom: 1px solid var(--gray-200); padding: 10px 16px; display: flex; align-items: center; gap: 8px; flex-shrink: 0; }\
    .month-nav .nav-btn { width: 40px; height: 40px; border-radius: 50%; border: 1.5px solid var(--gray-300); background: #fff; font-size: 20px; color: var(--gray-700); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all .15s; flex-shrink: 0; }\
    .month-nav .nav-btn:active { background: var(--gray-200); transform: scale(.92); }\
    .month-nav .nav-btn.disabled { opacity: .3; pointer-events: none; }\
    .month-nav .month-info { flex: 1; text-align: center; }\
    .month-nav .month-year-row { display: flex; align-items: baseline; justify-content: center; gap: 12px; }\
    .month-nav .month-select { font-size: 18px; font-weight: 700; border: none; background: transparent; color: var(--gray-900); text-align: center; text-align-last: center; cursor: pointer; padding: 2px 4px; outline: none; font-family: inherit; border-bottom: 1.5px dashed var(--gray-300); -webkit-appearance: none; appearance: none; border-radius: 0; }\
    .month-nav .month-select:focus { border-bottom-color: var(--blue); }\
    .month-nav .year-select { font-size: 18px; font-weight: 700; border: none; background: transparent; color: var(--gray-900); text-align: center; text-align-last: center; cursor: pointer; padding: 2px 4px; outline: none; font-family: inherit; border-bottom: 1.5px dashed var(--gray-300); -webkit-appearance: none; appearance: none; border-radius: 0; }\
    .month-nav .year-select:focus { border-bottom-color: var(--blue); }\
    .month-nav .progress-bar { height: 4px; background: var(--gray-200); border-radius: 2px; margin-top: 6px; overflow: hidden; }\
    .month-nav .progress-fill { height: 100%; background: var(--green); border-radius: 2px; transition: width .3s ease; }\
    .month-nav .progress-text { font-size: 10px; color: var(--gray-500); margin-top: 2px; }\
\
    /* ---- CARD LIST ---- */\
    .card-list { padding: 8px 16px 12px; display: flex; flex-direction: column; gap: 6px; }\
\
    /* ---- INSPECTION CARD ---- */\
    .card { background: #fff; border-radius: var(--radius); box-shadow: var(--shadow); border: 1.5px solid var(--gray-200); overflow: hidden; transition: all .15s; flex-shrink: 0; }\
    .card.completed { border-color: var(--green-bg); }\
    .card-body { padding: 8px 12px; display: flex; align-items: center; gap: 10px; cursor: pointer; min-height: 48px; }\
    .card-body:active { background: var(--gray-50); }\
    .card.completed .card-body { background: var(--green-light); }\
    .card.completed .card-body:active { background: var(--green-bg); }\
    .card-icon { width: 36px; height: 36px; border-radius: 8px; background: var(--blue-light); color: var(--blue); display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 18px; }\
    .card.completed .card-icon { background: var(--green-bg); color: var(--green); }\
    .card-content { flex: 1; min-width: 0; }\
    .card-title { font-size: 13px; font-weight: 600; line-height: 1.3; color: var(--gray-900); }\
    .card.completed .card-title { color: var(--green); }\
    .card-stamp { text-align: right; font-size: 11px; color: var(--gray-500); }\
    .card-stamp .stamp-name { font-weight: 600; color: var(--blue); }\
    .card.completed .card-stamp .stamp-name { color: var(--green); }\
    .card-stamp .stamp-date { font-size: 10px; color: var(--gray-500); margin-top: 1px; }\
    .card-action { flex-shrink: 0; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }\
    .card:not(.completed) .card-action { background: #d6eaff; color: #fff; }\
    .card.completed .card-action { background: transparent; color: var(--green); font-size: 22px; }\
    .card.stamping { opacity: .6; pointer-events: none; }\
\
    /* ---- SVG ICONS (inline) ---- */\
    .icon { width: 22px; height: 22px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }\
\
    /* ---- MODAL (confirmation / checklist) ---- */\
    .sheet-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 10000; opacity: 0; pointer-events: none; transition: opacity .2s; display: flex; align-items: center; justify-content: center; }\
    .sheet-overlay.show { opacity: 1; pointer-events: auto; }\
    .sheet { background: #fff; border-radius: 16px; width: 90%; max-width: 700px; max-height: 85vh; overflow-y: auto; transform: scale(.9); opacity: 0; transition: transform .25s cubic-bezier(.32,.72,0,1), opacity .2s; box-shadow: var(--shadow-lg); }\
    .sheet-overlay.show .sheet { transform: scale(1); opacity: 1; }\
    .sheet-handle { display: none; }\
    .sheet-header { padding: 12px 20px 4px; text-align: center; display: flex; flex-direction: column; }\
    .sheet-header h3 { font-size: 17px; font-weight: 700; order: 2; }\
    .sheet-header .sheet-subtitle { font-size: 13px; color: var(--blue); font-weight: 600; order: 1; margin-bottom: 2px; }\
    .sheet-body { padding: 4px 20px 16px; }\
    .sheet-msg { font-size: 14px; color: var(--gray-700); text-align: center; line-height: 1.5; margin-bottom: 16px; }\
    .sheet-btns { display: flex; gap: 10px; }\
    .sheet-btns button { flex: 1; padding: 14px 0; border: none; border-radius: 10px; font-size: 15px; font-weight: 700; cursor: pointer; transition: all .15s; }\
    .sheet-btns button:active { transform: scale(.97); }\
    .sheet-btns .btn-cancel { background: var(--gray-200); color: var(--gray-700); }\
    .sheet-btns .btn-stamp { background: var(--blue); color: #fff; }\
    .sheet-btns .btn-stamp:disabled { background: var(--gray-300); color: var(--gray-500); cursor: not-allowed; }\
    .sheet-btns .btn-clear { background: var(--red); color: #fff; }\
\
    /* Checklist items */\
    .cl-item { display: flex; align-items: flex-start; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--gray-200); cursor: pointer; }\
    .cl-item:last-child { border-bottom: none; }\
    .cl-check { width: 24px; height: 24px; border: 2px solid var(--gray-400); border-radius: 6px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: all .15s; margin-top: 1px; }\
    .cl-check.checked { background: var(--blue); border-color: var(--blue); color: #fff; }\
    .cl-text { font-size: 14px; line-height: 1.4; color: var(--gray-700); }\
\
    /* ---- AUTH WALL ---- */\
    .auth-wall { position: fixed; inset: 0; background: #fff; display: none; align-items: center; justify-content: center; z-index: 20000; flex-direction: column; gap: 16px; text-align: center; padding: 20px; }\
    .auth-wall.show { display: flex; }\
    .auth-wall h2 { color: var(--red); }\
    .auth-wall p { color: #666; max-width: 440px; line-height: 1.6; font-size: 14px; }\
\
    /* ---- LOADING ---- */\
    .loading { position: fixed; inset: 0; background: rgba(255,255,255,.9); display: flex; align-items: center; justify-content: center; z-index: 9999; font-size: 16px; color: var(--gray-500); flex-direction: column; gap: 12px; }\
    .loading.off { display: none; }\
    .spinner { width: 32px; height: 32px; border: 3px solid var(--gray-200); border-top-color: var(--blue); border-radius: 50%; animation: spin .8s linear infinite; }\
    @keyframes spin { to { transform: rotate(360deg); } }\
\
    /* ---- SAVING TOAST ---- */\
    .toast { position: fixed; top: 12px; left: 50%; transform: translateX(-50%); background: var(--blue); color: #fff; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; opacity: 0; transition: opacity .3s; z-index: 11000; pointer-events: none; }\
    .toast.on { opacity: 1; }\
\
    /* ---- VERSION ---- */\
    #gv { text-align: center; font-size: 11px; color: var(--gray-400); padding: 8px; }\
\
  </style>\
</head>\
<body>\
  <div class="auth-wall" id="auth-wall"></div>\
  <div class="loading" id="loading"><div class="spinner"></div>Loading inspection log...</div>\
  <div class="toast" id="toast">Saving...</div>\
\
  <!-- Stamp Confirmation Sheet -->\
  <div class="sheet-overlay" id="stamp-sheet">\
    <div class="sheet">\
      <div class="sheet-handle"></div>\
      <div class="sheet-header">\
        <h3 id="stamp-title">Confirm</h3>\
        <div class="sheet-subtitle" id="stamp-subtitle"></div>\
      </div>\
      <div class="sheet-body">\
        <p class="sheet-msg" id="stamp-msg"></p>\
        <div class="sheet-btns">\
          <button class="btn-cancel" id="stamp-cancel">Cancel</button>\
          <button class="btn-stamp" id="stamp-ok">Stamp</button>\
        </div>\
      </div>\
    </div>\
  </div>\
\
  <!-- Clear Confirmation Sheet -->\
  <div class="sheet-overlay" id="clear-sheet">\
    <div class="sheet">\
      <div class="sheet-handle"></div>\
      <div class="sheet-header">\
        <h3 id="clear-title">Clear Entry</h3>\
        <div class="sheet-subtitle" id="clear-subtitle"></div>\
      </div>\
      <div class="sheet-body">\
        <p class="sheet-msg" id="clear-msg"></p>\
        <div class="sheet-btns">\
          <button class="btn-cancel" id="clear-cancel">Cancel</button>\
          <button class="btn-clear" id="clear-ok">Clear</button>\
        </div>\
      </div>\
    </div>\
  </div>\
\
  <!-- Operation Checklist Sheet -->\
  <div class="sheet-overlay" id="op-sheet">\
    <div class="sheet">\
      <div class="sheet-handle"></div>\
      <div class="sheet-header">\
        <h3>*Operation Checklist</h3>\
        <div class="sheet-subtitle" id="op-subtitle"></div>\
      </div>\
      <div class="sheet-body" id="op-body">\
        <div class="cl-item" data-i="0"><div class="cl-check" id="op-0"></div><div class="cl-text">1. Open the AED lid.</div></div>\
        <div class="cl-item" data-i="1"><div class="cl-check" id="op-1"></div><div class="cl-text">2. Wait for the AED to indicate status: Observe the change of the STATUS INDICATOR to RED. After approximately five seconds, verify that the STATUS INDICATOR returns to GREEN.</div></div>\
        <div class="cl-item" data-i="2"><div class="cl-check" id="op-2"></div><div class="cl-text">3. Check the expiration date on the electrodes.</div></div>\
        <div class="cl-item" data-i="3"><div class="cl-check" id="op-3"></div><div class="cl-text">4. Listen for the voice prompts.</div></div>\
        <div class="cl-item" data-i="4"><div class="cl-check" id="op-4"></div><div class="cl-text">5. Close the lid and observe the change of the STATUS INDICATOR to RED. After approximately five seconds, verify that the STATUS INDICATOR returns to GREEN.</div></div>\
        <div class="cl-item" data-i="5"><div class="cl-check" id="op-5"></div><div class="cl-text">6. Check the expiration date of the battery.</div></div>\
        <div class="sheet-btns" style="margin-top:16px">\
          <button class="btn-cancel" id="op-cancel">Cancel</button>\
          <button class="btn-stamp" id="op-submit" disabled>Submit</button>\
        </div>\
      </div>\
    </div>\
  </div>\
\
  <!-- PPE Checklist Sheet -->\
  <div class="sheet-overlay" id="ppe-sheet">\
    <div class="sheet">\
      <div class="sheet-handle"></div>\
      <div class="sheet-header">\
        <h3>**PPE/Ready Kit Checklist</h3>\
        <div class="sheet-subtitle" id="ppe-subtitle"></div>\
      </div>\
      <div class="sheet-body" id="ppe-body">\
        <div class="cl-item" data-i="0"><div class="cl-check" id="ppe-0"></div><div class="cl-text">1 pocket mask</div></div>\
        <div class="cl-item" data-i="1"><div class="cl-check" id="ppe-1"></div><div class="cl-text">1 trauma scissor</div></div>\
        <div class="cl-item" data-i="2"><div class="cl-check" id="ppe-2"></div><div class="cl-text">2 pair of gloves</div></div>\
        <div class="cl-item" data-i="3"><div class="cl-check" id="ppe-3"></div><div class="cl-text">2 \u2014 4"x4" gauze pads</div></div>\
        <div class="cl-item" data-i="4"><div class="cl-check" id="ppe-4"></div><div class="cl-text">1 razor</div></div>\
        <div class="cl-item" data-i="5"><div class="cl-check" id="ppe-5"></div><div class="cl-text">1 antiseptic towelette</div></div>\
        <div class="sheet-btns" style="margin-top:16px">\
          <button class="btn-cancel" id="ppe-cancel">Cancel</button>\
          <button class="btn-stamp" id="ppe-submit" disabled>Submit</button>\
        </div>\
      </div>\
    </div>\
  </div>\
\
  <!-- MAIN LAYOUT -->\
  <div class="topbar" id="config-bar">\
    <h1>AED Inspection</h1>\
    <div class="cfg-item"><span class="cfg-label">Location:</span><input class="cfg-input" id="cfg-loc" type="text" placeholder="—"></div>\
    <div class="cfg-item"><span class="cfg-label">Serial:</span><input class="cfg-input" id="cfg-serial" type="text" placeholder="—"></div>\
    <div class="cfg-item"><span class="cfg-label">Battery Exp:</span><input class="cfg-input" id="cfg-batt" type="text" placeholder="—"></div>\
    <div class="cfg-item"><span class="cfg-label">Pad Exp:</span><input class="cfg-input" id="cfg-pad" type="text" placeholder="—"></div>\
    <div class="user-pill" id="user-pill"></div>\
  </div>\
  <div class="month-nav">\
    <button class="nav-btn" id="prev-btn" aria-label="Previous month">\
      <svg class="icon" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>\
    </button>\
    <div class="month-info">\
      <div class="month-year-row"><select class="month-select" id="month-select"><option value="0">January</option><option value="1">February</option><option value="2">March</option><option value="3">April</option><option value="4">May</option><option value="5">June</option><option value="6">July</option><option value="7">August</option><option value="8">September</option><option value="9">October</option><option value="10">November</option><option value="11">December</option></select>\
      <select class="year-select" id="yr"><option value="26">2026</option><option value="27">2027</option><option value="28">2028</option><option value="29">2029</option><option value="30">2030</option><option value="31">2031</option><option value="32">2032</option><option value="33">2033</option><option value="34">2034</option><option value="35">2035</option><option value="36">2036</option></select></div>\
      <div class="progress-bar"><div class="progress-fill" id="progress-fill" style="width:0%"></div></div>\
      <div class="progress-text" id="progress-text">0 / 6 completed</div>\
    </div>\
    <button class="nav-btn" id="next-btn" aria-label="Next month">\
      <svg class="icon" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>\
    </button>\
  </div>\
  <div class="card-list" id="card-list"></div>\
  <div id="gv"></div>\
\
<script>\
var _token = ' + JSON.stringify(opt_token || "") + ';\
var _colNames = ' + JSON.stringify(COL_HEADERS) + ';\
var _months = ' + JSON.stringify(MONTHS) + ';\
var _yr = "";\
var _curMonth = new Date().getMonth();\
var _user = null;\
var _inspections = {};\
var _insCache = {};\
var _savCount = 0;\
\
var _icons = [\
  \'<svg class="icon" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>\',\
  \'<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><circle cx="12" cy="15" r="2"/><path d="M12 13v-1"/></svg>\',\
  \'<svg class="icon" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/></svg>\',\
  \'<svg class="icon" viewBox="0 0 24 24"><path d="M12 2L2 7v5c0 5 4 9.27 10 10.27S22 17 22 12V7L12 2z"/><path d="M9 12h6M12 9v6"/></svg>\',\
  \'<svg class="icon" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>\',\
  \'<svg class="icon" viewBox="0 0 24 24"><path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>\'\
];\
\
function savOn() { _savCount++; document.getElementById("toast").classList.add("on"); }\
function savOff() { _savCount--; if (_savCount <= 0) { _savCount = 0; document.getElementById("toast").classList.remove("on"); } }\
\
function monthYr() { return _months[_curMonth] + (_yr ? " 20" + _yr : ""); }\
\
function updateProgress() {\
  var done = 0;\
  for (var c = 0; c < 6; c++) {\
    if (_inspections[_curMonth + "_" + c]) done++;\
  }\
  var pct = Math.round((done / 6) * 100);\
  document.getElementById("progress-fill").style.width = pct + "%";\
  document.getElementById("progress-text").textContent = done + " / 6 completed";\
}\
\
function renderCards() {\
  document.getElementById("month-select").value = _curMonth;\
  var list = document.getElementById("card-list");\
  list.innerHTML = "";\
  for (var c = 0; c < 6; c++) {\
    var val = _inspections[_curMonth + "_" + c] || "";\
    var card = document.createElement("div");\
    card.className = "card" + (val ? " completed" : "");\
    card.setAttribute("data-c", c);\
    var parts = val ? val.split(" | ") : [];\
    var stampHtml = "";\
    if (val) {\
      stampHtml = \'<div class="card-stamp"><div class="stamp-name">\' + (parts[0] || "") + \'</div>\' + (parts[1] ? \'<div class="stamp-date">\' + parts[1] + \'</div>\' : "") + \'</div>\';\
    }\
    var actionHtml = val\
      ? \'<div class="card-action">\\u2713</div>\'\
      : \'<div class="card-action"><svg class="icon" viewBox="0 0 24 24" style="width:18px;height:18px;stroke:#fff"><polyline points="20 6 9 17 4 12"/></svg></div>\';\
    card.innerHTML = \'<div class="card-body">\'\
      + \'<div class="card-icon">\' + _icons[c] + \'</div>\'\
      + \'<div class="card-content"><div class="card-title">\' + _colNames[c] + \'</div></div>\'\
      + stampHtml\
      + actionHtml\
      + \'</div>\';\
    (function(colIdx, cardEl) {\
      cardEl.querySelector(".card-body").addEventListener("click", function() {\
        if (cardEl.classList.contains("stamping")) return;\
        if (!_yr) { alert("Please set the year first."); return; }\
        var val = _inspections[_curMonth + "_" + colIdx] || "";\
        if (val) {\
          showClearSheet(colIdx);\
        } else {\
          if (colIdx === 2) showOpChecklist(colIdx);\
          else if (colIdx === 3) showPpeChecklist(colIdx);\
          else showStampSheet(colIdx);\
        }\
      });\
    })(c, card);\
    list.appendChild(card);\
  }\
  updateProgress();\
  if (typeof updateNavBtns === "function") updateNavBtns();\
}\
\
/* ---- Bottom Sheets ---- */\
function showStampSheet(colIdx) {\
  var overlay = document.getElementById("stamp-sheet");\
  document.getElementById("stamp-title").textContent = "Stamp: " + _colNames[colIdx];\
  document.getElementById("stamp-subtitle").textContent = monthYr();\
  document.getElementById("stamp-msg").textContent = "Tap Stamp to sign this item with your name and timestamp.";\
  overlay.classList.add("show");\
  return new Promise(function(resolve) {\
    document.getElementById("stamp-ok").onclick = function() { overlay.classList.remove("show"); doStamp(colIdx); };\
    document.getElementById("stamp-cancel").onclick = function() { overlay.classList.remove("show"); };\
  });\
}\
\
function showClearSheet(colIdx) {\
  var overlay = document.getElementById("clear-sheet");\
  document.getElementById("clear-title").textContent = "Clear: " + _colNames[colIdx];\
  document.getElementById("clear-subtitle").textContent = monthYr();\
  document.getElementById("clear-msg").textContent = "This will remove the stamp for this item. Are you sure?";\
  overlay.classList.add("show");\
  document.getElementById("clear-ok").onclick = function() { overlay.classList.remove("show"); doClear(colIdx); };\
  document.getElementById("clear-cancel").onclick = function() { overlay.classList.remove("show"); };\
}\
\
function setupChecklist(sheetId, bodyId, submitId, cancelId, subtitleId, subtitle, count, onSubmit) {\
  var overlay = document.getElementById(sheetId);\
  document.getElementById(subtitleId).textContent = subtitle;\
  var checks = [];\
  for (var i = 0; i < count; i++) {\
    var el = document.getElementById(sheetId.replace("-sheet","") + "-" + i);\
    el.classList.remove("checked");\
    el.innerHTML = "";\
    checks.push(el);\
  }\
  var submit = document.getElementById(submitId);\
  submit.disabled = true;\
  var items = document.getElementById(bodyId).querySelectorAll(".cl-item");\
  for (var i = 0; i < items.length; i++) {\
    (function(idx) {\
      items[idx].onclick = function() {\
        var ch = checks[idx];\
        if (ch.classList.contains("checked")) {\
          ch.classList.remove("checked");\
          ch.innerHTML = "";\
        } else {\
          ch.classList.add("checked");\
          ch.innerHTML = \'<svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:#fff;fill:none;stroke-width:3"><polyline points="20 6 9 17 4 12"/></svg>\';\
        }\
        var allDone = true;\
        for (var j = 0; j < checks.length; j++) { if (!checks[j].classList.contains("checked")) { allDone = false; break; } }\
        submit.disabled = !allDone;\
      };\
    })(i);\
  }\
  overlay.classList.add("show");\
  submit.onclick = function() { overlay.classList.remove("show"); onSubmit(); };\
  document.getElementById(cancelId).onclick = function() { overlay.classList.remove("show"); };\
}\
\
function showOpChecklist(colIdx) {\
  setupChecklist("op-sheet", "op-body", "op-submit", "op-cancel", "op-subtitle", monthYr(), 6, function() { doStamp(colIdx); });\
}\
function showPpeChecklist(colIdx) {\
  setupChecklist("ppe-sheet", "ppe-body", "ppe-submit", "ppe-cancel", "ppe-subtitle", monthYr(), 6, function() { doStamp(colIdx); });\
}\
\
/* ---- Stamp / Clear ---- */\
function doStamp(colIdx) {\
  var cards = document.querySelectorAll(".card");\
  var card = cards[colIdx];\
  if (card) card.classList.add("stamping");\
  savOn();\
  google.script.run\
    .withSuccessHandler(function(stampValue) {\
      savOff();\
      _inspections[_curMonth + "_" + colIdx] = stampValue;\
      if (_yr) _insCache[_yr] = _inspections;\
      renderCards();\
    })\
    .withFailureHandler(function(err) {\
      savOff();\
      if (card) card.classList.remove("stamping");\
      alert("Error: " + err.message);\
    })\
    .stampInspection(_yr, _curMonth, colIdx, _token);\
}\
\
function doClear(colIdx) {\
  var cards = document.querySelectorAll(".card");\
  var card = cards[colIdx];\
  if (card) card.classList.add("stamping");\
  savOn();\
  google.script.run\
    .withSuccessHandler(function() {\
      savOff();\
      _inspections[_curMonth + "_" + colIdx] = "";\
      if (_yr) _insCache[_yr] = _inspections;\
      renderCards();\
    })\
    .withFailureHandler(function(err) {\
      savOff();\
      if (card) card.classList.remove("stamping");\
      alert("Error: " + err.message);\
    })\
    .clearInspection(_yr, _curMonth, colIdx, _token);\
}\
\
/* ---- Month Navigation ---- */\
var _yrSel = document.getElementById("yr");\
var _firstYr = _yrSel.options[0].value;\
var _lastYr = _yrSel.options[_yrSel.options.length - 1].value;\
function updateNavBtns() {\
  document.getElementById("prev-btn").classList.toggle("disabled", _curMonth === 0 && _yr === _firstYr);\
  document.getElementById("next-btn").classList.toggle("disabled", _curMonth === 11 && _yr === _lastYr);\
}\
function changeYear(newVal) {\
  for (var i = 0; i < _yrSel.options.length; i++) {\
    if (_yrSel.options[i].value === newVal) { _yrSel.value = newVal; _yrSel.dispatchEvent(new Event("change")); return; }\
  }\
}\
document.getElementById("prev-btn").addEventListener("click", function() {\
  if (_curMonth === 0) {\
    _curMonth = 11;\
    changeYear(String(parseInt(_yr || _firstYr) - 1));\
  } else {\
    _curMonth--;\
    renderCards();\
  }\
});\
document.getElementById("next-btn").addEventListener("click", function() {\
  if (_curMonth === 11) {\
    _curMonth = 0;\
    changeYear(String(parseInt(_yr || _firstYr) + 1));\
  } else {\
    _curMonth++;\
    renderCards();\
  }\
});\
document.getElementById("month-select").addEventListener("change", function() {\
  _curMonth = parseInt(this.value);\
  renderCards();\
});\
document.getElementById("yr").addEventListener("change", function() {\
  var v = this.value;\
  if (v !== _yr) {\
    _yr = v;\
    _inspections = _insCache[v] || {};\
    renderCards();\
    google.script.run.saveConfig("year_suffix", v);\
    if (!_insCache[v]) {\
      var _toast = document.getElementById("toast");\
      _toast.textContent = "Loading 20" + v + "\\u2026";\
      _toast.classList.add("on");\
      google.script.run.withSuccessHandler(function(d) {\
        _toast.classList.remove("on");\
        _toast.textContent = "Saving...";\
        if (d && d.inspections) { _insCache[v] = d.inspections; if (_yr === v) { _inspections = d.inspections; renderCards(); } }\
      }).withFailureHandler(function() {\
        _toast.classList.remove("on");\
        _toast.textContent = "Saving...";\
      }).getFormData(_token, v);\
    }\
  }\
});\
\
/* Swipe support */\
var _touchStartX = 0;\
var _touchStartY = 0;\
var _cardList = document.getElementById("card-list");\
_cardList.addEventListener("touchstart", function(e) {\
  _touchStartX = e.changedTouches[0].screenX;\
  _touchStartY = e.changedTouches[0].screenY;\
}, { passive: true });\
_cardList.addEventListener("touchend", function(e) {\
  var dx = e.changedTouches[0].screenX - _touchStartX;\
  var dy = e.changedTouches[0].screenY - _touchStartY;\
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {\
    if (dx < 0) {\
      if (_curMonth === 11) {\
        if (_yr === _lastYr) return;\
        _curMonth = 0;\
        changeYear(String(parseInt(_yr || _firstYr) + 1));\
      } else { _curMonth++; renderCards(); }\
    } else {\
      if (_curMonth === 0) {\
        if (_yr === _firstYr) return;\
        _curMonth = 11;\
        changeYear(String(parseInt(_yr || _firstYr) - 1));\
      } else { _curMonth--; renderCards(); }\
    }\
  }\
}, { passive: true });\
\
/* ---- Auth ---- */\
function notifyParentAuth() {\
  var msg = { type: "gas-auth-complete" };\
  try { window.top.postMessage(msg, "*"); } catch(e) {}\
  try { window.parent.postMessage(msg, "*"); } catch(e) {}\
}\
function showAuthWall(d) {\
  var msg = { type: "gas-needs-auth", authStatus: d.authStatus || "not_signed_in", email: d.email || "", version: d.version || "" };\
  try { window.top.postMessage(msg, "*"); } catch(e) {}\
  try { window.parent.postMessage(msg, "*"); } catch(e) {}\
}\
\
/* ---- Load Data ---- */\
function loadData() {\
  google.script.run\
    .withSuccessHandler(function(d) {\
      if (!d.authorized) {\
        if (d.version) document.getElementById("gv").textContent = d.version;\
        showAuthWall(d);\
        document.getElementById("loading").classList.add("off");\
        return;\
      }\
      document.getElementById("auth-wall").classList.remove("show");\
      _user = d.user;\
      var pill = document.getElementById("user-pill");\
      pill.textContent = d.user.displayName;\
      pill.classList.add("show");\
      try { window.top.postMessage({ type: "gas-auth-ok", version: d.version || "" }, "*"); } catch(e) {}\
      var cfg = d.config || {};\
      /* Always open to the current year (override saved config) */\
      /* To restore last-used year: _yr = cfg.year_suffix || ""; */\
      _yr = String(new Date().getFullYear()).slice(-2);\
      document.getElementById("yr").value = _yr;\
      document.getElementById("cfg-loc").value = cfg.aed_location || "";\
      document.getElementById("cfg-serial").value = cfg.serial_no || "";\
      document.getElementById("cfg-batt").value = cfg.battery_date || "";\
      document.getElementById("cfg-pad").value = cfg.pad_expiration || "";\
      var savedYr = cfg.year_suffix || "";\
      var returnedInsp = d.inspections || {};\
      if (savedYr) _insCache[savedYr] = returnedInsp;\
      if (_yr === savedYr || !savedYr) {\
        _inspections = returnedInsp;\
        if (_yr) _insCache[_yr] = _inspections;\
        renderCards();\
        if (d.version) document.getElementById("gv").textContent = d.version;\
        document.getElementById("loading").classList.add("off");\
      } else {\
        /* Current year differs from saved — fetch the right data */\
        _inspections = {};\
        renderCards();\
        if (d.version) document.getElementById("gv").textContent = d.version;\
        document.getElementById("loading").classList.add("off");\
        var curYr = _yr;\
        google.script.run.withSuccessHandler(function(d2) {\
          if (d2 && d2.inspections) { _insCache[curYr] = d2.inspections; if (_yr === curYr) { _inspections = d2.inspections; renderCards(); } }\
        }).getFormData(_token, curYr);\
      }\
    })\
    .withFailureHandler(function(e) {\
      document.getElementById("loading").innerHTML = "<div>Error: " + e.message + "</div>";\
    })\
    .getFormData(_token);\
}\
\
loadData();\
\
/* ---- Config field auto-save ---- */\
[["cfg-loc","aed_location"],["cfg-serial","serial_no"],["cfg-batt","battery_date"],["cfg-pad","pad_expiration"]].forEach(function(pair) {\
  var el = document.getElementById(pair[0]);\
  el.addEventListener("change", function() {\
    savOn();\
    google.script.run.withSuccessHandler(savOff).withFailureHandler(function(err) { savOff(); alert("Error: " + err.message); }).saveConfig(pair[1], el.value);\
  });\
});\
\
/* ---- Auto-refresh polling ---- */\
var _ar = ' + AUTO_REFRESH + ';\
var _ap = false;\
if (_ar) {\
  function pollVer() {\
    if (_ap) return;\
    google.script.run.withSuccessHandler(function(pushed) {\
      if (!pushed) return;\
      var cur = (document.getElementById("gv").textContent || "").trim();\
      if (pushed !== cur && pushed !== "" && cur !== "") {\
        _ap = true;\
        var msg = { type: "gas-reload", version: pushed };\
        try { window.top.postMessage(msg, "*"); } catch(e) {}\
        try { window.parent.postMessage(msg, "*"); } catch(e) {}\
        setTimeout(function() { _ap = false; }, 30000);\
      }\
    }).readPushedVersionFromCache();\
  }\
  setInterval(pollVer, 15000);\
}\
if (!' + SHOW_VERSION + ') document.getElementById("gv").style.display = "none";\
</script>\
</body>\
</html>';
}

// =============================================
// DATA FUNCTIONS — Read/write inspection log data
// =============================================

function getFormData(opt_token, opt_yearOverride) {
  var userInfo = getUserInfo(opt_token);
  if (userInfo.status !== "authorized") {
    return { authorized: false, authStatus: userInfo.status, email: userInfo.email || "", version: "v" + VERSION };
  }
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  if (!checkSpreadsheetAccess(userInfo.email, ss)) {
    return { authorized: false, authStatus: "no_access", email: userInfo.email || "", version: "v" + VERSION };
  }
  var cfgSheet = ss.getSheetByName(CONFIG_SHEET);
  if (!cfgSheet) {
    cfgSheet = ss.insertSheet(CONFIG_SHEET);
    cfgSheet.getRange("A1:B5").setValues([
      ["year_suffix",""],["aed_location",""],["serial_no",""],["battery_date",""],["pad_expiration",""]
    ]);
  }
  var cfgData = cfgSheet.getDataRange().getValues();
  var config = {};
  for (var i = 0; i < cfgData.length; i++) {
    if (cfgData[i][0]) config[String(cfgData[i][0])] = String(cfgData[i][1] || "");
  }
  var insSheet = ss.getSheetByName(INSPECT_SHEET);
  if (!insSheet) {
    insSheet = ss.insertSheet(INSPECT_SHEET);
    insSheet.appendRow(["year","month","secure","expiration","operation","ppe","electrodes","extra"]);
  }
  var inspections = {};
  var yrSuffix = opt_yearOverride || config.year_suffix || "";
  if (yrSuffix) {
    var insData = insSheet.getDataRange().getValues();
    for (var i = 1; i < insData.length; i++) {
      if (String(insData[i][0]) === yrSuffix) {
        var month = String(insData[i][1]);
        for (var j = 2; j < 8; j++) {
          var val = String(insData[i][j] || "");
          if (val) inspections[month + "_" + (j - 2)] = val;
        }
      }
    }
  }
  return { authorized: true, user: userInfo, config: config, inspections: inspections, version: "v" + VERSION };
}

function saveConfig(key, value) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var cfgSheet = ss.getSheetByName(CONFIG_SHEET);
  if (!cfgSheet) {
    cfgSheet = ss.insertSheet(CONFIG_SHEET);
    cfgSheet.getRange("A1:B5").setValues([
      ["year_suffix",""],["aed_location",""],["serial_no",""],["battery_date",""],["pad_expiration",""]
    ]);
  }
  var data = cfgSheet.getDataRange().getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]) === key) {
      cfgSheet.getRange(i + 1, 2).setValue(value);
      return true;
    }
  }
  cfgSheet.appendRow([key, value]);
  return true;
}

function incrementStat(ss, statType) {
  var sheet = ss.getSheetByName(STATS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(STATS_SHEET);
    sheet.getRange("A1:B2").setValues([["Writes", 0], ["Deletes", 0]]);
  }
  var range = sheet.getRange("B1:B2");
  var counts = range.getValues();
  if (statType === "write") counts[0][0] = (Number(counts[0][0]) || 0) + 1;
  else counts[1][0] = (Number(counts[1][0]) || 0) + 1;
  range.setValues(counts);
}

function stampInspection(yearSuffix, monthIndex, colIndex, opt_token) {
  var userInfo = getUserInfo(opt_token);
  if (userInfo.status !== "authorized") throw new Error("You must be signed into a Google account.");
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  if (!checkSpreadsheetAccess(userInfo.email, ss)) throw new Error("Your account does not have access to the inspection log spreadsheet.");
  var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "M/d/yyyy h:mm:ss a");
  var value = userInfo.displayName + " | " + timestamp;
  var insSheet = ss.getSheetByName(INSPECT_SHEET);
  if (!insSheet) {
    insSheet = ss.insertSheet(INSPECT_SHEET);
    insSheet.appendRow(["year","month","secure","expiration","operation","ppe","electrodes","extra"]);
  }
  var data = insSheet.getDataRange().getValues();
  var rowIdx = -1;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(yearSuffix) && String(data[i][1]) === String(monthIndex)) {
      rowIdx = i + 1;
      break;
    }
  }
  if (rowIdx === -1) {
    var newRow = [yearSuffix, monthIndex, "", "", "", "", "", ""];
    newRow[colIndex + 2] = value;
    insSheet.appendRow(newRow);
  } else {
    insSheet.getRange(rowIdx, colIndex + 3).setValue(value);
  }
  incrementStat(ss, "write");
  return value;
}

function clearInspection(yearSuffix, monthIndex, colIndex, opt_token) {
  var userInfo = getUserInfo(opt_token);
  if (userInfo.status !== "authorized") throw new Error("You must be signed into a Google account.");
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  if (!checkSpreadsheetAccess(userInfo.email, ss)) throw new Error("Your account does not have access to the inspection log spreadsheet.");
  var insSheet = ss.getSheetByName(INSPECT_SHEET);
  if (!insSheet) return true;
  var data = insSheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(yearSuffix) && String(data[i][1]) === String(monthIndex)) {
      insSheet.getRange(i + 1, colIndex + 3).setValue("");
      incrementStat(ss, "delete");
      break;
    }
  }
  return true;
}

// =============================================
// SELF-UPDATE INFRASTRUCTURE
// =============================================

function doPost(e) {
  var action = (e && e.parameter && e.parameter.action) || "";
  if (action === "deploy") {
    try {
      var result = pullAndDeployFromGitHub();
      var wasUpdated = result.indexOf("Updated to") === 0;
      if (wasUpdated) {
        var vMatch = result.match(/v([\d.]+\w*)/);
        var deployedVersion = vMatch ? "v" + vMatch[1] : "";
        var timestamp = new Date().toLocaleString();
        var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        var sheet = ss.getSheetByName(SHEET_NAME);
        if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
        sheet.getRange("A1").setValue(deployedVersion + " — " + timestamp);
        CacheService.getScriptCache().put("pushed_version", deployedVersion, 3600);
      }
      return ContentService.createTextOutput("OK: " + result);
    } catch(err) {
      return ContentService.createTextOutput("ERROR: " + err.message);
    }
  }
  return ContentService.createTextOutput("Unknown action");
}

function getAppData() {
  return { version: "v" + VERSION, title: TITLE };
}

function readPushedVersionFromCache() {
  var cache = CacheService.getScriptCache();
  return cache.get("pushed_version") || "";
}

function writeVersionToSheetA1() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  sheet.getRange("A1").setValue("v" + VERSION + " — " + new Date().toLocaleString());
}

function pullAndDeployFromGitHub() {
  var GITHUB_TOKEN = PropertiesService.getScriptProperties().getProperty("GITHUB_TOKEN");
  var apiUrl = "https://api.github.com/repos/"
    + GITHUB_OWNER + "/" + GITHUB_REPO + "/contents/" + FILE_PATH
    + "?ref=" + GITHUB_BRANCH + "&t=" + new Date().getTime();
  var fetchHeaders = { "Accept": "application/vnd.github.v3.raw" };
  if (GITHUB_TOKEN) fetchHeaders["Authorization"] = "token " + GITHUB_TOKEN;
  var response = UrlFetchApp.fetch(apiUrl, { headers: fetchHeaders });
  var newCode = response.getContentText();
  var versionMatch = newCode.match(/var VERSION\s*=\s*"([^"]+)"/);
  var pulledVersion = versionMatch ? versionMatch[1] : null;
  if (pulledVersion && pulledVersion === VERSION) {
    return "Already up to date (v" + VERSION + ")";
  }
  var scriptId = ScriptApp.getScriptId();
  var url = "https://script.googleapis.com/v1/projects/" + scriptId + "/content";
  var current = UrlFetchApp.fetch(url, {
    headers: { "Authorization": "Bearer " + ScriptApp.getOAuthToken() }
  });
  var currentFiles = JSON.parse(current.getContentText()).files;
  var manifest = currentFiles.find(function(f) { return f.name === "appsscript"; });
  UrlFetchApp.fetch(url, {
    method: "put",
    contentType: "application/json",
    headers: { "Authorization": "Bearer " + ScriptApp.getOAuthToken() },
    payload: JSON.stringify({ files: [{ name: "Code", type: "SERVER_JS", source: newCode }, manifest] })
  });
  var versionUrl = "https://script.googleapis.com/v1/projects/" + scriptId + "/versions";
  var versionResponse = UrlFetchApp.fetch(versionUrl, {
    method: "post",
    contentType: "application/json",
    headers: { "Authorization": "Bearer " + ScriptApp.getOAuthToken() },
    payload: JSON.stringify({ description: "v" + pulledVersion + " — from GitHub " + new Date().toLocaleString() })
  });
  var newVersion = JSON.parse(versionResponse.getContentText()).versionNumber;
  UrlFetchApp.fetch("https://script.googleapis.com/v1/projects/" + scriptId + "/deployments/" + DEPLOYMENT_ID, {
    method: "put",
    contentType: "application/json",
    headers: { "Authorization": "Bearer " + ScriptApp.getOAuthToken() },
    payload: JSON.stringify({
      deploymentConfig: { scriptId: scriptId, versionNumber: newVersion, description: "v" + pulledVersion + " (deployment " + newVersion + ")" }
    })
  });
  return "Updated to v" + pulledVersion + " (deployment " + newVersion + ")";
}
