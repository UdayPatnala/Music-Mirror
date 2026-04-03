import json
import random
from pathlib import Path

DATA_PATH = Path(__file__).parent / "data" / "songs.json"

with DATA_PATH.open("r", encoding="utf-8") as file:
    SONGS = json.load(file)

EMOTION_MAP = {
    "surprised": "surprise",
    "fearful": "sad",
    "disgusted": "angry",
}


def normalize_emotion(emotion: str) -> str:
    cleaned_emotion = emotion.strip().lower()
    return EMOTION_MAP.get(cleaned_emotion, cleaned_emotion)


def recommend_songs(emotion: str):
    normalized_emotion = normalize_emotion(emotion)
    songs = SONGS.get(normalized_emotion, [])

    if not songs:
        return normalized_emotion, []

    return normalized_emotion, random.sample(songs, k=len(songs))
