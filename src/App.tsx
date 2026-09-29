/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Copy,
  Save,
  CheckCircle2,
  DollarSign,
  User,
  Phone,
  Target,
  FileText,
  Clock,
  Filter,
  FileSpreadsheet,
  Download,
  Smartphone,
  Monitor,
  Check,
  RotateCcw,
} from 'lucide-react';
import { ProgramKerja, ScheduleType, ProgramStatus } from './types/proker';
import { INITIAL_PROGRAM_KERJA } from './data/initialData';
import {
  BULAN_LIST,
  DAFTAR_DIVISI,
  formatRupiah,
  parseRupiahInput,
  getTipeJadwalLabel,
  getStatusInfo,
  exportToCSV,
} from './utils/formatters';

const STORAGE_KEY = 'proker_mobile_data_v2';

export default function App() {
  // 1. Data Store
  const [programs, setPrograms] = useState<ProgramKerja[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading saved proker:', e);
    }
    return INITIAL_PROGRAM_KERJA;
  });

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(programs));
    } catch (e) {
      console.error('Error saving proker:', e);
    }
  }, [programs]);

  // 2. Filters (Tahun & Bulan Kegiatan)
  const [selectedYear, setSelectedYear] = useState<'all' | 2025 | 2026>('all');
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all'); // Filter berdasarkan bulan kegiatan
  const [isMobileDeviceFrame, setIsMobileDeviceFrame] = useState<boolean>(false);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // 3. Filtered programs list based on Tahun & Bulan
  const filteredPrograms = useMemo(() => {
    return programs.filter((p) => {
      // Filter Tahun
      if (selectedYear !== 'all' && p.tahun !== selectedYear) return false;
      // Filter Bulan Kegiatan
      if (selectedMonth !== 'all' && !p.bulanPelaksanaan?.includes(selectedMonth)) {
        return false;
      }
      return true;
    });
  }, [programs, selectedYear, selectedMonth]);

  // 4. Currently Selected Program ID for 1-Screen View & Editing
  const [currentId, setCurrentId] = useState<string>(() => {
    return INITIAL_PROGRAM_KERJA[0]?.id || '';
  });

  // Auto-adjust currentId if current selection is not in filtered list
  useEffect(() => {
    if (filteredPrograms.length > 0) {
      const exists = filteredPrograms.some((p) => p.id === currentId);
      if (!exists) {
        setCurrentId(filteredPrograms[0].id);
      }
    }
  }, [filteredPrograms, currentId]);

  // Current Program Object
  const currentProgram = useMemo(() => {
    return programs.find((p) => p.id === currentId) || null;
  }, [programs, currentId]);

  // Index in currently filtered list
  const currentIndex = useMemo(() => {
    return filteredPrograms.findIndex((p) => p.id === currentId);
  }, [filteredPrograms, currentId]);

  // Form State for Active Program
  const [formData, setFormData] = useState<Partial<ProgramKerja>>({});
  const [rawAnggaran, setRawAnggaran] = useState<string>('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // Sync form state when currentProgram changes
  useEffect(() => {
    if (currentProgram) {
      setFormData({ ...currentProgram });
      setRawAnggaran(
        currentProgram.estimasiAnggaran
          ? currentProgram.estimasiAnggaran.toLocaleString('id-ID')
          : ''
      );
      setFormErrors({});
      setHasUnsavedChanges(false);
    } else {
      setFormData({});
      setRawAnggaran('');
    }
  }, [currentId, currentProgram]);

  // Navigation handlers (Data Berikutnya / Sebelumnya)
  const handleNext = () => {
    if (currentIndex < filteredPrograms.length - 1) {
      setCurrentId(filteredPrograms[currentIndex + 1].id);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentId(filteredPrograms[currentIndex - 1].id);
    }
  };

  // Budget input change
  const handleAnggaranChange = (val: string) => {
    const num = parseRupiahInput(val);
    setRawAnggaran(num > 0 ? num.toLocaleString('id-ID') : '');
    setFormData((prev) => ({ ...prev, estimasiAnggaran: num }));
    setHasUnsavedChanges(true);
  };

  const handleQuickBudgetPreset = (val: number) => {
    setRawAnggaran(val.toLocaleString('id-ID'));
    setFormData((prev) => ({ ...prev, estimasiAnggaran: val }));
    setHasUnsavedChanges(true);
  };

  // Schedule Type Change
  const handleTipeJadwalChange = (tipe: ScheduleType) => {
    setFormData((prev) => {
      let bulan = prev.bulanPelaksanaan || [];
      if (tipe === 'sepanjang_tahun') {
        bulan = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
      } else if (tipe === 'satu_kali') {
        bulan = bulan.length > 0 ? [bulan[0]] : [1];
      } else {
        if (bulan.length === 12 || bulan.length === 0) {
          bulan = [3, 6, 9];
        }
      }
      return {
        ...prev,
        tipeJadwal: tipe,
        bulanPelaksanaan: bulan,
      };
    });
    setHasUnsavedChanges(true);
  };

  // Month toggle for multi_bulan or satu_kali
  const handleToggleMonth = (m: number) => {
    setFormData((prev) => {
      if (prev.tipeJadwal === 'satu_kali') {
        return { ...prev, bulanPelaksanaan: [m] };
      }
      const existing = prev.bulanPelaksanaan || [];
      let updated: number[];
      if (existing.includes(m)) {
        if (existing.length <= 1) return prev; // Keep at least one
        updated = existing.filter((b) => b !== m);
      } else {
        updated = [...existing, m].sort((a, b) => a - b);
      }
      return { ...prev, bulanPelaksanaan: updated };
    });
    setHasUnsavedChanges(true);
  };

  // Save changes
  const handleSave = () => {
    const errors: Record<string, string> = {};
    if (!formData.namaProgram?.trim()) errors.namaProgram = 'Nama program wajib diisi';
    if (!formData.tujuanKegiatan?.trim()) errors.tujuanKegiatan = 'Tujuan kegiatan wajib diisi';
    if (!formData.targetSasaran?.trim()) errors.targetSasaran = 'Target sasaran wajib diisi';
    if (!formData.penanggungjawab?.nama?.trim()) errors.pjNama = 'Nama PJ wajib diisi';
    if (!formData.bulanPelaksanaan || formData.bulanPelaksanaan.length === 0) {
      errors.bulanPelaksanaan = 'Pilih minimal 1 bulan pelaksanaan';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showToast('Mohon lengkapi kolom yang wajib diisi!');
      return;
    }

    const now = new Date().toISOString();
    setPrograms((prev) =>
      prev.map((p) =>
        p.id === currentId
          ? {
              ...p,
              ...(formData as ProgramKerja),
              updatedAt: now,
            }
          : p
      )
    );
    setHasUnsavedChanges(false);
    showToast('Data program kerja berhasil disimpan!');
  };

  // Create new program in place
  const handleAddNew = () => {
    const targetTahun = selectedYear === 'all' ? 2025 : selectedYear;
    const initialBulan = selectedMonth === 'all' ? [1, 2, 3] : [selectedMonth];
    const newId = `proker-${Date.now()}`;
    const newProg: ProgramKerja = {
      id: newId,
      tahun: targetTahun,
      namaProgram: 'Program Kerja Baru',
      tujuanKegiatan: '',
      targetSasaran: '',
      estimasiAnggaran: 10000000,
      tipeJadwal: selectedMonth === 'all' ? 'multi_bulan' : 'satu_kali',
      bulanPelaksanaan: initialBulan,
      penanggungjawab: {
        nama: '',
        divisi: DAFTAR_DIVISI[0],
        kontak: '',
      },
      status: 'direncanakan',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setPrograms((prev) => [newProg, ...prev]);
    setCurrentId(newId);
    showToast('Program baru dibuat. Silakan lengkapi datanya!');
  };

  // Duplicate current program
  const handleDuplicate = () => {
    if (!currentProgram) return;
    const newId = `proker-${Date.now()}`;
    const duplicated: ProgramKerja = {
      ...currentProgram,
      id: newId,
      namaProgram: `${currentProgram.namaProgram} (Salinan)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setPrograms((prev) => [duplicated, ...prev]);
    setCurrentId(newId);
    showToast('Program berhasil disalin!');
  };

  // Delete current program
  const handleDelete = () => {
    if (!currentProgram) return;
    if (programs.length <= 1) {
      alert('Minimal harus ada 1 program kerja dalam sistem.');
      return;
    }
    if (window.confirm(`Yakin ingin menghapus program: "${currentProgram.namaProgram}"?`)) {
      const remaining = programs.filter((p) => p.id !== currentId);
      setPrograms(remaining);
      const nextActive = remaining[0]?.id || '';
      setCurrentId(nextActive);
      showToast('Program kerja berhasil dihapus.');
    }
  };

  // Month counts calculation for month filter tabs
  const monthCounts = useMemo(() => {
    const yearFiltered = programs.filter((p) =>
      selectedYear === 'all' ? true : p.tahun === selectedYear
    );
    return BULAN_LIST.map((m) => {
      const count = yearFiltered.filter((p) => p.bulanPelaksanaan?.includes(m.no)).length;
      return { ...m, count };
    });
  }, [programs, selectedYear]);

  // Overall budget summary
  const totalAnggaran = useMemo(() => {
    return filteredPrograms.reduce((sum, p) => sum + (p.estimasiAnggaran || 0), 0);
  }, [filteredPrograms]);

  return (
    <div
      className={`min-h-screen bg-slate-100 flex flex-col items-center ${
        isMobileDeviceFrame ? 'py-5 px-3' : ''
      }`}
    >
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Single-Screen Container */}
      <div
        className={`w-full bg-slate-50 min-h-screen flex flex-col relative transition-all ${
          isMobileDeviceFrame
            ? 'max-w-[430px] rounded-[36px] shadow-2xl border-4 border-slate-300 overflow-hidden min-h-[850px]'
            : 'max-w-xl md:max-w-2xl mx-auto shadow-sm'
        }`}
      >
        {/* Device Status Bar Simulation */}
        {isMobileDeviceFrame && (
          <div className="bg-white px-6 pt-3 pb-1 flex items-center justify-between text-[11px] font-bold text-slate-800 shrink-0 select-none">
            <span>09:41</span>
            <div className="w-20 h-4 bg-slate-900 rounded-full mx-auto" />
            <div className="flex items-center gap-1.5 text-xs">
              <span>5G</span>
              <span>100%</span>
            </div>
          </div>
        )}

        {/* 1. HEADER (1 Layar) */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 pt-3 pb-2.5 space-y-2.5">
          {/* Top Brand & Actions */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                <Calendar className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-slate-900 leading-tight truncate">
                  Proker 1 Layar
                </h1>
                <p className="text-[10px] text-slate-500 font-medium">
                  Rencana Kerja 2025 & 2026
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Export CSV Button */}
              <button
                type="button"
                onClick={() => exportToCSV(programs)}
                className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-semibold text-slate-700 flex items-center gap-1 transition-colors"
                title="Unduh Data ke CSV / Excel"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Excel</span>
              </button>

              {/* Toggle HP Frame mode on desktop */}
              <button
                type="button"
                onClick={() => setIsMobileDeviceFrame(!isMobileDeviceFrame)}
                className="hidden md:flex h-8 px-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 items-center justify-center"
                title="Ubah Tampilan Mode HP / Lebar"
              >
                {isMobileDeviceFrame ? (
                  <Monitor className="w-3.5 h-3.5" />
                ) : (
                  <Smartphone className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Tambah Baru Button */}
              <button
                type="button"
                onClick={handleAddNew}
                className="h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>+ Baru</span>
              </button>
            </div>
          </div>

          {/* Tahun Selector Segment (2025 | 2026 | Semua Tahun) */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 shrink-0">Tahun:</span>
            <div className="flex-1 p-0.5 bg-slate-100 rounded-lg flex items-center gap-0.5">
              {[
                { id: 'all', label: 'Semua' },
                { id: 2025, label: '2025' },
                { id: 2026, label: '2026' },
              ].map((yr) => (
                <button
                  key={yr.id}
                  type="button"
                  onClick={() => setSelectedYear(yr.id as 'all' | 2025 | 2026)}
                  className={`flex-1 py-1 text-xs font-bold rounded-md transition-all ${
                    selectedYear === yr.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {yr.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. FILTER BERDASARKAN BULAN KEGIATAN (Horizontal Touch Bar) */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
              <span className="flex items-center gap-1">
                <Filter className="w-3 h-3 text-emerald-600" />
                <span>Filter Bulan Kegiatan:</span>
              </span>
              {selectedMonth !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedMonth('all')}
                  className="text-emerald-700 hover:underline font-semibold"
                >
                  Reset ke Semua Bulan
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {/* Option: Semua Bulan */}
              <button
                type="button"
                onClick={() => setSelectedMonth('all')}
                className={`whitespace-nowrap px-2.5 py-1 rounded-lg text-xs font-bold border transition-all shrink-0 ${
                  selectedMonth === 'all'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Semua Bulan
              </button>

              {/* 12 Months Tabs with Live Proker Counts */}
              {monthCounts.map((m) => {
                const isSelected = selectedMonth === m.no;
                return (
                  <button
                    key={m.no}
                    type="button"
                    onClick={() => setSelectedMonth(m.no)}
                    className={`whitespace-nowrap px-2 py-1 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 shrink-0 ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>{m.singkatan}</span>
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded-full tabular-nums ${
                        isSelected
                          ? 'bg-emerald-700 text-white'
                          : m.count > 0
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {m.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. DROPDOWN (DRAGDOWN) PEMILIHAN PROGRAM & PREV/NEXT NAVIGATION */}
          <div className="bg-slate-100/80 p-2 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1">
              <span>Pilih Program Kerja:</span>
              <span className="tabular-nums">
                {filteredPrograms.length > 0
                  ? `Data ${currentIndex + 1} dari ${filteredPrograms.length}`
                  : '0 data'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Tombol Sebelumnya */}
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentIndex <= 0}
                className="w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-700 flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-50 shrink-0 transition-colors"
                title="Pilih Data Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* The Dragdown / Dropdown Selector */}
              <div className="flex-1 relative min-w-0">
                <select
                  value={currentId}
                  onChange={(e) => setCurrentId(e.target.value)}
                  className="w-full h-9 bg-white border border-slate-300 rounded-lg px-2.5 pr-7 text-xs font-bold text-slate-900 truncate focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-500 cursor-pointer shadow-2xs"
                >
                  {filteredPrograms.length === 0 ? (
                    <option value="">(Tidak ada program yang cocok dengan filter)</option>
                  ) : (
                    filteredPrograms.map((p, idx) => (
                      <option key={p.id} value={p.id}>
                        {idx + 1}. [{p.tahun}] {p.namaProgram} - {formatRupiah(p.estimasiAnggaran)}
                      </option>
                    ))
                  )}
                </select>
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">
                  ▼
                </span>
              </div>

              {/* Tombol Berikutnya */}
              <button
                type="button"
                onClick={handleNext}
                disabled={currentIndex >= filteredPrograms.length - 1}
                className="w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-700 flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-50 shrink-0 transition-colors"
                title="Pilih Data Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* 4. MAIN BODY FORM & DATA VIEW (Semua di 1 Layar) */}
        <main className="flex-1 px-4 py-3 pb-24 overflow-y-auto space-y-4">
          {filteredPrograms.length === 0 ? (
            /* Empty State if filter yields no items */
            <div className="bg-white rounded-2xl p-8 border border-dashed border-slate-300 text-center space-y-3 mt-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                Tidak ada program kerja pada filter ini
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {selectedMonth !== 'all'
                  ? `Tidak ada program yang berlangsung di bulan ${
                      BULAN_LIST[(selectedMonth as number) - 1]?.nama
                    }.`
                  : 'Tidak ada data program pada pilihan tahun ini.'}
              </p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedYear('all');
                    setSelectedMonth('all');
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Reset Semua Filter
                </button>
                <button
                  type="button"
                  onClick={handleAddNew}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold shadow-xs hover:bg-slate-800"
                >
                  + Tambah Program di Bulan Ini
                </button>
              </div>
            </div>
          ) : currentProgram ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 space-y-4">
              {/* Form Bar: Tahun, Status, & Quick Actions */}
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
                {/* Tahun Toggle for current Program */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-500 font-semibold">Tahun:</span>
                  <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, tahun: 2025 }));
                        setHasUnsavedChanges(true);
                      }}
                      className={`px-2 py-0.5 text-xs font-bold rounded-md transition-colors ${
                        formData.tahun === 2025
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      2025
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, tahun: 2026 }));
                        setHasUnsavedChanges(true);
                      }}
                      className={`px-2 py-0.5 text-xs font-bold rounded-md transition-colors ${
                        formData.tahun === 2026
                          ? 'bg-purple-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      2026
                    </button>
                  </div>
                </div>

                {/* Status Dropdown */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-500 font-semibold">Status:</span>
                  <select
                    value={formData.status || 'direncanakan'}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        status: e.target.value as ProgramStatus,
                      }));
                      setHasUnsavedChanges(true);
                    }}
                    className={`text-xs font-bold px-2 py-1 rounded-lg border cursor-pointer focus:outline-none ${
                      getStatusInfo(formData.status || 'direncanakan').color
                    }`}
                  >
                    <option value="direncanakan">Direncanakan</option>
                    <option value="berjalan">Sedang Berjalan</option>
                    <option value="selesai">Selesai</option>
                    <option value="ditunda">Ditunda</option>
                  </select>
                </div>
              </div>

              {/* FIELD 1: NAMA PROGRAM */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  1. Nama Program Kerja <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.namaProgram || ''}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, namaProgram: e.target.value }));
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="Masukkan nama program kerja..."
                  className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 ${
                    formErrors.namaProgram ? 'border-rose-400' : 'border-slate-200 focus:border-slate-400'
                  }`}
                />
                {formErrors.namaProgram && (
                  <p className="mt-1 text-[11px] text-rose-500 font-medium">{formErrors.namaProgram}</p>
                )}
              </div>

              {/* FIELD 2: TUJUAN KEGIATAN */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  2. Tujuan Kegiatan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={formData.tujuanKegiatan || ''}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, tujuanKegiatan: e.target.value }));
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="Uraikan tujuan dan hasil yang ingin dicapai..."
                  className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 ${
                    formErrors.tujuanKegiatan ? 'border-rose-400' : 'border-slate-200 focus:border-slate-400'
                  }`}
                />
                {formErrors.tujuanKegiatan && (
                  <p className="mt-1 text-[11px] text-rose-500 font-medium">{formErrors.tujuanKegiatan}</p>
                )}
              </div>

              {/* FIELD 3: TARGET SASARAN */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  3. Target Sasaran / Output <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.targetSasaran || ''}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, targetSasaran: e.target.value }));
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="Contoh: 150 peserta, 10 cabang, zero insiden"
                  className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 ${
                    formErrors.targetSasaran ? 'border-rose-400' : 'border-slate-200 focus:border-slate-400'
                  }`}
                />
                {formErrors.targetSasaran && (
                  <p className="mt-1 text-[11px] text-rose-500 font-medium">{formErrors.targetSasaran}</p>
                )}
              </div>

              {/* FIELD 4: ESTIMASI ANGGARAN */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-800">
                    4. Estimasi Anggaran (Rupiah) <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-xs font-bold text-emerald-700 tabular-nums">
                    {formatRupiah(formData.estimasiAnggaran || 0)}
                  </span>
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    Rp
                  </span>
                  <input
                    type="text"
                    value={rawAnggaran}
                    onChange={(e) => handleAnggaranChange(e.target.value)}
                    placeholder="0"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-slate-900 tabular-nums focus:outline-none focus:border-slate-400"
                  />
                </div>

                {/* Quick Budget Chips */}
                <div className="mt-1.5 flex items-center gap-1 flex-wrap">
                  <span className="text-[10px] text-slate-400 font-semibold">Cepat:</span>
                  {[5000000, 10000000, 25000000, 50000000, 100000000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleQuickBudgetPreset(preset)}
                      className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                    >
                      {preset >= 1000000 ? `${preset / 1000000} Jt` : `${preset / 1000} Rb`}
                    </button>
                  ))}
                </div>
              </div>

              {/* FIELD 5: JADWAL PELAKSANAAN (3 Pilihan: Sepanjang Tahun, Multi Bulan Terjadwal, Satu Kali Pelaksanaan) */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  5. Jadwal Pelaksanaan <span className="text-rose-500">*</span>
                </label>

                {/* 3 Tipe Jadwal Buttons */}
                <div className="grid grid-cols-3 gap-1.5 mb-2.5">
                  {[
                    { id: 'sepanjang_tahun', label: 'Sepanjang Tahun' },
                    { id: 'multi_bulan', label: 'Multi Bulan' },
                    { id: 'satu_kali', label: 'Satu Kali' },
                  ].map((tj) => {
                    const isSelected = formData.tipeJadwal === tj.id;
                    return (
                      <button
                        key={tj.id}
                        type="button"
                        onClick={() => handleTipeJadwalChange(tj.id as ScheduleType)}
                        className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition-all ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {tj.label}
                      </button>
                    );
                  })}
                </div>

                {/* Sub-UI: Sepanjang Tahun */}
                {formData.tipeJadwal === 'sepanjang_tahun' && (
                  <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Kegiatan berlangsung kontinyu selama 12 bulan penuh (Jan – Des).</span>
                  </div>
                )}

                {/* Sub-UI: Multi Bulan Terjadwal */}
                {formData.tipeJadwal === 'multi_bulan' && (
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-700">
                        Pilih Bulan Terjadwal ({formData.bulanPelaksanaan?.length || 0} bulan terpilih):
                      </span>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              bulanPelaksanaan: [3, 6, 9, 12],
                            }));
                            setHasUnsavedChanges(true);
                          }}
                          className="text-emerald-700 font-bold hover:underline"
                        >
                          Triwulan
                        </button>
                        <span>·</span>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              bulanPelaksanaan: [1, 2, 3, 4, 5, 6],
                            }));
                            setHasUnsavedChanges(true);
                          }}
                          className="text-emerald-700 font-bold hover:underline"
                        >
                          Sem 1
                        </button>
                        <span>·</span>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              bulanPelaksanaan: [7, 8, 9, 10, 11, 12],
                            }));
                            setHasUnsavedChanges(true);
                          }}
                          className="text-emerald-700 font-bold hover:underline"
                        >
                          Sem 2
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-1">
                      {BULAN_LIST.map((m) => {
                        const isSelected = formData.bulanPelaksanaan?.includes(m.no);
                        return (
                          <button
                            key={m.no}
                            type="button"
                            onClick={() => handleToggleMonth(m.no)}
                            className={`py-1.5 text-xs font-bold rounded-lg border text-center transition-all ${
                              isSelected
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {m.singkatan}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Sub-UI: Satu Kali Pelaksanaan */}
                {formData.tipeJadwal === 'satu_kali' && (
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Bulan Pelaksanaan:
                        </label>
                        <select
                          value={formData.bulanPelaksanaan?.[0] || 1}
                          onChange={(e) => {
                            setFormData((prev) => ({
                              ...prev,
                              bulanPelaksanaan: [parseInt(e.target.value, 10)],
                            }));
                            setHasUnsavedChanges(true);
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
                        >
                          {BULAN_LIST.map((m) => (
                            <option key={m.no} value={m.no}>
                              Bulan {m.nama}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Tanggal / Jadwal Spesifik:
                        </label>
                        <input
                          type="text"
                          value={formData.tanggalSpesifik || ''}
                          onChange={(e) => {
                            setFormData((prev) => ({
                              ...prev,
                              tanggalSpesifik: e.target.value,
                            }));
                            setHasUnsavedChanges(true);
                          }}
                          placeholder="Misal: 17 Agustus / Pekan ke-2"
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* FIELD 6: PENANGGUNG JAWAB (PIC) */}
              <div className="pt-2 border-t border-slate-100 space-y-2.5">
                <label className="block text-xs font-bold text-slate-800">
                  6. Penanggung Jawab (PIC) <span className="text-rose-500">*</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <input
                      type="text"
                      value={formData.penanggungjawab?.nama || ''}
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          penanggungjawab: {
                            ...(prev.penanggungjawab || { divisi: DAFTAR_DIVISI[0], kontak: '' }),
                            nama: e.target.value,
                          },
                        }));
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="Nama Lengkap PJ"
                      className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none ${
                        formErrors.pjNama ? 'border-rose-400' : 'border-slate-200 focus:border-slate-400'
                      }`}
                    />
                    {formErrors.pjNama && (
                      <p className="mt-1 text-[11px] text-rose-500 font-medium">{formErrors.pjNama}</p>
                    )}
                  </div>

                  <div>
                    <select
                      value={formData.penanggungjawab?.divisi || DAFTAR_DIVISI[0]}
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          penanggungjawab: {
                            ...(prev.penanggungjawab || { nama: '', kontak: '' }),
                            divisi: e.target.value,
                          },
                        }));
                        setHasUnsavedChanges(true);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none"
                    >
                      {DAFTAR_DIVISI.map((div) => (
                        <option key={div} value={div}>
                          {div}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={formData.penanggungjawab?.kontak || ''}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        penanggungjawab: {
                          ...(prev.penanggungjawab || { nama: '', divisi: DAFTAR_DIVISI[0] }),
                          kontak: e.target.value,
                        },
                      }));
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="No. WhatsApp / Kontak (0812-xxxx)"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                  />
                  {formData.penanggungjawab?.kontak && (
                    <a
                      href={`https://wa.me/${formData.penanggungjawab.kontak.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="h-9 px-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 flex items-center gap-1 text-xs font-bold transition-colors shrink-0"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Hubungi WA</span>
                    </a>
                  )}
                </div>
              </div>

              {/* CATATAN TAMBAHAN (OPSIONAL) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Catatan Tambahan (Opsional):
                </label>
                <input
                  type="text"
                  value={formData.catatan || ''}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, catatan: e.target.value }));
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="Keterangan mitra, vendor, atau lokasi pelaksanaan"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800"
                />
              </div>

              {/* ACTION BUTTONS (Simpan, Salin, Hapus) */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleDuplicate}
                    className="h-10 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
                    title="Duplikat Program Ini"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span className="hidden sm:inline">Salin</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDelete}
                    className="h-10 px-3 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
                    title="Hapus Program Ini"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Hapus</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleSave}
                  className={`h-10 px-5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all ${
                    hasUnsavedChanges
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 animate-pulse'
                      : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/10'
                  }`}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{hasUnsavedChanges ? 'Simpan Perubahan' : 'Tersimpan ✓'}</span>
                </button>
              </div>
            </div>
          ) : null}

          {/* Quick Summary Strip at bottom of the 1 screen */}
          <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500">Total Program: </span>
              <span className="font-bold text-slate-900 tabular-nums">
                {filteredPrograms.length} proker
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-500">Total Anggaran: </span>
              <span className="font-bold text-emerald-800 tabular-nums">
                {formatRupiah(totalAnggaran)}
              </span>
            </div>
          </div>
        </main>

        {/* 5. FIXED BOTTOM STICKY BAR: PREV / NEXT NAVIGATION (Memilih data berikutnya dalam 1 sentuhan) */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 pb-safe shadow-lg">
          <div className="max-w-xl md:max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentIndex <= 0}
              className="flex-1 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Sebelumnya</span>
            </button>

            <span className="text-[11px] font-bold text-slate-500 tabular-nums shrink-0 px-1">
              {filteredPrograms.length > 0 ? `${currentIndex + 1} / ${filteredPrograms.length}` : '0 / 0'}
            </span>

            <button
              type="button"
              onClick={handleNext}
              disabled={currentIndex >= filteredPrograms.length - 1}
              className="flex-1 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-30 disabled:pointer-events-none transition-colors shadow-xs"
            >
              <span>Berikutnya</span>
              <ChevronRight className="w-4 h-4 text-emerald-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
