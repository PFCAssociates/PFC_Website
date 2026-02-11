// =============================================
// AED MONTHLY INSPECTION LOG — GOOGLE APPS SCRIPT
// =============================================
//
// A Google Apps Script web app that renders an AED Monthly Inspection Log
// form matching the standard paper form. Uses Google Sheets as the backend
// for storing configuration (AED location, serial no., etc.) and monthly
// inspection data (auto-stamped with the signed-in user's name + timestamp).
//
// AUTH:
//   Users must be signed into their Google account. The active user's email
//   is resolved via Session.getActiveUser(). The display name is derived
//   from the email prefix. Clicking a cell auto-stamps it server-side
//   with the authenticated user's name and a timestamp — no manual input.
//
// SHEET STRUCTURE:
//   AED_Config      — key/value pairs for header fields (year, location, etc.)
//   AED_Inspections — rows of year|month|col1..col6 (each cell: "Name | timestamp")
//   Live_Sheet      — used by self-update mechanism (version tracking)
//
// IMPORTANT — AUTO-INCREMENT VERSION ON EVERY COMMIT:
//   Whenever you (Claude Code) make ANY change to this file and commit,
//   you MUST also increment the VERSION variable by 0.01.
// =============================================

// =============================================
// PROJECT CONFIG
// =============================================
var VERSION = "01.30g";
var TITLE = "AED Monthly Inspection Log";

var AUTO_REFRESH = true;
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

var EMBED_PAGE_URL   = "https://pfcassociates.github.io/PFC_Website/aedlog.html";

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

// =============================================
// AUTH — Get the active Google user's info
// =============================================

/**
 * Returns the signed-in user's info and access status.
 * Possible statuses:
 *   "not_signed_in" — no active Google session detected
 *   "authorized"    — signed in (email resolved)
 * Always includes scriptUrl so the client can link to the GAS app for auth.
 */
function getUserInfo() {
  var scriptUrl = ScriptApp.getService().getUrl();
  var email = Session.getActiveUser().getEmail();
  if (!email) {
    return { status: "not_signed_in", scriptUrl: scriptUrl };
  }
  var prefix = email.split("@")[0];
  var displayName = prefix.split(/[._-]/).map(function(part) {
    return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
  }).join(" ");
  return { status: "authorized", email: email, displayName: displayName };
}

// =============================================
// WEB APP ENTRY POINT
// =============================================

function doGet(e) {
  // If not loaded inside the embedding page (e.g. after Google sign-in redirect),
  // close the tab so the user returns to the original page
  if (!e || !e.parameter || !e.parameter.embedded) {
    return HtmlService.createHtmlOutput(
      '<html><body style="font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;height:100%;margin:0;color:#666;flex-direction:column;gap:16px;text-align:center">'
      + '<div style="font-size:48px;color:#43a047">&#10003;</div>'
      + '<h2 style="margin:0;color:#222">Sign-In Complete</h2>'
      + '<p>You can close this tab. The inspection log will refresh automatically.</p>'
      + '<script>window.close();</script></body></html>'
    );
  }
  var html = buildFormHtml();
  return HtmlService.createHtmlOutput(html)
    .setTitle(TITLE)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function buildFormHtml() {
  var colThs = "";
  for (var i = 0; i < COL_HEADERS.length; i++) {
    colThs += '<th class="check-col"><div class="col-text">' + COL_HEADERS[i] + '</div><div class="init-lbl">(click to sign)</div></th>';
  }

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
    /* User bar */\
    .user-bar{background:#e3f2fd;border-bottom:1px solid #90caf9;padding:6px 18px;font-size:12px;color:#1565c0;display:flex;align-items:center;gap:6px}\
    .user-bar .dot{width:8px;height:8px;border-radius:50%;background:#43a047;flex-shrink:0}\
    .user-bar .uname{font-weight:bold}\
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
    .init-cell{padding:4px 2px;height:48px;cursor:pointer;position:relative;transition:background .15s;vertical-align:middle}\
    .init-cell:hover{background:#e3f2fd}\
    .init-cell.has{background:#e8f5e9;cursor:default}\
    .init-cell.has:hover{background:#c8e6c9}\
    .init-cell .stamp-name{font-size:11px;font-weight:bold;color:#1565c0;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\
    .init-cell .stamp-date{font-size:9px;color:#888;line-height:1.2;white-space:nowrap}\
    .init-cell .stamp-clear{position:absolute;top:1px;right:2px;font-size:10px;color:#999;cursor:pointer;display:none;padding:0 3px;line-height:1;border-radius:3px}\
    .init-cell.has:hover .stamp-clear{display:block}\
    .init-cell .stamp-clear:hover{color:#d32f2f;background:rgba(211,47,47,.1)}\
    .init-cell.stamping{pointer-events:none;opacity:.6}\
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
    .ld{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(255,255,255,.85);display:flex;align-items:center;justify-content:center;z-index:9999;font-size:18px;color:#666;flex-direction:column;gap:12px}\
    .ld.off{display:none}\
    /* Auth wall */\
    .auth-wall{position:fixed;top:0;left:0;right:0;bottom:0;background:#fff;display:none;align-items:center;justify-content:center;z-index:10000;flex-direction:column;gap:16px;text-align:center;padding:20px}\
    .auth-wall.show{display:flex}\
    .auth-wall h2{margin:0;color:#d32f2f}\
    .auth-wall p{margin:0;color:#666;max-width:440px;line-height:1.6;font-size:14px}\
    .auth-wall .auth-email{font-weight:bold;color:#222}\
    .auth-wall .auth-btn{display:inline-block;margin-top:4px;padding:10px 28px;border:none;border-radius:6px;font-size:15px;font-weight:bold;cursor:pointer;color:#fff;text-decoration:none;transition:background .2s}\
    .auth-wall .auth-btn.signin{background:#1a73e8}\
    .auth-wall .auth-btn.signin:hover{background:#1557b0}\
    .auth-wall .auth-btn.switch{background:#f4511e}\
    .auth-wall .auth-btn.switch:hover{background:#d63c0e}\
    .auth-wall .auth-hint{font-size:12px;color:#999;margin-top:0}\
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
      .init-cell .stamp-name{font-size:10px}\
      .init-cell .stamp-date{font-size:8px}\
    }\
  </style>\
</head>\
<body>\
  <div class="auth-wall" id="auth-wall"></div>\
  <div class="ld" id="ld">Loading inspection log...</div>\
  <div class="sv" id="sv">Saving...</div>\
  <div class="wrap">\
    <div class="user-bar" id="user-bar" style="display:none"><span class="dot"></span>Signed in as: <span class="uname" id="uname"></span></div>\
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
    var _user=null;\
    function notifyParentAuth(){\
      var msg={type:"gas-auth-complete"};\
      try{window.top.postMessage(msg,"*")}catch(e){}\
      try{window.parent.postMessage(msg,"*")}catch(e){}\
    }\
    function openSignIn(url){\
      var w=window.open(url,"_blank");\
      var authPoll=setInterval(function(){\
        google.script.run.withSuccessHandler(function(info){\
          if(info&&info.status==="authorized"){\
            clearInterval(authPoll);\
            notifyParentAuth();\
          }\
        }).withFailureHandler(function(){}).getUserInfo();\
      },3000);\
      if(w){\
        var closePoll=setInterval(function(){\
          try{if(w.closed){clearInterval(closePoll);clearInterval(authPoll);notifyParentAuth();}}catch(e){}\
        },500);\
      }\
    }\
    function sOn(){_sav++;document.getElementById("sv").classList.add("on")}\
    function sOff(){_sav--;if(_sav<=0){_sav=0;document.getElementById("sv").classList.remove("on")}}\
\
    /* Render a stamp value ("Name | date") into a cell */\
    function renderCell(cell,val){\
      cell.innerHTML="";\
      if(!val){cell.classList.remove("has");return;}\
      cell.classList.add("has");\
      var parts=val.split(" | ");\
      var nameDiv=document.createElement("div");\
      nameDiv.className="stamp-name";\
      nameDiv.textContent=parts[0]||"";\
      cell.appendChild(nameDiv);\
      if(parts[1]){\
        var dateDiv=document.createElement("div");\
        dateDiv.className="stamp-date";\
        dateDiv.textContent=parts[1];\
        cell.appendChild(dateDiv);\
      }\
      var clearBtn=document.createElement("span");\
      clearBtn.className="stamp-clear";\
      clearBtn.textContent="\\u2715";\
      clearBtn.title="Clear this entry";\
      clearBtn.addEventListener("click",function(e){\
        e.stopPropagation();\
        if(!confirm("Clear this inspection entry?"))return;\
        cell.classList.add("stamping");\
        sOn();\
        google.script.run\
          .withSuccessHandler(function(){\
            sOff();\
            cell.classList.remove("stamping");\
            renderCell(cell,"");\
          })\
          .withFailureHandler(function(err){\
            sOff();\
            cell.classList.remove("stamping");\
            alert("Error: "+err.message);\
          })\
          .clearInspection(document.getElementById("yr").value,parseInt(cell.getAttribute("data-m")),parseInt(cell.getAttribute("data-c")));\
      });\
      cell.appendChild(clearBtn);\
    }\
\
    var _signInUrl="";\
    function showAuthWall(d){\
      var wall=document.getElementById("auth-wall");\
      var scriptUrl=d.scriptUrl||"";\
      _signInUrl="https://accounts.google.com/AccountChooser"+(scriptUrl?"?continue="+encodeURIComponent(scriptUrl):"");\
      if(d.authStatus==="no_access"){\
        wall.innerHTML="<h2>Access Denied</h2>"\
          +"<p>Your account <span class=auth-email>"+((d.email||"")+"</span> does not have access to the inspection log spreadsheet.</p>")\
          +"<a class=\'auth-btn switch\' href=\'#\' onclick=\'openSignIn(_signInUrl);return false;\'>Switch Google Account</a>"\
          +"<p class=auth-hint>Sign in with an account that has access, or ask your administrator to share the spreadsheet with you.</p>";\
      }else{\
        wall.innerHTML="<h2>Sign-In Required</h2>"\
          +"<p>You must be signed into an authorized Google account to use this inspection log.</p>"\
          +"<p>If you are already signed in, your account may not have access. Try switching to an authorized account.</p>"\
          +"<a class=\'auth-btn signin\' href=\'#\' onclick=\'openSignIn(_signInUrl);return false;\'>Sign In / Switch Account</a>"\
          +"<p class=auth-hint>A sign-in tab will open. This page will refresh automatically once you sign in.</p>";\
      }\
      wall.classList.add("show");\
    }\
\
    function loadData(){\
      google.script.run\
        .withSuccessHandler(function(d){\
          if(!d.authorized){\
            if(d.version)document.getElementById("gv").textContent=d.version;\
            showAuthWall(d);\
            document.getElementById("ld").classList.add("off");\
            return;\
          }\
          document.getElementById("auth-wall").classList.remove("show");\
          _user=d.user;\
          document.getElementById("uname").textContent=d.user.displayName+" ("+d.user.email+")";\
          document.getElementById("user-bar").style.display="";\
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
        renderCell(c,ins[k]||"");\
      }\
      if(d.version)document.getElementById("gv").textContent=d.version;\
    }\
\
    /* Config field auto-save */\
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
    /* Inspection cell click — auto-stamp with user name + timestamp */\
    document.querySelectorAll(".init-cell").forEach(function(cell){\
      cell.addEventListener("click",function(){\
        if(cell.classList.contains("has"))return;\
        if(cell.classList.contains("stamping"))return;\
        var yr=document.getElementById("yr");\
        if(!yr.value){\
          yr.focus();\
          yr.classList.add("warn");\
          setTimeout(function(){yr.classList.remove("warn");},1500);\
          return;\
        }\
        cell.classList.add("stamping");\
        sOn();\
        google.script.run\
          .withSuccessHandler(function(stampValue){\
            sOff();\
            cell.classList.remove("stamping");\
            renderCell(cell,stampValue);\
          })\
          .withFailureHandler(function(err){\
            sOff();\
            cell.classList.remove("stamping");\
            alert("Error: "+err.message);\
          })\
          .stampInspection(yr.value,parseInt(cell.getAttribute("data-m")),parseInt(cell.getAttribute("data-c")));\
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
          if(pushed!==cur&&pushed!==""&&cur!==""){\
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
 * Returns all form data: config + inspections for the current year + user info.
 * If the user is not signed in, returns {authorized:false}.
 */
function getFormData() {
  var userInfo = getUserInfo();
  if (userInfo.status !== "authorized") {
    return { authorized: false, authStatus: userInfo.status, email: userInfo.email || "", scriptUrl: userInfo.scriptUrl || "", version: "v" + VERSION };
  }

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

  return { authorized: true, user: userInfo, config: config, inspections: inspections, version: "v" + VERSION };
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
  cfgSheet.appendRow([key, value]);
  return true;
}

/**
 * Stamps an inspection cell with the authenticated user's name + current timestamp.
 * Returns the stamped string so the client can display it immediately.
 */
function stampInspection(yearSuffix, monthIndex, colIndex) {
  var userInfo = getUserInfo();
  if (userInfo.status !== "authorized") throw new Error("You must be signed into a Google account with spreadsheet access.");

  var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "M/d/yyyy h:mm a");
  var value = userInfo.displayName + " | " + timestamp;

  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
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
  return value;
}

/**
 * Clears an inspection cell (sets it to empty).
 */
function clearInspection(yearSuffix, monthIndex, colIndex) {
  var userInfo = getUserInfo();
  if (userInfo.status !== "authorized") throw new Error("You must be signed into a Google account with spreadsheet access.");

  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var insSheet = ss.getSheetByName(INSPECT_SHEET);
  if (!insSheet) return true;

  var data = insSheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(yearSuffix) && String(data[i][1]) === String(monthIndex)) {
      insSheet.getRange(i + 1, colIndex + 3).setValue("");
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
