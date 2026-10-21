import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Save,
  User,
  Phone,
  Mail,
  Calendar,
  Building2,
  Users,
  Plus,
  Trash2,
  ShieldCheck,
  Sparkles,
  Info,
} from 'lucide-react';
import { PengurusItem, KategoriPengurus, AnggotaSeksi, MasterJabatan } from '../types/pengurus';
import { MASTER_DIVISIONS } from '../../database/master-data/divisions';

interface EditPengurusModalProps {
  isOpen: boolean;
  onClose: () => void;
  pengurus: PengurusItem | null;
  onSave: (item: PengurusItem) => void;
  onDelete?: (id: string) => void;
  isPastorOrAdmin: boolean;
  masterJabatanList?: MasterJabatan[];
  onOpenManageJabatan?: () => void;
}

export const EditPengurusModal: React.FC<EditPengurusModalProps> = ({
  isOpen,
  onClose,
  pengurus,
  onSave,
  onDelete,
  isPastorOrAdmin,
  masterJabatanList = [],
  onOpenManageJabatan,
}) => {
  const [formData, setFormData] = useState<Partial<PengurusItem>>({});
  const [anggotasList, setAnggotasList] = useState<AnggotaSeksi[]>([]);
  const [newAnggotaNama, setNewAnggotaNama] = useState('');
  const [newAnggotaPeran, setNewAnggotaPeran] = useState('');
  const [newAnggotaKontak, setNewAnggotaKontak] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);

  useEffect(() => {
    if (pengurus) {
      setFormData({ ...pengurus });
      setAnggotasList(pengurus.anggotas ? [...pengurus.anggotas] : []);
    } else {
      setFormData({
        kategori: 'seksi',
        jabatan: '',
        nama: '',
        periode: '2026 - 2027',
        urutan: 50,
      });
      setAnggotasList([]);
    }
    setNewAnggotaNama('');
    setNewAnggotaPeran('');
    setNewAnggotaKontak('');
    setErrors({});
    setConfirmDelete(false);
  }, [pengurus, isOpen]);

  // Daftar jabatan yang cocok dengan kategori terpilih
  const matchingJabatan = useMemo(() => {
    const kat = formData.kategori;
    if (!kat) return masterJabatanList;
    if (kat === 'pastor_paroki' || kat === 'vikaris') {
      return masterJabatanList.filter((j) => j.kategori === 'pastor_paroki' || j.kategori === 'vikaris');
    }
    return masterJabatanList.filter((j) => j.kategori === kat);
  }, [masterJabatanList, formData.kategori]);

  // Daftar peran anggota seksi
  const matchingRoles = useMemo(() => {
    return masterJabatanList.filter((j) => j.kategori === 'anggota_seksi');
  }, [masterJabatanList]);

  if (!isOpen) return null;

  // Jika bukan role Pastor Paroki atau Admin, tolak akses input
  if (!isPastorOrAdmin) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center space-y-4 shadow-xl border border-slate-200">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <X className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Akses Dibatasi</h3>
          <p className="text-xs text-slate-600">
            Penambahan atau pengubahan nama pengurus dan koordinator seksi hanya dapat dilakukan oleh <strong>Pastor Paroki atau Admin</strong>.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    );
  }

  const handleAddAnggota = () => {
    if (!newAnggotaNama.trim()) return;
    const newAng: AnggotaSeksi = {
      id: `ang-${Date.now()}`,
      nama: newAnggotaNama.trim(),
      peran: newAnggotaPeran.trim() || 'Anggota',
      kontak: newAnggotaKontak.trim() || undefined,
    };
    setAnggotasList((prev) => [...prev, newAng]);
    setNewAnggotaNama('');
    setNewAnggotaPeran('');
    setNewAnggotaKontak('');
  };

  const handleRemoveAnggota = (id: string) => {
    setAnggotasList((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!formData.nama?.trim()) errs.nama = 'Nama pengurus wajib diisi';
    if (!formData.jabatan?.trim()) errs.jabatan = 'Jabatan / peran wajib diisi';

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const payload: PengurusItem = {
      id: formData.id || `pengurus-${Date.now()}`,
      kategori: (formData.kategori as KategoriPengurus) || 'seksi',
      jabatan: formData.jabatan!.trim(),
      nama: formData.nama!.trim(),
      divisiId: formData.divisiId,
      namaDivisi: formData.namaDivisi,
      kontak: formData.kontak?.trim() || undefined,
      email: formData.email?.trim() || undefined,
      periode: formData.periode?.trim() || '2026 - 2027',
      catatan: formData.catatan?.trim() || undefined,
      urutan: formData.urutan || 50,
      anggotas: anggotasList,
      updatedAt: new Date().toISOString(),
    };

    onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-300 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header Modal */}
        <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">
                {pengurus ? 'Edit Data Pengurus & Anggota' : 'Tambah Pengurus Baru'}
              </h3>
              <p className="text-[10.5px] text-slate-300">
                Khusus Hak Akses Pastor Paroki & Admin Paroki Katedral Medan
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Kategori Pengurus */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700">
              Kategori Pengurus <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {[
                { key: 'pastor_paroki', label: 'Pastor Paroki' },
                { key: 'vikaris', label: 'Vikaris Parokial' },
                { key: 'dpph', label: 'DPPH Harian' },
                { key: 'seksi', label: 'Koordinator Seksi' },
              ].map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      kategori: cat.key as KategoriPengurus,
                      jabatan:
                        cat.key === 'pastor_paroki'
                          ? 'Pastor Paroki (Pastor Kepala)'
                          : cat.key === 'vikaris'
                          ? 'Vikaris Parokial'
                          : prev.jabatan,
                    }))
                  }
                  className={`py-2 px-2.5 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                    formData.kategori === cat.key
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Jika Kategori Seksi atau DPPH: Pilih Divisi Terkait */}
          {(formData.kategori === 'seksi' || formData.kategori === 'dpph') && (
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700">
                Pilih Seksi / Unit Terkait:
              </label>
              <select
                value={formData.namaDivisi || ''}
                onChange={(e) => {
                  const div = MASTER_DIVISIONS.find((d) => d.nama === e.target.value);
                  setFormData((prev) => ({
                    ...prev,
                    namaDivisi: e.target.value,
                    divisiId: div?.id,
                    jabatan:
                      prev.kategori === 'seksi'
                        ? `Koordinator ${e.target.value}`
                        : prev.jabatan || 'Pengurus DPPH',
                  }));
                }}
                className="w-full h-8.5 bg-slate-50 border border-slate-300 rounded-xl px-2.5 font-bold text-slate-900 focus:outline-none focus:border-slate-500 focus:bg-white text-xs cursor-pointer"
              >
                <option value="">-- Pilih Seksi / Unit Paroki --</option>
                {MASTER_DIVISIONS.map((d) => (
                  <option key={d.id} value={d.nama}>
                    {d.nama} ({d.kategori})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Nama Pengurus & Jabatan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700">
                Nama Lengkap & Gelar <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={formData.nama || ''}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, nama: e.target.value }));
                    if (errors.nama) setErrors((prev) => ({ ...prev, nama: '' }));
                  }}
                  placeholder="Contoh: RP. Sesarius Ery Kurniadi, OFMCap / Agnes Sitorus, S.Pd."
                  className={`w-full pl-8 pr-3 py-2 bg-slate-50 border rounded-xl font-bold text-slate-900 focus:outline-none focus:bg-white text-xs ${
                    errors.nama ? 'border-rose-400 bg-rose-50' : 'border-slate-300 focus:border-slate-500'
                  }`}
                />
              </div>
              {errors.nama && <p className="text-[10px] text-rose-600 font-bold">{errors.nama}</p>}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold text-slate-700">
                  Jabatan / Tanggung Jawab <span className="text-rose-500">*</span>
                </label>
                {onOpenManageJabatan && isPastorOrAdmin && (
                  <button
                    type="button"
                    onClick={onOpenManageJabatan}
                    className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer transition-colors"
                    title="Buka menu untuk menambah atau mengedit list jabatan"
                  >
                    <span>+ Kelola List Jabatan</span>
                  </button>
                )}
              </div>

              {/* Quick Select dari Master List Jabatan */}
              {matchingJabatan.length > 0 && (
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      setFormData((prev) => ({ ...prev, jabatan: e.target.value }));
                      if (errors.jabatan) setErrors((prev) => ({ ...prev, jabatan: '' }));
                    }
                  }}
                  className="w-full h-7 bg-slate-100 hover:bg-slate-200/80 border border-slate-300 rounded-lg px-2 text-[10.5px] font-bold text-slate-800 cursor-pointer transition-colors mb-1"
                >
                  <option value="">-- Pilih dari List Jabatan ({matchingJabatan.length} pilihan) --</option>
                  {matchingJabatan.map((j) => (
                    <option key={j.id} value={j.nama}>
                      {j.nama} {j.keterangan ? `· ${j.keterangan}` : ''}
                    </option>
                  ))}
                </select>
              )}

              <div className="relative">
                <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={formData.jabatan || ''}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, jabatan: e.target.value }));
                    if (errors.jabatan) setErrors((prev) => ({ ...prev, jabatan: '' }));
                  }}
                  placeholder="Contoh: Pastor Paroki / Koordinator Seksi Liturgi"
                  className={`w-full pl-8 pr-3 py-2 bg-slate-50 border rounded-xl font-bold text-slate-900 focus:outline-none focus:bg-white text-xs ${
                    errors.jabatan ? 'border-rose-400 bg-rose-50' : 'border-slate-300 focus:border-slate-500'
                  }`}
                />
              </div>
              {errors.jabatan && <p className="text-[10px] text-rose-600 font-bold">{errors.jabatan}</p>}
            </div>
          </div>

          {/* Kontak, Email & Periode */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700">
                Nomor Kontak / WhatsApp
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={formData.kontak || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, kontak: e.target.value }))}
                  placeholder="0812-xxxx-xxxx"
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-slate-500 focus:bg-white text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700">
                Email Resmi / Seksi
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="liturgi@katedralmedan.or.id"
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-slate-500 focus:bg-white text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700">
                Periode Kepengurusan
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={formData.periode || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, periode: e.target.value }))}
                  placeholder="2026 - 2027"
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-slate-500 focus:bg-white text-xs"
                />
              </div>
            </div>
          </div>

          {/* Catatan / Lingkup Tugas */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-700">
              Catatan / Lingkup Tugas Pelayanan
            </label>
            <textarea
              rows={2}
              value={formData.catatan || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, catatan: e.target.value }))}
              placeholder="Contoh: Mengoordinir jadwal petugas misa, perayaan sakramen, lektor, dan koor..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-slate-500 focus:bg-white text-xs"
            />
          </div>

          {/* KHUSUS KOORDINATOR SEKSI / DPPH: INPUT DAFTAR NAMA ANGGOTA */}
          <div className="pt-3 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                  Daftar Anggota Tim / Seksi ({anggotasList.length} Anggota)
                </h4>
              </div>
              <span className="text-[10px] text-slate-500">
                Dapat ditambah & dihapus langsung di bawah
              </span>
            </div>

            {/* Form Tambah Anggota Baru */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2">
              <span className="text-[10.5px] font-bold text-slate-800 block">
                + Tambah Anggota Baru:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={newAnggotaNama}
                  onChange={(e) => setNewAnggotaNama(e.target.value)}
                  placeholder="Nama Lengkap Anggota *"
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-slate-500"
                />
                <input
                  type="text"
                  value={newAnggotaPeran}
                  onChange={(e) => setNewAnggotaPeran(e.target.value)}
                  placeholder="Peran (misal: Wakil / Sekretaris / Anggota)"
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-slate-500"
                />
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newAnggotaKontak}
                    onChange={(e) => setNewAnggotaKontak(e.target.value)}
                    placeholder="No HP (Opsional)"
                    className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-slate-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddAnggota}
                    disabled={!newAnggotaNama.trim()}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:pointer-events-none text-white font-bold rounded-lg text-xs flex items-center gap-1 shrink-0 transition-colors cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah</span>
                  </button>
                </div>
              </div>

              {/* Pilihan Peran Cepat dari Master Jabatan */}
              {matchingRoles.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[9.5px] font-bold text-slate-500">Pilihan Peran Cepat:</span>
                  {matchingRoles.slice(0, 6).map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setNewAnggotaPeran(r.nama)}
                      className="px-1.5 py-0.5 rounded bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 text-[9.5px] font-semibold transition-colors cursor-pointer"
                    >
                      {r.nama}
                    </button>
                  ))}
                  {onOpenManageJabatan && isPastorOrAdmin && (
                    <button
                      type="button"
                      onClick={onOpenManageJabatan}
                      className="text-[9.5px] font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer ml-1"
                    >
                      + Kelola List
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* List Anggota Terdaftar */}
            {anggotasList.length > 0 ? (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {anggotasList.map((ang, idx) => (
                  <div
                    key={ang.id}
                    className="p-2 px-3 rounded-lg bg-white border border-slate-200 flex items-center justify-between gap-2 shadow-2xs hover:border-slate-300"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 block truncate text-xs">
                          {ang.nama}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                          <span className="font-semibold text-emerald-800">{ang.peran || 'Anggota'}</span>
                          {ang.kontak && (
                            <>
                              <span>•</span>
                              <span>{ang.kontak}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAnggota(ang.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer shrink-0"
                      title="Hapus Anggota"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic text-center py-2 bg-slate-50 rounded-lg">
                Belum ada anggota yang ditambahkan. Gunakan form di atas untuk memasukkan nama-nama anggota tim seksi.
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-2">
            <div>
              {pengurus && onDelete && (
                confirmDelete ? (
                  <div className="flex items-center gap-1.5 p-1 px-2 rounded-xl bg-rose-50 border border-rose-200 animate-in fade-in duration-150">
                    <span className="text-[10.5px] text-rose-800 font-extrabold">Yakin hapus?</span>
                    <button
                      type="button"
                      onClick={() => {
                        onDelete(pengurus.id);
                        onClose();
                      }}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
                    >
                      Ya, Hapus
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold rounded-lg cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="px-3 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Pengurus</span>
                  </button>
                )
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-98 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5 text-emerald-400" />
                <span>Simpan Data Pengurus</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
