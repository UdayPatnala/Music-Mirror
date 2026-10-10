# Rule: In-Browser Facial Emotion Recognition

## 1. Detector Sensitivity & Configuration
- Never instantiate `new faceapi.TinyFaceDetectorOptions()` with default parameters.
- Default threshold of `0.50` drops human faces under low lighting or laptop angles.
- Always configure `{ inputSize: 320, scoreThreshold: 0.20-0.25 }` for webcams to guarantee fast, continuous detection.

## 2. Resting Face Neutral Bias Mitigation
- Pre-trained facial expression networks output 85% to 95% `neutral` on resting faces, drowning out subtle smiles or micro-expressions.
- Always apply expressiveness calibration weights:
  - Boost expressive emotions: happy (1.45), sad (1.40), surprised (1.35), angry (1.35).
  - Attenuate resting neutral: neutral (0.65).
- Re-normalize calibrated scores to sum to 1.0.
- Apply Exponential Moving Average (EMA) temporal smoothing across frames (alpha between 0.25 and 0.35) to stabilize emotion transitions and avoid jitter.

## 3. Product Taxonomy Decoupling
- Never assume computer vision emotion labels directly equal product mood taxonomies.
- Always bridge raw inferences to domain entities using an explicit mapping table (e.g. `FACE_TO_MIRROR_EMOTION`), supporting auto-sync mode toggles for user transparency.
