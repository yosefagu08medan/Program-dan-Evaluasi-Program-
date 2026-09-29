import React from 'react';
import { X, RotateCcw, Check } from 'lucide-react';
import { FilterOptions, ScheduleType, ProgramStatus } from '../types/proker';
import { BULAN_LIST, DAFTAR_DIVISI } from '../utils/formatters';

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filterOptions: FilterOptions;
  setFilterOptions: React.Dispatch<React.SetStateAction<FilterOptions>>;
  allDivisiList: string[];
}

export const FilterDrawer: React.FC<FilterDrawerProps> = ({
  isOpen,
  onClose,
  filterOptions,
  setFilterOptions,
  allDivisiList,
}) => {
  if (!isOpen) return null;

  const handleReset = () => {
    setFilterOptions((prev) => ({
      ...prev,
      tipeJadwal: 'all',
      status: 'all',
      divisi: 'all',
      selectedMonth: undefined,
      searchQuery: '',
    }));
  };

  const divisions = Array.from(new Set([...DAFTAR_DIVISI, ...allDivisiList]));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in slide-in-from-bottom duration-200">
        {/* Drag handle pill */}
        <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="text-base font-bold text-slate-900">Filter Program Kerja</h3>
            <p className="text-xs text-slate-500">Sesuaikan tampilan daftar kegiatan</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-slate-100"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Body - Scrollable */}
        <div className="overflow-y-auto px-5 py-4 space-y-5 flex-1">
          {/* Filter: Tipe Jadwal Pelaksanaan */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-2">
              Jadwal Pelaksanaan
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'all', label: 'Semua Tipe Jadwal' },
                { id: 'sepanjang_tahun', label: 'Sepanjang Tahun (12 Bln)' },
                { id: 'multi_bulan', label: 'Multi Bulan Terjadwal' },
                { id: 'satu_kali', label: 'Satu Kali Pelaksanaan' },
              ].map((opt) => {
                const isSelected = filterOptions.tipeJadwal === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      setFilterOptions((prev) => ({
                        ...prev,
                        tipeJadwal: opt.id as 'all' | ScheduleType,
                      }))
                    }
                    className={`text-left text-xs font-medium px-3 py-2.5 rounded-xl border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filter: Bulan Pelaksanaan Spesifik */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800">
                Aktif di Bulan Tertentu
              </label>
              {filterOptions.selectedMonth !== undefined && (
                <button
                  type="button"
                  onClick={() =>
                    setFilterOptions((prev) => ({ ...prev, selectedMonth: undefined }))
                  }
                  className="text-[11px] font-semibold text-rose-600 hover:underline"
                >
                  Hapus Pilihan Bulan
                </button>
              )}
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {BULAN_LIST.map((bln) => {
                const isSelected = filterOptions.selectedMonth === bln.no;
                return (
                  <button
                    key={bln.no}
                    type="button"
                    onClick={() =>
                      setFilterOptions((prev) => ({
                        ...prev,
                        selectedMonth: isSelected ? undefined : bln.no,
                      }))
                    }
                    className={`py-2 text-xs font-semibold rounded-lg border text-center transition-all ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {bln.singkatan}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filter: Status Pelaksanaan */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-2">
              Status Kegiatan
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'all', label: 'Semua Status' },
                { id: 'direncanakan', label: 'Direncanakan' },
                { id: 'berjalan', label: 'Sedang Berjalan' },
                { id: 'selesai', label: 'Selesai' },
                { id: 'ditunda', label: 'Ditunda' },
              ].map((st) => {
                const isSelected = filterOptions.status === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() =>
                      setFilterOptions((prev) => ({
                        ...prev,
                        status: st.id as 'all' | ProgramStatus,
                      }))
                    }
                    className={`text-left text-xs font-medium px-3 py-2 rounded-xl border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{st.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filter: Divisi Penanggungjawab */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-2">
              Divisi / Penanggung Jawab
            </label>
            <select
              value={filterOptions.divisi}
              onChange={(e) =>
                setFilterOptions((prev) => ({ ...prev, divisi: e.target.value }))
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
            >
              <option value="all">Semua Divisi / Unit</option>
              {divisions.map((div) => (
                <option key={div} value={div}>
                  {div}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-slate-900/10 active:scale-[0.99]"
          >
            Terapkan Filter
          </button>
        </div>
      </div>
    </div>
  );
};
