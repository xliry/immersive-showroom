export type ExperienceState =
  | 'boot'
  | 'loading'
  | 'permission'
  | 'calibrating'
  | 'active'
  | 'tracking-lost'
  | 'fallback'
  | 'error';

type Listener = (state: ExperienceState, detail?: string) => void;

export class ExperienceStore {
  current: ExperienceState = 'boot';
  detail = '';
  private listeners = new Set<Listener>();

  set(state: ExperienceState, detail = '') {
    if (this.current === state && this.detail === detail) return;
    this.current = state;
    this.detail = detail;
    this.listeners.forEach((listener) => listener(state, detail));
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    listener(this.current, this.detail);
    return () => this.listeners.delete(listener);
  }
}
