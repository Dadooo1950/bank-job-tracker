# Bank Job Tracker — final frontend

This bundle replaces the frontend files in the existing GitHub Pages project:
`index.html`, `app.js`, `styles.css`, `sw.js`, and `manifest.webmanifest`.

Keep the existing `jobs.json`, `.github/workflows/update-jobs.yml`, `fetch_jobs.py`, `assets/hero-sunset.png`, and `icons/icon-512.png` in the repository. The existing scheduled GitHub Actions workflow continues to update `jobs.json` on weekdays. The frontend does not need an API key, paid service, or AI provider.

Features: responsive dashboard, live feed loading from jobs.json, search, bank/view/match filters, sorting, keyword-based transparent CV match, seen/saved jobs in local storage, job details, CSV export, source status, editable local match keywords, installable PWA, network-first feed and versioned service-worker cache.

Important limitations: feed completeness depends on the configured public data source and official career pages. A zero count is not proof that a bank has no open roles. Dates from a third-party feed may represent first-seen date rather than employer publication date. Always verify requirements and application status on the employer's own page.
