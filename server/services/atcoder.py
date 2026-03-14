"""
AtCoder Service
───────────────
Uses two sources:
  1. AtCoder Problems API (by kenkoooo) — submissions & contest data
     https://kenkoooo.com/atcoder/resources/
     - GET /atcoder-api/v3/user/ac_count?user={handle}
     - GET /atcoder-api/v3/user/submissions?user={handle}&from_second=0

  2. AtCoder official profile page — scraping for rating/rank
     https://atcoder.jp/users/{handle}
"""

import httpx
import time
from bs4 import BeautifulSoup
from typing import Optional
from schemas.models import AtCoderProfile

ATCODER_PROFILE = "https://atcoder.jp/users/{}"
KENKOOOO_BASE = "https://kenkoooo.com/atcoder"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
}


import re as _re


def _safe_int(text: str) -> int:
    """Extract the first integer from a string (e.g. '4229―King(+171)' → 4229)."""
    m = _re.search(r"\d+", text)
    return int(m.group()) if m else 0


async def get_profile(handle: str) -> Optional[AtCoderProfile]:
    """Scrape AtCoder profile + use kenkoooo API for solved count."""
    async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
        # ── Scrape official profile ──
        resp = await client.get(ATCODER_PROFILE.format(handle), headers=HEADERS)
        if resp.status_code != 200:
            return None

        soup = BeautifulSoup(resp.text, "html.parser")

        rating = 0
        max_rating = 0
        rank = ""

        # Rating table rows
        for tr in soup.select("table.dl-table tr"):
            th = tr.find("th")
            td = tr.find("td")
            if not th or not td:
                continue
            label = th.get_text(strip=True).lower()
            value = td.get_text(strip=True)

            if label == "rating":
                rating = _safe_int(value)
            elif label == "highest rating":
                max_rating = _safe_int(value)
            elif label == "rank":
                rank = value

        if max_rating == 0:
            max_rating = rating

        # ── Kenkoooo API for solved / contests ──
        total_solved = 0
        contests_participated = 0

        try:
            # Unique AC count (ac_rank returns {count, rank})
            ac_resp = await client.get(
                f"{KENKOOOO_BASE}/atcoder-api/v3/user/ac_rank",
                params={"user": handle},
            )
            if ac_resp.status_code == 200:
                total_solved = ac_resp.json().get("count", 0)
        except Exception:
            pass

        try:
            # Contest history from AtCoder
            history_resp = await client.get(
                f"https://atcoder.jp/users/{handle}/history/json",
                headers=HEADERS,
            )
            if history_resp.status_code == 200:
                history = history_resp.json()
                contests_participated = len(history)
        except Exception:
            pass

        return AtCoderProfile(
            handle=handle,
            rating=rating,
            maxRating=max_rating,
            rank=rank,
            totalSolved=total_solved,
            contestsParticipated=contests_participated,
        )


async def get_rating_history(handle: str) -> list[dict]:
    """Fetch contest rating history from AtCoder."""
    async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
        try:
            resp = await client.get(
                f"https://atcoder.jp/users/{handle}/history/json",
                headers=HEADERS,
            )
            if resp.status_code != 200:
                return []
            data = resp.json()
            return [
                {
                    "contestName": r.get("ContestName", ""),
                    "newRating": r.get("NewRating", 0),
                    "oldRating": r.get("OldRating", 0),
                    "rank": r.get("Place", 0),
                    "timestamp": r.get("EndTime", ""),
                }
                for r in data
            ]
        except Exception:
            return []


async def get_submissions(handle: str) -> list[dict]:
    """
    Fetch AtCoder submissions for heatmap using kenkoooo API.
    Only fetches last 365 days. Paginates in batches of 500.
    Returns list of {timestamp} dicts.
    """
    cutoff = int(time.time()) - 365 * 86400
    from_second = cutoff
    results = []

    async with httpx.AsyncClient(timeout=15) as client:
        for _ in range(20):  # safety limit on iterations
            resp = await client.get(
                f"{KENKOOOO_BASE}/atcoder-api/v3/user/submissions",
                params={"user": handle, "from_second": from_second},
            )
            if resp.status_code != 200:
                break

            data = resp.json()
            if not data:
                break

            for item in data:
                results.append({"timestamp": item["epoch_second"]})

            # kenkoooo returns max 500 items; if fewer, we're done
            if len(data) < 500:
                break

            # Paginate: next batch starts after the last item's epoch_second
            from_second = data[-1]["epoch_second"] + 1

    return results
