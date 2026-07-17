import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { ASSETS } from '../config';
import { FaceCalibration } from './calibration';
import type { ViewerPose } from './smoothing';

type TrackerEvents = {
  onPose(pose: ViewerPose): void;
  onFound(): void;
  onLost(): void;
};

export class FaceTracker {
  private landmarker: FaceLandmarker | null = null;
  private stream: MediaStream | null = null;
  private lastDetect = 0;
  private lastSeen = 0;
  private running = false;
  private calibration = new FaceCalibration();

  constructor(private video: HTMLVideoElement, private events: TrackerEvents) {}

  async start() {
    if (!this.landmarker) {
      const vision = await FilesetResolver.forVisionTasks(ASSETS.visionWasm);
      this.landmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: ASSETS.faceModel, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numFaces: 1,
        minFaceDetectionConfidence: 0.55,
        minTrackingConfidence: 0.55,
      });
    }
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    });
    this.video.srcObject = this.stream;
    await this.video.play();
    this.running = true;
    this.calibration.reset();
  }

  requestDetection(timeMs: number) {
    if (!this.running || !this.landmarker || this.video.readyState < 2) return;
    if (timeMs - this.lastDetect < 50) return;
    this.lastDetect = timeMs;
    const result = this.landmarker.detectForVideo(this.video, timeMs);
    const landmarks = result.faceLandmarks[0];
    if (landmarks) {
      const wasLost = timeMs - this.lastSeen > 700;
      this.lastSeen = timeMs;
      this.events.onPose(this.calibration.sample(landmarks));
      if (wasLost) this.events.onFound();
    } else if (timeMs - this.lastSeen > 700) {
      this.events.onLost();
    }
  }

  recalibrate() {
    this.calibration.reset();
  }

  stop() {
    this.running = false;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.video.srcObject = null;
  }

  dispose() {
    this.stop();
    this.landmarker?.close();
    this.landmarker = null;
  }
}
