// =============================================
// AED MONTHLY INSPECTION LOG — GOOGLE APPS SCRIPT
// =============================================
//
// A Google Apps Script web app that renders an AED Monthly Inspection Log
// form matching the standard paper form. Uses Google Sheets as the backend
// for storing configuration (AED location, serial no., etc.) and monthly
// inspection data (inspector initials for each checklist item).
//
// SHEET STRUCTURE:
//   AED_Config    — key/value pairs for header fields (year, location, etc.)
//   AED_Inspections — rows of year|month|col1..col6 initials
//   Live_Sheet    — used by self-update mechanism (version tracking)
//
// HOW IT WORKS:
//   1. doGet() renders the full HTML inspection log form
//   2. Client JS calls getFormData() to load config + inspections
//   3. Edits auto-save via saveConfig() and saveInspection()
//   4. Self-update infrastructure (doPost, pullAndDeploy) preserved
//
// IMPORTANT — AUTO-INCREMENT VERSION ON EVERY COMMIT:
//   Whenever you (Claude Code) make ANY change to this file and commit,
//   you MUST also increment the VERSION variable by 0.01.
// =============================================

// =============================================
// PROJECT CONFIG — Change these when reusing for a different project
// =============================================
var VERSION = "01.11g";
var TITLE = "AED Monthly Inspection Log";

// Auto-refresh: set to false to disable GAS-side version polling
var AUTO_REFRESH = true;

// Show/hide: set to false to hide the GAS version in the iframe
var SHOW_VERSION = true;

// Google Sheets
var SPREADSHEET_ID   = "1JhpU30Vd08lYPD6bWNR-BlYaKf4iAz1mY1IykCYMwSQ";
var SHEET_NAME       = "Live_Sheet";
var CONFIG_SHEET     = "AED_Config";
var INSPECT_SHEET    = "AED_Inspections";

// GitHub
var GITHUB_OWNER     = "PFCAssociates";
var GITHUB_REPO      = "PFC_Website";
var GITHUB_BRANCH    = "main";
var FILE_PATH        = "googleAppsScripts/AED Monthly Inspection Log/AED_Log_Code.gs";

// Apps Script Deployment
var DEPLOYMENT_ID    = "AKfycbyvnX5EmqA1jlbMiHD8VsLBdY8Xf00xlHF8mHsP02luflJFfhZVJl8ApxJA7I5e1udu";

// Embedding page URL (where the GAS app is iframed)
var EMBED_PAGE_URL   = "https://pfcassociates.github.io/PFC_Website/aedlog.html";

// Month names and inspection column headers
var MONTHS = ["January","February","March","April","May","June",
              "July","August","September","October","November","December"];

var COL_HEADERS = [
  "AED secure in case, with no cracks, broken parts or damage",
  "Expiration dates checked on pads and batteries",
  "AED Operation Verified *(see below for list)",
  "PPE/Ready Kit Stocked and in place **(see below for list)",
  "Electrodes in place",
  "Extra sets of electrodes are sealed in their package"
];
// =============================================

function doGet() {
  var html = buildFormHtml();
  return HtmlService.createHtmlOutput(html)
    .setTitle(TITLE)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function buildFormHtml() {
  // Build column header <th> elements
  var colThs = "";
  for (var i = 0; i < COL_HEADERS.length; i++) {
    colThs += '<th class="check-col"><div class="col-text">' + COL_HEADERS[i] + '</div><div class="init-lbl">(initial)</div></th>';
  }

  // Build month <tr> rows
  var monthRows = "";
  for (var m = 0; m < 12; m++) {
    monthRows += '<tr><td class="mo-cell">' + MONTHS[m] + '</td>';
    for (var c = 0; c < 6; c++) {
      monthRows += '<td class="init-cell" data-m="' + m + '" data-c="' + c + '"></td>';
    }
    monthRows += '</tr>';
  }

  return '<!DOCTYPE html>\
<html>\
<head>\
  <meta charset="UTF-8">\
  <meta name="viewport" content="width=device-width, initial-scale=1.0">\
  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">\
  <style>\
    *{box-sizing:border-box}\
    html,body{height:100%;margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222;background:#f5f5f5}\
    body{display:flex;justify-content:center;padding:10px;overflow:auto}\
    .wrap{background:#fff;max-width:960px;width:100%;border:2px solid #333;box-shadow:0 2px 8px rgba(0,0,0,.1)}\
    /* Header */\
    .hdr{border-bottom:2px solid #333;padding:14px 18px 10px}\
    .title-row{display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px;margin-bottom:10px}\
    .title-row h1{margin:0;font-size:22px}\
    .yr{font-size:16px;font-weight:bold;white-space:nowrap}\
    .yr input{width:36px;border:none;border-bottom:2px solid #333;font-size:16px;font-weight:bold;text-align:center;outline:none;background:transparent}\
    .yr input:focus{border-bottom-color:#1565c0}\
    /* Config fields */\
    .cfg{display:grid;grid-template-columns:1fr 1fr;gap:5px 20px}\
    .fr{display:flex;align-items:baseline;gap:5px;font-size:13px}\
    .fr label{font-weight:bold;white-space:nowrap}\
    .fr input{flex:1;border:none;border-bottom:1.5px solid #999;font-size:13px;padding:2px 4px;outline:none;background:transparent;min-width:60px}\
    .fr input:focus{border-bottom-color:#1565c0}\
    .fr .nt{font-size:10px;color:#666;font-style:italic;white-space:nowrap}\
    /* Table */\
    .tw{overflow-x:auto;-webkit-overflow-scrolling:touch}\
    .tbl{width:100%;border-collapse:collapse;table-layout:fixed}\
    .tbl th,.tbl td{border:1.5px solid #333;text-align:center;vertical-align:middle}\
    .tbl thead th{background:#e8e8e8;font-weight:bold;padding:6px 3px;font-size:11px;line-height:1.25}\
    .tbl th.mo-hdr{width:100px;font-size:12px}\
    .tbl th.check-col{width:calc((100% - 100px)/6)}\
    .col-text{font-size:10.5px}\
    .init-lbl{font-size:9px;font-weight:normal;color:#666;font-style:italic;margin-top:2px}\
    .mo-cell{font-weight:bold;font-size:13px;padding:8px 6px;background:#fafafa;text-align:left;white-space:nowrap}\
    .init-cell{padding:0;height:38px;cursor:pointer;position:relative;font-size:15px;font-weight:bold;color:#1565c0;transition:background .15s}\
    .init-cell:hover{background:#e3f2fd}\
    .init-cell.has{background:#e8f5e9}\
    .init-cell.has:hover{background:#c8e6c9}\
    .init-cell input{position:absolute;top:0;left:0;right:0;bottom:0;width:100%;height:100%;border:2px solid #1565c0;background:#fff;text-align:center;font-size:15px;font-weight:bold;outline:none;text-transform:uppercase}\
    /* Footnotes */\
    .foot{border-top:2px solid #333;padding:10px 18px 14px;font-size:11.5px;line-height:1.5}\
    .foot h3{margin:0 0 3px;font-size:12px}\
    .foot ol{margin:3px 0 10px;padding-left:22px}\
    .foot li{margin-bottom:1px}\
    .foot p{margin:0}\
    .foot .ppe{margin-top:6px}\
    /* Version */\
    #gv{text-align:center;font-size:11px;color:#aaa;padding:4px}\
    /* Saving indicator */\
    .sv{position:fixed;top:8px;right:8px;background:#1565c0;color:#fff;padding:4px 12px;border-radius:12px;font-size:12px;opacity:0;transition:opacity .3s;z-index:1000}\
    .sv.on{opacity:1}\
    /* Loading */\
    .ld{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(255,255,255,.85);display:flex;align-items:center;justify-content:center;z-index:9999;font-size:18px;color:#666}\
    .ld.off{display:none}\
    /* Year warning */\
    .yr input.warn{border-bottom-color:#d32f2f;animation:pulse-warn .4s ease 2}\
    @keyframes pulse-warn{0%,100%{border-bottom-color:#d32f2f}50%{border-bottom-color:#ff8a80}}\
    /* Responsive */\
    @media(max-width:700px){\
      .cfg{grid-template-columns:1fr}\
      .title-row h1{font-size:17px}\
      .tbl th.mo-hdr{width:68px}\
      .mo-cell{font-size:11px}\
      .col-text{font-size:9px}\
    }\
  </style>\
</head>\
<body>\
  <div class="ld" id="ld">Loading inspection log...</div>\
  <div class="sv" id="sv">Saving...</div>\
  <div class="wrap">\
    <div class="hdr">\
      <div class="title-row">\
        <h1>AED Monthly Inspection Log</h1>\
        <div class="yr">Year: 20<input type="text" id="yr" maxlength="2" placeholder="__"></div>\
      </div>\
      <div class="cfg">\
        <div class="fr"><label>Building:</label><span>PFC Associates, LLC</span></div>\
        <div class="fr"><label>AED Serial No.:</label><input type="text" id="serial_no"></div>\
        <div class="fr"><label>AED Location:</label><input type="text" id="aed_location"></div>\
        <div class="fr"><label>AED Battery Date:</label><input type="text" id="battery_date"><span class="nt">(exp. 5 yrs from date)</span></div>\
        <div class="fr"><label>Defib Pad&#39;s Expiration Date:</label><input type="text" id="pad_expiration"></div>\
      </div>\
    </div>\
    <div class="tw">\
      <table class="tbl">\
        <thead><tr><th class="mo-hdr">Month/Year</th>' + colThs + '</tr></thead>\
        <tbody>' + monthRows + '</tbody>\
      </table>\
    </div>\
    <div class="foot">\
      <h3>*Operation Checklist:</h3>\
      <ol>\
        <li>Open the AED lid.</li>\
        <li>Wait for the AED to indicate status: Observe the change of the STATUS INDICATOR to RED. After approximately five seconds, verify that the STATUS INDICATOR returns to GREEN.</li>\
        <li>Check the expiration date on the electrodes.</li>\
        <li>Listen for the voice prompts.</li>\
        <li>Close the lid and observe the change of the STATUS INDICATOR to RED. After approximately five seconds, verify that the STATUS INDICATOR returns to GREEN.</li>\
        <li>Check the expiration date of the battery.</li>\
      </ol>\
      <p class="ppe"><strong>**PPE/Ready Kit includes:</strong> 1 pocket mask; 1 trauma scissor; 2 pair of gloves; 2 &#8212; 4&quot;x4&quot; gauze pad; 1 razor; 1 antiseptic towelette</p>\
    </div>\
    <div id="gv"></div>\
  </div>\
  <script>\
    var _yr="";\
    var _sav=0;\
    function sOn(){_sav++;document.getElementById("sv").classList.add("on")}\
    function sOff(){_sav--;if(_sav<=0){_sav=0;document.getElementById("sv").classList.remove("on")}}\
\
    function loadData(){\
      google.script.run\
        .withSuccessHandler(function(d){\
          populate(d);\
          document.getElementById("ld").classList.add("off");\
        })\
        .withFailureHandler(function(e){\
          document.getElementById("ld").textContent="Error: "+e.message;\
        })\
        .getFormData();\
    }\
\
    function populate(d){\
      var cfg=d.config||{};\
      document.getElementById("yr").value=cfg.year_suffix||"";\
      document.getElementById("aed_location").value=cfg.aed_location||"";\
      document.getElementById("serial_no").value=cfg.serial_no||"";\
      document.getElementById("battery_date").value=cfg.battery_date||"";\
      document.getElementById("pad_expiration").value=cfg.pad_expiration||"";\
      _yr=cfg.year_suffix||"";\
      var ins=d.inspections||{};\
      var cells=document.querySelectorAll(".init-cell");\
      for(var i=0;i<cells.length;i++){\
        var c=cells[i];\
        var k=c.getAttribute("data-m")+"_"+c.getAttribute("data-c");\
        var v=ins[k]||"";\
        c.textContent=v;\
        if(v)c.classList.add("has");else c.classList.remove("has");\
      }\
      if(d.version)document.getElementById("gv").textContent=d.version;\
    }\
\
    /* Config field auto-save on change */\
    ["aed_location","serial_no","battery_date","pad_expiration"].forEach(function(id){\
      var el=document.getElementById(id);\
      el.addEventListener("change",function(){\
        sOn();\
        google.script.run.withSuccessHandler(sOff).withFailureHandler(sOff).saveConfig(id,el.value);\
      });\
    });\
\
    /* Year field */\
    document.getElementById("yr").addEventListener("change",function(){\
      var v=this.value.replace(/[^0-9]/g,"").substring(0,2);\
      this.value=v;\
      if(v!==_yr){\
        _yr=v;\
        sOn();\
        google.script.run.withSuccessHandler(function(){sOff();loadData();}).withFailureHandler(sOff).saveConfig("year_suffix",v);\
      }\
    });\
\
    /* Inspection cell editing */\
    document.querySelectorAll(".init-cell").forEach(function(cell){\
      cell.addEventListener("click",function(){\
        if(cell.querySelector("input"))return;\
        var yr=document.getElementById("yr");\
        if(!yr.value){\
          yr.focus();\
          yr.classList.add("warn");\
          setTimeout(function(){yr.classList.remove("warn");},1500);\
          return;\
        }\
        var cur=cell.textContent.trim();\
        var inp=document.createElement("input");\
        inp.type="text";inp.maxLength=4;inp.value=cur;\
        cell.textContent="";\
        cell.appendChild(inp);\
        inp.focus();inp.select();\
        function done(){\
          var nv=inp.value.trim().toUpperCase();\
          if(inp.parentNode)inp.parentNode.removeChild(inp);\
          cell.textContent=nv;\
          if(nv)cell.classList.add("has");else cell.classList.remove("has");\
          if(nv!==cur){\
            sOn();\
            google.script.run.withSuccessHandler(sOff).withFailureHandler(sOff)\
              .saveInspection(yr.value,parseInt(cell.getAttribute("data-m")),parseInt(cell.getAttribute("data-c")),nv);\
          }\
        }\
        inp.addEventListener("blur",done);\
        inp.addEventListener("keydown",function(e){\
          if(e.key==="Enter")inp.blur();\
          if(e.key==="Escape"){if(inp.parentNode)inp.parentNode.removeChild(inp);cell.textContent=cur;if(cur)cell.classList.add("has");}\
        });\
      });\
    });\
\
    loadData();\
\
    /* Auto-refresh polling */\
    var _ar=' + AUTO_REFRESH + ';\
    var _ap=false;\
    if(_ar){\
      function pollVer(){\
        if(_ap)return;\
        google.script.run.withSuccessHandler(function(pushed){\
          if(!pushed)return;\
          var cur=(document.getElementById("gv").textContent||"").trim();\
          if(pushed!==cur&&pushed!==""){\
            _ap=true;\
            var msg={type:"gas-reload",version:pushed};\
            try{window.top.postMessage(msg,"*")}catch(e){}\
            try{window.parent.postMessage(msg,"*")}catch(e){}\
            setTimeout(function(){_ap=false},30000);\
          }\
        }).readPushedVersionFromCache();\
      }\
      setInterval(pollVer,15000);\
    }\
    if(!' + SHOW_VERSION + ')document.getElementById("gv").style.display="none";\
  </script>\
</body>\
</html>';
}

// =============================================
// DATA FUNCTIONS — Read/write inspection log data
// =============================================

/**
 * Returns all form data: config fields + inspections for the current year.
 * Called by client JS on page load.
 */
function getFormData() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // --- Config sheet ---
  var cfgSheet = ss.getSheetByName(CONFIG_SHEET);
  if (!cfgSheet) {
    cfgSheet = ss.insertSheet(CONFIG_SHEET);
    cfgSheet.getRange("A1:B5").setValues([
      ["year_suffix",     ""],
      ["aed_location",    ""],
      ["serial_no",       ""],
      ["battery_date",    ""],
      ["pad_expiration",  ""]
    ]);
  }
  var cfgData = cfgSheet.getDataRange().getValues();
  var config = {};
  for (var i = 0; i < cfgData.length; i++) {
    if (cfgData[i][0]) config[String(cfgData[i][0])] = String(cfgData[i][1] || "");
  }

  // --- Inspections sheet ---
  var insSheet = ss.getSheetByName(INSPECT_SHEET);
  if (!insSheet) {
    insSheet = ss.insertSheet(INSPECT_SHEET);
    insSheet.appendRow(["year","month","secure","expiration","operation","ppe","electrodes","extra"]);
  }
  var inspections = {};
  var yrSuffix = config.year_suffix || "";
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

  return { config: config, inspections: inspections, version: "v" + VERSION };
}

/**
 * Saves a single config field (key/value) to the AED_Config sheet.
 */
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
  // Key not found — append it
  cfgSheet.appendRow([key, value]);
  return true;
}

/**
 * Saves (upserts) a single inspection cell.
 * @param {string} yearSuffix  2-digit year suffix (e.g. "25")
 * @param {number} monthIndex  0-based month (0=Jan, 11=Dec)
 * @param {number} colIndex    0-based column (0=secure .. 5=extra)
 * @param {string} value       Inspector initials or ""
 */
function saveInspection(yearSuffix, monthIndex, colIndex, value) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var insSheet = ss.getSheetByName(INSPECT_SHEET);
  if (!insSheet) {
    insSheet = ss.insertSheet(INSPECT_SHEET);
    insSheet.appendRow(["year","month","secure","expiration","operation","ppe","electrodes","extra"]);
  }

  // Find existing row for this year + month
  var data = insSheet.getDataRange().getValues();
  var rowIdx = -1;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(yearSuffix) && String(data[i][1]) === String(monthIndex)) {
      rowIdx = i + 1; // 1-based for Sheets API
      break;
    }
  }

  if (rowIdx === -1) {
    // New row
    var newRow = [yearSuffix, monthIndex, "", "", "", "", "", ""];
    newRow[colIndex + 2] = value;
    insSheet.appendRow(newRow);
  } else {
    // Update existing cell (colIndex + 3 because 1-based + year col + month col)
    insSheet.getRange(rowIdx, colIndex + 3).setValue(value);
  }
  return true;
}

// =============================================
// SELF-UPDATE INFRASTRUCTURE — Do not modify unless updating the deploy mechanism
// =============================================

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
