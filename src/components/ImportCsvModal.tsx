import React, { useState, useEffect } from "react";
import { RegisterDefinition, StorageCodeMapping } from "../types.ts";
import {
  parseCsv,
  transformCsvToRIn1,
  transformCsvToRIn3,
  transformCsvToRIn6,
} from "../lib/csv-importer.ts";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  ArrowRight,
  Table,
  FolderArchive,
  HelpCircle,
  Edit2,
  Trash2,
} from "lucide-react";
import { StorageCodesModal } from "./StorageCodesModal.tsx";

interface ImportCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  register: RegisterDefinition;
  onSuccess: () => void;
}

export const SAMPLE_RIN1_CSV = `"No","Satker","Jenis Surat","Tanggal","Nomor","Nomor Agenda","Asal","Hal","Status"
"1","KEJAKSAAN NEGERI TABANAN","BIASA INTERNAL / EKSTERNAL","20-08-2026","B-5142/N.1.7/H.III/08/2026","1615","KEJAKSAAN TINGGI BALI | BIDANG PENGAWASAN","Pemberitahuan Pelaksanaan Inspeksi Umum pada Wilayah Kejaksaan Tinggi Bali PKPT Tahun 2026","Disposisi"
"2","KEJAKSAAN NEGERI TABANAN","BIASA INTERNAL / EKSTERNAL","20-08-2026","B-5143/N.1.7/H.III/08/2026","1616","KEJAKSAAN TINGGI BALI | BIDANG INTELIJEN","Permintaan Data Laporan Kegiatan Intelijen Triwulan III Tahun 2026","Disposisi"
"3","KEJAKSAAN NEGERI TABANAN","BIASA INTERNAL / EKSTERNAL","21-08-2026","B-1290/N.1.17/Dip.2/08/2026","1617","KASI INTEL KN TABANAN","Laporan Informasi Khusus Terkait Isu Pilkada Serentak 2026","Disposisi"
"4","KEJAKSAAN NEGERI TABANAN","BIASA INTERNAL / EKSTERNAL","22-08-2026","005/142/SEKDA","1618","SEKDA KAB TABANAN","Undangan Rapat Koordinasi Forkopimda Pembahasan Pengamanan Wilayah","Disposisi"
"5","KEJAKSAAN NEGERI TABANAN","BIASA INTERNAL / EKSTERNAL","22-08-2026","600/521/PUPR","1619","DINAS PUPR TBN","Permohonan Pendampingan Hukum Pengamanan Proyek Strategis Daerah (PPS)","Disposisi"
"6","KEJAKSAAN NEGERI TABANAN","BIASA INTERNAL / EKSTERNAL","23-08-2026","024/PLN-ULP/08/2026","1620","PLN ULP TABANAN","Koordinasi Keandalan Pasokan Listrik Selama Rangkaian Kegiatan Kenegaraan","Disposisi"`;

export const SAMPLE_RIN6_CSV = `"No","Satker","Jenis Surat","Tanggal","Nomor","Nomor Agenda","Asal","Hal","Status"
"1","KEJAKSAAN NEGERI TABANAN","BIASA INTERNAL / EKSTERNAL","20-08-2026","B-5142/N.1.7/H.III/08/2026","1615","KEJAKSAAN TINGGI BALI | BIDANG PENGAWASAN","Pemberitahuan Pelaksanaan Inspeksi Umum pada Wilayah Kejaksaan Tinggi Bali PKPT Tahun 2026","Disposisi"
"2","KEJAKSAAN NEGERI TABANAN","BIASA INTERNAL / EKSTERNAL","20-08-2026","B-5143/N.1.7/H.III/08/2026","1616","KEJAKSAAN TINGGI BALI | BIDANG INTELIJEN","Permintaan Data Laporan Kegiatan Intelijen Triwulan III Tahun 2026","Disposisi"
"3","KEJAKSAAN NEGERI TABANAN","BIASA INTERNAL / EKSTERNAL","21-08-2026","B-1290/N.1.17/Dip.2/08/2026","1617","KASI INTEL KN TABANAN","Laporan Informasi Khusus Terkait Isu Pilkada Serentak 2026","Disposisi"
"4","KEJAKSAAN NEGERI TABANAN","BIASA INTERNAL / EKSTERNAL","22-08-2026","005/142/SEKDA","1618","SEKDA KAB TABANAN","Undangan Rapat Koordinasi Forkopimda Pembahasan Pengamanan Wilayah","Disposisi"
"5","KEJAKSAAN NEGERI TABANAN","BIASA INTERNAL / EKSTERNAL","22-08-2026","600/521/PUPR","1619","DINAS PUPR TBN","Permohonan Pendampingan Hukum Pengamanan Proyek Strategis Daerah (PPS)","Disposisi"
"6","KEJAKSAAN NEGERI TABANAN","BIASA INTERNAL / EKSTERNAL","23-08-2026","024/PLN-ULP/08/2026","1620","PLN ULP TABANAN","Koordinasi Keandalan Pasokan Listrik Selama Rangkaian Kegiatan Kenegaraan","Disposisi"`;

export const SAMPLE_RIN3_CSV = `"No","Jenis Surat","Sifat Surat","No Register Surat","Tanggal","Nomor","Asal","Tujuan","Hal","Status"
"1","BIASA INTERNAL / EKSTERNAL","R","1280","27-07-2026","R-1280/N.1.17.2/Dsb.4/07/2026","Kasi Intel Kejari Tabanan","Kepala Kejaksaan Negeri Tabanan","Laporan informasi harian - Pelaksanaan Kegiatan Patroli Bersepeda oleh Personel Polsek Kediri","Diproses"
"2","BIASA INTERNAL / EKSTERNAL","R","1279","27-07-2026","R-1279/N.1.17.2/Dsb.4/07/2026","Kasi Intel Kejari Tabanan","Kepala Kejaksaan Negeri Tabanan","Laporan informasi harian - Pelaksanaan Pengamanan dan Pengaturan Arus Lalu Lintas Kegiatan Upacara Pitra Yadnya (Ngaben) oleh Bhabinkamtibmas Desa Candikuning","Diproses"
"3","BIASA INTERNAL / EKSTERNAL","R","1278","27-07-2026","R-1278/N.1.17.2/Dsb.4/07/2026","Kasi Intel Kejari Tabanan","Kepala Kejaksaan Negeri Tabanan","Laporan informasi harian - Pelaksanaan Kegiatan Rutin Yang Ditingkatkan (KRYD) Berupa Patroli Sambang oleh Personel Polsek Baturiti","Diproses"
"4","BIASA INTERNAL / EKSTERNAL","R","1277","27-07-2026","R-1277/N.1.17.2/Dsb.4/07/2026","Kasi Intel Kejari Tabanan","Kepala Kejaksaan Negeri Tabanan","Laporan informasi harian - Pelaksanaan Pengamanan dan Pengaturan Arus Lalu Lintas Kegiatan Upacara Ngaben oleh Babinsa Desa Batuaji","Diproses"
"5","BIASA INTERNAL / EKSTERNAL","R","1276","27-07-2026","R-1276/N.1.17.2/Dsb.4/07/2026","Kasi Intel Kejari Tabanan","Kepala Kejaksaan Negeri Tabanan","Laporan informasi harian - Pelaksanaan Kegiatan Melayat (Sambang Duka) oleh Bhabinkamtibmas Desa Bongan","Diproses"`;

export const ImportCsvModal: React.FC<ImportCsvModalProps> = ({
  isOpen,
  onClose,
  register,
  onSuccess,
}) => {
  const [csvText, setCsvText] = useState("");
  const [parsedRows, setParsedRows] = useState<
    Array<{
      nomorUrut: number;
      tgl: string;
      waktu?: string;
      data: Record<string, any>;
    }>
  >([]);
  const [storageCodes, setStorageCodes] = useState<StorageCodeMapping[]>([]);
  const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);
  const [clearExisting, setClearExisting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [previewTab, setPreviewTab] = useState<"input" | "preview">("input");

  // Fetch Storage Code Mappings
  const fetchStorageCodes = async () => {
    try {
      const res = await fetch("/api/storage-codes");
      if (res.ok) {
        const data = await res.json();
        setStorageCodes(data);
      }
    } catch (e) {
      console.warn("Could not fetch storage codes:", e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStorageCodes();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleParseCsv = (rawText: string, currentStorageCodes = storageCodes) => {
    try {
      setErrorMessage("");
      const rawGrid = parseCsv(rawText);
      if (rawGrid.length < 2) {
        setErrorMessage("CSV harus memiliki minimal 1 baris header dan 1 baris data.");
        setParsedRows([]);
        return;
      }

      let transformed: Array<{
        nomorUrut: number;
        tgl: string;
        waktu?: string;
        data: Record<string, any>;
      }> = [];

      if (register.code === "R.IN.1") {
        transformed = transformCsvToRIn1(rawGrid);
      } else if (register.code === "R.IN.3") {
        transformed = transformCsvToRIn3(rawGrid);
      } else if (register.code === "R.IN.6") {
        transformed = transformCsvToRIn6(rawGrid, currentStorageCodes);
      } else {
        // Generic mapper matching column headers to keys
        const headers = rawGrid[0].map((h) => h.toLowerCase().trim());
        const dataRows = rawGrid.slice(1);
        transformed = dataRows.map((row, idx) => {
          const rowData: Record<string, any> = {};
          let detectedTgl = "";
          headers.forEach((h, colIdx) => {
            const val = row[colIdx] || "";
            const col = register.columns.find(
              (c) => c.label.toLowerCase() === h || c.key === h
            );
            if (col) {
              rowData[col.key] = val;
            } else {
              rowData[h] = val;
            }
            if (h.includes("tanggal") || h === "tgl" || h.includes("waktu")) {
              if (
                val.match(/\d{4}-\d{2}-\d{2}/) ||
                val.match(/\d{1,2}[-/]\d{1,2}[-/]\d{4}/)
              ) {
                detectedTgl = val;
              }
            }
          });
          return {
            nomorUrut: idx + 1,
            tgl: detectedTgl || new Date().toISOString().split("T")[0],
            data: rowData,
          };
        });
      }

      setParsedRows(transformed);
      if (transformed.length > 0) {
        setPreviewTab("preview");
      }
    } catch (err: any) {
      setErrorMessage("Gagal membaca format CSV: " + err.message);
      setParsedRows([]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvText(content);
      handleParseCsv(content);
    };
    reader.readAsText(file);
  };

  const handleLoadSample = (sample: string) => {
    setCsvText(sample);
    handleParseCsv(sample);
  };

  const handleUpdateRowField = (index: number, key: string, value: any) => {
    setParsedRows((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        data: {
          ...copy[index].data,
          [key]: value,
        },
      };
      return copy;
    });
  };

  const handleDeletePreviewRow = (index: number) => {
    setParsedRows((prev) => {
      const filtered = prev.filter((_, idx) => idx !== index);
      return filtered.map((item, idx) => ({ ...item, nomorUrut: idx + 1 }));
    });
  };

  const handleSubmitImport = async () => {
    if (parsedRows.length === 0) {
      setErrorMessage("Tidak ada data yang siap diimpor.");
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage("");

      const response = await fetch(`/api/registers/${register.code}/import-batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries: parsedRows,
          clearExisting,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || "Gagal mengimpor data ke server");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Terjadi kesalahan saat mengimpor data.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
          {/* Modal Header */}
          <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Upload className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="text-sm font-bold tracking-wide">
                  Impor Data CSV ke {register.code} ({register.title})
                </h3>
                <p className="text-[11px] text-slate-300">
                  Pemetaan otomatis kolom sesuai format petunjuk Intelijen Kejaksaan RI
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Rule explanation banners based on register */}
          {register.code === "R.IN.1" && (
            <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2.5 text-xs text-emerald-950 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div className="space-y-0.5 w-full">
                <span className="font-bold text-emerald-900">
                  Aturan Pemetaan Kolom R.IN.1 (Register Surat Masuk) Aktif:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1 text-[11px] text-emerald-900 mt-1">
                  <div>• <strong>TGL (Penerimaan):</strong> Tanggal dari CSV (ISO)</div>
                  <div>• <strong>JAM (Penerimaan):</strong> Acak (09:00 - 15:00)</div>
                  <div>• <strong>NOMOR:</strong> Nomor Surat dari CSV</div>
                  <div>• <strong>TGL (Surat):</strong> Tanggal dari CSV</div>
                  <div>• <strong>ASAL SURAT:</strong> Asal dari CSV</div>
                  <div>• <strong>PERIHAL:</strong> Hal dari CSV</div>
                  <div>• <strong>TGL/ISI:</strong> Tanggal Surat</div>
                  <div>• <strong>TINDAK LANJUT:</strong> DITINDAKLANJUTI</div>
                  <div>• <strong>KET:</strong> -</div>
                </div>
              </div>
            </div>
          )}

          {register.code === "R.IN.3" && (
            <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2.5 text-xs text-emerald-950 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div className="space-y-0.5 w-full">
                <span className="font-bold text-emerald-900">
                  Aturan Pemetaan Kolom R.IN.3 (Informasi Intelijen) Aktif:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] text-emerald-900 mt-1">
                  <div>• <strong>Waktu Diterima:</strong> Tanggal surat (ISO)</div>
                  <div>• <strong>Sumber / Bapul:</strong> Organik Intelijen Kejari Tabanan</div>
                  <div>• <strong>Nilai Informasi:</strong> A1</div>
                  <div>• <strong>Catatan & Ket:</strong> -</div>
                  <div>• <strong>Uraian Masalah:</strong> Hal (teks setelah tanda <code className="bg-white/80 px-1 rounded">-</code>)</div>
                  <div>• <strong>Disposisi:</strong> Dilaporkan Kepada Pimpinan</div>
                  <div>• <strong>Tindak Lanjut:</strong> Hal (sebelum <code className="bg-white/80 px-1 rounded">-</code>) Nomor: Nomor</div>
                </div>
              </div>
            </div>
          )}

          {register.code === "R.IN.6" && (
            <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 text-xs text-amber-950 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-amber-900">
                    Aturan Pemetaan Kolom R.IN.6 (Register Arsip) Aktif:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1 text-[11px] text-amber-900 mt-1">
                    <div>• <strong>Waktu Terima:</strong> Tanggal + Jam Acak (09:00 - 15:00)</div>
                    <div>• <strong>Diterima Dari:</strong> Asal dari CSV</div>
                    <div>• <strong>No & Tgl Surat:</strong> Nomor & Tanggal Surat</div>
                    <div>• <strong>Perihal:</strong> Hal dari CSV</div>
                    <div>• <strong>Lampiran:</strong> -</div>
                    <div>• <strong>Kode Penyimpanan:</strong> Dicocokkan dari Tabel Kode Penyimpanan</div>
                    <div>• <strong>Ket:</strong> DISIMPAN DALAM ARSIP</div>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsStorageModalOpen(true)}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-200/80 hover:bg-amber-300 rounded-lg border border-amber-300 transition cursor-pointer shadow-xs"
              >
                <FolderArchive className="w-3.5 h-3.5" />
                <span>Kelola Kode Penyimpanan ({storageCodes.length})</span>
              </button>
            </div>
          )}

          {/* Nav Tabs */}
          <div className="flex border-b border-slate-200 px-5 pt-3 gap-3 bg-slate-50">
            <button
              onClick={() => setPreviewTab("input")}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                previewTab === "input"
                  ? "border-emerald-600 text-emerald-800"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Input / Unggah File CSV</span>
            </button>
            <button
              onClick={() => setPreviewTab("preview")}
              disabled={parsedRows.length === 0}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                previewTab === "preview"
                  ? "border-emerald-600 text-emerald-800"
                  : "border-transparent text-slate-500 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
              }`}
            >
              <Table className="w-4 h-4" />
              <span>Hasil Pratinjau ({parsedRows.length} Baris)</span>
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-5 overflow-y-auto flex-1 space-y-4">
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {previewTab === "input" ? (
              <div className="space-y-4">
                {/* File Upload Zone */}
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 text-center hover:border-emerald-500 bg-slate-50 transition cursor-pointer relative">
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  />
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">
                    Klik untuk memilih file CSV atau drag & drop file ke sini
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Format berkas .csv dengan pemisah koma (comma delimited)
                  </p>
                </div>

                {/* Or Paste CSV */}
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Atau Tempelkan (Paste) Teks CSV di bawah:
                    </label>

                    <div className="flex items-center gap-2">
                      {register.code === "R.IN.1" && (
                        <button
                          type="button"
                          onClick={() => handleLoadSample(SAMPLE_RIN1_CSV)}
                          className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 underline cursor-pointer flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Gunakan Contoh CSV R.IN.1
                        </button>
                      )}
                      {register.code === "R.IN.3" && (
                        <button
                          type="button"
                          onClick={() => handleLoadSample(SAMPLE_RIN3_CSV)}
                          className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 underline cursor-pointer flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Gunakan Data Contoh CSV R.IN.3
                        </button>
                      )}
                      {register.code === "R.IN.6" && (
                        <button
                          type="button"
                          onClick={() => handleLoadSample(SAMPLE_RIN6_CSV)}
                          className="text-[11px] font-semibold text-amber-800 hover:text-amber-900 underline cursor-pointer flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Gunakan Contoh CSV R.IN.6
                        </button>
                      )}
                    </div>
                  </div>
                  <textarea
                    rows={8}
                    value={csvText}
                    onChange={(e) => {
                      setCsvText(e.target.value);
                      if (e.target.value.trim()) {
                        handleParseCsv(e.target.value);
                      } else {
                        setParsedRows([]);
                      }
                    }}
                    placeholder={`"No","Satker","Jenis Surat","Tanggal","Nomor","Nomor Agenda","Asal","Hal","Status"\n"1","KEJAKSAAN NEGERI TABANAN","BIASA INTERNAL / EKSTERNAL","20-08-2026","B-5142/N.1.7/H.III/08/2026","1615","KEJAKSAAN TINGGI BALI | BIDANG PENGAWASAN","Pemberitahuan Pelaksanaan...","Disposisi"`}
                    className="w-full font-mono text-xs p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                {parsedRows.length > 0 && (
                  <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <span className="text-xs font-bold text-emerald-900">
                      Berhasil memparsing {parsedRows.length} baris data CSV!
                    </span>
                    <button
                      onClick={() => setPreviewTab("preview")}
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-200 hover:bg-emerald-300 px-3 py-1.5 rounded transition cursor-pointer"
                    >
                      <span>Lihat Pratinjau Tabel</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                  <span>
                    Menampilkan pratinjau hasil pemetaan <strong>{parsedRows.length} baris</strong> untuk <strong>{register.code}</strong>:
                  </span>
                  <span className="text-[11px] text-slate-500">
                    💡 Anda dapat mengedit langsung isi kolom di bawah sebelum mengimpor.
                  </span>
                </div>

                {/* Table Preview for R.IN.1 */}
                {register.code === "R.IN.1" && (
                  <div className="border border-slate-300 rounded-lg overflow-x-auto max-h-[50vh]">
                    <table className="w-full text-[11px] text-left border-collapse">
                      <thead className="bg-slate-100 text-slate-800 font-bold sticky top-0 border-b border-slate-300">
                        <tr>
                          <th className="p-2 border-r border-slate-200 text-center w-12">No</th>
                          <th className="p-2 border-r border-slate-200 w-24">Tgl Terima</th>
                          <th className="p-2 border-r border-slate-200 w-20">Jam (Acak)</th>
                          <th className="p-2 border-r border-slate-200 min-w-[160px]">Nomor Surat</th>
                          <th className="p-2 border-r border-slate-200 w-24">Tgl Surat</th>
                          <th className="p-2 border-r border-slate-200 min-w-[180px]">Asal Surat</th>
                          <th className="p-2 border-r border-slate-200 min-w-[220px]">Perihal</th>
                          <th className="p-2 border-r border-slate-200 w-24">Tgl/Isi Disp</th>
                          <th className="p-2 border-r border-slate-200 w-28">Tindak Lanjut</th>
                          <th className="p-2 text-center w-10">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {parsedRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2 border-r border-slate-200 text-center font-bold text-slate-700">
                              {row.nomorUrut}
                            </td>
                            <td className="p-2 border-r border-slate-200 font-mono text-slate-800 whitespace-nowrap">
                              <input
                                type="text"
                                value={row.data.tgl_terima || ""}
                                onChange={(e) => handleUpdateRowField(idx, "tgl_terima", e.target.value)}
                                className="w-full bg-transparent border-0 p-0 focus:ring-1 focus:ring-emerald-500 rounded"
                              />
                            </td>
                            <td className="p-2 border-r border-slate-200 font-mono text-emerald-800 font-bold whitespace-nowrap">
                              <input
                                type="text"
                                value={row.data.jam_terima || ""}
                                onChange={(e) => handleUpdateRowField(idx, "jam_terima", e.target.value)}
                                className="w-full bg-transparent border-0 p-0 focus:ring-1 focus:ring-emerald-500 rounded"
                              />
                            </td>
                            <td className="p-2 border-r border-slate-200 text-slate-800">
                              <input
                                type="text"
                                value={row.data.nomor_surat || ""}
                                onChange={(e) => handleUpdateRowField(idx, "nomor_surat", e.target.value)}
                                className="w-full bg-transparent border-0 p-0 focus:ring-1 focus:ring-emerald-500 rounded"
                              />
                            </td>
                            <td className="p-2 border-r border-slate-200 font-mono text-slate-800 whitespace-nowrap">
                              <input
                                type="text"
                                value={row.data.tgl_surat || ""}
                                onChange={(e) => handleUpdateRowField(idx, "tgl_surat", e.target.value)}
                                className="w-full bg-transparent border-0 p-0 focus:ring-1 focus:ring-emerald-500 rounded"
                              />
                            </td>
                            <td className="p-2 border-r border-slate-200 text-slate-900 font-medium">
                              <input
                                type="text"
                                value={row.data.asal_surat || ""}
                                onChange={(e) => handleUpdateRowField(idx, "asal_surat", e.target.value)}
                                className="w-full bg-transparent border-0 p-0 focus:ring-1 focus:ring-emerald-500 rounded"
                              />
                            </td>
                            <td className="p-2 border-r border-slate-200 text-slate-800">
                              <input
                                type="text"
                                value={row.data.perihal || ""}
                                onChange={(e) => handleUpdateRowField(idx, "perihal", e.target.value)}
                                className="w-full bg-transparent border-0 p-0 focus:ring-1 focus:ring-emerald-500 rounded"
                              />
                            </td>
                            <td className="p-2 border-r border-slate-200 text-slate-700">
                              {row.data.tgl_isi_disposisi}
                            </td>
                            <td className="p-2 border-r border-slate-200 font-semibold text-emerald-800">
                              {row.data.tindak_lanjut}
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeletePreviewRow(idx)}
                                className="text-slate-400 hover:text-red-600 p-1"
                                title="Hapus baris ini dari impor"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Table Preview for R.IN.6 */}
                {register.code === "R.IN.6" && (
                  <div className="border border-slate-300 rounded-lg overflow-x-auto max-h-[50vh]">
                    <table className="w-full text-[11px] text-left border-collapse">
                      <thead className="bg-amber-100/70 text-slate-800 font-bold sticky top-0 border-b border-slate-300">
                        <tr>
                          <th className="p-2 border-r border-slate-200 text-center w-12">No</th>
                          <th className="p-2 border-r border-slate-200 min-w-[140px]">Waktu Terima (Acak)</th>
                          <th className="p-2 border-r border-slate-200 min-w-[180px]">Diterima Dari</th>
                          <th className="p-2 border-r border-slate-200 min-w-[180px]">No. & Tgl Surat</th>
                          <th className="p-2 border-r border-slate-200 min-w-[220px]">Perihal</th>
                          <th className="p-2 border-r border-slate-200 w-16 text-center">Lampiran</th>
                          <th className="p-2 border-r border-slate-200 min-w-[150px]">Kode Penyimpanan</th>
                          <th className="p-2 border-r border-slate-200 w-32">Keterangan</th>
                          <th className="p-2 text-center w-10">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {parsedRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-amber-50/40">
                            <td className="p-2 border-r border-slate-200 text-center font-bold text-slate-700">
                              {row.nomorUrut}
                            </td>
                            <td className="p-2 border-r border-slate-200 font-mono text-slate-800 whitespace-nowrap">
                              <input
                                type="text"
                                value={row.data.waktu_terima || ""}
                                onChange={(e) => handleUpdateRowField(idx, "waktu_terima", e.target.value)}
                                className="w-full bg-transparent border-0 p-0 focus:ring-1 focus:ring-amber-500 rounded"
                              />
                            </td>
                            <td className="p-2 border-r border-slate-200 font-medium text-slate-900">
                              <input
                                type="text"
                                value={row.data.diterima_dari || ""}
                                onChange={(e) => handleUpdateRowField(idx, "diterima_dari", e.target.value)}
                                className="w-full bg-transparent border-0 p-0 focus:ring-1 focus:ring-amber-500 rounded"
                              />
                            </td>
                            <td className="p-2 border-r border-slate-200 text-slate-800">
                              <input
                                type="text"
                                value={row.data.no_tgl_surat || ""}
                                onChange={(e) => handleUpdateRowField(idx, "no_tgl_surat", e.target.value)}
                                className="w-full bg-transparent border-0 p-0 focus:ring-1 focus:ring-amber-500 rounded"
                              />
                            </td>
                            <td className="p-2 border-r border-slate-200 text-slate-800">
                              <input
                                type="text"
                                value={row.data.perihal || ""}
                                onChange={(e) => handleUpdateRowField(idx, "perihal", e.target.value)}
                                className="w-full bg-transparent border-0 p-0 focus:ring-1 focus:ring-amber-500 rounded"
                              />
                            </td>
                            <td className="p-2 border-r border-slate-200 text-center text-slate-500">
                              {row.data.lampiran || "-"}
                            </td>
                            <td className="p-2 border-r border-slate-200 font-mono font-bold text-amber-900 bg-amber-50/50">
                              <input
                                type="text"
                                value={row.data.kode_penyimpanan || ""}
                                onChange={(e) => handleUpdateRowField(idx, "kode_penyimpanan", e.target.value)}
                                placeholder="Contoh: ARSIP-01"
                                className="w-full bg-transparent border-0 p-0 focus:ring-1 focus:ring-amber-500 rounded text-amber-900 font-bold"
                              />
                            </td>
                            <td className="p-2 border-r border-slate-200 text-slate-600 text-xs">
                              {row.data.keterangan || "DISIMPAN DALAM ARSIP"}
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeletePreviewRow(idx)}
                                className="text-slate-400 hover:text-red-600 p-1"
                                title="Hapus baris ini dari impor"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Table Preview for R.IN.3 and Others */}
                {register.code !== "R.IN.1" && register.code !== "R.IN.6" && (
                  <div className="border border-slate-300 rounded-lg overflow-x-auto max-h-[50vh]">
                    <table className="w-full text-[11px] text-left border-collapse">
                      <thead className="bg-slate-100 text-slate-800 font-bold sticky top-0 border-b border-slate-300">
                        <tr>
                          <th className="p-2 border-r border-slate-200 text-center w-12">No</th>
                          <th className="p-2 border-r border-slate-200 w-24">Waktu Diterima</th>
                          <th className="p-2 border-r border-slate-200 w-36">Sumber / Bapul</th>
                          <th className="p-2 border-r border-slate-200 text-center w-16">Nilai</th>
                          <th className="p-2 border-r border-slate-200 min-w-[200px]">Uraian Peristiwa/Masalah</th>
                          <th className="p-2 border-r border-slate-200 w-24">Catatan</th>
                          <th className="p-2 border-r border-slate-200 min-w-[140px]">Disposisi/Tindakan</th>
                          <th className="p-2 border-r border-slate-200 min-w-[200px]">Tindak Lanjut</th>
                          <th className="p-2 text-center w-10">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {parsedRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2 border-r border-slate-200 text-center font-bold text-slate-700">
                              {row.nomorUrut}
                            </td>
                            <td className="p-2 border-r border-slate-200 font-mono text-slate-800 whitespace-nowrap">
                              {row.data.waktu_diterima || row.tgl}
                            </td>
                            <td className="p-2 border-r border-slate-200 text-slate-800">
                              {row.data.sumber_bapul}
                            </td>
                            <td className="p-2 border-r border-slate-200 text-center font-bold text-emerald-800">
                              {row.data.nilai_data}
                            </td>
                            <td className="p-2 border-r border-slate-200 text-slate-900">
                              {row.data.uraian_peristiwa}
                            </td>
                            <td className="p-2 border-r border-slate-200 text-center text-slate-500">
                              {row.data.catatan}
                            </td>
                            <td className="p-2 border-r border-slate-200 text-slate-800">
                              {row.data.disposisi_tindakan}
                            </td>
                            <td className="p-2 border-r border-slate-200 text-slate-800">
                              {row.data.tindak_lanjut}
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeletePreviewRow(idx)}
                                className="text-slate-400 hover:text-red-600 p-1"
                                title="Hapus baris ini"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Options */}
                <div className="pt-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={clearExisting}
                      onChange={(e) => setClearExisting(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>
                      Hapus data yang sudah ada di register {register.code} sebelum mengimpor (Gantikan Seluruh Data)
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition cursor-pointer"
            >
              Batal
            </button>

            <div className="flex items-center gap-2">
              {previewTab === "preview" && (
                <button
                  type="button"
                  onClick={() => setPreviewTab("input")}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 transition cursor-pointer"
                >
                  Kembali ke Input
                </button>
              )}

              <button
                id="btn-confirm-import-csv"
                type="button"
                onClick={handleSubmitImport}
                disabled={isLoading || parsedRows.length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Mengimpor Data...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>
                      Impor {parsedRows.length > 0 ? `${parsedRows.length} Baris Data` : "Sekarang"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Storage Codes Modal */}
      {isStorageModalOpen && (
        <StorageCodesModal
          isOpen={isStorageModalOpen}
          onClose={() => {
            setIsStorageModalOpen(false);
            fetchStorageCodes();
          }}
        />
      )}
    </>
  );
};
