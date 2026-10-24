/**
 * Bluetooth SIG Assigned Numbers Company Identifiers (Vendor IDs) and brand heuristics
 */
export const KNOWN_AUDIO_VENDORS: Record<number, string> = {
  0x004C: 'Apple',
  0x0075: 'Samsung',
  0x012D: 'Sony',
  0x0057: 'Harman / JBL',
  0x009E: 'Bose',
  0x019A: 'Sennheiser',
  0x031B: 'Anker / Soundcore',
  0x038F: 'Xiaomi',
  0x03EA: 'Realme',
  0x04F2: 'Oppo',
  0x027D: 'Huawei',
  0x0236: 'Edifier',
  0x052B: 'Baseus',
  0x05E2: 'QCY (Dongguan Hele)',
  0x0067: 'Jabra (GN Netcom)',
  0x0499: 'Logitech',
  0x05A7: 'Razer',
  0x0664: 'HyperX (HP)',
  0x0171: 'Google',
  0x0006: 'Microsoft',
  0x000A: 'Qualcomm',
};

export const POPULAR_AUDIO_BRANDS = [
  'Sony',
  'Apple',
  'Samsung',
  'JBL',
  'Bose',
  'Sennheiser',
  'Soundcore',
  'Anker',
  'Edifier',
  'QCY',
  'Baseus',
  'Xiaomi',
  'Redmi',
  'Realme',
  'Oppo',
  'Huawei',
  'Jabra',
  'Logitech',
  'Razer',
  'HyperX',
  'Audio-Technica',
  'Skullcandy',
  'Beats',
  'Beyerdynamic',
  'Marshall',
  'Shure',
  'KZ Acoustics',
  'Moondrop',
  'Tangzu',
  'FiiO',
];

/**
 * Tries to identify brand and clean model name from raw strings.
 */
export function identifyBrandAndModel(rawName: string, vendorId?: number): { brand?: string; model?: string } {
  if (vendorId && KNOWN_AUDIO_VENDORS[vendorId]) {
    return {
      brand: KNOWN_AUDIO_VENDORS[vendorId],
      model: rawName,
    };
  }

  if (!rawName) return {};

  const lower = rawName.toLowerCase();
  for (const brand of POPULAR_AUDIO_BRANDS) {
    if (lower.includes(brand.toLowerCase())) {
      // Remove brand name from model string if clean
      const regex = new RegExp(brand, 'i');
      const model = rawName.replace(regex, '').trim().replace(/^[-_:\s]+/, '');
      return {
        brand,
        model: model || rawName,
      };
    }
  }

  return { model: rawName };
}
