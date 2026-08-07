from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import recommendations, health, telemetry, local_explorer

app = FastAPI(title=settings.PROJECT_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/health", tags=["Health"])
app.include_router(recommendations.router, prefix="/recommend", tags=["Recommendations"])
app.include_router(telemetry.router, prefix="/telemetry", tags=["Telemetry"])
app.include_router(local_explorer.router, prefix="/local-explorer", tags=["Local Explorer"])


