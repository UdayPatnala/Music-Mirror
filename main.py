import sys
from pathlib import Path

# Add backend directory to sys.path for Render root deployment compatibility
backend_path = Path(__file__).parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from backend.main import app

__all__ = ["app"]
