"""
Auth API Routes
───────────────
POST /api/auth/signup          → Send OTP for new account
POST /api/auth/signup/verify   → Verify OTP & create account
POST /api/auth/login           → Send OTP for existing account
POST /api/auth/login/verify    → Verify OTP & login
GET  /api/auth/me              → Get current user (JWT required)
PUT  /api/auth/me              → Update user handles/profile (JWT required)
"""

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, EmailStr
from typing import Optional

from services.auth import (
    send_otp, verify_otp,
    create_user, get_user_by_email, get_user_by_username,
    update_user_data, create_token, decode_token,
)
from services.verification import (
    start_verification, check_verification, get_verified_handles,
    is_handle_claimed, VERIFICATION_INSTRUCTIONS,
)

router = APIRouter(prefix="/auth")


# ──────────── Request models ────────────

class SignupRequest(BaseModel):
    email: EmailStr
    username: str

class OTPVerifyRequest(BaseModel):
    email: EmailStr
    otp: str
    username: Optional[str] = None  # only for signup

class LoginRequest(BaseModel):
    email: EmailStr

class UpdateUserRequest(BaseModel):
    handles: Optional[dict] = None
    profile: Optional[dict] = None

class VerifyHandleStartRequest(BaseModel):
    platform: str
    handle: str

class VerifyHandleCheckRequest(BaseModel):
    platform: str


# ──────────── Helper: get current user from token ────────────

async def _get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ", 1)[1]
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = await get_user_by_email(payload["sub"])
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ──────────── Signup ────────────

@router.post("/signup")
async def signup(req: SignupRequest):
    """Send OTP for new account registration."""
    # Check if email already exists
    existing = await get_user_by_email(req.email)
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered. Please login instead.")

    # Check username uniqueness
    existing_username = await get_user_by_username(req.username)
    if existing_username:
        raise HTTPException(status_code=409, detail="Username already taken.")

    # Validate username
    if len(req.username) < 3 or len(req.username) > 20:
        raise HTTPException(status_code=400, detail="Username must be 3-20 characters.")
    if not req.username.replace("_", "").replace("-", "").isalnum():
        raise HTTPException(status_code=400, detail="Username can only contain letters, numbers, _ and -")

    ok = await send_otp(req.email)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to send OTP. Try again.")
    return {"message": "OTP sent to your email"}


@router.post("/signup/verify")
async def signup_verify(req: OTPVerifyRequest):
    """Verify OTP and create account."""
    if not req.username:
        raise HTTPException(status_code=400, detail="Username is required for signup")

    valid = await verify_otp(req.email, req.otp)
    if not valid:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    # Double-check email/username not taken (race condition)
    if await get_user_by_email(req.email):
        raise HTTPException(status_code=409, detail="Email already registered")
    if await get_user_by_username(req.username):
        raise HTTPException(status_code=409, detail="Username already taken")

    user = await create_user(req.email, req.username)
    token = create_token(req.email, req.username)

    return {
        "token": token,
        "user": {
            "email": user["email"],
            "username": user["username"],
            "handles": user.get("handles", {}),
            "profile": user.get("profile", {}),
            "verified_handles": user.get("verified_handles", {}),
        },
    }


# ──────────── Login ────────────

@router.post("/login")
async def login(req: LoginRequest):
    """Send OTP for existing account login."""
    existing = await get_user_by_email(req.email)
    if not existing:
        raise HTTPException(status_code=404, detail="No account found with this email. Please signup first.")

    ok = await send_otp(req.email)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to send OTP. Try again.")
    return {"message": "OTP sent to your email"}


@router.post("/login/verify")
async def login_verify(req: OTPVerifyRequest):
    """Verify OTP and login."""
    valid = await verify_otp(req.email, req.otp)
    if not valid:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    user = await get_user_by_email(req.email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    username = user.get("username", user["email"].split("@")[0])
    token = create_token(user["email"], username)

    return {
        "token": token,
        "user": {
            "email": user["email"],
            "username": username,
            "handles": user.get("handles", {}),
            "profile": user.get("profile", {}),
            "verified_handles": user.get("verified_handles", {}),
        },
    }


# ──────────── Protected routes ────────────

@router.get("/me")
async def get_me(authorization: str = Header(None)):
    """Get current user profile."""
    user = await _get_current_user(authorization)
    return {
        "email": user["email"],
        "username": user.get("username", user["email"].split("@")[0]),
        "handles": user.get("handles", {}),
        "profile": user.get("profile", {}),
        "verified_handles": user.get("verified_handles", {}),
    }


@router.put("/me")
async def update_me(req: UpdateUserRequest, authorization: str = Header(None)):
    """Update user handles and/or profile info. Only verified handles are accepted."""
    user = await _get_current_user(authorization)

    # If handles are being updated, only allow verified ones
    if req.handles is not None:
        verified = user.get("verified_handles", {})
        filtered_handles = {}
        for platform, handle in req.handles.items():
            if not handle or not handle.strip():
                continue  # skip empty
            # Check if this handle is verified by this user
            if verified.get(platform) == handle.strip():
                filtered_handles[platform] = handle.strip()
            # else: silently ignore unverified handles
        req.handles = filtered_handles

        # Clean up verified_handles: remove platforms that are no longer in handles
        from database import get_db
        db = get_db()
        new_verified = {p: h for p, h in verified.items() if p in filtered_handles and filtered_handles[p] == h}
        await db.users.update_one(
            {"email": user["email"]},
            {"$set": {"verified_handles": new_verified}},
        )
        # Also clean up verification records for removed platforms
        removed_platforms = [p for p in verified if p not in new_verified]
        if removed_platforms:
            await db.verifications.delete_many({
                "email": user["email"],
                "platform": {"$in": removed_platforms},
            })

    updated = await update_user_data(user["email"], req.handles, req.profile)
    return {
        "email": updated["email"],
        "username": updated["username"],
        "handles": updated.get("handles", {}),
        "profile": updated.get("profile", {}),
        "verified_handles": updated.get("verified_handles", {}),
    }


# ──────────── Handle Verification ────────────

@router.post("/verify-handle/start")
async def verify_handle_start(req: VerifyHandleStartRequest, authorization: str = Header(None)):
    """Start handle verification — generate a code for the user to add to their bio."""
    user = await _get_current_user(authorization)

    if req.platform not in VERIFICATION_INSTRUCTIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported platform: {req.platform}")

    if not req.handle or not req.handle.strip():
        raise HTTPException(status_code=400, detail="Handle cannot be empty")

    handle = req.handle.strip()

    # Check if this handle is already claimed by another user
    if await is_handle_claimed(req.platform, handle, exclude_email=user["email"]):
        raise HTTPException(
            status_code=409,
            detail=f"This {req.platform} handle is already verified by another user."
        )

    code = await start_verification(user["email"], req.platform, handle)
    instructions = VERIFICATION_INSTRUCTIONS[req.platform]

    # For platforms that need URL-formatted codes (e.g. LeetCode website field)
    display_code = code
    if instructions.get("code_as_url"):
        display_code = f"https://codepulse.dev/v/{code}"

    # Build the URL — some platforms have {handle} placeholder
    url = instructions["url"].replace("{handle}", handle)

    return {
        "code": code,
        "display_code": display_code,
        "platform": req.platform,
        "handle": handle,
        "field": instructions["field"],
        "steps": instructions["steps"],
        "url": url,
    }


@router.post("/verify-handle/check")
async def verify_handle_check(req: VerifyHandleCheckRequest, authorization: str = Header(None)):
    """Check if the verification code is in the user's platform bio."""
    user = await _get_current_user(authorization)

    if req.platform not in VERIFICATION_INSTRUCTIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported platform: {req.platform}")

    result = await check_verification(user["email"], req.platform)
    return result


@router.get("/verified-handles")
async def get_my_verified_handles(authorization: str = Header(None)):
    """Get all verified handles for the current user."""
    user = await _get_current_user(authorization)
    return {"verified_handles": user.get("verified_handles", {})}
