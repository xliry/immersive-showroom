import type { ExperienceState, ExperienceStore } from '../state/experience-state';

type UIActions = {
  enableCamera(): void;
  useMouse(): void;
  recalibrate(): void;
};

const get = <T extends HTMLElement>(id: string) => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing UI element: #${id}`);
  return element as T;
};

export class ExperienceUI {
  private loading = get('loading');
  private permission = get('permission');
  private stage = get('stage-label');
  private hint = get('interaction-hint');
  private toast = get('toast');
  private statuses = {
    webgl: document.querySelector<HTMLElement>('[data-status="webgl"]')!,
    camera: document.querySelector<HTMLElement>('[data-status="camera"]')!,
    tracking: document.querySelector<HTMLElement>('[data-status="tracking"]')!,
  };

  constructor(store: ExperienceStore, actions: UIActions) {
    get('enable-camera').addEventListener('click', actions.enableCamera);
    get('use-mouse').addEventListener('click', actions.useMouse);
    get('recalibrate').addEventListener('click', actions.recalibrate);
    get('fullscreen').addEventListener('click', () => {
      if (document.fullscreenElement) void document.exitFullscreen();
      else void document.documentElement.requestFullscreen();
    });
    get('help').addEventListener('click', () => {
      this.showToast('Başını yavaşça hareket ettir veya sahneyi mouse ile sürükle. CAL ile merkez görünümü yenile.');
    });
    store.subscribe((state, detail) => this.renderState(state, detail));
    this.setStatus('webgl', true);
  }

  setProgress(_value: number, label: string) {
    this.stage.textContent = label;
  }

  setStatus(name: keyof typeof this.statuses, active: boolean) {
    this.statuses[name].classList.toggle('is-active', active);
  }

  showToast(message: string) {
    this.toast.textContent = message;
    this.toast.classList.add('is-visible');
    window.setTimeout(() => this.toast.classList.remove('is-visible'), 4200);
  }

  private renderState(state: ExperienceState, detail?: string) {
    document.body.dataset.state = state;
    const loaded = !['boot', 'loading'].includes(state);
    this.loading.classList.toggle('is-hidden', loaded);
    this.permission.classList.toggle('is-visible', state === 'permission');
    const hints: Record<ExperienceState, string> = {
      boot: 'Renderer başlatılıyor',
      loading: 'Yükleniyor — araç noktalar içinden oluşuyor',
      permission: 'Bir görüntüleme yöntemi seç',
      calibrating: 'Ortaya bak — görünüm kalibre ediliyor',
      active: 'Başını hareket ettirerek perspektifi değiştir',
      'tracking-lost': 'Yüz algılanamadı — görünüm merkeze dönüyor',
      fallback: 'Perspektifi değiştirmek için sürükle',
      error: detail || 'Deneyim başlatılamadı',
    };
    this.hint.textContent = hints[state];
    this.setStatus('camera', ['calibrating', 'active', 'tracking-lost'].includes(state));
    this.setStatus('tracking', state === 'active');
    if (state === 'error' && detail) this.showToast(detail);
  }
}
