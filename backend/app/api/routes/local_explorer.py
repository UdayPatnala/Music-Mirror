import os
import string
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()

AUDIO_EXTENSIONS = {'.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac', '.wma', '.mp4'}

AUDIO_MIME_TYPES = {
    '.mp3': 'audio/mpeg',
    '.m4a': 'audio/mp4',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.flac': 'audio/flac',
    '.aac': 'audio/aac',
    '.wma': 'audio/x-ms-wma',
    '.mp4': 'audio/mp4'
}

class FileItem(BaseModel):
    name: str
    path: str
    relative_path: str
    is_dir: bool
    size: int
    modified: float
    extension: str
    is_audio: bool

class DirectoryListingResponse(BaseModel):
    current_path: str
    parent_path: Optional[str]
    items: List[FileItem]
    audio_count: int
    available_drives: List[str] = []

def get_available_drives() -> List[str]:
    drives = []
    if os.name == 'nt':
        for drive_letter in string.ascii_uppercase:
            drive_path = f"{drive_letter}:\\"
            if os.path.exists(drive_path):
                drives.append(drive_path)
    else:
        drives.append("/")
    return drives

@router.get("/files", response_model=DirectoryListingResponse)
async def list_local_directory(path: Optional[str] = Query(default=None)):
    target_path = path if path and os.path.exists(path) else os.path.abspath(os.curdir)
    
    if not os.path.exists(target_path) or not os.path.isdir(target_path):
        target_path = os.path.abspath(os.curdir)
    
    items = []
    audio_count = 0
    
    try:
        entries = os.listdir(target_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read directory: {str(e)}")
        
    for entry in entries:
        if entry.startswith('.') or entry == '__pycache__' or entry == 'node_modules':
            continue
        
        full_entry_path = os.path.join(target_path, entry)
        try:
            stat = os.stat(full_entry_path)
            is_directory = os.path.isdir(full_entry_path)
            _, ext = os.path.splitext(entry)
            ext = ext.lower()
            is_audio = ext in AUDIO_EXTENSIONS
            
            if is_audio:
                audio_count += 1
                
            items.append(FileItem(
                name=entry,
                path=full_entry_path,
                relative_path=os.path.relpath(full_entry_path, target_path),
                is_dir=is_directory,
                size=stat.st_size if not is_directory else 0,
                modified=stat.st_mtime,
                extension=ext,
                is_audio=is_audio
            ))
        except Exception:
            continue

    # Sort directories first, then files
    items.sort(key=lambda x: (not x.is_dir, x.name.lower()))
    
    parent_dir = os.path.dirname(target_path) if target_path != os.path.dirname(target_path) else None

    return DirectoryListingResponse(
        current_path=target_path,
        parent_path=parent_dir,
        items=items,
        audio_count=audio_count,
        available_drives=get_available_drives()
    )

@router.get("/stream")
async def stream_local_audio(file_path: str = Query(...)):
    if not os.path.exists(file_path) or os.path.isdir(file_path):
        raise HTTPException(status_code=404, detail="File not found")
        
    _, ext = os.path.splitext(file_path)
    ext_clean = ext.lower()
    if ext_clean not in AUDIO_EXTENSIONS:
        raise HTTPException(status_code=400, detail="File format not supported for audio streaming")
        
    media_type = AUDIO_MIME_TYPES.get(ext_clean, f"audio/{ext_clean.replace('.', '')}")
    return FileResponse(
        file_path,
        media_type=media_type,
        filename=os.path.basename(file_path)
    )

