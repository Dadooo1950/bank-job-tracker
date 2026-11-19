import json
import re
import urllib.request
import urllib.error
from datetime import datetime, timezone
from urllib.parse import urlparse

API_URL = "https://gigsignal-api.fly.dev/api/jobs?location=amsterdam"
RABOBANK_URL = "https://rabobank.jobs/nl/vacatures/"

HEADERS = {
    "User-Agent": "BankJobTracker/1.0 (personal job search app)",
    "Accept": "application/json,text/html",
}

def fetch(url, accept=None):
    headers = HEADERS.copy()
    if accept:
        headers["Accept"] = accept

    request = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8", errors="replace")

def allowed_url(url, bank):
    try:
        host = (urlparse(url).hostname or "").lower()
        if bank == "ING":
            return host == "careers.ing.com"
        if bank == "Rabobank":
            return (
                host == "rabobank.jobs"
                or host.endswith(".rabobank.jobs")
                or host == "rabobank.com"
                or host.endswith(".rabobank.com")
                or host == "rabobank.nl"
                or host.endswith(".rabobank.nl")
            )
    except Exception:
        pass
    return False

def walk_json(data):
    if isinstance(data, dict):
        if data.get("@type") == "JobPosting" or (
            isinstance(data.get("@type"), list)
            and "JobPosting" in data.get("@type", [])
        ):
            yield data

        for value in data.values():
            yield from walk_json(value)

    elif isinstance(data, list):
        for value in data:
            yield from walk_json(value)

def extract_jsonld(html):
    jobs = []
    scripts = re.findall(
        r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        html,
        flags=re.IGNORECASE | re.DOTALL,
    )

    for script in scripts:
        try:
            data = json.loads(script.strip())
            jobs.extend(walk_json(data))
        except Exception:
            continue

    return jobs

def normalize_api_job(item, bank):
    title = item.get("title")
    url = item.get("apply_url")

    if not title or not url or not allowed_url(url, bank):
        return None

    facts = item.get("facts") or {}
    skills = facts.get("skills") or []
    first_seen = item.get("first_seen_at") or ""

    return {
        "id": str(item.get("id") or item.get("slug") or url),
        "bank": bank,
        "title": title,
        "location": item.get("location") or "Netherlands",
        "level": facts.get("seniority") or "Not specified",
        "published": first_seen[:10],
        "deadline": "",
        "url": url,
        "description": item.get("gist") or item.get("company_description") or "",
        "skills": skills,
        "source": item.get("source_name") or bank,
        "employer": item.get("company_name") or bank,
        "verifiedOfficialLink": True,
        "gist": item.get("gist"),
        "facts": facts,
    }

def normalize_rabobank_job(item):
    title = item.get("title")
    url = item.get("url")

    if isinstance(url, dict):
        url = url.get("url")

    if not title or not url or not allowed_url(url, "Rabobank"):
        return None

    location = item.get("jobLocation", "")
    if isinstance(location, list):
        location = location[0] if location else ""

    if isinstance(location, dict):
        address = location.get("address", {})
        if isinstance(address, dict):
            location = ", ".join(
                str(address.get(k, ""))
                for k in ("addressLocality", "addressRegion", "addressCountry")
                if address.get(k)
            )
        else:
            location = ""

    description = item.get("description") or ""
    description = re.sub(r"<[^>]+>", " ", description)
    description = re.sub(r"\s+", " ", description).strip()

    date = item.get("datePosted") or ""

    return {
        "id": str(item.get("identifier", {}).get("value") or url),
        "bank": "Rabobank",
        "title": title,
        "location": location or "Netherlands",
        "level": "Not specified",
        "published": date[:10],
        "deadline": "",
        "url": url,
        "description": description,
        "skills": [],
        "source": "Rabobank Careers",
        "employer": "Rabobank",
        "verifiedOfficialLink": True,
        "gist": None,
        "facts": {},
    }

def main():
    jobs = []
    sources = []

    # ING and Rabobank listings from the public jobs API
    try:
        data = json.loads(fetch(API_URL, "application/json"))

        if not isinstance(data, list):
            raise ValueError("API response is not a list")

        for bank in ("ING", "Rabobank"):
            bank_items = [
                item for item in data
                if str(item.get("company_name", "")).strip().lower() == bank.lower()
            ]

            added = 0
            for item in bank_items:
                job = normalize_api_job(item, bank)
                if job:
                    jobs.append(job)
                    added += 1

            sources.append({
                "bank": bank,
                "status": "ok" if added else "not_found_in_public_feed",
                "count": added,
                "source": "GigSignal public jobs API",
            })

    except Exception as error:
        sources.append({
            "bank": "ING",
            "status": "api_error",
            "count": 0,
            "detail": str(error),
        })
        sources.append({
            "bank": "Rabobank",
            "status": "api_error",
            "count": 0,
            "detail": str(error),
        })

    # Try Rabobank's official careers page as a separate source
    try:
        html = fetch(RABOBANK_URL, "text/html")
        rabobank_items = extract_jsonld(html)

        added = 0
        existing_urls = {job["url"] for job in jobs}

        for item in rabobank_items:
            job = normalize_rabobank_job(item)
            if job and job["url"] not in existing_urls:
                jobs.append(job)
                existing_urls.add(job["url"])
                added += 1

        sources.append({
            "bank": "Rabobank official careers page",
            "status": "ok" if added else "no_structured_jobs_found",
            "count": added,
            "source": RABOBANK_URL,
        })

    except Exception as error:
        sources.append({
            "bank": "Rabobank official careers page",
            "status": "fetch_error",
            "count": 0,
            "source": RABOBANK_URL,
            "detail": str(error),
        })

    # Remove duplicate links
    unique_jobs = []
    seen = set()

    for job in jobs:
        if job["url"] not in seen:
            unique_jobs.append(job)
            seen.add(job["url"])

    unique_jobs.sort(
        key=lambda job: job.get("published") or "",
        reverse=True,
    )

    output = {
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "jobs": unique_jobs,
        "sources": sources,
        "note": (
            "Listings are collected from the public GigSignal feed "
            "and Rabobank's official careers page when accessible. "
            "The public feed contains jobs observed in the last two days, "
            "so it is not a complete list of every open vacancy. "
            "The published field may represent first-seen date, not the "
            "employer's original publication date."
        ),
    }

    with open("jobs.json", "w", encoding="utf-8") as file:
        json.dump(output, file, ensure_ascii=False, indent=2)

    print(f"Saved {len(unique_jobs)} verified job listings.")

    for source in sources:
        print(
            source["bank"],
            source["status"],
            source["count"],
        )

if __name__ == "__main__":
    main()
