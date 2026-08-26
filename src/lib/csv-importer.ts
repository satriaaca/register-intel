import { StorageCodeMapping } from "../types.js";

export interface ParsedCsvRow {
  [key: string]: string;
}

/**
 * Baris R.IN.3 dengan kolom Hal yang dimulai dari prefix ini tidak diimpor.
 */
const RIN3_IGNORED_HAL_PREFIXES = [
  "laporan bulanan",
  "surat pengantar",
];

/**
 * Robust CSV parser that handles quotes, escaped quotes, commas, and newlines.
 */
export function parseCsv(text: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let currentValue = "";
  let inQuotes = false;
  let index = 0;

  while (index < text.length) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentValue += '"';
          index += 2;
          continue;
        }

        inQuotes = false;
        index++;
        continue;
      }

      currentValue += char;
      index++;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      index++;
      continue;
    }

    if (char === ",") {
      row.push(currentValue.trim());
      currentValue = "";
      index++;
      continue;
    }

    if (char === "\r") {
      if (nextChar === "\n") {
        index++;
      }

      row.push(currentValue.trim());
      currentValue = "";

      if (row.some((cell) => cell.length > 0)) {
        result.push(row);
      }

      row = [];
      index++;
      continue;
    }

    if (char === "\n") {
      row.push(currentValue.trim());
      currentValue = "";

      if (row.some((cell) => cell.length > 0)) {
        result.push(row);
      }

      row = [];
      index++;
      continue;
    }

    currentValue += char;
    index++;
  }

  if (currentValue.length > 0 || row.length > 0) {
    row.push(currentValue.trim());

    if (row.some((cell) => cell.length > 0)) {
      result.push(row);
    }
  }

  return result;
}

/**
 * Generate a random time between startHour and endHour.
 * Example output: 09:35, 11:20, 14:15.
 */
export function getRandomTimeBetween(
  startHour: number = 9,
  endHour: number = 15,
): string {
  const hour =
    Math.floor(Math.random() * (endHour - startHour + 1)) + startHour;

  const minute = Math.floor(Math.random() * 60);

  return `${hour.toString().padStart(2, "0")}:${minute
    .toString()
    .padStart(2, "0")}`;
}

/**
 * Normalize date to ISO YYYY-MM-DD.
 * Supports DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD, and YYYY/MM/DD.
 */
export function normalizeDateToIso(dateStr: string): string {
  if (!dateStr) {
    return "";
  }

  const trimmed = dateStr.trim();

  const dmyMatch = trimmed.match(
    /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/,
  );

  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, "0");
    const month = dmyMatch[2].padStart(2, "0");
    const year = dmyMatch[3];

    return `${year}-${month}-${day}`;
  }

  const ymdMatch = trimmed.match(
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/,
  );

  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, "0");
    const day = ymdMatch[3].padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  return trimmed;
}

/**
 * Menghilangkan spasi berlebih tetapi tidak mengubah karakter nomor surat.
 *
 * Contoh:
 * R-484/N.1.17/Dsb.4/08/2026
 * tetap tersimpan lengkap seperti semula.
 */
function normalizeLetterNumber(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/**
 * Menemukan indeks header secara aman dengan prioritas kondisi.
 */
function findColumnIndex(
  headers: string[],
  conditions: Array<(header: string) => boolean>,
): number {
  for (const condition of conditions) {
    const idx = headers.findIndex((header) => condition(header));
    if (idx !== -1) {
      return idx;
    }
  }
  return -1;
}

/**
 * Konfigurasi kolom standar berdasarkan struktur CSV:
 *
 * No | Satker | Jenis Surat | Sifat Surat | No Register Surat | Tanggal
 * | Nomor | Asal | Tujuan | Hal | Status
 *
 * Sangat penting:
 * - "No" adalah nomor urut tabel.
 * - "Satker" adalah satuan kerja pengguna (BUKAN asal surat).
 * - "Asal" adalah instansi pengirim surat / asal surat.
 * - "No Register Surat" adalah register angka, misalnya 484.
 * - "Nomor" adalah nomor surat lengkap, misalnya:
 *   R-484/N.1.17/Dsb.4/08/2026
 */
function getStandardCsvColumnIndexes(headers: string[]) {
  const noIdx = findColumnIndex(headers, [
    (header) => header === "no",
    (header) => header === "no.",
    (header) => header === "nomor urut",
    (header) => header === "no urut",
  ]);

  const tanggalIdx = findColumnIndex(headers, [
    (header) => header === "tanggal",
    (header) => header === "tgl",
    (header) => header === "tanggal surat",
    (header) => header === "tgl surat",
    (header) => header.includes("tanggal"),
    (header) => header.includes("tgl"),
  ]);

  /*
   * Header harus tepat "nomor" atau "nomor surat".
   * Jangan gunakan "No Register Surat", karena nilai kolom itu hanya angka.
   */
  const nomorSuratIdx = findColumnIndex(headers, [
    (header) => header === "nomor",
    (header) => header === "nomor surat",
    (header) => header === "no surat",
    (header) => header === "no. surat",
    (header) => header === "no_surat",
  ]);

  /*
   * Header untuk asal surat (kolom "Satker" tidak dimasukkan sebagai asal).
   */
  const asalIdx = findColumnIndex(headers, [
    (header) => header === "asal",
    (header) => header === "asal surat",
    (header) => header === "diterima dari",
    (header) => header === "pengirim",
    (header) => header === "asal / pengirim",
    (header) => header === "dari",
    (header) => header === "satker asal",
    (header) => header === "satker pengirim",
    (header) => header.includes("pengirim"),
  ]);

  const halIdx = findColumnIndex(headers, [
    (header) => header === "hal",
    (header) => header === "perihal",
    (header) => header === "uraian",
    (header) => header.includes("perihal"),
    (header) => header.includes("uraian"),
  ]);

  return {
    noIdx,
    tanggalIdx,
    nomorSuratIdx,
    asalIdx,
    halIdx,
  };
}

function getCell(row: string[], index: number): string {
  return index >= 0 ? row[index] || "" : "";
}

function getNomorUrut(
  rawNumber: string,
  fallbackNumber: number,
): number {
  const parsed = Number.parseInt(rawNumber, 10);

  return Number.isNaN(parsed) ? fallbackNumber : parsed;
}

/**
 * Transform CSV to R.IN.1.
 */
export function transformCsvToRIn1(rows: string[][]): Array<{
  nomorUrut: number;
  tgl: string;
  waktu?: string;
  data: Record<string, any>;
}> {
  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0].map((header) => header.toLowerCase().trim());

  const {
    noIdx,
    tanggalIdx,
    nomorSuratIdx,
    asalIdx,
    halIdx,
  } = getStandardCsvColumnIndexes(headers);

  const result: Array<{
    nomorUrut: number;
    tgl: string;
    waktu?: string;
    data: Record<string, any>;
  }> = [];

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];

    if (row.length === 0 || row.every((cell) => !cell.trim())) {
      continue;
    }

    const rawNo = getCell(row, noIdx);
    const rawTanggal = getCell(row, tanggalIdx);
    const rawNomorSurat = getCell(row, nomorSuratIdx);
    const rawAsal = getCell(row, asalIdx);
    const rawHal = getCell(row, halIdx);

    const nomorUrut = getNomorUrut(rawNo, result.length + 1);
    const isoDate = normalizeDateToIso(rawTanggal);
    const randomJam = getRandomTimeBetween(9, 15);

    result.push({
      nomorUrut,
      tgl: isoDate,
      waktu: randomJam,
      data: {
        tgl_terima: isoDate,
        jam_terima: randomJam,
        nomor_surat: normalizeLetterNumber(rawNomorSurat),
        tgl_surat: isoDate,
        asal_surat: rawAsal.trim(),
        perihal: rawHal.trim(),
        tgl_isi_disposisi: isoDate,
        tindak_lanjut: "DITINDAKLANJUTI DAN DIARSIPKAN",
        keterangan: "-",
      },
    });
  }

  return result;
}

/**
 * Transform CSV to R.IN.3.
 *
 * Aturan:
 * - Waktu diterima = tanggal CSV.
 * - Sumber/Bapul = Organik Intelijen Kejari Tabanan.
 * - Nilai informasi = A1.
 * - Uraian masalah = isi Hal setelah tanda "-" pertama.
 * - Disposisi/Tindakan = Dilaporkan Kepada Pimpinan.
 * - Tindak lanjut = isi Hal sebelum "-" + nomor surat lengkap.
 * - Hal yang berawalan "Laporan Bulanan" atau "Surat Pengantar" diabaikan.
 */
export function transformCsvToRIn3(rows: string[][]): Array<{
  nomorUrut: number;
  tgl: string;
  waktu?: string;
  data: Record<string, any>;
}> {
  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0].map((header) => header.toLowerCase().trim());

  const {
    noIdx,
    tanggalIdx,
    nomorSuratIdx,
    halIdx,
  } = getStandardCsvColumnIndexes(headers);

  const result: Array<{
    nomorUrut: number;
    tgl: string;
    waktu?: string;
    data: Record<string, any>;
  }> = [];

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];

    if (row.length === 0 || row.every((cell) => !cell.trim())) {
      continue;
    }

    const rawNo = getCell(row, noIdx);
    const rawTanggal = getCell(row, tanggalIdx);
    const rawNomorSurat = getCell(row, nomorSuratIdx);
    const rawHal = getCell(row, halIdx);

    const hal = rawHal.trim();

    /*
     * Normalisasi membuat semua variasi berikut tetap terdeteksi:
     * - LAPORAN BULANAN ...
     * - Surat Pengantar ...
     * - "  Surat   Pengantar ..."
     */
    const normalizedHal = hal.toLowerCase().replace(/\s+/g, " ");

    const shouldIgnore = RIN3_IGNORED_HAL_PREFIXES.some((prefix) =>
      normalizedHal.startsWith(prefix),
    );

    if (shouldIgnore) {
      continue;
    }

    const nomorUrut = getNomorUrut(rawNo, result.length + 1);
    const isoDate = normalizeDateToIso(rawTanggal);

    /*
     * Nomor surat utuh, misalnya:
     * R-484/N.1.17/Dsb.4/08/2026
     */
    const nomorSurat = normalizeLetterNumber(rawNomorSurat);

    let judulSurat = hal;
    let uraianMasalah = hal;

    const dashIndex = hal.indexOf("-");

    if (dashIndex !== -1) {
      judulSurat = hal.slice(0, dashIndex).trim();
      uraianMasalah = hal.slice(dashIndex + 1).trim();
    }

    const tindakLanjut = nomorSurat
      ? `${judulSurat} Nomor: ${nomorSurat}`
      : judulSurat;

    result.push({
      nomorUrut,
      tgl: isoDate,
      waktu: "08:00",
      data: {
        waktu_diterima: isoDate,
        sumber_bapul: "Organik Intelijen Kejari Tabanan",
        nilai_data: "A1",
        uraian_peristiwa: uraianMasalah,
        catatan: "-",
        disposisi_tindakan: "Dilaporkan Kepada Pimpinan",
        tindak_lanjut: tindakLanjut,
        keterangan: "-",
      },
    });
  }

  return result;
}

/**
 * Transform CSV to R.IN.6.
 */
export function transformCsvToRIn6(
  rows: string[][],
  storageCodeMappings: StorageCodeMapping[] = [],
): Array<{
  nomorUrut: number;
  tgl: string;
  waktu?: string;
  data: Record<string, any>;
}> {
  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0].map((header) => header.toLowerCase().trim());

  const {
    noIdx,
    tanggalIdx,
    nomorSuratIdx,
    asalIdx,
    halIdx,
  } = getStandardCsvColumnIndexes(headers);

  const lookupKodeByAsal = (asalName: string): string => {
    const cleanAsal = asalName.trim().toLowerCase();

    if (!cleanAsal) {
      return "";
    }

    const exact = storageCodeMappings.find(
      (mapping) => mapping.asal.trim().toLowerCase() === cleanAsal,
    );

    if (exact) {
      return exact.kode;
    }

    const partial = storageCodeMappings.find((mapping) => {
      const mappingAsal = mapping.asal.trim().toLowerCase();

      return (
        cleanAsal.includes(mappingAsal) ||
        mappingAsal.includes(cleanAsal)
      );
    });

    return partial?.kode || "";
  };

  const result: Array<{
    nomorUrut: number;
    tgl: string;
    waktu?: string;
    data: Record<string, any>;
  }> = [];

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];

    if (row.length === 0 || row.every((cell) => !cell.trim())) {
      continue;
    }

    const rawNo = getCell(row, noIdx);
    const rawTanggal = getCell(row, tanggalIdx);
    const rawNomorSurat = getCell(row, nomorSuratIdx);
    const rawAsal = getCell(row, asalIdx);
    const rawHal = getCell(row, halIdx);

    const nomorUrut = getNomorUrut(rawNo, result.length + 1);
    const isoDate = normalizeDateToIso(rawTanggal);
    const randomJam = getRandomTimeBetween(9, 15);

    const nomorSurat = normalizeLetterNumber(rawNomorSurat);
    const tanggalSurat = rawTanggal.trim() || isoDate;

    const noTglSurat = nomorSurat
      ? `${nomorSurat} tgl. ${tanggalSurat}`
      : tanggalSurat;

    const kodePenyimpanan =
      lookupKodeByAsal(rawAsal) || "ARSIP-01";

    const waktuTerima = isoDate
      ? `${isoDate} ${randomJam}`
      : randomJam;

    result.push({
      nomorUrut,
      tgl: isoDate,
      waktu: randomJam,
      data: {
        waktu_terima: waktuTerima,
        diterima_dari: rawAsal.trim(),
        no_tgl_surat: noTglSurat,
        perihal: rawHal.trim(),
        lampiran: "-",
        kode_penyimpanan: kodePenyimpanan,
        keterangan: "DISIMPAN DALAM ARSIP",
      },
    });
  }

  return result;
}