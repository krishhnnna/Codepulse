"""
Upcoming Contests Service
─────────────────────────
Fetches upcoming contests from all 4 platforms in parallel.

Sources:
  - Codeforces: GET /api/contest.list?gym=false → phase == "BEFORE"
  - LeetCode:   GraphQL topTwoContests
  - CodeChef:   GET /api/list/contests/all → future_contests
  - AtCoder:    Scrape https://atcoder.jp/contests/ → #contest-table-upcoming
"""

import httpx
import asyncio
import time
from datetime import datetime
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
}


async def _fetch_codeforces() -> list[dict]:
    """Fetch upcoming Codeforces contests."""
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                "https://codeforces.com/api/contest.list",
                params={"gym": "false"},
            )
            if resp.status_code != 200:
                return []
            data = resp.json()
            if data.get("status") != "OK":
                return []

            contests = []
            for c in data["result"]:
                if c["phase"] != "BEFORE":
                    continue
                contests.append({
                    "platform": "codeforces",
                    "name": c["name"],
                    "startTime": c["startTimeSeconds"],
                    "duration": c["durationSeconds"],
                    "url": f"https://codeforces.com/contest/{c['id']}",
                })
            contests.sort(key=lambda x: x["startTime"])
            return contests
    except Exception:
        return []


async def _fetch_leetcode() -> list[dict]:
    """Fetch upcoming LeetCode contests."""
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                "https://leetcode.com/graphql",
                json={
                    "query": "{ topTwoContests { title startTime duration } }",
                },
                headers={"Content-Type": "application/json"},
            )
            if resp.status_code != 200:
                return []
            data = resp.json()
            raw = data.get("data", {}).get("topTwoContests", [])

            contests = []
            now = int(time.time())
            for c in raw:
                start = c.get("startTime", 0)
                if start > now:
                    title = c["title"]
                    slug = title.lower().replace(" ", "-")
                    contests.append({
                        "platform": "leetcode",
                        "name": title,
                        "startTime": start,
                        "duration": c.get("duration", 5400),
                        "url": f"https://leetcode.com/contest/{slug}/",
                    })
            contests.sort(key=lambda x: x["startTime"])
            return contests
    except Exception:
        return []


async def _fetch_codechef() -> list[dict]:
    """Fetch upcoming CodeChef contests."""
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(
                "https://www.codechef.com/api/list/contests/all",
                params={
                    "sort_by": "START",
                    "sorting_order": "asc",
                    "offset": 0,
                    "mode": "all",
                },
                headers=HEADERS,
            )
            if resp.status_code != 200:
                return []
            data = resp.json()
            future = data.get("future_contests", [])

            contests = []
            for c in future:
                # Parse start date like "18 Mar 2026  20:00:00"
                start_str = c.get("contest_start_date", "")
                start_ts = 0
                if start_str:
                    try:
                        dt = datetime.strptime(start_str.strip(), "%d %b %Y  %H:%M:%S")
                        start_ts = int(dt.timestamp())
                    except (ValueError, TypeError):
                        pass

                duration_mins = c.get("contest_duration", 0)
                try:
                    duration_secs = int(duration_mins) * 60
                except (ValueError, TypeError):
                    duration_secs = 0

                code = c.get("contest_code", "")
                contests.append({
                    "platform": "codechef",
                    "name": c.get("contest_name", ""),
                    "startTime": start_ts,
                    "duration": duration_secs,
                    "url": f"https://www.codechef.com/{code}",
                })
            contests.sort(key=lambda x: x["startTime"])
            return contests
    except Exception:
        return []


async def _fetch_atcoder() -> list[dict]:
    """Fetch upcoming AtCoder contests by scraping contests page."""
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(
                "https://atcoder.jp/contests/",
                headers=HEADERS,
            )
            if resp.status_code != 200:
                return []

            soup = BeautifulSoup(resp.text, "html.parser")
            upcoming_div = soup.find("div", id="contest-table-upcoming")
            if not upcoming_div:
                return []

            contests = []
            rows = upcoming_div.find_all("tr")
            for row in rows[1:]:  # skip header
                cells = row.find_all("td")
                if len(cells) < 3:
                    continue

                # Time cell: "2026-03-14 21:00:00+0900"
                time_text = cells[0].get_text(strip=True)
                start_ts = 0
                if time_text:
                    try:
                        # Remove timezone offset for simple parsing
                        clean = time_text[:19]  # "2026-03-14 21:00:00"
                        dt = datetime.strptime(clean, "%Y-%m-%d %H:%M:%S")
                        # Adjust for JST (UTC+9)
                        start_ts = int(dt.timestamp()) - 9 * 3600 + _local_utc_offset()
                    except (ValueError, TypeError):
                        pass

                # Name + link
                name_cell = cells[1]
                name = name_cell.get_text(strip=True)
                # Clean up marker chars like Ⓗ◉ Ⓐ◉
                name = name.lstrip("ⒶⒷⒸⒹⒺⒻⒼⒽⒾⓇ◉ ")
                link = name_cell.find("a")
                href = link["href"] if link else ""

                # Duration: "01:40"
                dur_text = cells[2].get_text(strip=True)
                duration_secs = 0
                if dur_text and ":" in dur_text:
                    parts = dur_text.split(":")
                    try:
                        duration_secs = int(parts[0]) * 3600 + int(parts[1]) * 60
                    except (ValueError, IndexError):
                        pass

                contests.append({
                    "platform": "atcoder",
                    "name": name,
                    "startTime": start_ts,
                    "duration": duration_secs,
                    "url": f"https://atcoder.jp{href}" if href else "https://atcoder.jp/contests/",
                })
            contests.sort(key=lambda x: x["startTime"])
            return contests
    except Exception:
        return []


def _local_utc_offset() -> int:
    """Get local UTC offset in seconds."""
    import time as _time
    return -_time.timezone if _time.daylight == 0 else -_time.altzone


async def get_upcoming_contests() -> list[dict]:
    """Fetch upcoming contests from all platforms in parallel."""
    results = await asyncio.gather(
        _fetch_codeforces(),
        _fetch_leetcode(),
        _fetch_codechef(),
        _fetch_atcoder(),
        return_exceptions=True,
    )

    all_contests = []
    for r in results:
        if isinstance(r, list):
            all_contests.extend(r)

    # Sort by start time, earliest first
    all_contests.sort(key=lambda x: x["startTime"])
    return all_contests
