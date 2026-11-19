#!/usr/bin/env python3
"""Fetch publicly exposed JobPosting JSON-LD from official bank career pages.
Only structured vacancies are imported; no synthetic/sample records are created.
"""
import json, re, sys, time
from datetime import datetime, timezone
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

SOURCES = [
    ("ING", "https://careers.ing.com/en/search_jobs?country=Netherlands"),
    ("Rabobank", "https://rabobank.jobs/en/jobs/?country=nl"),
    ("ABN AMRO", "https://www.werkenbijabnamro.nl/vacatures"),
    ("NIBC", "https://nibc.com/careers/vacancies"),
    ("ASN Bank", "https://asnbank.career.emply.com/nl/vacatures"),
]

def fetch(url):
    req = Request(url, headers={"User-Agent":"Mozilla/5.0 (compatible; BankJobTracker/1.0; +https://github.com/Dadooo1950/bank-job-tracker)", "Accept":"text/html,application/xhtml+xml"})
    with urlopen(req, timeout=25) as r:
        return r.read().decode("utf-8", "replace")

def walk(x):
    if isinstance(x, dict):
        typ=x.get("@type", [])
        if isinstance(typ,str): typ=[typ]
        if "JobPosting" in typ: yield x
        for v in x.values(): yield from walk(v)
    elif isinstance(x,list):
        for v in x: yield from walk(v)

def clean(v):
    if isinstance(v,dict): return v.get("name") or v.get("@id") or ""
    if isinstance(v,list): return ", ".join(filter(None,(clean(z) for z in v)))
    return str(v or "")

def iso_date(v):
    if not v: return ""
    return str(v)[:10]

def parse_jobs(bank, source, html):
    found=[]
    for raw in re.findall(r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', html, re.I|re.S):
        try: data=json.loads(raw.strip())
        except Exception: continue
        for j in walk(data):
            title=clean(j.get("title"))
            url=clean(j.get("url")) or clean(j.get("sameAs"))
            if url.startswith("/"):
                from urllib.parse import urljoin
                url=urljoin(source,url)
            if not title or not url.startswith("http"): continue
            loc=j.get("jobLocation", [])
            if not isinstance(loc,list): loc=[loc]
            places=[]
            for item in loc:
                addr=item.get("address",{}) if isinstance(item,dict) else {}
                if isinstance(addr,dict):
                    places.append(" ".join(filter(None,[clean(addr.get("addressLocality")),clean(addr.get("addressRegion")),clean(addr.get("addressCountry"))])))
            location="; ".join(filter(None,places)) or "Netherlands (check vacancy)"
            if places and not re.search(r"netherlands|nederland|\bNL\b", location, re.I): continue
            desc=re.sub(r"<[^>]+>"," ",clean(j.get("description")))
            desc=re.sub(r"\s+"," ",desc).strip()[:6000]
            org=j.get("hiringOrganization",{})
            name=clean(org.get("name")) if isinstance(org,dict) else bank
            found.append({"id":url.split("?")[0].rstrip("/").lower(),"bank":bank,"title":title,"location":location,"level":clean(j.get("experienceRequirements")) or clean(j.get("employmentType")) or "Professional","published":iso_date(j.get("datePosted")),"deadline":iso_date(j.get("validThrough")),"url":url,"description":desc,"skills":[],"source":source,"employer":name,"verifiedStructuredData":True})
    return found

all_jobs=[]; statuses=[]
for bank,url in SOURCES:
    try:
        html=fetch(url)
        jobs=parse_jobs(bank,url,html)
        all_jobs.extend(jobs)
        statuses.append({"bank":bank,"status":"ok" if jobs else "no_structured_jobs_found","count":len(jobs),"source":url})
    except Exception as e:
        statuses.append({"bank":bank,"status":"fetch_error","count":0,"source":url,"detail":str(e)[:240]})
    time.sleep(1)
# Stable deduplication by canonical URL.
unique={j["id"]:j for j in all_jobs}
result={"updatedAt":datetime.now(timezone.utc).isoformat(),"jobs":list(unique.values()),"sources":statuses,"note":"Only official-source JobPosting structured data is imported. Empty results do not mean the bank has no vacancies; some career pages render jobs dynamically."}
with open("jobs.json","w",encoding="utf-8") as f: json.dump(result,f,ensure_ascii=False,indent=2)
print(json.dumps({"jobs":len(result["jobs"]),"sources":statuses},ensure_ascii=False,indent=2))
