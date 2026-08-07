import urllib.request
import json
import os
from fastapi import APIRouter, HTTPException, Query
from typing import Optional

router = APIRouter()

GITHUB_API_BASE = "https://api.github.com"

def fetch_github_json(url: str):
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Music-Mirror-App/1.0",
            "Accept": "application/vnd.github.v3+json"
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            if response.status == 200:
                data = json.loads(response.read().decode('utf-8'))
                return data
            raise HTTPException(status_code=response.status, detail="GitHub API returned error")
    except urllib.error.HTTPError as e:
        raise HTTPException(status_code=e.code, detail=f"GitHub API Error: {e.reason}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch from GitHub: {str(e)}")

@router.get("/repo-info")
async def get_repo_info(repo: str = Query(default="UdayPatnala/music-mirror")):
    repo_clean = repo.strip().replace("https://github.com/", "").strip("/")
    if "/" not in repo_clean:
        raise HTTPException(status_code=400, detail="Invalid repository format. Expected owner/repo")
        
    url = f"{GITHUB_API_BASE}/repos/{repo_clean}"
    data = fetch_github_json(url)
    
    return {
        "full_name": data.get("full_name"),
        "name": data.get("name"),
        "owner": data.get("owner", {}).get("login"),
        "owner_avatar": data.get("owner", {}).get("avatar_url"),
        "description": data.get("description"),
        "stars": data.get("stargazers_count", 0),
        "forks": data.get("forks_count", 0),
        "open_issues": data.get("open_issues_count", 0),
        "default_branch": data.get("default_branch", "main"),
        "html_url": data.get("html_url"),
        "updated_at": data.get("updated_at")
    }

@router.get("/tree")
async def get_repo_tree(repo: str = Query(default="UdayPatnala/music-mirror"), branch: Optional[str] = None):
    repo_clean = repo.strip().replace("https://github.com/", "").strip("/")
    if "/" not in repo_clean:
        raise HTTPException(status_code=400, detail="Invalid repository format. Expected owner/repo")
    
    selected_branch = branch if branch else "main"
    url = f"{GITHUB_API_BASE}/repos/{repo_clean}/git/trees/{selected_branch}?recursive=1"
    
    try:
        data = fetch_github_json(url)
        tree = data.get("tree", [])
        
        audio_files = []
        code_files = []
        directories = []
        
        audio_exts = ('.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac')
        
        for item in tree:
            path = item.get("path", "")
            item_type = item.get("type", "")
            
            if item_type == "tree":
                directories.append(item)
            elif path.lower().endswith(audio_exts):
                audio_files.append({
                    "path": path,
                    "size": item.get("size", 0),
                    "raw_url": f"https://raw.githubusercontent.com/{repo_clean}/{selected_branch}/{path}",
                    "sha": item.get("sha")
                })
            else:
                code_files.append(item)
                
        return {
            "sha": data.get("sha"),
            "truncated": data.get("truncated", False),
            "tree": tree,
            "audio_files": audio_files,
            "total_items": len(tree),
            "audio_count": len(audio_files)
        }
    except Exception as e:
        # Fallback for local repository if github API rate limit is exceeded
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/commits")
async def get_repo_commits(repo: str = Query(default="UdayPatnala/music-mirror")):
    repo_clean = repo.strip().replace("https://github.com/", "").strip("/")
    url = f"{GITHUB_API_BASE}/repos/{repo_clean}/commits?per_page=15"
    data = fetch_github_json(url)
    
    commits = []
    for c in data:
        commits.append({
            "sha": c.get("sha", "")[:7],
            "full_sha": c.get("sha"),
            "message": c.get("commit", {}).get("message", ""),
            "author": c.get("commit", {}).get("author", {}).get("name", "Unknown"),
            "author_avatar": c.get("author", {}).get("avatar_url") if c.get("author") else None,
            "date": c.get("commit", {}).get("author", {}).get("date"),
            "html_url": c.get("html_url")
        })
    return commits
