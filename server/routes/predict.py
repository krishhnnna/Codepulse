"""
Rating prediction routes.
"""

from fastapi import APIRouter
from services.cf_predict import get_prediction as cf_prediction
from services.lc_predict import get_prediction as lc_prediction

router = APIRouter(prefix="/predict", tags=["predict"])


@router.get("/codeforces/{handle}")
async def predict_cf(handle: str):
    """
    Predict Codeforces rating for `handle` if there's a recent unrated contest.
    Returns null if no prediction available (already rated or didn't participate).
    """
    result = await cf_prediction(handle)
    if result is None:
        return {"prediction": None}
    return {"prediction": result}


@router.get("/leetcode/{handle}")
async def predict_lc(handle: str):
    """
    Predict LeetCode rating for `handle` if there's a recent unrated contest.
    Returns null if no prediction available.
    """
    result = await lc_prediction(handle)
    if result is None:
        return {"prediction": None}
    return {"prediction": result}


@router.get("/debug")
async def predict_debug():
    """Diagnostic: test LC API connectivity from this server."""
    import httpx
    import time

    results = {}

    headers_gql = {
        "Content-Type": "application/json",
        "Referer": "https://leetcode.com",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    }
    headers_rest = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Referer": "https://leetcode.com",
        "Accept": "application/json",
    }

    async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
        # Test 1: GraphQL allContests
        try:
            query = {"query": "query { allContests { title titleSlug startTime duration } }"}
            resp = await client.post("https://leetcode.com/graphql", json=query, headers=headers_gql)
            contests = resp.json().get("data", {}).get("allContests", [])
            now = time.time()
            recent = []
            for c in contests[:20]:
                end = c["startTime"] + c["duration"]
                if now < end:
                    continue
                age_h = (now - end) / 3600
                if age_h > 6:
                    break
                recent.append({"title": c["title"], "age_hours": round(age_h, 1)})
            results["gql_status"] = resp.status_code
            results["recent_contests"] = recent
            results["total_contests_fetched"] = len(contests)
        except Exception as e:
            results["gql_error"] = str(e)

        # Test 2: REST ranking API
        try:
            resp2 = await client.get(
                "https://leetcode.com/contest/api/ranking/biweekly-contest-178/",
                params={"pagination": 1, "region": "global"},
                headers=headers_rest,
            )
            results["rest_status"] = resp2.status_code
            if resp2.status_code == 200:
                data = resp2.json()
                results["rest_user_num"] = data.get("user_num", 0)
                results["rest_is_past"] = data.get("is_past")
            else:
                results["rest_body"] = resp2.text[:200]
        except Exception as e:
            results["rest_error"] = str(e)

        # Test 3: GraphQL user history
        try:
            query3 = {
                "query": """query ($u: String!) {
                    userContestRanking(username: $u) { rating attendedContestsCount }
                }""",
                "variables": {"username": "Hackker_69"}
            }
            resp3 = await client.post("https://leetcode.com/graphql", json=query3, headers=headers_gql)
            results["user_gql_status"] = resp3.status_code
            results["user_gql_data"] = resp3.json().get("data")
        except Exception as e:
            results["user_gql_error"] = str(e)

    return results
