"""
Codeforces Rating Predictor
────────────────────────────
Implements the CF Elo-style rating prediction algorithm (same as Carrot).

Flow:
  1. Find recently FINISHED contests where ratings haven't been published yet
  2. Check if the target user participated
  3. Fetch all rated participants' current ratings (batch user.info)
  4. Apply the Elo formula to predict the user's new rating

Caches standings+ratings per contest so repeated queries are instant.
"""

import httpx
import asyncio
import math
import time
from typing import Optional, Dict

BASE = "https://codeforces.com/api"

# ── Caches ───────────────────────────────────────────────────────────────────
# {contest_id: {participants: [{handle, rank, rating}], contest_name, _ts}}
_standings_cache: Dict[int, dict] = {}
# {(contest_id, handle_lower): prediction_dict}
_pred_cache: Dict[tuple, dict] = {}
CACHE_TTL = 4 * 3600  # 4 hours


# ── Public API ───────────────────────────────────────────────────────────────

async def get_prediction(handle: str) -> Optional[dict]:
    """
    Return a rating prediction for `handle` if there is a recent CF contest
    where the user participated but official ratings haven't dropped yet.
    Returns None if no prediction is available.
    """
    async with httpx.AsyncClient(timeout=20) as client:
        # 1 ── Recent finished contests (up to 5 days back)
        resp = await client.get(f"{BASE}/contest.list")
        if resp.status_code != 200:
            return None
        body = resp.json()
        if body.get("status") != "OK":
            return None

        now = time.time()
        candidates = []
        for c in body["result"]:
            phase = c.get("phase", "")
            if phase not in ("FINISHED", "PENDING_SYSTEM_TESTING", "SYSTEM_TESTING"):
                continue
            end = c.get("startTimeSeconds", 0) + c.get("durationSeconds", 0)
            if now - end > 5 * 86400:
                break  # sorted newest-first, so stop early
            candidates.append(c)

        # 2 ── For each candidate, check if ratings exist & user participated
        for contest in candidates:
            cid = contest["id"]

            # Already rated?
            try:
                rc = await client.get(
                    f"{BASE}/contest.ratingChanges",
                    params={"contestId": cid},
                )
                if rc.status_code == 200:
                    rd = rc.json()
                    if rd.get("status") == "OK" and rd.get("result"):
                        continue  # official ratings out → skip
            except Exception:
                pass

            # Did user participate (as CONTESTANT, not virtual)?
            try:
                st = await client.get(
                    f"{BASE}/contest.standings",
                    params={
                        "contestId": cid,
                        "handles": handle,
                        "showUnofficial": "false",
                    },
                )
                if st.status_code != 200:
                    continue
                sd = st.json()
                if sd.get("status") != "OK":
                    continue
                rows = sd["result"].get("rows", [])
                if not rows:
                    continue
                user_rank = rows[0]["rank"]
            except Exception:
                continue

            # 3 ── We found a match. Return cached prediction or compute.
            cache_key = (cid, handle.lower())
            if cache_key in _pred_cache:
                cached = _pred_cache[cache_key]
                if now - cached.get("_ts", 0) < CACHE_TTL:
                    return {k: v for k, v in cached.items() if k != "_ts"}

            prediction = await _build_prediction(
                client, cid, contest["name"], handle, user_rank
            )
            if prediction:
                _pred_cache[cache_key] = {**prediction, "_ts": now}
                return prediction

    return None


# ── Internals ────────────────────────────────────────────────────────────────

async def _build_prediction(client, cid, contest_name, handle, user_rank):
    """Fetch standings + ratings for a contest, then predict for `handle`."""
    now = time.time()

    # Use cached standings if fresh
    if cid in _standings_cache and now - _standings_cache[cid].get("_ts", 0) < CACHE_TTL:
        participants = _standings_cache[cid]["participants"]
    else:
        participants = await _fetch_standings_with_ratings(client, cid)
        if not participants:
            return None
        _standings_cache[cid] = {
            "participants": participants,
            "contest_name": contest_name,
            "_ts": now,
        }

    # Find user in participants list
    user_idx = None
    for i, p in enumerate(participants):
        if p["handle"].lower() == handle.lower():
            user_idx = i
            break

    if user_idx is None:
        return None

    result = _elo_predict(participants, user_idx)
    result["contest_name"] = contest_name
    result["contest_id"] = cid
    result["total_participants"] = len(participants)
    return result


async def _fetch_standings_with_ratings(client, cid):
    """
    Fetch full official standings, then batch-fetch current ratings via
    user.info.  Returns list of {handle, rank, rating}.
    """
    try:
        resp = await client.get(
            f"{BASE}/contest.standings",
            params={"contestId": cid, "showUnofficial": "false"},
        )
        if resp.status_code != 200:
            return None
        data = resp.json()
        if data.get("status") != "OK":
            return None
    except Exception:
        return None

    all_rows = data["result"].get("rows", [])
    participants = []
    handles_list = []

    for row in all_rows:
        party = row.get("party", {})
        if party.get("participantType") != "CONTESTANT":
            continue
        members = party.get("members", [])
        if not members:
            continue
        h = members[0]["handle"]
        participants.append({"handle": h, "rank": row["rank"], "rating": 1400})
        handles_list.append(h)

    if not participants:
        return None

    # Batch-fetch ratings (500 handles per request)
    BATCH = 500
    for i in range(0, len(handles_list), BATCH):
        batch = handles_list[i : i + BATCH]
        try:
            info = await client.get(
                f"{BASE}/user.info",
                params={"handles": ";".join(batch)},
            )
            if info.status_code == 200:
                idata = info.json()
                if idata.get("status") == "OK":
                    rmap = {u["handle"]: u.get("rating", 1400) for u in idata["result"]}
                    for p in participants:
                        if p["handle"] in rmap:
                            p["rating"] = rmap[p["handle"]]
        except Exception:
            pass  # keep default 1500 for failed batches

        # Rate-limit courtesy
        if i + BATCH < len(handles_list):
            await asyncio.sleep(0.3)

    return participants


def _elo_predict(participants, user_idx):
    """
    Compute predicted rating using the full CF Elo formula (same as Carrot).

    Algorithm (per Mike Mirzayanov / Carrot):
      1. For each contestant:
         seed(R) = 1 + Σ_{j≠i} 1/(1 + 10^((R − rⱼ)/400))
         midRank = √(actual_rank × seed(current_rating))
         Find R* such that seed(R*) = midRank   (binary search)
         delta = (R* − current_rating) / 2
      2. adjustDeltas — inflation correction:
         a) inc = floor(-sum(all_deltas) / n) - 1;  add inc to all deltas
         b) For top 4*sqrt(n) users (by rating), compute inc2 to make
            their delta sum ≈ 0;  add inc2 to ALL deltas (clamped to [-10, 0])
    """
    n = len(participants)
    all_ratings = [p["rating"] for p in participants]

    def get_seed_for(idx):
        """Expected rank for participant idx."""
        rating = all_ratings[idx]
        s = 1.0
        for j in range(n):
            if j == idx:
                continue
            s += 1.0 / (1.0 + 10.0 ** ((rating - all_ratings[j]) / 400.0))
        return s

    def find_r_star(idx):
        """Binary search for R* where seed(R*) = midRank for participant idx."""
        rating = all_ratings[idx]
        rank = participants[idx]["rank"]
        seed = get_seed_for(idx)
        mid_rank = math.sqrt(rank * seed)

        lo, hi = 1, 8000
        while hi - lo > 1:
            mid_val = (lo + hi) // 2
            # Compute seed at mid_val, excluding self
            s = 1.0
            for j in range(n):
                if j == idx:
                    continue
                s += 1.0 / (1.0 + 10.0 ** ((mid_val - all_ratings[j]) / 400.0))
            if s < mid_rank:
                hi = mid_val
            else:
                lo = mid_val
        return lo

    # Step 1: Compute raw deltas for ALL participants
    deltas = []
    for i in range(n):
        r_star = find_r_star(i)
        delta = math.trunc((r_star - all_ratings[i]) / 2)
        deltas.append(delta)

    # Step 2a: Global inflation correction
    delta_sum = sum(deltas)
    inc = math.trunc(-delta_sum / n) - 1  # Math.trunc(-sum/n) - 1, matching Carrot
    for i in range(n):
        deltas[i] += inc

    # Step 2b: Top-user zero-sum correction
    # Sort indices by rating descending
    sorted_indices = sorted(range(n), key=lambda i: all_ratings[i], reverse=True)
    zero_sum_count = min(4 * round(math.sqrt(n)), n)
    top_delta_sum = sum(deltas[sorted_indices[i]] for i in range(zero_sum_count))
    inc2 = min(max(math.trunc(-top_delta_sum / zero_sum_count), -10), 0)
    for i in range(n):
        deltas[i] += inc2

    # Extract user's adjusted delta
    user_delta = deltas[user_idx]
    user_rating = all_ratings[user_idx]
    predicted = user_rating + user_delta

    return {
        "old_rating": user_rating,
        "predicted_rating": predicted,
        "predicted_change": user_delta,
        "rank": participants[user_idx]["rank"],
    }
