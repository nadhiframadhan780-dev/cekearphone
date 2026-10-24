import { computeRmsAndPeak } from '../utils/dspGoertzel';

export interface MicAnalysisData {
  peakDbfs: number;
  rmsDbfs: number;
  clipping: boolean;
  dcOffset: number;
  fftData: Uint8Array;
}

export class MicService {
  private stream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private onDataCallback: ((data: MicAnalysisData) => void) | null = null;
  private animFrameId: number | null = null;

  public async startMonitoring(
    deviceId?: string,
    onData?: (data: MicAnalysisData) => void
  ): Promise<{ sampleRate: number; channelCount: number; isHfp: boolean }> {
    this.stopMonitoring();
    this.onDataCallback = onData || null;

    const constraints: MediaStreamConstraints = {
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    };

    this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    this.audioCtx = new AudioCtx();

    const track = this.stream.getAudioTracks()[0];
    const settings = track.getSettings();
    const actualSampleRate = settings.sampleRate || this.audioCtx.sampleRate;
    const actualChannelCount = settings.channelCount || 1;
    // Bluetooth HFP/HSP usually limits sample rate to 8000 Hz (CVSD/mSBC) or 16000 Hz (mSBC wideband)
    const isHfp = actualSampleRate <= 16000;

    const source = this.audioCtx.createMediaStreamSource(this.stream);
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.6;
    source.connect(this.analyser);

    const bufferLength = this.analyser.frequencyBinCount;
    const timeData = new Float32Array(this.analyser.fftSize);
    const freqData = new Uint8Array(bufferLength);

    const loop = () => {
      if (!this.analyser) return;

      this.analyser.getFloatTimeDomainData(timeData);
      this.analyser.getByteFrequencyData(freqData);

      const stats = computeRmsAndPeak(timeData);
      const clipping = stats.peakDbfs >= -0.1;

      if (this.onDataCallback) {
        this.onDataCallback({
          peakDbfs: stats.peakDbfs,
          rmsDbfs: stats.rmsDbfs,
          clipping,
          dcOffset: stats.dcOffset,
          fftData: freqData,
        });
      }

      this.animFrameId = requestAnimationFrame(loop);
    };

    loop();

    return {
      sampleRate: actualSampleRate,
      channelCount: actualChannelCount,
      isHfp,
    };
  }

  public async recordClip(durationSec: number = 5): Promise<string> {
    if (!this.stream) {
      throw new Error('Aliran mikrofon belum aktif.');
    }

    this.recordedChunks = [];
    this.mediaRecorder = new MediaRecorder(this.stream);

    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) return reject('MediaRecorder tidak tersedia');

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.recordedChunks.push(e.data);
      };

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        resolve(url);
      };

      this.mediaRecorder.start();
      setTimeout(() => {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
          this.mediaRecorder.stop();
        }
      }, durationSec * 1000);
    });
  }

  public stopMonitoring() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close();
      this.audioCtx = null;
    }
    this.analyser = null;
    this.onDataCallback = null;
  }
}

export const micService = new MicService();
