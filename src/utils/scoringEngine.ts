import {
  BatteryHealthState,
  AudioTestState,
  MicTestState,
  ButtonTestState,
  DeviceInfo,
  DeviceScoreResult,
} from '../types/device';

export interface ScoreWeights {
  battery: number;
  audioOutput: number;
  mic: number;
  connection: number;
  buttons: number;
  cable: number;
}

export const DEFAULT_WEIGHTS: ScoreWeights = {
  battery: 0.30,
  audioOutput: 0.30,
  mic: 0.15,
  connection: 0.15,
  buttons: 0.05,
  cable: 0.05,
};

export function evaluateEarphoneHealth(
  device: DeviceInfo | null,
  battery: BatteryHealthState,
  audio: AudioTestState,
  mic: MicTestState,
  buttons: ButtonTestState,
  customWeights: ScoreWeights = DEFAULT_WEIGHTS
): DeviceScoreResult {
  const recommendations: DeviceScoreResult['recommendations'] = [];

  // 1. BATTERY EVALUATION
  let batteryScore: number | null = null;
  let batteryStatus: 'good' | 'warning' | 'bad' | 'untested' = 'untested';
  let batteryNote = 'Belum diuji';

  if (battery.batteryHealthPercent !== null) {
    // Direct health from 0x2BEA
    batteryScore = battery.batteryHealthPercent;
    if (batteryScore >= 80) {
      batteryStatus = 'good';
      batteryNote = `Kesehatan Baterai Prima (${batteryScore}%)`;
    } else if (batteryScore >= 60) {
      batteryStatus = 'warning';
      batteryNote = `Kesehatan Baterai Menurun (${batteryScore}%)`;
      recommendations.push({
        id: 'rec_bat_deg',
        level: 'warning',
        title: 'Kesehatan Baterai Berkurang',
        desc: `Kesehatan baterai dilaporkan ${batteryScore}%. Waktu pakai harian akan terasa berkurang. Hindari pengisian daya berlebih di tempat panas.`,
      });
    } else {
      batteryStatus = 'bad';
      batteryNote = `Baterai Kritis (${batteryScore}%)`;
      recommendations.push({
        id: 'rec_bat_crit',
        level: 'critical',
        title: 'Perlu Servis / Penggantian Baterai',
        desc: `Kapasitas baterai di bawah 60% (${batteryScore}%). Baterai rentan mati mendadak saat volume dinaikkan.`,
      });
    }
  } else if (battery.effectiveCapacityEstimate !== null) {
    // From Endurance Test
    const cap = battery.effectiveCapacityEstimate;
    batteryScore = Math.min(100, Math.round(cap));
    if (cap >= 80) {
      batteryStatus = 'good';
      batteryNote = `Estimasi Kapasitas Baik (${cap}% spek)`;
    } else if (cap >= 60) {
      batteryStatus = 'warning';
      batteryNote = `Estimasi Kapasitas Menurun (${cap}% spek)`;
      recommendations.push({
        id: 'rec_bat_endur_med',
        level: 'warning',
        title: 'Daya Tahan Baterai Menyusut',
        desc: `Dari uji pink noise, daya tahan baterai tinggal ~${cap}% dibanding spek resmi pabrik (${battery.factorySpecHours} jam).`,
      });
    } else {
      batteryStatus = 'bad';
      batteryNote = `Estimasi Kapasitas Lemah (${cap}% spek)`;
      recommendations.push({
        id: 'rec_bat_endur_low',
        level: 'critical',
        title: 'Baterai Sangat Aus',
        desc: `Daya tahan terukur hanya ~${cap}% dari spek asli pabrik. Pertimbangkan servis baterai atau gunakan mode kabel bila ada.`,
      });
    }
  } else if (battery.drainRatePerHour !== null && battery.drainRatePerHour > 0) {
    // Evaluated from normal drain rate
    const drain = battery.drainRatePerHour;
    if (drain <= 15) {
      batteryScore = 90;
      batteryStatus = 'good';
      batteryNote = `Laju kuras normal (~${drain.toFixed(1)}%/jam)`;
    } else if (drain <= 25) {
      batteryScore = 70;
      batteryStatus = 'warning';
      batteryNote = `Laju kuras agak tinggi (~${drain.toFixed(1)}%/jam)`;
    } else {
      batteryScore = 45;
      batteryStatus = 'bad';
      batteryNote = `Laju kuras sangat boros (~${drain.toFixed(1)}%/jam)`;
      recommendations.push({
        id: 'rec_bat_fast_drain',
        level: 'warning',
        title: 'Laju Kuras Baterai Cepat',
        desc: `Baterai berkurang ${drain.toFixed(1)}% per jam. Matikan ANC bila tidak diperlukan dan periksa apakah firmware earphone sudah versi terbaru.`,
      });
    }
  }

  // 2. AUDIO OUTPUT EVALUATION
  let audioScore: number | null = null;
  let audioStatus: 'good' | 'warning' | 'bad' | 'untested' = 'untested';
  let audioNote = 'Belum diuji';

  if (audio.acousticTestCompleted && audio.acousticResults.length > 0) {
    const maxDelta = audio.acousticMaxDeltaDb ?? 0;
    const dead = audio.acousticDeadChannel;

    if (dead === 'left' || dead === 'right' || dead === 'both') {
      audioScore = 15;
      audioStatus = 'bad';
      audioNote = `Kanal ${dead === 'both' ? 'Kiri & Kanan' : dead} Mati`;
      recommendations.push({
        id: 'rec_audio_dead',
        level: 'critical',
        title: `Kanal ${dead} Tidak Mengeluarkan Suara`,
        desc: 'Periksa sambungan kabel, bersihkan pin konektor, atau periksa apakah driver speaker putus.',
      });
    } else if (maxDelta > 6.0) {
      audioScore = 50;
      audioStatus = 'bad';
      audioNote = `Ketidakseimbangan Berat (Selisih ${maxDelta.toFixed(1)} dB)`;
      recommendations.push({
        id: 'rec_audio_imbalance_severe',
        level: 'critical',
        title: 'Ketidakseimbangan Suara Kanal Kiri & Kanan',
        desc: 'Selisih melebihi 6 dB. Bersihkan mesh grill speaker dengan sikat lembut atau alkohol isopropil 70%. Jika tetap, kemungkinan membran driver kendur atau koil rusak.',
      });
    } else if (maxDelta > 3.0) {
      audioScore = 75;
      audioStatus = 'warning';
      audioNote = `Ketidakseimbangan Ringan (Selisih ${maxDelta.toFixed(1)} dB)`;
      recommendations.push({
        id: 'rec_audio_imbalance_mild',
        level: 'warning',
        title: 'Sedikit Perbedaan Volume L vs R',
        desc: 'Kanal memiliki selisih 3-6 dB. Coba periksa eartip karet apakah terpasang rapat dan bersih dari kotoran telinga.',
      });
    } else {
      audioScore = 95;
      audioStatus = 'good';
      audioNote = `Respons Akustik Seimbang (Delta maks ${maxDelta.toFixed(1)} dB)`;
    }
  } else if (audio.lrBalanceConfirmed !== null) {
    if (audio.lrBalanceConfirmed === 'both') {
      audioScore = 90;
      audioStatus = 'good';
      audioNote = 'Kedua kanal terdengar normal';
    } else if (audio.lrBalanceConfirmed === 'none') {
      audioScore = 10;
      audioStatus = 'bad';
      audioNote = 'Tidak ada suara di kedua kanal';
    } else {
      audioScore = 40;
      audioStatus = 'bad';
      audioNote = `Hanya kanal ${audio.lrBalanceConfirmed} yang berbunyi`;
      recommendations.push({
        id: 'rec_audio_mono_lost',
        level: 'critical',
        title: 'Salah Satu Kanal Hilang',
        desc: 'Pengguna mengonfirmasi salah satu kanal hening saat uji suara terpisah.',
      });
    }
  }

  // 3. MICROPHONE EVALUATION
  let micScore: number | null = null;
  let micStatus: 'good' | 'warning' | 'bad' | 'untested' = 'untested';
  let micNote = 'Belum diuji';

  if (mic.tested) {
    if (mic.clippingDetected) {
      micScore = 50;
      micStatus = 'warning';
      micNote = 'Terdeteksi clipping audio';
      recommendations.push({
        id: 'rec_mic_clip',
        level: 'warning',
        title: 'Mikrofon Mengalami Distorsi/Clipping',
        desc: 'Sinyal mikrofon mencapai batas maksimum (0 dBFS). Turunkan level input mikrofon di pengaturan suara laptop.',
      });
    } else if (mic.snrDb !== null && mic.snrDb < 15) {
      micScore = 60;
      micStatus = 'warning';
      micNote = `SNR Rendah (${mic.snrDb.toFixed(1)} dB)`;
      recommendations.push({
        id: 'rec_mic_snr',
        level: 'warning',
        title: 'Noise Mikrofon Cukup Tinggi',
        desc: 'Noise floor ruangan atau internal mic relatif tinggi. Pastikan lubang mikrofon earphone tidak tertutup debu.',
      });
    } else {
      micScore = 92;
      micStatus = 'good';
      micNote = `Mikrofon Jernih (SNR ${mic.snrDb ? mic.snrDb.toFixed(1) + ' dB' : 'Bagus'})`;
    }

    if (mic.isHfpProfile) {
      recommendations.push({
        id: 'rec_mic_hfp',
        level: 'info',
        title: 'Profil Bluetooth Berpindah ke HFP/HSP',
        desc: 'Saat mikrofon Bluetooth aktif, bandwidth audio terbagi sehingga kualitas output suara beralih ke mono/rendah. Ini adalah perilaku normal standar Bluetooth.',
      });
    }
  }

  // 4. CONNECTION & STABILITY EVALUATION
  let connScore: number | null = null;
  let connStatus: 'good' | 'warning' | 'bad' | 'untested' = 'untested';
  let connNote = 'Belum diuji';

  if (device) {
    if (audio.streamingStability.testing || audio.streamingStability.passed !== null) {
      const glitches = audio.streamingStability.glitchCount;
      const disconn = audio.streamingStability.disconnects;
      if (disconn > 0 || glitches > 5) {
        connScore = 40;
        connStatus = 'bad';
        connNote = `Tidak Stabil (${glitches} glitch, ${disconn} putus)`;
        recommendations.push({
          id: 'rec_conn_glitch',
          level: 'critical',
          title: 'Koneksi Sering Putus / Mengalami Glitch',
          desc: 'Terdeteksi gangguan transmisi. Jauhkan earphone dari router Wi-Fi 2.4 GHz atau port USB 3.0 yang tidak terlindung.',
        });
      } else if (glitches > 0) {
        connScore = 75;
        connStatus = 'warning';
        connNote = `Cukup Stabil (${glitches} glitch)`;
      } else {
        connScore = 98;
        connStatus = 'good';
        connNote = 'Streaming Sangat Stabil (0 glitch)';
      }
    } else if (device.disconnectCount > 0) {
      connScore = 60;
      connStatus = 'warning';
      connNote = `Pernah terputus ${device.disconnectCount} kali`;
    } else {
      connScore = 90;
      connStatus = 'good';
      connNote = 'Koneksi Normal';
    }
  }

  // 5. BUTTONS EVALUATION
  let btnScore: number | null = null;
  let btnStatus: 'good' | 'warning' | 'bad' | 'untested' = 'untested';
  let btnNote = 'Belum diuji';

  const detectedButtons = [
    buttons.play,
    buttons.pause,
    buttons.previoustrack,
    buttons.nexttrack,
    buttons.volumeup,
    buttons.volumedown,
    buttons.seekbackward,
    buttons.seekforward,
  ].filter(Boolean).length;

  if (buttons.eventLogs.length > 0) {
    if (detectedButtons >= 2) {
      btnScore = 95;
      btnStatus = 'good';
      btnNote = `${detectedButtons} fungsi tombol merespons`;
    } else {
      btnScore = 75;
      btnStatus = 'good';
      btnNote = `${detectedButtons} tombol terdeteksi`;
    }
  }

  // 6. CABLE & PHYSICAL EVALUATION
  let cableScore: number | null = null;
  let cableStatus: 'good' | 'warning' | 'bad' | 'untested' = 'untested';
  let cableNote = 'Belum diuji';

  if (audio.cableWiggleDropouts > 0) {
    cableScore = Math.max(20, 90 - audio.cableWiggleDropouts * 20);
    cableStatus = audio.cableWiggleDropouts > 2 ? 'bad' : 'warning';
    cableNote = `Terdeteksi ${audio.cableWiggleDropouts} kali gemeretak/dropout`;
    recommendations.push({
      id: 'rec_cable_wiggle',
      level: 'critical',
      title: 'Kabel atau Jack Mengalami Intermiten',
      desc: 'Saat kabel digerakkan, sinyal suara terputus atau gemeretak. Periksa pangkal kabel dekat jack 3.5mm atau earpiece apakah serabut tembaga mulai putus.',
    });
  } else if (audio.cableWiggleTesting || audio.lrBalanceConfirmed !== null) {
    if (device?.connectionType === 'jack_3_5' || device?.connectionType === 'usb') {
      cableScore = 95;
      cableStatus = 'good';
      cableNote = 'Kabel kokoh (tidak ada gangguan saat digoyangkan)';
    }
  }

  // DYNAMIC NORMALIZED WEIGHTING
  const evaluatedCategories: Array<{ score: number; weight: number }> = [];

  if (batteryScore !== null) evaluatedCategories.push({ score: batteryScore, weight: customWeights.battery });
  if (audioScore !== null) evaluatedCategories.push({ score: audioScore, weight: customWeights.audioOutput });
  if (micScore !== null) evaluatedCategories.push({ score: micScore, weight: customWeights.mic });
  if (connScore !== null) evaluatedCategories.push({ score: connScore, weight: customWeights.connection });
  if (btnScore !== null) evaluatedCategories.push({ score: btnScore, weight: customWeights.buttons });
  if (cableScore !== null) evaluatedCategories.push({ score: cableScore, weight: customWeights.cable });

  const totalPossibleCategories = 6;
  const testedCount = evaluatedCategories.length;
  const completenessPercent = Math.round((testedCount / totalPossibleCategories) * 100);

  let totalScore: number | null = null;
  if (testedCount > 0) {
    const totalActiveWeight = evaluatedCategories.reduce((sum, c) => sum + c.weight, 0);
    if (totalActiveWeight > 0) {
      const weightedSum = evaluatedCategories.reduce((sum, c) => sum + c.score * c.weight, 0);
      totalScore = Math.round(weightedSum / totalActiveWeight);
    }
  }

  return {
    totalScore,
    completenessPercent,
    categoryScores: {
      battery: { score: batteryScore, status: batteryStatus, note: batteryNote },
      audioOutput: { score: audioScore, status: audioStatus, note: audioNote },
      mic: { score: micScore, status: micStatus, note: micNote },
      connection: { score: connScore, status: connStatus, note: connNote },
      buttons: { score: btnScore, status: btnStatus, note: btnNote },
      cable: { score: cableScore, status: cableStatus, note: cableNote },
    },
    recommendations,
  };
}
