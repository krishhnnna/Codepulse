"""
Handle Verification Service
────────────────────────────
Verifies that a user actually owns a platform handle by checking
for a unique verification code in their profile bio/organization.

Supported platforms:
  - Codeforces  → organization field (user.info API)
  - LeetCode    → aboutMe field (GraphQL)
  - CodeChef    → bio on profile page (scraping)
  - AtCoder     → Bio row in profile table (scraping)
"""

import random
import string
from datetime import datetime, timezone
from typing import Optional

import httpx
from bs4 import BeautifulSoup

from database import get_db


# ──────────── Code generation ────────────

def generate_verification_code() -> str:
    """Generate a short unique code like 'cp_a8f3x9'."""
    chars = string.ascii_lowercase + string.digits
    suffix = "".join(random.choices(chars, k=6))
    return f"cp_{suffix}"


# ──────────── DB operations ────────────

async def start_verification(email: str, platform: str, handle: str) -> str:
    """Generate and store a verification code. Returns the code."""
    db = get_db()
    code = generate_verification_code()

    await db.verifications.update_one(
        {"email": email, "platform": platform},
        {"$set": {
            "handle": handle,
            "code": code,
            "verified": False,
            "created_at": datetime.now(timezone.utc),
        }},
        upsert=True,
    )
    return code


async def get_pending_verification(email: str, platform: str) -> Optional[dict]:
    """Get the pending verification record."""
    db = get_db()
    return await db.verifications.find_one({
        "email": email,
        "platform": platform,
        "verified": False,
    })


async def mark_verified(email: str, platform: str, handle: str):
    """Mark a handle as verified."""
    db = get_db()
    await db.verifications.update_one(
        {"email": email, "platform": platform},
        {"$set": {"verified": True, "verified_at": datetime.now(timezone.utc)}},
    )
    # Also store in the user's verified_handles
    await db.users.update_one(
        {"email": email},
        {"$set": {f"verified_handles.{platform}": handle}},
    )


async def get_verified_handles(email: str) -> dict:
    """Get all verified handles for a user."""
    db = get_db()
    user = await db.users.find_one({"email": email})
    if not user:
        return {}
    return user.get("verified_handles", {})


async def is_handle_claimed(platform: str, handle: str, exclude_email: str = None) -> bool:
    """Check if this handle is already verified by another user."""
    db = get_db()
    query = {f"verified_handles.{platform}": handle}
    if exclude_email:
        query["email"] = {"$ne": exclude_email}
    existing = await db.users.find_one(query)
    return existing is not None


# ──────────── Bio fetching per platform ────────────

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
}


async def fetch_codeforces_bio(handle: str) -> Optional[str]:
    """
    Codeforces has no bio field. We use the 'organization' field
    from user.info API. User adds verification code to their organization.
    """
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                "https://codeforces.com/api/user.info",
                params={"handles": handle},
            )
            if resp.status_code != 200:
                return None
            data = resp.json()
            if data.get("status") != "OK" or not data.get("result"):
                return None
            user = data["result"][0]
            # Combine fields where user might put the code
            parts = []
            if user.get("organization"):
                parts.append(user["organization"])
            if user.get("firstName"):
                parts.append(user["firstName"])
            if user.get("lastName"):
                parts.append(user["lastName"])
            return " ".join(parts)
    except Exception:
        return None


async def fetch_leetcode_bio(handle: str) -> Optional[str]:
    """Fetch profile fields from LeetCode GraphQL — checks websites, aboutMe, company, school."""
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                "https://leetcode.com/graphql",
                headers={
                    "Content-Type": "application/json",
                    "Referer": "https://leetcode.com",
                },
                json={
                    "query": """
                    query getUserProfile($username: String!) {
                        matchedUser(username: $username) {
                            profile {
                                aboutMe
                                websites
                                company
                                school
                            }
                        }
                    }
                    """,
                    "variables": {"username": handle},
                },
            )
            if resp.status_code != 200:
                return None
            data = resp.json()
            user = data.get("data", {}).get("matchedUser")
            if not user:
                return None
            profile = user.get("profile", {})
            # Combine all readable fields into one string to search
            parts = []
            if profile.get("aboutMe"):
                parts.append(profile["aboutMe"])
            for url in (profile.get("websites") or []):
                parts.append(url)
            if profile.get("company"):
                parts.append(profile["company"])
            if profile.get("school"):
                parts.append(profile["school"])
            return " ".join(parts)
    except Exception:
        return None


async def fetch_codechef_bio(handle: str) -> Optional[str]:
    """Scrape CodeChef profile page for the display name (Your Name field)."""
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(
                f"https://www.codechef.com/users/{handle}",
                headers=HEADERS,
            )
            if resp.status_code != 200:
                return None

            soup = BeautifulSoup(resp.text, "html.parser")

            parts = []

            # Display name from h1 — maps to "Your Name" on General tab
            h1 = soup.find("h1")
            if h1:
                parts.append(h1.get_text(strip=True))

            # Also check Organisation as secondary
            for label_el in soup.find_all("label"):
                text = label_el.get_text(strip=True).lower()
                if "organisation" in text:
                    sibling = label_el.find_next_sibling("span")
                    if sibling:
                        parts.append(sibling.get_text(strip=True))

            return " ".join(parts) if parts else ""
    except Exception:
        return None


async def fetch_atcoder_bio(handle: str) -> Optional[str]:
    """Scrape AtCoder profile page for Bio row in the dl-table."""
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(
                f"https://atcoder.jp/users/{handle}",
                headers=HEADERS,
            )
            if resp.status_code != 200:
                return None

            soup = BeautifulSoup(resp.text, "html.parser")

            # Look for "Bio" row in the profile table
            for tr in soup.select("table.dl-table tr"):
                th = tr.find("th")
                td = tr.find("td")
                if not th or not td:
                    continue
                label = th.get_text(strip=True).lower()
                if label == "bio":
                    return td.get_text(strip=True)
                if label == "affiliation":
                    # Also check affiliation as fallback
                    return td.get_text(strip=True)

            return ""
    except Exception:
        return None


# ──────────── Main verify function ────────────

BIO_FETCHERS = {
    "codeforces": fetch_codeforces_bio,
    "leetcode": fetch_leetcode_bio,
    "codechef": fetch_codechef_bio,
    "atcoder": fetch_atcoder_bio,
}

# Platform-specific instructions for where to put the code
VERIFICATION_INSTRUCTIONS = {
    "codeforces": {
        "field": "Organization",
        "steps": [
            "Go to codeforces.com → Settings → Social",
            "Paste the code in the 'Organization' field",
            "Click Save",
            "Come back and click Verify",
        ],
        "url": "https://codeforces.com/settings/social",
    },
    "leetcode": {
        "field": "Website",
        "steps": [
            "Go to leetcode.com → Profile → Edit Profile",
            "Add the link below in the 'Website' field",
            "Click Save",
            "Come back and click Verify",
        ],
        "url": "https://leetcode.com/profile/",
        "code_as_url": True,
    },
    "codechef": {
        "field": "Your Name",
        "steps": [
            "Go to CodeChef → Edit Profile → General tab",
            "Add the code to the 'Your Name' field",
            "Click Save",
            "Come back and click Verify",
        ],
        "url": "https://www.codechef.com/users/{handle}/edit",
    },
    "atcoder": {
        "field": "Affiliation / Bio",
        "steps": [
            "Go to atcoder.jp → Settings → General",
            "Paste the code in the 'Affiliation' or 'Bio' field",
            "Click Save",
            "Come back and click Verify",
        ],
        "url": "https://atcoder.jp/settings",
    },
}


async def check_verification(email: str, platform: str) -> dict:
    """
    Check if the verification code is present in the user's bio.
    Returns {success: bool, message: str}
    """
    record = await get_pending_verification(email, platform)
    if not record:
        return {"success": False, "message": "No pending verification found. Start verification first."}

    handle = record["handle"]
    code = record["code"]

    # Check if handle is already claimed by someone else
    if await is_handle_claimed(platform, handle, exclude_email=email):
        return {"success": False, "message": f"This {platform} handle is already verified by another user."}

    # Fetch bio
    fetcher = BIO_FETCHERS.get(platform)
    if not fetcher:
        return {"success": False, "message": f"Unsupported platform: {platform}"}

    bio = await fetcher(handle)

    if bio is None:
        return {"success": False, "message": f"Could not fetch profile for '{handle}'. Check if the handle is correct."}

    if code in bio:
        await mark_verified(email, platform, handle)
        return {"success": True, "message": f"✓ {platform} handle '{handle}' verified successfully!"}
    else:
        return {
            "success": False,
            "message": f"Code not found in your {platform} profile. Make sure you saved '{code}' in the {VERIFICATION_INSTRUCTIONS[platform]['field']} field.",
        }
