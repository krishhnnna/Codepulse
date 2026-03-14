"""
Cheater Detection Service
─────────────────────────
Analyses contest history from multiple platforms to detect suspicious patterns.

Checks performed:
  1. LeetCode — skipped contests (attended: false in contest history)
  2. Codeforces — "ghost" contests (submissions exist but no rating change = removed by system)
  3. All platforms — rating anomalies (sudden large jumps that could indicate foul play)
"""

import httpx
import asyncio
import re
import json
from typing import Optional
from bs4 import BeautifulSoup

# ─── Constants ───
CF_BASE = "https://codeforces.com/api"
LC_GQL = "https://leetcode.com/graphql"
LC_HEADERS = {"Content-Type": "application/json", "Referer": "https://leetcode.com"}
CC_BASE = "https://www.codechef.com"

# Rating jump thresholds considered "suspicious"
ANOMALY_THRESHOLD = 300  # a jump ≥ 300 in a single contest is flagged


# ═══════════════════════════════════════════
#  LeetCode — Skipped Contests
# ═══════════════════════════════════════════

async def _lc_check(handle: str) -> dict:
    """
    LeetCode GraphQL returns contest history with:
      - attended=false → registered but didn't participate (skipped)
      - attended=true + problemsSolved=0 + finishTimeInSeconds=0 → penalized
        (plagiarism detected, solutions removed by system)
    """
    query = {
        "query": """
        query userContestRankingHistory($username: String!) {
            userContestRankingHistory(username: $username) {
                attended
                rating
                ranking
                problemsSolved
                finishTimeInSeconds
                contest {
                    title
                    startTime
                }
            }
        }
        """,
        "variables": {"username": handle},
    }

    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.post(LC_GQL, json=query, headers=LC_HEADERS)
        if resp.status_code != 200:
            return {"error": "Failed to fetch LeetCode data"}
        data = resp.json().get("data", {})

    history = data.get("userContestRankingHistory") or []
    if not history:
        return {"error": "No contest history found"}

    skipped = []      # registered but didn't participate
    penalized = []    # attended but solutions removed (plagiarism)
    attended = []
    anomalies = []
    prev_rating = None

    for r in history:
        contest_info = {
            "contestName": r["contest"]["title"],
            "timestamp": r["contest"]["startTime"],
            "rating": round(r["rating"]),
            "ranking": r["ranking"],
        }

        if not r.get("attended"):
            skipped.append(contest_info)
            continue

        # Attended=true but 0 solved + finishTime=0 → penalized (plagiarism)
        solved = r.get("problemsSolved", 0)
        finish = r.get("finishTimeInSeconds", -1)
        if solved == 0 and finish == 0:
            penalized.append(contest_info)
            # still update prev_rating so anomaly detection stays correct
            prev_rating = round(r["rating"])
            continue

        attended.append(contest_info)
        # Check for rating anomaly
        if prev_rating is not None:
            jump = round(r["rating"]) - prev_rating
            if abs(jump) >= ANOMALY_THRESHOLD:
                anomalies.append({
                    **contest_info,
                    "ratingChange": jump,
                    "previousRating": prev_rating,
                })
        prev_rating = round(r["rating"])

    return {
        "totalContests": len(history),
        "attendedCount": len(attended) + len(penalized),
        "skippedCount": len(skipped),
        "skippedContests": skipped,
        "penalizedCount": len(penalized),
        "penalizedContests": penalized,
        "anomalies": anomalies,
    }


# ═══════════════════════════════════════════
#  Codeforces — Ghost Contests & Anomalies
# ═══════════════════════════════════════════

# Patterns in contest names that indicate an unrated contest (false positive)
_UNRATED_PATTERNS = [
    "unrated", "practice", "kotlin heroes", "april fools",
    "icpc", "marathon", "online mirror", "warmup", "warm-up",
    "qualification", "q#", "school", "alpha", "unknown language",
    "treasure hunt", "aim tech poorly",
]


def _is_probably_unrated(name: str, contest_type: str = "") -> bool:
    """Check if contest is probably unrated based on name patterns."""
    lower = name.lower()
    # Explicit unrated markers
    for pat in _UNRATED_PATTERNS:
        if pat in lower:
            return True
    # Educational rounds are "Rated for Div. 2" only
    if "educational" in lower:
        return True
    return False


async def _cf_check(handle: str) -> dict:
    """
    Cross-reference user.rating (participated contests with rating change)
    and user.status (all submissions) to find:
      1. Contests where user submitted in a RATED round but got NO rating change → "ghost" (system removed)
      2. Large rating jumps (anomalies)
    """
    import asyncio as _aio

    async with httpx.AsyncClient(timeout=25) as client:
        # 1) Fetch contest list FIRST (no rate limit issue on first call)
        contest_map = {}  # id → {name, type}
        try:
            clist_resp = await client.get(f"{CF_BASE}/contest.list", params={"gym": "false"})
            if clist_resp.status_code == 200:
                clist_data = clist_resp.json()
                if clist_data.get("status") == "OK":
                    contest_map = {
                        c["id"]: {"name": c["name"], "type": c.get("type", "")}
                        for c in clist_data["result"]
                    }
        except Exception:
            pass

        # Small delay to avoid CF rate limit (1 req / 2 sec)
        await _aio.sleep(2)

        # 2) Fetch rating history
        rating_resp = await client.get(f"{CF_BASE}/user.rating", params={"handle": handle})
        if rating_resp.status_code != 200:
            return {"error": "Failed to fetch Codeforces rating data"}
        rating_data = rating_resp.json()
        if rating_data.get("status") != "OK":
            return {"error": rating_data.get("comment", "CF API error")}
        rating_changes = rating_data["result"]

        await _aio.sleep(2)

        # 3) Fetch all submissions
        status_resp = await client.get(f"{CF_BASE}/user.status", params={"handle": handle})
        if status_resp.status_code != 200:
            return {"error": "Failed to fetch Codeforces submissions"}
        status_data = status_resp.json()
        if status_data.get("status") != "OK":
            return {"error": status_data.get("comment", "CF API error")}
        submissions = status_data["result"]

    # Contest IDs where rating was updated (i.e., official participation)
    rated_contest_ids = {r["contestId"] for r in rating_changes}

    # Contest IDs where user has submissions as CONTESTANT
    submitted_contest_ids = {}
    # Contests with SKIPPED verdict (plagiarism detected by CF system)
    skipped_contest_ids = {}

    for s in submissions:
        cid = s.get("contestId")
        author_type = s.get("author", {}).get("participantType", "")
        verdict = s.get("verdict", "")

        # Track CONTESTANT submissions for ghost detection
        if cid and author_type == "CONTESTANT":
            if cid not in submitted_contest_ids:
                submitted_contest_ids[cid] = {
                    "contestId": cid,
                    "contestName": contest_map.get(cid, {}).get("name", f"Contest #{cid}"),
                    "timestamp": s.get("creationTimeSeconds", 0),
                    "submissionCount": 0,
                }
            submitted_contest_ids[cid]["submissionCount"] += 1

        # Track SKIPPED verdict submissions (plagiarism flag)
        if cid and verdict == "SKIPPED":
            if cid not in skipped_contest_ids:
                skipped_contest_ids[cid] = {
                    "contestId": cid,
                    "contestName": contest_map.get(cid, {}).get("name", f"Contest #{cid}"),
                    "timestamp": s.get("creationTimeSeconds", 0),
                    "skippedCount": 0,
                    "participantType": author_type,
                }
            skipped_contest_ids[cid]["skippedCount"] += 1

    # Skipped contests (plagiarism): group by contest
    skipped_contests = sorted(
        skipped_contest_ids.values(),
        key=lambda x: x.get("timestamp", 0),
        reverse=True,
    )

    # Ghost contests: user submitted as CONTESTANT but no rating change
    # ONLY flag if the contest SHOULD have been rated (filter out known unrated)
    ghost_contests = []
    for cid, info in submitted_contest_ids.items():
        if cid not in rated_contest_ids:
            # Skip if already flagged as skipped (plagiarism) — avoids double-counting
            if cid in skipped_contest_ids:
                continue
            cname = info["contestName"]
            ctype = contest_map.get(cid, {}).get("type", "")
            # Skip known unrated contests — these are NOT suspicious
            if _is_probably_unrated(cname, ctype):
                continue
            # Skip contests with very high IDs (likely gym/unofficial)
            if cid >= 100000:
                continue
            ghost_contests.append(info)

    # Sort by timestamp desc
    ghost_contests.sort(key=lambda x: x.get("timestamp", 0), reverse=True)

    # Rating anomalies (skip first contest — always a big jump from 0)
    anomalies = []
    for i, r in enumerate(rating_changes):
        if i == 0:
            continue  # first contest is always a big change
        change = r["newRating"] - r["oldRating"]
        if abs(change) >= ANOMALY_THRESHOLD:
            anomalies.append({
                "contestName": r["contestName"],
                "contestId": r["contestId"],
                "timestamp": r["ratingUpdateTimeSeconds"],
                "rating": r["newRating"],
                "previousRating": r["oldRating"],
                "ratingChange": change,
                "rank": r["rank"],
            })

    return {
        "totalRatedContests": len(rating_changes),
        "totalContestSubmissions": len(submitted_contest_ids),
        "ghostCount": len(ghost_contests),
        "ghostContests": ghost_contests,
        "skippedCount": len(skipped_contests),
        "skippedContests": skipped_contests,
        "anomalies": anomalies,
    }


# ═══════════════════════════════════════════
#  CodeChef — Plagiarism (penalised_in field)
# ═══════════════════════════════════════════

async def _cc_check(handle: str) -> dict:
    """
    CodeChef embeds contest history in Drupal.settings on the user profile page.
    Each contest entry has `penalised_in` (list of contest codes) and `reason`
    fields. If penalised_in is non-null, the user was caught cheating.
    """
    async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
        resp = await client.get(
            f"{CC_BASE}/users/{handle}",
            headers={"User-Agent": "Mozilla/5.0"},
        )
        if resp.status_code != 200:
            return {"error": "Failed to fetch CodeChef profile"}

    soup = BeautifulSoup(resp.text, "html.parser")
    contests = []
    for script in soup.find_all("script"):
        txt = script.string or ""
        if "date_versus_rating" not in txt:
            continue
        match = re.search(
            r'jQuery\.extend\(Drupal\.settings,\s*(\{.*?\})\s*\)',
            txt, re.DOTALL,
        )
        if match:
            try:
                settings = json.loads(match.group(1))
                contests = settings.get("date_versus_rating", {}).get("all", [])
            except Exception:
                pass
        break

    if not contests:
        return {"error": "No contest history found"}

    from datetime import datetime

    penalized = []
    for c in contests:
        if c.get("penalised_in"):
            ts = 0
            try:
                dt = datetime.strptime(c["end_date"], "%Y-%m-%d %H:%M:%S")
                ts = int(dt.timestamp())
            except Exception:
                pass
            penalized.append({
                "contestName": c.get("name", c.get("code", "Unknown")),
                "contestCode": c.get("code", ""),
                "timestamp": ts,
                "rating": int(c.get("rating", 0)),
                "rank": int(c.get("rank", 0)),
                "reason": c.get("reason", ""),
                "penalisedIn": c.get("penalised_in", []),
            })

    return {
        "totalContests": len(contests),
        "penalizedCount": len(penalized),
        "penalizedContests": penalized,
    }


# ═══════════════════════════════════════════
#  Main Entry Point
# ═══════════════════════════════════════════

async def check_cheater(
    cf_handle: Optional[str] = None,
    lc_handle: Optional[str] = None,
    cc_handle: Optional[str] = None,
) -> dict:
    """Run cheater checks in parallel for given handles."""
    tasks = {}
    if cf_handle:
        tasks["codeforces"] = _cf_check(cf_handle)
    if lc_handle:
        tasks["leetcode"] = _lc_check(lc_handle)
    if cc_handle:
        tasks["codechef"] = _cc_check(cc_handle)

    if not tasks:
        return {"error": "Provide at least one handle"}

    results = await asyncio.gather(*tasks.values(), return_exceptions=True)
    response = {}
    for key, result in zip(tasks.keys(), results):
        if isinstance(result, Exception):
            response[key] = {"error": str(result)}
        else:
            response[key] = result

    return response
