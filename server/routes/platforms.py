"""
API Routes
──────────
All endpoints are under /api prefix (set in main.py).

GET /api/{platform}/{handle}               → platform profile
GET /api/{platform}/{handle}/contests      → contest/rating history
GET /api/{platform}/{handle}/submissions   → submissions (CF, CC, AC)
GET /api/aggregate                         → all platforms at once
GET /api/upcoming-contests                 → upcoming contests from all platforms
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import asyncio

from services import codeforces, leetcode, codechef, atcoder
from services.upcoming import get_upcoming_contests
from services.cheater import check_cheater

router = APIRouter()


# ──────────────── Codeforces ────────────────

@router.get("/codeforces/{handle}")
async def cf_profile(handle: str):
    result = await codeforces.get_profile(handle)
    if not result:
        raise HTTPException(status_code=404, detail=f"Codeforces user '{handle}' not found")
    return result


@router.get("/codeforces/{handle}/contests")
async def cf_contests(handle: str):
    return await codeforces.get_rating_history(handle)


@router.get("/codeforces/{handle}/submissions")
async def cf_submissions(handle: str):
    return await codeforces.get_submissions(handle)


# ──────────────── LeetCode ────────────────

@router.get("/leetcode/{handle}")
async def lc_profile(handle: str):
    result = await leetcode.get_profile(handle)
    if not result:
        raise HTTPException(status_code=404, detail=f"LeetCode user '{handle}' not found")
    return result


@router.get("/leetcode/{handle}/calendar")
async def lc_calendar(handle: str):
    return await leetcode.get_submission_calendar(handle)


@router.get("/leetcode/{handle}/contests")
async def lc_contests(handle: str):
    return await leetcode.get_contest_history(handle)


# ──────────────── CodeChef ────────────────

@router.get("/codechef/{handle}")
async def cc_profile(handle: str):
    result = await codechef.get_profile(handle)
    if not result:
        raise HTTPException(status_code=404, detail=f"CodeChef user '{handle}' not found")
    return result


@router.get("/codechef/{handle}/contests")
async def cc_contests(handle: str):
    return await codechef.get_rating_history(handle)


@router.get("/codechef/{handle}/submissions")
async def cc_submissions(handle: str):
    return await codechef.get_submissions(handle)


# ──────────────── AtCoder ────────────────

@router.get("/atcoder/{handle}")
async def ac_profile(handle: str):
    result = await atcoder.get_profile(handle)
    if not result:
        raise HTTPException(status_code=404, detail=f"AtCoder user '{handle}' not found")
    return result


@router.get("/atcoder/{handle}/contests")
async def ac_contests(handle: str):
    return await atcoder.get_rating_history(handle)


@router.get("/atcoder/{handle}/submissions")
async def ac_submissions(handle: str):
    return await atcoder.get_submissions(handle)


# ──────────────── Topic Stats ────────────────

@router.get("/topic-stats")
async def topic_stats(
    cf: Optional[str] = Query(None, description="Codeforces handle"),
    lc: Optional[str] = Query(None, description="LeetCode handle"),
):
    """Fetch topic/tag-wise solved counts from CF + LC."""
    if not any([cf, lc]):
        raise HTTPException(status_code=400, detail="Provide at least one handle (cf or lc)")

    tasks = {}
    if cf:
        tasks["codeforces"] = codeforces.get_tag_stats(cf)
    if lc:
        tasks["leetcode"] = leetcode.get_tag_stats(lc)

    results = await asyncio.gather(*tasks.values(), return_exceptions=True)
    response = {}
    for key, result in zip(tasks.keys(), results):
        if isinstance(result, Exception):
            response[key] = []
        else:
            response[key] = result
    return response


# ──────────────── Upcoming Contests ────────────────

@router.get("/upcoming-contests")
async def upcoming_contests():
    return await get_upcoming_contests()


# ──────────────── Check Cheater ────────────────

@router.get("/check-cheater")
async def check_cheater_route(
    cf: Optional[str] = Query(None, description="Codeforces handle"),
    lc: Optional[str] = Query(None, description="LeetCode handle"),
    cc: Optional[str] = Query(None, description="CodeChef handle"),
):
    """Analyse contest history for suspicious patterns."""
    if not any([cf, lc, cc]):
        raise HTTPException(status_code=400, detail="Provide at least one platform handle (cf, lc, or cc)")
    return await check_cheater(cf_handle=cf, lc_handle=lc, cc_handle=cc)


# ──────────────── Aggregated ────────────────

@router.get("/aggregate")
async def aggregate_profiles(
    cf: Optional[str] = Query(None, description="Codeforces handle"),
    lc: Optional[str] = Query(None, description="LeetCode handle"),
    cc: Optional[str] = Query(None, description="CodeChef handle"),
    ac: Optional[str] = Query(None, description="AtCoder handle"),
):
    """Fetch all platform profiles in parallel."""
    if not any([cf, lc, cc, ac]):
        raise HTTPException(status_code=400, detail="Provide at least one platform handle")

    tasks = {
        "codeforces": codeforces.get_profile(cf) if cf else asyncio.sleep(0),
        "leetcode": leetcode.get_profile(lc) if lc else asyncio.sleep(0),
        "codechef": codechef.get_profile(cc) if cc else asyncio.sleep(0),
        "atcoder": atcoder.get_profile(ac) if ac else asyncio.sleep(0),
    }

    results = await asyncio.gather(*tasks.values(), return_exceptions=True)
    data = {}
    for key, result in zip(tasks.keys(), results):
        if isinstance(result, Exception) or result is None:
            data[key] = None
        else:
            data[key] = result

    # Compute aggregated stats
    total_solved = 0
    total_contests = 0
    best_rating = 0

    for profile in data.values():
        if profile is None:
            continue
        total_solved += getattr(profile, "totalSolved", 0)
        total_contests += getattr(profile, "contestsParticipated", 0) or getattr(profile, "contestsAttended", 0) or 0
        rating = getattr(profile, "maxRating", 0) or getattr(profile, "contestRating", 0) or 0
        best_rating = max(best_rating, rating)

    return {
        **{k: v.model_dump() if v else None for k, v in data.items()},
        "totalSolved": total_solved,
        "totalContests": total_contests,
        "bestRating": best_rating,
    }
