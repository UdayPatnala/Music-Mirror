from fastapi import APIRouter
from app.schemas.emotion import EmotionRequest, RecommendationResponse, TransitionRequest, TransitionResponse
from app.services.recommendation_engine import RecommendationService

router = APIRouter()

@router.post("", response_model=RecommendationResponse)
async def get_recommendations(req: EmotionRequest):
    normalized_emotion, songs = RecommendationService.recommend(
        req.emotion,
        req.genre,
        req.goal,
        preferred_languages=req.languages,
    )
    return RecommendationResponse(
        emotion=req.emotion,
        normalized_emotion=normalized_emotion,
        songs=songs
    )

@router.post("/transition", response_model=TransitionResponse)
async def get_mood_transition(req: TransitionRequest):
    journey_songs = RecommendationService.recommend_transition_journey(
        start_emotion=req.start_emotion,
        target_emotion=req.target_emotion,
        steps=req.steps,
        user_genre=req.genre
    )
    return TransitionResponse(
        start_emotion=req.start_emotion,
        target_emotion=req.target_emotion,
        steps=req.steps,
        journey=journey_songs
    )

