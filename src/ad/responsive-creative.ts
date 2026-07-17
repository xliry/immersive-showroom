export type AdLayout = 'masthead' | 'leaderboard' | 'mobile-banner' | 'rectangle';

const params = new URLSearchParams(window.location.search);

function detectLayout(width: number, height: number): AdLayout {
  if (height <= 120) return width <= 480 ? 'mobile-banner' : 'leaderboard';
  if (width / Math.max(height, 1) >= 2.5) return 'masthead';
  return 'rectangle';
}

export class ResponsiveCreative {
  readonly isAd: boolean;
  private layout: AdLayout = 'masthead';

  constructor() {
    const forcedExperience = params.get('experience') === '1';
    this.isAd = !forcedExperience && (params.get('ad') === '1' || window.self !== window.top);
    document.body.dataset.creative = this.isAd ? 'ad' : 'experience';
    this.update();
  }

  update() {
    if (!this.isAd) return;
    this.layout = detectLayout(window.innerWidth, window.innerHeight);
    document.body.dataset.adLayout = this.layout;
  }

  get projectionScale() {
    if (!this.isAd) return 1;
    const aspect = window.innerWidth / Math.max(window.innerHeight, 1);
    return Math.max(1, 2.15 / aspect);
  }
}
