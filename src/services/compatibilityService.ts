export interface FeatureCheck {
  id: string;
  name: string;
  supported: boolean;
  statusText: string;
  explanation: string;
  advice: string;
  mandatoryFor: string[];
}

export function checkSystemCompatibility(): FeatureCheck[] {
  const isSecure = typeof window !== 'undefined' && window.isSecureContext;
  const hasBluetooth = typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  const hasUsb = typeof navigator !== 'undefined' && 'usb' in navigator;
  const hasHid = typeof navigator !== 'undefined' && 'hid' in navigator;
  const hasMediaDevices = typeof navigator !== 'undefined' && 'mediaDevices' in navigator && !!navigator.mediaDevices.enumerateDevices;
  const hasSetSinkId = typeof HTMLMediaElement !== 'undefined' && (
    'setSinkId' in HTMLMediaElement.prototype || 
    (typeof AudioContext !== 'undefined' && 'setSinkId' in AudioContext.prototype)
  );
  const hasAudioWorklet = typeof AudioContext !== 'undefined' && 'audioWorklet' in AudioContext.prototype;
  const hasWakeLock = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  const hasMediaSession = typeof navigator !== 'undefined' && 'mediaSession' in navigator;
  const hasIndexedDb = typeof indexedDB !== 'undefined';

  return [
    {
      id: 'secureContext',
      name: 'Secure Context (HTTPS / Localhost)',
      supported: isSecure,
      statusText: isSecure ? 'Tersedia (Aman)' : 'Tidak Tersedia',
      explanation: 'Web Bluetooth, WebUSB, dan Web Audio memerlukan koneksi HTTPS atau localhost demi keamanan data.',
      advice: isSecure ? 'Lingkungan aman untuk semua API perangkat.' : 'Buka situs ini lewat HTTPS atau http://localhost:3000.',
      mandatoryFor: ['Semua Fitur'],
    },
    {
      id: 'bluetooth',
      name: 'Web Bluetooth API (navigator.bluetooth)',
      supported: hasBluetooth,
      statusText: hasBluetooth ? 'Tersedia' : 'Tidak Didukung Browser Ini',
      explanation: 'Digunakan untuk menghubungkan BLE GATT earphone, membaca Device Information dan Battery Service (0x180F).',
      advice: hasBluetooth
        ? 'Dukungan penuh terdeteksi.'
        : 'Gunakan browser Chromium desktop (Google Chrome, Microsoft Edge, Opera, Brave). Firefox dan Safari tidak mengizinkan Web Bluetooth.',
      mandatoryFor: ['Jalur Bluetooth', 'Baterai Live'],
    },
    {
      id: 'mediaDevices',
      name: 'Media Devices API (enumerateDevices & getUserMedia)',
      supported: hasMediaDevices,
      statusText: hasMediaDevices ? 'Tersedia' : 'Tidak Didukung',
      explanation: 'Mendeteksi daftar perangkat audio (speaker, jack 3.5mm, USB DAC, mikrofon) dan mendeteksi colok/cabut kabel real-time.',
      advice: 'Izinkan akses mikrofon saat diminta agar browser dapat menampilkan nama asli perangkat di daftar.',
      mandatoryFor: ['Jalur Kabel', 'Uji Mikrofon', 'Deteksi Colok/Cabut'],
    },
    {
      id: 'setSinkId',
      name: 'Audio Output Routing (setSinkId)',
      supported: hasSetSinkId,
      statusText: hasSetSinkId ? 'Tersedia' : 'Terbatas (Default OS)',
      explanation: 'Mengarahkan suara uji khusus ke earphone terpilih tanpa memutar ke speaker bawaan laptop.',
      advice: hasSetSinkId
        ? 'Aplikasi dapat memilih earphone target secara presisi.'
        : 'Browser Anda memutar audio ke output default sistem. Pastikan earphone Anda disetel sebagai "Default Audio Output" di Windows/macOS/Linux.',
      mandatoryFor: ['Uji Audio Terarah'],
    },
    {
      id: 'audioWorklet',
      name: 'Web Audio API & AudioWorklet',
      supported: hasAudioWorklet,
      statusText: hasAudioWorklet ? 'Tersedia' : 'AudioContext Dasar',
      explanation: 'Pemrosesan sinyal digital (DSP) audio presisi tinggi untuk sweep sinus, noise generator, dan analisis Goertzel/FFT.',
      advice: 'Aktif di semua browser modern.',
      mandatoryFor: ['Uji Akustik L/R', 'Generator Suara', 'Deteksi THD'],
    },
    {
      id: 'wakeLock',
      name: 'Screen Wake Lock API',
      supported: hasWakeLock,
      statusText: hasWakeLock ? 'Tersedia' : 'Tidak Didukung',
      explanation: 'Mencegah laptop masuk mode tidur/layar mati selama Uji Daya Tahan Baterai (pink noise endurance test) berjalan.',
      advice: hasWakeLock ? 'Layar akan tetap menyala selama tes baterai.' : 'Atur power sleep timeout laptop secara manual bila tes durasi panjang.',
      mandatoryFor: ['Uji Daya Tahan'],
    },
    {
      id: 'mediaSession',
      name: 'Media Session API',
      supported: hasMediaSession,
      statusText: hasMediaSession ? 'Tersedia' : 'Tidak Didukung',
      explanation: 'Mendeteksi penekanan tombol fisik/sentuh pada earphone (play/pause/next/prev/volume).',
      advice: 'Didukung di Google Chrome, Edge, dan browser modern.',
      mandatoryFor: ['Uji Tombol & Kontrol'],
    },
    {
      id: 'usb',
      name: 'WebUSB API (navigator.usb)',
      supported: hasUsb,
      statusText: hasUsb ? 'Tersedia' : 'Tidak Didukung',
      explanation: 'Pelengkap opsional untuk mengidentifikasi Vendor ID & Product ID DAC USB-C/USB-A. (Catatan jujur: WebUSB tidak dapat meng-claim interface audio yang sedang dipakai OS).',
      advice: 'Hanya sebagai opsi pelengkap info DAC USB bila didukung.',
      mandatoryFor: ['Info Tambahan USB'],
    },
    {
      id: 'hid',
      name: 'WebHID API (navigator.hid)',
      supported: hasHid,
      statusText: hasHid ? 'Tersedia' : 'Tidak Didukung',
      explanation: 'Membaca tombol kontrol headset kantor/call-center USB (mute LED, call button).',
      advice: 'Opsi pelengkap untuk headset bertombol HID.',
      mandatoryFor: ['Tombol Lanjutan'],
    },
    {
      id: 'indexedDB',
      name: 'IndexedDB Offline Storage',
      supported: hasIndexedDb,
      statusText: hasIndexedDb ? 'Tersedia' : 'Tidak Didukung',
      explanation: 'Menyimpan riwayat pembacaan baterai dan laporan hasil uji di laptop secara 100% lokal tanpa upload ke internet.',
      advice: 'Semua data tersimpan aman dan privat di browser Anda.',
      mandatoryFor: ['Penyimpanan Lokal', 'Riwayat Pengujian'],
    },
  ];
}
