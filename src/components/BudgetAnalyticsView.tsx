import React from 'react';
import {
  TrendingUp,
  DollarSign,
  PieChart,
  Layers,
  CheckCircle,
  Clock,
  Building,
  Target,
} from 'lucide-react';
import { ProgramKerja } from '../types/proker';
import { formatRupiah, formatCompactRupiah, getStatusInfo, normalizeDivisionName } from '../utils/formatters';

interface BudgetAnalyticsViewProps {
  programs: ProgramKerja[];
}

export const BudgetAnalyticsView: React.FC<BudgetAnalyticsViewProps> = ({ programs }) => {
  // Calculations
  const programs2026 = programs.filter((p) => p.tahun === 2026);
  const programs2027 = programs.filter((p) => p.tahun === 2027);

  const totalAnggaran2026 = programs2026.reduce((sum, p) => sum + (p.estimasiAnggaran || 0), 0);
  const totalAnggaran2027 = programs2027.reduce((sum, p) => sum + (p.estimasiAnggaran || 0), 0);
  const grandTotal = totalAnggaran2026 + totalAnggaran2027;

  // Breakdown by Schedule Type
  const sepanjangTahunCount = programs.filter((p) => p.tipeJadwal === 'sepanjang_tahun').length;
  const multiBulanCount = programs.filter((p) => p.tipeJadwal === 'multi_bulan').length;
  const satuKaliCount = programs.filter((p) => p.tipeJadwal === 'satu_kali').length;

  // Breakdown by Status
  const statusCounts = {
    direncanakan: programs.filter((p) => p.status === 'direncanakan').length,
    berjalan: programs.filter((p) => p.status === 'berjalan').length,
    selesai: programs.filter((p) => p.status === 'selesai').length,
    ditunda: programs.filter((p) => p.status === 'ditunda').length,
  };

  // Division Aggregates
  const divisiMap: Record<string, { count: number; total: number }> = {};
  programs.forEach((p) => {
    const div = normalizeDivisionName(p.penanggungjawab?.divisi || 'Umum & Lainnya');
    if (!divisiMap[div]) {
      divisiMap[div] = { count: 0, total: 0 };
    }
    divisiMap[div].count += 1;
    divisiMap[div].total += p.estimasiAnggaran || 0;
  });

  const sortedDivisi = Object.entries(divisiMap).sort((a, b) => b[1].total - a[1].total);

  // Top 5 Highest Budget Programs
  const topPrograms = [...programs].sort((a, b) => (b.estimasiAnggaran || 0) - (a.estimasiAnggaran || 0)).slice(0, 5);

  return (
    <div className="space-y-4">
      {/* 2-Year Budget Comparison Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Tahun 2026 */}
        <div className="bg-white rounded-2xl p-4 border border-blue-100 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/70 rounded-full blur-xl -mr-6 -mt-6 pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
              Tahun 2026
            </span>
            <span className="text-[11px] text-slate-500 font-semibold">
              {programs2026.length} program
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
            Total Estimasi Anggaran
          </p>
          <p className="text-xl font-bold text-slate-900 tabular-nums mt-0.5">
            {formatRupiah(totalAnggaran2026)}
          </p>
          <p className="text-[11px] text-slate-500 mt-2">
            Rata-rata:{' '}
            <span className="font-semibold text-slate-700 tabular-nums">
              {formatCompactRupiah(programs2026.length ? Math.round(totalAnggaran2026 / programs2026.length) : 0)}
            </span>{' '}
            / kegiatan
          </p>
        </div>

        {/* Tahun 2027 */}
        <div className="bg-white rounded-2xl p-4 border border-purple-100 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50/70 rounded-full blur-xl -mr-6 -mt-6 pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
              Tahun 2027
            </span>
            <span className="text-[11px] text-slate-500 font-semibold">
              {programs2027.length} program
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
            Total Estimasi Anggaran
          </p>
          <p className="text-xl font-bold text-slate-900 tabular-nums mt-0.5">
            {formatRupiah(totalAnggaran2027)}
          </p>
          <p className="text-[11px] text-slate-500 mt-2">
            Rata-rata:{' '}
            <span className="font-semibold text-slate-700 tabular-nums">
              {formatCompactRupiah(programs2027.length ? Math.round(totalAnggaran2027 / programs2027.length) : 0)}
            </span>{' '}
            / kegiatan
          </p>
        </div>
      </div>

      {/* Combined Grand Total Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
            Akumulasi Anggaran 2 Tahun (2026 - 2027)
          </p>
          <p className="text-2xl font-bold tabular-nums text-white mt-0.5">
            {formatRupiah(grandTotal)}
          </p>
          <p className="text-xs text-slate-300 mt-1">
            Total {programs.length} Program Kerja Terencana
          </p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
          <DollarSign className="w-6 h-6 text-emerald-400" />
        </div>
      </div>

      {/* Distribusi Tipe Jadwal Pelaksanaan */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
          Distribusi Jadwal Pelaksanaan
        </h4>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-3 bg-sky-50 rounded-xl border border-sky-100">
            <span className="text-[10px] font-bold text-sky-800 uppercase block">
              Sepanjang Tahun
            </span>
            <span className="text-xl font-bold text-sky-900 tabular-nums mt-1 block">
              {sepanjangTahunCount}
            </span>
            <span className="text-[10px] text-sky-600 mt-0.5 block">12 Bulan Penuh</span>
          </div>

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
            <span className="text-[10px] font-bold text-emerald-800 uppercase block">
              Multi Bulan
            </span>
            <span className="text-xl font-bold text-emerald-900 tabular-nums mt-1 block">
              {multiBulanCount}
            </span>
            <span className="text-[10px] text-emerald-600 mt-0.5 block">Bulan Terjadwal</span>
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
            <span className="text-[10px] font-bold text-amber-800 uppercase block">
              Satu Kali
            </span>
            <span className="text-xl font-bold text-amber-900 tabular-nums mt-1 block">
              {satuKaliCount}
            </span>
            <span className="text-[10px] text-amber-600 mt-0.5 block">Kegiatan Tunggal</span>
          </div>
        </div>
      </div>

      {/* Status Progress Kegiatan */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
          Status Progres Kegiatan
        </h4>

        <div className="space-y-2.5">
          {[
            { label: 'Direncanakan', count: statusCounts.direncanakan, color: 'bg-sky-500' },
            { label: 'Sedang Berjalan', count: statusCounts.berjalan, color: 'bg-amber-500' },
            { label: 'Selesai', count: statusCounts.selesai, color: 'bg-emerald-500' },
            { label: 'Ditunda', count: statusCounts.ditunda, color: 'bg-rose-500' },
          ].map((item) => {
            const percentage = programs.length ? Math.round((item.count / programs.length) * 100) : 0;
            return (
              <div key={item.label}>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>{item.label}</span>
                  <span className="tabular-nums text-slate-500">
                    {item.count} proker ({percentage}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.color} transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Alokasi Anggaran per Divisi */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
          Alokasi Anggaran per Divisi / Unit Kerja
        </h4>

        <div className="space-y-3">
          {sortedDivisi.map(([divisi, data]) => {
            const percentage = grandTotal > 0 ? Math.round((data.total / grandTotal) * 100) : 0;
            return (
              <div key={divisi} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 truncate pr-2">
                    {divisi}
                  </span>
                  <span className="font-bold text-slate-900 tabular-nums shrink-0">
                    {formatRupiah(data.total)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-slate-800 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold tabular-nums w-8 text-right">
                    {percentage}%
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  {data.count} program kerja
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top 5 Highest Budget Programs */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
          5 Program dengan Anggaran Terbesar
        </h4>

        <div className="divide-y divide-slate-100">
          {topPrograms.map((p, idx) => (
            <div key={p.id} className="py-2.5 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2 min-w-0">
                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <h5 className="text-xs font-bold text-slate-900 leading-snug truncate">
                    {p.namaProgram}
                  </h5>
                  <p className="text-[10px] text-slate-500">
                    Tahun {p.tahun} · {p.penanggungjawab?.divisi || 'Umum'}
                  </p>
                </div>
              </div>

              <span className="text-xs font-bold text-slate-900 tabular-nums shrink-0">
                {formatRupiah(p.estimasiAnggaran)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
