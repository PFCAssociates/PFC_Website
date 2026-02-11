# Claude Code Instructions

## Deployment Flow
- Never push directly to `main`
- Push to `claude/*` branches only
- `.github/workflows/auto-merge-claude.yml` handles everything automatically:
  1. Merges the claude branch into main
  2. Deletes the claude branch
  3. Deploys to GitHub Pages
- The "Create a pull request" message in push output is just GitHub boilerplate — ignore it, the workflow handles merging automatically

## Version Bumping
- **Every commit that modifies a GAS project's `.gs` file MUST also increment its `VERSION` variable by 0.01**
- The `VERSION` variable is near the top of each `.gs` file (look for `var VERSION = "..."`)
- Format includes a `g` suffix: e.g. `"01.13g"`
- Example: if VERSION is `"01.13g"`, change it to `"01.14g"`
- Do NOT bump VERSION if the commit doesn't touch the `.gs` file

### GAS Projects
| Project | Code File | Embedding Page |
|---------|-----------|----------------|
| Gas Self-Update Dashboard | `googleAppsScripts/Gas Self-Update Dashboard/Code.gs` | `httpsdocs/test.html` |
| AED Monthly Inspection Log | `googleAppsScripts/AED Monthly Inspection Log/AED_Log_Code.gs` | `httpsdocs/aedlog.html` |

## Build Version (Auto-Refresh for embedding pages)
- **Every commit that modifies an embedding HTML page MUST increment its `build-version` meta tag by 0.01**
- Look for `<meta name="build-version" content="...">` in the `<head>`
- Format includes a `w` suffix: e.g. `"01.11w"`
- Example: if build-version is `"01.11w"`, change it to `"01.12w"`
- Each embedding page polls itself every 10 seconds — when the deployed version differs from the loaded version, it auto-reloads

## Commit Message Naming
- **Every commit message MUST start with the version number(s) being updated**
- If a `.gs` file was updated: prefix with `v{VERSION}` (e.g. `v01.19g`)
- If an embedding HTML page was updated: prefix with `w{BUILD_VERSION}` (e.g. `w01.12w`)
- If both were updated in the same commit: include both (e.g. `v01.19g w01.12w`)
- If neither was updated: no version prefix needed
- Example: `v01.19g Fix sign-in popup to auto-close after authentication`
- Example: `v01.19g w01.12w Add auth wall with build version bump`

## GAS Code Constraints
- **All GAS `.gs` code must be valid Google Apps Script syntax** — test mentally that strings, escapes, and quotes parse correctly before committing
- Avoid deeply nested quote escaping in HTML strings built inside `.gs` files. Instead, store values in global JS variables and reference them in `onclick` handlers (e.g. `_signInUrl` pattern)
- **`readPushedVersionFromCache()` must NOT delete the cache entry** — it must return the value without calling `cache.remove()`. Deleting it causes only the first polling client to see the update; all others miss the "Code Ready" blue splash reload. The cache has a 1-hour TTL and expires naturally.
- The GAS auto-update "Code Ready" splash flow works as follows:
  1. GitHub Actions workflow calls `doPost(?action=deploy)` on the **old** deployed GAS
  2. `pullAndDeployFromGitHub()` fetches new code from GitHub, updates the script, creates a new version, updates the deployment
  3. It writes the new version string to `CacheService.getScriptCache()` with key `"pushed_version"`
  4. Client-side JS polls `readPushedVersionFromCache()` every 15 seconds
  5. If the returned version differs from the version displayed in `#gv`, it sends a `gas-reload` postMessage to the parent embedding page
  6. The embedding page (e.g. `aedlog.html`) receives the message, sets session storage flags, reloads, and shows the blue "Code Ready" splash

## Execution Style
- For clear, straightforward requests: **just do it** — make the changes, commit, and push without asking for plan approval
- Only ask clarifying questions when the request is genuinely ambiguous or has multiple valid interpretations
- Do not use formal plan-mode approval workflows for routine tasks (version bumps, file moves, feature additions, bug fixes, etc.)
