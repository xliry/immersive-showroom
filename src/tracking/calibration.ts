import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import type { ViewerPose } from './smoothing';

type Neutral = { x: number; y: number; eyeDistance: number };

export class FaceCalibration {
  private neutral: Neutral | null = null;

  reset() { this.neutral = null; }
  get calibrated() { return this.neutral !== null; }

  sample(landmarks: NormalizedLandmark[]): ViewerPose {
    const nose = landmarks[1];
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const eyeDistance = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y);
    if (!this.neutral) this.neutral = { x: nose.x, y: nose.y, eyeDistance };
    const dx = (nose.x - this.neutral.x) * -4.2;
    const dy = (nose.y - this.neutral.y) * -4.2;
    const z = this.neutral.eyeDistance / Math.max(eyeDistance, 0.001);
    return { x: dx, y: dy, z };
  }
}
