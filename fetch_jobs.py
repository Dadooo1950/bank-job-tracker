import json
import re
from html.parser import HTMLParser
import urllib.request
import urllib.error
from datetime import datetime, timezone
from urllib.parse import urlparse, urljoin

API_URL = "https://gigsignal-api.fly.dev/api/jobs?location=amsterdam"
RABOBANK_URL = "https://rabobank.jobs/en/jobs/?country=nl"
ING_URL = "https://careers.ing.com/en/location/netherlands-jobs/2618/2750405/2/en/en/search-jobs"

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


class JobLinkParser(HTMLParser):
    """Fallback extractor for official career listing pages without JSON-LD."""
    def __init__(self):
        super().__init__()
        self.current = None
        self.items = []

    def handle_starttag(self, tag, attrs):
        if tag.lower() == "a":
            attrs = dict(attrs)
            href = attrs.get("href", "")
            if href:
                self.current = {"href": href, "text": []}

    def handle_data(self, data):
        if self.current is not None:
            self.current["text"].append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self.current is not None:
            self.items.append((self.current["href"], " ".join(self.current["text"]).strip()))
            self.current = None

def extract_official_link_jobs(html, bank, page_url):
    parser = JobLinkParser()
    parser.feed(html)
    host = "careers.ing.com" if bank == "ING" else "rabobank.jobs"
    prefix = "https://careers.ing.com" if bank == "ING" else "https://rabobank.jobs"
    jobs = []
    seen = set()
    for href, title in parser.items:
        if href.startswith("/"):
            href = prefix + href
        if not allowed_url(href, bank):
            continue
        if bank == "ING" and "/en/job/" not in href:
            continue
        if bank == "Rabobank" and "/en/job/" not in href:
            continue
        title = re.sub(r"\s+", " ", title).strip()
        if not title or len(title) < 5 or href in seen:
            continue
        seen.add(href)
        jobs.append({
            "id": href.rstrip("/").split("/")[-1],
            "bank": bank,
            "title": title,
            "location": "Netherlands",
            "level": "Not specified",
            "published": "",
            "deadline": "",
            "url": href,
            "description": "",
            "skills": [],
            "source": f"{bank} official careers listing",
            "employer": bank,
            "verifiedOfficialLink": True,
            "gist": None,
            "facts": {},
        })
    return jobs


def find_next_page(html, current_url, bank):
    parser = JobLinkParser()
    parser.feed(html)
    for href, label in parser.items:
        label = re.sub(r"\s+", " ", label).strip().lower()
        if label in ("next", "next page", "volgende", "volgende pagina", "›", "»"):
            candidate = urljoin(current_url, href)
            if allowed_url(candidate, bank) and candidate != current_url:
                return candidate
    return None

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


def normalize_ing_job(item):
    title = item.get("title")
    url = item.get("url")
    if isinstance(url, dict):
        url = url.get("url")
    if not title or not url or not allowed_url(url, "ING"):
        return None
    location = item.get("jobLocation", "")
    if isinstance(location, list):
        location = location[0] if location else ""
    if isinstance(location, dict):
        address = location.get("address", {})
        if isinstance(address, dict):
            location = ", ".join(str(address.get(k, "")) for k in ("addressLocality", "addressRegion", "addressCountry") if address.get(k))
    description = re.sub(r"<[^>]+>", " ", item.get("description") or "")
    description = re.sub(r"\s+", " ", description).strip()
    date = item.get("datePosted") or ""
    return {
        "id": str(item.get("identifier", {}).get("value") or url),
        "bank": "ING",
        "title": title,
        "location": location or "Netherlands",
        "level": "Not specified",
        "published": date[:10],
        "deadline": "",
        "url": url,
        "description": description,
        "skills": [],
        "source": "ING Careers",
        "employer": "ING",
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

    # Supplement the short-lived public feed with official vacancy listing pages.
    # Follow their visible "Next" links, with a safety cap to avoid endless loops.
    for bank, first_page_url in (("ING", ING_URL), ("Rabobank", RABOBANK_URL)):
        page_url = first_page_url
        visited_pages = set()
        added_urls = set()
        pages_checked = 0
        try:
            while page_url and page_url not in visited_pages and pages_checked < 20:
                visited_pages.add(page_url)
                html = fetch(page_url, "text/html")
                pages_checked += 1
                structured = extract_jsonld(html)
                page_jobs = []
                for item in structured:
                    job = normalize_rabobank_job(item) if bank == "Rabobank" else normalize_ing_job(item)
                    if job:
                        page_jobs.append(job)

                if not page_jobs:
                    page_jobs = extract_official_link_jobs(html, bank, page_url)

                existing_urls = {job["url"] for job in jobs}
                for job in page_jobs:
                    if job["url"] not in existing_urls and job["url"] not in added_urls:
                        jobs.append(job)
                        added_urls.add(job["url"])

                page_url = find_next_page(html, page_url, bank)

            sources.append({
                "bank": f"{bank} official careers page",
                "status": "ok" if added_urls else "no_structured_jobs_found",
                "count": len(added_urls),
                "source": first_page_url,
                "detail": f"Checked {pages_checked} listing page(s); pagination follows visible Next links, subject to employer page markup.",
            })
        except Exception as error:
            sources.append({
                "bank": f"{bank} official careers page",
                "status": "fetch_error",
                "count": len(added_urls),
                "source": first_page_url,
                "detail": f"Checked {pages_checked} page(s) before error: {error}",
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
            "Listings are collected from the public GigSignal feed and "
            "best-effort extraction of official ING and Rabobank vacancy pages. "
            "The public feed contains jobs observed in the last two days; official "
            "pages may paginate or change markup, so this automated feed is not "
            "guaranteed to contain every active vacancy. Use the official source "
            "links for the complete live listings. The published field may "
            "represent first-seen date, not the employer's original publication date."
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
