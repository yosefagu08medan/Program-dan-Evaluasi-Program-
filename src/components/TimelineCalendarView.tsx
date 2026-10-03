import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, ChevronRight, User, DollarSign, Filter } from 'lucide-react';
import { ProgramKerja, ScheduleType } from '../types/proker';
import { BULAN_LIST, formatRupiah, getTipeJadwalLabel, getStatusInfo } from '../utils/formatters';

interface TimelineCalendarViewProps {
  programs: ProgramKerja[];
  selectedYear: 'all' | 2025 | 2026;
  onEdit: (program: ProgramKerja) => void;
}

export const TimelineCalendarView: React.FC<TimelineCalendarViewProps> = ({
  programs,
  selectedYear,
  onEdit,
}) => {
  const [activeMonth, setActiveMonth] = useState<number>(new Date().getMonth() + 1);
  const [scheduleFilter, setScheduleFilter] = useState<'all' | ScheduleType>('all');

  // Filter programs based on year and scheduleFilter
  const filteredPrograms = programs.filter((p) => {
    if (selectedYear !== 'all' && p.tahun !== selectedYear) return false;
    if (scheduleFilter !== 'all' && p.tipeJadwal !== scheduleFilter) return false;
    return true;
  });

  // Programs active in the currently selected month
  const programsInActiveMonth = filteredPrograms.filter((p) =>
    p.bulanPelaksanaan?.includes(activeMonth)
  );

  // Compute count of programs per month
  const monthCounts = BULAN_LIST.map((m) => {
    const count = filteredPrograms.filter((p) => p.bulanPelaksanaan?.includes(m.no)).length;
    return { ...m, count };
  });

  return (
    <div className="space-y-4">
      {/* Schedule Type Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
        {[
          { id: 'all', label: 'Semua Tipe Jadwal' },
          { id: 'sepanjang_tahun', label: 'Sepanjang Tahun' },
          { id: 'multi_bulan', label: 'Multi Bulan' },
          { id: 'satu_kali', label: 'Satu Kali' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setScheduleFilter(tab.id as 'all' | ScheduleType)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              scheduleFilter === tab.id
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Month Carousel / Matrix Grid */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Kalender Pelaksanaan (12 Bulan)
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Ketuk bulan untuk melihat proker
          </span>
        </div>

        {/* 12 Months Horizontal / Grid Selector */}
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-1.5">
          {monthCounts.map((m) => {
            const isSelected = activeMonth === m.no;
            return (
              <button
                key={m.no}
                type="button"
                onClick={() => setActiveMonth(m.no)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all relative ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-600/20'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className="text-xs font-bold">{m.singkatan}</span>
                <span
                  className={`text-[10px] mt-0.5 font-semibold tabular-nums px-1.5 py-0.2 rounded-full ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : m.count > 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'text-slate-400'
                  }`}
                >
                  {m.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Month Detail Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              Agenda Bulan {BULAN_LIST[activeMonth - 1]?.nama} {selectedYear !== 'all' ? selectedYear : ''}
            </h4>
            <p className="text-[11px] text-slate-500">
              {programsInActiveMonth.length} kegiatan aktif di bulan ini
            </p>
          </div>
          <span className="text-xs font-bold text-slate-700 tabular-nums">
            Total:{' '}
            {formatRupiah(
              programsInActiveMonth.reduce((acc, curr) => acc + (curr.estimasiAnggaran || 0), 0)
            )}
          </span>
        </div>

        {/* List of Proker in this month */}
        {programsInActiveMonth.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-dashed border-slate-300 text-center">
            <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">
              Tidak ada agenda kegiatan di bulan {BULAN_LIST[activeMonth - 1]?.nama}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Pilih bulan lain di atas atau tambahkan program kerja baru.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {programsInActiveMonth.map((proker) => {
              const statusInfo = getStatusInfo(proker.status);
              return (
                <div
                  key={proker.id}
                  onClick={() => onEdit(proker)}
                  className="bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all cursor-pointer flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                            proker.tahun === 2026
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-purple-50 text-purple-700'
                          }`}
                        >
                          {proker.tahun}
                        </span>
                        <span className="text-slate-300 text-xs">·</span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {getTipeJadwalLabel(proker.tipeJadwal)}
                        </span>
                        <span className="text-slate-300 text-xs">·</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.2 rounded-full border ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <h5 className="text-xs font-bold text-slate-900 leading-snug">
                        {proker.namaProgram}
                      </h5>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                  </div>

                  <p className="text-[11px] text-slate-600 line-clamp-2">
                    {proker.tujuanKegiatan}
                  </p>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-medium truncate max-w-[140px]">
                        {proker.penanggungjawab?.nama || 'Tanpa PJ'}
                      </span>
                    </div>

                    <span className="font-bold text-slate-900 tabular-nums">
                      {formatRupiah(proker.estimasiAnggaran)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Full Year Gantt / Timeline Matrix Overview */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
          Matriks Sebaran Jadwal (Gantt View)
        </h4>

        <div className="overflow-x-auto no-scrollbar">
          <div className="min-w-[500px]">
            {/* Header Months */}
            <div className="grid grid-cols-12 gap-1 pb-2 border-b border-slate-200 text-center text-[10px] font-bold text-slate-500">
              {BULAN_LIST.map((m) => (
                <div key={m.no}>{m.singkatan}</div>
              ))}
            </div>

            {/* Rows */}
            <div className="divide-y divide-slate-100">
              {filteredPrograms.map((p) => (
                <div key={p.id} className="py-2.5">
                  <div className="flex items-center justify-between text-[11px] font-medium text-slate-800 mb-1 truncate">
                    <span className="truncate pr-2 font-semibold">
                      [{p.tahun}] {p.namaProgram}
                    </span>
                    <span className="text-[10px] text-slate-500 tabular-nums shrink-0">
                      {formatRupiah(p.estimasiAnggaran)}
                    </span>
                  </div>

                  <div className="grid grid-cols-12 gap-1">
                    {BULAN_LIST.map((m) => {
                      const isActive = p.bulanPelaksanaan?.includes(m.no);
                      return (
                        <div
                          key={m.no}
                          className={`h-3 rounded-xs transition-colors ${
                            isActive
                              ? p.tipeJadwal === 'sepanjang_tahun'
                                ? 'bg-sky-500'
                                : p.tipeJadwal === 'satu_kali'
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                              : 'bg-slate-100'
                          }`}
                          title={`${p.namaProgram} - ${m.nama}: ${isActive ? 'Aktif' : 'Tidak'}`}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-end gap-3 text-[10px] text-slate-500 font-medium">
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-sky-500" />
                <span>Sepanjang Tahun</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
                <span>Multi Bulan</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-500" />
                <span>Satu Kali</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
