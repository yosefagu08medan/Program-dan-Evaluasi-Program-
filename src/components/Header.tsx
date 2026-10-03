import React from 'react';
import { Calendar, Search, Filter, Smartphone, Monitor } from 'lucide-react';
import { FilterOptions } from '../types/proker';

interface HeaderProps {
  filterOptions: FilterOptions;
  setFilterOptions: React.Dispatch<React.SetStateAction<FilterOptions>>;
  totalCount: number;
  totalAnggaran: number;
  isMobileDeviceFrame: boolean;
  setIsMobileDeviceFrame: (val: boolean) => void;
  onOpenFilterDrawer: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  filterOptions,
  setFilterOptions,
  totalCount,
  isMobileDeviceFrame,
  setIsMobileDeviceFrame,
  onOpenFilterDrawer,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-4xl mx-auto px-4 py-3">
        {/* Top row: Brand & Mobile Preview Toggle */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
              <Calendar className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-slate-900 leading-tight truncate">
                Proker Mobile
              </h1>
              <div className="flex items-center gap-1.5">
                <p className="text-xs text-slate-500 font-medium">
                  Rencana Kerja 2026 & 2027
                </p>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-full border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Cloud Synced
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Toggle mobile simulation frame on desktop */}
            <button
              type="button"
              onClick={() => setIsMobileDeviceFrame(!isMobileDeviceFrame)}
              className="hidden md:inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              title="Ganti Mode Tampilan (Mobile Frame vs Full Width)"
            >
              {isMobileDeviceFrame ? (
                <>
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Mode Lebar</span>
                </>
              ) : (
                <>
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Mode HP</span>
                </>
              )}
            </button>

            {/* Filter button with badge */}
            <button
              type="button"
              onClick={onOpenFilterDrawer}
              className={`min-h-[38px] px-3 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                filterOptions.tipeJadwal !== 'all' ||
                filterOptions.status !== 'all' ||
                filterOptions.divisi !== 'all' ||
                filterOptions.selectedMonth !== undefined
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filter</span>
              {(filterOptions.tipeJadwal !== 'all' ||
                filterOptions.status !== 'all' ||
                filterOptions.divisi !== 'all' ||
                filterOptions.selectedMonth !== undefined) && (
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
              )}
            </button>
          </div>
        </div>

        {/* Year Selector Tabs (2026 | 2027 | Semua) */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex-1 p-1 bg-slate-100 rounded-xl flex items-center gap-1">
            <button
              type="button"
              onClick={() => setFilterOptions((prev) => ({ ...prev, tahun: 2026 }))}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                filterOptions.tahun === 2026
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tahun 2026
            </button>

            <button
              type="button"
              onClick={() => setFilterOptions((prev) => ({ ...prev, tahun: 2027 }))}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                filterOptions.tahun === 2027
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tahun 2027
            </button>

            <button
              type="button"
              onClick={() => setFilterOptions((prev) => ({ ...prev, tahun: 'all' }))}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                filterOptions.tahun === 'all'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua
            </button>
          </div>
        </div>

        {/* Search input field */}
        <div className="mt-2.5 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={filterOptions.searchQuery}
            onChange={(e) =>
              setFilterOptions((prev) => ({ ...prev, searchQuery: e.target.value }))
            }
            placeholder="Cari nama program, penanggung jawab, sasaran..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
          />
          {filterOptions.searchQuery && (
            <button
              type="button"
              onClick={() => setFilterOptions((prev) => ({ ...prev, searchQuery: '' }))}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 w-5 h-5 flex items-center justify-center rounded-full bg-slate-200"
            >
              ✕
            </button>
          )}
        </div>

        {/* Micro subtext with count */}
        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <span>
            {filterOptions.tahun === 'all'
              ? 'Tahun 2025 & 2026'
              : `Program Kerja Tahun ${filterOptions.tahun}`}
          </span>
          <span className="tabular-nums font-semibold text-slate-700">
            {totalCount} program
          </span>
        </div>
      </div>
    </header>
  );
};
