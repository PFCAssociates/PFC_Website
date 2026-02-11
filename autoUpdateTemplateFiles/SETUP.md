# Auto-Update Template — Setup Guide

## Files
- `AutoUpdateTemplate.gs` — Google Apps Script code (goes in Apps Script editor)
- `AutoUpdateTemplate.html` — Embedding page (goes in `httpsdocs/` folder)

## Placeholders to Replace

### In AutoUpdateTemplate.gs
| Placeholder | Description | Where to Find |
|---|---|---|
| `YOUR_PROJECT_TITLE` | Display name shown in the web app | Your choice |
| `YOUR_SPREADSHEET_ID` | Google Sheet ID | From the sheet URL: `docs.google.com/spreadsheets/d/{THIS_PART}/edit` |
| `YOUR_SHEET_NAME` | Tab name in the spreadsheet | The tab at the bottom of the sheet |
| `YOUR_PROJECT_FOLDER` | Folder name inside `googleAppsScripts/` | Must match the folder you create in the repo |
| `YOUR_CODE_FILE.gs` | Filename of the .gs file | Must match the actual filename in the repo |
| `YOUR_DEPLOYMENT_ID` | Apps Script web app deployment ID | Deploy > Manage deployments > the `AKfycb...` string |
| `YOUR_PAGE.html` | Filename of the embedding HTML page | Must match the file you place in `httpsdocs/` |

### In AutoUpdateTemplate.html
| Placeholder | Description | Where to Find |
|---|---|---|
| `YOUR_PROJECT_TITLE` | Page title shown in browser tab | Same as the GS title |
| `YOUR_DEPLOYMENT_ID` | Apps Script web app deployment ID | Same as above — used in the iframe `src` URL |

## Steps to Create a New Project

1. **Create the Apps Script project** at script.google.com
2. **Set up the GCP project** — link it in Project Settings > Change project
3. **Enable Apps Script API** in both:
   - https://script.google.com/home/usersettings (toggle ON)
   - GCP project: APIs & Services > Library > Apps Script API
4. **Set appsscript.json** (enable "Show appsscript.json" in Project Settings):
   ```json
   {
     "timeZone": "America/New_York",
     "runtimeVersion": "V8",
     "dependencies": {},
     "webapp": {
       "executeAs": "USER_DEPLOYING",
       "access": "ANYONE_ANONYMOUS"
     },
     "exceptionLogging": "STACKDRIVER",
     "oauthScopes": [
       "https://www.googleapis.com/auth/script.projects",
       "https://www.googleapis.com/auth/script.external_request",
       "https://www.googleapis.com/auth/script.deployments",
       "https://www.googleapis.com/auth/spreadsheets"
     ]
   }
   ```
5. **Deploy as Web app** — Deploy > New deployment > Web app > Anyone
6. **Copy the Deployment ID** (the `AKfycb...` string, NOT the URL)
7. **Set GITHUB_TOKEN** in Script Properties (Project Settings > Script Properties):
   - Key: `GITHUB_TOKEN`
   - Value: your `github_pat_...` token
8. **Copy the template files** into the repo:
   - `.gs` file → `googleAppsScripts/Your Project Name/YourFile.gs`
   - `.html` file → `httpsdocs/YourPage.html`
9. **Replace all placeholders** in both files with actual values
10. **Add deploy step** to `.github/workflows/auto-merge-claude.yml`:
    ```yaml
    - name: Deploy Your Project Name
      run: |
        git diff --name-only HEAD~1 HEAD | grep -q "googleAppsScripts/Your Project Name/YourFile.gs" && \
        curl -L -X POST \
          "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec" \
          -d "action=deploy" \
          --max-time 120 || true
    ```
11. **Add to CLAUDE.md** GAS Projects table
12. **Bootstrap**: Copy-paste the .gs code into the Apps Script editor manually for the first deploy (doPost runs old code, so the first auto-deploy won't work until the code is already there)
13. **Run any function** from the editor to trigger OAuth authorization
