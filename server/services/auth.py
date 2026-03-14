"""
Auth Service — OTP via Brevo + JWT tokens
──────────────────────────────────────────
Flow:
  Signup:  email + username → generate OTP → send via Brevo → verify OTP → create user → JWT
  Login:   email → generate OTP → send via Brevo → verify OTP → JWT

OTPs are stored in MongoDB 'otps' collection with 10 min TTL.
"""

import random
import string
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx
from jose import jwt

from database import get_db, JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRE_HOURS, BREVO_API_KEY


# ──────────── OTP helpers ────────────

def _generate_otp(length: int = 6) -> str:
    return "".join(random.choices(string.digits, k=length))


async def send_otp(email: str) -> bool:
    """Generate OTP, store in DB, and send via Brevo transactional email."""
    db = get_db()
    otp = _generate_otp()
    expires = datetime.now(timezone.utc) + timedelta(minutes=10)

    # Upsert OTP (one active OTP per email)
    await db.otps.update_one(
        {"email": email},
        {"$set": {"otp": otp, "expires": expires, "attempts": 0}},
        upsert=True,
    )

    # Send via Brevo Transactional Email API
    if not BREVO_API_KEY:
        # Dev mode — print OTP to console
        print(f"[DEV] OTP for {email}: {otp}")
        return True

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                "https://api.brevo.com/v3/smtp/email",
                headers={
                    "api-key": BREVO_API_KEY,
                    "Content-Type": "application/json",
                },
                json={
                    "sender": {"name": "CodePulse", "email": "wommansafety@gmail.com"},
                    "to": [{"email": email}],
                    "subject": "Your CodePulse verification code",
                    "htmlContent": f"""
                    <div style="font-family: Inter, sans-serif; max-width: 400px; margin: 0 auto; padding: 32px;">
                        <h2 style="color: #18181b; margin-bottom: 8px;">Verify your email</h2>
                        <p style="color: #71717a; font-size: 14px;">Enter this code to sign in to CodePulse:</p>
                        <div style="background: #f4f4f5; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
                            <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #6366f1;">{otp}</span>
                        </div>
                        <p style="color: #a1a1aa; font-size: 12px;">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
                    </div>
                    """,
                },
            )
            return resp.status_code in (200, 201)
    except Exception as e:
        print(f"[Brevo Error] {e}")
        return False


async def verify_otp(email: str, otp: str) -> bool:
    """Verify OTP for an email. Returns True if valid."""
    db = get_db()
    record = await db.otps.find_one({"email": email})
    if not record:
        return False

    # Check expiry
    expires = record["expires"]
    now = datetime.now(timezone.utc)
    # Make both tz-aware for comparison
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if now > expires:
        await db.otps.delete_one({"email": email})
        return False

    # Check attempts (max 5)
    if record.get("attempts", 0) >= 5:
        await db.otps.delete_one({"email": email})
        return False

    if record["otp"] != otp:
        await db.otps.update_one({"email": email}, {"$inc": {"attempts": 1}})
        return False

    # Valid — delete OTP
    await db.otps.delete_one({"email": email})
    return True


# ──────────── User CRUD ────────────

async def create_user(email: str, username: str) -> dict:
    """Create a new user in the database."""
    db = get_db()
    now = datetime.now(timezone.utc)
    user = {
        "email": email,
        "username": username,
        "handles": {},
        "profile": {},
        "createdAt": now,
        "updatedAt": now,
    }
    result = await db.users.insert_one(user)
    user["_id"] = str(result.inserted_id)
    return user


async def get_user_by_email(email: str) -> Optional[dict]:
    db = get_db()
    user = await db.users.find_one({"email": email})
    if user:
        user["_id"] = str(user["_id"])
    return user


async def get_user_by_username(username: str) -> Optional[dict]:
    db = get_db()
    user = await db.users.find_one({"username": username})
    if user:
        user["_id"] = str(user["_id"])
    return user


async def update_user_data(email: str, handles: dict = None, profile: dict = None) -> Optional[dict]:
    """Update user's handles and/or profile info."""
    db = get_db()
    update = {"$set": {"updatedAt": datetime.now(timezone.utc)}}
    if handles is not None:
        update["$set"]["handles"] = handles
    if profile is not None:
        update["$set"]["profile"] = profile

    await db.users.update_one({"email": email}, update)
    return await get_user_by_email(email)


# ──────────── JWT ────────────

def create_token(email: str, username: str) -> str:
    """Create a JWT token for authenticated user."""
    payload = {
        "sub": email,
        "username": username,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    """Decode and verify a JWT token."""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except Exception:
        return None
