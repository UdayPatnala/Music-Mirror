import shutil
import time
from pathlib import Path
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from app.db.database import DB_PATH, Base
from app.db.models import UserMusicPreference, Song, Artist, Album, SongSource


class DatabaseBackupManager:
    @staticmethod
    def create_backup(dest_dir: str | Path | None = None) -> Path:
        """
        Creates an atomic backup copy of the SQLite database.
        """
        source_file = Path(DB_PATH)
        if not source_file.exists():
            raise FileNotFoundError(f"Database file not found at {source_file}")

        target_dir = Path(dest_dir) if dest_dir else source_file.parent / "backups"
        target_dir.mkdir(parents=True, exist_ok=True)

        timestamp = time.strftime("%Y%m%d_%H%M%S", time.gmtime())
        backup_file = target_dir / f"music_mirror_backup_{timestamp}.db"

        shutil.copy2(source_file, backup_file)
        return backup_file

    @staticmethod
    def verify_restoration(backup_path: str | Path) -> bool:
        """
        Verifies backup database integrity by connecting and running PRAGMA quick_check.
        """
        backup_file = Path(backup_path)
        if not backup_file.exists():
            return False

        try:
            test_engine = create_engine(f"sqlite:///{backup_file}")
            with test_engine.connect() as conn:
                result = conn.execute(text("PRAGMA quick_check")).fetchone()
                test_engine.dispose()
                return result is not None and result[0] == "ok"
        except Exception:
            return False

    @staticmethod
    def delete_user_account_data(db: Session, user_id: str) -> dict[str, int]:
        """
        Safely deletes/anonymizes user personalization data while keeping global catalog records intact.
        """
        pref = db.query(UserMusicPreference).filter(UserMusicPreference.user_id == user_id).first()
        deleted_pref_count = 0
        if pref:
            db.delete(pref)
            deleted_pref_count = 1

        db.commit()
        return {
            "user_id": user_id,
            "deleted_preferences": deleted_pref_count,
            "global_catalog_songs_preserved": db.query(Song).count(),
        }
