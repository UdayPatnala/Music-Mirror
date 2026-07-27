import json
import logging
from datetime import datetime
from typing import Dict, Any

logger = logging.getLogger(__name__)

class CognitiveEngine:
    _memory: list[dict] = []
    _ab_weights: dict = {"valence": 0.4, "energy": 0.4, "tempo": 0.2, "novelty": 0.05}
    _intent_models: dict = {}

    @classmethod
    def record_behavior(cls, data: dict):
        # Store telemetry in short-term memory
        cls._memory.append({
            "timestamp": datetime.now().isoformat(),
            "event": data.get("event"),
            "song": data.get("song_id"),
            "emotion": data.get("emotion"),
            "session_time": data.get("session_time")
        })
        if len(cls._memory) > 1000:
            cls._memory = cls._memory[-1000:]
            
        cls._predict_intent(data)
        
        if data.get("event") == "skip":
            cls._trigger_recovery(data)

    @classmethod
    def _predict_intent(cls, data: dict):
        if data.get("event") == "play" and data.get("session_time", 0) > 600:
            cls._intent_models["current_intent"] = "BackgroundListening"
        elif data.get("emotion") == "angry" and data.get("event") == "play":
            cls._intent_models["current_intent"] = "StressRelief"

    @classmethod
    def _trigger_recovery(cls, data: dict):
        logger.info(f"Recovery Engine triggered for skip on {data.get('song_id')}")
        # Automatically slightly shift weights away from failed track's profile
        cls._ab_weights["energy"] *= 0.95 

    @classmethod
    def self_evolve(cls):
        # Triggered by cron job. Analyzes memory, updates global recommendation weights.
        if not cls._memory:
            return "No data to evolve."
            
        skips = len([m for m in cls._memory if m["event"] == "skip"])
        likes = len([m for m in cls._memory if m["event"] == "like"])
        
        if skips > likes:
            # Shift towards safer, less novel recommendations
            cls._ab_weights["novelty"] = max(0.01, cls._ab_weights["novelty"] - 0.02)
        elif likes > skips:
            # Increase discovery
            cls._ab_weights["novelty"] = min(0.2, cls._ab_weights["novelty"] + 0.02)
            
        logger.info(f"Self-Evolution complete. New weights: {cls._ab_weights}")
        # Clear short term memory into long term storage (mocked)
        cls._memory = []
        return cls._ab_weights
