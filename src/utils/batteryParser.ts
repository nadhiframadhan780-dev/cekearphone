import { BatteryV11Details } from '../types/device';

/**
 * Parses 0x2A19 (Battery Level) characteristic.
 * Expected: 1 byte uint8 (0-100%).
 */
export function parseBatteryLevel(dataView: DataView): number {
  if (dataView.byteLength < 1) {
    throw new Error('DataView buffer terlalu pendek untuk Battery Level (0x2A19)');
  }
  const level = dataView.getUint8(0);
  if (level > 100) {
    throw new Error(`Nilai persentase baterai tidak valid: ${level}% (maksimum 100%)`);
  }
  return level;
}

/**
 * Parses 0x2BED (Battery Level Status) characteristic (GATT Battery Service v1.1).
 * Byte 0: Battery Level (0-100, 0xFF = not available).
 * Byte 1: Flags:
 *   Bit 0-1: Charging state (00 = unknown, 01 = charging, 10 = discharging, 11 = full)
 *   Bit 2: Battery fault (0 = no fault, 1 = fault present)
 *   Bit 3: Service required (0 = no, 1 = yes)
 */
export function parseBatteryLevelStatus(dataView: DataView): {
  level: number | null;
  details: BatteryV11Details['batteryLevelStatus'];
} {
  if (dataView.byteLength < 2) {
    throw new Error('DataView buffer terlalu pendek untuk Battery Level Status (0x2BED)');
  }
  const rawLevel = dataView.getUint8(0);
  const flags = dataView.getUint8(1);

  const level = rawLevel <= 100 ? rawLevel : null;
  const chargingBits = flags & 0x03;
  let chargingState: 'unknown' | 'charging' | 'discharging' | 'full' = 'unknown';
  if (chargingBits === 1) chargingState = 'charging';
  else if (chargingBits === 2) chargingState = 'discharging';
  else if (chargingBits === 3) chargingState = 'full';

  const faultPresent = Boolean(flags & (1 << 2));
  const serviceRequired = Boolean(flags & (1 << 3));

  return {
    level,
    details: {
      chargingState,
      faultPresent,
      serviceRequired,
    },
  };
}

/**
 * Parses 0x2BEA (Battery Health Status) (GATT Battery Service v1.1).
 * Byte 0: Health percent (0-100, 0xFF = not available)
 * Byte 1-2 (optional): Cycle count uint16 little endian
 */
export function parseBatteryHealthStatus(dataView: DataView): {
  healthPercent?: number;
  cycleCount?: number;
} {
  if (dataView.byteLength < 1) {
    throw new Error('DataView buffer terlalu pendek untuk Battery Health Status (0x2BEA)');
  }
  const rawHealth = dataView.getUint8(0);
  const healthPercent = rawHealth <= 100 ? rawHealth : undefined;

  let cycleCount: number | undefined;
  if (dataView.byteLength >= 3) {
    cycleCount = dataView.getUint16(1, true);
  }

  return { healthPercent, cycleCount };
}

/**
 * Parses 0x2A50 (PnP ID) characteristic (GATT Device Information Service).
 * Byte 0: Vendor ID Source (1 = Bluetooth SIG, 2 = USB Implementers Forum)
 * Byte 1-2: Vendor ID (uint16 little-endian)
 * Byte 3-4: Product ID (uint16 little-endian)
 * Byte 5-6: Product Version (uint16 little-endian)
 */
export function parsePnpId(dataView: DataView): {
  vendorIdSource: number;
  vendorId: number;
  productId: number;
  productVersion: number;
} {
  if (dataView.byteLength < 7) {
    throw new Error('DataView buffer terlalu pendek untuk PnP ID (0x2A50)');
  }
  return {
    vendorIdSource: dataView.getUint8(0),
    vendorId: dataView.getUint16(1, true),
    productId: dataView.getUint16(3, true),
    productVersion: dataView.getUint16(5, true),
  };
}

/**
 * Safe string decoder for GATT Device Information characteristics.
 */
export function parseGattString(dataView: DataView): string {
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(dataView.buffer).replace(/\0/g, '').trim();
}
