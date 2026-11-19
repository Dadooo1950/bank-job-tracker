# Bank Job Tracker — final Vice City edition

This is the complete static PWA project. It keeps the working job board and adds the local CV Match & Application Studio. No OpenAI key, paid API, or subscription is required.

## Included
- Responsive Vice City / neon dashboard.
- Search, bank filters, status filters, match filters, sorting, CSV export, saved/seen jobs.
- Scheduled feed refresh through GitHub Actions on weekdays (06:17 and 14:17 UTC).
- ING and Rabobank job discovery using the public GigSignal Netherlands-wide shortcut and Rabobank's official careers page when accessible.
- Local PDF, DOCX and TXT CV text extraction; no CV upload to a server.
- Keyword-based CV comparison, including a penalty flag for credit-risk modelling-heavy roles and roles requiring Dutch.
- Tailored CV and cover-letter drafts, exported as Word-compatible `.doc` files.
- PWA installation and offline shell caching.

## Install once
1. Download and extract this ZIP.
2. In your GitHub repository `Dadooo1950/bank-job-tracker`, replace the repository contents with the contents of the extracted `bank-job-tracker-main` folder. Keep the `.github/workflows` folder and its `update-jobs.yml` file.
3. Commit the replacement to the `main` branch.
4. In GitHub, open **Actions** and run **Update official bank vacancies** once (`Run workflow`). Wait for the workflow to finish successfully.
5. Open GitHub Pages and refresh the app. On Android Chrome, if an older version remains, open the site settings and clear the site's stored data once, then reopen the Pages URL and install the PWA again.

## Important data limits
The public feed returns listings observed in the last two days; it is not a complete archive of every open vacancy. The API's `location=amsterdam` parameter is documented as a shortcut for Netherlands locations, not only Amsterdam. The public feed does not provide full job-posting text, so CV matching is based on the text/summary and structured facts available in the feed. Rabobank's official careers page may block automated access; when that happens the source status shows the error rather than pretending there are no vacancies. Always open the employer's official listing to confirm it is still active and read the full requirements.

## CV privacy and document quality
CV parsing and matching run locally in the browser. The CV text and profile fields are stored in that browser's local storage until you delete them using **Obriši CV** or clear the site's data. PDF and DOCX parsing loads PDF.js/Mammoth from public CDNs when needed, so an internet connection is required for the first parse of those formats. Scanned image-only PDFs are not OCR'd. The generated documents reorganise existing CV content and use a factual cover-letter template; they are not generative-AI rewrites. Review all details, contact fields, dates and wording before applying.

## Feed schedule
The workflow runs Monday–Friday at 06:17 and 14:17 UTC (07:17 and 15:17 in Croatia during winter time; 08:17 and 16:17 during summer time). The in-app **Osvježi oglase** button reloads the latest saved feed; it does not start a new external search.
