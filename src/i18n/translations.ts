export type Language = 'id' | 'en';

export const i18n = {
  id: {
    appName: 'EarCheck',
    tagline: 'Diagnostik & Kesehatan Earphone Laptop',
    bluetoothTab: 'Bluetooth (Nirkabel)',
    wiredTab: 'Kabel (Jack / USB)',
    modeDemoActive: 'MODE DEMO AKTIF',
    simulatedBanner: 'DATA SIMULASI — Menggunakan data tiruan untuk pengujian UI tanpa menghubungkan perangkat fisik.',
    turnOffDemo: 'Matikan Demo',
    turnOnDemo: 'Coba Mode Demo',
    
    // Safety
    masterVolume: 'Volume Master',
    safeVolumeLimit: 'Batas Aman Default (Maks 70%)',
    softStartNotice: 'Soft-start aktif (suara naik bertahap ±1.5 dtk)',
    emergencyStop: 'STOP SUARA (DARURAT)',
    playingTo: 'Suara dialihkan ke',
    playingToDefault: 'Default Sistem / Speaker Laptop',
    speakerNotice: 'Catatan: Pastikan output sudah tertuju ke earphone Anda agar tidak mengejutkan speaker laptop.',
    
    // Tabs
    tabDevice: 'Identitas & Profil',
    tabBattery: 'Kesehatan Baterai',
    tabAudio: 'Uji Audio Output',
    tabMic: 'Uji Mikrofon',
    tabControls: 'Uji Tombol',
    tabReport: 'Skor & Rekomendasi',
    
    // Source Tags
    sourceDevice: 'TERBACA DARI PERANGKAT',
    sourceTest: 'HASIL UJI',
    sourceEstimate: 'ESTIMASI',
    sourceUnavailable: 'TIDAK TERSEDIA',
    
    // Source Tag Tooltips
    tooltipDevice: 'Nilai asli yang dibaca langsung dari earphone via Bluetooth GATT atau MediaDevices.',
    tooltipTest: 'Hasil pengukuran aktual yang dijalankan lewat aplikasi ini.',
    tooltipEstimate: 'Nilai yang diperkirakan secara matematis (dengan rentang ketidakpastian dan keyakinan).',
    tooltipUnavailable: 'Tidak disediakan oleh perangkat atau dibatasi oleh izin/kebijakan keamanan browser.',
    
    // Compatibility
    checkCompat: 'Cek Kompatibilitas Sistem',
    browserSupportTitle: 'Dukungan Browser & Web API',
    whyNeedBluetooth: 'Dibutuhkan untuk membaca nama model, versi firmware, dan persentase baterai via BLE GATT.',
    whyNeedMic: 'Dibutuhkan untuk uji frekuensi akustik loopback dan pengujian kualitas mikrofon earphone.',
    whyNeedAudio: 'Dibutuhkan untuk membangkitkan nada uji, pink noise daya tahan, dan perutean setSinkId.',
    
    // Battery
    batteryLevel: 'Tingkat Baterai',
    drainRate: 'Laju Kuras',
    remainingTime: 'Sisa Waktu Pakai',
    effectiveCapacity: 'Estimasi Kapasitas Efektif',
    enduranceTest: 'Uji Daya Tahan (Endurance Test)',
    enduranceDesc: 'Memutar pink noise pada volume tetap untuk menghitung laju kuras baterai aktual dan membandingkannya dengan spek pabrik.',
    factorySpecPrompt: 'Durasi Klaim Pabrik (Jam)',
    startEndurance: 'Mulai Uji Daya Tahan',
    stopEndurance: 'Hentikan Uji Daya Tahan',
    wakeLockActive: 'Screen Wake Lock Aktif (Layar dicegah tidur selama tes)',
    
    // Audio
    lrTestTitle: '1. Uji Kanal Kiri & Kanan (L/R)',
    lrDesc: 'Pastikan orientasi suara terdengar di earpiece yang benar.',
    playLeft: 'Putar Kiri (L)',
    playRight: 'Putar Kanan (R)',
    playBoth: 'Putar Keduanya',
    confirmLeft: 'Hanya Kiri',
    confirmRight: 'Hanya Kanan',
    confirmBoth: 'Keduanya Normal',
    confirmNone: 'Tidak Terdengar',
    
    acousticTestTitle: '2. Uji Akustik Otomatis (Mikrofon Bawaan Laptop)',
    acousticDesc: 'Dekatkan earpiece secara bergantian ke mikrofon internal laptop Anda untuk mengukur respons frekuensi (50Hz - 16kHz) dan selisih level L vs R.',
    startAcoustic: 'Mulai Uji Akustik Otomatis',
    
    sweepTitle: '3. Sweep Frekuensi & Generator Nada',
    manualFreq: 'Frekuensi Manual',
    whiteNoise: 'White Noise',
    pinkNoise: 'Pink Noise',
    
    phaseTitle: '4. Uji Polaritas & Fase Kanal',
    inPhase: 'In-Phase (Fase Normal)',
    outOfPhase: 'Out-of-Phase (Fase Terbalik 180°)',
    
    cableTestTitle: '5. Uji Goyang Kabel (Wiggle Test)',
    cableDesc: 'Goyang atau tekuk pangkal kabel/jack untuk mendeteksi suara gemeretak atau kontak yang longgar.',
    startCableTest: 'Mulai Uji Kabel',
    markIntermittent: 'Tandai Gangguan Suara',
    
    latencyTitle: '6. Uji Latensi & Sinkron A/V',
    flashTapDesc: 'Ketuk tombol tepat saat kilatan visual dan bunyi klik terdengar bersamaan.',
    
    speakerCleaner: '7. Mode Pembersih Debu/Air Membran (130-165 Hz Pulsasi)',
    speakerCleanerWarn: 'Catatan: Menggetarkan membran driver speaker dengan getaran frekuensi rendah. Hasil bergantung pada kondisi fisik kisi-kisi.',
    
    // Mic
    micNoticeHfp: 'Peringatan Profil: Mengaktifkan mikrofon Bluetooth akan mengalihkan koneksi ke profil HFP (kualitas audio speaker menurun sementara). Dianjurkan menguji audio output terlebih dahulu.',
    recordMic: 'Rekam Suara (5 Detik)',
    playbackRecord: 'Putar Ulang Rekaman',
    liveMeter: 'VU Meter Real-time (dBFS)',
    
    // Buttons
    buttonListening: 'Mendengarkan Kontrol Media Session...',
    buttonHint: 'Tekan tombol play/pause/volume pada earphone Anda sekarang.',
    
    // GATT Explorer
    gattExplorerTitle: 'Eksplorasi GATT (Read-Only)',
    
    // Report
    totalScore: 'Skor Kesehatan Total',
    dataCompleteness: 'Kelengkapan Data',
    exportPdf: 'Cetak / Simpan PDF',
    exportJson: 'Ekspor JSON',
    exportCsv: 'Ekspor CSV',
    copySummary: 'Salin Ringkasan',
    copied: 'Tersalin ke Clipboard!',
    clearData: 'Hapus Semua Data Saya',
    assessmentGuide: 'Cara Penilaian & Metrik',
  },
  en: {
    appName: 'EarCheck',
    tagline: 'Laptop Earphone & Headset Health Diagnostic',
    bluetoothTab: 'Bluetooth (Wireless)',
    wiredTab: 'Wired (Jack / USB)',
    modeDemoActive: 'DEMO MODE ACTIVE',
    simulatedBanner: 'SIMULATED DATA — Operating with dummy hardware profiles for interface testing without physical hardware.',
    turnOffDemo: 'Exit Demo',
    turnOnDemo: 'Try Demo Mode',
    
    // Safety
    masterVolume: 'Master Volume',
    safeVolumeLimit: 'Default Safe Limit (Max 70%)',
    softStartNotice: 'Soft-start enabled (sound ramps up over ~1.5s)',
    emergencyStop: 'STOP AUDIO (EMERGENCY)',
    playingTo: 'Sound routed to',
    playingToDefault: 'System Default / Laptop Speakers',
    speakerNotice: 'Notice: Confirm audio is routed to your earphone to prevent surprising laptop speakers.',
    
    // Tabs
    tabDevice: 'Identity & Profile',
    tabBattery: 'Battery Health',
    tabAudio: 'Audio Output Tests',
    tabMic: 'Microphone Test',
    tabControls: 'Button Controls',
    tabReport: 'Score & Advice',
    
    // Source Tags
    sourceDevice: 'READ FROM DEVICE',
    sourceTest: 'TEST RESULT',
    sourceEstimate: 'ESTIMATE',
    sourceUnavailable: 'UNAVAILABLE',
    
    // Source Tag Tooltips
    tooltipDevice: 'Genuine value read directly from the earphone via Bluetooth GATT or MediaDevices.',
    tooltipTest: 'Measured real-time through an active test in this application.',
    tooltipEstimate: 'Calculated mathematically from other data (includes variance range and confidence).',
    tooltipUnavailable: 'Not exposed by device hardware or blocked by browser security policy.',
    
    // Compatibility
    checkCompat: 'Check System Compatibility',
    browserSupportTitle: 'Browser & Web API Support',
    whyNeedBluetooth: 'Required to read model name, firmware revision, and battery level via BLE GATT.',
    whyNeedMic: 'Required for acoustic loopback frequency sweep and microphone quality evaluation.',
    whyNeedAudio: 'Required for test tones, pink noise endurance playback, and setSinkId routing.',
    
    // Battery
    batteryLevel: 'Battery Level',
    drainRate: 'Drain Rate',
    remainingTime: 'Estimated Remaining Time',
    effectiveCapacity: 'Estimated Effective Capacity',
    enduranceTest: 'Battery Endurance Test',
    enduranceDesc: 'Plays constant pink noise at fixed volume to calculate actual battery drain rate versus factory rating.',
    factorySpecPrompt: 'Factory Spec Duration (Hours)',
    startEndurance: 'Start Endurance Test',
    stopEndurance: 'Stop Endurance Test',
    wakeLockActive: 'Screen Wake Lock active (prevents sleep during testing)',
    
    // Audio
    lrTestTitle: '1. Left & Right Channel Test (L/R)',
    lrDesc: 'Verify that audio plays in the intended left/right earpieces.',
    playLeft: 'Play Left (L)',
    playRight: 'Play Right (R)',
    playBoth: 'Play Both',
    confirmLeft: 'Only Left',
    confirmRight: 'Only Right',
    confirmBoth: 'Both Channels OK',
    confirmNone: 'Silent in Both',
    
    acousticTestTitle: '2. Automated Acoustic Sweep (Laptop Mic)',
    acousticDesc: 'Hold each earpiece sequentially next to your laptop internal microphone to measure frequency response (50Hz - 16kHz) and L vs R delta.',
    startAcoustic: 'Start Acoustic Sweep',
    
    sweepTitle: '3. Frequency Sweep & Tone Generator',
    manualFreq: 'Manual Frequency',
    whiteNoise: 'White Noise',
    pinkNoise: 'Pink Noise',
    
    phaseTitle: '4. Channel Polarity & Phase Test',
    inPhase: 'In-Phase (Normal Center Image)',
    outOfPhase: 'Out-of-Phase (180° Inverted)',
    
    cableTestTitle: '5. Cable Wiggle Test',
    cableDesc: 'Gently flex and wiggle the cable near the 3.5mm jack or earpiece to detect crackling or loose contacts.',
    startCableTest: 'Start Cable Test',
    markIntermittent: 'Mark Audio Glitch',
    
    latencyTitle: '6. Audio/Video Latency Tap Test',
    flashTapDesc: 'Tap the button synchronously when the flash and click occur.',
    
    speakerCleaner: '7. Speaker Membrane Cleaner Tone (130-165 Hz Pulsed)',
    speakerCleanerWarn: 'Notice: Vibrates the speaker diaphragm with low-frequency pulses. Effectiveness depends on physical grill cleanliness.',
    
    // Mic
    micNoticeHfp: 'Bluetooth Profile Warning: Activating the Bluetooth microphone will switch connection to HFP profile (output sound quality temporarily drops to mono). We recommend completing audio output tests first.',
    recordMic: 'Record Audio (5 Seconds)',
    playbackRecord: 'Playback Recording',
    liveMeter: 'Live VU Meter (dBFS)',
    
    // Buttons
    buttonListening: 'Listening for Media Session events...',
    buttonHint: 'Press play/pause/volume buttons on your earphone now.',
    
    // GATT Explorer
    gattExplorerTitle: 'GATT Explorer (Read-Only)',
    
    // Report
    totalScore: 'Total Health Score',
    dataCompleteness: 'Data Completeness',
    exportPdf: 'Print / Save PDF',
    exportJson: 'Export JSON',
    exportCsv: 'Export CSV',
    copySummary: 'Copy Summary',
    copied: 'Copied to Clipboard!',
    clearData: 'Clear All My Data',
    assessmentGuide: 'Assessment Methodology',
  },
};
