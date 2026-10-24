export type ButtonAction =
  | 'play'
  | 'pause'
  | 'previoustrack'
  | 'nexttrack'
  | 'seekbackward'
  | 'seekforward'
  | 'stop'
  | 'volumeup'
  | 'volumedown';

export interface ButtonEvent {
  action: ButtonAction;
  timestamp: number;
  key?: string;
}

export class ButtonControlService {
  private silentAudio: HTMLAudioElement | null = null;
  private isListening: boolean = false;
  private onButtonCallback: ((event: ButtonEvent) => void) | null = null;

  public startListening(callback: (event: ButtonEvent) => void) {
    this.onButtonCallback = callback;
    this.isListening = true;

    // Start silent audio loop to unlock Chrome Media Session
    if (!this.silentAudio) {
      // Create a 1-second silent WAV base64
      this.silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==');
      this.silentAudio.loop = true;
      this.silentAudio.volume = 0.001; // virtually silent
    }

    this.silentAudio.play().catch(() => {
      // Audio play blocked until user gesture, which is normal
    });

    if ('mediaSession' in navigator) {
      const actions: MediaSessionAction[] = [
        'play',
        'pause',
        'previoustrack',
        'nexttrack',
        'seekbackward',
        'seekforward',
        'stop',
      ];

      actions.forEach((action) => {
        try {
          navigator.mediaSession.setActionHandler(action, () => {
            this.emitAction(action as ButtonAction);
          });
        } catch {
          // action not supported
        }
      });
    }

    window.addEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.isListening) return;

    if (e.key === 'MediaTrackNext') {
      this.emitAction('nexttrack', e.key);
    } else if (e.key === 'MediaTrackPrevious') {
      this.emitAction('previoustrack', e.key);
    } else if (e.key === 'MediaPlayPause') {
      this.emitAction('play', e.key);
    } else if (e.key === 'AudioVolumeUp') {
      this.emitAction('volumeup', e.key);
    } else if (e.key === 'AudioVolumeDown') {
      this.emitAction('volumedown', e.key);
    }
  };

  private emitAction(action: ButtonAction, key?: string) {
    if (this.onButtonCallback) {
      this.onButtonCallback({
        action,
        timestamp: Date.now(),
        key,
      });
    }
  }

  public stopListening() {
    this.isListening = false;
    if (this.silentAudio) {
      this.silentAudio.pause();
      this.silentAudio = null;
    }
    if ('mediaSession' in navigator) {
      const actions: MediaSessionAction[] = [
        'play',
        'pause',
        'previoustrack',
        'nexttrack',
        'seekbackward',
        'seekforward',
        'stop',
      ];
      actions.forEach((action) => {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {
          // ignore
        }
      });
    }
    window.removeEventListener('keydown', this.handleKeyDown);
  }
}

export const buttonControlService = new ButtonControlService();
