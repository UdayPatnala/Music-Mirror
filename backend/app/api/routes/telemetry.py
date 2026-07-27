from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel
from app.services.cognitive_engine import CognitiveEngine

router = APIRouter()

class TelemetryEvent(BaseModel):
    event: str
    song_id: str | None = None
    emotion: str | None = None
    session_time: int | None = None

@router.post("/")
async def receive_telemetry(event: TelemetryEvent, background_tasks: BackgroundTasks):
    background_tasks.add_task(CognitiveEngine.record_behavior, event.model_dump())
    return {"status": "recorded"}

@router.post("/evolve")
async def trigger_evolution():
    weights = CognitiveEngine.self_evolve()
    return {"status": "evolved", "new_weights": weights}
