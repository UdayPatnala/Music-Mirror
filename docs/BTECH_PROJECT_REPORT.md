# B.Tech CSE Final Year Project Report — Legacy Overview & Solo Upgrade Logs

## Project Title
**Music Mirror: Real-Time Emotion-Aware AI Music Discovery & Playback System**

---

## 1. B.Tech Final Year Project Team (Months 1 - 6)
*Submitted to the Department of Computer Science & Engineering, College of Engineering, in partial fulfillment of the requirements for the degree of Bachelor of Technology.*

### Project Guide
* **Professor & Head of Department** (CSE)

### Project Team Members & Roles
1. **Student 1** (Roll: `1601-22-733-045`)
   * *Role:* Project Lead & Core Player Integration.
   * *Contribution:* Designed state management, Zustand store setup, Jamendo integration, and SPA page transitions.
2. **Student 2** (Roll: `1601-22-733-024`)
   * *Role:* Biometrics & Computer Vision Developer.
   * *Contribution:* Set up face-api.js, loaded models, computed temporal expression averages (EMA), and implemented webcam lighting analysis.
3. **Student 3** (Roll: `1601-22-733-089`)
   * *Role:* Backend Systems & Database Ingestion.
   * *Contribution:* Designed SQLite schema, FastAPI endpoints, auto-discovery Jamendo scraper, and song seed ingestion.
4. **Student 4** (Roll: `1601-22-733-112`)
   * *Role:* Frontend UI Designer & Assets Coordinator.
   * *Contribution:* Designed HTML/CSS layouts, navigation pill bar, and styled landing page animations.

### Academic Timeline (November 2025 - April 2026)
* **Stage 1 (Nov - Dec 2025):** Literature survey, feasibility analysis, model research (`face-api.js` vs `MediaPipe`).
* **Stage 2 (Jan - Feb 2026):** Basic local playback prototype, simple sqlite schema, and raw face landmark detection.
* **Stage 3 (March 2026):** Mid-semester evaluation. Built the first version of the MoodRoom with simulated playbacks and offline catalogs.
* **Stage 4 (April 2026):** Final submission, project presentation, and thesis documentation. External examiner evaluation score: 98/100.

---

## 2. Solo Upgrades & Modernization Timeline (Months 7 - 10)
*After graduation, the Student Project Lead (Student 1) continued upgrading the project to a production-ready engine.*

### Upgrade Timeline (May 2026 - August 2026)
* **Month 7 (May 2026):** Clean Architecture Refactor. Split the frontend into formal domain layers (DiscoveryLayer, PlaybackLayer, SessionOrchestrator).
* **Month 8 (June 2026):** Upgraded simulated playback to native YouTube IFrame API. Integrated the `YouTubePlaybackAdapter` singleton.
* **Month 9 (July 2026):** Added weighted ranking scores on the backend. Designed the 5-level query expansion ladder on the client.
* **Month 10 (August 2026):** Fault-tolerant sequential fallback and playback recovery state machine. Added SingleFlight request deduplication, L1 query cache (30m TTL), and automated candidate validation. Added full test coverage for backend endpoints and algorithms.

---

## 3. Heritage Code Highlights
The following files contain legacy segments preserved from the original B.Tech student project:
* [`Camera.tsx`](file:///d:/PROJECT/Btech/Music%20Mirror/frontend/src/components/Camera.tsx): Student 2's original WebGL canvas frame extraction and lighting condition analysis loop.
* [`normalizer.py`](file:///d:/PROJECT/Btech/Music%20Mirror/backend/app/ingestion/normalizer.py): Student 3's hyphen-split string separator and uploader title cleanup parser.
* [`App.tsx`](file:///d:/PROJECT/Btech/Music%20Mirror/frontend/src/App.tsx): Student 4's route list layouts and UI themes.
