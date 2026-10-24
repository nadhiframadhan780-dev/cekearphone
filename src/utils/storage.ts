import { BatteryReading, DeviceInfo, DeviceScoreResult } from '../types/device';

const DB_NAME = 'EarCheck_DB';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB tidak didukung oleh browser ini.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('battery_readings')) {
        const batteryStore = db.createObjectStore('battery_readings', { keyPath: 'id', autoIncrement: true });
        batteryStore.createIndex('deviceId', 'deviceId', { unique: false });
        batteryStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      if (!db.objectStoreNames.contains('test_history')) {
        const testStore = db.createObjectStore('test_history', { keyPath: 'id' });
        testStore.createIndex('deviceId', 'deviceId', { unique: false });
        testStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      if (!db.objectStoreNames.contains('device_profiles')) {
        db.createObjectStore('device_profiles', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

export async function saveBatteryReading(deviceId: string, reading: BatteryReading): Promise<void> {
  try {
    const db = await getDb();
    const tx = db.transaction('battery_readings', 'readwrite');
    const store = tx.objectStore('battery_readings');
    store.add({
      deviceId,
      timestamp: reading.timestamp,
      level: reading.level,
      source: reading.source,
      rawFlags: reading.rawFlags,
    });
  } catch (e) {
    console.warn('Gagal menyimpan pembacaan baterai ke IndexedDB:', e);
  }
}

export async function getBatteryReadings(deviceId: string): Promise<BatteryReading[]> {
  try {
    const db = await getDb();
    return new Promise((resolve) => {
      const tx = db.transaction('battery_readings', 'readonly');
      const store = tx.objectStore('battery_readings');
      const index = store.index('deviceId');
      const req = index.getAll(deviceId);
      req.onsuccess = () => {
        const results = (req.result || []) as Array<{ timestamp: number; level: number; source: BatteryReading['source']; rawFlags?: number }>;
        results.sort((a, b) => a.timestamp - b.timestamp);
        resolve(results.map(r => ({
          timestamp: r.timestamp,
          level: r.level,
          source: r.source,
          rawFlags: r.rawFlags,
        })));
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export interface StoredTestHistory {
  id: string;
  deviceId: string;
  deviceName: string;
  timestamp: number;
  scoreResult: DeviceScoreResult;
  deviceInfo: Partial<DeviceInfo>;
}

export async function saveTestHistory(entry: StoredTestHistory): Promise<void> {
  try {
    const db = await getDb();
    const tx = db.transaction('test_history', 'readwrite');
    tx.objectStore('test_history').put(entry);
  } catch (e) {
    console.warn('Gagal menyimpan riwayat uji:', e);
  }
}

export async function getAllTestHistory(): Promise<StoredTestHistory[]> {
  try {
    const db = await getDb();
    return new Promise((resolve) => {
      const tx = db.transaction('test_history', 'readonly');
      const store = tx.objectStore('test_history');
      const req = store.getAll();
      req.onsuccess = () => {
        const list = (req.result || []) as StoredTestHistory[];
        list.sort((a, b) => b.timestamp - a.timestamp);
        resolve(list);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function clearAllAppData(): Promise<void> {
  try {
    const db = await getDb();
    const tx = db.transaction(['battery_readings', 'test_history', 'device_profiles'], 'readwrite');
    tx.objectStore('battery_readings').clear();
    tx.objectStore('test_history').clear();
    tx.objectStore('device_profiles').clear();
    localStorage.clear();
  } catch (e) {
    console.warn('Gagal membersihkan data:', e);
  }
}
