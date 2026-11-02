import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  BarChart3,
  ShieldCheck,
  FileText,
  Sparkles,
  TrendingUp,
  Wallet,
  Coins,
  ArrowDownCircle,
  ArrowUpCircle,
  TableProperties,
  ChevronDown,
  Users,
  Check,
} from 'lucide-react';

export type MainCategory = 'dashboard' | 'program' | 'keuangan' | 'pengurus';

export type SubMenuKey =
  | 'dashboard_keseluruhan'
  | 'dashboard_keuangan'
  | 'komparasi'
  | 'input_program'
  | 'dual_planning'
  | 'perbandingan_program'
  | 'keuangan_rencana_penerimaan'
  | 'keuangan_realisasi_penerimaan'
  | 'keuangan_penggunaan_dana'
  | 'keuangan_tabel_kas'
  | 'pengurus';

interface NavigationDropdownsProps {
  activeTab: SubMenuKey;
  onSelectTab: (tab: SubMenuKey) => void;
  isBendahara?: boolean;
}

export const NavigationDropdowns: React.FC<NavigationDropdownsProps> = ({
  activeTab,
  onSelectTab,
  isBendahara = false,
}) => {
  const [openDropdown, setOpenDropdown] = useState<MainCategory | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = (cat: MainCategory) => {
    setOpenDropdown((prev) => (prev === cat ? null : cat));
  };

  const handleSelect = (sub: SubMenuKey) => {
    onSelectTab(sub);
    setOpenDropdown(null);
  };

  // Determine which parent category is currently active
  const isDashboardActive =
    activeTab === 'dashboard_keseluruhan' || activeTab === 'dashboard_keuangan';

  const isProgramActive =
    activeTab === 'komparasi' ||
    activeTab === 'input_program' ||
    activeTab === 'dual_planning' ||
    activeTab === 'perbandingan_program';

  const isKeuanganActive =
    activeTab === 'keuangan_rencana_penerimaan' ||
    activeTab === 'keuangan_realisasi_penerimaan' ||
    activeTab === 'keuangan_penggunaan_dana' ||
    activeTab === 'keuangan_tabel_kas';

  const isPengurusActive = activeTab === 'pengurus';

  return (
    <div
      ref={containerRef}
      className="flex items-center gap-1.5 p-1 bg-slate-200/90 rounded-2xl relative select-none flex-wrap sm:flex-nowrap"
    >
      {/* 1. DROPDOWN DASHBOARD */}
      <div className="relative">
        <button
          type="button"
          onClick={() => handleToggle('dashboard')}
          className={`py-1.5 px-3 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
            isDashboardActive
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-200/80 shadow-2xs'
          }`}
        >
          <LayoutDashboard className={`w-3.5 h-3.5 ${isDashboardActive ? 'text-emerald-200' : 'text-emerald-600'}`} />
          <span>Dashboard</span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-150 ${
              openDropdown === 'dashboard' ? 'rotate-180' : ''
            }`}
          />
        </button>

        {openDropdown === 'dashboard' && (
          <div className="absolute left-0 top-full mt-1.5 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
              Pilihan Dashboard
            </div>
            <button
              type="button"
              onClick={() => handleSelect('dashboard_keseluruhan')}
              className={`w-full p-2 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                activeTab === 'dashboard_keseluruhan'
                  ? 'bg-emerald-50 text-emerald-950 font-black'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <LayoutDashboard className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs">Dashboard Keseluruhan Program</div>
                  <div className="text-[10px] text-slate-400 font-medium">Status proker &amp; capaian seksi</div>
                </div>
              </div>
              {activeTab === 'dashboard_keseluruhan' && <Check className="w-4 h-4 text-emerald-600" />}
            </button>

            <button
              type="button"
              onClick={() => handleSelect('dashboard_keuangan')}
              className={`w-full p-2 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-colors cursor-pointer mt-0.5 ${
                activeTab === 'dashboard_keuangan'
                  ? 'bg-emerald-50 text-emerald-950 font-black'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs">Dashboard Penggunaan Dana &amp; Penerimaan</div>
                  <div className="text-[10px] text-slate-400 font-medium">Analitik kas, penerimaan &amp; sisa saldo</div>
                </div>
              </div>
              {activeTab === 'dashboard_keuangan' && <Check className="w-4 h-4 text-emerald-600" />}
            </button>
          </div>
        )}
      </div>

      {/* 2. DROPDOWN PROGRAM */}
      <div className="relative">
        <button
          type="button"
          onClick={() => handleToggle('program')}
          className={`py-1.5 px-3 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
            isProgramActive
              ? 'bg-indigo-700 text-white shadow-xs'
              : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-200/80 shadow-2xs'
          }`}
        >
          <ShieldCheck className={`w-3.5 h-3.5 ${isProgramActive ? 'text-indigo-200' : 'text-indigo-600'}`} />
          <span>Program</span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-150 ${
              openDropdown === 'program' ? 'rotate-180' : ''
            }`}
          />
        </button>

        {openDropdown === 'program' && (
          <div className="absolute left-0 top-full mt-1.5 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
              Menu Program Kerja
            </div>

            {/* Sub 1: Komparasi Program */}
            <button
              type="button"
              onClick={() => handleSelect('komparasi')}
              className={`w-full p-2 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                activeTab === 'komparasi'
                  ? 'bg-indigo-50 text-indigo-950 font-black'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs">Komparasi Program (DPPH 2026-2027)</div>
                  <div className="text-[10px] text-slate-400 font-medium">Evaluasi keterlaksanaan &amp; arahan</div>
                </div>
              </div>
              {activeTab === 'komparasi' && <Check className="w-4 h-4 text-indigo-600" />}
            </button>

            {/* Sub 2: Input Perancangan */}
            <button
              type="button"
              onClick={() => handleSelect('input_program')}
              className={`w-full p-2 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-colors cursor-pointer mt-0.5 ${
                activeTab === 'input_program'
                  ? 'bg-indigo-50 text-indigo-950 font-black'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs">Input Perancangan</div>
                  <div className="text-[10px] text-slate-400 font-medium">Formulir detail program kerja</div>
                </div>
              </div>
              {activeTab === 'input_program' && <Check className="w-4 h-4 text-indigo-600" />}
            </button>

            {/* Sub 3: Perancangan Dua Sisi */}
            <button
              type="button"
              onClick={() => handleSelect('dual_planning')}
              className={`w-full p-2 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-colors cursor-pointer mt-0.5 ${
                activeTab === 'dual_planning'
                  ? 'bg-indigo-50 text-indigo-950 font-black'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs">Perancangan Dua Sisi</div>
                  <div className="text-[10px] text-slate-400 font-medium">Side-by-side rancangan 2026 vs 2027</div>
                </div>
              </div>
              {activeTab === 'dual_planning' && <Check className="w-4 h-4 text-indigo-600" />}
            </button>

            {/* Sub 4: Perbandingan Program */}
            <button
              type="button"
              onClick={() => handleSelect('perbandingan_program')}
              className={`w-full p-2 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-colors cursor-pointer mt-0.5 ${
                activeTab === 'perbandingan_program'
                  ? 'bg-indigo-50 text-indigo-950 font-black'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center">
                  <BarChart3 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs">Perbandingan Program</div>
                  <div className="text-[10px] text-slate-400 font-medium">Komparasi total proker &amp; anggaran</div>
                </div>
              </div>
              {activeTab === 'perbandingan_program' && <Check className="w-4 h-4 text-indigo-600" />}
            </button>
          </div>
        )}
      </div>

      {/* 3. DROPDOWN KEUANGAN */}
      <div className="relative">
        <button
          type="button"
          onClick={() => handleToggle('keuangan')}
          className={`py-1.5 px-3 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
            isKeuanganActive
              ? 'bg-teal-700 text-white shadow-xs'
              : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-200/80 shadow-2xs'
          }`}
        >
          <Wallet className={`w-3.5 h-3.5 ${isKeuanganActive ? 'text-teal-200' : 'text-teal-600'}`} />
          <span>Keuangan</span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-150 ${
              openDropdown === 'keuangan' ? 'rotate-180' : ''
            }`}
          />
        </button>

        {openDropdown === 'keuangan' && (
          <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1.5 w-76 bg-white rounded-2xl shadow-xl border border-slate-200 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
              Menu Keuangan Paroki
            </div>

            {/* Sub 1: Input Rencana Penerimaan */}
            <button
              type="button"
              onClick={() => handleSelect('keuangan_rencana_penerimaan')}
              className={`w-full p-2 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                activeTab === 'keuangan_rencana_penerimaan'
                  ? 'bg-teal-50 text-teal-950 font-black'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center">
                  <ArrowDownCircle className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div>
                  <div className="text-xs">Input Rencana Penerimaan</div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    Target Kolekte I (50:50), Kolekte II &amp; Khusus
                  </div>
                </div>
              </div>
              {activeTab === 'keuangan_rencana_penerimaan' && <Check className="w-4 h-4 text-teal-600" />}
            </button>

            {/* Sub 2: Input Realisasi Penerimaan */}
            <button
              type="button"
              onClick={() => handleSelect('keuangan_realisasi_penerimaan')}
              className={`w-full p-2 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-colors cursor-pointer mt-0.5 ${
                activeTab === 'keuangan_realisasi_penerimaan'
                  ? 'bg-teal-50 text-teal-950 font-black'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Coins className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div>
                  <div className="text-xs">Input Realisasi Penerimaan</div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    Catat kas aktual riil masuk mingguan
                  </div>
                </div>
              </div>
              {activeTab === 'keuangan_realisasi_penerimaan' && <Check className="w-4 h-4 text-teal-600" />}
            </button>

            {/* Sub 3: Input Penggunaan Dana */}
            <button
              type="button"
              onClick={() => handleSelect('keuangan_penggunaan_dana')}
              className={`w-full p-2 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-colors cursor-pointer mt-0.5 ${
                activeTab === 'keuangan_penggunaan_dana'
                  ? 'bg-teal-50 text-teal-950 font-black'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                  <ArrowUpCircle className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <div>
                  <div className="text-xs">Input Penggunaan Dana</div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    Realisasi pengeluaran anggaran program seksi
                  </div>
                </div>
              </div>
              {activeTab === 'keuangan_penggunaan_dana' && <Check className="w-4 h-4 text-teal-600" />}
            </button>

            {/* Sub 4: Tabel Rencana Penerimaan dan Penggunaan */}
            <button
              type="button"
              onClick={() => handleSelect('keuangan_tabel_kas')}
              className={`w-full p-2 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-colors cursor-pointer mt-0.5 ${
                activeTab === 'keuangan_tabel_kas'
                  ? 'bg-teal-50 text-teal-950 font-black'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center">
                  <TableProperties className="w-3.5 h-3.5 text-indigo-600" />
                </div>
                <div>
                  <div className="text-xs">Tabel Rencana Penerimaan &amp; Penggunaan</div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    Proyeksi arus kas bulanan &amp; daya dukung
                  </div>
                </div>
              </div>
              {activeTab === 'keuangan_tabel_kas' && <Check className="w-4 h-4 text-teal-600" />}
            </button>
          </div>
        )}
      </div>

      {/* 4. TOMBOL PENGURUS PAROKI */}
      <button
        type="button"
        onClick={() => handleSelect('pengurus')}
        className={`py-1.5 px-3 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
          isPengurusActive
            ? 'bg-blue-600 text-white shadow-xs'
            : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-200/80 shadow-2xs'
        }`}
      >
        <Users className={`w-3.5 h-3.5 ${isPengurusActive ? 'text-blue-200' : 'text-blue-600'}`} />
        <span>Pengurus Paroki</span>
      </button>
    </div>
  );
};
