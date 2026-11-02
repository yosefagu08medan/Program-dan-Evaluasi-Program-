import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  FileText,
  Upload,
  File,
  Trash2,
  Save,
  AlertCircle,
  TrendingDown,
  Info,
} from 'lucide-react';
import { ProgramKerja, EvaluasiProgram, DokumenLampiran, StatusKeterlaksanaan } from '../types/proker';
import {
  formatRupiah,
  parseRupiahInput,
  BULAN_LIST,
  isProgramBerulang,
  getEvaluasiForMonth,
  getAnggaranTerpakaiSebelumBulan,
  getSisaBudgetUntukBulan,
} from '../utils/formatters';

interface EvaluasiModalProps {
  isOpen: boolean;
  program: ProgramKerja | null;
  selectedMonth?: number; // Bulan konteks yang sedang aktif (1-12)
  onClose: () => void;
  onSaveEvaluasi: (programId: string, evaluasiData: EvaluasiProgram, targetBulan?: number) => void;
}

export const EvaluasiModal: React.FC<EvaluasiModalProps> = ({
  isOpen,
  program,
  selectedMonth = 10,
  onClose,
  onSaveEvaluasi,
}) => {
  // Bulan aktif untuk evaluasi
  const [activeBulan, setActiveBulan] = useState<number>(() => {
    return selectedMonth && selectedMonth >= 1 && selectedMonth <= 12 ? selectedMonth : 10;
  });

  const [statusKeterlaksanaan, setStatusKeterlaksanaan] = useState<StatusKeterlaksanaan>('terlaksana');
  const [tanggalPelaksanaan, setTanggalPelaksanaan] = useState<string>('');
  const [tempatPelaksanaan, setTempatPelaksanaan] = useState<string>('');
  const [jumlahPeserta, setJumlahPeserta] = useState<string>('');
  const [penjelasanKegiatan, setPenjelasanKegiatan] = useState<string>('');
  const [rawAnggaran, setRawAnggaran] = useState<string>('');
  const [anggaranTerpakai, setAnggaranTerpakai] = useState<number>(0);
  const [dokumentasi, setDokumentasi] = useState<DokumenLampiran[]>([]);
  const [alasanTidakTerlaksana, setAlasanTidakTerlaksana] = useState<string>('');
  const [jadwalBaru, setJadwalBaru] = useState<string>('');
  const [alasanPerubahanWaktu, setAlasanPerubahanWaktu] = useState<string>('');
  const [penjelasanPerubahan, setPenjelasanPerubahan] = useState<string>('');
  const [evaluator, setEvaluator] = useState<string>('');

  const isBerulang = useMemo(() => {
    return program ? isProgramBerulang(program) : false;
  }, [program]);

  // Daftar bulan yang berlaku untuk program ini
  const availableMonths = useMemo(() => {
    if (!program) return [];
    if (program.tipeJadwal === 'sepanjang_tahun' || (program.bulanPelaksanaan && program.bulanPelaksanaan.length >= 12)) {
      return BULAN_LIST;
    }
    if (Array.isArray(program.bulanPelaksanaan) && program.bulanPelaksanaan.length > 0) {
      return BULAN_LIST.filter((b) => program.bulanPelaksanaan.includes(b.no));
    }
    return BULAN_LIST;
  }, [program]);

  // Saat modal terbuka, sinkronisasi bulan awal
  useEffect(() => {
    if (isOpen && program) {
      const initialMo =
        selectedMonth && availableMonths.some((b) => b.no === selectedMonth)
          ? selectedMonth
          : availableMonths[0]?.no || 10;
      setActiveBulan(initialMo);
    }
  }, [isOpen, program, selectedMonth, availableMonths]);

  // Hitung sisa budget dan anggaran terpakai sebelum bulan ini
  const terpakaiSebelumnya = useMemo(() => {
    if (!program) return 0;
    return getAnggaranTerpakaiSebelumBulan(program, activeBulan);
  }, [program, activeBulan]);

  const sisaBudgetBulanIni = useMemo(() => {
    if (!program) return 0;
    return getSisaBudgetUntukBulan(program, activeBulan);
  }, [program, activeBulan]);

  // Muat data evaluasi untuk bulan aktif
  useEffect(() => {
    if (program) {
      const prev = isBerulang ? getEvaluasiForMonth(program, activeBulan) : program.evaluasi;
      if (prev) {
        setStatusKeterlaksanaan(prev.statusKeterlaksanaan || 'terlaksana');
        setTanggalPelaksanaan(prev.tanggalPelaksanaan || '');
        setTempatPelaksanaan(prev.tempatPelaksanaan || '');
        setJumlahPeserta(prev.jumlahPeserta || '');
        setPenjelasanKegiatan(prev.penjelasanKegiatan || '');
        setAnggaranTerpakai(prev.anggaranTerpakai || 0);
        setRawAnggaran(prev.anggaranTerpakai !== undefined ? prev.anggaranTerpakai.toLocaleString('id-ID') : '');
        setDokumentasi(prev.dokumentasi || []);
        setAlasanTidakTerlaksana(prev.alasanTidakTerlaksana || '');
        setJadwalBaru(prev.jadwalBaru || '');
        setAlasanPerubahanWaktu(prev.alasanPerubahanWaktu || '');
        setPenjelasanPerubahan(prev.penjelasanPerubahan || '');
        setEvaluator(prev.evaluator || program.penanggungjawab?.nama || '');
      } else {
        // Default kosong untuk bulan ini
        setStatusKeterlaksanaan('terlaksana');
        const defaultDate =
          program.jadwalBulanan?.[activeBulan] ||
          (program.tanggalSpesifik?.match(/\d{4}-\d{2}-\d{2}/)?.[0]) ||
          '';
        setTanggalPelaksanaan(defaultDate);
        setTempatPelaksanaan('');
        setJumlahPeserta('');
        setPenjelasanKegiatan('');
        setAnggaranTerpakai(0);
        setRawAnggaran('');
        setDokumentasi([]);
        setAlasanTidakTerlaksana('');
        setJadwalBaru('');
        setAlasanPerubahanWaktu('');
        setPenjelasanPerubahan('');
        setEvaluator(program.penanggungjawab?.nama || '');
      }
    }
  }, [program, activeBulan, isBerulang]);

  if (!isOpen || !program) return null;

  const handleAnggaranChange = (val: string) => {
    const num = parseRupiahInput(val);
    setAnggaranTerpakai(num);
    setRawAnggaran(num ? num.toLocaleString('id-ID') : '');
  };

  // Upload file dokumentasi
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      const sizeStr = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;

      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const newDoc: DokumenLampiran = {
          id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          nama: file.name,
          tipe: file.type || 'application/octet-stream',
          dataUrl,
          ukuran: sizeStr,
        };
        setDokumentasi((prev) => [...prev, newDoc]);
      };

      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleRemoveDoc = (id: string) => {
    setDokumentasi((prev) => prev.filter((d) => d.id !== id));
  };

  const handleSave = () => {
    const evaluasiData: EvaluasiProgram = {
      statusKeterlaksanaan,
      tanggalEvaluasi: new Date().toISOString(),
      evaluator: evaluator || program.penanggungjawab?.nama || 'Seksi Penanggung Jawab',
      ...(statusKeterlaksanaan === 'terlaksana'
        ? {
            tanggalPelaksanaan,
            tempatPelaksanaan,
            jumlahPeserta,
            penjelasanKegiatan,
            anggaranTerpakai,
            dokumentasi,
          }
        : statusKeterlaksanaan === 'perubahan_waktu'
        ? {
            jadwalBaru,
            alasanPerubahanWaktu,
            penjelasanPerubahan,
            dokumentasi,
          }
        : {
            alasanTidakTerlaksana,
          }),
    };

    onSaveEvaluasi(program.id, evaluasiData, isBerulang ? activeBulan : undefined);
    onClose();
  };

  const activeBulanObj = BULAN_LIST.find((b) => b.no === activeBulan);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header Modal */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="min-w-0 flex-1 pr-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                📝 Form Evaluasi Bulanan
              </span>
              <span className="text-xs text-slate-300 font-semibold truncate">
                {program.penanggungjawab?.divisi}
              </span>
              {program.isLuarRancangan && (
                <span className="text-[9.5px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-slate-950">
                  ⚡ Di Luar Rancangan (Insidental)
                </span>
              )}
            </div>
            <h3 className="text-sm sm:text-base font-extrabold text-white truncate mt-1">
              {program.namaProgram}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors shrink-0"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body Scrollable */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* PILIHAN BULAN EVALUASI JIKA PROGRAM BERULANG / SETIAP BULAN */}
          {isBerulang && (
            <div className="p-3 bg-indigo-50/80 rounded-xl border border-indigo-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Pilih Bulan Evaluasi Pelaksanaan:</span>
                </label>
                <span className="text-[10px] font-extrabold text-indigo-700 bg-white px-2 py-0.5 rounded-full border border-indigo-200">
                  Tahun {program.tahun}
                </span>
              </div>

              {/* Pill selector bulan */}
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                {availableMonths.map((b) => {
                  const ev = program.evaluasiBulanan?.[b.no];
                  const hasDone = ev?.statusKeterlaksanaan === 'terlaksana';
                  const hasBatal = ev?.statusKeterlaksanaan === 'tidak_terlaksana';
                  const hasGeser = ev?.statusKeterlaksanaan === 'perubahan_waktu';
                  const isCurrent = b.no === activeBulan;

                  return (
                    <button
                      key={b.no}
                      type="button"
                      onClick={() => setActiveBulan(b.no)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all relative flex flex-col items-center cursor-pointer ${
                        isCurrent
                          ? 'bg-indigo-600 text-white ring-2 ring-indigo-600/30 shadow-2xs'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-indigo-100/50'
                      }`}
                    >
                      <span>{b.singkatan}</span>
                      <span className="text-[9px] mt-0.5 font-medium">
                        {hasDone ? '✓ Selesai' : hasBatal ? '✕ Batal' : hasGeser ? '⏳ Geser' : '—'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Status Ringkasan Budget Program Rutin / Berulang */}
              <div className="mt-2 pt-2 border-t border-indigo-200/80 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="bg-white p-2 rounded-lg border border-indigo-100">
                  <span className="text-[10px] text-slate-500 block font-semibold">Total Pagu Tahunan</span>
                  <strong className="text-slate-900 font-extrabold">{formatRupiah(program.estimasiAnggaran)}</strong>
                </div>

                <div className="bg-white p-2 rounded-lg border border-indigo-100">
                  <span className="text-[10px] text-slate-500 block font-semibold">Terpakai s/d Bulan Lalu</span>
                  <strong className="text-rose-700 font-extrabold">
                    {terpakaiSebelumnya > 0 ? `-${formatRupiah(terpakaiSebelumnya)}` : 'Rp 0'}
                  </strong>
                </div>

                <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                  <span className="text-[10px] text-emerald-800 block font-bold">
                    Sisa Budget Bulan {activeBulanObj?.nama}
                  </span>
                  <strong className="text-emerald-950 font-extrabold">{formatRupiah(sisaBudgetBulanIni)}</strong>
                </div>
              </div>
            </div>
          )}

          {/* 1. Pilihan Status Keterlaksanaan Program: 3 Pilihan */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              1. Status Evaluasi Pelaksanaan Bulan {activeBulanObj?.nama}:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStatusKeterlaksanaan('terlaksana')}
                className={`p-2.5 rounded-xl border text-left transition-all flex items-center sm:flex-col sm:items-start gap-2 cursor-pointer ${
                  statusKeterlaksanaan === 'terlaksana'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/20 shadow-2xs'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    statusKeterlaksanaan === 'terlaksana'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white border border-slate-300 text-slate-400'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold">1. Terlaksana</h4>
                  <p className="text-[10px] text-slate-500">Kegiatan telah selesai</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setStatusKeterlaksanaan('tidak_terlaksana')}
                className={`p-2.5 rounded-xl border text-left transition-all flex items-center sm:flex-col sm:items-start gap-2 cursor-pointer ${
                  statusKeterlaksanaan === 'tidak_terlaksana'
                    ? 'border-rose-500 bg-rose-50 text-rose-950 ring-2 ring-rose-500/20 shadow-2xs'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    statusKeterlaksanaan === 'tidak_terlaksana'
                      ? 'bg-rose-600 text-white'
                      : 'bg-white border border-slate-300 text-slate-400'
                  }`}
                >
                  <XCircle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold">2. Tidak Terlaksana</h4>
                  <p className="text-[10px] text-slate-500">Kegiatan ditiadakan</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setStatusKeterlaksanaan('perubahan_waktu')}
                className={`p-2.5 rounded-xl border text-left transition-all flex items-center sm:flex-col sm:items-start gap-2 cursor-pointer ${
                  statusKeterlaksanaan === 'perubahan_waktu'
                    ? 'border-amber-500 bg-amber-50 text-amber-950 ring-2 ring-amber-500/20 shadow-2xs'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    statusKeterlaksanaan === 'perubahan_waktu'
                      ? 'bg-amber-600 text-white'
                      : 'bg-white border border-slate-300 text-slate-400'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold">3. Perubahan Waktu</h4>
                  <p className="text-[10px] text-slate-500">Jadwal bergeser</p>
                </div>
              </button>
            </div>
          </div>

          {/* 2A. FORM JIKA PROGRAM TERLAKSANA */}
          {statusKeterlaksanaan === 'terlaksana' && (
            <div className="space-y-3.5 pt-2 border-t border-slate-100 animate-in fade-in">
              <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Evaluasi untuk pelaksanaan di bulan <strong>{activeBulanObj?.nama} {program.tahun}</strong>.
                </span>
              </div>

              {/* Tanggal Pelaksanaan & Tempat Pelaksanaan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Tanggal Realisasi Pelaksanaan:</span>
                  </label>
                  <input
                    type="date"
                    value={tanggalPelaksanaan}
                    onChange={(e) => setTanggalPelaksanaan(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Tempat Pelaksanaan:</span>
                  </label>
                  <input
                    type="text"
                    value={tempatPelaksanaan}
                    onChange={(e) => setTempatPelaksanaan(e.target.value)}
                    placeholder="Contoh: Gedung Aula Paroki / Gereja Katedral"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Jumlah Peserta & Realisasi Anggaran */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Jumlah Peserta / Kehadiran:</span>
                  </label>
                  <input
                    type="text"
                    value={jumlahPeserta}
                    onChange={(e) => setJumlahPeserta(e.target.value)}
                    placeholder="Contoh: 15 anggota DPPH / 120 umat"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Biaya / Anggaran Terpakai:</span>
                    </label>
                    {isBerulang ? (
                      <span className="text-[10px] text-emerald-800 font-bold">
                        Sisa: {formatRupiah(sisaBudgetBulanIni)}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 font-semibold">
                        Pagu: {formatRupiah(program.estimasiAnggaran)}
                      </span>
                    )}
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
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-slate-900 tabular-nums focus:outline-none focus:border-emerald-500 focus:bg-white"
                    />
                  </div>

                  {/* Informasi Simulasi Pengurangan Anggaran */}
                  {isBerulang && (
                    <div className="mt-1.5 p-2 rounded-lg bg-amber-50/80 border border-amber-200 text-[10px] text-amber-900 flex items-start gap-1.5">
                      <TrendingDown className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <span>
                          Biaya bulan {activeBulanObj?.nama} sebesar{' '}
                          <strong>{formatRupiah(anggaranTerpakai || 0)}</strong> akan mengurangi sisa pagu
                          keseluruhan.
                        </span>
                        <div className="mt-0.5 font-bold text-slate-700">
                          Sisa untuk bulan berikutnya:{' '}
                          <span className="text-emerald-800">
                            {formatRupiah(Math.max(0, sisaBudgetBulanIni - (anggaranTerpakai || 0)))}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Penjelasan Singkat Kegiatan */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Uraian Ringkas Hasil Kegiatan / Rapat Bulan Ini:</span>
                </label>
                <textarea
                  rows={3}
                  value={penjelasanKegiatan}
                  onChange={(e) => setPenjelasanKegiatan(e.target.value)}
                  placeholder="Uraikan jalannya kegiatan, keputusan rapat, notulensi, atau output yang dicapai..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              {/* Dokumentasi (Upload PDF, JPEG, dll.) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Dokumentasi & Lampiran (Foto/PDF/Notulensi):</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">Opsional</span>
                </div>

                <label className="border-2 border-dashed border-slate-300 hover:border-emerald-400 bg-slate-50 hover:bg-emerald-50/40 rounded-xl p-3.5 flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors text-center">
                  <Upload className="w-5 h-5 text-slate-400" />
                  <span className="text-xs font-bold text-slate-700">
                    Klik untuk Unggah Foto / Dokumen PDF
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Mendukung file JPEG, PNG, PDF, atau notulensi kegiatan
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {dokumentasi.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    <p className="text-[10.5px] font-bold text-slate-700">
                      Lampiran Terunggah ({dokumentasi.length}):
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {dokumentasi.map((doc) => (
                        <div
                          key={doc.id}
                          className="p-2 rounded-lg border border-slate-200 bg-white flex items-center justify-between gap-2 text-xs shadow-2xs"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {doc.tipe.includes('image') ? (
                              doc.dataUrl ? (
                                <img
                                  src={doc.dataUrl}
                                  alt={doc.nama}
                                  className="w-8 h-8 rounded object-cover shrink-0 border border-slate-200"
                                />
                              ) : (
                                <FileText className="w-5 h-5 text-emerald-600 shrink-0" />
                              )
                            ) : (
                              <File className="w-5 h-5 text-rose-500 shrink-0" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-slate-800 text-[11px] truncate">
                                {doc.nama}
                              </p>
                              <span className="text-[9.5px] text-slate-400">
                                {doc.ukuran || 'Lampiran'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {doc.dataUrl && (
                              <a
                                href={doc.dataUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 rounded text-slate-400 hover:text-emerald-700 hover:bg-slate-100"
                                title="Lihat"
                              >
                                👁
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveDoc(doc.id)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100"
                              title="Hapus"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2B. FORM JIKA PROGRAM TIDAK TERLAKSANA */}
          {statusKeterlaksanaan === 'tidak_terlaksana' && (
            <div className="space-y-3 pt-2 border-t border-slate-100 animate-in fade-in">
              <div className="p-2.5 bg-rose-50/80 border border-rose-200 rounded-xl text-[11px] text-rose-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Program ditiadakan pada bulan {activeBulanObj?.nama}. Mohon cantumkan alasan.</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Alasan Tidak Terlaksana:
                </label>
                <textarea
                  rows={3}
                  value={alasanTidakTerlaksana}
                  onChange={(e) => setAlasanTidakTerlaksana(e.target.value)}
                  placeholder="Contoh: Terkendala cuaca ekstrem, bentrok dengan kegiatan keuskupan, atau dana belum mencukupi..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-rose-400 focus:bg-white"
                />
              </div>
            </div>
          )}

          {/* 2C. FORM JIKA PERUBAHAN WAKTU PELAKSANAAN */}
          {statusKeterlaksanaan === 'perubahan_waktu' && (
            <div className="space-y-3 pt-2 border-t border-slate-100 animate-in fade-in">
              <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl text-[11px] text-amber-950 flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Pelaksanaan digeser ke waktu lain. Mohon cantumkan tanggal/bulan baru.</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Rencana Waktu / Jadwal Baru:
                </label>
                <input
                  type="text"
                  value={jadwalBaru}
                  onChange={(e) => setJadwalBaru(e.target.value)}
                  placeholder="Contoh: Digeser ke Bulan November 2026..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Alasan Perubahan Waktu:
                </label>
                <textarea
                  rows={3}
                  value={alasanPerubahanWaktu}
                  onChange={(e) => setAlasanPerubahanWaktu(e.target.value)}
                  placeholder="Contoh: Menyesuaikan agenda keuskupan atau persiapan teknis peserta..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-amber-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Catatan Tambahan (Opsional):
                </label>
                <textarea
                  rows={2}
                  value={penjelasanPerubahan}
                  onChange={(e) => setPenjelasanPerubahan(e.target.value)}
                  placeholder="Catatan koordinasi lanjutan..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white"
                />
              </div>
            </div>
          )}

          {/* PIC / Evaluator */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Nama Pengisi Evaluasi (PIC Seksi):
            </label>
            <input
              type="text"
              value={evaluator}
              onChange={(e) => setEvaluator(e.target.value)}
              placeholder="Nama penanggung jawab evaluasi..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
            />
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Evaluasi Bulan {activeBulanObj?.nama}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
