import React, { useState, useMemo } from 'react';
import {
  Building2,
  Bell,
  Calendar,
  Repeat,
  ChevronDown,
  Users,
} from 'lucide-react';
import { MASTER_DIVISIONS } from '../../database/master-data/divisions';
import { AuthSession } from '../types/auth';
import { ProgramKerja } from '../types/proker';
import {
  BULAN_LIST,
  isPelayananRutin,
  isDivisionMatch,
  normalizeDivisionName,
  getEvaluasiForMonth,
} from '../utils/formatters';

interface DashboardAuthGateProps {
  onAuthenticated?: (session: AuthSession) => void;
  initialSelectedUnit?: string;
  programs?: ProgramKerja[];
  selectedYear?: 'all' | 2026 | 2027;
  onOpenPengurusTab?: () => void;
}

export const DashboardAuthGate: React.FC<DashboardAuthGateProps> = ({
  programs = [],
  selectedYear = 'all',
  onOpenPengurusTab,
}) => {
  // Bulan berjalan default (1 - 12) berdasarkan kalender saat ini
  const currentCalendarMonth = new Date().getMonth() + 1;
  const [activeReminderMonth, setActiveReminderMonth] = useState<number>(currentCalendarMonth);

  // 1. Program dalam tahun terpilih (jika ada filter tahun)
  const progsInYear = useMemo(() => {
    return programs.filter((p) => {
      if (selectedYear !== 'all' && p.tahun !== selectedYear) return false;
      return true;
    });
  }, [programs, selectedYear]);

  // 2. Program Kerja Terjadwal di Bulan Berjalan (Non-Rutin)
  // "reminder terkait program yang akan di dilaksanakan dibulan berjalan dari setiap seksi dan ditampilkan hanya nama program nya saja"
  const scheduledInActiveMonth = useMemo(() => {
    return progsInYear.filter((p) => {
      if (isPelayananRutin(p)) return false;
      return Array.isArray(p.bulanPelaksanaan) && p.bulanPelaksanaan.includes(activeReminderMonth);
    });
  }, [progsInYear, activeReminderMonth]);

  // Kelompokkan program terjadwal per seksi
  const groupedScheduledBySeksi = useMemo(() => {
    const map = new Map<string, { divisionName: string; divisionCode?: string; programs: ProgramKerja[] }>();

    // Urutkan berdasarkan MASTER_DIVISIONS
    MASTER_DIVISIONS.forEach((div) => {
      const matchProgs = scheduledInActiveMonth.filter((p) =>
        isDivisionMatch(p.penanggungjawab?.divisi, div.nama)
      );
      if (matchProgs.length > 0) {
        map.set(div.id, {
          divisionName: div.nama,
          divisionCode: div.code,
          programs: matchProgs,
        });
      }
    });

    // Cek jika ada program dengan divisi yang belum terpetakan di MASTER_DIVISIONS
    scheduledInActiveMonth.forEach((p) => {
      const divName = p.penanggungjawab?.divisi || 'Paroki';
      const isAlreadyGrouped = Array.from(map.values()).some((g) =>
        isDivisionMatch(g.divisionName, divName)
      );
      if (!isAlreadyGrouped) {
        const key = normalizeDivisionName(divName);
        if (!map.has(key)) {
          map.set(key, {
            divisionName: divName,
            programs: [p],
          });
        } else {
          map.get(key)!.programs.push(p);
        }
      }
    });

    return Array.from(map.values());
  }, [scheduledInActiveMonth]);

  // 3. Pelayanan Rutin Paroki
  // "jika pelaksanaan rutin juga di tampilkan tapi di buat dalam 1 kotak dgn info pelayanan rutin dan sebutkan nama seksinya"
  // "Utk pelayanan rutin dapat di kelompokan juga berdasarkan seksi dan tidak perlu juga di buat tanggal pelaksanaan. hanya cantumkan program"
  const routinePrograms = useMemo(() => {
    return progsInYear.filter((p) => isPelayananRutin(p));
  }, [progsInYear]);

  // Kelompokkan pelayanan rutin per seksi
  const groupedRoutineBySeksi = useMemo(() => {
    const map = new Map<string, { divisionName: string; divisionCode?: string; programs: ProgramKerja[] }>();

    // Urutkan berdasarkan MASTER_DIVISIONS
    MASTER_DIVISIONS.forEach((div) => {
      const matchProgs = routinePrograms.filter((p) =>
        isDivisionMatch(p.penanggungjawab?.divisi, div.nama)
      );
      if (matchProgs.length > 0) {
        map.set(div.id, {
          divisionName: div.nama,
          divisionCode: div.code,
          programs: matchProgs,
        });
      }
    });

    // Cek jika ada program rutin dengan divisi yang belum terpetakan di MASTER_DIVISIONS
    routinePrograms.forEach((p) => {
      const divName = p.penanggungjawab?.divisi || 'Paroki';
      const isAlreadyGrouped = Array.from(map.values()).some((g) =>
        isDivisionMatch(g.divisionName, divName)
      );
      if (!isAlreadyGrouped) {
        const key = normalizeDivisionName(divName);
        if (!map.has(key)) {
          map.set(key, {
            divisionName: divName,
            programs: [p],
          });
        } else {
          map.get(key)!.programs.push(p);
        }
      }
    });

    return Array.from(map.values());
  }, [routinePrograms]);

  const currentMonthData = BULAN_LIST.find((b) => b.no === activeReminderMonth);
  const currentMonthName = currentMonthData ? currentMonthData.nama : `Bulan ${activeReminderMonth}`;

  // Tahun yang ditampilkan: jika 'all' default ke 2026
  const activeYearDisplay = selectedYear !== 'all' ? selectedYear : 2026;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-3 px-1 sm:px-2 pb-10 animate-in fade-in duration-200">
      {/* =========================================================================
          BAGIAN 1: REMINDER PROGRAM KERJA BULAN BERJALAN
          "Layar ini diperkecil saja jadi hny Reminder Program Kerja bulan berjalan Oktober 2026 
           utk penjelasannya tidak perlu pilihan program bulan lain dapat di pilih dengan dragdown"
          ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Header Diperkecil & Ringkas: Tanpa teks penjelasan, pilihan bulan lain via dragdown */}
        <div className="px-3.5 py-2.5 bg-gradient-to-r from-emerald-900 via-slate-900 to-emerald-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          {/* Judul & Bulan Berjalan Oktober 2026 */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 flex items-center justify-center font-bold shrink-0">
              <Bell className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="text-xs sm:text-sm font-extrabold text-white tracking-tight">
                Reminder Program Kerja
              </span>
              <span className="text-[11px] font-bold text-slate-300">
                bulan berjalan <span className="text-emerald-300 font-extrabold underline underline-offset-2">{currentMonthName} {activeYearDisplay}</span>
              </span>
            </div>
          </div>

          {/* Actions: Pengurus Button & Dragdown Pilihan Bulan Lain */}
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
            {onOpenPengurusTab && (
              <button
                type="button"
                onClick={onOpenPengurusTab}
                className="h-7 px-2.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-[10.5px] font-bold text-emerald-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Lihat susunan pengurus paroki, pastor, DPPH, koordinator seksi dan anggotanya"
              >
                <Users className="w-3.5 h-3.5 text-emerald-300" />
                <span>Susunan Pengurus</span>
              </button>
            )}

            <div className="flex items-center gap-1.5">
              <label htmlFor="reminder-month-select" className="text-[11px] text-slate-300 font-medium">
                Bulan Lain:
              </label>
              <div className="relative">
                <select
                  id="reminder-month-select"
                  value={activeReminderMonth}
                  onChange={(e) => setActiveReminderMonth(Number(e.target.value))}
                  className="h-7 pl-2.5 pr-7 bg-white/10 hover:bg-white/20 border border-emerald-500/40 rounded-lg text-xs font-bold text-white appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-400 transition-all"
                >
                  {BULAN_LIST.map((b) => (
                    <option key={b.no} value={b.no} className="text-slate-900 bg-white font-medium">
                      {b.nama} {b.no === currentCalendarMonth ? ' (Bulan Ini)' : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-emerald-300 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Konten Reminder per Seksi: HANYA MENAMPILKAN NAMA PROGRAM SAJA */}
        <div className="p-3.5 sm:p-5">
          {groupedScheduledBySeksi.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {groupedScheduledBySeksi.map((group, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50/80 rounded-xl border border-slate-200/90 p-3.5 hover:border-emerald-300 transition-all shadow-2xs flex flex-col justify-between"
                >
                  <div>
                    {/* Header Seksi */}
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-emerald-600/10 text-emerald-800 flex items-center justify-center shrink-0">
                          <Building2 className="w-3.5 h-3.5" />
                        </div>
                        <h4 className="text-xs font-extrabold text-slate-900 truncate">
                          {group.divisionName}
                        </h4>
                      </div>
                      <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9.5px] font-extrabold shrink-0">
                        {group.programs.length} Program
                      </span>
                    </div>

                    {/* DAFTAR NAMA PROGRAM (DILENGKAPI STATUS JIKA SUDAH DIEVALUASI) */}
                    <ul className="space-y-1.5 pt-0.5">
                      {group.programs.map((p) => {
                        const evBulanIni = getEvaluasiForMonth(p, activeReminderMonth);
                        const isEvaluatedTerlaksana = evBulanIni?.statusKeterlaksanaan === 'terlaksana';
                        const isEvaluatedPerubahan = evBulanIni?.statusKeterlaksanaan === 'perubahan_waktu';
                        const isEvaluatedBatal = evBulanIni?.statusKeterlaksanaan === 'tidak_terlaksana';

                        return (
                          <li
                            key={p.id}
                            className="flex flex-col gap-1 text-xs font-semibold text-slate-800 leading-snug p-1.5 rounded-lg bg-white/70 border border-slate-200/60"
                          >
                            <div className="flex items-start gap-2">
                              <span
                                className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                                  isEvaluatedTerlaksana ? 'bg-emerald-600' : 'bg-slate-400'
                                }`}
                              />
                              <span className="break-words font-bold text-slate-900">{p.namaProgram}</span>
                            </div>

                            {/* Status jika sudah dievaluasi */}
                            {isEvaluatedTerlaksana && (
                              <div className="ml-3.5 flex items-center gap-1">
                                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 inline-flex items-center gap-1 shadow-2xs">
                                  <span>✓</span>
                                  <span>Terlaksana dan Sudah Dievaluasi (Bln {activeReminderMonth})</span>
                                </span>
                              </div>
                            )}

                            {isEvaluatedPerubahan && (
                              <div className="ml-3.5 flex items-center gap-1">
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1 shadow-2xs">
                                  <span>🕒</span>
                                  <span>Geser Waktu (Sudah Dievaluasi)</span>
                                </span>
                              </div>
                            )}

                            {isEvaluatedBatal && (
                              <div className="ml-3.5 flex items-center gap-1">
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-900 border border-rose-300 inline-flex items-center gap-1 shadow-2xs">
                                  <span>✕</span>
                                  <span>Tidak Terlaksana (Sudah Dievaluasi)</span>
                                </span>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 px-4 text-center rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs font-bold text-slate-700">
                Tidak ada program kerja khusus non-rutin yang terjadwal di bulan {currentMonthName}.
              </p>
              <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                Setiap seksi tetap berfokus pada agenda pelayanan rutin paroki yang berjalan berkala sepanjang tahun di bawah ini.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          BAGIAN 2: SATU KOTAK DENGAN INFO PELAYANAN RUTIN & SEBUTKAN NAMA SEKSINYA
          "jika pelaksanaan rutin juga di tampilkan tapi di buat dalam 1 kotak dgn info pelayanan rutin dan sebutkan nama seksinya"
          ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-5 space-y-3.5">
        {/* Header Kotak Pelayanan Rutin */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-300/40 text-amber-700 flex items-center justify-center font-bold shrink-0">
              <Repeat className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9.5px] font-bold uppercase tracking-wider text-amber-800 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200">
                  Agenda Tetap Sepanjang Tahun
                </span>
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">
                  Info Pelayanan Rutin
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Daftar kegiatan pelayanan rutin yang dikelompokkan berdasarkan seksi.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-bold text-[10px]">
              {routinePrograms.length} Pelayanan Rutin • {groupedRoutineBySeksi.length} Seksi
            </span>
          </div>
        </div>

        {/* Isi Kotak Pelayanan Rutin: Dikelompokkan berdasarkan Seksi & Hanya Cantumkan Program */}
        {groupedRoutineBySeksi.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
            {groupedRoutineBySeksi.map((group) => (
              <div
                key={group.divisionName}
                className="p-3.5 rounded-xl bg-amber-50/30 border border-amber-200/80 hover:border-amber-300 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Nama Seksi */}
                  <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-amber-200/60">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-5 h-5 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center text-[10px] font-black shrink-0">
                        {group.divisionCode || group.divisionName.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-xs font-bold text-amber-950 truncate">
                        {group.divisionName}
                      </span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9.5px] font-extrabold shrink-0">
                      {group.programs.length}
                    </span>
                  </div>

                  {/* DAFTAR PELAYANAN RUTIN (DILENGKAPI STATUS JIKA SUDAH DIEVALUASI) */}
                  <ul className="space-y-1.5 pt-0.5">
                    {group.programs.map((p) => {
                      const evBulanIni = getEvaluasiForMonth(p, activeReminderMonth);
                      const isEvaluatedTerlaksana = evBulanIni?.statusKeterlaksanaan === 'terlaksana';
                      const isEvaluatedPerubahan = evBulanIni?.statusKeterlaksanaan === 'perubahan_waktu';
                      const isEvaluatedBatal = evBulanIni?.statusKeterlaksanaan === 'tidak_terlaksana';

                      return (
                        <li
                          key={p.id}
                          className="flex flex-col gap-1 text-xs font-semibold text-slate-800 leading-snug p-1.5 rounded-lg bg-white/70 border border-amber-200/60"
                        >
                          <div className="flex items-start gap-2">
                            <span
                              className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                                isEvaluatedTerlaksana ? 'bg-emerald-600' : 'bg-amber-500'
                              }`}
                            />
                            <span className="break-words font-bold text-slate-900">{p.namaProgram}</span>
                          </div>

                          {/* Status jika sudah dievaluasi */}
                          {isEvaluatedTerlaksana && (
                            <div className="ml-3.5 flex items-center gap-1">
                              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 inline-flex items-center gap-1 shadow-2xs">
                                <span>✓</span>
                                <span>Terlaksana Bulan {BULAN_LIST[activeReminderMonth - 1]?.singkatan}</span>
                              </span>
                            </div>
                          )}

                          {isEvaluatedPerubahan && (
                            <div className="ml-3.5 flex items-center gap-1">
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1 shadow-2xs">
                                <span>🕒</span>
                                <span>Geser Waktu (Sudah Dievaluasi)</span>
                              </span>
                            </div>
                          )}

                          {isEvaluatedBatal && (
                            <div className="ml-3.5 flex items-center gap-1">
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-900 border border-rose-300 inline-flex items-center gap-1 shadow-2xs">
                                <span>✕</span>
                                <span>Tidak Terlaksana (Sudah Dievaluasi)</span>
                              </span>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 px-4 text-center rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-xs text-slate-600">
              Belum ada data pelayanan rutin yang terdaftar.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
