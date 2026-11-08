import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Heart,
  Calendar,
  DollarSign,
  Users,
  MapPin,
  CheckCircle2,
  FileText,
  AlertCircle,
  HelpCircle,
  Save,
} from 'lucide-react';
import { ProgramKerja, EvaluasiProgram, StatusKeterlaksanaan } from '../types/proker';
import {
  BULAN_LIST,
  formatRupiah,
  parseRupiahInput,
  getAlokasiBudgetBulanan,
  getEvaluasiForMonth,
  isDivisionMatch,
} from '../utils/formatters';

interface PseRealisasiPenggunaanModalProps {
  isOpen: boolean;
  onClose: () => void;
  psePrograms: ProgramKerja[];
  selectedProgram?: ProgramKerja | null;
  defaultMonth?: number;
  onSaveEvaluasi: (programId: string, evaluasiData: EvaluasiProgram, targetBulan?: number) => void;
}

export const PseRealisasiPenggunaanModal: React.FC<PseRealisasiPenggunaanModalProps> = ({
  isOpen,
  onClose,
  psePrograms,
  selectedProgram,
  defaultMonth = 1,
  onSaveEvaluasi,
}) => {
  const [selectedProgId, setSelectedProgId] = useState<string>('');
  const [activeBulan, setActiveBulan] = useState<number>(defaultMonth);
  const [tanggalPenyaluran, setTanggalPenyaluran] = useState<string>('');
  const [rawJumlahDana, setRawJumlahDana] = useState<string>('');
  const [jumlahDana, setJumlahDana] = useState<number>(0);
  const [targetPenerimaManfaat, setTargetPenerimaManfaat] = useState<string>('');
  const [lokasiPenyaluran, setLokasiPenyaluran] = useState<string>('Lingkungan / Wilayah Paroki');
  const [statusKeterlaksanaan, setStatusKeterlaksanaan] = useState<StatusKeterlaksanaan>('terlaksana');
  const [penjelasanKegiatan, setPenjelasanKegiatan] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Active Program Object
  const currentProgram = useMemo(() => {
    return psePrograms.find((p) => p.id === selectedProgId) || selectedProgram || psePrograms[0] || null;
  }, [psePrograms, selectedProgId, selectedProgram]);

  // Alokasi budget bulan ini
  const alokasiBulanIni = useMemo(() => {
    if (!currentProgram) return 0;
    return getAlokasiBudgetBulanan(currentProgram, activeBulan);
  }, [currentProgram, activeBulan]);

  // Evaluasi yang sudah ada untuk bulan ini
  const existingEvaluasi = useMemo(() => {
    if (!currentProgram) return null;
    return getEvaluasiForMonth(currentProgram, activeBulan);
  }, [currentProgram, activeBulan]);

  // Sinkronisasi form saat modal dibuka atau program / bulan berubah
  useEffect(() => {
    if (!isOpen) return;

    const prog = selectedProgram || psePrograms[0];
    if (prog) {
      setSelectedProgId(prog.id);
    }

    const mo = defaultMonth >= 1 && defaultMonth <= 12 ? defaultMonth : 1;
    setActiveBulan(mo);

    // Tanggal default bulan aktif tahun 2026
    const yr = prog?.tahun || 2026;
    const padMo = String(mo).padStart(2, '0');
    setTanggalPenyaluran(`${yr}-${padMo}-15`);

    // Cek jika sudah pernah dicatat evaluasi
    const existing = prog ? getEvaluasiForMonth(prog, mo) : null;
    if (existing && existing.anggaranTerpakai) {
      setJumlahDana(existing.anggaranTerpakai);
      setRawJumlahDana(existing.anggaranTerpakai.toLocaleString('id-ID'));
      setTargetPenerimaManfaat(existing.jumlahPeserta || prog?.targetSasaran || '');
      setLokasiPenyaluran(existing.tempatPelaksanaan || 'Lingkungan / Wilayah Paroki');
      setStatusKeterlaksanaan(existing.statusKeterlaksanaan || 'terlaksana');
      setPenjelasanKegiatan(existing.penjelasanKegiatan || '');
      if (existing.tanggalPelaksanaan) {
        setTanggalPenyaluran(existing.tanggalPelaksanaan);
      }
    } else {
      const defaultAlokasi = prog ? getAlokasiBudgetBulanan(prog, mo) : 2000000;
      setJumlahDana(defaultAlokasi);
      setRawJumlahDana(defaultAlokasi > 0 ? defaultAlokasi.toLocaleString('id-ID') : '2.000.000');
      setTargetPenerimaManfaat(prog?.targetSasaran || 'Keluarga Prasejahtera / Warga Lansia');
      setLokasiPenyaluran('Lingkungan / Wilayah Paroki');
      setStatusKeterlaksanaan('terlaksana');
      setPenjelasanKegiatan(
        `Penyaluran dana bantuan sosial kasih umat untuk ${prog?.namaProgram || 'program kemanusiaan PSE'}.`
      );
    }

    setErrorMsg('');
  }, [isOpen, selectedProgram, defaultMonth, psePrograms]);

  // Handle program switch
  const handleProgramChange = (progId: string) => {
    setSelectedProgId(progId);
    const prog = psePrograms.find((p) => p.id === progId);
    if (!prog) return;

    const existing = getEvaluasiForMonth(prog, activeBulan);
    if (existing && existing.anggaranTerpakai) {
      setJumlahDana(existing.anggaranTerpakai);
      setRawJumlahDana(existing.anggaranTerpakai.toLocaleString('id-ID'));
      setTargetPenerimaManfaat(existing.jumlahPeserta || prog.targetSasaran || '');
      setLokasiPenyaluran(existing.tempatPelaksanaan || 'Lingkungan / Wilayah Paroki');
      setStatusKeterlaksanaan(existing.statusKeterlaksanaan || 'terlaksana');
      setPenjelasanKegiatan(existing.penjelasanKegiatan || '');
      if (existing.tanggalPelaksanaan) setTanggalPenyaluran(existing.tanggalPelaksanaan);
    } else {
      const defAlokasi = getAlokasiBudgetBulanan(prog, activeBulan);
      setJumlahDana(defAlokasi);
      setRawJumlahDana(defAlokasi > 0 ? defAlokasi.toLocaleString('id-ID') : '2.000.000');
      setTargetPenerimaManfaat(prog.targetSasaran || 'Keluarga Prasejahtera / Warga Lansia');
      setPenjelasanKegiatan(`Penyaluran dana bantuan sosial kasih umat untuk ${prog.namaProgram}.`);
    }
  };

  // Handle month switch
  const handleMonthChange = (newMonth: number) => {
    setActiveBulan(newMonth);
    if (!currentProgram) return;

    const yr = currentProgram.tahun || 2026;
    const padMo = String(newMonth).padStart(2, '0');
    setTanggalPenyaluran(`${yr}-${padMo}-15`);

    const existing = getEvaluasiForMonth(currentProgram, newMonth);
    if (existing && existing.anggaranTerpakai) {
      setJumlahDana(existing.anggaranTerpakai);
      setRawJumlahDana(existing.anggaranTerpakai.toLocaleString('id-ID'));
      setTargetPenerimaManfaat(existing.jumlahPeserta || currentProgram.targetSasaran || '');
      setPenjelasanKegiatan(existing.penjelasanKegiatan || '');
      if (existing.tanggalPelaksanaan) setTanggalPenyaluran(existing.tanggalPelaksanaan);
    } else {
      const defAlokasi = getAlokasiBudgetBulanan(currentProgram, newMonth);
      setJumlahDana(defAlokasi);
      setRawJumlahDana(defAlokasi > 0 ? defAlokasi.toLocaleString('id-ID') : '2.000.000');
    }
  };

  const handleJumlahChange = (valStr: string) => {
    setRawJumlahDana(valStr);
    const parsed = parseRupiahInput(valStr);
    setJumlahDana(parsed);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentProgram) {
      setErrorMsg('Pilih program kerja bantuan PSE terlebih dahulu.');
      return;
    }

    if (jumlahDana <= 0 && statusKeterlaksanaan === 'terlaksana') {
      setErrorMsg('Masukkan jumlah realisasi dana yang disalurkan (harus lebih besar dari Rp 0).');
      return;
    }

    if (!targetPenerimaManfaat.trim()) {
      setErrorMsg('Masukkan target / jumlah penerima manfaat yang dibantu.');
      return;
    }

    const evaluasiData: EvaluasiProgram = {
      statusKeterlaksanaan,
      tanggalPelaksanaan: tanggalPenyaluran || `${currentProgram.tahun || 2026}-${String(activeBulan).padStart(2, '0')}-15`,
      tempatPelaksanaan: lokasiPenyaluran || 'Lingkungan / Wilayah Paroki',
      jumlahPeserta: targetPenerimaManfaat.trim(),
      penjelasanKegiatan: penjelasanKegiatan.trim() || `Penyaluran dana bantuan sosial kasih umat untuk ${currentProgram.namaProgram}.`,
      anggaranTerpakai: jumlahDana,
      tanggalEvaluasi: new Date().toISOString().split('T')[0],
    };

    onSaveEvaluasi(currentProgram.id, evaluasiData, activeBulan);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* HEADER MODAL */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shrink-0 shadow-xs">
              <Heart className="w-5 h-5 fill-white text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight">
                  Realisasi &amp; Penyaluran Penggunaan Dana Umat
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-950/40 border border-amber-300/40 text-[10px] font-black uppercase text-amber-200">
                  Khusus PSE
                </span>
              </div>
              <p className="text-xs text-amber-100 font-medium">
                Pencatatan penyaluran dana kasih umat ke program bantuan &amp; warga prasejahtera penerima manfaat.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-xl text-white transition-colors cursor-pointer"
            title="Tutup Formulir"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY FORMULIR */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. PILIHAN PROGRAM BANTUAN PSE */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <span>Program Kerja Bantuan PSE Penerima Dana Umat:</span>
              <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedProgId}
              onChange={(e) => handleProgramChange(e.target.value)}
              className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white cursor-pointer"
            >
              {psePrograms.length === 0 ? (
                <option value="">Tidak ada program PSE terdaftar</option>
              ) : (
                psePrograms.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.namaProgram} (Tahun {p.tahun} - Estimasi: {formatRupiah(p.estimasiAnggaran)})
                  </option>
                ))
              )}
            </select>
            {currentProgram && (
              <p className="text-[11px] text-slate-500 font-medium">
                PIC: <strong>{currentProgram.penanggungjawab?.nama || 'Seksi PSE'}</strong> · Tujuan: {currentProgram.tujuanKegiatan || 'Bantuan kemanusiaan paroki'}
              </p>
            )}
          </div>

          {/* 2. BULAN PENYALURAN & TANGGAL PENYALURAN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                <span>Bulan Penyaluran:</span>
              </label>
              <select
                value={activeBulan}
                onChange={(e) => handleMonthChange(Number(e.target.value))}
                className="w-full h-9 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white cursor-pointer"
              >
                {BULAN_LIST.map((b) => (
                  <option key={b.no} value={b.no}>
                    Bulan {b.nama}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                <span>Tanggal Aktual Penyaluran:</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={tanggalPenyaluran}
                onChange={(e) => setTanggalPenyaluran(e.target.value)}
                className="w-full h-9 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                required
              />
            </div>
          </div>

          {/* 3. ALOKASI BUDGET VS REALISASI PENYALURAN */}
          <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-bold">
                Estimasi Alokasi Rencana Bulan {BULAN_LIST[activeBulan - 1]?.nama}:
              </span>
              <span className="text-sm font-black text-slate-900">
                {formatRupiah(alokasiBulanIni)}
              </span>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-amber-950 flex items-center justify-between">
                <span>Jumlah Realisasi Dana Umat yang Digunakan / Disalurkan (Rp):</span>
                <span className="text-[10.5px] font-bold text-emerald-700">
                  Riil: {formatRupiah(jumlahDana)}
                </span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                  Rp
                </div>
                <input
                  type="text"
                  value={rawJumlahDana}
                  onChange={(e) => handleJumlahChange(e.target.value)}
                  placeholder="0"
                  className="w-full h-11 bg-white border border-amber-300 rounded-xl pl-9 pr-3 text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-slate-500 font-bold">Preset Cepat:</span>
                {[500000, 1000000, 2000000, 3000000, 5000000].map((nominal) => (
                  <button
                    key={nominal}
                    type="button"
                    onClick={() => {
                      setJumlahDana(nominal);
                      setRawJumlahDana(nominal.toLocaleString('id-ID'));
                    }}
                    className="px-2 py-0.5 rounded-lg bg-white hover:bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-bold cursor-pointer transition-colors shadow-2xs"
                  >
                    +{formatRupiah(nominal)}
                  </button>
                ))}
                {alokasiBulanIni > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setJumlahDana(alokasiBulanIni);
                      setRawJumlahDana(alokasiBulanIni.toLocaleString('id-ID'));
                    }}
                    className="px-2 py-0.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 text-[10px] font-black cursor-pointer transition-colors shadow-2xs"
                  >
                    = Penuh ({formatRupiah(alokasiBulanIni)})
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 4. PENERIMA MANFAAT & LOKASI PENYALURAN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-rose-600" />
                <span>Penerima Manfaat / Warga yang Terbantu:</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={targetPenerimaManfaat}
                onChange={(e) => setTargetPenerimaManfaat(e.target.value)}
                placeholder="Misal: 45 KK Prasejahtera / 10 Anak Asuh"
                className="w-full h-9 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                <span>Tempat / Lingkungan Penyaluran:</span>
              </label>
              <input
                type="text"
                value={lokasiPenyaluran}
                onChange={(e) => setLokasiPenyaluran(e.target.value)}
                placeholder="Misal: Wilayah II, Aula Paroki, Kunjungan Rumah"
                className="w-full h-9 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
              />
            </div>
          </div>

          {/* 5. STATUS KETERLAKSANAAN */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 block">
              Status Keterlaksanaan Program:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'terlaksana', label: '✅ Terlaksana Penuh' },
                  { id: 'tidak_terlaksana', label: '❌ Belum / Batal' },
                  { id: 'perubahan_waktu', label: '🔄 Pindah Jadwal' },
                ] as const
              ).map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatusKeterlaksanaan(st.id)}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                    statusKeterlaksanaan === st.id
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* 6. CATATAN / LAPORAN PENYALURAN */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-600" />
              <span>Catatan / Keterangan Penyaluran Dana Umat:</span>
            </label>
            <textarea
              value={penjelasanKegiatan}
              onChange={(e) => setPenjelasanKegiatan(e.target.value)}
              rows={3}
              placeholder="Jelaskan detail bantuan yang diserahkan (misal: paket sembako beras 10kg, santunan uang duka, bantuan beasiswa SPP, dll.)"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white resize-none"
            />
          </div>

          {/* FOOTER ACTIONS */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Batal
            </button>

            <button
              type="submit"
              className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md shadow-amber-600/20 cursor-pointer transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Realisasi Penggunaan Dana Umat</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
