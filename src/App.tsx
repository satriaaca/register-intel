import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar.tsx";
import { RegisterSelector } from "./components/RegisterSelector.tsx";
import { RegisterDocumentView } from "./components/RegisterDocumentView.tsx";
import { OfficersManager } from "./components/OfficersManager.tsx";
import { SettingsManager } from "./components/SettingsManager.tsx";
import { RegisterDefinition, RegisterEntryRow, Officer, AppSettings } from "./types.ts";
import { REGISTER_DEFINITIONS, DEFAULT_SETTINGS } from "./lib/constants.ts";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<"registers" | "officers" | "settings">("registers");
  const [selectedCode, setSelectedCode] = useState<string>("R.IN.1");
  const [registers, setRegisters] = useState<(RegisterDefinition & { entryCount?: number })[]>(REGISTER_DEFINITIONS);
  const [entries, setEntries] = useState<RegisterEntryRow[]>([]);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS as AppSettings);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Fetch initial app data
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [regRes, offRes, setRes] = await Promise.all([
        fetch("/api/registers").then((r) => r.json()),
        fetch("/api/officers").then((r) => r.json()),
        fetch("/api/settings").then((r) => r.json()),
      ]);

      if (regRes.registers) {
        setRegisters(regRes.registers);
      }
      if (Array.isArray(offRes)) {
        setOfficers(offRes);
      }
      if (setRes && setRes.kejaksaanName) {
        setSettings(setRes);
      }
    } catch (err: any) {
      console.error("Error loading application data:", err);
      showNotification("Gagal memuat data dari database. Pastikan koneksi aktif.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch entries for active register code
  const fetchEntries = async (code: string) => {
    try {
      const res = await fetch(`/api/registers/${code}/entries`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data);
      }
    } catch (err) {
      console.error(`Error loading entries for ${code}:`, err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedCode) {
      fetchEntries(selectedCode);
    }
  }, [selectedCode]);

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Officer handlers
  const handleAddOfficer = async (off: { nama: string; pangkat: string; nip: string; jabatan?: string }) => {
    const res = await fetch("/api/officers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(off),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Gagal menambah petugas");
    }
    const created = await res.json();
    setOfficers((prev) => [...prev, created]);
    showNotification("Petugas berhasil ditambahkan ke database!");
  };

  const handleUpdateOfficer = async (id: number, off: Partial<Officer>) => {
    const res = await fetch(`/api/officers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(off),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Gagal memperbarui petugas");
    }
    const updated = await res.json();
    setOfficers((prev) => prev.map((o) => (o.id === id ? updated : o)));
    showNotification("Data petugas berhasil diperbarui!");
  };

  const handleDeleteOfficer = async (id: number) => {
    const res = await fetch(`/api/officers/${id}`, { method: "DELETE" });
    if (!res.ok) {
      throw new Error("Gagal menghapus petugas");
    }
    setOfficers((prev) => prev.filter((o) => o.id !== id));
    showNotification("Petugas berhasil dihapus dari database!");
  };

  // Settings handler
  const handleUpdateSettings = async (newSettings: Partial<AppSettings>) => {
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSettings),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Gagal menyimpan pengaturan");
    }
    const saved = await res.json();
    setSettings(saved);
    showNotification("Pengaturan dan Penandatangan berhasil disimpan!");
  };

  // Entry handlers
  const handleSaveEntry = async (entryData: {
    id?: number;
    nomorUrut: number;
    tgl?: string;
    waktu?: string;
    data: Record<string, any>;
  }) => {
    const res = await fetch(`/api/registers/${selectedCode}/entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entryData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Gagal menyimpan data entry");
    }
    showNotification("Data baris register berhasil disimpan ke database!");
    await fetchEntries(selectedCode);

    // Refresh count in selector
    const regRes = await fetch("/api/registers").then((r) => r.json());
    if (regRes.registers) setRegisters(regRes.registers);
  };

  const handleDeleteEntry = async (id: number) => {
    const res = await fetch(`/api/registers/${selectedCode}/entries/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setEntries((prev) => prev.filter((e) => e.id !== id));
      showNotification("Baris data register berhasil dihapus!");

      // Refresh count
      const regRes = await fetch("/api/registers").then((r) => r.json());
      if (regRes.registers) setRegisters(regRes.registers);
    }
  };

  // Seed sample handler
  const handleSeedSample = async () => {
    try {
      setIsSeeding(true);
      const res = await fetch("/api/seed-samples", { method: "POST" });
      if (res.ok) {
        showNotification("Data contoh register berhasil dimuat!");
        await fetchData();
        await fetchEntries(selectedCode);
      }
    } catch (err) {
      showNotification("Gagal memuat data contoh", "error");
    } finally {
      setIsSeeding(false);
    }
  };

  const currentRegister =
    registers.find((r) => r.code === selectedCode) || REGISTER_DEFINITIONS[0];

  const totalEntriesCount = registers.reduce(
    (sum, r) => sum + (r.entryCount || 0),
    0
  );

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans antialiased text-slate-800">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedRegisterCode={selectedCode}
        totalOfficers={officers.length}
        totalEntries={totalEntriesCount}
        onSeedSample={handleSeedSample}
        isSeeding={isSeeding}
      />

      {/* Floating Notification Toast */}
      {notification && (
        <div
          className={`fixed bottom-4 right-4 z-50 px-3.5 py-2 rounded-lg shadow-lg border flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-3 duration-150 ${
            notification.type === "success"
              ? "bg-slate-900 text-emerald-400 border-emerald-500/40"
              : "bg-red-950 text-red-200 border-red-800"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-red-400" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-2.5 sm:px-4 py-3 sm:py-4">
        {isLoading ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-center gap-2.5 text-slate-500">
            <Loader2 className="w-7 h-7 animate-spin text-emerald-700" />
            <p className="text-xs font-medium">Menghubungkan ke Database & Memuat Data Register...</p>
          </div>
        ) : (
          <>
            {activeTab === "registers" && (
              <div className="space-y-3 sm:space-y-4">
                {/* 23 Registers Selector & Filter Grid */}
                <RegisterSelector
                  registers={registers}
                  selectedCode={selectedCode}
                  onSelect={(code) => setSelectedCode(code)}
                />

                {/* Active Document Canvas & Table */}
                <RegisterDocumentView
                  register={currentRegister}
                  entries={entries}
                  officers={officers}
                  settings={settings}
                  onSaveEntry={handleSaveEntry}
                  onDeleteEntry={handleDeleteEntry}
                  onUpdateSettings={handleUpdateSettings}
                  onReload={() => fetchEntries(selectedCode)}
                />
              </div>
            )}

            {activeTab === "officers" && (
              <OfficersManager
                officers={officers}
                onAddOfficer={handleAddOfficer}
                onUpdateOfficer={handleUpdateOfficer}
                onDeleteOfficer={handleDeleteOfficer}
              />
            )}

            {activeTab === "settings" && (
              <SettingsManager
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
              />
            )}
          </>
        )}
      </main>

      {/* Bottom Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 text-[11px] py-2.5 px-4 text-center mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1.5">
          <span>
            Buku Register Administrasi Intelijen Kejaksaan RI — Standardisasi R.IN.1 s/d R.IN.23
          </span>
          <span className="text-emerald-400/90 font-mono font-medium">
            {settings.kejaksaanName}
          </span>
        </div>
      </footer>
    </div>
  );
}
