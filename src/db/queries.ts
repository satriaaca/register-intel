import { db, createPool } from "./index.ts";
import { officers, registerEntries, registers, settings } from "./schema.ts";
import { eq, desc, asc } from "drizzle-orm";
import { Officer, AppSettings } from "../types.ts";
import { DEFAULT_SETTINGS, INITIAL_OFFICERS, REGISTER_DEFINITIONS } from "../lib/constants.ts";

export async function ensureTablesExist(): Promise<void> {
  try {
    const pool = createPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        kejaksaan_name TEXT NOT NULL DEFAULT 'KEJAKSAAN NEGERI TABANAN',
        tempat_dokumen TEXT NOT NULL DEFAULT 'Tabanan',
        tanggal_dokumen TEXT,
        left_signer_title TEXT NOT NULL DEFAULT 'Mengetahui:\nKEPALA KEJAKSAAN NEGERI TABANAN',
        left_signer_name TEXT NOT NULL DEFAULT 'ZAINUR ARIFIN SYAH, S.H., M.H.',
        left_signer_pangkat_nip TEXT NOT NULL DEFAULT 'Jaksa Utama Pratama / NIP. 19740512 199903 1 002',
        right_signer_title TEXT NOT NULL DEFAULT 'KEPALA SEKSI INTELIJEN',
        right_signer_name TEXT NOT NULL DEFAULT 'I GUSTI NGURAH ANOM SUKASIH, S.H.',
        right_signer_pangkat_nip TEXT NOT NULL DEFAULT 'Jaksa Muda / NIP. 19820815 200712 1 001',
        signature_alignment TEXT DEFAULT 'split',
        available_years TEXT,
        closing_dates TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      );

      ALTER TABLE settings ADD COLUMN IF NOT EXISTS closing_dates TEXT;
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS signature_alignment TEXT DEFAULT 'split';
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS available_years TEXT;

      CREATE TABLE IF NOT EXISTS officers (
        id SERIAL PRIMARY KEY,
        nama TEXT NOT NULL,
        pangkat TEXT NOT NULL,
        nip TEXT NOT NULL,
        jabatan TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS registers (
        id SERIAL PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        orientation TEXT NOT NULL DEFAULT 'portrait',
        tahun_takwim INTEGER NOT NULL DEFAULT 2026,
        bidang TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS register_entries (
        id SERIAL PRIMARY KEY,
        register_code TEXT NOT NULL,
        nomor_urut INTEGER NOT NULL,
        tgl TEXT,
        waktu TEXT,
        data_json TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("Database tables verified/initialized successfully.");
  } catch (error) {
    console.warn("Notice: Table auto-creation check (skipping if tables exist or connecting lazily):", error);
  }
}

export async function getSettings(): Promise<AppSettings> {
  try {
    const list = await db.select().from(settings).limit(1);
    if (list.length > 0) {
      const item = list[0];
      let closingDatesParsed: Record<string, string> | undefined = undefined;
      if (item.closingDates) {
        try {
          closingDatesParsed = JSON.parse(item.closingDates);
        } catch (e) {
          // ignore json parse error
        }
      }

      let availableYearsParsed: number[] | undefined = undefined;
      if (item.availableYears) {
        try {
          availableYearsParsed = JSON.parse(item.availableYears);
        } catch (e) {}
      }

      return {
        id: item.id,
        kejaksaanName: item.kejaksaanName,
        tempatDokumen: item.tempatDokumen,
        tanggalDokumen: item.tanggalDokumen,
        leftSignerTitle: item.leftSignerTitle,
        leftSignerName: item.leftSignerName,
        leftSignerPangkatNip: item.leftSignerPangkatNip,
        rightSignerTitle: item.rightSignerTitle,
        rightSignerName: item.rightSignerName,
        rightSignerPangkatNip: item.rightSignerPangkatNip,
        signatureAlignment: (item.signatureAlignment as "split" | "center") || "split",
        availableYears: availableYearsParsed || [2024, 2025, 2026, 2027, 2028],
        closingDates: closingDatesParsed,
        updatedAt: item.updatedAt ? item.updatedAt.toISOString() : null,
      };
    }
    // Seed default settings
    const inserted = await db.insert(settings).values(DEFAULT_SETTINGS).returning();
    const item = inserted[0];
    return {
      id: item.id,
      kejaksaanName: item.kejaksaanName,
      tempatDokumen: item.tempatDokumen,
      tanggalDokumen: item.tanggalDokumen,
      leftSignerTitle: item.leftSignerTitle,
      leftSignerName: item.leftSignerName,
      leftSignerPangkatNip: item.leftSignerPangkatNip,
      rightSignerTitle: item.rightSignerTitle,
      rightSignerName: item.rightSignerName,
      rightSignerPangkatNip: item.rightSignerPangkatNip,
      signatureAlignment: "split",
      availableYears: [2024, 2025, 2026, 2027, 2028],
      closingDates: undefined,
      updatedAt: item.updatedAt ? item.updatedAt.toISOString() : null,
    };
  } catch (error) {
    console.error("Failed to get settings:", error);
    return DEFAULT_SETTINGS as AppSettings;
  }
}

export async function updateSettings(data: Partial<AppSettings>): Promise<AppSettings> {
  try {
    const list = await db.select().from(settings).limit(1);
    const payload: any = {
      kejaksaanName: data.kejaksaanName || DEFAULT_SETTINGS.kejaksaanName,
      tempatDokumen: data.tempatDokumen || DEFAULT_SETTINGS.tempatDokumen,
      tanggalDokumen: data.tanggalDokumen || null,
      leftSignerTitle: data.leftSignerTitle || DEFAULT_SETTINGS.leftSignerTitle,
      leftSignerName: data.leftSignerName || DEFAULT_SETTINGS.leftSignerName,
      leftSignerPangkatNip: data.leftSignerPangkatNip || DEFAULT_SETTINGS.leftSignerPangkatNip,
      rightSignerTitle: data.rightSignerTitle || DEFAULT_SETTINGS.rightSignerTitle,
      rightSignerName: data.rightSignerName || DEFAULT_SETTINGS.rightSignerName,
      rightSignerPangkatNip: data.rightSignerPangkatNip || DEFAULT_SETTINGS.rightSignerPangkatNip,
      signatureAlignment: data.signatureAlignment || "split",
      updatedAt: new Date(),
    };

    if (data.availableYears !== undefined) {
      payload.availableYears = JSON.stringify(data.availableYears);
    }

    if (data.closingDates !== undefined) {
      payload.closingDates = JSON.stringify(data.closingDates);
    }

    if (list.length > 0) {
      const updated = await db
        .update(settings)
        .set(payload)
        .where(eq(settings.id, list[0].id))
        .returning();
      const item = updated[0];
      let closingDatesParsed: Record<string, string> | undefined = undefined;
      if (item.closingDates) {
        try {
          closingDatesParsed = JSON.parse(item.closingDates);
        } catch (e) {}
      }
      let availableYearsParsed: number[] | undefined = undefined;
      if (item.availableYears) {
        try {
          availableYearsParsed = JSON.parse(item.availableYears);
        } catch (e) {}
      }
      return {
        id: item.id,
        kejaksaanName: item.kejaksaanName,
        tempatDokumen: item.tempatDokumen,
        tanggalDokumen: item.tanggalDokumen,
        leftSignerTitle: item.leftSignerTitle,
        leftSignerName: item.leftSignerName,
        leftSignerPangkatNip: item.leftSignerPangkatNip,
        rightSignerTitle: item.rightSignerTitle,
        rightSignerName: item.rightSignerName,
        rightSignerPangkatNip: item.rightSignerPangkatNip,
        signatureAlignment: (item.signatureAlignment as "split" | "center") || "split",
        availableYears: availableYearsParsed || [2024, 2025, 2026, 2027, 2028],
        closingDates: closingDatesParsed,
        updatedAt: item.updatedAt ? item.updatedAt.toISOString() : null,
      };
    } else {
      const inserted = await db.insert(settings).values(payload).returning();
      const item = inserted[0];
      let closingDatesParsed: Record<string, string> | undefined = undefined;
      if (item.closingDates) {
        try {
          closingDatesParsed = JSON.parse(item.closingDates);
        } catch (e) {}
      }
      let availableYearsParsed: number[] | undefined = undefined;
      if (item.availableYears) {
        try {
          availableYearsParsed = JSON.parse(item.availableYears);
        } catch (e) {}
      }
      return {
        id: item.id,
        kejaksaanName: item.kejaksaanName,
        tempatDokumen: item.tempatDokumen,
        tanggalDokumen: item.tanggalDokumen,
        leftSignerTitle: item.leftSignerTitle,
        leftSignerName: item.leftSignerName,
        leftSignerPangkatNip: item.leftSignerPangkatNip,
        rightSignerTitle: item.rightSignerTitle,
        rightSignerName: item.rightSignerName,
        rightSignerPangkatNip: item.rightSignerPangkatNip,
        signatureAlignment: (item.signatureAlignment as "split" | "center") || "split",
        availableYears: availableYearsParsed || [2024, 2025, 2026, 2027, 2028],
        closingDates: closingDatesParsed,
        updatedAt: item.updatedAt ? item.updatedAt.toISOString() : null,
      };
    }
  } catch (error) {
    console.error("Failed to update settings:", error);
    throw new Error("Failed to update settings", { cause: error });
  }
}

export async function getOfficers(): Promise<Officer[]> {
  try {
    const list = await db.select().from(officers).orderBy(asc(officers.id));
    if (list.length === 0) {
      // Seed default officers
      for (const off of INITIAL_OFFICERS) {
        await db.insert(officers).values(off);
      }
      const seeded = await db.select().from(officers).orderBy(asc(officers.id));
      return seeded.map((item) => ({
        id: item.id,
        nama: item.nama,
        pangkat: item.pangkat,
        nip: item.nip,
        jabatan: item.jabatan,
        isActive: item.isActive,
        createdAt: item.createdAt ? item.createdAt.toISOString() : null,
        updatedAt: item.updatedAt ? item.updatedAt.toISOString() : null,
      }));
    }
    return list.map((item) => ({
      id: item.id,
      nama: item.nama,
      pangkat: item.pangkat,
      nip: item.nip,
      jabatan: item.jabatan,
      isActive: item.isActive,
      createdAt: item.createdAt ? item.createdAt.toISOString() : null,
      updatedAt: item.updatedAt ? item.updatedAt.toISOString() : null,
    }));
  } catch (error) {
    console.error("Failed to get officers:", error);
    return INITIAL_OFFICERS.map((o, idx) => ({ ...o, id: idx + 1, isActive: 1 }));
  }
}

export async function createOfficer(data: { nama: string; pangkat: string; nip: string; jabatan?: string }): Promise<Officer> {
  try {
    const result = await db.insert(officers).values(data).returning();
    const item = result[0];
    return {
      id: item.id,
      nama: item.nama,
      pangkat: item.pangkat,
      nip: item.nip,
      jabatan: item.jabatan,
      isActive: item.isActive,
      createdAt: item.createdAt ? item.createdAt.toISOString() : null,
      updatedAt: item.updatedAt ? item.updatedAt.toISOString() : null,
    };
  } catch (error) {
    console.error("Failed to create officer:", error);
    throw new Error("Failed to create officer", { cause: error });
  }
}

export async function updateOfficer(id: number, data: Partial<Officer>): Promise<Officer> {
  try {
    const updatePayload: Record<string, any> = { updatedAt: new Date() };
    if (data.nama !== undefined) updatePayload.nama = data.nama;
    if (data.pangkat !== undefined) updatePayload.pangkat = data.pangkat;
    if (data.nip !== undefined) updatePayload.nip = data.nip;
    if (data.jabatan !== undefined) updatePayload.jabatan = data.jabatan;
    if (data.isActive !== undefined) updatePayload.isActive = data.isActive;

    const result = await db
      .update(officers)
      .set(updatePayload)
      .where(eq(officers.id, id))
      .returning();
    const item = result[0];
    return {
      id: item.id,
      nama: item.nama,
      pangkat: item.pangkat,
      nip: item.nip,
      jabatan: item.jabatan,
      isActive: item.isActive,
      createdAt: item.createdAt ? item.createdAt.toISOString() : null,
      updatedAt: item.updatedAt ? item.updatedAt.toISOString() : null,
    };
  } catch (error) {
    console.error("Failed to update officer:", error);
    throw new Error("Failed to update officer", { cause: error });
  }
}

export async function deleteOfficer(id: number): Promise<boolean> {
  try {
    await db.delete(officers).where(eq(officers.id, id));
    return true;
  } catch (error) {
    console.error("Failed to delete officer:", error);
    throw new Error("Failed to delete officer", { cause: error });
  }
}

export async function getRegisterEntries(registerCode: string) {
  try {
    const rows = await db
      .select()
      .from(registerEntries)
      .where(eq(registerEntries.registerCode, registerCode))
      .orderBy(asc(registerEntries.nomorUrut), asc(registerEntries.id));

    return rows.map((r) => {
      let parsed = {};
      try {
        parsed = JSON.parse(r.dataJson);
      } catch (e) {
        parsed = {};
      }
      return {
        id: r.id,
        registerCode: r.registerCode,
        nomorUrut: r.nomorUrut,
        tgl: r.tgl,
        waktu: r.waktu,
        data: parsed,
        createdAt: r.createdAt?.toISOString(),
        updatedAt: r.updatedAt?.toISOString(),
      };
    });
  } catch (error) {
    console.error(`Failed to get entries for ${registerCode}:`, error);
    return [];
  }
}

export async function saveRegisterEntry(
  registerCode: string,
  entryData: {
    id?: number;
    nomorUrut: number;
    tgl?: string;
    waktu?: string;
    data: Record<string, any>;
  }
) {
  try {
    const jsonStr = JSON.stringify(entryData.data || {});
    if (entryData.id) {
      const updated = await db
        .update(registerEntries)
        .set({
          nomorUrut: entryData.nomorUrut,
          tgl: entryData.tgl || null,
          waktu: entryData.waktu || null,
          dataJson: jsonStr,
          updatedAt: new Date(),
        })
        .where(eq(registerEntries.id, entryData.id))
        .returning();
      return updated[0];
    } else {
      const inserted = await db
        .insert(registerEntries)
        .values({
          registerCode,
          nomorUrut: entryData.nomorUrut,
          tgl: entryData.tgl || null,
          waktu: entryData.waktu || null,
          dataJson: jsonStr,
        })
        .returning();
      return inserted[0];
    }
  } catch (error) {
    console.error("Failed to save register entry:", error);
    throw new Error("Failed to save register entry", { cause: error });
  }
}

export async function deleteRegisterEntry(id: number): Promise<boolean> {
  try {
    await db.delete(registerEntries).where(eq(registerEntries.id, id));
    return true;
  } catch (error) {
    console.error("Failed to delete register entry:", error);
    throw new Error("Failed to delete register entry", { cause: error });
  }
}

export async function getRegistersSummary() {
  try {
    const officersList = await getOfficers();
    const allEntries = await db.select().from(registerEntries);
    
    const countMap: Record<string, number> = {};
    allEntries.forEach((e) => {
      countMap[e.registerCode] = (countMap[e.registerCode] || 0) + 1;
    });

    return {
      totalRegisters: REGISTER_DEFINITIONS.length,
      totalEntries: allEntries.length,
      totalOfficers: officersList.length,
      countsByRegister: countMap,
    };
  } catch (error) {
    console.error("Failed to get registers summary:", error);
    return {
      totalRegisters: 23,
      totalEntries: 0,
      totalOfficers: 0,
      countsByRegister: {},
    };
  }
}
