"""
LeetCode Rating Predictor
─────────────────────────
Implements the same Elo-style algorithm used by CF / Carrot / lcpredictor.

Flow:
  1. Find recently FINISHED LC contests (within 6 hours)
  2. Check if the target user participated via userContestRankingHistory
  3. Detect if official ratings are already published (rating comparison)
  4. Sample contest standings via REST API  (paginated, ~1500 users)
  5. Batch-fetch current ratings for sampled users via GraphQL aliases
  6. Run Elo prediction on the sample (scale-invariant → accurate)

Caches standings + ratings per contest so repeated queries are instant.
"""

import httpx
import asyncio
import math
import time
import json
import os
import logging
from typing import Optional, Dict, List, Tuple

LC_GQL = "https://leetcode.com/graphql"
LC_RANK_API = "https://leetcode.com/contest/api/ranking"
GQL_HEADERS = {
    "Content-Type": "application/json",
    "Referer": "https://leetcode.com",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
}
REST_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://leetcode.com",
    "Accept": "application/json",
}

# ── Cloudflare Bypass (cloudscraper) ──────────────────────────────────────────
# Pure Python library that solves Cloudflare JS challenges without a browser.
# No system deps, no root access, works everywhere including Render free tier.
import cloudscraper

_scraper = cloudscraper.create_scraper(
    browser={'browser': 'chrome', 'platform': 'linux', 'desktop': True}
)


async def _cf_get(url: str) -> Optional[dict]:
    """Async wrapper for cloudscraper GET request. Returns JSON or None."""
    try:
        resp = await asyncio.to_thread(_scraper.get, url, timeout=30)
        if resp.status_code == 200:
            return resp.json()
    except Exception:
        pass
    return None


# ── Caches ───────────────────────────────────────────────────────────────────
# {contest_slug: {participants: [...], total_users: int, _ts: float}}
_standings_cache: Dict[str, dict] = {}
# {(contest_slug, handle_lower): prediction_dict}
_pred_cache: Dict[tuple, dict] = {}
CACHE_TTL = 6 * 3600  # 6 hours

# ── Tuning ───────────────────────────────────────────────────────────────────
SAMPLE_PAGES = 60       # ~1500 users evenly spread across ALL ranks
RATING_BATCH = 60       # Users per GraphQL aliased request
CONCURRENCY = 12        # Max parallel requests
PREDICTION_WINDOW = 6   # Hours after contest end to show prediction


def _delta_coefficient(k: int) -> float:
    """
    LeetCode's official delta multiplier based on attendedContestsCount.
    f(k) = 1 / (1 + sum((5/7)^i for i in 0..k))
    For experienced users (k large), converges to 2/9 ≈ 0.222.
    For first contest (k=0), f(0) = 0.5.
    """
    if k <= 0:
        return 0.5
    if k > 100:
        return 2 / 9
    sigma = sum((5 / 7) ** i for i in range(k + 1))
    return 1 / (1 + sigma)


# ── Public API ───────────────────────────────────────────────────────────────

async def get_prediction(handle: str) -> Optional[dict]:
    """
    Return a rating prediction for `handle` if there's a recent LC contest
    where the user participated but official ratings haven't dropped yet.
    Returns None if no prediction available.
    """
    log = logging.getLogger("lc_predict")
    log.info(f"[LC-PREDICT] Starting prediction for {handle}")

    async with httpx.AsyncClient(
        timeout=120, follow_redirects=True, headers=REST_HEADERS
    ) as client:
        # 1 ── Recent finished contests
        contests = await _find_recent_contests(client)
        if not contests:
            log.info("[LC-PREDICT] No recent contests found")
            return None

        log.info(f"[LC-PREDICT] Found {len(contests)} recent contests: {[c['title'] for c in contests]}")

        # 2 ── Fetch user's contest history + current rating
        history_data = await _get_user_history(client, handle)
        if not history_data:
            log.info("[LC-PREDICT] No user history data")
            return None

        attended, current_rating, attended_count = history_data
        log.info(f"[LC-PREDICT] User rating={current_rating}, attended={attended_count}, history_len={len(attended)}")

        # 3 ── For each candidate contest, check participation
        for contest in contests:
            slug = contest["titleSlug"]
            contest_name = contest["title"]

            part = _check_participation_in_history(attended, contest_name)

            # Fallback: if history hasn't updated yet, search REST API directly
            if not part:
                log.info(f"[LC-PREDICT] '{contest_name}' not in history, trying fallback rank scan...")
                user_rank = await _find_user_rank_in_contest(client, slug, handle)
                if user_rank is None:
                    log.info(f"[LC-PREDICT] User not found in '{contest_name}' standings")
                    continue  # User didn't participate
                log.info(f"[LC-PREDICT] Fallback found user at rank {user_rank}")
                # Use current rating as pre-contest rating (best approximation)
                pre_contest_rating = current_rating
                ratings_published = False
                user_attended_count = attended_count
            else:
                if part["ratings_published"]:
                    log.info(f"[LC-PREDICT] Ratings already published for '{contest_name}'")
                    continue
                user_rank = part["rank"]
                pre_contest_rating = part["pre_contest_rating"]
                user_attended_count = attended_count
                log.info(f"[LC-PREDICT] Found in history: rank={user_rank}, pre_rating={pre_contest_rating}")

            # 4 ── Cache check
            now = time.time()
            cache_key = (slug, handle.lower())
            if cache_key in _pred_cache:
                cached = _pred_cache[cache_key]
                if now - cached.get("_ts", 0) < CACHE_TTL:
                    log.info(f"[LC-PREDICT] Returning cached prediction")
                    return {k: v for k, v in cached.items() if k != "_ts"}

            # 5 ── Fetch sampled standings + ratings
            if slug in _standings_cache and now - _standings_cache[slug].get("_ts", 0) < CACHE_TTL:
                participants = _standings_cache[slug]["participants"]
                total_users = _standings_cache[slug]["total_users"]
            else:
                result = await _fetch_sampled_standings(client, slug, user_rank)
                if not result:
                    log.info(f"[LC-PREDICT] Failed to fetch standings for '{contest_name}'")
                    continue
                participants, total_users = result
                _standings_cache[slug] = {
                    "participants": participants,
                    "total_users": total_users,
                    "_ts": now,
                }

            log.info(f"[LC-PREDICT] Got {len(participants)} sampled participants, total={total_users}")

            # 6 ── Ensure user is in the sample
            participants = [dict(p) for p in participants]  # shallow copy
            user_in_sample = False
            for p in participants:
                if p["handle"].lower() == handle.lower():
                    user_in_sample = True
                    p["rating"] = pre_contest_rating
                    break

            if not user_in_sample:
                participants.append({
                    "handle": handle,
                    "rank": user_rank,
                    "rating": pre_contest_rating,
                })

            # Sort by rank and assign sample positions
            participants.sort(key=lambda x: x["rank"])

            user_idx = None
            for i, p in enumerate(participants):
                p["sample_rank"] = i + 1  # 1-based position in sample
                if p["handle"].lower() == handle.lower():
                    user_idx = i

            if user_idx is None:
                log.info(f"[LC-PREDICT] User not found in sorted participants")
                continue

            # 7 ── Elo prediction
            prediction = _elo_predict(participants, user_idx, user_attended_count, total_users)
            prediction["contest_name"] = contest_name
            prediction["contest_slug"] = slug
            prediction["total_participants"] = total_users

            log.info(f"[LC-PREDICT] Prediction: {prediction}")
            _pred_cache[cache_key] = {**prediction, "_ts": now}
            return prediction

    log.info("[LC-PREDICT] No prediction available (end of loop)")
    return None


async def _find_user_rank_in_contest(client, contest_slug: str, handle: str) -> Optional[int]:
    """
    Search for a user in the contest ranking API by scanning ALL pages
    concurrently. Returns the user's rank if found, None otherwise.
    Uses 25 concurrent requests to scan ~1500 pages in ~30-60s.
    """
    # Get total users first
    try:
        url = f"{LC_RANK_API}/{contest_slug}/?pagination=1&region=global"
        data = await _cf_get(url)
        if not data:
            return None
        total_users = data.get("user_num", 0)
        if total_users == 0:
            return None

        # Check page 1
        for u in data.get("total_rank", []):
            if u["username"].lower() == handle.lower():
                return u["rank"]
    except Exception:
        return None

    total_pages = math.ceil(total_users / 25)
    handle_lower = handle.lower()
    found_rank = None
    sem = asyncio.Semaphore(25)  # 25 concurrent requests

    async def scan_page(page_num):
        nonlocal found_rank
        if found_rank is not None:
            return  # Short-circuit if already found
        async with sem:
            if found_rank is not None:
                return
            try:
                data = await _cf_get(f"{LC_RANK_API}/{contest_slug}/?pagination={page_num}&region=global")
                if data:
                    for u in data.get("total_rank", []):
                        if u["username"].lower() == handle_lower:
                            found_rank = u["rank"]
                            return
            except Exception:
                pass

    # Scan ALL pages in batches to avoid overwhelming the event loop
    all_pages = list(range(2, total_pages + 1))
    BATCH = 100
    for i in range(0, len(all_pages), BATCH):
        if found_rank is not None:
            break
        batch = all_pages[i:i + BATCH]
        await asyncio.gather(*[scan_page(p) for p in batch])

    return found_rank


# ── Internals ────────────────────────────────────────────────────────────────

async def _find_recent_contests(client) -> list:
    """Find finished LC contests within PREDICTION_WINDOW hours."""
    query = {
        "query": """
        query {
            allContests {
                title
                titleSlug
                startTime
                duration
            }
        }
        """,
    }
    try:
        resp = await client.post(LC_GQL, json=query, headers=GQL_HEADERS)
        if resp.status_code != 200:
            return []
        data = resp.json().get("data", {})
        contests = data.get("allContests", [])
    except Exception:
        return []

    now = time.time()
    results = []
    for c in contests:
        start = c.get("startTime", 0)
        duration = c.get("duration", 0)
        end = start + duration

        if now < end:
            continue  # ongoing or future

        age_hours = (now - end) / 3600
        if age_hours > PREDICTION_WINDOW:
            break  # sorted newest-first

        results.append(c)

    return results


async def _get_user_history(client, handle: str):
    """
    Fetch user's contest ranking history, current rating, and attended count.
    Returns (attended_list, current_rating, attended_count) or None.
    """
    query = {
        "query": """
        query ($username: String!) {
            userContestRankingHistory(username: $username) {
                attended
                rating
                ranking
                contest {
                    title
                    startTime
                }
            }
            userContestRanking(username: $username) {
                rating
                attendedContestsCount
            }
        }
        """,
        "variables": {"username": handle},
    }
    try:
        resp = await client.post(LC_GQL, json=query, headers=GQL_HEADERS)
        if resp.status_code != 200:
            return None
        data = resp.json().get("data", {})
    except Exception:
        return None

    history = data.get("userContestRankingHistory")
    if not history:
        return None

    # Filter to attended and sort chronologically
    attended = [h for h in history if h.get("attended")]
    attended.sort(key=lambda x: x.get("contest", {}).get("startTime", 0))

    cr = data.get("userContestRanking")
    current_rating = round(cr["rating"]) if cr and cr.get("rating") else 1500
    attended_count = cr.get("attendedContestsCount", len(attended)) if cr else len(attended)

    return attended, current_rating, attended_count


def _check_participation_in_history(attended: list, contest_name: str) -> Optional[dict]:
    """
    Check if user participated in a specific contest.
    Returns {rank, pre_contest_rating, ratings_published} or None.
    """
    target_idx = None
    for i, h in enumerate(attended):
        if h.get("contest", {}).get("title") == contest_name:
            target_idx = i
            break

    if target_idx is None:
        return None

    target = attended[target_idx]
    rank = target.get("ranking", 0)
    if rank <= 0:
        return None

    # Pre-contest rating = rating after the PREVIOUS contest
    if target_idx > 0:
        pre_contest_rating = round(attended[target_idx - 1]["rating"])
    else:
        pre_contest_rating = 1500  # First contest

    # Detect if ratings are published:
    # If this entry's rating differs from pre-contest → published
    # If same → pending (or delta=0, harmless false positive)
    target_rating = target.get("rating", 0)
    ratings_published = False
    if target_rating > 0 and abs(target_rating - pre_contest_rating) > 0.5:
        ratings_published = True

    return {
        "rank": rank,
        "pre_contest_rating": pre_contest_rating,
        "ratings_published": ratings_published,
    }


async def _fetch_sampled_standings(
    client, contest_slug: str, user_rank: int
) -> Optional[Tuple[List[dict], int]]:
    """
    Fetch sampled standings via REST API + ratings via GraphQL.
    Returns (participants, total_user_count) or None.
    """
    # Page 1 → total user count
    try:
        url = f"{LC_RANK_API}/{contest_slug}/?pagination=1&region=global"
        page1 = await _cf_get(url)
        if not page1:
            return None
        total_users = page1.get("user_num", 0)
        if total_users == 0:
            return None
    except Exception:
        return None

    total_pages = math.ceil(total_users / 25)
    effective_pages = total_pages  # Sample across ALL ranks, no cap

    # Determine pages to sample
    pages_to_fetch = set()

    if effective_pages <= SAMPLE_PAGES:
        pages_to_fetch = set(range(1, effective_pages + 1))
    else:
        step = effective_pages / SAMPLE_PAGES
        for i in range(SAMPLE_PAGES):
            pages_to_fetch.add(min(int(1 + i * step), effective_pages))

    # Pages around user's rank
    user_page = max(1, math.ceil(user_rank / 25))
    for p in range(max(1, user_page - 3), min(effective_pages + 1, user_page + 4)):
        pages_to_fetch.add(p)

    pages_to_fetch.add(1)
    pages_to_fetch.add(effective_pages)
    pages_to_fetch = sorted(pages_to_fetch)

    # ── Fetch standings pages concurrently ──
    sem = asyncio.Semaphore(CONCURRENCY)
    all_users: List[dict] = []

    # Collect page 1 users
    for u in page1.get("total_rank", []):
        all_users.append({
            "handle": u["username"],
            "rank": u["rank"],
            "rating": 1500,
        })

    async def fetch_page(page_num):
        if page_num == 1:
            return
        async with sem:
            try:
                data = await _cf_get(f"{LC_RANK_API}/{contest_slug}/?pagination={page_num}&region=global")
                if data:
                    for u in data.get("total_rank", []):
                        all_users.append({
                            "handle": u["username"],
                            "rank": u["rank"],
                            "rating": 1500,
                        })
            except Exception:
                pass
            await asyncio.sleep(0.05)

    tasks = [fetch_page(p) for p in pages_to_fetch if p != 1]
    await asyncio.gather(*tasks)

    if not all_users:
        return None

    # Deduplicate
    seen = set()
    unique_users = []
    for u in all_users:
        key = u["handle"].lower()
        if key not in seen:
            seen.add(key)
            unique_users.append(u)

    # ── Batch-fetch ratings via GraphQL aliases ──
    handles = [u["handle"] for u in unique_users]
    ratings = await _batch_fetch_ratings(client, handles)

    for u in unique_users:
        if u["handle"] in ratings:
            u["rating"] = ratings[u["handle"]]

    return unique_users, total_users


async def _batch_fetch_ratings(client, handles: List[str]) -> Dict[str, int]:
    """
    Fetch current contest ratings for many users using GraphQL aliased queries.
    E.g., { u0: userContestRanking(username: "X") { rating } u1: ... }
    """
    ratings: Dict[str, int] = {}
    sem = asyncio.Semaphore(CONCURRENCY)

    async def fetch_batch(batch_handles: List[str], batch_idx: int):
        # Build aliased query
        parts = []
        alias_map = {}
        for i, h in enumerate(batch_handles):
            safe_alias = f"u{batch_idx}x{i}"
            # Escape username for GraphQL string literal
            escaped = h.replace("\\", "\\\\").replace('"', '\\"')
            parts.append(
                f'{safe_alias}: userContestRanking(username: "{escaped}") {{ rating }}'
            )
            alias_map[safe_alias] = h

        query_str = "{ " + " ".join(parts) + " }"

        async with sem:
            try:
                resp = await client.post(
                    LC_GQL,
                    json={"query": query_str},
                    headers=GQL_HEADERS,
                )
                if resp.status_code == 200:
                    data = resp.json().get("data") or {}
                    for alias, handle in alias_map.items():
                        entry = data.get(alias)
                        if entry and entry.get("rating"):
                            ratings[handle] = round(entry["rating"])
            except Exception:
                pass
            await asyncio.sleep(0.05)

    # Create batches
    tasks = []
    for i in range(0, len(handles), RATING_BATCH):
        batch = handles[i : i + RATING_BATCH]
        tasks.append(fetch_batch(batch, i // RATING_BATCH))

    await asyncio.gather(*tasks)
    return ratings


def _elo_predict(participants: List[dict], user_idx: int, attended_count: int = 0, total_users: int = 0) -> dict:
    """
    Elo-style prediction matching LeetCode's official algorithm (same as Enthrahub/lccn_predictor).

    The seed from the sample is scaled by (total_users / sample_size) to represent
    the full participant pool. The actual contest rank is used for midRank.

    Algorithm:
      seed(R) = scale * (1 + Σ_{j≠i} 1/(1 + 10^((R − rⱼ)/400)))
      midRank = √(actual_rank × seed(current_rating))
      Binary search for R* such that seed(R*) = midRank
      delta = (R* − current_rating) × f(attendedContestsCount)
    """
    user = participants[user_idx]
    user_rating = user["rating"]
    actual_rank = user["rank"]  # actual contest rank
    sample_size = len(participants)

    # Scale factor: extrapolate sample seed to full population
    scale = total_users / sample_size if total_users > sample_size else 1.0

    others = [p["rating"] for i, p in enumerate(participants) if i != user_idx]

    def get_seed(rating):
        s = 1.0
        for r in others:
            s += 1.0 / (1.0 + 10.0 ** ((rating - r) / 400.0))
        return s * scale

    seed = get_seed(user_rating)
    mid_rank = math.sqrt(actual_rank * seed)

    # Binary search for R*
    lo, hi = 1, 8000
    while hi - lo > 1:
        mid = (lo + hi) // 2
        if get_seed(mid) < mid_rank:
            hi = mid
        else:
            lo = mid

    R_star = lo
    # Use f(k) multiplier instead of flat 0.5
    coeff = _delta_coefficient(attended_count)
    delta = round((R_star - user_rating) * coeff)
    predicted = user_rating + delta

    return {
        "old_rating": user_rating,
        "predicted_rating": predicted,
        "predicted_change": delta,
        "rank": actual_rank,
    }
