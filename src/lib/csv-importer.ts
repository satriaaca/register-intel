import { StorageCodeMapping } from "../types.ts";

export interface ParsedCsvRow {
  [key: string]: string;
}

/**
 * Robust CSV parser that handles quotes, escaped quotes, commas, and newlines
 */
export function parseCsv(text: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let currentVal = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          currentVal += '"';
          i += 2;
          continue;
        } else {
          // End of quote
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentVal += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === ',') {
        row.push(currentVal.trim());
        currentVal = "";
        i++;
        continue;
      } else if (char === '\r') {
        if (nextChar === '\n') {
          i++;
        }
        row.push(currentVal.trim());
        currentVal = "";
        if (row.some(cell => cell.length > 0)) {
          result.push(row);
        }
        row = [];
        i++;
        continue;
      } else if (char === '\n') {
        row.push(currentVal.trim());
        currentVal = "";
        if (row.some(cell => cell.length > 0)) {
          result.push(row);
        }
        row = [];
        i++;
        continue;
      } else {
        currentVal += char;
        i++;
        continue;
      }
    }
  }

  // Last value
  if (currentVal.length > 0 || row.length > 0) {
    row.push(currentVal.trim());
    if (row.some(cell => cell.length > 0)) {
      result.push(row);
    }
  }

  return result;
}

/**
 * Generate a random time between startHour (default 9 AM) and endHour (default 15 / 3 PM)
 * Returns formatted "HH:mm" (e.g., "09:35", "11:20", "14:15")
 */
export function getRandomTimeBetween(startHour: number = 9, endHour: number = 15): string {
  const hour = Math.floor(Math.random() * (endHour - startHour + 1)) + startHour;
  // Pick a realistic minute: 0 to 59
  const minute = Math.floor(Math.random() * 60);
  const hh = hour.toString().padStart(2, "0");
  const mm = minute.toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * Normalize date string to ISO YYYY-MM-DD
 * Handles: DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD
 */
export function normalizeDateToIso(dateStr: string): string {
  if (!dateStr) return "";
  const trimmed = dateStr.trim();

  // Match DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, "0");
    const month = dmyMatch[2].padStart(2, "0");
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Match YYYY-MM-DD
  const ymdMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, "0");
    const day = ymdMatch[3].padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return trimmed;
}

/**
 * Transform parsed CSV rows to R.IN.1 structure according to rules:
 * - TGL (Waktu Penerimaan) = tanggal (ISO YYYY-MM-DD)
 * - JAM (Waktu Penerimaan) = RANDOM (09:00 - 15:00)
 * - NOMOR (Surat Masuk) = NOMOR
 * - TGL (Surat Masuk) = TANGGAL (ISO YYYY-MM-DD)
 * - ASAL SURAT = ASAL
 * - PERIHAL = HAL
 * - TGL/ISI (Disposisi) = TANGGAL (ISO / tanggal asli)
 * - TINDAK LANJUT = DITINDAKLANJUTI
 * - KET = -
 */
export function transformCsvToRIn1(rows: string[][]): Array<{
  nomorUrut: number;
  tgl: string;
  waktu?: string;
  data: Record<string, any>;
}> {
  if (rows.length < 2) return [];

  const header = rows[0].map(h => h.toLowerCase().trim());
  const noIdx = header.findIndex(h => h === "no" || h === "no." || h.includes("nomor urut"));
  const tglIdx = header.findIndex(h => h.includes("tanggal") || h === "tgl");
  const nomorIdx = header.findIndex(h => h === "nomor" || h === "no register surat" || h.includes("no surat"));
  const asalIdx = header.findIndex(h => h === "asal" || h.includes("asal surat") || h.includes("pengirim") || h.includes("satker"));
  const halIdx = header.findIndex(h => h === "hal" || h.includes("perihal") || h.includes("uraian"));

  const dataRows = rows.slice(1);
  const result: Array<{
    nomorUrut: number;
    tgl: string;
    waktu?: string;
    data: Record<string, any>;
  }> = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (row.length === 0 || row.every(c => !c.trim())) continue;

    const rawNo = noIdx !== -1 ? row[noIdx] : "";
    const parsedNo = parseInt(rawNo, 10);
    const nomorUrut = !isNaN(parsedNo) ? parsedNo : i + 1;

    const rawTgl = tglIdx !== -1 ? row[tglIdx] : "";
    const isoDate = normalizeDateToIso(rawTgl);
    const randomJam = getRandomTimeBetween(9, 15);

    const rawNomor = nomorIdx !== -1 ? row[nomorIdx] : "";
    const rawAsal = asalIdx !== -1 ? row[asalIdx] : "";
    const rawHal = halIdx !== -1 ? row[halIdx] : "";

    result.push({
      nomorUrut,
      tgl: isoDate,
      waktu: randomJam,
      data: {
        tgl_terima: isoDate,
        jam_terima: randomJam,
        nomor_surat: rawNomor.trim(),
        tgl_surat: isoDate,
        asal_surat: rawAsal.trim(),
        perihal: rawHal.trim(),
        tgl_isi_disposisi: isoDate,
        tindak_lanjut: "DITINDAKLANJUTI",
        keterangan: "-",
      },
    });
  }

  return result;
}

/**
 * Transform parsed CSV rows to R.IN.3 structure according to rules:
 * - waktu diterima = tanggal (YYYY-MM-DD)
 * - sumber/bapul = Organik Intelijen Kejari Tabanan
 * - Nilai Informasi = A1
 * - Uraian Masalah = Hal (teks setelah tanda - pertama)
 * - catatan = -
 * - Disposisi/Tindakan = Dilaporkan Kepada Pimpinan
 * - Tindak Lanjut = Hal (teks sebelum tanda - pertama) Nomor: Nomor
 * - Ket = -
 */
export function transformCsvToRIn3(rows: string[][]): Array<{
  nomorUrut: number;
  tgl: string;
  waktu?: string;
  data: Record<string, any>;
}> {
  if (rows.length < 2) return [];

  const header = rows[0].map(h => h.toLowerCase().trim());
  const noIdx = header.findIndex(h => h === "no" || h === "no." || h.includes("nomor urut"));
  const tglIdx = header.findIndex(h => h.includes("tanggal") || h === "tgl");
  const nomorIdx = header.findIndex(h => h === "nomor" || h === "no register surat" || h.includes("no surat"));
  const halIdx = header.findIndex(h => h === "hal" || h.includes("perihal") || h.includes("uraian"));

  const dataRows = rows.slice(1);
  const result: Array<{
    nomorUrut: number;
    tgl: string;
    waktu?: string;
    data: Record<string, any>;
  }> = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (row.length === 0 || row.every(c => !c.trim())) continue;

    const rawNo = noIdx !== -1 ? row[noIdx] : "";
    const parsedNo = parseInt(rawNo, 10);
    const nomorUrut = !isNaN(parsedNo) ? parsedNo : i + 1;

    const rawTgl = tglIdx !== -1 ? row[tglIdx] : "";
    const isoDate = normalizeDateToIso(rawTgl);

    const rawNomor = nomorIdx !== -1 ? row[nomorIdx] : "";
    const rawHal = halIdx !== -1 ? row[halIdx] : "";

    // Parse Hal by first "-" character
    let beforeText = rawHal.trim();
    let afterText = rawHal.trim();

    const dashIndex = rawHal.indexOf("-");
    if (dashIndex !== -1) {
      beforeText = rawHal.substring(0, dashIndex).trim();
      afterText = rawHal.substring(dashIndex + 1).trim();
    }

    const tindakLanjutStr = rawNomor
      ? `${beforeText} Nomor: ${rawNomor.trim()}`
      : `${beforeText}`;

    result.push({
      nomorUrut,
      tgl: isoDate,
      waktu: "08:00",
      data: {
        waktu_diterima: isoDate,
        sumber_bapul: "Organik Intelijen Kejari Tabanan",
        nilai_data: "A1",
        uraian_peristiwa: afterText,
        catatan: "-",
        disposisi_tindakan: "Dilaporkan Kepada Pimpinan",
        tindak_lanjut: tindakLanjutStr,
        keterangan: "-",
      },
    });
  }

  return result;
}

/**
 * Transform parsed CSV rows to R.IN.6 structure according to rules:
 * - WAKTU TERIMA = SET RANDOM (ANTARA JAM 9 PAGI SAMPAI 3 SORE) -> Tanggal + Jam Random
 * - DITERIMA DARI = ASAL
 * - NO & TGL SURAT = NO & TANGGAL (e.g. "B-5142/N.1.7/H.III/08/2026 tgl. 20-08-2026")
 * - PERIHAL = HAL
 * - LAMPIRAN = -
 * - KODE PENYIMPANAN = Look up by ASAL from storageCodeMappings, or default
 * - KET = DISIMPAN DALAM ARSIP
 */
export function transformCsvToRIn6(
  rows: string[][],
  storageCodeMappings: StorageCodeMapping[] = []
): Array<{
  nomorUrut: number;
  tgl: string;
  waktu?: string;
  data: Record<string, any>;
}> {
  if (rows.length < 2) return [];

  const header = rows[0].map(h => h.toLowerCase().trim());
  const noIdx = header.findIndex(h => h === "no" || h === "no." || h.includes("nomor urut"));
  const tglIdx = header.findIndex(h => h.includes("tanggal") || h === "tgl");
  const nomorIdx = header.findIndex(h => h === "nomor" || h === "no register surat" || h.includes("no surat"));
  const asalIdx = header.findIndex(h => h === "asal" || h.includes("asal surat") || h.includes("pengirim") || h.includes("diterima dari"));
  const halIdx = header.findIndex(h => h === "hal" || h.includes("perihal") || h.includes("uraian"));

  // Build mapping lookup helper by normalized asal
  const lookupKodeByAsal = (asalName: string): string => {
    if (!asalName) return "";
    const cleanAsal = asalName.trim().toLowerCase();
    
    // Exact match
    const exact = storageCodeMappings.find(m => m.asal.trim().toLowerCase() === cleanAsal);
    if (exact) return exact.kode;

    // Partial match (if mapping asal is contained in cleanAsal or vice versa)
    const partial = storageCodeMappings.find(m => {
      const mAsal = m.asal.trim().toLowerCase();
      return cleanAsal.includes(mAsal) || mAsal.includes(cleanAsal);
    });
    if (partial) return partial.kode;

    return "";
  };

  const dataRows = rows.slice(1);
  const result: Array<{
    nomorUrut: number;
    tgl: string;
    waktu?: string;
    data: Record<string, any>;
  }> = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (row.length === 0 || row.every(c => !c.trim())) continue;

    const rawNo = noIdx !== -1 ? row[noIdx] : "";
    const parsedNo = parseInt(rawNo, 10);
    const nomorUrut = !isNaN(parsedNo) ? parsedNo : i + 1;

    const rawTgl = tglIdx !== -1 ? row[tglIdx] : "";
    const isoDate = normalizeDateToIso(rawTgl);
    const randomJam = getRandomTimeBetween(9, 15);

    const rawNomor = nomorIdx !== -1 ? row[nomorIdx] : "";
    const rawAsal = asalIdx !== -1 ? row[asalIdx] : "";
    const rawHal = halIdx !== -1 ? row[halIdx] : "";

    // Combined NO & TGL SURAT
    const noTglSurat = rawNomor
      ? `${rawNomor.trim()} tgl. ${rawTgl ? rawTgl.trim() : isoDate}`
      : `${rawTgl ? rawTgl.trim() : isoDate}`;

    // Look up kode penyimpanan from table
    const matchedKode = lookupKodeByAsal(rawAsal);
    const kodePenyimpanan = matchedKode || "ARSIP-01";

    // Waktu terima format: "YYYY-MM-DD HH:mm"
    const waktuTerimaFormatted = isoDate ? `${isoDate} ${randomJam}` : `${randomJam}`;

    result.push({
      nomorUrut,
      tgl: isoDate,
      waktu: randomJam,
      data: {
        waktu_terima: waktuTerimaFormatted,
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
