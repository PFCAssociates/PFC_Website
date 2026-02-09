# CLAUDE.md - PFC Associates Website

## Project Overview

PFC Associates (Police & Fire Clinic) website — a static HTML/CSS/JS site for a joint venture between Providence Hospital and Washington Hospital Center, serving DC's police and fire personnel. Deployed via GitHub Pages at `pfcassociates.org`.

## Repository Structure

```
PFC_Website/
├── .github/workflows/auto-merge-claude.yml   # CI/CD: auto-merge + deploy
├── .claude/settings.json                      # Claude Code permissions
├── CLAUDE.md                                  # This file
└── httpsdocs/                                 # Website root (deployed to GitHub Pages)
    ├── index.html                             # Homepage
    ├── services.html                          # Services page
    ├── staff.html                             # Staff directory
    ├── faq.html                               # FAQ (accordion UI)
    ├── links.html                             # External links
    ├── bulletin.html                          # News/announcements
    ├── css/                                   # Stylesheets (per-page + shared)
    ├── js/                                    # Scripts (jQuery-based)
    ├── PFC_images/                            # Image assets (~75MB)
    ├── Documents/                             # Downloadable PDFs
    ├── applicant*.html                        # Applicant form/redirect pages
    ├── web.config                             # IIS URL rewriting rules
    ├── voice.xml                              # Twilio IVR config
    ├── sitemap.xml                            # SEO sitemap
    └── ZZ*.html                               # Deprecated test files (ignore)
```

## Tech Stack

- **HTML5** static pages (no framework, no templating engine)
- **CSS** with per-page stylesheets (no preprocessor, no Tailwind)
- **JavaScript** with jQuery 3.3.1 (no build step, no bundler)
- **Font Awesome 4.7.0** for icons (via Bootstrap CDN)
- **Adobe Edge Fonts** (Lato, Maven Pro, Open Sans Condensed, Six Caps)
- **Modernizr 3.6.0** for feature detection
- **No package manager** (npm/yarn) — all dependencies loaded via CDN
- **No test framework** — manual testing only
- **No linting/formatting** tools configured

## Development Workflow

### No Build Step Required

This is a purely static site. Edit HTML/CSS/JS files directly in `httpsdocs/`. Changes are live once deployed.

### Deployment Pipeline

1. Push changes to a `claude/**` branch
2. GitHub Actions (`.github/workflows/auto-merge-claude.yml`) automatically:
   - Merges the branch into `main` (fast-forward preferred, fallback to merge commit)
   - Deletes the source branch
   - Deploys `./httpsdocs` to GitHub Pages
3. Concurrency control: only one deployment runs at a time (`cancel-in-progress: true`)

### Local Testing

Open any HTML file directly in a browser. No dev server needed. For URL rewriting behavior (extensionless URLs), use a local server that respects `web.config` rules.

## File Naming Conventions

- **HTML pages**: lowercase, no separators (`applicantmedicalquestionnaire.html`)
- **CSS files**: lowercase, descriptive names matching their page (`indexstyles.css`, `staffstyles.css`)
- **JS files**: camelCase (`ChangeTheme.js`, `SlideShow.js`)
- **Images**: mixed case, stored in `PFC_images/`
- **Documents**: mixed case, stored in `Documents/`
- **Deprecated files**: prefixed with `ZZ` (e.g., `ZZdeletelatertest1.html`) — do not modify these

## HTML Page Structure

All main pages follow this consistent template:

```html
<!doctype html>
<html class="no-js" lang="">
<head>
  <!-- Meta tags, title, CSS includes -->
  <!-- normalize.css -> main.css -> page-specific CSS -->
</head>
<body>
  <div class="page-wrapper">
    <header class="top-header">
      <div class="top-banner">
        <div id="logo"><!-- PFC logo --></div>
      </div>
    </header>
    <main class="main clearfix">
      <!-- Navigation bar -->
      <!-- Dark mode toggle (#lightswitch checkbox) -->
      <!-- Page content -->
    </main>
    <footer class="footer"><!-- Footer content --></footer>
  </div>
  <!-- JS includes: jQuery, page scripts -->
</body>
</html>
```

### Navigation (consistent across pages)

Six main pages: Home, Services, Staff, FAQ, Links, Bulletin

### Dark Mode

Toggled via a checkbox (`#lightswitch`), applies `.dark-theme` class to `<body>`, persisted in `localStorage`. Implemented in `js/ChangeTheme.js` with styles in `css/darktheme.css`.

## Key JavaScript Files

| File | Purpose |
|------|---------|
| `js/ChangeTheme.js` | Dark/light mode toggle with localStorage persistence |
| `js/SlideShow.js` | Image carousel (8s auto-rotate, manual nav) |
| `js/accordion.js` | FAQ expand/collapse with height animation |
| `js/main.js` | HTML5 Boilerplate base + Google Analytics stub |
| `js/plugins.js` | Console log safety wrapper |
| `js/vendor/modernizr-3.6.0.min.js` | Browser feature detection |

## CSS Architecture

Each main page has its own stylesheet (`indexstyles.css`, `staffstyles.css`, etc.). Shared styles live in:
- `normalize.css` — cross-browser normalization
- `main.css` — HTML5 Boilerplate base styles
- `darktheme.css` — dark mode overrides
- `stickynav.css` — fixed navigation bar
- `scrolltotop.css` — scroll-to-top button
- `slider.css` / `slider2.css` — image carousel

## Coding Conventions

- **CSS classes**: kebab-case (`.page-wrapper`, `.featured-img`, `.is-open`)
- **HTML IDs**: kebab-case (`#lightswitch`, `#logo`, `#topic-1-img`)
- **JS functions**: camelCase (`showSlides()`, `plusSlides()`, `currentSlide()`)
- **JS hint**: Files use `/*jshint esversion: 6 */` for ES6 compatibility
- **ASCII art**: HTML files contain decorative ASCII art section headers in comments — preserve these when editing

## Important Notes for AI Assistants

1. **All website content lives in `httpsdocs/`** — this is the deployed directory
2. **No build step** — edit files directly; there is no compilation or bundling
3. **Navigation is duplicated** across every HTML page — changes to nav must be replicated in all main pages (index, services, staff, faq, links, bulletin)
4. **Per-page CSS** — most styling changes are page-specific; find the right stylesheet
5. **jQuery is the JS library** — use jQuery patterns, not vanilla DOM or modern frameworks
6. **CDN dependencies** — do not add npm/node dependencies; load libraries from CDNs in HTML
7. **Ignore ZZ-prefixed files** — these are deprecated test files awaiting deletion
8. **web.config** is for IIS URL rewriting (legacy) — GitHub Pages deployment does not use it
9. **Large images** — the `PFC_images/` directory is ~75MB; avoid adding large files unnecessarily
10. **Commit messages** — use descriptive messages like `Update "X" to "Y" in filename.html`
11. **Branch naming** — CI/CD triggers on `claude/**` branches; always push to those

## External Integrations

- **Twilio IVR**: `voice.xml` — automated phone response (202-854-7400)
- **Calendly**: Embedded scheduling in applicant redirect pages
- **FormFacade**: Google Forms embedding in applicant pages
- **Google Analytics**: Stub in `main.js` (currently inactive, needs UA ID)

## Git Workflow

- Default branch: `main`
- Feature branches: `claude/*` (auto-merged by CI)
- No pull request review required for `claude/*` branches
- Deployment is automatic on merge to `main`
