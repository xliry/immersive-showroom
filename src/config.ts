const query = new URLSearchParams(location.search);

export const ASSETS = {
  vehicle: '/assets/hyundai-accent-lite.glb',
  splat: '/assets/hyundai-accent-real-v3.spz',
  particles: '/assets/hyundai-accent-particles.bin',
  faceModel: '/mediapipe/face_landmarker.task',
  visionWasm: '/mediapipe/wasm',
} as const;

export const ROOM = { width: 60, height: 35, depth: 50 } as const;
export const VEHICLE = {
  targetExtent: 31,
  position: [1.5, -3.2, -27] as const,
  yaw: Math.PI - Math.PI / 5.5,
} as const;

export const VIEW = {
  near: 0.1,
  far: 400,
  eyeDistance: 25,
  screenHalfHeight: 8,
  maxX: 6,
  maxY: 4,
  minZ: 18,
  maxZ: 34,
} as const;

export const TRANSITION_MS = 780;
export const MIN_LOADING_MS = 4200;
export const DEBUG = query.has('debug');
export const POINT_CLOUD_LAB = query.has('splash-lab');
export const SPLAT_MOTION = Math.min(
  6,
  Math.max(1, Number.parseInt(query.get('splat-motion') ?? '1', 10) || 1),
);
export const SPLAT_MOTION_NAMES = [
  'RIBBON FLOW',
  'BREATHING CLOUD',
  'ENERGY SCANNER',
  'VORTEX DRIFT',
  'TWIN CURRENT',
  'STORM ASSEMBLE',
] as const;
export const SPLAT_MOTION_NAME = SPLAT_MOTION_NAMES[SPLAT_MOTION - 1];
