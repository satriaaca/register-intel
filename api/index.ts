import express from "express";

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
    importRegisterEntriesBatch,
    getRegistersSummary,
    getStorageCodes,
    saveStorageCode,
    deleteStorageCode,
    seedStorageCodesIfEmpty,
} from "../src/db/queries.ts";

import { REGISTER_DEFINITIONS } from "../src/lib/constants";
import { ensureRIn3DataSeeded } from "../src/lib/seed-rin3";

function getErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
}

function parseId(value: string): number | null {
    const id = Number.parseInt(value, 10);
    return Number.isNaN(id) ? null : id;
}

const app = express();

app.use(express.json({ limit: "5mb" }));

let initialized: Promise<void> | null = null;

function initializeDatabase() {
    if (!initialized) {
        initialized = ensureTablesExist()
            .then(async () => {
                await ensureRIn3DataSeeded();
                await seedStorageCodesIfEmpty();
                console.log("Database tables and initial seed data are ready.");
            })
            .catch((error) => {
                initialized = null;
                console.error("Database initialization failed:", error);
                throw error;
            });
    }

    return initialized;
}

app.use("/api", async (_req, res, next) => {
    try {
        await initializeDatabase();
        next();
    } catch (error) {
        res.status(500).json({
            error: getErrorMessage(error, "Database initialization failed"),
        });
    }
});

app.get("/api/health", (_req, res) => {
    res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
    });
});

app.get("/api/settings", async (_req, res) => {
    try {
        res.json(await getSettings());
    } catch (error) {
        res.status(500).json({
            error: getErrorMessage(error, "Failed to fetch settings"),
        });
    }
});

app.post("/api/settings", async (req, res) => {
    try {
        res.json(await updateSettings(req.body));
    } catch (error) {
        res.status(500).json({
            error: getErrorMessage(error, "Failed to update settings"),
        });
    }
});

app.get("/api/officers", async (_req, res) => {
    try {
        res.json(await getOfficers());
    } catch (error) {
        res.status(500).json({
            error: getErrorMessage(error, "Failed to fetch officers"),
        });
    }
});

app.post("/api/officers", async (req, res) => {
    try {
        const { nama, pangkat, nip, jabatan } = req.body;

        if (!nama || !pangkat || !nip) {
            return res.status(400).json({
                error: "Nama, Pangkat, dan NIP wajib diisi.",
            });
        }

        const created = await createOfficer({ nama, pangkat, nip, jabatan });
        res.status(201).json(created);
    } catch (error) {
        res.status(500).json({
            error: getErrorMessage(error, "Failed to create officer"),
        });
    }
});

app.put("/api/officers/:id", async (req, res) => {
    try {
        const id = parseId(req.params.id);

        if (id === null) {
            return res.status(400).json({ error: "ID petugas tidak valid." });
        }

        res.json(await updateOfficer(id, req.body));
    } catch (error) {
        res.status(500).json({
            error: getErrorMessage(error, "Failed to update officer"),
        });
    }
});

app.delete("/api/officers/:id", async (req, res) => {
    try {
        const id = parseId(req.params.id);

        if (id === null) {
            return res.status(400).json({ error: "ID petugas tidak valid." });
        }

        await deleteOfficer(id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({
            error: getErrorMessage(error, "Failed to delete officer"),
        });
    }
});

app.get("/api/registers", async (_req, res) => {
    try {
        const summary = await getRegistersSummary();

        const registers = REGISTER_DEFINITIONS.map((definition) => ({
            ...definition,
            entryCount: summary.countsByRegister[definition.code] || 0,
        }));

        res.json({ registers, summary });
    } catch (error) {
        res.status(500).json({
            error: getErrorMessage(error, "Failed to fetch registers"),
        });
    }
});

app.get("/api/registers/:code/entries", async (req, res) => {
    try {
        res.json(await getRegisterEntries(req.params.code));
    } catch (error) {
        res.status(500).json({
            error: getErrorMessage(error, "Failed to fetch entries"),
        });
    }
});

app.post("/api/registers/:code/entries", async (req, res) => {
    try {
        const { id, nomorUrut, tgl, waktu, data } = req.body;

        const saved = await saveRegisterEntry(req.params.code, {
            id,
            nomorUrut: nomorUrut || 1,
            tgl,
            waktu,
            data,
        });

        res.json(saved);
    } catch (error) {
        res.status(500).json({
            error: getErrorMessage(error, "Failed to save entry"),
        });
    }
});

app.delete("/api/registers/:code/entries/:id", async (req, res) => {
    try {
        const id = parseId(req.params.id);

        if (id === null) {
            return res.status(400).json({
                error: "ID baris register tidak valid.",
            });
        }

        await deleteRegisterEntry(id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({
            error: getErrorMessage(error, "Failed to delete entry"),
        });
    }
});

app.get("/api/storage-codes", async (_req, res) => {
    try {
        res.json(await getStorageCodes());
    } catch (error) {
        res.status(500).json({
            error: getErrorMessage(error, "Failed to fetch storage codes"),
        });
    }
});

app.post("/api/storage-codes", async (req, res) => {
    try {
        const { kode, asal, keterangan } = req.body;

        if (!kode || !asal) {
            return res.status(400).json({
                error: "Kode dan Asal Instansi wajib diisi.",
            });
        }

        const created = await saveStorageCode({ kode, asal, keterangan });
        res.status(201).json(created);
    } catch (error) {
        res.status(500).json({
            error: getErrorMessage(error, "Failed to save storage code"),
        });
    }
});

app.put("/api/storage-codes/:id", async (req, res) => {
    try {
        const id = parseId(req.params.id);
        const { kode, asal, keterangan } = req.body;

        if (id === null) {
            return res.status(400).json({
                error: "ID kode penyimpanan tidak valid.",
            });
        }

        if (!kode || !asal) {
            return res.status(400).json({
                error: "Kode dan Asal Instansi wajib diisi.",
            });
        }

        res.json(await saveStorageCode({ id, kode, asal, keterangan }));
    } catch (error) {
        res.status(500).json({
            error: getErrorMessage(error, "Failed to update storage code"),
        });
    }
});

app.delete("/api/storage-codes/:id", async (req, res) => {
    try {
        const id = parseId(req.params.id);

        if (id === null) {
            return res.status(400).json({
                error: "ID kode penyimpanan tidak valid.",
            });
        }

        await deleteStorageCode(id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({
            error: getErrorMessage(error, "Failed to delete storage code"),
        });
    }
});

app.post("/api/registers/:code/import-batch", async (req, res) => {
    try {
        const { entries, clearExisting } = req.body;

        if (!Array.isArray(entries) || entries.length === 0) {
            return res.status(400).json({
                error: "Data entries harus berupa array dan tidak boleh kosong.",
            });
        }

        const result = await importRegisterEntriesBatch(
            req.params.code,
            entries,
            { clearExisting: Boolean(clearExisting) },
        );

        res.json(result);
    } catch (error) {
        res.status(500).json({
            error: getErrorMessage(error, "Failed to import entries batch"),
        });
    }
});

export default app;