import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import recommendations, health, telemetry, local_explorer, songs, user_preferences, reports
from app.db.database import engine, Base, SessionLocal
from app.ingestion.ingestion_service import IngestionService

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("MusicMirrorBackend")

# Initialize database schema
Base.metadata.create_all(bind=engine)

# Auto-seed database if empty on startup
try:
    db = SessionLocal()
    song_count = db.query(songs.Song).count()
    if song_count == 0:
        logger.info("Database is empty. Running initial idempotent seed dataset...")
        res = IngestionService.seed_database(db)
        logger.info(f"Initial seed complete: {res['added']} songs added.")
    db.close()
except Exception as e:
    logger.warning(f"Auto-seed check warning: {e}")

app = FastAPI(title=settings.PROJECT_NAME, version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/health", tags=["Health & Observability"])
app.include_router(songs.router, prefix="/api/v2/songs", tags=["Songs Catalog & Metadata"])
app.include_router(user_preferences.router, prefix="/api/v2/user/preferences", tags=["User Music Preferences"])
app.include_router(reports.router, prefix="/api/v2/reports", tags=["Playback Self-Healing & Reports"])
app.include_router(recommendations.router, prefix="/recommend", tags=["Recommendations"])
app.include_router(telemetry.router, prefix="/telemetry", tags=["Telemetry"])
app.include_router(local_explorer.router, prefix="/local-explorer", tags=["Local Explorer"])


@app.get("/", tags=["Root"])
async def root():
    return {
        "service": "Music Mirror API",
        "version": "2.0.0",
        "status": "ok",
        "docs": "/docs",
        "health": "/health",
        "songs_api": "/api/v2/songs",
        "user_preferences_api": "/api/v2/user/preferences",
    }
