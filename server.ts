import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import {
  ensureTablesExist,
  getSettings,
  updateSettings,
  getOfficers,
  createOfficer,
  updateOfficer,
  deleteOfficer,
  getRegisterEntries,
  saveRegisterEntry,
  deleteRegisterEntry,
  getRegistersSummary,
} from "./src/db/queries.ts";
import { REGISTER_DEFINITIONS } from "./src/lib/constants.ts";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Ensure tables exist on database connection (e.g. Neon or Cloud SQL)
  ensureTablesExist().catch((err) => {
    console.error("Failed table check on server startup:", err);
  });

  app.use(express.json());


  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Settings Endpoints
  app.get("/api/settings", async (req, res) => {
    try {
      const data = await getSettings();
      res.json(data);
    } catch (error: any) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: error.message || "Failed to fetch settings" });
    }
  });

  app.post("/api/settings", async (req, res) => {
    try {
      const data = await updateSettings(req.body);
      res.json(data);
    } catch (error: any) {
      console.error("Error updating settings:", error);
      res.status(500).json({ error: error.message || "Failed to update settings" });
    }
  });

  // Officers (Petugas) Endpoints
  app.get("/api/officers", async (req, res) => {
    try {
      const list = await getOfficers();
      res.json(list);
    } catch (error: any) {
      console.error("Error fetching officers:", error);
      res.status(500).json({ error: error.message || "Failed to fetch officers" });
    }
  });

  app.post("/api/officers", async (req, res) => {
    try {
      const { nama, pangkat, nip, jabatan } = req.body;
      if (!nama || !pangkat || !nip) {
        return res.status(400).json({ error: "Nama, Pangkat, dan NIP wajib diisi" });
      }
      const created = await createOfficer({ nama, pangkat, nip, jabatan });
      res.status(201).json(created);
    } catch (error: any) {
      console.error("Error creating officer:", error);
      res.status(500).json({ error: error.message || "Failed to create officer" });
    }
  });

  app.put("/api/officers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const updated = await updateOfficer(id, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating officer:", error);
      res.status(500).json({ error: error.message || "Failed to update officer" });
    }
  });

  app.delete("/api/officers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      await deleteOfficer(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting officer:", error);
      res.status(500).json({ error: error.message || "Failed to delete officer" });
    }
  });

  // Registers Metadata & Summary
  app.get("/api/registers", async (req, res) => {
    try {
      const summary = await getRegistersSummary();
      const list = REGISTER_DEFINITIONS.map((def) => ({
        ...def,
        entryCount: summary.countsByRegister[def.code] || 0,
      }));
      res.json({ registers: list, summary });
    } catch (error: any) {
      console.error("Error fetching registers:", error);
      res.status(500).json({ error: error.message || "Failed to fetch registers" });
    }
  });

  // Entries for a specific register (e.g. /api/registers/R.IN.1/entries)
  app.get("/api/registers/:code/entries", async (req, res) => {
    try {
      const { code } = req.params;
      const entries = await getRegisterEntries(code);
      res.json(entries);
    } catch (error: any) {
      console.error(`Error fetching entries for ${req.params.code}:`, error);
      res.status(500).json({ error: error.message || "Failed to fetch entries" });
    }
  });

  app.post("/api/registers/:code/entries", async (req, res) => {
    try {
      const { code } = req.params;
      const { id, nomorUrut, tgl, waktu, data } = req.body;
      const saved = await saveRegisterEntry(code, {
        id,
        nomorUrut: nomorUrut || 1,
        tgl,
        waktu,
        data,
      });
      res.json(saved);
    } catch (error: any) {
      console.error(`Error saving entry for ${req.params.code}:`, error);
      res.status(500).json({ error: error.message || "Failed to save entry" });
    }
  });

  app.delete("/api/registers/:code/entries/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      await deleteRegisterEntry(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error(`Error deleting entry ${req.params.id}:`, error);
      res.status(500).json({ error: error.message || "Failed to delete entry" });
    }
  });

  // Seed sample data for testing
  app.post("/api/seed-samples", async (req, res) => {
    try {
      const officersList = await getOfficers();
      const officerIds = officersList.map((o) => o.id);

      // Seed samples for R.IN.1, R.IN.3, R.IN.7, R.IN.10, R.IN.21
      // Sample 1: R.IN.1
      await saveRegisterEntry("R.IN.1", {
        nomorUrut: 1,
        tgl: "2026-08-20",
        waktu: "09:30",
        data: {
          tgl_terima: "2026-08-20",
          jam_terima: "09:30",
          nomor_surat: "B-142/N.1.17/Dti.1/08/2026",
          tgl_surat: "2026-08-18",
          asal_surat: "Kejaksaan Tinggi Bali",
          perihal: "Permintaan Laporan Bulanan Pos Pelayanan Hukum Bulan Agustus 2026",
          tgl_isi_disposisi: "2026-08-20 / Kasi Intelijen: Mohon ditindaklanjuti dan siapkan bahan laporan",
          tindak_lanjut: "Telah diteruskan ke Kasubsi PPH",
          keterangan: "Rahasia",
        },
      });

      await saveRegisterEntry("R.IN.1", {
        nomorUrut: 2,
        tgl: "2026-08-21",
        waktu: "11:15",
        data: {
          tgl_terima: "2026-08-21",
          jam_terima: "11:15",
          nomor_surat: "005/782/Bakesbangpol/2026",
          tgl_surat: "2026-08-19",
          asal_surat: "Badan Kesbangpol Kab. Tabanan",
          perihal: "Undangan Rapat Koordinasi Tim Pengawasan Aliran Kepercayaan dan Keagamaan (PAKEM)",
          tgl_isi_disposisi: "2026-08-21 / Hadiri dan koordinasikan bahan paparan",
          tindak_lanjut: "Kasi Intel dan Tim hadir",
          keterangan: "Biasa",
        },
      });

      // Sample 2: R.IN.7 (Kegiatan Ipoleksosbud Hankam)
      await saveRegisterEntry("R.IN.7", {
        nomorUrut: 1,
        tgl: "2026-08-22",
        data: {
          sektor: "Pengawasan orang asing",
          no_tgl_peruntukan: "SP.OPS-04/N.1.17/Dip.4/08/2026, Tgl 15 Agustus 2026 untuk Pengawasan WNA di Kawasan Wisata Tanah Lot dan Bedugul",
          nama_petugas_ids: officerIds.slice(0, 3),
          hasil_pelaksanaan: "Telah dilaksanakan pemantauan terhadap 12 WNA pengelola akomodasi wisata. Dokumen keimigrasian lengkap dan situasi kondusif.",
          keterangan: "Laporan Informasi Khusus terlampir",
        },
      });

      // Sample 3: R.IN.10 (PPS - Pengamanan Pembangunan Strategis)
      await saveRegisterEntry("R.IN.10", {
        nomorUrut: 1,
        data: {
          sektor_kegiatan_dana: "Pembangunan Jembatan Penghubung Antar Desa, Sumber Dana APBD Kab. Tabanan TA 2026",
          kldi: "Dinas PUPRPKP Kab. Tabanan",
          pagu_anggaran: "Rp 4.500.000.000,-",
          no_tgl_permohonan: "600/124/PUPR, Tgl 10 Juli 2026",
          pemaparan_tempat: "Ruang Rapat Kajari Tabanan",
          pemaparan_tanggal: "2026-07-15",
          telaahan_intelijen: "Layak didampingi (Rekomendasi Walpam)",
          status_diterima: "Diterima",
          status_ditolak: "-",
          sp_walpam_no_tgl: "PRINT-89/N.1.17/D.1/07/2026, Tgl 18 Juli 2026",
          nama_petugas_ids: officerIds.slice(0, 2),
          nilai_kontrak: "Rp 4.230.000.000,-",
          efisiensi_anggaran: "Rp 270.000.000,-",
          proyek_selesai: "Tahap 65% on schedule",
          penghentian: "-",
          no_tgl_kertas_kerja: "KK-08/PPS/08/2026, Tgl 12 Agustus 2026",
          keterangan: "Monitoring berkala mingguan berjalan lancar",
        },
      });

      // Sample 4: R.IN.21 (Tamu PPH / PPM)
      await saveRegisterEntry("R.IN.21", {
        nomorUrut: 1,
        tgl: "2026-08-23",
        waktu: "10:00",
        data: {
          nama_petugas_penerima: officerIds[0] || 1,
          waktu_lapor: "2026-08-23 10:00",
          identitas_pelapor: "I Made Sukadana, Tabanan 14-04-1980, Jl. Pahlawan No. 12 Tabanan, Laki-laki, 08123456789, Petani/Wiraswasta, NIK: 5102031404800001",
          nama_organisasi: "Kelompok Tani Subak Jatiluwih",
          informasi_disampaikan: "Konsultasi hukum terkait tata kelola pengairan dan sertifikasi tanah adat subak",
          surat_dokumen: "Surat permohonan penjelasan hukum & fotokopi pipil tanah",
          tanda_tangan: "Terlampir",
          keterangan: "Diberikan penerangan hukum di Pos Pelayanan Hukum",
          pelapor_perorangan: "1",
          pelapor_organisasi: "1",
          pelapor_total: "1",
        },
      });

      res.json({ success: true, message: "Sample data seeded successfully" });
    } catch (error: any) {
      console.error("Error seeding sample data:", error);
      res.status(500).json({ error: error.message || "Failed to seed sample data" });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Kejaksaan Intelligence Register server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
