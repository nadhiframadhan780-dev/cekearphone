import { DeviceInfo } from '../types/device';
import { identifyBrandAndModel } from '../utils/deviceBrands';

export interface AudioEndpoint {
  deviceId: string;
  kind: MediaDeviceKind;
  label: string;
  groupId: string;
}

export class MediaDeviceService {
  private endpoints: AudioEndpoint[] = [];
  private onDeviceChangeCallback: ((endpoints: AudioEndpoint[]) => void) | null = null;
  private hasMicPermission: boolean = false;

  constructor() {
    if (typeof navigator !== 'undefined' && 'mediaDevices' in navigator) {
      navigator.mediaDevices.addEventListener('devicechange', () => {
        this.refreshDevices();
      });
    }
  }

  public registerDeviceChange(cb: (endpoints: AudioEndpoint[]) => void) {
    this.onDeviceChangeCallback = cb;
  }

  /**
   * Prompts user for temporary microphone permission to unlock true device labels.
   */
  public async requestPermissionToReadLabels(): Promise<boolean> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // immediately stop stream
      stream.getTracks().forEach(t => t.stop());
      this.hasMicPermission = true;
      await this.refreshDevices();
      return true;
    } catch (e) {
      console.warn('Izin mikrofon tidak diberikan atau ditolak:', e);
      return false;
    }
  }

  public async refreshDevices(): Promise<AudioEndpoint[]> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
      return [];
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.endpoints = devices.map(d => ({
        deviceId: d.deviceId,
        kind: d.kind,
        label: d.label || (d.kind === 'audiooutput' ? 'Speaker / Headphone (Label Tersembunyi)' : 'Mikrofon (Label Tersembunyi)'),
        groupId: d.groupId,
      }));

      if (this.onDeviceChangeCallback) {
        this.onDeviceChangeCallback(this.endpoints);
      }
      return this.endpoints;
    } catch {
      return [];
    }
  }

  public getAudioOutputs(): AudioEndpoint[] {
    return this.endpoints.filter(e => e.kind === 'audiooutput');
  }

  public getAudioInputs(): AudioEndpoint[] {
    return this.endpoints.filter(e => e.kind === 'audioinput');
  }

  /**
   * Builds a wired DeviceInfo from a selected MediaDeviceInfo.
   * Clearly notes if it is a soundcard jack (e.g. Realtek 3.5mm) or USB DAC.
   */
  public buildWiredDeviceInfo(endpoint: AudioEndpoint, customName?: string): DeviceInfo {
    const rawLabel = customName || endpoint.label || 'Earphone Berkabel';
    const isUsb = /usb|dac|type-c|dongle/i.test(rawLabel);
    const isJack = /realtek|conexant|headphone|analog|sound/i.test(rawLabel) && !isUsb;

    const brandMatch = identifyBrandAndModel(customName || rawLabel);

    return {
      id: endpoint.deviceId || 'wired_endpoint',
      name: customName || (endpoint.label || 'Earphone Berkabel (Jack 3.5mm)'),
      sourceOfName: customName ? 'manual' : 'media_device',
      allNameSources: {
        mediaDeviceLabel: endpoint.label,
        manualName: customName,
      },
      brand: brandMatch.brand || (isJack ? 'Soundcard Laptop' : undefined),
      model: brandMatch.model || endpoint.label,
      connectionType: isUsb ? 'usb' : (isJack ? 'jack_3_5' : 'unknown'),
      audioProfile: 'stereo',
      sinkId: endpoint.deviceId,
      groupId: endpoint.groupId,
      connected: true,
      disconnectCount: 0,
    };
  }

  /**
   * Optional WebUSB scanner for USB-C / USB-A audio dongles.
   * Explains honestly that WebUSB cannot claim audio endpoints, but can read vendor/product names.
   */
  public async scanUsbDevice(): Promise<{
    vendorId: number;
    productId: number;
    productName?: string;
    manufacturerName?: string;
  } | null> {
    if (typeof navigator === 'undefined' || !('usb' in navigator)) {
      throw new Error('WebUSB API tidak didukung oleh browser ini.');
    }

    try {
      const usbDevice = await (navigator as any).usb.requestDevice({ filters: [] });
      return {
        vendorId: usbDevice.vendorId,
        productId: usbDevice.productId,
        productName: usbDevice.productName,
        manufacturerName: usbDevice.manufacturerName,
      };
    } catch (e: any) {
      if (e.name === 'NotFoundError') {
        return null;
      }
      throw e;
    }
  }
}

export const mediaDeviceService = new MediaDeviceService();
