# Bank Job Tracker v3

Free static PWA for tracking official vacancies at ING, Rabobank, ABN AMRO, NIBC and ASN Bank.

## What is new
- Neon sunset home-page artwork and responsive visual refresh.
- Removes all sample/demo vacancies. The app only displays records present in `jobs.json`.
- Keyword-based match scoring based on the user's stated banking/reporting/data experience.
- Per-bank source status and honest empty/error states.
- Scheduled GitHub Actions workflow (`.github/workflows/update-jobs.yml`) runs on weekdays at 06:17 and 14:17 UTC, and can be run manually.

## Important ingestion limitation
`fetch_jobs.py` currently imports only `JobPosting` JSON-LD records exposed in the HTML of each official career page. Career portals that render vacancies dynamically or block automated requests may return zero records or a fetch error. This does **not** mean the bank has no vacancies. The dashboard reports this per bank and never fabricates job records. A bank-specific public API/feed integration may be needed for portals that do not expose structured data.

The script does not guess application deadlines; it uses `validThrough` only when the official structured data provides it. It does not automatically mark a job closed based only on its age.

## Setup
1. Upload the contents of this folder to the root of the GitHub repository, replacing files when prompted. Keep the `.github/workflows` folder and `assets/hero-sunset.png` in their exact paths.
2. In GitHub, open **Settings → Actions → General → Workflow permissions** and allow **Read and write permissions**. Save.
3. Open **Actions → Update official bank vacancies → Run workflow** to start the first fetch.
4. Wait for the workflow to finish, then refresh the GitHub Pages app.
5. Scheduled runs happen weekdays at 06:17 and 14:17 UTC.

## Match scoring
This is a transparent keyword heuristic, not an AI evaluation and not a guarantee of qualification. Review each vacancy's full requirements before applying. The profile intentionally does not claim professional Power BI dashboard or Python production experience.

## Hosting
The frontend remains on GitHub Pages. The scheduled fetch runs in GitHub Actions. No paid AI API key or external paid service is required. GitHub's free-tier quotas and terms apply.
