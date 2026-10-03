import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  Calendar,
  DollarSign,
  User,
  Target,
  FileText,
  Clock,
  Sparkles,
} from 'lucide-react';
import { ProgramKerja, ScheduleType, ProgramStatus } from '../types/proker';
import {
  BULAN_LIST,
  DAFTAR_DIVISI,
  formatRupiah,
  parseRupiahInput,
} from '../utils/formatters';

interface ProkerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (program: Omit<ProgramKerja, 'id' | 'createdAt' | 'updatedAt'>, editId?: string) => void;
  editingProgram: ProgramKerja | null;
  defaultYear?: 2026 | 2027;
}

export const ProkerFormModal: React.FC<ProkerFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingProgram,
  defaultYear = 2026,
}) => {
  // Form State
  const [tahun, setTahun] = useState<2026 | 2027>(defaultYear);
  const [namaProgram, setNamaProgram] = useState('');
  const [tujuanKegiatan, setTujuanKegiatan] = useState('');
  const [targetSasaran, setTargetSasaran] = useState('');
  const [estimasiAnggaran, setEstimasiAnggaran] = useState<number>(0);
  const [rawAnggaranInput, setRawAnggaranInput] = useState('');
  const [tipeJadwal, setTipeJadwal] = useState<ScheduleType>('multi_bulan');
  const [bulanPelaksanaan, setBulanPelaksanaan] = useState<number[]>([1, 2, 3]);
  const [tanggalSpesifik, setTanggalSpesifik] = useState('');
  const [pjNama, setPjNama] = useState('');
  const [pjDivisi, setPjDivisi] = useState(DAFTAR_DIVISI[0]);
  const [pjKontak, setPjKontak] = useState('');
  const [status, setStatus] = useState<ProgramStatus>('direncanakan');
  const [catatan, setCatatan] = useState('');

  // Error validations
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingProgram) {
      setTahun(editingProgram.tahun);
      setNamaProgram(editingProgram.namaProgram);
      setTujuanKegiatan(editingProgram.tujuanKegiatan);
      setTargetSasaran(editingProgram.targetSasaran);
      setEstimasiAnggaran(editingProgram.estimasiAnggaran);
      setRawAnggaranInput(editingProgram.estimasiAnggaran ? editingProgram.estimasiAnggaran.toLocaleString('id-ID') : '');
      setTipeJadwal(editingProgram.tipeJadwal);
      setBulanPelaksanaan(editingProgram.bulanPelaksanaan || []);
      setTanggalSpesifik(editingProgram.tanggalSpesifik || '');
      setPjNama(editingProgram.penanggungjawab?.nama || '');
      setPjDivisi(editingProgram.penanggungjawab?.divisi || DAFTAR_DIVISI[0]);
      setPjKontak(editingProgram.penanggungjawab?.kontak || '');
      setStatus(editingProgram.status);
      setCatatan(editingProgram.catatan || '');
    } else {
      // Reset form
      setTahun(defaultYear);
      setNamaProgram('');
      setTujuanKegiatan('');
      setTargetSasaran('');
      setEstimasiAnggaran(10000000);
      setRawAnggaranInput('10.000.000');
      setTipeJadwal('multi_bulan');
      setBulanPelaksanaan([3, 6, 9]);
      setTanggalSpesifik('');
      setPjNama('');
      setPjDivisi(DAFTAR_DIVISI[0]);
      setPjKontak('');
      setStatus('direncanakan');
      setCatatan('');
    }
    setErrors({});
  }, [editingProgram, defaultYear, isOpen]);

  if (!isOpen) return null;

  // Handle tipe jadwal change
  const handleTipeJadwalChange = (type: ScheduleType) => {
    setTipeJadwal(type);
    if (type === 'sepanjang_tahun') {
      setBulanPelaksanaan([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    } else if (type === 'satu_kali') {
      // If currently multi or empty, keep only first active or default to current month
      const current = bulanPelaksanaan.length > 0 ? [bulanPelaksanaan[0]] : [1];
      setBulanPelaksanaan(current);
    } else {
      // Multi-bulan: default if empty
      if (bulanPelaksanaan.length === 0 || bulanPelaksanaan.length === 12) {
        setBulanPelaksanaan([3, 6, 9, 11]);
      }
    }
  };

  // Toggle month for multi-bulan
  const toggleMonth = (m: number) => {
    if (tipeJadwal === 'satu_kali') {
      setBulanPelaksanaan([m]);
      return;
    }

    if (bulanPelaksanaan.includes(m)) {
      if (bulanPelaksanaan.length === 1) {
        // Prevent empty selection
        return;
      }
      setBulanPelaksanaan(bulanPelaksanaan.filter((b) => b !== m));
    } else {
      setBulanPelaksanaan([...bulanPelaksanaan, m].sort((a, b) => a - b));
    }
  };

  // Budget input handler
  const handleAnggaranChange = (val: string) => {
    const num = parseRupiahInput(val);
    setEstimasiAnggaran(num);
    setRawAnggaranInput(num > 0 ? num.toLocaleString('id-ID') : '');
  };

  const handleQuickBudgetPreset = (preset: number) => {
    setEstimasiAnggaran(preset);
    setRawAnggaranInput(preset.toLocaleString('id-ID'));
  };

  // Validation & Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!namaProgram.trim()) newErrors.namaProgram = 'Nama program wajib diisi';
    if (!tujuanKegiatan.trim()) newErrors.tujuanKegiatan = 'Tujuan kegiatan wajib diisi';
    if (!targetSasaran.trim()) newErrors.targetSasaran = 'Target sasaran wajib diisi';
    if (!pjNama.trim()) newErrors.pjNama = 'Nama penanggung jawab wajib diisi';
    if (bulanPelaksanaan.length === 0) newErrors.bulanPelaksanaan = 'Pilih minimal 1 bulan pelaksanaan';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave(
      {
        tahun,
        namaProgram: namaProgram.trim(),
        tujuanKegiatan: tujuanKegiatan.trim(),
        targetSasaran: targetSasaran.trim(),
        estimasiAnggaran,
        tipeJadwal,
        bulanPelaksanaan: tipeJadwal === 'sepanjang_tahun' ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] : bulanPelaksanaan,
        tanggalSpesifik: tipeJadwal === 'satu_kali' ? tanggalSpesifik.trim() : undefined,
        penanggungjawab: {
          nama: pjNama.trim(),
          divisi: pjDivisi,
          kontak: pjKontak.trim(),
        },
        status,
        catatan: catatan.trim() || undefined,
      },
      editingProgram?.id
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal / Sheet Container */}
      <div className="relative w-full max-w-xl bg-white rounded-t-3xl sm:rounded-2xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in slide-in-from-bottom duration-200">
        {/* Grab bar */}
        <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {editingProgram ? 'Ubah Program Kerja' : 'Isi Program Kerja Baru'}
            </h2>
            <p className="text-xs text-slate-500">
              Rencana operasional & anggaran tahun 2026 / 2027
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto px-5 py-4 space-y-4.5 flex-1">
          {/* 1. TAHUN PROGRAM (2026 vs 2027) */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Tahun Pelaksanaan <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTahun(2026)}
                className={`py-2.5 text-xs font-bold rounded-xl border flex items-center justify-center gap-2 transition-all ${
                  tahun === 2026
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>Tahun 2026</span>
                {tahun === 2026 && <Check className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => setTahun(2027)}
                className={`py-2.5 text-xs font-bold rounded-xl border flex items-center justify-center gap-2 transition-all ${
                  tahun === 2027
                    ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>Tahun 2027</span>
                {tahun === 2027 && <Check className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* 2. NAMA PROGRAM */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Nama Program Kerja <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={namaProgram}
              onChange={(e) => {
                setNamaProgram(e.target.value);
                if (errors.namaProgram) setErrors((prev) => ({ ...prev, namaProgram: '' }));
              }}
              placeholder="Contoh: Pelatihan Up-skilling Digital & Otomasi Kerja"
              className={`w-full bg-slate-50 border rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 ${
                errors.namaProgram ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-slate-400'
              }`}
            />
            {errors.namaProgram && (
              <p className="mt-1 text-[11px] font-medium text-rose-500">{errors.namaProgram}</p>
            )}
          </div>

          {/* 3. TUJUAN KEGIATAN */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Tujuan Kegiatan <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={tujuanKegiatan}
              onChange={(e) => {
                setTujuanKegiatan(e.target.value);
                if (errors.tujuanKegiatan) setErrors((prev) => ({ ...prev, tujuanKegiatan: '' }));
              }}
              placeholder="Jelaskan alasan dan manfaat utama pelaksanaan program ini..."
              className={`w-full bg-slate-50 border rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 ${
                errors.tujuanKegiatan ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-slate-400'
              }`}
            />
            {errors.tujuanKegiatan && (
              <p className="mt-1 text-[11px] font-medium text-rose-500">{errors.tujuanKegiatan}</p>
            )}
          </div>

          {/* 4. TARGET SASARAN */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Target Sasaran / KPI <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={targetSasaran}
              onChange={(e) => {
                setTargetSasaran(e.target.value);
                if (errors.targetSasaran) setErrors((prev) => ({ ...prev, targetSasaran: '' }));
              }}
              placeholder="Contoh: 150 staf tersertifikasi, efisiensi waktu 40%, 30 workstation baru"
              className={`w-full bg-slate-50 border rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 ${
                errors.targetSasaran ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-slate-400'
              }`}
            />
            {errors.targetSasaran && (
              <p className="mt-1 text-[11px] font-medium text-rose-500">{errors.targetSasaran}</p>
            )}
          </div>

          {/* 5. ESTIMASI ANGGARAN */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-800">
                Estimasi Anggaran (Rupiah) <span className="text-rose-500">*</span>
              </label>
              <span className="text-xs font-bold text-emerald-700 tabular-nums">
                {formatRupiah(estimasiAnggaran)}
              </span>
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                Rp
              </span>
              <input
                type="text"
                value={rawAnggaranInput}
                onChange={(e) => handleAnggaranChange(e.target.value)}
                placeholder="0"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 tabular-nums"
              />
            </div>

            {/* Quick Budget Chips */}
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-slate-400 font-semibold">Preset Cepat:</span>
              {[
                { label: '5 Jt', val: 5000000 },
                { label: '10 Jt', val: 10000000 },
                { label: '25 Jt', val: 25000000 },
                { label: '50 Jt', val: 50000000 },
                { label: '100 Jt', val: 100000000 },
              ].map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => handleQuickBudgetPreset(p.val)}
                  className="px-2 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* 6. JADWAL PELAKSANAAN (3 Pilihan: Sepanjang Tahun, Multi Bulan Terjadwal, Satu Kali Pelaksanaan) */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-800 mb-2">
              Jadwal Pelaksanaan <span className="text-rose-500">*</span>
            </label>

            {/* Radio / Segment Options for Schedule Type */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
              {[
                {
                  id: 'sepanjang_tahun',
                  title: 'Sepanjang Tahun',
                  desc: 'Berjalan kontinyu 12 bulan (Jan–Des)',
                },
                {
                  id: 'multi_bulan',
                  title: 'Multi Bulan',
                  desc: 'Terjadwal pada beberapa bulan terpilih',
                },
                {
                  id: 'satu_kali',
                  title: 'Satu Kali Pelaksanaan',
                  desc: 'Acara / kegiatan tunggal di bulan tertentu',
                },
              ].map((type) => {
                const isSelected = tipeJadwal === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => handleTipeJadwalChange(type.id as ScheduleType)}
                    className={`text-left p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-1 ring-slate-900'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{type.title}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                    <p
                      className={`text-[10px] mt-1 line-clamp-2 ${
                        isSelected ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      {type.desc}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Sub-UI depending on tipeJadwal */}
            {tipeJadwal === 'sepanjang_tahun' && (
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Program ini akan ditandai aktif di setiap bulan dari Januari hingga Desember (12 Bulan Penuh).
                </span>
              </div>
            )}

            {tipeJadwal === 'multi_bulan' && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Pilih Bulan Pelaksanaan ({bulanPelaksanaan.length} bulan terpilih)
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setBulanPelaksanaan([3, 6, 9, 12])}
                      className="text-slate-600 hover:text-slate-900 font-semibold underline"
                    >
                      Triwulan
                    </button>
                    <span className="text-slate-300">·</span>
                    <button
                      type="button"
                      onClick={() => setBulanPelaksanaan([1, 2, 3, 4, 5, 6])}
                      className="text-slate-600 hover:text-slate-900 font-semibold underline"
                    >
                      Semester 1
                    </button>
                    <span className="text-slate-300">·</span>
                    <button
                      type="button"
                      onClick={() => setBulanPelaksanaan([7, 8, 9, 10, 11, 12])}
                      className="text-slate-600 hover:text-slate-900 font-semibold underline"
                    >
                      Semester 2
                    </button>
                  </div>
                </div>

                {/* 12 Months Grid */}
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                  {BULAN_LIST.map((m) => {
                    const isSelected = bulanPelaksanaan.includes(m.no);
                    return (
                      <button
                        key={m.no}
                        type="button"
                        onClick={() => toggleMonth(m.no)}
                        className={`py-2 px-1 text-xs font-bold rounded-lg border text-center transition-all ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {m.singkatan}
                      </button>
                    );
                  })}
                </div>
                {errors.bulanPelaksanaan && (
                  <p className="text-[11px] font-medium text-rose-500">{errors.bulanPelaksanaan}</p>
                )}
              </div>
            )}

            {tipeJadwal === 'satu_kali' && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Bulan Pelaksanaan
                  </label>
                  <select
                    value={bulanPelaksanaan[0] || 1}
                    onChange={(e) => setBulanPelaksanaan([parseInt(e.target.value, 10)])}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:border-slate-400"
                  >
                    {BULAN_LIST.map((m) => (
                      <option key={m.no} value={m.no}>
                        Bulan {m.nama} ({m.singkatan} {tahun})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Tanggal / Jadwal Spesifik (Opsional)
                  </label>
                  <input
                    type="text"
                    value={tanggalSpesifik}
                    onChange={(e) => setTanggalSpesifik(e.target.value)}
                    placeholder="Contoh: 17 Agustus 2025 / Pekan ke-2 / Akhir Bulan"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 7. PENANGGUNG JAWAB */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <label className="block text-xs font-bold text-slate-800">
              Penanggung Jawab (PIC) <span className="text-rose-500">*</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <input
                  type="text"
                  value={pjNama}
                  onChange={(e) => {
                    setPjNama(e.target.value);
                    if (errors.pjNama) setErrors((prev) => ({ ...prev, pjNama: '' }));
                  }}
                  placeholder="Nama Penanggung Jawab"
                  className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none ${
                    errors.pjNama ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-slate-400'
                  }`}
                />
                {errors.pjNama && (
                  <p className="mt-1 text-[11px] font-medium text-rose-500">{errors.pjNama}</p>
                )}
              </div>

              <div>
                <select
                  value={pjDivisi}
                  onChange={(e) => setPjDivisi(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-slate-400"
                >
                  {DAFTAR_DIVISI.map((div) => (
                    <option key={div} value={div}>
                      {div}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <input
                type="text"
                value={pjKontak}
                onChange={(e) => setPjKontak(e.target.value)}
                placeholder="No. WhatsApp / Kontak (Contoh: 0812-3456-7890)"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
              />
            </div>
          </div>

          {/* 8. STATUS & CATATAN */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Status Kegiatan
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProgramStatus)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-slate-400"
                >
                  <option value="direncanakan">Direncanakan</option>
                  <option value="berjalan">Sedang Berjalan</option>
                  <option value="selesai">Selesai</option>
                  <option value="ditunda">Ditunda</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Catatan Tambahan (Opsional)
                </label>
                <input
                  type="text"
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Keterangan pengadaan / lokasi / mitra"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                />
              </div>
            </div>
          </div>

          {/* Modal Footer (Pinned CTA) */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 sm:flex-initial px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md shadow-slate-900/10 active:scale-[0.99] transition-all"
            >
              {editingProgram ? 'Simpan Perubahan' : 'Tambahkan Program'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
