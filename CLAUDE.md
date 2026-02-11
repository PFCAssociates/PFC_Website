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

## Execution Style
- For clear, straightforward requests: **just do it** — make the changes, commit, and push without asking for plan approval
- Only ask clarifying questions when the request is genuinely ambiguous or has multiple valid interpretations
- Do not use formal plan-mode approval workflows for routine tasks (version bumps, file moves, feature additions, bug fixes, etc.)
