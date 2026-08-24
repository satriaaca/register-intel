import React, { useState } from "react";
import { RegisterDefinition, RegisterEntryRow, Officer, AppSettings } from "../types.ts";
import { generateRegisterPdf } from "../lib/pdf-generator.ts";
import { EntryFormModal } from "./EntryFormModal.tsx";
import { PdfPreviewModal } from "./PdfPreviewModal.tsx";
import {
  MONTH_NAMES_ID,
  MONTH_SHORT_ID,
  getClosingDateForPeriod,
  formatDateIndonesian,
  filterEntriesByPeriod,
  getDefaultClosingDate,
} from "../lib/date-utils.ts";
import {
  Plus,
  Download,
  Eye,
  Trash2,
  Edit3,
  FileSpreadsheet,
  FileText,
  FileCode,
  Layers,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  Save,
  Filter,
  Upload,
  FolderArchive,
} from "lucide-react";
import jsPDF from "jspdf";
import { ImportCsvModal } from "./ImportCsvModal.tsx";
import { StorageCodesModal } from "./StorageCodesModal.tsx";

interface RegisterDocumentViewProps {
  register: RegisterDefinition;
  entries: RegisterEntryRow[];
  officers: Officer[];
  settings: AppSettings;
  onSaveEntry: (data: { id?: number; nomorUrut: number; tgl?: string; waktu?: string; data: Record<string, any> }) => Promise<void>;
  onDeleteEntry: (id: number) => Promise<void>;
  onUpdateSettings?: (newSettings: Partial<AppSettings>) => Promise<void>;
  onReload: () => void;
}

export const RegisterDocumentView: React.FC<RegisterDocumentViewProps> = ({
  register,
  entries,
  officers,
  settings,
  onSaveEntry,
  onDeleteEntry,
  onUpdateSettings,
  onReload,
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<RegisterEntryRow | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isImportCsvOpen, setIsImportCsvOpen] = useState(false);
  const [isStorageCodesOpen, setIsStorageCodesOpen] = useState(false);
  const [generatedPdf, setGeneratedPdf] = useState<jsPDF | null>(null);

  // In-app Delete Confirmation State
  const [entryToDelete, setEntryToDelete] = useState<RegisterEntryRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Paper Orientation State (Dynamic Landscape / Portrait switcher)
  const [currentOrientation, setCurrentOrientation] = useState<"landscape" | "portrait">(
    register.orientation || "landscape"
  );

  // Update orientation state when selected register changes
  React.useEffect(() => {
    setCurrentOrientation(register.orientation || "landscape");
  }, [register.code, register.orientation]);

  // Monthly Period State
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  // Default to January (1) or current month
  const [selectedMonth, setSelectedMonth] = useState<number | "all">(1);
  const [isEditingClosingDate, setIsEditingClosingDate] = useState(false);
  const [tempClosingDate, setTempClosingDate] = useState<string>("");
  const [isSavingClosingDate, setIsSavingClosingDate] = useState(false);

  // Compute active closing date
  const activeMonthIdx = typeof selectedMonth === "number" ? selectedMonth : 1;
  const activeClosingDate =
    typeof selectedMonth === "number"
      ? getClosingDateForPeriod(settings, selectedYear, selectedMonth)
      : settings.tanggalDokumen || new Date().toISOString().split("T")[0];

  const activeClosingDateFormatted = formatDateIndonesian(activeClosingDate, false);
  const activeClosingDateWithDay = formatDateIndonesian(activeClosingDate, true);

  // Filter entries based on selected monthly period
  const filteredEntries = filterEntriesByPeriod(entries, selectedYear, selectedMonth);

  // Officer lookup
  const officerMap = new Map<number, Officer>();
  officers.forEach((o) => officerMap.set(o.id, o));

  const formatOfficerValue = (val: any) => {
    if (!val) return <span className="text-slate-400">-</span>;
    if (Array.isArray(val)) {
      if (val.length === 0) return <span className="text-slate-400">-</span>;
      return (
        <div className="flex flex-wrap gap-1">
          {val.map((id) => {
            const off = officerMap.get(Number(id));
            return (
              <span
                key={id}
                className="inline-flex items-center text-[10px] bg-emerald-50 text-emerald-900 border border-emerald-300 px-1.5 py-0.2 rounded font-medium"
              >
                {off ? off.nama : `Petugas #${id}`}
              </span>
            );
          })}
        </div>
      );
    }
    if (typeof val === "number") {
      const off = officerMap.get(val);
      return off ? (
        <span className="inline-flex items-center text-[10px] bg-emerald-50 text-emerald-900 border border-emerald-300 px-1.5 py-0.2 rounded font-medium">
          {off.nama}
        </span>
      ) : (
        String(val)
      );
    }
    return String(val);
  };

  const handleOpenNew = () => {
    setEditingEntry(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (entry: RegisterEntryRow) => {
    setEditingEntry(entry);
    setIsFormOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!entryToDelete) return;
    try {
      setIsDeleting(true);
      await onDeleteEntry(entryToDelete.id);
      setEntryToDelete(null);
      onReload();
    } catch (err: any) {
      console.error("Error deleting entry:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleGeneratePdf = () => {
    const doc = generateRegisterPdf({
      register,
      entries: filteredEntries,
      settings,
      officers,
      tahunTakwim: selectedYear,
      selectedMonth,
      customClosingDate: activeClosingDate,
      orientationOverride: currentOrientation,
    });
    return doc;
  };

  const handleDownloadPdf = () => {
    const doc = handleGeneratePdf();
    const periodSlug =
      typeof selectedMonth === "number"
        ? `_${MONTH_NAMES_ID[selectedMonth - 1]}_${selectedYear}`
        : `_${selectedYear}`;
    const filename = `${register.code}${periodSlug}_${register.title.replace(/[\/\s,]+/g, "_").slice(0, 35)}.pdf`;
    doc.save(filename);
  };

  const handlePreviewPdf = () => {
    const doc = handleGeneratePdf();
    setGeneratedPdf(doc);
    setIsPreviewOpen(true);
  };

  const handleStartEditClosingDate = () => {
    setTempClosingDate(activeClosingDate);
    setIsEditingClosingDate(true);
  };

  const handleSaveClosingDate = async () => {
    if (!onUpdateSettings || typeof selectedMonth !== "number") return;
    try {
      setIsSavingClosingDate(true);
      const monthKey = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;
      const newClosingDates = {
        ...(settings.closingDates || {}),
        [monthKey]: tempClosingDate,
      };
      await onUpdateSettings({
        closingDates: newClosingDates,
      });
      setIsEditingClosingDate(false);
    } catch (e: any) {
      console.error("Gagal memperbarui tanggal penutupan:", e);
    } finally {
      setIsSavingClosingDate(false);
    }
  };

  // Next Nomor Urut
  const nextNomorUrut = filteredEntries.length > 0 ? Math.max(...filteredEntries.map((e) => e.nomorUrut || 0)) + 1 : 1;

  const currentPeriodLabel =
    typeof selectedMonth === "number"
      ? `Bulan ${MONTH_NAMES_ID[selectedMonth - 1]} ${selectedYear}`
      : `Tahun Takwim ${selectedYear} (Semua Bulan)`;

  return (
    <div className="space-y-3.5">
      {/* Monthly Period Filter & Status Ribbon */}
      <div className="bg-white rounded-lg shadow-2xs border border-slate-200 p-3 flex flex-col gap-2.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          {/* Year and Quick Period Info */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded border border-slate-300">
              <Calendar className="w-3.5 h-3.5 text-emerald-700" />
              <span>Tahun:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="bg-transparent font-bold text-emerald-800 outline-none cursor-pointer"
              >
                {(settings.availableYears && settings.availableYears.length > 0
                  ? settings.availableYears
                  : [2024, 2025, 2026, 2027, 2028]
                ).map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            <span className="text-[11px] font-semibold text-slate-600 bg-emerald-50 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded">
              Periode Aktif: {currentPeriodLabel}
            </span>
          </div>

          {/* Closing Date of Selected Month Banner */}
          {typeof selectedMonth === "number" && (
            <div className="flex items-center gap-2 text-xs bg-amber-50 border border-amber-300 px-2.5 py-1 rounded text-amber-900">
              <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              {!isEditingClosingDate ? (
                <div className="flex items-center gap-2">
                  <span>
                    Tutup Register: <strong className="font-semibold">{activeClosingDateWithDay}</strong>
                  </span>
                  {onUpdateSettings && (
                    <button
                      onClick={handleStartEditClosingDate}
                      className="text-[10px] font-bold text-amber-800 underline hover:text-emerald-700 cursor-pointer"
                      title="Ubah tanggal penutupan khusus bulan ini"
                    >
                      Ubah Tanggal Tutup
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px]">Tgl Tutup:</span>
                  <input
                    type="date"
                    value={tempClosingDate}
                    onChange={(e) => setTempClosingDate(e.target.value)}
                    className="px-1.5 py-0.5 text-xs bg-white border border-amber-400 rounded font-mono"
                  />
                  <button
                    onClick={handleSaveClosingDate}
                    disabled={isSavingClosingDate}
                    className="px-2 py-0.5 text-[11px] font-bold bg-emerald-700 text-white rounded hover:bg-emerald-800 flex items-center gap-1"
                  >
                    <Save className="w-3 h-3" />
                    <span>{isSavingClosingDate ? "..." : "Simpan"}</span>
                  </button>
                  <button
                    onClick={() => setIsEditingClosingDate(false)}
                    className="px-1.5 py-0.5 text-[11px] text-slate-600 hover:text-slate-800"
                  >
                    Batal
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 12 Months Tabs Navigation */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs scrollbar-thin">
          <button
            onClick={() => setSelectedMonth("all")}
            className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              selectedMonth === "all"
                ? "bg-slate-800 text-white shadow-2xs font-bold"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
            }`}
          >
            Semua Bulan ({entries.length})
          </button>

          {MONTH_NAMES_ID.map((name, idx) => {
            const mNum = idx + 1;
            const isSelected = selectedMonth === mNum;
            const count = filterEntriesByPeriod(entries, selectedYear, mNum).length;

            return (
              <button
                key={mNum}
                onClick={() => {
                  setSelectedMonth(mNum);
                  setIsEditingClosingDate(false);
                }}
                className={`px-2 py-1 rounded text-xs whitespace-nowrap transition flex items-center gap-1 cursor-pointer ${
                  isSelected
                    ? "bg-emerald-700 text-white font-bold shadow-2xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 font-medium"
                }`}
              >
                <span>{MONTH_SHORT_ID[idx]}</span>
                {count > 0 && (
                  <span
                    className={`text-[9px] px-1 py-0.2 rounded-full font-mono font-bold ${
                      isSelected ? "bg-white text-emerald-800" : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* High Density Toolbar & Metadata Strip */}
      <div className="bg-white rounded-lg shadow-2xs border border-slate-200 p-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-700 text-white">
              {register.code}
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                register.orientation === "landscape"
                  ? "bg-amber-50 text-amber-800 border-amber-300"
                  : "bg-blue-50 text-blue-800 border-blue-300"
              }`}
            >
              Format {register.orientation} (A4)
            </span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-emerald-50 text-emerald-900 rounded border border-emerald-300">
              Periode Bulanan: {currentPeriodLabel}
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              • {filteredEntries.length} baris data pada periode ini ({entries.length} total tahunan)
            </span>
          </div>

          <h2 className="text-sm sm:text-base font-bold text-slate-900 font-serif leading-snug">
            {register.title}
          </h2>
          {register.subtitle && (
            <p className="text-[11px] text-slate-600 font-medium">{register.subtitle}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Dynamic Orientation Switcher */}
          <button
            id="btn-toggle-orientation"
            onClick={() => setCurrentOrientation((prev) => (prev === "landscape" ? "portrait" : "landscape"))}
            title="Klik untuk mengubah orientasi dokumen cetak PDF antara Landscape dan Portrait"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded border shadow-2xs transition cursor-pointer ${
              currentOrientation === "landscape"
                ? "bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100"
                : "bg-blue-50 text-blue-900 border-blue-300 hover:bg-blue-100"
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Format: {currentOrientation === "landscape" ? "Landscape" : "Portrait"}</span>
            <span className="text-[10px] text-emerald-800 font-normal underline ml-0.5">Ubah</span>
          </button>

          <button
            id="btn-add-entry-row"
            onClick={handleOpenNew}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded shadow-2xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Baris</span>
          </button>

          {register.code === "R.IN.6" && (
            <button
              id="btn-manage-storage-codes"
              onClick={() => setIsStorageCodesOpen(true)}
              title="Kelola tabel relasi Nomor dan Asal Kode Penyimpanan Arsip"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded shadow-2xs transition cursor-pointer"
            >
              <FolderArchive className="w-3.5 h-3.5 text-amber-700" />
              <span>Kode Penyimpanan</span>
            </button>
          )}

          <button
            id="btn-import-csv"
            onClick={() => setIsImportCsvOpen(true)}
            title="Impor data massal dari file CSV atau teks CSV"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded shadow-2xs transition cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-700" />
            <span>Impor CSV</span>
          </button>

          <button
            id="btn-preview-pdf"
            onClick={handlePreviewPdf}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded shadow-2xs transition cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-slate-600" />
            <span>Pratinjau PDF</span>
          </button>

          <button
            id="btn-download-pdf-direct"
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-500 rounded shadow-2xs transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh PDF Periode</span>
          </button>
        </div>
      </div>

      {/* Official Register Document Canvas Preview (Visual Paper Style) */}
      <div className="bg-white rounded-lg shadow-xs border border-slate-300 p-4 sm:p-6 font-sans">
        {/* Document Header Box */}
        <div className="border border-slate-900 p-3 rounded-xs mb-4 relative">
          <div className="absolute top-2 right-2.5 font-mono font-bold text-xs text-slate-800">
            {register.code}
          </div>

          <div className="text-left font-bold text-[11px] uppercase text-slate-900 mb-1">
            {settings.kejaksaanName}*)
          </div>

          <div className="text-center my-2">
            <h1 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide font-serif">
              {register.title}
            </h1>
            {register.subtitle && (
              <p className="text-[11px] font-semibold text-slate-700 mt-0.5 uppercase">
                {register.subtitle}
              </p>
            )}
            <p className="text-[11px] font-bold text-emerald-800 mt-1 uppercase">
              PERIODE: {typeof selectedMonth === "number" ? `BULAN ${MONTH_NAMES_ID[selectedMonth - 1].toUpperCase()}` : "SEMUA BULAN"} - TAHUN TAKWIM {selectedYear}
            </p>
          </div>
        </div>

        {/* Register Table */}
        <div className="overflow-x-auto border border-slate-900 rounded-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              {/* Level 1 Header */}
              <tr className="bg-slate-100 border-b border-slate-900 text-slate-900 text-center font-bold">
                {register.columns.map((col) => {
                  if (col.subColumns && col.subColumns.length > 0) {
                    return (
                      <th
                        key={col.key}
                        colSpan={col.subColumns.length}
                        className="border-r border-slate-900 px-2 py-1.5 uppercase text-[10px] bg-slate-200/70"
                      >
                        {col.label}
                      </th>
                    );
                  }
                  return (
                    <th
                      key={col.key}
                      rowSpan={register.columns.some((c) => c.subColumns) ? 2 : 1}
                      className="border-r border-slate-900 px-2 py-1.5 uppercase text-[10px]"
                    >
                      {col.label}
                    </th>
                  );
                })}
                <th
                  rowSpan={register.columns.some((c) => c.subColumns) ? 2 : 1}
                  className="px-2 py-1.5 uppercase text-[10px] w-16 text-center bg-slate-200/80"
                >
                  AKSI
                </th>
              </tr>

              {/* Level 2 Sub-columns if applicable */}
              {register.columns.some((c) => c.subColumns) && (
                <tr className="bg-slate-100 border-b border-slate-900 text-slate-900 text-center font-bold">
                  {register.columns
                    .filter((c) => c.subColumns && c.subColumns.length > 0)
                    .flatMap((c) => c.subColumns!)
                    .map((sc) => (
                      <th
                        key={sc.key}
                        className="border-r border-slate-900 px-1.5 py-1 uppercase text-[9px]"
                      >
                        {sc.label}
                      </th>
                    ))}
                </tr>
              )}

              {/* Column Numbers Row (Kolom 1, 2, 3, 4...) */}
              <tr className="bg-slate-200/90 border-b border-slate-900 text-slate-800 font-bold text-center text-[9px] font-mono">
                {register.columns.map((col) => {
                  if (col.subColumns && col.subColumns.length > 0) {
                    return col.subColumns.map((sc) => (
                      <th key={sc.key} className="border-r border-slate-900 px-1 py-0.5">
                        {sc.colNumber}
                      </th>
                    ));
                  }
                  return (
                    <th key={col.key} className="border-r border-slate-900 px-1 py-0.5">
                      {col.colNumber}
                    </th>
                  );
                })}
                <th className="px-1 py-0.5 text-slate-500 font-normal">Edit</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-400">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td
                    colSpan={
                      register.columns.reduce(
                        (sum, c) => sum + (c.subColumns ? c.subColumns.length : 1),
                        0
                      ) + 1
                    }
                    className="px-4 py-8 text-center text-slate-400 bg-slate-50/50"
                  >
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <FileSpreadsheet className="w-7 h-7 text-slate-300" />
                      <p className="text-xs font-medium text-slate-600">
                        Belum ada data dalam buku register {register.code} pada periode {currentPeriodLabel}.
                      </p>
                      <button
                        onClick={handleOpenNew}
                        className="text-xs text-emerald-700 hover:text-emerald-800 font-bold underline cursor-pointer"
                      >
                        + Tambah Baris Baru pada Periode Ini
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry, idx) => {
                  const d = entry.data || {};
                  return (
                    <tr key={entry.id} className="hover:bg-amber-50/50 transition">
                      {register.columns.map((col) => {
                        if (col.subColumns && col.subColumns.length > 0) {
                          return col.subColumns.map((sc) => (
                            <td
                              key={sc.key}
                              className="border-r border-slate-900 px-2 py-1.5 align-top text-xs text-slate-900 whitespace-pre-wrap"
                            >
                              {sc.type === "officer_multi" || sc.type === "officer_single"
                                ? formatOfficerValue(d[sc.key])
                                : d[sc.key] || "-"}
                            </td>
                          ));
                        }

                        if (col.key === "no") {
                          return (
                            <td
                              key={col.key}
                              className="border-r border-slate-900 px-1.5 py-1.5 text-center font-bold text-slate-900 align-top font-mono"
                            >
                              {entry.nomorUrut || idx + 1}
                            </td>
                          );
                        }

                        return (
                          <td
                            key={col.key}
                            className="border-r border-slate-900 px-2 py-1.5 align-top text-xs text-slate-900 whitespace-pre-wrap"
                          >
                            {col.type === "officer_multi" || col.type === "officer_single"
                              ? formatOfficerValue(d[col.key])
                              : d[col.key] || "-"}
                          </td>
                        );
                      })}

                      {/* Row Actions */}
                      <td className="px-1 py-1.5 text-center align-top bg-slate-50/60">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            id={`btn-edit-row-${entry.id}`}
                            onClick={() => handleOpenEdit(entry)}
                            title="Edit Data Baris"
                            className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-100 rounded transition cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`btn-delete-row-${entry.id}`}
                            onClick={() => setEntryToDelete(entry)}
                            title="Hapus Data Baris"
                            className="p-1 text-slate-500 hover:text-red-700 hover:bg-red-100 rounded transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Formal Monthly Closure Statement (Catatan Penutupan Register Kejaksaan) */}
        <div className="mt-4 p-2.5 border border-slate-300 rounded bg-slate-50 text-xs text-slate-800">
          <p className="font-semibold italic text-[11px] leading-relaxed">
            Catatan Penutupan: Pada hari ini <strong>{activeClosingDateWithDay}</strong>, Buku Register {register.code} ({register.title}) periode {currentPeriodLabel} ini ditutup dengan <strong>{filteredEntries.length} baris data register</strong>.
          </p>
        </div>

        {/* Rekapitulasi Section if applicable */}
        {register.hasRekapitulasi && register.rekapitulasiFields && (
          <div className="mt-4 p-3 border border-slate-300 rounded bg-slate-50 max-w-sm text-xs">
            <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-1.5">
              Rekapitulasi Dokumen Register ({currentPeriodLabel}):
            </h4>
            <div className="space-y-1 text-slate-700">
              {register.rekapitulasiFields.map((rf, idx) => {
                const count = filteredEntries.filter((e) => {
                  const val = e.data?.[rf.key] || e.data?.jenis_produk;
                  return val !== undefined && val !== "" && val !== null;
                }).length;
                return (
                  <div key={rf.key} className="flex items-center justify-between border-b border-slate-200/60 pb-0.5 text-[11px]">
                    <span>{idx + 1}. {rf.label}</span>
                    <span className="font-bold text-slate-900 font-mono">
                      : {count > 0 ? count : 0} {rf.suffix || ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Official Signers Box (Kejaksaan Dual Signatures - Split or Center) */}
        <div className="mt-8 pt-4 border-t border-slate-300">
          {settings.signatureAlignment === "center" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs text-center max-w-2xl mx-auto">
              {/* Left Signer Center: Kajari */}
              <div className="flex flex-col items-center space-y-0.5">
                <p className="text-slate-600 text-[11px]">Mengetahui:</p>
                <p className="font-bold text-slate-900 uppercase text-xs">
                  {settings.leftSignerTitle.replace("Mengetahui:\n", "").replace("Mengetahui:", "")}
                </p>
                <div className="h-16 flex items-end justify-center">
                  <div className="text-center">
                    <p className="font-bold text-slate-900 underline text-xs">{settings.leftSignerName}</p>
                    <p className="text-[10px] text-slate-600">{settings.leftSignerPangkatNip}</p>
                  </div>
                </div>
              </div>

              {/* Right Signer Center: Kasi Intel */}
              <div className="flex flex-col items-center space-y-0.5">
                <p className="text-slate-600 text-[11px]">
                  {settings.tempatDokumen},{" "}
                  <strong className="text-slate-900 font-semibold">{activeClosingDateFormatted}</strong>
                </p>
                <p className="font-bold text-slate-900 uppercase text-xs">{settings.rightSignerTitle}</p>
                <div className="h-16 flex items-end justify-center">
                  <div className="text-center">
                    <p className="font-bold text-slate-900 underline text-xs">{settings.rightSignerName}</p>
                    <p className="text-[10px] text-slate-600">{settings.rightSignerPangkatNip}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start justify-between gap-6 text-xs">
              {/* Left Signer: Kajari */}
              <div className="w-full sm:w-60 space-y-0.5">
                <p className="text-slate-600 text-[11px]">Mengetahui:</p>
                <p className="font-bold text-slate-900 uppercase text-xs">
                  {settings.leftSignerTitle.replace("Mengetahui:\n", "").replace("Mengetahui:", "")}
                </p>
                <div className="h-14 flex items-end">
                  <div className="w-full">
                    <p className="font-bold text-slate-900 underline text-xs">{settings.leftSignerName}</p>
                    <p className="text-[10px] text-slate-600">{settings.leftSignerPangkatNip}</p>
                  </div>
                </div>
              </div>

              {/* Right Signer: Kasi Intelijen */}
              <div className="w-full sm:w-60 space-y-0.5 text-left sm:text-right">
                <p className="text-slate-600 text-[11px]">
                  {settings.tempatDokumen},{" "}
                  <strong className="text-slate-900 font-semibold">{activeClosingDateFormatted}</strong>
                </p>
                <p className="font-bold text-slate-900 uppercase text-xs">{settings.rightSignerTitle}</p>
                <div className="h-14 flex items-end justify-start sm:justify-end">
                  <div>
                    <p className="font-bold text-slate-900 underline text-xs">{settings.rightSignerName}</p>
                    <p className="text-[10px] text-slate-600">{settings.rightSignerPangkatNip}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 text-[10px] text-slate-400 italic border-t border-slate-200 pt-1.5 flex flex-col sm:flex-row items-center justify-between gap-1">
            <span>{register.notes || "*) Kejaksaan ditulis hanya di sampul depan."}</span>
            <span className="text-emerald-700 font-medium">
              ✓ Multi-halaman: Tanda tangan otomatis ditempatkan di halaman terakhir PDF
            </span>
          </div>
        </div>
      </div>

      {/* Entry Modal */}
      <EntryFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={async (entryData) => {
          await onSaveEntry(entryData);
          onReload();
        }}
        register={register}
        initialEntry={editingEntry}
        officers={officers}
        nextNomorUrut={nextNomorUrut}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
      />

      {/* In-App Delete Confirmation Modal */}
      {entryToDelete && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-slate-200 p-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="p-2 bg-red-100 rounded-full">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Konfirmasi Hapus Data Baris</h3>
            </div>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Apakah Anda yakin ingin menghapus data baris <strong className="text-slate-900">Nomor {entryToDelete.nomorUrut}</strong> dari buku register <strong className="text-emerald-800">{register.code}</strong>? Tindakan ini akan menghapus data secara permanen dari database.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setEntryToDelete(null)}
                disabled={isDeleting}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
              >
                Batal
              </button>
              <button
                id="btn-confirm-delete-entry"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                {isDeleting ? "Menghapus..." : "Ya, Hapus Data"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      <PdfPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        pdfDoc={generatedPdf}
        filename={`${register.code}_${typeof selectedMonth === "number" ? MONTH_NAMES_ID[selectedMonth - 1] : "Semua"}_${selectedYear}.pdf`}
      />

      {/* CSV Importer Modal */}
      <ImportCsvModal
        isOpen={isImportCsvOpen}
        onClose={() => setIsImportCsvOpen(false)}
        register={register}
        onSuccess={() => {
          onReload();
        }}
      />

      {/* Storage Codes Modal for R.IN.6 */}
      {isStorageCodesOpen && (
        <StorageCodesModal
          isOpen={isStorageCodesOpen}
          onClose={() => setIsStorageCodesOpen(false)}
        />
      )}
    </div>
  );
};
