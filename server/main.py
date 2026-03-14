from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from routes.platforms import router as platforms_router
from routes.auth import router as auth_router
from routes.predict import router as predict_router
from database import close_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await close_db()


app = FastAPI(
    title="CodeProfile Aggregator API",
    version="1.0.0",
    description="Aggregates competitive programming profiles from LeetCode, Codeforces, CodeChef & AtCoder",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for production (Vercel -> Render)
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(platforms_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(predict_router, prefix="/api")


@app.get("/")
async def root():
    return {"status": "ok", "message": "CodeProfile Aggregator API"}
