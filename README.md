# AI-Based Facial Emotion Music Recommender

This project is now a richer mood-driven music app: it reads facial expressions in the browser with `face-api.js`, maps that mood through a FastAPI backend, and plays curated tracks inside the UI with an embedded player.

## What it does

- Detects a dominant facial expression from the webcam feed
- Lets the user override the mood manually when needed
- Saves a lightweight local listening profile in the browser
- Recommends curated songs with richer metadata
- Plays tracks inside the app through an embedded YouTube player
- Stores recent mood history and saved favorite songs locally

## Tech stack

- Frontend: React + `face-api.js`
- Backend: FastAPI
- Data: static JSON catalog in `backend/data/songs.json`
- Persistence for the new profile/history/favorites flow: browser `localStorage`

## Local setup

1. Start the backend:
   - `cd backend`
   - `pip install -r requirements.txt`
   - `uvicorn main:app --reload`
2. Start the frontend:
   - `cd frontend`
   - `npm install`
   - create `frontend/.env` with `REACT_APP_API_URL=http://127.0.0.1:8000`
   - `npm start`

## Notes

- The recommendation logic is still rule-based, not a learned music model.
- The sign-in/profile flow is local to the browser for this version.
- The backend exposes `GET /health` and `POST /recommend`.
