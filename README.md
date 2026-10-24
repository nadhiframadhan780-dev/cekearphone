# EarCheck — Pendeteksi & Pemeriksa Kesehatan Earphone dari Laptop

EarCheck adalah aplikasi web diagnostik lokal untuk menguji perangkat keras, identitas, kesehatan baterai, performa akustik kanal L/R, respons mikrofon, dan tombol kontrol pada earphone/headset dari laptop melalui jalur **Bluetooth (nirkabel)** maupun jalur **kabel (jack 3.5 mm, USB-C, USB-A)**.

---

## 🌟 Prinsip Inti

1. **Jujur Soal Data (Label Sumber Transparan)**:
   - `[TERBACA DARI PERANGKAT]` : Nilai asli dari earphone via Bluetooth GATT / MediaDevices.
   - `[HASIL UJI]` : Diukur langsung lewat tes di aplikasi (Goertzel DSP, VU meter, tap latency).
   - `[ESTIMASI]` : Dihitung secara matematis (dengan rentang ketidakpastian + tingkat keyakinan).
   - `[TIDAK TERSEDIA]` : Tidak diekspos oleh earphone atau dibatasi kebijakan browser (disertai alasan objektif).
   - Mode Demo tersedia dengan banner `DATA SIMULASI` yang selalu terlihat jelas dan tidak pernah bercampur dengan data riil.
2. **Read-Only**: Tidak pernah menulis ke karakteristik GATT atau mengubah firmware earphone.
3. **Privasi Penuh**: 100% lokal di browser, tanpa backend, tanpa unggah audio atau telemetri.
4. **Keselamatan Telinga**:
   - Soft-start otomatis (fade in ~1.5 detik).
   - Volume master dengan batas aman default 70%.
   - Tombol darurat **STOP SUARA** yang selalu terlihat.
   - Indikator tujuan suara ("Suara dialihkan ke: ...").
5. **Kejujuran Baterai**: Tidak pernah menggunakan `navigator.getBattery()` (karena itu adalah baterai laptop, bukan earphone).

---

## 🚀 Cara Menjalankan & Deploy

### Development
```bash
npm install
npm run dev
# Buka http://localhost:3000 di Google Chrome, Microsoft Edge, atau Opera
```

### Build & Deploy
```bash
npm run build
# Deploy folder `dist/` ke Vercel, Netlify, Cloudflare Pages, atau GitHub Pages
# PENTING: Harus di-host pada HTTPS agar Web Bluetooth dan MediaDevices diizinkan oleh browser.
```

---

## 📋 Tabel: Fitur → Web API → Batasan Platform

| Fitur | Web API yang Digunakan | Batasan Browser & Platform | Penanganan Jujur di EarCheck |
| :--- | :--- | :--- | :--- |
| **Identitas BLE (Nama, Merek, Model)** | Web Bluetooth (`navigator.bluetooth`), Device Information Service (0x180A) | Hanya didukung di browser Chromium (Chrome/Edge/Opera). Safari & Firefox tidak mendukung. BLE saja, bukan Bluetooth Classic. | Menampilkan tabel kompatibilitas sistem & mendeteksi vendor ID via Bluetooth SIG Assigned Numbers. |
| **Nomor Seri Earphone** | GATT Characteristic 0x2A25 | **Diblokir oleh browser** demi alasan keamanan & pencegahan sidik jari (fingerprinting). | Ditandai `[TIDAK TERSEDIA] (Dibatasi kebijakan privasi browser)`. |
| **Baterai Live (0-100%)** | Battery Service (0x180F / 0x2A19) & v1.1 (0x2BED, 0x2BEA) | Banyak TWS (AirPods, Galaxy Buds, Sony WF) menyembunyikan baterai di protokol vendor tertutup (bukan GATT standar). | Jika tidak diekspos, ditandai `[TIDAK TERSEDIA]` dan pengguna diarahkan ke **Uji Daya Tahan**. |
| **Baterai Per-Bud (L/R/Case)** | GATT Vendor Specific | Protokol vendor tertutup tanpa standar terbuka di web. | Hanya ditampilkan bila perangkat mengeksposnya, tidak mengarang angka acak. |
| **Uji Daya Tahan Baterai** | Web Audio API (Pink Noise) + Screen Wake Lock API | Butuh durasi waktu agar baterai berkurang secara terukur. | Syarat minimal: uji $\ge$ 20 menit dan penurunan $\ge$ 5%. Jika kurang, tampil `Data belum cukup`. |
| **Perutean Audio Terarah** | `AudioContext.setSinkId` / `HTMLMediaElement.setSinkId` | Sebagian browser lama hanya memutar ke default audio sistem. | Peringatan otomatis jika suara berisiko keluar lewat speaker laptop. |
| **Uji Akustik L vs R & THD** | Web Audio API + Algoritma Goertzel (Stepped Sine 50Hz–16kHz) | Bergantung pada posisi mikrofon laptop dan kebisingan ruangan. | Ditampilkan sebagai hasil uji komparatif L vs R (bukan nilai lab absolut). Selisih >6 dB ditandai bermasalah. |
| **Uji Kabel 3.5 mm (Wiggle)** | MediaDevices (`devicechange`) + Tone Generator | Jack analog 3.5 mm tidak memiliki ID digital (yang terdeteksi adalah soundcard laptop seperti Realtek). | Menyediakan opsi isian nama manual dan tombol penanda gangguan (dropouts/crackle). |
| **DAC USB-C / USB-A** | MediaDevices + WebUSB opsional | WebUSB **tidak dapat meng-claim interface audio** yang sudah dikontrol oleh OS. | WebUSB hanya digunakan opsional untuk membaca Vendor/Product ID dongle DAC. |
| **Uji Tombol Earphone** | Media Session API & Keyboard Events | Memerlukan elemen audio aktif agar browser merespons perintah media. | Memutar audio senyap (silent loop) otomatis untuk mengaktifkan Media Session. |

---

## 🚫 Hal yang TIDAK MUNGKIN Dilakukan Murni dari Browser Web

1. **Membaca Baterai Bluetooth Classic (A2DP/HFP Hands-free)**:
   - Standar profil hands-free Bluetooth Classic (perintah `AT+IPHONEACCEV` atau HFP battery reporting) ditangani di level kernel/driver OS dan **tidak diekspos** ke JavaScript web.
2. **Membaca Baterai Per-Bud & Case AirPods / Galaxy Buds**:
   - Memerlukan paket advertensi BLE terenkripsi proprietary Apple (Continuity Protocol) atau Samsung proprietary BLE beacon yang diurai di tingkat OS.
3. **Mengambil Interface Audio USB lewat WebUSB**:
   - Sistem operasi (Windows CoreAudio, macOS CoreAudio, Linux ALSA/PulseAudio) mengunci interface USB kelas Audio (Class 01h). WebUSB dilarang meng-claim interface ini.

### 💡 Saran Pengembangan Lanjutan: Aplikasi Pendamping Desktop
Untuk melengkapi kemampuan web ini dengan pembacaan baterai Bluetooth Classic dan protokol per-bud tertutup, dapat dibuat aplikasi pendamping desktop ringan (**Tauri** atau **Electron**) yang memanggil API native sistem operasi:
- **Windows**: Windows Runtime API (`Windows.Devices.Bluetooth`, `Windows.Devices.Enumeration` properti `System.Devices.Aep.Bluetooth.Cod`).
- **macOS**: `IOBluetooth` framework (membaca nilai `BatteryPercentSingle`, `BatteryPercentLeft`, `BatteryPercentRight`, `BatteryPercentCase`).
- **Linux**: D-Bus BlueZ interface (`org.bluez.Battery1` dan `UPower`).

---

## ✅ Checklist Pengujian Manual

- [ ] **Skenario 1: Earphone BLE dengan Battery Service**
  - Klik "Pindai Earphone (Semua BLE)" → pilih earphone di dialog browser.
  - Verifikasi: Nama, model, persentase baterai live, dan grafik linier terisi dengan label `[TERBACA DARI PERANGKAT]`.
- [ ] **Skenario 2: Earphone TWS tanpa Battery Service (AirPods / Galaxy Buds)**
  - Hubungkan perangkat → baterai live berlabel `[TIDAK TERSEDIA] (Tidak diekspos oleh perangkat ini)`.
  - Buka tab "Uji Daya Tahan", masukkan spek (mis. 6 jam), nyalakan pink noise.
- [ ] **Skenario 3: Earphone Kabel Jack 3.5 mm**
  - Tancapkan jack ke laptop → nama soundcard laptop muncul di daftar MediaDevices.
  - Isi nama manual (mis. "Moondrop Chu II") → nama terbarui dengan label `[INPUT MANUAL]`.
  - Jalankan Uji Kabel (Wiggle test) sambil menggoyang pangkal jack 3.5 mm.
- [ ] **Skenario 4: Skenario Izin Ditolak**
  - Tolak izin Bluetooth atau mikrofon di browser → aplikasi menampilkan pesan ramah tanpa crash di console.
- [ ] **Skenario 5: Perangkat Terputus saat Pengujian**
  - Matikan earphone saat terhubung → aplikasi mendeteksi event `gattserverdisconnected`, mencatat hitungan putus, dan mencoba auto-reconnect dengan exponential backoff (1s, 2s, 4s).
