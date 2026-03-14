"""
CodeChef Scraping Service
─────────────────────────
CodeChef has no official public API. We scrape the public profile page.

Target: https://www.codechef.com/users/{handle}
Method: HTML scraping with BeautifulSoup

Data extracted:
  - Rating, max rating, stars
  - Global & country rank
  - Problems solved
  - Contests participated
  - Contest rating history (from embedded JS data)
"""

import httpx
import json
import re
import time
from datetime import datetime
from bs4 import BeautifulSoup
from typing import Optional, List
from schemas.models import CodeChefProfile

PROFILE_URL = "https://www.codechef.com/users/{}"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
}


def _safe_int(text: str) -> int:
    """Extract integer from text, stripping non-numeric chars."""
    if not text:
        return 0
    cleaned = "".join(c for c in text if c.isdigit())
    return int(cleaned) if cleaned else 0


def _extract_drupal_settings(html: str) -> dict:
    """Extract the JSON from jQuery.extend(Drupal.settings, {...}) in the HTML."""
    pattern = r'jQuery\.extend\(Drupal\.settings,\s*(\{.*?\})\);'
    match = re.search(pattern, html, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass
    return {}


async def _fetch_page(handle: str):
    """Fetch the CodeChef profile page. Returns (html_text, status_code)."""
    async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
        resp = await client.get(PROFILE_URL.format(handle), headers=HEADERS)
        return resp.text, resp.status_code


async def get_profile(handle: str) -> Optional[CodeChefProfile]:
    """Scrape CodeChef user profile page."""
    html, status = await _fetch_page(handle)
    if status != 200:
        return None

    soup = BeautifulSoup(html, "html.parser")

    # ── Rating ──
    rating = 0
    max_rating = 0
    rating_div = soup.find("div", class_="rating-number")
    if rating_div:
        rating = _safe_int(rating_div.get_text(strip=True))

    # Max rating — look for "Highest Rating" text
    for small in soup.find_all("small"):
        txt = small.get_text(strip=True).lower()
        if "highest rating" in txt:
            max_rating = _safe_int(small.get_text())
            break

    if max_rating == 0:
        max_rating = rating

    # ── Stars ──
    stars = 0
    # Stars are in <div class="rating-star"> with multiple <span>★</span> children
    star_div = soup.find("div", class_="rating-star")
    if star_div:
        star_spans = star_div.find_all("span")
        stars = len(star_spans)
    
    # Fallback: old method
    if stars == 0:
        star_span = soup.find("span", class_="rating")
        if star_span:
            star_text = star_span.get_text(strip=True)
            stars = star_text.count("★")
            if stars == 0:
                stars = len([c for c in star_text if ord(c) > 9000])

    # ── Ranks ──
    global_rank = None
    country_rank = None
    rank_lists = soup.find_all("li", class_="inline-list")
    for li in rank_lists:
        text = li.get_text(strip=True).lower()
        if "global" in text:
            strong = li.find("strong")
            if strong:
                global_rank = _safe_int(strong.get_text())
        elif "country" in text:
            strong = li.find("strong")
            if strong:
                country_rank = _safe_int(strong.get_text())

    # ── Contests participated ──
    contests = 0
    # Primary: look for contest-participated-count div
    contest_count_div = soup.find("div", class_="contest-participated-count")
    if contest_count_div:
        b_tag = contest_count_div.find("b")
        if b_tag:
            contests = _safe_int(b_tag.get_text(strip=True))

    # Fallback: parse from Drupal settings
    if contests == 0:
        settings = _extract_drupal_settings(html)
        date_vs_rating = settings.get("date_versus_rating", {})
        rating_data = date_vs_rating.get("all", [])
        # Filter out the rating shift entry
        real_contests = [e for e in rating_data
                         if e.get("code") != "RATING_SHIFT_TO_ELO_RATING_CODE"]
        contests = len(real_contests)

    # ── Problems solved ──
    total_solved = 0
    # Look for h3 containing "Total Problems Solved"
    for h3 in soup.find_all("h3"):
        h3_text = h3.get_text(strip=True)
        if "total problems solved" in h3_text.lower():
            total_solved = _safe_int(h3_text)
            break

    # Fallback: count from problem links in the problems-solved section
    if total_solved == 0:
        problems_section = soup.find("section", class_="rating-data-section problems-solved")
        if problems_section:
            # Try "Contests (N)" h3 for contest problem count
            for h3 in problems_section.find_all("h3"):
                txt = h3.get_text(strip=True)
                if "contest" in txt.lower():
                    continue  # skip contests heading
                total_solved = _safe_int(txt)
                if total_solved > 0:
                    break

    if total_solved == 0:
        prob_links = soup.select(".problems-solved a")
        total_solved = len(prob_links)

    return CodeChefProfile(
        handle=handle,
        rating=rating,
        maxRating=max_rating,
        stars=stars,
        globalRank=global_rank,
        countryRank=country_rank,
        totalSolved=total_solved,
        contestsParticipated=contests,
    )


async def get_rating_history(handle: str) -> List[dict]:
    """
    Extract contest rating history from embedded Drupal.settings JS data.
    Returns a list of {contestName, rating, rank, timestamp, change}.
    """
    html, status = await _fetch_page(handle)
    if status != 200:
        return []

    settings = _extract_drupal_settings(html)
    date_vs_rating = settings.get("date_versus_rating", {})
    rating_data = date_vs_rating.get("all", [])

    history = []
    prev_rating = 0
    for entry in rating_data:
        # Skip the synthetic rating shift entry
        if entry.get("code") == "RATING_SHIFT_TO_ELO_RATING_CODE":
            continue

        current_rating = int(entry.get("rating", 0))
        end_date = entry.get("end_date", "")

        # Parse timestamp from end_date string (e.g. "2018-07-16 15:00:10")
        timestamp = 0
        if end_date:
            try:
                from datetime import datetime
                dt = datetime.strptime(end_date, "%Y-%m-%d %H:%M:%S")
                timestamp = int(dt.timestamp())
            except (ValueError, TypeError):
                pass

        change = current_rating - prev_rating if prev_rating > 0 else 0

        history.append({
            "contestName": entry.get("name", ""),
            "rating": current_rating,
            "rank": int(entry.get("rank", 0)),
            "timestamp": timestamp,
            "change": change,
        })

        prev_rating = current_rating

    return history


SUBMISSIONS_URL = "https://www.codechef.com/recent/user"


async def get_submissions(handle: str) -> list[dict]:
    """
    Fetch CodeChef submission timestamps for heatmap.
    Uses the paginated recent submissions endpoint.
    Only fetches submissions from the last 365 days.
    """
    cutoff = int(time.time()) - 365 * 86400
    results = []

    async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
        page = 0
        max_pages = 1  # will be updated from response
        stop = False

        while page <= max_pages and not stop and page < 50:
            resp = await client.get(
                SUBMISSIONS_URL,
                params={"page": page, "user_handle": handle},
                headers=HEADERS,
            )
            if resp.status_code != 200:
                break

            try:
                data = resp.json()
            except Exception:
                break

            max_pages = data.get("max_page", 0)
            html = data.get("content", "")

            soup = BeautifulSoup(html, "html.parser")
            rows = soup.find_all("tr")

            for row in rows:
                cells = row.find_all("td")
                if not cells:
                    continue
                # The time cell has a title attribute like "08:48 AM 31/12/19"
                time_cell = cells[0] if cells else None
                if not time_cell:
                    continue

                time_str = time_cell.get("title", "") or time_cell.get_text(strip=True)
                if not time_str:
                    continue

                ts = _parse_cc_time(time_str)
                if ts and ts < cutoff:
                    stop = True
                    break
                if ts:
                    results.append({"timestamp": ts})

            page += 1

    return results


def _parse_cc_time(time_str: str) -> int:
    """Parse CodeChef time string like '08:48 AM 31/12/19' to unix timestamp."""
    formats = [
        "%I:%M %p %d/%m/%y",   # 08:48 AM 31/12/19
        "%I:%M %p %d/%m/%Y",   # 08:48 AM 31/12/2019
        "%H:%M:%S %d/%m/%y",
        "%H:%M:%S %d/%m/%Y",
    ]
    for fmt in formats:
        try:
            dt = datetime.strptime(time_str.strip(), fmt)
            return int(dt.timestamp())
        except (ValueError, TypeError):
            continue
    return 0
