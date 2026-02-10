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
- **Every commit that modifies `googleAppsScripts/Code.gs` MUST also increment the `VERSION` variable by 0.01**
- The `VERSION` variable is near the top of `Code.gs` (look for `var VERSION = "..."`)
- Example: if VERSION is `"01.03"`, change it to `"01.04"`
- Do NOT bump VERSION if the commit doesn't touch `Code.gs`

## Build Version (Auto-Refresh for test.html)
- **Every commit that modifies `httpsdocs/test.html` MUST update the `build-version` meta tag** to the current Unix timestamp
- Look for `<meta name="build-version" content="TIMESTAMP">` in the `<head>`
- Generate the timestamp with: `date +%s`
- The page polls itself every 10 seconds — when the deployed version differs from the loaded version, it auto-reloads

