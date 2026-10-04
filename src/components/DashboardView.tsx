import React, { useMemo } from 'react';
import {
  Calendar,
  DollarSign,
  Users,
  CheckCircle2,
  Clock,
  ChevronRight,
  Plus,
  Shield,
  Building2,
  Radio,
  HeartHandshake,
  Home,
  Sparkles,
  GraduationCap,
  BookOpen,
  Music,
  BookKey,
  TreePine,
  Award,
  HelpCircle,
  CalendarClock,
  Sparkle,
} from 'lucide-react';
import { ProgramKerja } from '../types/proker';
import {
  BULAN_LIST,
  formatRupiah,
  formatCompactRupiah,
  formatIndonesianDate,
  getStatusInfo,
  isTentatifProgram,
} from '../utils/formatters';
import { MASTER_DIVISIONS } from '../../database/master-data/divisions';

interface DashboardViewProps {
  programs: ProgramKerja[];
  selectedYear: 'all' | 2026 | 2027;
  onSelectYear: (year: 'all' | 2026 | 2027) => void;
  selectedMonth: number | 'all' | 'tentatif';
  onSelectMonth: (month: number | 'all' | 'tentatif') => void;
  selectedSeksi: string | 'all';
  onSelectSeksi: (seksi: string | 'all') => void;
  onOpenProgramDetail: (programId: string) => void;
  onInputProgramForSeksi: (seksiName: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  programs,
  selectedYear,
  selectedMonth,
  selectedSeksi,
  onOpenProgramDetail,
  onInputProgramForSeksi,
}) => {
  // 1. Program dalam tahun terpilih
  const programsInYear = useMemo(() => {
    return programs.filter((p) => {
      if (selectedYear !== 'all' && p.tahun !== selectedYear) return false;
      return true;
    });
  }, [programs, selectedYear]);

  // 2. Program tentatif (belum ditentukan tanggal / bulannya) dalam tahun dan seksi terpilih
  const tentativePrograms = useMemo(() => {
    return programsInYear.filter((p) => {
      if (selectedSeksi !== 'all' && p.penanggungjawab?.divisi !== selectedSeksi) {
        return false;
      }
      return isTentatifProgram(p);
    });
  }, [programsInYear, selectedSeksi]);

  // 3. Program yang memiliki jadwal bulan dalam tahun & seksi terpilih
  const scheduledProgramsInMonth = useMemo(() => {
    return programsInYear.filter((p) => {
      if (isTentatifProgram(p)) return false;
      if (selectedSeksi !== 'all' && p.penanggungjawab?.divisi !== selectedSeksi) {
        return false;
      }
      if (typeof selectedMonth === 'number') {
        return p.bulanPelaksanaan?.includes(selectedMonth);
      }
      if (selectedMonth === 'all') {
        return true;
      }
      // if selectedMonth === 'tentatif', scheduled list is empty because user focuses on tentative
      return false;
    });
  }, [programsInYear, selectedMonth, selectedSeksi]);

  // 4. Breakdown Seksi: Seksi yang memiliki program berjalan di bulan ini atau memiliki program tentatif
  const activeSeksiBreakdown = useMemo(() => {
    return MASTER_DIVISIONS.map((div) => {
      const seksiAllProkers = programsInYear.filter(
        (p) => p.penanggungjawab?.divisi === div.nama
      );
      const seksiScheduled = seksiAllProkers.filter((p) => {
        if (isTentatifProgram(p)) return false;
        if (typeof selectedMonth === 'number') {
          return p.bulanPelaksanaan?.includes(selectedMonth);
        }
        return true;
      });
      const seksiTentative = seksiAllProkers.filter((p) => isTentatifProgram(p));
      const totalCount =
        selectedMonth === 'tentatif'
          ? seksiTentative.length
          : selectedMonth === 'all'
          ? seksiAllProkers.length
          : seksiScheduled.length;

      const anggaran = (selectedMonth === 'tentatif' ? seksiTentative : seksiScheduled).reduce(
        (sum, p) => sum + (p.estimasiAnggaran || 0),
        0
      );

      return {
        division: div,
        scheduledPrograms: seksiScheduled,
        tentativePrograms: seksiTentative,
        count: totalCount,
        totalAnggaran: anggaran,
      };
    }).filter((item) => item.count > 0);
  }, [programsInYear, selectedMonth]);

  // 5. Seksi yang Ditampilkan
  const displayedSeksiBreakdown = useMemo(() => {
    if (selectedSeksi === 'all') {
      return activeSeksiBreakdown;
    }
    return activeSeksiBreakdown.filter(
      (item) => item.division.nama === selectedSeksi
    );
  }, [activeSeksiBreakdown, selectedSeksi]);

  // 6. Program yang ditampilkan
  const displayedPrograms = useMemo(() => {
    if (selectedMonth === 'tentatif') {
      return tentativePrograms;
    }
    return scheduledProgramsInMonth;
  }, [selectedMonth, tentativePrograms, scheduledProgramsInMonth]);

  // Aggregate metrics
  const totalAnggaranBulan = useMemo(() => {
    return displayedPrograms.reduce((sum, p) => sum + (p.estimasiAnggaran || 0), 0);
  }, [displayedPrograms]);

  const totalAnggaranTentatif = useMemo(() => {
    return tentativePrograms.reduce((sum, p) => sum + (p.estimasiAnggaran || 0), 0);
  }, [tentativePrograms]);

  const statusCounts = useMemo(() => {
    const counts = { direncanakan: 0, berlangsung: 0, selesai: 0 };
    displayedPrograms.forEach((p) => {
      if (p.status in counts) {
        counts[p.status as keyof typeof counts]++;
      }
    });
    return counts;
  }, [displayedPrograms]);

  const selectedMonthObj = typeof selectedMonth === 'number' ? BULAN_LIST[selectedMonth - 1] : null;

  const getSeksiIcon = (code: string) => {
    switch (code) {
      case 'DPPH':
        return <Building2 className="w-4 h-4 text-indigo-600" />;
      case 'SEK-KEAMANAN':
        return <Shield className="w-4 h-4 text-amber-600" />;
      case 'SEK-UMUM':
        return <Building2 className="w-4 h-4 text-slate-600" />;
      case 'SEK-KOMSOS':
        return <Radio className="w-4 h-4 text-blue-600" />;
      case 'SEK-MUDA':
        return <Users className="w-4 h-4 text-orange-600" />;
      case 'SEK-HAK':
        return <HeartHandshake className="w-4 h-4 text-teal-600" />;
      case 'SEK-PSE':
        return <HeartHandshake className="w-4 h-4 text-rose-600" />;
      case 'SEK-KELUARGA':
        return <Home className="w-4 h-4 text-pink-600" />;
      case 'SEK-KKI':
        return <Sparkles className="w-4 h-4 text-yellow-600" />;
      case 'SEK-EVANGELISASI':
        return <Sparkles className="w-4 h-4 text-purple-600" />;
      case 'SEK-PENDIDIKAN':
        return <GraduationCap className="w-4 h-4 text-cyan-600" />;
      case 'SEK-KKS':
        return <BookOpen className="w-4 h-4 text-emerald-600" />;
      case 'SEK-LITURGI':
        return <Music className="w-4 h-4 text-violet-600" />;
      case 'SEK-KATEKESE':
        return <BookKey className="w-4 h-4 text-amber-700" />;
      case 'SEK-PLBKS':
        return <TreePine className="w-4 h-4 text-emerald-700" />;
      case 'SEK-KERAWAM':
        return <Award className="w-4 h-4 text-red-600" />;
      default:
        return <Users className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-3 pb-8 w-full">
      {/* 1. METRIK UTAMA BERDASARKAN BULAN & SEKSI PILIHAN */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
        {/* Metric 1: Total Program (Terjadwal vs Tentatif) */}
        <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider truncate">
              {selectedMonth === 'tentatif'
                ? 'Proker Tentatif'
                : selectedSeksi !== 'all'
                ? selectedSeksi.replace('Seksi ', '')
                : 'Total Proker'}
            </span>
            <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-extrabold text-slate-900 tabular-nums">
              {displayedPrograms.length}
            </span>
            <span className="text-[11px] font-semibold text-slate-500">Program</span>
          </div>
          <div className="text-[9.5px] text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-emerald-800">
              {scheduledProgramsInMonth.length} Terjadwal
            </span>
            <span>•</span>
            <span className="text-amber-700 font-bold">{tentativePrograms.length} Tentatif</span>
          </div>
        </div>

        {/* Metric 2: Estimasi Anggaran */}
        <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {selectedMonth === 'tentatif' ? 'Anggaran Tentatif' : 'Anggaran'}
            </span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-sm sm:text-base font-extrabold text-emerald-800 tabular-nums truncate">
              {formatCompactRupiah(totalAnggaranBulan)}
            </span>
          </div>
          <p className="text-[9.5px] text-slate-400 mt-0.5 truncate">
            {formatRupiah(totalAnggaranBulan)}
          </p>
        </div>

        {/* Metric 3: Seksi yang Berjalan */}
        <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Seksi Terlibat
            </span>
            <Users className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-extrabold text-slate-900 tabular-nums">
              {selectedSeksi === 'all' ? activeSeksiBreakdown.length : 1}
            </span>
            <span className="text-[11px] font-semibold text-slate-500">
              {selectedSeksi === 'all' ? 'Unit Aktif' : 'Seksi Dipilih'}
            </span>
          </div>
          <p className="text-[9.5px] text-slate-400 mt-0.5 truncate">
            {selectedSeksi === 'all'
              ? `${activeSeksiBreakdown.length} unit memiliki agenda`
              : selectedSeksi}
          </p>
        </div>

        {/* Metric 4: Status Pelaksanaan */}
        <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Status Pelaksanaan
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          </div>
          <div className="flex items-center gap-1.5 text-[9.5px] font-bold mt-1 flex-wrap">
            <span className="text-sky-700 bg-sky-50 px-1 py-0.2 rounded border border-sky-200">
              {statusCounts.direncanakan} Rencana
            </span>
            <span className="text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
              {statusCounts.selesai} Selesai
            </span>
          </div>
          <p className="text-[9.5px] text-slate-400 mt-1 truncate">
            {statusCounts.berlangsung} sedang berjalan
          </p>
        </div>
      </div>

      {/* 2. TAMPILAN PROGRAM KERJA PER SEKSI (JIKA BUKAN FOKUS TENTATIF MURNI) */}
      {selectedMonth !== 'tentatif' && displayedSeksiBreakdown.length > 0 && (
        <div className="space-y-3 w-full">
          <div className={`w-full ${selectedSeksi === 'all' ? 'grid grid-cols-1 md:grid-cols-2 gap-2.5' : 'grid grid-cols-1 gap-2.5'}`}>
            {displayedSeksiBreakdown.map(({ division, scheduledPrograms: seksiScheduled, tentativePrograms: seksiTentative, count, totalAnggaran }) => (
              <div
                key={division.id}
                className="w-full p-3 sm:p-4 rounded-xl border bg-slate-50/70 border-slate-200/90 hover:border-slate-300 transition-all shadow-2xs"
              >
                {/* Header Card Seksi */}
                <div className="flex items-start justify-between gap-2 mb-2 w-full">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center shrink-0 shadow-2xs">
                      {getSeksiIcon(division.code)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {division.nama}
                        </h3>
                        <span className="text-[9px] font-semibold text-slate-500 bg-white px-1.5 py-0.2 rounded border border-slate-200 shrink-0">
                          {division.kategori}
                        </span>
                      </div>
                      <p className="text-[10px] sm:text-[11px] text-emerald-800 font-medium truncate">
                        PIC: <span className="font-bold">{division.defaultPic}</span>
                      </p>
                    </div>
                  </div>

                  {/* Program Count Badge & Input Button */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full border bg-emerald-600 text-white border-emerald-600 shadow-2xs">
                      {count} Proker
                    </span>
                    <button
                      type="button"
                      onClick={() => onInputProgramForSeksi(division.nama)}
                      className="h-7 px-2 rounded-md bg-white border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 flex items-center justify-center gap-1 shadow-2xs transition-colors text-[10px] font-bold"
                      title={`Input Program Baru untuk ${division.nama}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Tambah</span>
                    </button>
                  </div>
                </div>

                {/* Sub: Agenda Program Terjadwal Bulan Ini */}
                <div className="space-y-1.5 pt-2 border-t border-slate-200/60 w-full">
                  <div className="flex items-center justify-between text-[10.5px] font-semibold text-slate-500 w-full px-0.5">
                    <span>Agenda Program Terjadwal:</span>
                    <span className="text-emerald-800 font-extrabold tabular-nums">
                      Total {formatCompactRupiah(totalAnggaran)}
                    </span>
                  </div>

                  {seksiScheduled.length > 0 ? (
                    <div className="space-y-1 w-full">
                      {seksiScheduled.map((p) => {
                        const targetDate =
                          typeof selectedMonth === 'number'
                            ? p.jadwalBulanan?.[selectedMonth] || p.tanggalSpesifik
                            : p.tanggalSpesifik;
                        const formattedDate = targetDate ? formatIndonesianDate(targetDate) : 'Sesuai Jadwal';

                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => onOpenProgramDetail(p.id)}
                            className="w-full text-left p-2.5 rounded-lg bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 transition-all flex items-center justify-between gap-3 group cursor-pointer shadow-2xs"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-[8.5px] font-bold px-1.5 py-0.2 rounded border ${getStatusInfo(p.status).color}`}>
                                  {getStatusInfo(p.status).label}
                                </span>
                                <p className="text-[11.5px] sm:text-xs font-bold text-slate-900 group-hover:text-emerald-950 truncate">
                                  {p.namaProgram}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5 flex-wrap">
                                <span>🗓 {formattedDate}</span>
                                <span>•</span>
                                <span className="font-bold text-emerald-800">
                                  {formatRupiah(p.estimasiAnggaran)}
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md group-hover:bg-emerald-100 group-hover:translate-x-0.5 transition-all flex items-center gap-0.5 shrink-0">
                              <span>Buka</span>
                              <ChevronRight className="w-3 h-3" />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[10.5px] text-slate-400 py-1 px-0.5">
                      Belum ada tanggal/bulan yang dijadwalkan untuk seksi ini di periode ini.
                    </p>
                  )}

                  {/* Info Ringkas jika Seksi memiliki program tentatif */}
                  {seksiTentative.length > 0 && (
                    <div className="p-2 rounded-lg bg-amber-50/80 border border-amber-200 flex items-center justify-between gap-2 text-[10px] text-amber-950">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span className="w-5 h-5 rounded-md bg-white text-amber-700 font-bold flex items-center justify-center shrink-0 border border-amber-200 shadow-2xs">
                          📌
                        </span>
                        <div className="min-w-0 flex-1">
                          <span className="font-bold truncate block">
                            {seksiTentative.length} Program Tentatif
                          </span>
                          <span className="text-[9px] text-amber-800 truncate block">
                            {seksiTentative.map((t) => t.namaProgram).join(', ')}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenProgramDetail(seksiTentative[0].id)}
                        className="px-2 py-0.5 bg-white hover:bg-amber-100/50 rounded-md border border-amber-200 text-amber-800 font-bold text-[9.5px] shrink-0 transition-colors shadow-2xs"
                      >
                        Buka →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. DAFTAR PROGRAM UTAMA SESUAI PERIODE / BULAN YANG DIPILIH */}
      {selectedMonth !== 'tentatif' && (
        <div className="w-full bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3 sm:p-4 space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 w-full">
            <div className="min-w-0 flex-1 pr-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                  Program Terjadwal {selectedMonthObj ? `Bulan ${selectedMonthObj.nama}` : 'Semua Periode'} ({scheduledProgramsInMonth.length})
                </h3>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Daftar program kerja yang memiliki jadwal pelaksanaan pasti pada periode ini
              </p>
            </div>
            <span className="text-xs sm:text-sm font-extrabold text-emerald-800 tabular-nums shrink-0">
              Total {formatCompactRupiah(totalAnggaranBulan)}
            </span>
          </div>

          {scheduledProgramsInMonth.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500 space-y-1">
              <p className="font-semibold text-slate-700">
                Tidak ada program kerja terjadwal di bulan {selectedMonthObj ? selectedMonthObj.nama : 'ini'}.
              </p>
              <p className="text-[10.5px] text-slate-400">
                {tentativePrograms.length > 0
                  ? `Terdapat ${tentativePrograms.length} program kerja yang bersifat tentatif di bawah ini yang belum ditentukan tanggal pelaksanaannya.`
                  : 'Pilih bulan lain pada filter di atas atau tambah program baru.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 w-full">
              {scheduledProgramsInMonth.map((p, idx) => {
                const targetDate =
                  typeof selectedMonth === 'number'
                    ? p.jadwalBulanan?.[selectedMonth] || p.tanggalSpesifik
                    : p.tanggalSpesifik;
                const formattedDate = targetDate ? formatIndonesianDate(targetDate) : 'Sesuai Jadwal';

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onOpenProgramDetail(p.id)}
                    className="w-full text-left py-2.5 px-2 sm:px-3 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 group cursor-pointer border border-transparent hover:border-slate-200"
                  >
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px] flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-emerald-600 group-hover:text-white transition-colors shadow-2xs">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[9.5px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            {p.penanggungjawab?.divisi || 'Seksi Umum'}
                          </span>
                          <span className="text-[9.5px] text-slate-400 font-semibold">
                            Thn {p.tahun}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${getStatusInfo(p.status).color}`}>
                            {getStatusInfo(p.status).label}
                          </span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-emerald-900 transition-colors mt-0.5 break-words">
                          {p.namaProgram}
                        </h4>
                        <div className="flex items-center gap-2 sm:gap-4 text-[9.5px] sm:text-[10px] text-slate-500 mt-1 flex-wrap">
                          <span>👤 {p.penanggungjawab?.nama || 'Koordinator Seksi'}</span>
                          <span>•</span>
                          <span>🗓 {formattedDate}</span>
                          <span>•</span>
                          <span className="font-extrabold text-emerald-800 tabular-nums">
                            {formatRupiah(p.estimasiAnggaran)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 self-center">
                      <span className="text-[10px] sm:text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-lg group-hover:bg-emerald-100 transition-colors flex items-center gap-0.5 shadow-2xs">
                        <span>Detail</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. DAFTAR PROGRAM YANG BELUM DITENTUKAN PELAKSANAANNYA (TENTATIF) */}
      <div className="w-full bg-amber-50/80 rounded-2xl border border-amber-300/90 shadow-2xs p-3 sm:p-4 space-y-3 transition-all">
        <div className="flex items-center justify-between pb-2 border-b border-amber-200/80 w-full">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs font-bold text-xs">
              📌
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-amber-950 truncate">
                  Program Yang Belum Ditentukan Pelaksanaannya ({tentativePrograms.length} Tentatif)
                </h3>
                <span className="text-[9px] font-bold text-amber-800 bg-white px-2 py-0.5 rounded-full border border-amber-300 shrink-0">
                  Waktu Menunggu Pelaksanaan
                </span>
              </div>
              <p className="text-[10px] sm:text-[10.5px] text-amber-900 mt-0.5">
                Program kerja yang disetujui namun tanggal dan bulannya belum ada (akan ditentukan saat pelaksanaan)
              </p>
            </div>
          </div>
          <span className="text-xs sm:text-sm font-extrabold text-amber-950 tabular-nums shrink-0 ml-2">
            Total {formatCompactRupiah(totalAnggaranTentatif)}
          </span>
        </div>

        {tentativePrograms.length === 0 ? (
          <div className="p-4 bg-white/70 rounded-xl text-center text-xs text-amber-900">
            <p className="font-semibold">Semua program kerja pada periode ini telah memiliki jadwal pelaksanaan.</p>
            <p className="text-[10.5px] text-amber-700/80 mt-0.5">
              Jika ada program yang belum ditentukan bulannya, pilih opsi "Tentatif" saat penginputan.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-amber-200/80 bg-white/90 rounded-xl border border-amber-200 overflow-hidden w-full">
            {tentativePrograms.map((p, idx) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onOpenProgramDetail(p.id)}
                className="w-full text-left p-3 hover:bg-amber-50/70 transition-colors flex items-center justify-between gap-3 group cursor-pointer"
              >
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-900 font-extrabold text-[10px] flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-amber-500 group-hover:text-white transition-colors shadow-2xs">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9.5px] font-bold text-slate-800 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                        {p.penanggungjawab?.divisi || 'Seksi Umum'}
                      </span>
                      <span className="text-[9.5px] text-slate-500 font-semibold">
                        Tahun {p.tahun}
                      </span>
                      <span className="text-[9px] font-bold text-amber-800 bg-amber-100/80 px-1.5 py-0.2 rounded border border-amber-300">
                        📌 Tentatif
                      </span>
                    </div>

                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-amber-950 transition-colors mt-1 break-words">
                      {p.namaProgram}
                    </h4>

                    {p.tujuanKegiatan && (
                      <p className="text-[10px] text-slate-600 line-clamp-1 mt-0.5">
                        {p.tujuanKegiatan}
                      </p>
                    )}

                    <div className="flex items-center gap-2 sm:gap-4 text-[9.5px] sm:text-[10px] text-amber-900 mt-1 flex-wrap font-medium">
                      <span>👤 PIC: {p.penanggungjawab?.nama || 'Koordinator Seksi'}</span>
                      <span>•</span>
                      <span className="font-bold text-amber-800 bg-amber-50 px-1 rounded">
                        🗓 {p.tanggalSpesifik || 'Waktu akan ditentukan saat pelaksanaan'}
                      </span>
                      <span>•</span>
                      <span className="font-extrabold text-emerald-800 tabular-nums">
                        {formatRupiah(p.estimasiAnggaran)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 self-center">
                  <span className="text-[10px] sm:text-[10.5px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-1.5 rounded-lg group-hover:bg-amber-500 group-hover:text-white transition-colors flex items-center gap-0.5 shadow-2xs">
                    <span>Atur Jadwal / Buka</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
