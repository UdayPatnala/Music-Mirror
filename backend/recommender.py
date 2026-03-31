import json
from pathlib import Path

DATA_PATH = Path(__file__).parent / "data" / "songs.json"

with open(DATA_PATH, "r") as f:
    SONGS = json.load(f)

def recommend_songs(emotion: str):
    emotion = emotion.lower()

    # Normalize face-api emotions to JSON keys
    EMOTION_MAP = {
        "surprised": "surprise",
        "fearful": "sad",
        "disgusted": "angry"
    }

    normalized_emotion = EMOTION_MAP.get(emotion, emotion)

    return SONGS.get(normalized_emotion, [])
