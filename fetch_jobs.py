
#!/usr/bin/env python3
"""Fetch verified job postings embedded in official bank career pages."""

import json
import re
import time
import html
from datetime import datetime, timezone
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse

SOURCES = [
    ("ING", "https://careers.ing.com/en/search_jobs?country=Netherlands"),
    ("Rabobank", "https://rabobank.jobs/en/jobs/?country=nl"),
    ("ABN AMRO", "https://www.werkenbijabnamro.nl/vacatures"),
    ("NIBC", "https://nibc.com/careers/vacancies"),
    ("ASN Bank", "https://asnbank.career.emply.com/nl/vacatures"),
]

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 Chrome/130.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/json",
    "Accept-Language": "en-US,en;q=0.9,nl;q=0.8",
}


def fetch(url):
    request = Request(url, headers=HEADERS)
    with urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8", "replace")


def clean(value):
    if isinstance(value, dict):
        return (
            value.get("name")
            or value.get("@id")
            or value.get("value")
            or ""
        )

    if isinstance(value, list):
        return ", ".join(
            filter(None, (clean(item) for item in value))
        )

    if value is None:
        return ""

    return str(value).strip()


def walk(value):
    """Find JobPosting objects anywhere inside nested JSON."""
    if isinstance(value, dict):
        types = value.get("@type", [])

        if isinstance(types, str):
            types = [types]

        if "JobPosting" in types:
            yield value

        for child in value.values():
            yield from walk(child)

    elif isinstance(value, list):
        for child in value:
            yield from walk(child)


def extract_json_scripts(page):
    """Read JSON-LD and other JSON script blocks."""
    pattern = re.compile(
        r"<script\b([^>]*)>(.*?)</script\s*>",
        re.IGNORECASE | re.DOTALL,
    )

    for attributes, content in pattern.findall(page):
        attrs = attributes.lower()

        is_json = (
            "application/ld+json" in attrs
            or "application/json" in attrs
            or "__next_data__" in attrs
        )

        if not is_json:
            continue

        content = content.strip()

        if not content:
            continue

        try:
            yield json.loads(content)
        except (ValueError, TypeError):
            continue


def get_location(job):
    locations = job.get("jobLocation", [])

    if not isinstance(locations, list):
        locations = [locations]

    places = []

    for item in locations:
        if not isinstance(item, dict):
            continue

        address = item.get("address", {})

        if isinstance(address, dict):
            parts = [
                clean(address.get("addressLocality")),
                clean(address.get("addressRegion")),
                clean(address.get("addressCountry")),
            ]

            location = ", ".join(filter(None, parts))

            if location:
                places.append(location)

    if not places:
        return "Netherlands (check vacancy)", False

    result = "; ".join(places)

    is_netherlands = bool(
        re.search(
            r"netherlands|nederland|\bNL\b",
            result,
            re.IGNORECASE,
        )
    )

    return result, is_netherlands


def parse_jobs(bank, source, page):
    found = []

    for data in extract_json_scripts(page):
        for job in walk(data):
            title = clean(job.get("title"))

            raw_url = (
                clean(job.get("url"))
                or clean(job.get("sameAs"))
            )

            if not title or not raw_url:
                continue

            url = urljoin(source, raw_url)

            parsed = urlparse(url)

            if parsed.scheme != "https":
                continue

            if not parsed.netloc:
                continue

            # Do not accept links to unrelated websites.
            source_domain = urlparse(source).hostname or ""
            job_domain = parsed.hostname or ""

            if not (
                job_domain == source_domain
                or job_domain.endswith("." + source_domain)
            ):
                continue

            location, is_netherlands = get_location(job)

            # If a location is explicitly provided, it must
            # identify the Netherlands.
            if not is_netherlands and not location.startswith(
                "Netherlands (check"
            ):
                continue

            description = html.unescape(
                clean(job.get("description"))
            )

            description = re.sub(
                r"<[^>]*>", " ", description
            )

            description = re.sub(
                r"\s+", " ", description
            ).strip()[:6000]

            organization = job.get("hiringOrganization", {})
            employer = (
                clean(organization.get("name"))
                if isinstance(organization, dict)
                else bank
            )

            job_id = url.split("?")[0].rstrip("/").lower()

            found.append({
                "id": job_id,
                "bank": bank,
                "title": title,
                "location": location,
                "level": (
                    clean(job.get("experienceRequirements"))
                    or clean(job.get("employmentType"))
                    or "Professional"
                ),
                "published": str(job.get("datePosted") or "")[:10],
                "deadline": str(job.get("validThrough") or "")[:10],
                "url": url,
                "description": description,
                "skills": [],
                "source": source,
                "employer": employer,
                "verifiedStructuredData": True,
            })

    return found


def main():
    all_jobs = []
    statuses = []

    for bank, source in SOURCES:
        print("Checking:", bank)

        try:
            page = fetch(source)
            jobs = parse_jobs(bank, source, page)

            all_jobs.extend(jobs)

            statuses.append({
                "bank": bank,
                "status": (
                    "ok" if jobs else "no_jobs_found_in_page_data"
                ),
                "count": len(jobs),
                "source": source,
            })

        except HTTPError as error:
            statuses.append({
                "bank": bank,
                "status": "http_error",
                "count": 0,
                "source": source,
                "detail": str(error.code),
            })

        except (URLError, TimeoutError, OSError) as error:
            statuses.append({
                "bank": bank,
                "status": "connection_error",
                "count": 0,
                "source": source,
                "detail": str(error)[:240],
            })

        except Exception as error:
            statuses.append({
                "bank": bank,
                "status": "parse_error",
                "count": 0,
                "source": source,
                "detail": str(error)[:240],
            })

        time.sleep(1)

    # Remove duplicate vacancies.
    unique_jobs = {
        job["id"]: job
        for job in all_jobs
    }

    result = {
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "jobs": list(unique_jobs.values()),
        "sources": statuses,
        "note": (
            "Only verified JobPosting records from official "
            "career pages are included. Empty results do not "
            "mean that a bank has no vacancies. Some career "
            "pages load vacancies dynamically or block requests."
        ),
    }

    with open("jobs.json", "w", encoding="utf-8") as file:
        json.dump(
            result,
            file,
            ensure_ascii=False,
            indent=2,
        )

    print(
        json.dumps(
            {
                "total_jobs": len(result["jobs"]),
                "sources": statuses,
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
