import sys
from pathlib import Path

# Add backend directory to sys.path
backend_path = Path(__file__).parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.main import app

__all__ = ["app"]
