from pydantic import BaseModel
from typing import Optional


class CodeforcesProfile(BaseModel):
    platform: str = "Codeforces"
    handle: str
    rating: int = 0
    maxRating: int = 0
    rank: str = "Unrated"
    maxRank: str = "Unrated"
    totalSolved: int = 0
    contestsParticipated: int = 0
    contributions: int = 0
    avatar: Optional[str] = None


class CodeforcesRatingChange(BaseModel):
    contestId: int
    contestName: str
    rank: int
    oldRating: int
    newRating: int
    timestamp: int


class LeetCodeProfile(BaseModel):
    platform: str = "LeetCode"
    handle: str
    totalSolved: int = 0
    totalQuestions: int = 0
    easySolved: int = 0
    easyTotal: int = 0
    mediumSolved: int = 0
    mediumTotal: int = 0
    hardSolved: int = 0
    hardTotal: int = 0
    ranking: int = 0
    contestRating: int = 0
    contestsAttended: int = 0
    contestBadge: Optional[str] = None
    reputation: int = 0
    avatar: Optional[str] = None


class CodeChefProfile(BaseModel):
    platform: str = "CodeChef"
    handle: str
    rating: int = 0
    maxRating: int = 0
    stars: int = 0
    globalRank: Optional[int] = None
    countryRank: Optional[int] = None
    totalSolved: int = 0
    contestsParticipated: int = 0


class AtCoderProfile(BaseModel):
    platform: str = "AtCoder"
    handle: str
    rating: int = 0
    maxRating: int = 0
    rank: str = ""
    totalSolved: int = 0
    contestsParticipated: int = 0


class SubmissionStats(BaseModel):
    date: str  # YYYY-MM-DD
    count: int


class AggregatedProfile(BaseModel):
    codeforces: Optional[CodeforcesProfile] = None
    leetcode: Optional[LeetCodeProfile] = None
    codechef: Optional[CodeChefProfile] = None
    atcoder: Optional[AtCoderProfile] = None
    totalSolved: int = 0
    totalContests: int = 0
    bestRating: int = 0
