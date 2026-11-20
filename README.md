# Bank Job Tracker — Vice City Edition

A free static PWA for tracking ING and Rabobank vacancies in the Netherlands. No OpenAI key, paid AI API, or subscription is required.

## Features
- Vice City / neon dashboard, responsive layout and PWA installation.
- Job search, bank/status filters, minimum-match filter, sorting, saved/seen jobs and CSV export.
- Scheduled GitHub Actions feed refresh on weekdays at 06:17 and 14:17 UTC.
- Public Netherlands-wide jobs feed plus best-effort extraction from official ING and Rabobank listing pages, following visible pagination links where available.
- Local PDF, DOCX and TXT CV extraction. CV text stays in this browser's local storage and is not uploaded by the app.
- After a CV is uploaded, the main job list calculates its match from the extracted CV text and available job text, and the existing sort/filter controls use that score. Without an uploaded CV, it uses the editable keyword profile.
- CV Studio with detailed match analysis and Word-compatible CV / cover-letter drafts.

## Update GitHub Pages
1. Extract the ZIP.
2. In the GitHub repository, upload/replace the files from inside `bank-job-tracker-main` into the repository root. Include `.github/workflows/update-jobs.yml` if you are replacing the whole repository contents.
3. Commit the changes to `main`.
4. In GitHub → Actions, run **Update official bank vacancies** manually once and wait for completion.
5. Open the GitHub Pages site. If an old version is cached on Android, clear that site's stored data in Chrome and reload.

## Important vacancy coverage limits
The public feed contains jobs observed in the last two days; it is not a complete archive of all open vacancies. The `location=amsterdam` parameter is a shortcut for Netherlands locations. The official ING and Rabobank listing pages are also queried by the scheduled workflow, but their websites control pagination and markup; the scraper follows visible Next links where possible, but automated extraction still cannot guarantee every active listing is imported. The app includes direct official links to the live Netherlands vacancy pages:
- ING: https://careers.ing.com/en/location/netherlands-jobs/2618/2750405/2/en/en/search-jobs
- Rabobank: https://rabobank.jobs/en/jobs/?country=nl

Always confirm a vacancy on the employer's website and read its full description before applying. The in-app match is only a text-based estimate and cannot confirm qualifications. The feed often contains a short summary rather than the complete vacancy text, so scores may be less precise.

## CV privacy and generated documents
PDF/DOCX/TXT parsing and matching run locally in the browser. CV text and profile fields remain in that browser's local storage until deleted with **Obriši CV** or by clearing the site's data. PDF.js and Mammoth are loaded from public CDNs when needed; first-time PDF/DOCX parsing requires internet access. Scanned image-only PDFs are not OCR'd. Generated documents reorganise existing CV content and use a factual cover-letter template; they are not AI-generated rewrites. Review all details before submitting.

## Workflow schedule
Monday–Friday at 06:17 and 14:17 UTC (07:17 and 15:17 in Croatia in winter; 08:17 and 16:17 in summer). The in-app refresh button reloads the saved feed; it does not start a new bank search.
