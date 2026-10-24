import {
  DeviceInfo,
  BatteryReading,
  BatteryV11Details,
  GattCharacteristicInfo,
} from '../types/device';
import {
  parseBatteryLevel,
  parseBatteryLevelStatus,
  parseBatteryHealthStatus,
  parsePnpId,
  parseGattString,
} from '../utils/batteryParser';
import { identifyBrandAndModel } from '../utils/deviceBrands';

export interface BluetoothCallbacks {
  onDeviceConnected: (device: DeviceInfo) => void;
  onDeviceDisconnected: (reason: string) => void;
  onBatteryUpdated: (reading: BatteryReading, v11?: BatteryV11Details) => void;
  onRssiUpdated?: (rssi: number) => void;
  onLog: (msg: string, level?: 'info' | 'warn' | 'error') => void;
}

export class BluetoothService {
  private device: any = null;
  private server: any = null;
  private batteryChar: any = null;
  private pollingTimer: any = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;
  private isIntentionalDisconnect: boolean = false;
  private callbacks: BluetoothCallbacks | null = null;
  private disconnectCount: number = 0;

  // Standard UUIDs
  public static readonly UUID_BATTERY_SERVICE = 'battery_service';
  public static readonly UUID_BATTERY_LEVEL = '00002a19-0000-1000-8000-00805f9b34fb';
  public static readonly UUID_BATTERY_LEVEL_STATUS = '00002bed-0000-1000-8000-00805f9b34fb';
  public static readonly UUID_BATTERY_HEALTH_STATUS = '00002bea-0000-1000-8000-00805f9b34fb';
  public static readonly UUID_BATTERY_HEALTH_INFO = '00002beb-0000-1000-8000-00805f9b34fb';
  public static readonly UUID_DEVICE_INFO_SERVICE = 'device_information';
  public static readonly UUID_MANUFACTURER_NAME = '00002a29-0000-1000-8000-00805f9b34fb';
  public static readonly UUID_MODEL_NUMBER = '00002a24-0000-1000-8000-00805f9b34fb';
  public static readonly UUID_SERIAL_NUMBER = '00002a25-0000-1000-8000-00805f9b34fb';
  public static readonly UUID_HARDWARE_REVISION = '00002a27-0000-1000-8000-00805f9b34fb';
  public static readonly UUID_FIRMWARE_REVISION = '00002a26-0000-1000-8000-00805f9b34fb';
  public static readonly UUID_SOFTWARE_REVISION = '00002a28-0000-1000-8000-00805f9b34fb';
  public static readonly UUID_PNP_ID = '00002a50-0000-1000-8000-00805f9b34fb';

  public static readonly OPTIONAL_SERVICES = [
    'battery_service',
    'device_information',
    '00001800-0000-1000-8000-00805f9b34fb', // Generic Access
    '00001801-0000-1000-8000-00805f9b34fb', // Generic Attribute
  ];

  public setCallbacks(cb: BluetoothCallbacks) {
    this.callbacks = cb;
  }

  private log(msg: string, level: 'info' | 'warn' | 'error' = 'info') {
    if (this.callbacks?.onLog) {
      this.callbacks.onLog(msg, level);
    }
  }

  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  /**
   * Scans for previously permitted devices via navigator.bluetooth.getDevices() if supported.
   */
  public async getPermittedDevices(): Promise<any[]> {
    if (this.isSupported() && 'getDevices' in (navigator as any).bluetooth) {
      try {
        return await (navigator as any).bluetooth.getDevices();
      } catch (e) {
        console.warn('getDevices tidak didukung:', e);
      }
    }
    return [];
  }

  /**
   * Connect to Bluetooth earphone.
   * mode: 'all' (acceptAllDevices) or 'battery_filter' (only with battery_service)
   */
  public async requestDevice(mode: 'all' | 'battery_filter' = 'all'): Promise<DeviceInfo> {
    if (!this.isSupported()) {
      throw new Error('Web Bluetooth API tidak didukung oleh browser Anda. Gunakan Google Chrome, Microsoft Edge, atau Opera.');
    }

    const options: any = {
      optionalServices: BluetoothService.OPTIONAL_SERVICES,
    };

    if (mode === 'all') {
      options.acceptAllDevices = true;
    } else {
      options.filters = [{ services: [BluetoothService.UUID_BATTERY_SERVICE] }];
    }

    this.log(`Membuka pemilih Bluetooth (Mode: ${mode === 'all' ? 'Semua Perangkat' : 'Filter Battery Service'})...`);
    
    try {
      this.device = await (navigator as any).bluetooth.requestDevice(options);
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        throw new Error('Pemilihan perangkat dibatalkan atau tidak ada earphone yang dipilih.');
      } else if (err.name === 'SecurityError') {
        throw new Error('Akses Bluetooth ditolak oleh kebijakan keamanan browser (pastikan konteks HTTPS).');
      }
      throw err;
    }

    this.isIntentionalDisconnect = false;
    this.device.addEventListener('gattserverdisconnected', this.handleDisconnected);

    // Watch advertisements for RSSI if supported
    if ('watchAdvertisements' in this.device) {
      try {
        await this.device.watchAdvertisements();
        this.device.addEventListener('advertisementreceived', (event: any) => {
          if (event.rssi && this.callbacks?.onRssiUpdated) {
            this.callbacks.onRssiUpdated(event.rssi);
          }
        });
      } catch (e) {
        this.log('watchAdvertisements tidak didukung oleh OS/browser ini', 'warn');
      }
    }

    return await this.connectGatt();
  }

  private handleDisconnected = () => {
    this.disconnectCount++;
    this.log(`Perangkat Bluetooth terputus (Total putus: ${this.disconnectCount}).`, 'warn');
    if (this.callbacks?.onDeviceDisconnected) {
      this.callbacks.onDeviceDisconnected('Koneksi GATT terputus');
    }

    if (!this.isIntentionalDisconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = Math.pow(2, this.reconnectAttempts) * 1000;
      this.reconnectAttempts++;
      this.log(`Mencoba menyambung kembali (${this.reconnectAttempts}/${this.maxReconnectAttempts}) dalam ${delay / 1000} detik...`);
      setTimeout(() => {
        this.connectGatt().catch((e) => this.log(`Gagal menyambung kembali: ${e.message}`, 'error'));
      }, delay);
    }
  };

  public async connectGatt(): Promise<DeviceInfo> {
    if (!this.device || !this.device.gatt) {
      throw new Error('Objek perangkat Bluetooth tidak valid.');
    }

    this.log(`Menghubungkan ke GATT server: ${this.device.name || 'Perangkat Tanpa Nama'}...`);
    this.server = await this.device.gatt.connect();
    this.reconnectAttempts = 0;
    this.log('Berhasil terhubung ke GATT server.');

    // Build initial DeviceInfo
    const rawName = this.device.name || 'Earphone Bluetooth';
    const brandInfo = identifyBrandAndModel(rawName);

    const deviceInfo: DeviceInfo = {
      id: this.device.id,
      name: rawName,
      sourceOfName: 'gatt',
      allNameSources: {
        gattName: rawName,
      },
      brand: brandInfo.brand,
      model: brandInfo.model,
      connectionType: 'ble',
      audioProfile: 'stereo',
      connected: true,
      disconnectCount: this.disconnectCount,
    };

    // Read Device Information Service (0x180A)
    await this.readDeviceInfoService(deviceInfo);

    // Read and subscribe to Battery Service (0x180F)
    await this.setupBatteryService();

    if (this.callbacks?.onDeviceConnected) {
      this.callbacks.onDeviceConnected(deviceInfo);
    }

    return deviceInfo;
  }

  private async readDeviceInfoService(info: DeviceInfo) {
    if (!this.server) return;

    try {
      const devInfoService = await this.server.getPrimaryService(BluetoothService.UUID_DEVICE_INFO_SERVICE);

      // Manufacturer Name
      try {
        const char = await devInfoService.getCharacteristic(BluetoothService.UUID_MANUFACTURER_NAME);
        const val = await char.readValue();
        info.manufacturerName = parseGattString(val);
        if (info.manufacturerName && !info.brand) {
          const matched = identifyBrandAndModel(info.manufacturerName);
          info.brand = matched.brand || info.manufacturerName;
        }
      } catch {
        // characteristic not present
      }

      // Model Number
      try {
        const char = await devInfoService.getCharacteristic(BluetoothService.UUID_MODEL_NUMBER);
        const val = await char.readValue();
        info.modelNumber = parseGattString(val);
        if (info.modelNumber && !info.model) {
          info.model = info.modelNumber;
        }
      } catch {
        // not present
      }

      // Firmware Revision
      try {
        const char = await devInfoService.getCharacteristic(BluetoothService.UUID_FIRMWARE_REVISION);
        const val = await char.readValue();
        info.firmwareRevision = parseGattString(val);
      } catch {
        // not present
      }

      // Hardware Revision
      try {
        const char = await devInfoService.getCharacteristic(BluetoothService.UUID_HARDWARE_REVISION);
        const val = await char.readValue();
        info.hardwareRevision = parseGattString(val);
      } catch {
        // not present
      }

      // Software Revision
      try {
        const char = await devInfoService.getCharacteristic(BluetoothService.UUID_SOFTWARE_REVISION);
        const val = await char.readValue();
        info.softwareRevision = parseGattString(val);
      } catch {
        // not present
      }

      // PnP ID
      try {
        const char = await devInfoService.getCharacteristic(BluetoothService.UUID_PNP_ID);
        const val = await char.readValue();
        info.pnpId = parsePnpId(val);
        if (info.pnpId.vendorId) {
          const brandMatch = identifyBrandAndModel('', info.pnpId.vendorId);
          if (brandMatch.brand) {
            info.brand = brandMatch.brand;
          }
        }
      } catch {
        // not present
      }
    } catch (e: any) {
      this.log('Device Information Service (0x180A) tidak diekspos oleh earphone ini', 'warn');
    }
  }

  private async setupBatteryService() {
    if (!this.server) return;

    try {
      const batService = await this.server.getPrimaryService(BluetoothService.UUID_BATTERY_SERVICE);

      // Battery Level (0x2A19)
      try {
        this.batteryChar = await batService.getCharacteristic(BluetoothService.UUID_BATTERY_LEVEL);
        const val = await this.batteryChar.readValue();
        const level = parseBatteryLevel(val);

        // Try parsing Battery Level Status v1.1 (0x2BED) if available
        let v11Details: BatteryV11Details | undefined;
        try {
          const statusChar = await batService.getCharacteristic(BluetoothService.UUID_BATTERY_LEVEL_STATUS);
          const statusVal = await statusChar.readValue();
          const parsed = parseBatteryLevelStatus(statusVal);
          v11Details = { batteryLevelStatus: parsed.details };
        } catch {
          // not v1.1
        }

        // Try parsing Battery Health Status (0x2BEA)
        try {
          const healthChar = await batService.getCharacteristic(BluetoothService.UUID_BATTERY_HEALTH_STATUS);
          const healthVal = await healthChar.readValue();
          const healthParsed = parseBatteryHealthStatus(healthVal);
          v11Details = {
            ...v11Details,
            batteryHealthStatus: healthParsed,
          };
        } catch {
          // not present
        }

        this.notifyBattery({
          timestamp: Date.now(),
          level,
          source: 'DEVICE',
        }, v11Details);

        // Start live notifications
        try {
          await this.batteryChar.startNotifications();
          this.batteryChar.addEventListener('characteristicvaluechanged', (event: any) => {
            const updated = parseBatteryLevel(event.target.value);
            this.notifyBattery({
              timestamp: Date.now(),
              level: updated,
              source: 'DEVICE',
            });
          });
          this.log('Langganan notifikasi perubahan baterai live (0x2A19) aktif.');
        } catch (e) {
          this.log('Notifikasi live tidak diizinkan, mengaktifkan polling interval 30 dtk.', 'warn');
          this.startPollingBattery();
        }
      } catch (e: any) {
        this.log(`Gagal membaca karakteristik Battery Level: ${e.message}`, 'error');
      }
    } catch (e) {
      this.log('Layanan Battery Service (0x180F) tidak ditemukan pada earphone ini. Banyak TWS (AirPods, Galaxy Buds) menyembunyikan baterai pada protokol tertutup. Gunakan Uji Daya Tahan untuk estimasi.', 'warn');
    }
  }

  private startPollingBattery() {
    this.stopPollingBattery();
    this.pollingTimer = setInterval(async () => {
      if (this.batteryChar) {
        try {
          const val = await this.batteryChar.readValue();
          const level = parseBatteryLevel(val);
          this.notifyBattery({
            timestamp: Date.now(),
            level,
            source: 'DEVICE',
          });
        } catch {
          // error during poll
        }
      }
    }, 30000);
  }

  private stopPollingBattery() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  private notifyBattery(reading: BatteryReading, v11?: BatteryV11Details) {
    if (this.callbacks?.onBatteryUpdated) {
      this.callbacks.onBatteryUpdated(reading, v11);
    }
  }

  /**
   * Advanced Read-Only GATT Explorer: Enumerates all accessible services and characteristics.
   */
  public async exploreGatt(): Promise<GattCharacteristicInfo[]> {
    if (!this.server) {
      throw new Error('GATT server belum terhubung.');
    }

    const results: GattCharacteristicInfo[] = [];

    try {
      const services = await this.server.getPrimaryServices();
      for (const s of services) {
        try {
          const chars = await s.getCharacteristics();
          for (const c of chars) {
            let hex = '';
            let parsed = '';
            let error = '';

            if (c.properties.read) {
              try {
                const val = await c.readValue();
                const bytes = new Uint8Array(val.buffer);
                hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
                parsed = parseGattString(val);
              } catch (err: any) {
                if (c.uuid.includes('2a25')) {
                  error = 'Tidak tersedia (dibatasi browser)';
                } else {
                  error = err.message || 'Gagal dibaca';
                }
              }
            }

            results.push({
              serviceUuid: s.uuid,
              serviceName: this.getServiceName(s.uuid),
              uuid: c.uuid,
              name: this.getCharName(c.uuid),
              properties: {
                read: Boolean(c.properties.read),
                write: Boolean(c.properties.write || c.properties.writeWithoutResponse),
                notify: Boolean(c.properties.notify),
                indicate: Boolean(c.properties.indicate),
              },
              valueHex: hex || undefined,
              valueParsed: parsed || undefined,
              readError: error || undefined,
            });
          }
        } catch {
          // characteristic enum error
        }
      }
    } catch (e: any) {
      throw new Error(`Gagal membaca services GATT: ${e.message}`);
    }

    return results;
  }

  private getServiceName(uuid: string): string {
    if (uuid.includes('180f')) return 'Battery Service (0x180F)';
    if (uuid.includes('180a')) return 'Device Information (0x180A)';
    if (uuid.includes('1800')) return 'Generic Access (0x1800)';
    if (uuid.includes('1801')) return 'Generic Attribute (0x1801)';
    return uuid;
  }

  private getCharName(uuid: string): string {
    if (uuid.includes('2a19')) return 'Battery Level (0x2A19)';
    if (uuid.includes('2bed')) return 'Battery Level Status (0x2BED)';
    if (uuid.includes('2bea')) return 'Battery Health Status (0x2BEA)';
    if (uuid.includes('2beb')) return 'Battery Health Info (0x2BEB)';
    if (uuid.includes('2a29')) return 'Manufacturer Name (0x2A29)';
    if (uuid.includes('2a24')) return 'Model Number (0x2A24)';
    if (uuid.includes('2a25')) return 'Serial Number (0x2A25 - Terbatas)';
    if (uuid.includes('2a26')) return 'Firmware Revision (0x2A26)';
    if (uuid.includes('2a27')) return 'Hardware Revision (0x2A27)';
    if (uuid.includes('2a28')) return 'Software Revision (0x2A28)';
    if (uuid.includes('2a50')) return 'PnP ID (0x2A50)';
    return uuid;
  }

  public disconnect() {
    this.isIntentionalDisconnect = true;
    this.stopPollingBattery();
    if (this.device && this.device.gatt && this.device.gatt.connected) {
      this.device.gatt.disconnect();
    }
    this.server = null;
    this.device = null;
    this.batteryChar = null;
  }
}

export const bluetoothService = new BluetoothService();
