# AI-Based Facial Emotion Music Recommender

This project is a webcam-based prototype that detects facial expressions in the browser with `face-api.js` and asks a FastAPI backend for songs from a small curated catalog.

## What it does

- Detects a dominant facial expression from the webcam feed
- Maps that expression to a playlist mood
- Returns matching songs from `backend/data/songs.json`

## Tech stack

- Frontend: React + `face-api.js`
- Backend: FastAPI
- Data: static JSON catalog

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

- The recommendation logic is currently rule-based, not a learned music model.
- The backend exposes `GET /health` and `POST /recommend`.
