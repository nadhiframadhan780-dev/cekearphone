import { AcousticFreqResult } from '../types/device';
import { goertzel, evaluateChannelDelta, estimateThd } from '../utils/dspGoertzel';

class AudioService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private currentSinkId: string = '';
  private activeNodes: Array<{ stop?: () => void; disconnect: () => void }> = [];
  private wakeLock: any = null;

  // Master safety settings
  private volume: number = 0.50; // default 50%
  private isSafeCapActive: boolean = true; // max 0.70 when active
  private isPlaying: boolean = false;
  private playingDescription: string = '';
  private onStateChangeCallback: (() => void) | null = null;

  public initContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.getEffectiveVolume(), this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public registerStateChange(cb: () => void) {
    this.onStateChangeCallback = cb;
  }

  private notify() {
    if (this.onStateChangeCallback) this.onStateChangeCallback();
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getPlayingDescription(): string {
    return this.playingDescription;
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1.0, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.getEffectiveVolume(), this.ctx.currentTime, 0.05);
    }
    this.notify();
  }

  public getEffectiveVolume(): number {
    if (this.isSafeCapActive && this.volume > 0.70) {
      return 0.70;
    }
    return this.volume;
  }

  public toggleSafeCap(active: boolean) {
    this.isSafeCapActive = active;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.getEffectiveVolume(), this.ctx.currentTime, 0.05);
    }
    this.notify();
  }

  public isSafeCapEnabled(): boolean {
    return this.isSafeCapActive;
  }

  public async setOutputDevice(sinkId: string): Promise<boolean> {
    this.initContext();
    this.currentSinkId = sinkId;
    if (!this.ctx) return false;

    try {
      if ('setSinkId' in this.ctx && typeof (this.ctx as any).setSinkId === 'function') {
        await (this.ctx as any).setSinkId(sinkId);
        return true;
      }
    } catch (e) {
      console.warn('Gagal setSinkId pada AudioContext:', e);
    }
    return false;
  }

  public getCurrentSinkId(): string {
    return this.currentSinkId;
  }

  /**
   * Emergency STOP: Instantly halts all audio synthesis, ramps gain to 0, and clears nodes.
   */
  public stopAll() {
    if (this.ctx && this.masterGain) {
      try {
        this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
        // restore gain after stop
        setTimeout(() => {
          if (this.masterGain && this.ctx) {
            this.masterGain.gain.setValueAtTime(this.getEffectiveVolume(), this.ctx.currentTime);
          }
        }, 100);
      } catch {
        // ignore
      }
    }

    for (const node of this.activeNodes) {
      try {
        if (node.stop) node.stop();
        node.disconnect();
      } catch {
        // ignore
      }
    }
    this.activeNodes = [];
    this.isPlaying = false;
    this.playingDescription = '';
    this.releaseWakeLock();
    this.notify();
  }

  /**
   * Helper to perform soft-start fade in (~1.5s) to protect ears.
   */
  private applySoftStart(gainNode: GainNode, targetGain: number, durationSec: number = 1.5) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(targetGain, now + durationSec);
  }

  /**
   * 1. Channel Test: Plays tone in Left, Right, or Both channels.
   */
  public playChannelTest(channel: 'left' | 'right' | 'both', freq: number = 440) {
    this.stopAll();
    const ctx = this.initContext();

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    const gain = ctx.createGain();
    this.applySoftStart(gain, 0.4, 1.2);

    const merger = ctx.createChannelMerger(2);

    if (channel === 'left') {
      gain.connect(merger, 0, 0); // L
    } else if (channel === 'right') {
      gain.connect(merger, 0, 1); // R
    } else {
      gain.connect(merger, 0, 0);
      gain.connect(merger, 0, 1);
    }

    osc.connect(gain);
    merger.connect(this.masterGain!);

    osc.start();
    this.activeNodes.push({
      stop: () => osc.stop(),
      disconnect: () => {
        osc.disconnect();
        gain.disconnect();
        merger.disconnect();
      },
    });

    this.isPlaying = true;
    this.playingDescription = `Uji Kanal: ${channel.toUpperCase()} (${freq} Hz)`;
    this.notify();
  }

  /**
   * 3. Frequency Generator: Manual Sine Sweep (Hz), White Noise, Pink Noise.
   */
  public playTone(freq: number, type: OscillatorType = 'sine') {
    this.stopAll();
    const ctx = this.initContext();

    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    const gain = ctx.createGain();
    this.applySoftStart(gain, 0.35, 1.2);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start();
    this.activeNodes.push({
      stop: () => osc.stop(),
      disconnect: () => {
        osc.disconnect();
        gain.disconnect();
      },
    });

    this.isPlaying = true;
    this.playingDescription = `Nada Uji: ${freq} Hz (${type})`;
    this.notify();
  }

  public updateOscillatorFreq(freq: number) {
    if (this.ctx && this.activeNodes.length > 0) {
      // Find oscillator if any
      // Smooth frequency change
      const now = this.ctx.currentTime;
      // Oscillators don't expose public ref easily, so recreate smoothly or pass node
    }
  }

  /**
   * Generates continuous Pink Noise (Paul Kellet's filter) for endurance test or acoustics.
   */
  public playPinkNoise(description: string = 'Pink Noise') {
    this.stopAll();
    const ctx = this.initContext();
    const bufferSize = 4096;
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    const noiseNode = ctx.createScriptProcessor(bufferSize, 1, 2);
    noiseNode.onaudioprocess = (e) => {
      const outputL = e.outputBuffer.getChannelData(0);
      const outputR = e.outputBuffer.getChannelData(1);
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        const pink = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
        outputL[i] = pink;
        outputR[i] = pink;
      }
    };

    const gain = ctx.createGain();
    this.applySoftStart(gain, 0.4, 1.5);

    noiseNode.connect(gain);
    gain.connect(this.masterGain!);

    this.activeNodes.push({
      stop: () => {
        noiseNode.onaudioprocess = null;
      },
      disconnect: () => {
        noiseNode.disconnect();
        gain.disconnect();
      },
    });

    this.isPlaying = true;
    this.playingDescription = description;
    this.requestWakeLock();
    this.notify();
  }

  public playWhiteNoise() {
    this.stopAll();
    const ctx = this.initContext();
    const bufferSize = 4096;

    const noiseNode = ctx.createScriptProcessor(bufferSize, 1, 2);
    noiseNode.onaudioprocess = (e) => {
      const outputL = e.outputBuffer.getChannelData(0);
      const outputR = e.outputBuffer.getChannelData(1);
      for (let i = 0; i < bufferSize; i++) {
        const white = (Math.random() * 2 - 1) * 0.15;
        outputL[i] = white;
        outputR[i] = white;
      }
    };

    const gain = ctx.createGain();
    this.applySoftStart(gain, 0.35, 1.2);

    noiseNode.connect(gain);
    gain.connect(this.masterGain!);

    this.activeNodes.push({
      stop: () => {
        noiseNode.onaudioprocess = null;
      },
      disconnect: () => {
        noiseNode.disconnect();
        gain.disconnect();
      },
    });

    this.isPlaying = true;
    this.playingDescription = 'White Noise';
    this.notify();
  }

  /**
   * 4. Polarity / Phase Test: Plays dual-channel stereo tone.
   * inPhase: L & R identical
   * outOfPhase: R inverted by 180° (cancels center imaging when held together)
   */
  public playPolarityTest(mode: 'in_phase' | 'out_of_phase', freq: number = 300) {
    this.stopAll();
    const ctx = this.initContext();

    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    const gainL = ctx.createGain();
    const gainR = ctx.createGain();

    gainL.gain.setValueAtTime(0.35, ctx.currentTime);
    gainR.gain.setValueAtTime(mode === 'in_phase' ? 0.35 : -0.35, ctx.currentTime);

    const merger = ctx.createChannelMerger(2);
    osc.connect(gainL);
    osc.connect(gainR);

    gainL.connect(merger, 0, 0); // L
    gainR.connect(merger, 0, 1); // R

    const masterSub = ctx.createGain();
    this.applySoftStart(masterSub, 1.0, 1.2);

    merger.connect(masterSub);
    masterSub.connect(this.masterGain!);

    osc.start();
    this.activeNodes.push({
      stop: () => osc.stop(),
      disconnect: () => {
        osc.disconnect();
        gainL.disconnect();
        gainR.disconnect();
        merger.disconnect();
        masterSub.disconnect();
      },
    });

    this.isPlaying = true;
    this.playingDescription = `Uji Fase: ${mode === 'in_phase' ? 'In-Phase (Normal)' : 'Out-of-Phase (Terbalik 180°)'}`;
    this.notify();
  }

  /**
   * 5. Speaker Membrane Cleaner: Low-frequency 145Hz tone with 8Hz pulsating amplitude modulation.
   */
  public playSpeakerCleaner() {
    this.stopAll();
    const ctx = this.initContext();

    const carrier = ctx.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(145, ctx.currentTime);

    const mod = ctx.createOscillator();
    mod.type = 'sine';
    mod.frequency.setValueAtTime(8, ctx.currentTime); // 8 Hz pulsation

    const modGain = ctx.createGain();
    modGain.gain.setValueAtTime(0.15, ctx.currentTime);

    const mainGain = ctx.createGain();
    this.applySoftStart(mainGain, 0.40, 1.5);

    mod.connect(modGain);
    modGain.connect(mainGain.gain);

    carrier.connect(mainGain);
    mainGain.connect(this.masterGain!);

    carrier.start();
    mod.start();

    this.activeNodes.push({
      stop: () => {
        carrier.stop();
        mod.stop();
      },
      disconnect: () => {
        carrier.disconnect();
        mod.disconnect();
        modGain.disconnect();
        mainGain.disconnect();
      },
    });

    this.isPlaying = true;
    this.playingDescription = 'Pembersih Membran Speaker (145 Hz Pulsasi)';
    this.notify();
  }

  /**
   * Continuous tone for Cable Wiggle Test.
   */
  public playCableWiggleTone() {
    this.stopAll();
    const ctx = this.initContext();

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, ctx.currentTime); // 1 kHz reference

    const gain = ctx.createGain();
    this.applySoftStart(gain, 0.30, 1.0);

    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start();

    this.activeNodes.push({
      stop: () => osc.stop(),
      disconnect: () => {
        osc.disconnect();
        gain.disconnect();
      },
    });

    this.isPlaying = true;
    this.playingDescription = 'Uji Kabel Berjalan (Goyang kabel Anda sekarang)';
    this.notify();
  }

  /**
   * Screen Wake Lock management.
   */
  private async requestWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
      } catch (e) {
        console.warn('Gagal memperoleh WakeLock:', e);
      }
    }
  }

  private releaseWakeLock() {
    if (this.wakeLock) {
      try {
        this.wakeLock.release();
      } catch {
        // ignore
      }
      this.wakeLock = null;
    }
  }
}

export const audioService = new AudioService();
