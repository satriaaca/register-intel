# Aplikasi Register Intelijen Kejaksaan RI (R.IN.1 – R.IN.23)

Sistem Informasi Manajemen dan Pembuatan Buku Register Intelijen Kejaksaan Republik Indonesia sesuai dengan petunjuk teknis administrasi intelijen Kejaksaan (Petunjuk Pelaksanaan Register R.IN.1 sampai dengan R.IN.23).

---

## 🌟 Fitur Utama

1. **Daftar Lengkap 23 Buku Register Intelijen (R.IN.1 s/d R.IN.23)**
   - **Surat & Berita**: Register Surat Masuk (R.IN.1), Surat Keluar (R.IN.2), Ekspedisi (R.IN.4), Arsip (R.IN.6), Berita Masuk Sandi (R.IN.17), Berita Keluar Sandi (R.IN.18).
   - **Kerja & Produk Intelijen**: Register Kerja Intelijen per 5 Bidang (R.IN.3), Produk Intelijen (R.IN.5), Telaahan Intelijen (R.IN.19), Badan Intelijen Asing (R.IN.20), Evaluasi & Pelaporan (R.IN.21).
   - **Operasi Intelijen**: Penyelidikan (R.IN.7), Pengamanan (R.IN.8), Penggalangan (R.IN.9), Pelacakan Aset (R.IN.10), Pengawasan Keberadaan Orang Asing (R.IN.11), Pengawasan Lembaga Asing (R.IN.12), Operasi Sosbud/Kemasyarakatan (R.IN.13), Penanggulangan Kejahatan Siber (R.IN.14), Pasopati (R.IN.15), Posko Pemilu (R.IN.16).
   - **Layanan & Penyuluhan**: Penerangan/Penyuluhan Hukum (R.IN.22), Pelayanan Informasi Publik (R.IN.23).

2. **Dukungan Rekapitulasi Otomatis**
   - Perhitungan otomatis rekapitulasi data pada formulir yang mewajibkan rekapitulasi penutupan (misal R.IN.5 Produk Intelijen & R.IN.19 Telaahan Intelijen).

3. **Manajemen Periode Bulanan & Tahun**
   - Filter data register per bulan (Januari s/d Desember) atau semua bulan dalam setahun.
   - Manajemen daftar tahun takwim dinamis (tambah/hapus tahun sesuai kebutuhan).
   - Pengaturan tanggal penutupan buku register per bulan yang dapat disesuaikan (menyesuaikan hari kerja efektif / tanggal akhir bulan).

4. **Ekspor & Pratinjau Dokumen PDF Resmi**
   - Generator PDF berstandar format Kejaksaan RI dengan tata letak kop satker, judul register resmi, tabel data dinamis, dan penutup register.
   - Pilihan orientasi kertas fleksibel: **Landscape** dan **Portrait** yang dapat diubah langsung dari antarmuka.
   - Format perataan tanda tangan: **Center (Tengah)** atau **Kiri - Kanan (Split)**.

5. **Manajemen Petugas Intelijen & Pengaturan Satker**
   - Database personil intelijen (Nama, Pangkat/Golongan, NIP, Jabatan).
   - Form input register terintegrasi dengan pemilih personil (tunggal maupun multi-petugas).
   - Kustomisasi identitas pimpinan (Kajari), Kepala Seksi Intelijen (Kasi Intel), tempat dokumen, dan kop surat.

6. **Penyimpanan Data Terpusat**
   - Backend Express terintegrasi dengan PostgreSQL (Drizzle ORM) untuk penyimpanan data yang aman, andal, dan persisten.

---

## 🛠️ Arsitektur Teknologi

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Motion.
- **PDF Generation**: jsPDF, jspdf-autotable, html2canvas.
- **Backend**: Express.js (Node.js/TypeScript via `tsx` & `esbuild`).
- **Database**: PostgreSQL dengan Drizzle ORM.

---

## 📁 Struktur Direktori

```
├── src/
│   ├── components/
│   │   ├── EntryFormModal.tsx        # Modal input & edit data baris register
│   │   ├── Navbar.tsx                # Navigasi utama & pemilihan tab
│   │   ├── OfficersManager.tsx       # Manajemen data personil intelijen
│   │   ├── PdfPreviewModal.tsx       # Pratinjau dokumen PDF sebelum dicetak
│   │   ├── RegisterDocumentView.tsx  # Tampilan tabel buku register & aksi
│   │   ├── RegisterSelector.tsx      # Komponen pemilihan 23 buku register
│   │   └── SettingsManager.tsx       # Pengaturan satker, tahun & tanggal penutupan
│   ├── db/
│   │   └── schema.ts                 # Definisi schema database PostgreSQL (Drizzle)
│   ├── lib/
│   │   ├── constants.ts              # Struktur kolom dan metadata 23 register
│   │   ├── date-utils.ts             # Utilitas penanggalan format Indonesia
│   │   └── pdf-generator.ts          # Engine generator PDF resmi
│   ├── types.ts                      # Definisi tipe TypeScript
│   ├── App.tsx                       # Komponen root aplikasi
│   ├── main.tsx                      # Entry point React
│   └── index.css                     # Konfigurasi Tailwind CSS
├── server.ts                         # Backend API server (Express)
├── package.json                      # Daftar dependensi & npm scripts
└── metadata.json                     # Konfigurasi metadata aplikasi
```

---

## 🚀 Menjalankan Aplikasi

### 1. Menjalankan Mode Development
```bash
npm run dev
```
Aplikasi akan berjalan pada port default: `http://localhost:3000`.

### 2. Kompilasi & Menjalankan Mode Production
```bash
npm run build
npm run start
```

### 3. Validasi Kode (Linting)
```bash
npm run lint
```

---

## 📋 Penggunaan Aplikasi

1. **Memilih Register**: Pilih salah satu dari 23 buku register melalui dropdown atau selector di bilah atas.
2. **Memilih Periode**: Tentukan tahun dan bulan yang ingin dibuka pada bilah filter periode.
3. **Menambah / Mengedit Data**: Klik tombol **"Tambah Data Baris"** untuk mengisi formulir register sesuai kolom standar Kejaksaan.
4. **Mencetak / Pratinjau Dokumen**: Klik tombol **"Cetak / Pratinjau PDF"** atau **"Unduh PDF"** untuk melihat hasil cetakan resmi.
5. **Menyesuaikan Pengaturan**: Buka tab **Pengaturan** untuk memperbarui nama pimpinan, NIP, tanggal penutupan per bulan, daftar tahun, dan posisi tanda tangan.
