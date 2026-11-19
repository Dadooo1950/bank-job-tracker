# Bank Job Tracker v2 — starter PWA

A no-paid-API progressive web app starter for tracking Netherlands banking vacancies.

## Current status
- Responsive PWA shell and generated app icon.
- Local browser storage for viewed/saved jobs.
- Filters: new, unseen, saved, active, expired; bank; minimum match.
- Sorting: newest first, match score, nearest deadline.
- Deterministic keyword-based profile match (not an AI claim).
- Deadline state calculation.
- Five bank sources listed in the interface, but live ingestion is NOT connected yet.
- Sample records are clearly marked DEMO and are not verified live vacancies.

## Run locally
Serve this folder over HTTP (service workers do not work from `file://`). For example, with Python installed:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Important next phase
Implement and test a free scheduled ingestion pipeline using official career-site feeds/APIs or permitted public listings. Normalize each vacancy to a stable ID, preserve first-seen dates, and only mark a vacancy expired/closed after checking the source page. Never infer an application deadline from a crawl date.

## Free hosting direction
Static PWA can be hosted on a free static hosting tier. Scheduled ingestion can use a free CI scheduler within its current quota. Push notifications require an additional push endpoint and browser permission; this starter does not yet claim to send background push alerts.
