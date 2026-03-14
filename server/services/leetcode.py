"""
LeetCode GraphQL Service
────────────────────────
LeetCode has no official public REST API. We use their public GraphQL endpoint.

Endpoint: POST https://leetcode.com/graphql

Queries used:
  1. matchedUser(username)       → profile, solved counts, badges, ranking
  2. userContestRanking(username) → contest rating, attended count
  3. recentAcSubmissionList      → recent AC submissions
  4. userProfileCalendar         → submission calendar (heatmap data)
"""

import httpx
from typing import Optional
from schemas.models import LeetCodeProfile

GQL_URL = "https://leetcode.com/graphql"

HEADERS = {
    "Content-Type": "application/json",
    "Referer": "https://leetcode.com",
}


async def _query(payload: dict) -> Optional[dict]:
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(GQL_URL, json=payload, headers=HEADERS)
        if resp.status_code != 200:
            return None
        return resp.json().get("data")


async def get_profile(handle: str) -> Optional[LeetCodeProfile]:
    """Fetch complete LeetCode profile via GraphQL."""

    # ── Problem stats ──
    stats_query = {
        "query": """
        query getUserProfile($username: String!) {
            matchedUser(username: $username) {
                username
                profile {
                    ranking
                    reputation
                    userAvatar
                }
                submitStatsGlobal {
                    acSubmissionNum {
                        difficulty
                        count
                    }
                }
            }
            allQuestionsCount {
                difficulty
                count
            }
        }
        """,
        "variables": {"username": handle},
    }

    # ── Contest info ──
    contest_query = {
        "query": """
        query userContestRankingInfo($username: String!) {
            userContestRanking(username: $username) {
                rating
                attendedContestsCount
                globalRanking
                badge {
                    name
                }
            }
        }
        """,
        "variables": {"username": handle},
    }

    stats_data = await _query(stats_query)
    contest_data = await _query(contest_query)

    if not stats_data or not stats_data.get("matchedUser"):
        return None

    user = stats_data["matchedUser"]
    profile = user.get("profile", {})
    ac_stats = user.get("submitStatsGlobal", {}).get("acSubmissionNum", [])
    all_counts = stats_data.get("allQuestionsCount", [])

    # Parse difficulty counts
    solved_map = {s["difficulty"]: s["count"] for s in ac_stats}
    total_map = {s["difficulty"]: s["count"] for s in all_counts}

    # Contest
    contest = {}
    if contest_data and contest_data.get("userContestRanking"):
        contest = contest_data["userContestRanking"]

    return LeetCodeProfile(
        handle=handle,
        totalSolved=solved_map.get("All", 0),
        totalQuestions=total_map.get("All", 0),
        easySolved=solved_map.get("Easy", 0),
        easyTotal=total_map.get("Easy", 0),
        mediumSolved=solved_map.get("Medium", 0),
        mediumTotal=total_map.get("Medium", 0),
        hardSolved=solved_map.get("Hard", 0),
        hardTotal=total_map.get("Hard", 0),
        ranking=profile.get("ranking", 0),
        contestRating=int(contest.get("rating", 0)),
        contestsAttended=contest.get("attendedContestsCount", 0),
        contestBadge=(contest.get("badge") or {}).get("name"),
        reputation=profile.get("reputation", 0),
        avatar=profile.get("userAvatar"),
    )


async def get_submission_calendar(handle: str) -> dict:
    """Fetch submission heatmap data (unix_timestamp → count)."""
    query = {
        "query": """
        query userProfileCalendar($username: String!) {
            matchedUser(username: $username) {
                userCalendar {
                    submissionCalendar
                }
            }
        }
        """,
        "variables": {"username": handle},
    }
    data = await _query(query)
    if not data or not data.get("matchedUser"):
        return {}

    import json
    cal_str = data["matchedUser"]["userCalendar"]["submissionCalendar"]
    if not cal_str:
        return {}
    return json.loads(cal_str)  # {unix_timestamp_str: count}


async def get_tag_stats(handle: str) -> list[dict]:
    """Fetch topic-wise solved count via tagProblemCounts."""
    query = {
        "query": """
        query skillStats($username: String!) {
            matchedUser(username: $username) {
                tagProblemCounts {
                    advanced { tagName tagSlug problemsSolved }
                    intermediate { tagName tagSlug problemsSolved }
                    fundamental { tagName tagSlug problemsSolved }
                }
            }
        }
        """,
        "variables": {"username": handle},
    }
    data = await _query(query)
    if not data or not data.get("matchedUser"):
        return []

    tags = data["matchedUser"].get("tagProblemCounts", {})
    result = []
    for level in ["fundamental", "intermediate", "advanced"]:
        for t in tags.get(level, []):
            if t["problemsSolved"] > 0:
                result.append({
                    "tagName": t["tagName"],
                    "problemsSolved": t["problemsSolved"],
                })

    # Sort by count descending
    result.sort(key=lambda x: x["problemsSolved"], reverse=True)
    return result


async def get_contest_history(handle: str) -> list[dict]:
    """Fetch contest rating history."""
    query = {
        "query": """
        query userContestRankingHistory($username: String!) {
            userContestRankingHistory(username: $username) {
                attended
                rating
                ranking
                contest {
                    title
                    startTime
                }
            }
        }
        """,
        "variables": {"username": handle},
    }
    data = await _query(query)
    if not data or not data.get("userContestRankingHistory"):
        return []

    return [
        {
            "contestName": r["contest"]["title"],
            "rating": round(r["rating"]),
            "ranking": r["ranking"],
            "timestamp": r["contest"]["startTime"],
        }
        for r in data["userContestRankingHistory"]
        if r.get("attended")
    ]
