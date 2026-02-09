# Claude Code Instructions

## Deployment Flow
- Never push directly to `main`
- Push to `claude/*` branches only
- `.github/workflows/auto-merge-claude.yml` handles everything automatically:
  1. Merges the claude branch into main
  2. Deletes the claude branch
  3. Deploys to GitHub Pages
- The "Create a pull request" message in push output is just GitHub boilerplate — ignore it, the workflow handles merging automatically

