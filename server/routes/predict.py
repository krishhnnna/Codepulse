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
