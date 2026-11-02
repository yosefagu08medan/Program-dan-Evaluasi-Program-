import React, { useState, useMemo } from 'react';
import {
  Users,
  User,
  Plus,
  Search,
  ShieldCheck,
  Building2,
  Phone,
  Mail,
  Calendar,
  Edit,
  Trash2,
  CheckCircle2,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  UserCheck,
  RotateCcw,
  Shield,
  Radio,
  HeartHandshake,
  Home,
  GraduationCap,
  BookOpen,
  Music,
  BookKey,
  TreePine,
  Award,
  X,
  Briefcase,
} from 'lucide-react';
import { PengurusItem, KategoriPengurus, AnggotaSeksi, MasterJabatan } from '../types/pengurus';
import { AuthSession } from '../types/auth';
import { EditPengurusModal } from './EditPengurusModal';
import { MasterJabatanModal } from './MasterJabatanModal';

interface PengurusViewProps {
  pengurusList: PengurusItem[];
  authSession: AuthSession | null;
  onSavePengurus: (item: PengurusItem) => void;
  onDeletePengurus: (id: string) => void;
  onResetDefaultPengurus?: () => void;
  masterJabatanList?: MasterJabatan[];
  onSaveJabatan?: (item: MasterJabatan) => void;
  onDeleteJabatan?: (id: string) => void;
  onResetDefaultJabatan?: () => void;
}

export const PengurusView: React.FC<PengurusViewProps> = ({
  pengurusList,
  authSession,
  onSavePengurus,
  onDeletePengurus,
  onResetDefaultPengurus,
  masterJabatanList = [],
  onSaveJabatan,
  onDeleteJabatan,
  onResetDefaultJabatan,
}) => {
  const isPastorOrAdmin =
    authSession?.role === 'pastor_paroki' || authSession?.role === 'semua_seksi';

  const [activeCategory, setActiveCategory] = useState<KategoriPengurus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingPengurus, setEditingPengurus] = useState<PengurusItem | null>(null);
  const [deletingPengurus, setDeletingPengurus] = useState<PengurusItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isJabatanModalOpen, setIsJabatanModalOpen] = useState<boolean>(false);
  const [expandedSeksiAnggotas, setExpandedSeksiAnggotas] = useState<Record<string, boolean>>({});

  const toggleAnggotas = (id: string) => {
    setExpandedSeksiAnggotas((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Filter pengurus berdasarkan kategori dan pencarian
  const filteredList = useMemo(() => {
    return pengurusList.filter((p) => {
      // Filter kategori
      if (activeCategory !== 'all') {
        if (activeCategory === 'pastor_paroki') {
          if (p.kategori !== 'pastor_paroki' && p.kategori !== 'vikaris') return false;
        } else if (p.kategori !== activeCategory) {
          return false;
        }
      }

      // Filter pencarian
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNama = p.nama.toLowerCase().includes(q);
        const matchJabatan = p.jabatan.toLowerCase().includes(q);
        const matchDivisi = p.namaDivisi ? p.namaDivisi.toLowerCase().includes(q) : false;
        const matchAnggota = p.anggotas
          ? p.anggotas.some((a) => a.nama.toLowerCase().includes(q) || (a.peran && a.peran.toLowerCase().includes(q)))
          : false;

        return matchNama || matchJabatan || matchDivisi || matchAnggota;
      }

      return true;
    });
  }, [pengurusList, activeCategory, searchQuery]);

  // Kelompokkan pengurus
  const pastorAndVikaris = useMemo(
    () => filteredList.filter((p) => p.kategori === 'pastor_paroki' || p.kategori === 'vikaris'),
    [filteredList]
  );
  const dpphMembers = useMemo(() => filteredList.filter((p) => p.kategori === 'dpph'), [filteredList]);
  const seksiMembers = useMemo(() => filteredList.filter((p) => p.kategori === 'seksi'), [filteredList]);

  const handleOpenAddModal = () => {
    setEditingPengurus(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: PengurusItem) => {
    setEditingPengurus(item);
    setIsModalOpen(true);
  };

  const getSeksiIcon = (codeOrName: string) => {
    const s = codeOrName.toLowerCase();
    if (s.includes('liturgi')) return <Music className="w-4 h-4 text-violet-600" />;
    if (s.includes('komsos')) return <Radio className="w-4 h-4 text-blue-600" />;
    if (s.includes('keamanan')) return <Shield className="w-4 h-4 text-amber-600" />;
    if (s.includes('muda') || s.includes('omk')) return <Users className="w-4 h-4 text-orange-600" />;
    if (s.includes('pse')) return <HeartHandshake className="w-4 h-4 text-rose-600" />;
    if (s.includes('keluarga')) return <Home className="w-4 h-4 text-pink-600" />;
    if (s.includes('katekese')) return <BookKey className="w-4 h-4 text-amber-700" />;
    if (s.includes('kki')) return <Sparkles className="w-4 h-4 text-yellow-600" />;
    if (s.includes('hak')) return <HeartHandshake className="w-4 h-4 text-teal-600" />;
    if (s.includes('pendidikan')) return <GraduationCap className="w-4 h-4 text-cyan-600" />;
    if (s.includes('kitab suci') || s.includes('kks')) return <BookOpen className="w-4 h-4 text-emerald-600" />;
    if (s.includes('plbks') || s.includes('komuni suci') || s.includes('pelayan luar biasa')) return <Sparkles className="w-4 h-4 text-amber-600" />;
    if (s.includes('kerawam')) return <Award className="w-4 h-4 text-red-600" />;
    return <Building2 className="w-4 h-4 text-slate-600" />;
  };

  return (
    <div className="space-y-4 pb-12 w-full animate-in fade-in duration-200">
      {/* 1. HERO & PERMISSION BANNER */}
      <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center font-bold text-base shadow-xs shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                  Susunan Pengurus & Koordinator Seksi Paroki
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  Periode 2026 - 2027
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Struktur Dewan Pastoral Paroki Harian (DPPH), Pastor Paroki, Vikaris, dan Koordinator 15 Seksi beserta anggotanya.
              </p>
            </div>
          </div>

          {/* Action buttons (Khusus Pastor Paroki / Admin) */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center flex-wrap">
            {isPastorOrAdmin ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsJabatanModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
                  title="Menu untuk menambah dan mengelola list jabatan pengurus"
                >
                  <Briefcase className="w-3.5 h-3.5 text-indigo-200" />
                  <span>+ List Jabatan</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
                  title="Tambah Pengurus / Koordinator Baru"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Tambah Pengurus</span>
                </button>

                {onResetDefaultPengurus && (
                  <button
                    type="button"
                    onClick={onResetDefaultPengurus}
                    className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-xs transition-colors cursor-pointer"
                    title="Pulihkan Susunan Pengurus Default"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsJabatanModalOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10.5px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Lihat daftar master jabatan pengurus paroki"
                >
                  <Briefcase className="w-3 h-3" />
                  <span>Daftar Jabatan ({masterJabatanList.length})</span>
                </button>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[10.5px] font-semibold border border-slate-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span>Mode Lihat</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Status Akses Info Banner */}
        <div
          className={`p-2.5 rounded-xl border text-[11px] flex items-center justify-between gap-2 flex-wrap ${
            isPastorOrAdmin
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse shrink-0" />
            <span>
              {isPastorOrAdmin ? (
                <>
                  <strong>Hak Akses Penuh Pastor Paroki / Admin Aktif:</strong> Anda dapat menginput nama pengurus, mengganti koordinator, dan menambah/menghapus anggota seksi.
                </>
              ) : (
                <>
                  <strong>Hak Akses Seksi / Tamu:</strong> Menampilkan daftar resmi kepengurusan paroki. Hubungi Pastor Paroki / Admin untuk pembaharuan nama pengurus.
                </>
              )}
            </span>
          </div>
          <span className="text-[10px] font-bold text-slate-500">
            Total {pengurusList.length} Entitas Pengurus
          </span>
        </div>

        {/* 2. FILTER KATEGORI & SEARCH BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
          {/* Category Tabs */}
          <div className="flex items-center p-0.5 bg-slate-100 rounded-xl text-[11px] font-bold overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: `Semua (${pengurusList.length})` },
              {
                id: 'pastor_paroki',
                label: `Pastor & Vikaris (${pengurusList.filter((p) => p.kategori === 'pastor_paroki' || p.kategori === 'vikaris').length})`,
              },
              {
                id: 'dpph',
                label: `DPPH (${pengurusList.filter((p) => p.kategori === 'dpph').length})`,
              },
              {
                id: 'seksi',
                label: `Koordinator Seksi (${pengurusList.filter((p) => p.kategori === 'seksi').length})`,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategory(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
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
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama pengurus, seksi, atau anggota..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* 3. DAFTAR PENGURUS BERDASARKAN HIERARKI */}

      {/* SECTION 1: PASTOR PAROKI & VIKARIS */}
      {(activeCategory === 'all' || activeCategory === 'pastor_paroki') && pastorAndVikaris.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
              <span>PASTOR PAROKI & VIKARIS PAROKIAL</span>
            </h3>
            <span className="text-[10px] font-bold text-slate-500">
              Penggembalaan Pastoral Paroki
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pastorAndVikaris.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl border bg-gradient-to-br from-indigo-50/50 via-white to-slate-50/50 border-indigo-200 shadow-2xs hover:shadow-xs transition-all space-y-3 relative group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                      ✝️
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-black uppercase text-indigo-700 block truncate">
                        {item.jabatan}
                      </span>
                      <h4 className="text-sm font-extrabold text-slate-900 leading-snug">
                        {item.nama}
                      </h4>
                    </div>
                  </div>

                  {isPastorOrAdmin && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(item)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit Data Pastor"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingPengurus(item)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Hapus Data Pastor Ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Info Kontak & Periode */}
                <div className="space-y-1 text-[11px] text-slate-600 pt-2 border-t border-indigo-100">
                  {item.kontak && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{item.kontak}</span>
                    </div>
                  )}
                  {item.email && (
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate">{item.email}</span>
                    </div>
                  )}
                  {item.periode && (
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-semibold">
                      <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>Periode Tugas: {item.periode}</span>
                    </div>
                  )}
                  {item.catatan && (
                    <p className="text-[10.5px] text-slate-500 bg-white/80 p-2 rounded-lg border border-slate-200/80 mt-1.5 line-clamp-2">
                      {item.catatan}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: DEWAN PASTORAL PAROKI HARIAN (DPPH) */}
      {(activeCategory === 'all' || activeCategory === 'dpph') && dpphMembers.length > 0 && (
        <div className="space-y-2.5 pt-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-900" />
              <span>DEWAN PASTORAL PAROKI HARIAN (DPPH)</span>
            </h3>
            <span className="text-[10px] font-bold text-slate-500">
              Pelaksana Kebijakan & Koordinasi Umum Paroki
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {dpphMembers.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl border bg-white border-slate-200 shadow-2xs hover:border-slate-300 transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-sm shrink-0 border border-slate-200">
                      🏛️
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9.5px] font-black uppercase text-slate-600 block truncate">
                        {item.jabatan}
                      </span>
                      <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 leading-snug truncate">
                        {item.nama}
                      </h4>
                    </div>
                  </div>

                  {isPastorOrAdmin && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(item)}
                        className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Edit Pengurus DPPH"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingPengurus(item)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Hapus Pengurus DPPH Ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-1 text-[11px] text-slate-600 pt-2 border-t border-slate-100">
                  {item.kontak && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{item.kontak}</span>
                    </div>
                  )}
                  {item.email && (
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate">{item.email}</span>
                    </div>
                  )}
                  {item.catatan && (
                    <p className="text-[10px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-200/80 mt-1 line-clamp-2">
                      {item.catatan}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3: KOORDINATOR SEKSI DAN ANGGOTANYA */}
      {(activeCategory === 'all' || activeCategory === 'seksi') && seksiMembers.length > 0 && (
        <div className="space-y-2.5 pt-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <span>KOORDINATOR SEKSI & DAFTAR ANGGOTA</span>
            </h3>
            <span className="text-[10px] font-bold text-slate-500">
              {seksiMembers.length} Seksi Terdaftar
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {seksiMembers.map((item) => {
              const isAnggotaOpen = !!expandedSeksiAnggotas[item.id];
              const totalAnggota = item.anggotas ? item.anggotas.length : 0;

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl border bg-white border-slate-200 shadow-2xs hover:border-slate-300 transition-all space-y-3"
                >
                  {/* Header Seksi */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs">
                        {getSeksiIcon(item.namaDivisi || item.jabatan)}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 inline-block">
                          {item.namaDivisi || item.jabatan}
                        </span>
                        <h4 className="text-sm font-extrabold text-slate-900 mt-0.5 truncate">
                          {item.nama}
                        </h4>
                        <p className="text-[10px] text-slate-500 font-medium truncate">
                          {item.jabatan}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isPastorOrAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[10.5px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            title="Edit Koordinator & Kelola Anggota"
                          >
                            <Edit className="w-3 h-3 text-slate-600" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingPengurus(item)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Koordinator Seksi Ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Kontak & Catatan */}
                  <div className="flex items-center gap-3 text-[10.5px] text-slate-600 flex-wrap">
                    {item.kontak && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-emerald-600" />
                        <span>{item.kontak}</span>
                      </span>
                    )}
                    {item.email && (
                      <span className="flex items-center gap-1 truncate max-w-[200px]">
                        <Mail className="w-3 h-3 text-blue-600" />
                        <span className="truncate">{item.email}</span>
                      </span>
                    )}
                    <span className="text-slate-400">• Periode: {item.periode}</span>
                  </div>

                  {item.catatan && (
                    <p className="text-[10px] text-slate-500 line-clamp-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                      {item.catatan}
                    </p>
                  )}

                  {/* BAGIAN DAFTAR ANGGOTA SEKSI */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-emerald-700" />
                        <span className="text-[11px] font-bold text-slate-800">
                          Anggota Seksi ({totalAnggota} Orang)
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleAnggotas(item.id)}
                        className="text-[10.5px] font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>{isAnggotaOpen ? 'Tutup Daftar' : 'Lihat Anggota'}</span>
                        {isAnggotaOpen ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                    </div>

                    {/* Preview Singkat Anggota jika tertutup */}
                    {!isAnggotaOpen && totalAnggota > 0 && (
                      <p className="text-[10px] text-slate-500 truncate">
                        <span className="font-semibold text-slate-700">Anggota: </span>
                        {item.anggotas!.map((a) => a.nama).join(', ')}
                      </p>
                    )}

                    {/* Rincian Anggota jika terbuka */}
                    {isAnggotaOpen && (
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-1.5 animate-in fade-in duration-150">
                        {totalAnggota > 0 ? (
                          <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                            {item.anggotas!.map((ang, aIdx) => (
                              <div
                                key={ang.id}
                                className="p-1.5 px-2 rounded-lg bg-white border border-slate-200/80 flex items-center justify-between gap-2 text-[10.5px]"
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-600 font-bold text-[9px] flex items-center justify-center shrink-0">
                                    {aIdx + 1}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <span className="font-bold text-slate-900 block truncate">
                                      {ang.nama}
                                    </span>
                                    <span className="text-[9.5px] text-slate-500">
                                      {ang.peran || 'Anggota'} {ang.kontak ? `· ${ang.kontak}` : ''}
                                    </span>
                                  </div>
                                </div>

                                {isPastorOrAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = (item.anggotas || []).filter((a) => a.id !== ang.id);
                                      onSavePengurus({
                                        ...item,
                                        anggotas: updated,
                                      });
                                    }}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer shrink-0"
                                    title={`Hapus anggota ${ang.nama}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-400 italic text-center py-1">
                            Belum ada nama anggota yang didaftarkan.
                          </p>
                        )}

                        {isPastorOrAdmin && (
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="w-full py-1 text-center bg-white hover:bg-slate-100 rounded-lg border border-dashed border-slate-300 text-emerald-800 text-[10px] font-bold transition-colors cursor-pointer mt-1"
                          >
                            + Tambah / Edit Anggota {item.namaDivisi || item.jabatan}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Edit / Input Pengurus */}
      <EditPengurusModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        pengurus={editingPengurus}
        onSave={onSavePengurus}
        onDelete={onDeletePengurus}
        isPastorOrAdmin={isPastorOrAdmin}
        masterJabatanList={masterJabatanList}
        onOpenManageJabatan={() => setIsJabatanModalOpen(true)}
      />

      {/* Modal Kelola / Tambah List Jabatan Pengurus */}
      <MasterJabatanModal
        isOpen={isJabatanModalOpen}
        onClose={() => setIsJabatanModalOpen(false)}
        jabatanList={masterJabatanList}
        onSaveJabatan={onSaveJabatan || (() => {})}
        onDeleteJabatan={onDeleteJabatan || (() => {})}
        onResetDefaultJabatan={onResetDefaultJabatan || (() => {})}
        isPastorOrAdmin={isPastorOrAdmin}
      />

      {/* Modal Konfirmasi Hapus Pengurus */}
      {deletingPengurus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-3.5 border-b border-slate-100 bg-rose-50/70">
              <div className="flex items-center gap-2 text-rose-700">
                <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                  <Trash2 className="w-4 h-4 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 leading-tight">
                    Hapus Data Pengurus
                  </h3>
                  <p className="text-[10px] text-rose-700 font-semibold">Tindakan Permanen</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeletingPengurus(null)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-4 space-y-3 text-xs">
              <p className="text-slate-600">
                Apakah Anda yakin ingin menghapus data pengurus berikut dari sistem?
              </p>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/90 space-y-1">
                <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-800 inline-block">
                  {deletingPengurus.namaDivisi || deletingPengurus.jabatan}
                </span>
                <h4 className="text-sm font-black text-slate-900 break-words">
                  {deletingPengurus.nama}
                </h4>
                <p className="text-[10.5px] text-slate-500 font-medium">
                  {deletingPengurus.jabatan} {deletingPengurus.periode ? `· Periode ${deletingPengurus.periode}` : ''}
                </p>
                {deletingPengurus.anggotas && deletingPengurus.anggotas.length > 0 && (
                  <p className="text-[10px] text-amber-700 font-semibold mt-1">
                    ⚠️ Pengurus ini memiliki {deletingPengurus.anggotas.length} anggota tim terdaftar.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingPengurus(null)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeletePengurus(deletingPengurus.id);
                    setDeletingPengurus(null);
                  }}
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Ya, Hapus Pengurus</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
