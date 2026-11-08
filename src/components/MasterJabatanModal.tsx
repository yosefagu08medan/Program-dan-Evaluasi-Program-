import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  Search,
  Building2,
  Trash2,
  Edit2,
  Check,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Briefcase,
  Layers,
  Info,
} from 'lucide-react';
import { MasterJabatan, KategoriJabatan } from '../types/pengurus';

interface MasterJabatanModalProps {
  isOpen: boolean;
  onClose: () => void;
  jabatanList: MasterJabatan[];
  onSaveJabatan: (item: MasterJabatan) => void;
  onDeleteJabatan: (id: string) => void;
  onResetDefaultJabatan: () => void;
  isPastorOrAdmin: boolean;
  initialCategory?: KategoriJabatan;
}

export const MasterJabatanModal: React.FC<MasterJabatanModalProps> = ({
  isOpen,
  onClose,
  jabatanList,
  onSaveJabatan,
  onDeleteJabatan,
  onResetDefaultJabatan,
  isPastorOrAdmin,
  initialCategory,
}) => {
  const [activeCategory, setActiveCategory] = useState<KategoriJabatan | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // State form tambah/edit jabatan
  const [editingItem, setEditingItem] = useState<MasterJabatan | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [formNama, setFormNama] = useState('');
  const [formKategori, setFormKategori] = useState<KategoriJabatan>('seksi');
  const [formKeterangan, setFormKeterangan] = useState('');
  const [formError, setFormError] = useState('');

  // State konfirmasi hapus dua langkah
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Sync initialCategory saat dibuka
  React.useEffect(() => {
    if (isOpen) {
      if (initialCategory) {
        setActiveCategory(initialCategory);
        setFormKategori(initialCategory);
      } else {
        setActiveCategory('all');
      }
      setIsAddingNew(false);
      setEditingItem(null);
      setConfirmDeleteId(null);
      setFormNama('');
      setFormKeterangan('');
      setFormError('');
    }
  }, [isOpen, initialCategory]);

  // Filter daftar jabatan
  const filteredList = useMemo(() => {
    return jabatanList.filter((j) => {
      // Saring posisi DPPH lama yang memiliki pembagian bidang, sarana prasarana, aset, atau sub-divisi
      if (
        j.kategori === 'dpph' &&
        (j.nama.includes('Sarana') ||
          j.nama.includes('Prasarana') ||
          j.nama.includes('Aset') ||
          j.nama.includes('Bidang') ||
          j.nama.includes('Pewartaan') ||
          (j.nama.toLowerCase().includes('anggota') && j.nama !== 'Anggota DPPH') ||
          j.id.includes('sarana') ||
          j.id.includes('aset') ||
          j.id.includes('pewartaan') ||
          j.id.includes('liturgi') ||
          j.id.includes('paguyuban') ||
          j.id.includes('pelayanan') ||
          j.id.includes('tata-kelola'))
      ) {
        return false;
      }

      // Filter kategori
      if (activeCategory !== 'all') {
        if (activeCategory === 'pastor_paroki' || activeCategory === 'vikaris') {
          if (j.kategori !== 'pastor_paroki' && j.kategori !== 'vikaris') return false;
        } else if (j.kategori !== activeCategory) {
          return false;
        }
      }

      // Filter pencarian
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNama = j.nama.toLowerCase().includes(q);
        const matchKet = j.keterangan ? j.keterangan.toLowerCase().includes(q) : false;
        return matchNama || matchKet;
      }

      return true;
    });
  }, [jabatanList, activeCategory, searchQuery]);

  const handleStartAdd = () => {
    setEditingItem(null);
    setFormNama('');
    setFormKategori(activeCategory !== 'all' ? activeCategory : 'seksi');
    setFormKeterangan('');
    setFormError('');
    setIsAddingNew(true);
  };

  const handleStartEdit = (item: MasterJabatan) => {
    setEditingItem(item);
    setFormNama(item.nama);
    setFormKategori(item.kategori);
    setFormKeterangan(item.keterangan || '');
    setFormError('');
    setIsAddingNew(true);
  };

  const handleCancelForm = () => {
    setIsAddingNew(false);
    setEditingItem(null);
    setFormNama('');
    setFormKeterangan('');
    setFormError('');
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama.trim()) {
      setFormError('Nama jabatan wajib diisi!');
      return;
    }

    const payload: MasterJabatan = {
      id: editingItem ? editingItem.id : `jab-custom-${Date.now()}`,
      nama: formNama.trim(),
      kategori: formKategori,
      keterangan: formKeterangan.trim() || undefined,
      isDefault: editingItem ? editingItem.isDefault : false,
      urutan: editingItem?.urutan || (formKategori === 'pastor_paroki' ? 5 : formKategori === 'dpph' ? 25 : 50),
    };

    onSaveJabatan(payload);
    setIsAddingNew(false);
    setEditingItem(null);
    setFormNama('');
    setFormKeterangan('');
    setFormError('');
  };

  const getKategoriBadge = (kat: KategoriJabatan) => {
    switch (kat) {
      case 'pastor_paroki':
        return <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">Pastor Paroki</span>;
      case 'vikaris':
        return <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-purple-50 text-purple-700 border border-purple-200">Vikaris Parokial</span>;
      case 'dpph':
        return <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-slate-100 text-slate-800 border border-slate-300">DPPH Harian</span>;
      case 'seksi':
        return <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">Koordinator Seksi</span>;
      case 'anggota_seksi':
        return <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-blue-50 text-blue-800 border border-blue-200">Peran Anggota Seksi</span>;
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-300 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header Modal */}
        <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-white">
                  Kelola List Jabatan Pengurus Paroki
                </h3>
                <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-emerald-400 border border-emerald-500/30">
                  {jabatanList.length} Jabatan
                </span>
              </div>
              <p className="text-[10.5px] text-slate-300">
                Atur daftar pilihan jabatan resmi Pastor, DPPH, Koordinator Seksi dan Anggotanya
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-3.5 text-xs">
          {/* Action Bar: Tambah Jabatan & Pulihkan Default */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-[11px] text-slate-700 font-medium">
                {isPastorOrAdmin
                  ? 'Anda memiliki hak akses untuk menambah, mengubah, dan menghapus daftar jabatan pengurus.'
                  : 'Mode lihat saja. Hanya Pastor Paroki atau Admin yang dapat menambah/mengubah list jabatan.'}
              </span>
            </div>

            {isPastorOrAdmin && !isAddingNew && (
              <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={handleStartAdd}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Tambah Jabatan Baru</span>
                </button>

                <button
                  type="button"
                  onClick={onResetDefaultJabatan}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                  title="Pulihkan seluruh daftar jabatan bawaan paroki"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Form Tambah / Edit Jabatan */}
          {isAddingNew && isPastorOrAdmin && (
            <form
              onSubmit={handleSaveForm}
              className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-3 animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wide flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{editingItem ? 'Edit Jabatan Pengurus' : 'Tambah Jabatan Baru'}</span>
                </h4>
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="text-[10.5px] font-bold text-slate-500 hover:text-slate-800"
                >
                  Batal
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="block text-[10.5px] font-bold text-slate-700">
                    Nama Jabatan / Posisi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formNama}
                    onChange={(e) => {
                      setFormNama(e.target.value);
                      if (formError) setFormError('');
                    }}
                    placeholder="Contoh: Wakil Koordinator Seksi / Anggota..."
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                  {formError && <p className="text-[10px] text-rose-600 font-bold">{formError}</p>}
                </div>

                <div className="space-y-1">
                  <label className="block text-[10.5px] font-bold text-slate-700">
                    Kategori Pengurus <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formKategori}
                    onChange={(e) => setFormKategori(e.target.value as KategoriJabatan)}
                    className="w-full h-8 bg-white border border-slate-300 rounded-lg px-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="pastor_paroki">Pastor Paroki</option>
                    <option value="vikaris">Vikaris Parokial</option>
                    <option value="dpph">DPPH (Dewan Pastoral Paroki Harian)</option>
                    <option value="seksi">Koordinator Seksi</option>
                    <option value="anggota_seksi">Peran Anggota Seksi</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10.5px] font-bold text-slate-700">
                  Keterangan / Lingkup Tugas (Opsional)
                </label>
                <input
                  type="text"
                  value={formKeterangan}
                  onChange={(e) => setFormKeterangan(e.target.value)}
                  placeholder="Deskripsi singkat tanggung jawab peran ini..."
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-bold text-[11px] hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingItem ? 'Simpan Perubahan' : 'Tambahkan ke List Jabatan'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Filter Kategori & Search */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              {/* Category Pills */}
              <div className="flex items-center p-0.5 bg-slate-100 rounded-xl text-[10.5px] font-bold overflow-x-auto no-scrollbar">
                {[
                  { id: 'all', label: `Semua (${jabatanList.length})` },
                  { id: 'pastor_paroki', label: 'Pastor/Vikaris' },
                  { id: 'dpph', label: 'DPPH' },
                  { id: 'seksi', label: 'Koordinator Seksi' },
                  { id: 'anggota_seksi', label: 'Peran Anggota' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveCategory(tab.id as any)}
                    className={`px-2.5 py-1.2 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                      activeCategory === tab.id
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama jabatan..."
                  className="w-full pl-7 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white"
                />
              </div>
            </div>

            {/* List Daftar Jabatan */}
            <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
              {filteredList.length > 0 ? (
                filteredList.map((j, idx) => (
                  <div
                    key={j.id}
                    className="p-2.5 px-3 rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 flex items-center justify-between gap-2 shadow-2xs transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="text-xs font-extrabold text-slate-900">
                            {j.nama}
                          </h5>
                          {getKategoriBadge(j.kategori)}
                          {j.isDefault && (
                            <span className="text-[9px] text-slate-400 font-semibold">
                              (Bawaan Paroki)
                            </span>
                          )}
                        </div>
                        {j.keterangan && (
                          <p className="text-[10.5px] text-slate-500 mt-0.5 truncate">
                            {j.keterangan}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions: Edit & Hapus (Khusus Pastor Paroki / Admin) */}
                    {isPastorOrAdmin && (
                      <div className="flex items-center gap-1 shrink-0">
                        {confirmDeleteId === j.id ? (
                          <div className="flex items-center gap-1 bg-rose-50 p-1 rounded-lg border border-rose-200 animate-in fade-in duration-100">
                            <span className="text-[9.5px] text-rose-800 font-bold">Hapus?</span>
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteJabatan(j.id);
                                setConfirmDeleteId(null);
                              }}
                              className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[9.5px] font-bold cursor-pointer"
                            >
                              Ya
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-1.5 py-0.5 bg-white text-slate-700 border border-slate-200 rounded text-[9.5px] font-bold cursor-pointer"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleStartEdit(j)}
                              className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Edit Jabatan Ini"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(j.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Jabatan Ini dari List"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
                  <Briefcase className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-500 font-medium">
                    Tidak ada jabatan yang sesuai dengan filter atau pencarian.
                  </p>
                  {isPastorOrAdmin && (
                    <button
                      type="button"
                      onClick={handleStartAdd}
                      className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-[11px] font-bold text-emerald-800 cursor-pointer"
                    >
                      + Tambah Jabatan Baru
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
          <span className="text-[10.5px] text-slate-500">
            Daftar jabatan ini digunakan otomatis pada formulir penambahan pengurus & anggota seksi.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
