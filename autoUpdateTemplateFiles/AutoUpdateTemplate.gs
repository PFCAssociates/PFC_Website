// =============================================
// SELF-UPDATING GOOGLE APPS SCRIPT — BAREBONES TEMPLATE
// =============================================
//
// A Google Apps Script web app that pulls its own source code from GitHub
// and redeploys itself. Embedded as an iframe in an external page for
// auto-reload support.
//
// HOW IT WORKS:
//   1. GitHub Action merges claude/* branch → main
//   2. Action POSTs action=deploy to doPost() → pulls & deploys new code
//   3. doPost() sets "pushed_version" in CacheService
//   4. Client polls readPushedVersionFromCache() every 15s
//   5. Detects new version → sends gas-reload postMessage to parent
//   6. Embedding page reloads → GAS iframe loads new code
//
// REQUIRED SETUP:
//   - V8 runtime enabled in appsscript.json
//   - Apps Script API enabled in GCP project + script.google.com/home/usersettings
//   - GITHUB_TOKEN set in Script Properties (Project Settings → Script Properties)
//   - OAuth scopes in appsscript.json:
//       script.projects, script.external_request, script.deployments, spreadsheets
//
// GOTCHAS:
//   - doPost() runs the CURRENTLY DEPLOYED code, not the just-pushed code
//   - location.reload() doesn't work in GAS sandbox — use postMessage to parent
//   - pushed_version uses read-and-clear pattern to prevent infinite reload loops
//   - Apps Script has a 200 version limit — manually delete old versions periodically
//
// IMPORTANT — AUTO-INCREMENT VERSION ON EVERY COMMIT:
//   Whenever you (Claude Code) make ANY change to this file and commit,
//   you MUST also increment the VERSION variable by 0.01.
// =============================================

// =============================================
// PROJECT CONFIG — Change these when reusing for a different project
// =============================================
var VERSION = "01.00g";
var TITLE = "YOUR_PROJECT_TITLE";

// Auto-refresh: set to false to disable GAS-side version polling
// (doPost will still deploy new code, but won't signal the page to reload)
var AUTO_REFRESH = true;

// Show/hide: set to false to hide the title or GAS version in the iframe
var SHOW_TITLE = true;
var SHOW_VERSION = true;

// Google Sheets
var SPREADSHEET_ID   = "YOUR_SPREADSHEET_ID";
var SHEET_NAME       = "YOUR_SHEET_NAME";

// GitHub
var GITHUB_OWNER     = "PFCAssociates";
var GITHUB_REPO      = "PFC_Website";
var GITHUB_BRANCH    = "main";
var FILE_PATH        = "googleAppsScripts/YOUR_PROJECT_FOLDER/YOUR_CODE_FILE.gs";

// Apps Script Deployment
var DEPLOYMENT_ID    = "YOUR_DEPLOYMENT_ID";

// Embedding page URL (where the GAS app is iframed)
var EMBED_PAGE_URL   = "https://pfcassociates.github.io/PFC_Website/YOUR_PAGE.html";
// =============================================

function doGet() {
  var html = `
    <html>
    <head>
      <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
      <style>
        html, body { height: 100%; margin: 0; overflow: auto; }
        body { font-family: Arial; display: flex; flex-direction: column; align-items: center; }
        #title { font-size: 28px; margin: 0 0 4px 0; }
        #version { font-size: 14px; color: #888; }
      </style>
    </head>
    <body>
      <h1 id="title">...</h1>
      <div id="version">...</div>

      <script>
        function applyData(data) {
          for (var key in data) {
            var el = document.getElementById(key);
            if (el) el.textContent = data[key];
          }
        }

        google.script.run
          .withSuccessHandler(function(data) { applyData(data); })
          .getAppData();

        // Hide title/version if toggled off
        if (!${SHOW_TITLE}) document.getElementById('title').style.display = 'none';
        if (!${SHOW_VERSION}) document.getElementById('version').style.display = 'none';

        // Poll for new deployed version every 15s (set by doPost after deploy)
        var _autoRefresh = ${AUTO_REFRESH};
        var _autoPulling = false;
        if (_autoRefresh) {
          function pollPushedVersionFromCache() {
            if (_autoPulling) return;
            google.script.run
              .withSuccessHandler(function(pushed) {
                if (!pushed) return;
                var current = (document.getElementById('version').textContent || '').trim();
                if (pushed !== current && pushed !== '') {
                  _autoPulling = true;
                  var reloadMsg = {type: 'gas-reload', version: pushed};
                  try { window.top.postMessage(reloadMsg, '*'); } catch(e) {}
                  try { window.parent.postMessage(reloadMsg, '*'); } catch(e) {}
                  setTimeout(function() { _autoPulling = false; }, 30000);
                }
              })
              .readPushedVersionFromCache();
          }
          setInterval(pollPushedVersionFromCache, 15000);
        }
      </script>
    </body>
    </html>
  `;
  return HtmlService.createHtmlOutput(html)
    .setTitle(TITLE)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// POST endpoint — called by GitHub Action after merging to main.
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
  var val = cache.get("pushed_version");
  if (val) cache.remove("pushed_version");
  return val || "";
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
