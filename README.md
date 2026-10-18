# 🛡️ KasKu — Catatan Keuangan Offline

> ## 🌐 Aplikasi sudah online!
> - **▸ [Buka & pasang aplikasi](https://sfafa231.github.io/kasku/)** (buka di HP → menu ⋮ → *Tambahkan ke layar utama*)
> - **▸ [Unduh ZIP](https://sfafa231.github.io/kasku/KasKu-v1.0.1.zip)** (189 KB, siap diunggah ulang / dibagikan)

Aplikasi pencatatan keuangan **pemasukan & pengeluaran** yang ringan, rapi, dan berjalan **100% offline** di HP (Android/iPhone). Dibangun sebagai **PWA** — bisa dipasang di layar utama seperti aplikasi biasa, lengkap dengan logo.

> Tanpa server · Tanpa API key · Tanpa iklan · Data 100% milik Baginda (tersimpan di perangkat)

## ✨ Fitur

| Fitur | Keterangan |
|---|---|
| 💰 Pemasukan & Pengeluaran | Tambah/edit/hapus dengan nominal, kategori, **tanggal**, dan catatan |
| 📊 Grafik batang 6 bulan | Perbandingan pemasukan vs pengeluaran |
| 🍩 Grafik donat | Pengeluaran per kategori + persentase |
| 📈 Tren harian | Grafik area pengeluaran harian sebulan + penanda puncak |
| 🔍 Riwayat & pencarian | Dikelompokkan per tanggal, filter jenis/kategori, pencarian teks |
| 📅 Navigasi bulan | Lihat rekap bulan lalu kapanpun |
| 🎨 Tema terang/gelap | Otomatis mengikuti sistem atau atur manual |
| 💾 Cadangan data | Ekspor/impor file JSON — aman saat ganti HP |
| ✨ Data contoh | Sekali ketuk untuk mencoba semua grafik |
| 📴 Offline penuh | Service worker menyimpan seluruh aplikasi di HP |

## 🚀 Cara memasang di GitHub Pages (publikasi)

1. Buat **repository baru** di GitHub (mis. `kasku`), centang *Add a README*.
2. Unggah **seluruh isi folder ini** ke repository tersebut (Drag & drop di github.com → *uploading files* — kecuali folder `tools/`).
3. Buka tab **Settings → Pages**.
4. Di *Source*, pilih **Deploy from a branch**, branch **main**, folder **/ (root)** → *Save*.
5. Tunggu ~1 menit. Aplikasi hidup di:
   `https://<username>.github.io/kasku/`

> 📌 File `.nojekyll` sudah disertakan agar GitHub Pages menyajikan file apa adanya.

## 📲 Cara memasang di HP (jadi aplikasi)

1. Buka link KasKu di **Chrome (Android)** atau **Safari (iPhone)**.
2. **Android:** menu ⋮ → *Tambahkan ke layar utama* / *Instal aplikasi*.
   **iPhone:** tombol Bagikan → *Tambahkan ke Layar Utama*.
3. Muncul logo KasKu di layar utama — buka, dan tetap jalan **tanpa internet**.

## 🗂 Struktur folder

```
kasku/
├── index.html              ← halaman utama aplikasi
├── app.css                 ← gaya/tata letak (terang & gelap)
├── app.js                  ← logika & grafik (tanpa library)
├── manifest.webmanifest    ← identitas aplikasi PWA (logo, nama, warna)
├── sw.js                   ← service worker (kunci mode offline)
├── .nojekyll               ← penanda untuk GitHub Pages
└── icons/
    ├── icon.svg
    ├── icon-192.png
    ├── icon-512.png
    ├── icon-maskable-512.png
    └── apple-touch-icon.png
```

## 🔧 Pengembangan

```bash
# jalankan uji logika (butuh Node.js)
cd tools && npm i && node test-app.mjs

# buat ulang logo
node tools/make-icons.mjs
```

## 🔐 Privasi

Seluruh catatan disimpan di `localStorage` browser pada perangkat Baginda. Tidak ada data yang dikirim ke mana pun. Karena itu **unduh cadangan (JSON)** secara berkala dari menu *Atur*.

Dibuat dengan 💚 untuk Baginda Raja.
