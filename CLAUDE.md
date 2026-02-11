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
- **Every commit that modifies `googleAppsScripts/Gas Self-Update Dashboard/Code.gs` MUST also increment the `VERSION` variable by 0.01**
- The `VERSION` variable is near the top of `Code.gs` (look for `var VERSION = "..."`)
- Format includes a `g` suffix: e.g. `"01.13g"`
- Example: if VERSION is `"01.13g"`, change it to `"01.14g"`
- Do NOT bump VERSION if the commit doesn't touch `Code.gs`

## Build Version (Auto-Refresh for test.html)
- **Every commit that modifies `httpsdocs/test.html` MUST increment the `build-version` meta tag by 0.01**
- Look for `<meta name="build-version" content="...">` in the `<head>`
- Format includes a `w` suffix: e.g. `"01.11w"`
- Example: if build-version is `"01.11w"`, change it to `"01.12w"`
- The page polls itself every 10 seconds — when the deployed version differs from the loaded version, it auto-reloads

