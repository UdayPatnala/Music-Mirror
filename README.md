# Emotion Music Recommender

A web-based facial emotion music recommender built as our final year team project. It reads facial expressions in the browser with `face-api.js`, maps that mood through a FastAPI backend, and plays curated tracks inside the UI with an embedded player.

## Team Members
- **Chaitanya** (Team Lead & Backend Architecture)
- **Uday** (Lead Developer - Frontend & Core Logic)
- **Rohit** (UI Components & Testing)
- **Prem Sagar** (Documentation & QA)

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

---

## 🔌 AROH Ecosystem Integration Guide

This repository is integrated into the central **AROH Platform Ecosystem** via `@aroh/asdk`.

### SSO & Session Sync
Authentication relies on the central AROH Platform identity. Local authentication stores and local storage sessions are bridged to the central Zustand state in `aroh-adapter.ts`.
- **Single Sign-Out**: Active tabs watch the `aroh_logout_event` key in `localStorage`. When a logout occurs elsewhere in the ecosystem, the local session is immediately destroyed, and the user is redirected to the AROH login portal.

### Credits & Ledger Interactions
Operation costs, balances, and progress incentives are tracked via the Aros wallet.
- **Entitlements**: Access is gated using the AROH Membership Tier (`basic` vs `pro`/`enterprise`).
- **Ledger Records**: Debits (points/tokens charged) and credits (rewards earned) are directly posted to the AROH Ledger using `rewardUser()` transactions.

### Running with AROH local links
To run this application locally linked to your AROH SDK repository:
1. Link the package locally:
   ```bash
   npm install ../AROH/packages/asdk
   ```
2. Import the adapter hooks from `./src/aroh-adapter.ts` to coordinate actions with the central store.
