import React from "react";
import { BookOpen, Users, Settings, RefreshCw, ShieldAlert, Database } from "lucide-react";

interface NavbarProps {
  activeTab: "registers" | "officers" | "settings";
  setActiveTab: (tab: "registers" | "officers" | "settings") => void;
  selectedRegisterCode: string;
  totalOfficers: number;
  totalEntries: number;
  onSeedSample: () => void;
  isSeeding: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  selectedRegisterCode,
  totalOfficers,
  totalEntries,
  onSeedSample,
  isSeeding,
}) => {
  return (
    <header className="h-14 bg-white border-b border-slate-200 sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between shadow-xs select-none">
      {/* Brand Logo & Name */}
      <div className="flex items-center space-x-3">
        <div className="bg-emerald-700 p-2 rounded-lg text-white shadow-xs flex items-center justify-center">
          <ShieldAlert className="w-4 h-4" />
        </div>
        <div className="leading-tight">
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-slate-800 text-xs sm:text-sm tracking-tight font-serif uppercase">
              INTELIJEN | KEJARI TABANAN
            </h1>
            <span className="hidden lg:inline-flex px-1.5 py-0.5 text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-300 rounded">
              R.IN.1 — R.IN.23
            </span>
          </div>
          <p className="text-[10px] text-slate-500 hidden sm:block">
            Sistem Register Administrasi & Dokumen PDF Kejaksaan RI
          </p>
        </div>
      </div>

      {/* Center / Right Nav Items */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* PostgreSQL Database Active Indicator */}
        <div className="hidden md:flex items-center space-x-2 px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200/80 text-[11px] font-medium">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
          <span className="font-mono">PostgreSQL Active</span>
        </div>

        {/* Tab Buttons */}
        <nav className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button
            id="nav-btn-registers"
            onClick={() => setActiveTab("registers")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === "registers"
                ? "bg-white text-emerald-800 shadow-xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>23 Register</span>
            <span className="bg-slate-200 text-slate-700 px-1 py-0.2 rounded text-[10px] font-mono">
              {totalEntries}
            </span>
          </button>

          <button
            id="nav-btn-officers"
            onClick={() => setActiveTab("officers")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === "officers"
                ? "bg-white text-emerald-800 shadow-xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Petugas</span>
            <span className="bg-slate-200 text-slate-700 px-1 py-0.2 rounded text-[10px] font-mono">
              {totalOfficers}
            </span>
          </button>

          <button
            id="nav-btn-settings"
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === "settings"
                ? "bg-white text-emerald-800 shadow-xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Pengaturan & TTD</span>
            <span className="sm:hidden">TTD</span>
          </button>
        </nav>

        {/* Quick Sample Data Seed */}
        <button
          id="btn-seed-sample"
          onClick={onSeedSample}
          disabled={isSeeding}
          title="Muat data contoh pengujian"
          className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isSeeding ? "animate-spin text-emerald-600" : ""}`} />
          <span className="hidden lg:inline">Data Contoh</span>
        </button>
      </div>
    </header>
  );
};
