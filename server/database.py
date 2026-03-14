"""
Database connection & config
─────────────────────────────
Uses motor (async MongoDB driver) with MongoDB Atlas.
Reads config from .env file.
"""

import os
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient

# ── Load env (simple, no dotenv dependency needed — we'll load manually) ──
_env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(_env_path):
    with open(_env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                os.environ.setdefault(key.strip(), value.strip())

MONGO_URI = os.getenv("MONGO_URI", "")
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", "168"))
BREVO_API_KEY = os.getenv("BREVO_API_KEY", "")

# ── MongoDB client (lazy init) ──
_client: Optional[AsyncIOMotorClient] = None
_db = None


def get_db():
    """Get the database instance, creating the client if needed."""
    global _client, _db
    if _db is None:
        if not MONGO_URI:
            raise RuntimeError("MONGO_URI not set in .env")
        _client = AsyncIOMotorClient(MONGO_URI)
        _db = _client["codepulse"]
    return _db


async def close_db():
    """Close the MongoDB connection."""
    global _client, _db
    if _client:
        _client.close()
        _client = None
        _db = None
