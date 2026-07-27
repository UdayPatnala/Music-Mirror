from fastapi import APIRouter
from app.schemas.emotion import EmotionRequest, RecommendationResponse
from app.services.recommendation_engine import RecommendationService

router = APIRouter()

@router.post("", response_model=RecommendationResponse)
@router.post("/", response_model=RecommendationResponse)
async def get_recommendations(req: EmotionRequest):
    normalized_emotion, songs = RecommendationService.recommend(req.emotion, req.genre, req.goal)
    return RecommendationResponse(
        emotion=req.emotion,
        normalized_emotion=normalized_emotion,
        songs=songs
    )
