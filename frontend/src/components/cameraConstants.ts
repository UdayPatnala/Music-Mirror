/**
 * Facial Expression Recognition Constants and Calibration Matrix
 */

export const EMOTION_KEYS = [
  'happy',
  'sad',
  'angry',
  'neutral',
  'surprised',
  'fearful',
  'disgusted',
] as const;

export type EmotionKey = typeof EMOTION_KEYS[number];

// Calibration weights to overcome neutral-bias in resting human faces
export const EMOTION_CALIBRATION: Record<string, number> = {
  happy: 1.45,
  sad: 1.40,
  angry: 1.35,
  surprised: 1.35,
  fearful: 1.30,
  disgusted: 1.30,
  neutral: 0.65,
};

// Canonical mapping from face-api emotion labels to Music Mirror emotion taxonomy
export const FACE_TO_MIRROR_EMOTION: Record<string, string> = {
  happy: 'joyful',
  sad: 'melancholy',
  neutral: 'centered',
  surprised: 'triumphant',
  angry: 'cathartic',
  fearful: 'focused',
  disgusted: 'cathartic',
};
