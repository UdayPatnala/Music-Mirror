import argparse
import logging
from app.db.database import engine, Base, SessionLocal
from app.ingestion.ingestion_service import IngestionService
from app.ingestion.youtube_provider import YouTubeMetadataProvider

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("IngestionCLI")


def main():
    parser = argparse.ArgumentParser(description="MusicMirror Metadata Ingestion & Database CLI")
    parser.add_argument("--seed", action="store_true", help="Seed the database with curated seed catalog")
    parser.add_argument("--query", type=str, help="Search query for live metadata discovery (e.g. 'latest telugu hits')")
    parser.add_argument("--limit", type=int, default=10, help="Number of records to fetch")
    parser.add_argument("--dry-run", action="store_true", help="Perform discovery without writing to production database")

    args = parser.parse_args()

    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        if args.seed:
            logger.info("Executing database seeding...")
            result = IngestionService.seed_database(db)
            logger.info(f"Seeding completed: {result['added']} added, {result['existing']} existing.")

        if args.query:
            logger.info(f"Discovering metadata for query '{args.query}' (limit={args.limit}, dry_run={args.dry-run})...")
            provider = YouTubeMetadataProvider()
            candidates = provider.search_metadata(args.query, limit=args.limit)

            logger.info(f"Found {len(candidates)} raw candidates.")

            if args.dry_run:
                for idx, c in enumerate(candidates, 1):
                    logger.info(f"[{idx}] {c['raw_title']} | Channel: {c['channel_name']} | ID: {c['source_id']}")
                logger.info("Dry-run finished. No database records written.")
            else:
                added = 0
                for c in candidates:
                    song_dict = {
                        "title": c["raw_title"],
                        "artist": c["channel_name"],
                        "genre": "Pop",
                        "youtube_id": c["source_id"],
                        "duration": c["duration"],
                        "cover_image_url": c["thumbnail_url"],
                    }
                    _, created = IngestionService.ingest_song_record(db, song_dict, source_type="youtube")
                    if created:
                        added += 1
                logger.info(f"Ingestion completed: {added} new songs saved to database.")

    finally:
        db.close()


if __name__ == "__main__":
    main()
