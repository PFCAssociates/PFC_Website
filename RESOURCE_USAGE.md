# Resource & Quota Usage Reference

All resource-consuming mechanisms in the GAS app (`googleAppsScripts/Gas Self-Update Dashboard/Code.gs`) and embedding page (`httpsdocs/test.html`), with daily usage, limits, and code locations.

Assumes **1 open browser tab, 24 hours, no manual deploys**.

---

## Daily Quota Summary

| Resource | Daily Usage | Daily Limit | % Used | Main Consumer |
|----------|-------------|-------------|--------|---------------|
| Execution Time | ~8-11 min | 90 min | 9-12% | All 3 GAS polling loops combined |
| UrlFetchApp | ~1,442 calls | 20,000 | 7.2% | GitHub quota poll (1,440/day) |
| SpreadsheetApp | ~4-8 reads | ~20,000 | 0.04% | B1 cache misses (~4/day) |
| CacheService | ~11,520 | No limit | N/A | B1 poll + pushed version poll |
| MailApp (read-only) | 1,440 | No limit | N/A | GitHub quota poll |
| GitHub API | ~1,440 | 5,000/hr | 0.5%/hr | GitHub quota poll |
| GitHub Pages fetch | 8,640 | No limit | N/A | Build-version poll (test.html) |

---

## Automatic Polling Loops

These run continuously while the page is open.

### 1. B1 Cell Polling (every 15s)

| | |
|---|---|
| **Purpose** | Display live spreadsheet cell B1 content in the GAS UI |
| **Client function** | `pollB1FromCache()` — Code.gs:1057 |
| **Client trigger** | `setInterval(pollB1FromCache, 15000)` — Code.gs:1065 |
| **Server function** | `readB1FromCacheOrSheet()` — Code.gs:1287 |
| **Services** | CacheService.get("live_b1") on every call; SpreadsheetApp.openById().getRange("B1").getValue() on cache miss only |
| **Cache TTL** | 6 hours; refreshed by installable onEdit trigger |
| **Cache keeper** | `onEditWriteB1ToCache(e)` — Code.gs:1304 |
| **Calls/day** | 5,760 CacheService reads, ~4 SpreadsheetApp reads |
| **Exec time** | ~2.9 min/day (5,760 x ~30ms) |
| **Status** | Well-optimized. 99.9% cache hits. |

### 2. Pushed Version Polling (every 15s)

| | |
|---|---|
| **Purpose** | Detect when a new GAS deploy has been pushed (via doPost) |
| **Client function** | `pollPushedVersionFromCache()` — Code.gs:1070 |
| **Client trigger** | `setInterval(pollPushedVersionFromCache, 15000)` — Code.gs:1092 |
| **Server function** | `readPushedVersionFromCache()` — Code.gs:1278 |
| **Services** | CacheService.get("pushed_version") + CacheService.remove() (read-and-clear pattern) |
| **Cache TTL** | 1 hour; set by `doPost(action=deploy)` |
| **Calls/day** | 5,760 CacheService reads |
| **Exec time** | ~2.9 min/day (5,760 x ~30ms) |
| **Status** | Well-optimized. CacheService only, no heavy APIs. |

### 3. GitHub Quota & Limits Polling (every 60s)

| | |
|---|---|
| **Purpose** | Display live GitHub API rate limits and mail quota in the GAS UI |
| **Client function** | `pollQuotaAndLimits()` — Code.gs:1095 |
| **Client trigger** | Initial call (Code.gs:1110) + `setInterval(pollQuotaAndLimits, 60000)` — Code.gs:1111 |
| **Server function** | `fetchGitHubQuotaAndLimits()` — Code.gs:1240 |
| **Services** | UrlFetchApp → `https://api.github.com/rate_limit` + MailApp.getRemainingDailyQuota() |
| **Calls/day** | 1,440 UrlFetchApp calls, 1,440 MailApp reads |
| **Exec time** | ~2.4 min/day (1,440 x ~100ms) |
| **Status** | Largest single consumer. Could increase interval to 300s to save 1,152 UrlFetchApp/day if needed. |

### 4. Build-Version Polling (every 10s) — test.html

| | |
|---|---|
| **Purpose** | Detect when a new version of test.html has been deployed to GitHub Pages |
| **Client function** | `checkForUpdate()` — test.html:159 |
| **Client trigger** | `setTimeout(checkForUpdate, POLL_INTERVAL)` — test.html:182 (POLL_INTERVAL = 10000) |
| **Server function** | None — fetches own HTML from GitHub Pages CDN |
| **Services** | Browser `fetch()` with `cache: 'no-store'` to own URL |
| **GAS cost** | Zero |
| **Network** | 8,640 requests/day to GitHub Pages |
| **Status** | No GAS quota impact. GitHub Pages has no practical rate limit. |

---

## User-Triggered Actions

These only run when the user clicks a button or loads the page.

| Action | Code Location | Services Used | Cost | Frequency |
|--------|---------------|---------------|------|-----------|
| **Manual Deploy** (Pull Latest from GitHub button) | `checkForUpdates()` — Code.gs:1115 → `pullAndDeployFromGitHub()` — Code.gs:1332 | UrlFetchApp x4-6 (GitHub API + Apps Script API), SpreadsheetApp x2 (A1, C1) | ~2-5s exec time | Rare (manual) |
| **Test Sound** button | `playReadySound()` — Code.gs:969 → `getSoundBase64()` — Code.gs:1231 | UrlFetchApp x1 (Google Drive download, first click only; cached in client after) | ~200ms exec time | Rare |
| **Test "Code Ready" Reload** button | test.html:50 (inline onclick) | None — sets sessionStorage flags + page reload | Zero GAS cost | Testing only |
| **Test "Website Ready" Reload** button | test.html:51 (inline onclick) | None — sets sessionStorage flags + page reload | Zero GAS cost | Testing only |
| **Reload Page** button (in GAS iframe) | postMessage({type:'manual-reload'}) — Code.gs inline onclick | None — postMessage to parent, parent reloads | Zero GAS cost | Occasional |
| **Page load** (doGet + getAppData) | `doGet()` — Code.gs:896, `getAppData()` — Code.gs:1200 | UrlFetchApp (Apps Script versions API, cache-backed) | ~200-500ms exec time | Per page load |

---

## Event-Driven Mechanisms

These fire in response to external events, not on a schedule.

| Trigger | Code Location | Services | When It Fires |
|---------|---------------|----------|---------------|
| **onEditWriteB1ToCache** (installable trigger) | Code.gs:1304 | CacheService.put("live_b1", value, 21600) | When cell B1 on the target sheet is manually edited |
| **doPost(action=deploy)** | Code.gs:1167 | `pullAndDeployFromGitHub()` + SpreadsheetApp (A1, C1) + CacheService.put("pushed_version") | Per git push (called by GitHub Action workflow) |
| **postMessage: gas-reload** listener | test.html:132 | sessionStorage (set flags) + window.location.reload() | When GAS iframe detects a new pushed_version |
| **postMessage: manual-reload** listener | test.html:129 | window.location.reload() | When user clicks Reload Page button in GAS iframe |
| **Screen Wake Lock** | test.html:185-193 | navigator.wakeLock.request('screen') | On page load + tab visibility change |

---

## Code Location Index

### Code.gs — Server-Side Functions

| Function | Line | Purpose |
|----------|------|---------|
| `doGet()` | 896 | Serves the HTML UI |
| `doPost(e)` | 1167 | Handles deploy requests from GitHub Action |
| `getAppData()` | 1200 | Returns version info, Apps Script version count |
| `getSoundBase64()` | 1231 | Fetches MP3 from Google Drive, returns as data URL |
| `fetchGitHubQuotaAndLimits()` | 1240 | Queries GitHub rate limit API + MailApp quota |
| `readPushedVersionFromCache()` | 1278 | Read-and-clear pushed_version from CacheService |
| `readB1FromCacheOrSheet()` | 1287 | Cache-backed B1 cell read |
| `onEditWriteB1ToCache(e)` | 1304 | Installable trigger — writes B1 edits to cache |
| `writeVersionToSheetA1()` | 1314 | Writes current version to sheet cell A1 |
| `writeVersionToSheetC1()` | 1323 | Writes current version to sheet cell C1 |
| `pullAndDeployFromGitHub()` | 1332 | Full deploy pipeline: GitHub fetch → Apps Script API |

### Code.gs — Client-Side Functions (inside doGet HTML)

| Function | Line | Purpose |
|----------|------|---------|
| `playReadySound()` | 969 | Lazy-loads Drive sound on first click, plays it |
| `playBeep()` | 1013 | AudioContext beep (fallback) |
| `testVibrate()` | 1027 | Test device vibration |
| `applyData(data)` | 1039 | Updates UI with server data |
| `pollB1FromCache()` | 1057 | Polls B1 cell value every 15s |
| `pollPushedVersionFromCache()` | 1070 | Polls pushed_version every 15s |
| `pollQuotaAndLimits()` | 1095 | Polls GitHub quota every 60s |
| `checkForUpdates()` | 1115 | Manual deploy button handler |

### test.html — Functions

| Function | Line | Purpose |
|----------|------|---------|
| `unlockAudio()` | 61 | Unlocks AudioContext on user gesture |
| `playSoundFromDataUrl(dataUrl)` | 75 | Decodes and plays base64 audio |
| `cacheSound(url, key)` | 93 | Fetches MP3 from same-origin, caches in localStorage |
| `checkForUpdate()` | 159 | Polls own HTML for build-version changes |
| `requestWakeLock()` | 185 | Requests screen wake lock |

---

## Scaling with Multiple Tabs

Each open browser tab runs all polling loops independently.

| Tabs | Execution Time/Day | UrlFetchApp/Day | % of Exec Limit | % of UrlFetch Limit |
|------|--------------------|-----------------|------------------|---------------------|
| 1 | ~8-11 min | ~1,442 | 9-12% | 7.2% |
| 2 | ~16-22 min | ~2,884 | 18-24% | 14.4% |
| 3 | ~24-33 min | ~4,326 | 27-37% | 21.6% |
| 5 | ~40-55 min | ~7,210 | 44-61% | 36.1% |
| 8 | ~64-88 min | ~11,536 | 71-98% | 57.7% |

**Bottleneck**: Execution time (90 min/day) is the binding constraint. Hits the limit at ~8 simultaneous tabs.

---

## Optimization Opportunities

None of these are needed currently — all usage is well within limits for 1-3 tabs.

| Change | Saves | Trade-off |
|--------|-------|-----------|
| GitHub quota poll: 60s → 300s | 1,152 UrlFetchApp/day, ~2 min exec time | Quota display updates every 5 min instead of 1 min |
| B1 poll: 15s → 30s | ~2,880 CacheService reads, ~1.4 min exec time | B1 display may lag up to 30s |
| Pushed version poll: 15s → 30s | ~2,880 CacheService reads, ~1.4 min exec time | GAS update detection may lag up to 30s |
| Build-version poll: 10s → 30s | 5,760 fewer GitHub Pages fetches | Website update detection may lag up to 30s |
