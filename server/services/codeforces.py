"""
Codeforces API Service
─────────────────────
Official API docs: https://codeforces.com/apiHelp

Endpoints used:
  1. user.info?handles={handle}        → profile, rating, rank, avatar
  2. user.rating?handle={handle}       → contest rating history
  3. user.status?handle={handle}       → all submissions (for solved count)
"""

import httpx
from typing import Optional
from schemas.models import CodeforcesProfile, CodeforcesRatingChange

BASE = "https://codeforces.com/api"


async def get_profile(handle: str) -> Optional[CodeforcesProfile]:
    """Fetch user profile info + submission‑derived solved count."""
    async with httpx.AsyncClient(timeout=15) as client:
        # ── User info ──
        info_resp = await client.get(f"{BASE}/user.info", params={"handles": handle})
        if info_resp.status_code != 200:
            return None
        info_data = info_resp.json()
        if info_data.get("status") != "OK":
            return None
        user = info_data["result"][0]

        # ── Rating history (for contest count) ──
        rating_resp = await client.get(f"{BASE}/user.rating", params={"handle": handle})
        contests = []
        if rating_resp.status_code == 200:
            rd = rating_resp.json()
            if rd.get("status") == "OK":
                contests = rd["result"]

        # ── Submissions (unique solved problems) ──
        status_resp = await client.get(f"{BASE}/user.status", params={"handle": handle})
        solved_count = 0
        if status_resp.status_code == 200:
            sd = status_resp.json()
            if sd.get("status") == "OK":
                solved_set = set()
                for sub in sd["result"]:
                    if sub.get("verdict") == "OK":
                        prob = sub["problem"]
                        key = f"{prob.get('contestId', 0)}-{prob.get('index', '')}"
                        solved_set.add(key)
                solved_count = len(solved_set)

        return CodeforcesProfile(
            handle=handle,
            rating=user.get("rating", 0),
            maxRating=user.get("maxRating", 0),
            rank=user.get("rank", "Unrated"),
            maxRank=user.get("maxRank", "Unrated"),
            totalSolved=solved_count,
            contestsParticipated=len(contests),
            contributions=user.get("contribution", 0),
            avatar=user.get("titlePhoto"),
        )


async def get_rating_history(handle: str) -> list[CodeforcesRatingChange]:
    """Fetch full contest rating history."""
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(f"{BASE}/user.rating", params={"handle": handle})
        if resp.status_code != 200:
            return []
        data = resp.json()
        if data.get("status") != "OK":
            return []
        return [
            CodeforcesRatingChange(
                contestId=r["contestId"],
                contestName=r["contestName"],
                rank=r["rank"],
                oldRating=r["oldRating"],
                newRating=r["newRating"],
                timestamp=r["ratingUpdateTimeSeconds"],
            )
            for r in data["result"]
        ]


async def get_tag_stats(handle: str) -> list[dict]:
    """Extract topic-wise solved count from AC submissions."""
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"{BASE}/user.status",
            params={"handle": handle, "from": 1, "count": 10000},
        )
        if resp.status_code != 200:
            return []
        data = resp.json()
        if data.get("status") != "OK":
            return []

    # Deduplicate by problem key, then count tags
    solved_problems = {}  # key -> tags list
    for s in data["result"]:
        if s.get("verdict") == "OK":
            prob = s["problem"]
            key = f"{prob.get('contestId', 0)}-{prob.get('index', '')}"
            if key not in solved_problems:
                solved_problems[key] = prob.get("tags", [])

    tag_counts = {}
    for tags in solved_problems.values():
        for tag in tags:
            tag_counts[tag] = tag_counts.get(tag, 0) + 1

    result = [{"tagName": k, "problemsSolved": v} for k, v in tag_counts.items()]
    result.sort(key=lambda x: x["problemsSolved"], reverse=True)
    return result


async def get_submissions(handle: str) -> list[dict]:
    """Fetch recent submissions with date for heatmap."""
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"{BASE}/user.status",
            params={"handle": handle, "from": 1, "count": 5000},
        )
        if resp.status_code != 200:
            return []
        data = resp.json()
        if data.get("status") != "OK":
            return []
        return [
            {
                "timestamp": s["creationTimeSeconds"],
                "verdict": s.get("verdict", ""),
                "problem": f"{s['problem'].get('contestId','')}{s['problem'].get('index','')}",
                "language": s.get("programmingLanguage", ""),
            }
            for s in data["result"]
        ]
