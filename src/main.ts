import './styles.css';
import {
  DEBUG,
  MIN_LOADING_MS,
  POINT_CLOUD_LAB,
  SPLAT_MOTION_NAME,
  TRANSITION_MS,
} from './config';
import { ExperienceStore } from './state/experience-state';
import { ExperienceUI } from './ui/experience-ui';
import { createScene } from './scene/create-scene';
import { createSplatLoader } from './scene/create-splat-loader';
import { loadVehicle } from './scene/load-vehicle';
import { CameraViewController, type CameraViewId } from './scene/camera-view-controller';
import { TransitionController } from './scene/transition-controller';
import { PoseSmoother } from './tracking/smoothing';
import { applyOffAxisProjection } from './tracking/off-axis-projection';
import { FaceTracker } from './tracking/face-tracker';
import { PerformanceMonitor } from './diagnostics/performance-monitor';
import { ResponsiveCreative } from './ad/responsive-creative';

const canvas = document.getElementById('experience-canvas') as HTMLCanvasElement;
const video = document.getElementById('input_video') as HTMLVideoElement;
const diagnostics = document.getElementById('diagnostics') as HTMLElement;
const responsiveCreative = new ResponsiveCreative();
const store = new ExperienceStore();
const smoother = new PoseSmoother();
const { scene, camera, renderer } = createScene(canvas);
const splats = createSplatLoader(scene);
const performanceMonitor = new PerformanceMonitor(diagnostics, renderer, DEBUG);
let mode: 'pending' | 'camera' | 'mouse' = 'pending';
let transition: TransitionController | null = null;
let viewController: CameraViewController | null = null;
let lastFrame = performance.now();

const tracker = new FaceTracker(video, {
  onPose: (pose) => smoother.setTarget(pose),
  onFound: () => {
    if (mode === 'camera') store.set('active');
  },
  onLost: () => {
    if (mode !== 'camera') return;
    smoother.neutral();
    store.set('tracking-lost');
  },
});

const ui = new ExperienceUI(store, {
  enableCamera: () => void enableCamera(),
  useMouse: () => useMouse(),
  recalibrate: () => {
    if (mode === 'camera') {
      tracker.recalibrate();
      store.set('calibrating');
      ui.showToast('Kalibrasyon sıfırlandı. Ekranın merkezine bak.');
    } else {
      smoother.neutral();
      ui.showToast('Mouse görünümü merkeze alındı.');
    }
  },
});

const viewButtons = Array.from(
  document.querySelectorAll<HTMLButtonElement>('[data-scene-view]'),
);
viewButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const id = button.dataset.sceneView as CameraViewId;
    viewController?.select(id);
    smoother.neutral();
    viewButtons.forEach((candidate) => {
      candidate.classList.toggle('is-active', candidate === button);
      candidate.setAttribute('aria-pressed', String(candidate === button));
    });
  });
});

async function enableCamera() {
  store.set('calibrating');
  try {
    await tracker.start();
    mode = 'camera';
    ui.setStatus('camera', true);
  } catch (error) {
    console.warn('Camera tracking unavailable', error);
    ui.showToast('Kamera kullanılamadı. Mouse kontrolüne geçildi.');
    useMouse();
  }
}

function useMouse() {
  tracker.stop();
  mode = 'mouse';
  smoother.neutral();
  store.set('fallback');
}

let dragging = false;
let startX = 0;
let startY = 0;
let startPose = { x: 0, y: 0 };
canvas.addEventListener('pointerdown', (event) => {
  if (mode !== 'mouse') return;
  dragging = true;
  startX = event.clientX;
  startY = event.clientY;
  startPose = { x: smoother.target.x, y: smoother.target.y };
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', (event) => {
  if (!dragging || mode !== 'mouse') return;
  smoother.setTarget({
    x: startPose.x + (event.clientX - startX) / Math.max(innerWidth * 0.34, 1),
    y: startPose.y - (event.clientY - startY) / Math.max(innerHeight * 0.34, 1),
    z: 1,
  });
});
canvas.addEventListener('pointerup', () => { dragging = false; });
canvas.addEventListener('pointercancel', () => { dragging = false; });

function resize() {
  responsiveCreative.update();
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 900 ? 1.5 : 2));
  renderer.setSize(innerWidth, innerHeight, false);
}
window.addEventListener('resize', resize);

function frame(time: number) {
  const delta = Math.min((time - lastFrame) / 1000, 0.1);
  lastFrame = time;
  tracker.requestDetection(time);
  const pose = smoother.update(delta);
  viewController?.update(delta);
  applyOffAxisProjection(
    camera,
    pose,
    innerWidth / innerHeight,
    viewController?.current,
    responsiveCreative.projectionScale,
  );
  splats.update(time);
  const formationProgress = splats.getFormationProgress();
  if (store.current === 'loading' && formationProgress > 0) {
    ui.setProgress(
      POINT_CLOUD_LAB ? formationProgress : 0.93 + formationProgress * 0.07,
      POINT_CLOUD_LAB
        ? `${SPLAT_MOTION_NAME} / CONTINUOUS`
        : formationProgress < 0.999
          ? 'ASSEMBLING POINT CLOUD'
          : 'VEHICLE READY',
    );
  }
  transition?.update(time);
  performanceMonitor.update(time, pose);
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(frame);

async function boot() {
  const bootStartedAt = performance.now();
  store.set('loading');
  let latestProgress = 0;
  const onProgress = (value: number, label: string) => {
    latestProgress = Math.max(latestProgress, value);
    splats.setProgress(latestProgress);
    ui.setProgress(latestProgress, label);
  };
  try {
    await splats.ready;
    onProgress(0.06, 'POINT CLOUD READY');
    if (POINT_CLOUD_LAB) {
      document.body.classList.add('point-cloud-lab');
      splats.startFormation();
      return;
    }
    const vehicle = await loadVehicle(renderer, scene, camera, onProgress);
    viewController = new CameraViewController(vehicle.cameraViews);
    document.body.classList.add('views-ready');
    splats.startFormation();
    const remainingLoadingTime = MIN_LOADING_MS - (performance.now() - bootStartedAt);
    await Promise.all([
      splats.formed,
      new Promise((resolve) => window.setTimeout(resolve, Math.max(remainingLoadingTime, 0))),
    ]);
    transition = new TransitionController(splats, vehicle, TRANSITION_MS, () => {
      store.set('permission');
    });
    transition.start(performance.now());
  } catch (error) {
    console.error(error);
    store.set('error', '3D deneyim yüklenemedi. Sayfayı yenileyip tekrar dene.');
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) renderer.setAnimationLoop(null);
  else {
    lastFrame = performance.now();
    renderer.setAnimationLoop(frame);
  }
});

window.addEventListener('beforeunload', () => {
  tracker.dispose();
  splats.dispose();
  renderer.dispose();
});

void boot();
