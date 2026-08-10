import logging
import time
from app.db.database import engine, Base, SessionLocal
from app.ingestion.ingestion_service import IngestionService
from app.ingestion.youtube_provider import YouTubeMetadataProvider

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("SeedRealCatalog")

# [38_SEARCH_VALIDATION_SET]
# Small, real validation catalog covering required edge cases
PHASE_1_QUERIES = [
    # EXACT_TITLE & POPULAR & ENGLISH
    "Blinding Lights The Weeknd official audio",
    "Bohemian Rhapsody Queen",
    
    # NON-LATIN (Telugu, Hindi, Tamil)
    "Chuttamalle Devara Telugu",
    "Tum Hi Ho Arijit Singh",
    "Arabic Kuthu Beast Tamil",
    
    # MISSPELLING / PARTIAL_TITLE
    "shap of you ed sheran",
    
    # TITLE+ARTIST & SPECIAL_CHARACTERS
    "Faded - Alan Walker",
    
    # AMBIGUOUS_ARTIST / COMMON_TITLE
    "Stay Justin Bieber", 
    "Stay Rihanna",
    
    # NATURAL_LANGUAGE
    "that one song that goes never gonna give you up",
    
    # INSTRUMENTAL & MOOD
    "lofi hip hop radio beats to relax study to",
    
    # SOUNDTRACK
    "Interstellar Main Theme Hans Zimmer"
]

def run_phase_1_validation_seed():
    logger.info("Starting Phase 1: Real Validation Catalog Ingestion")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    provider = YouTubeMetadataProvider()

    total_added = 0
    total_existing = 0
    
    try:
        for query in PHASE_1_QUERIES:
            logger.info(f"Executing query: '{query}'")
            candidates = provider.search_metadata(query, limit=1) # Only grab top 1 exact match for high confidence
            
            for c in candidates:
                song_dict = {
                    "title": c["raw_title"],
                    "artist": c["channel_name"],
                    "genre": "Unknown", # Explicilty missing
                    "youtube_id": c["source_id"],
                    "duration": c["duration"],
                    "cover_image_url": c["thumbnail_url"],
                    "source_url": c["source_url"],
                    "release_date": None,
                    "popularity": None,
                    "energy": None,
                    "language": "Unknown",
                }
                
                # Ingest to DB
                record, created = IngestionService.ingest_song_record(db, song_dict, source_type="youtube")
                if created:
                    total_added += 1
                    logger.info(f"  -> Added: {record.title} by {record.artist_name}")
                else:
                    total_existing += 1
                    logger.info(f"  -> Exists: {record.title} by {record.artist_name}")
            
            # small delay to prevent rate limits or blocking
            time.sleep(1)
                    
        logger.info(f"Phase 1 Complete. Added: {total_added}, Existing: {total_existing}")
    finally:
        db.close()

if __name__ == "__main__":
    run_phase_1_validation_seed()
