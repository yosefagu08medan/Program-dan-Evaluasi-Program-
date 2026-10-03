import React, { useState, useMemo } from 'react';
import { X, Search, Shield, Building2, Radio, Users, HeartHandshake, Home, Sparkles, GraduationCap, BookOpen, Music, BookKey, TreePine, Award, CheckCircle2 } from 'lucide-react';
import { MASTER_DIVISIONS, MasterDivision, getDefaultPicForDivisi } from '../../database/master-data/divisions';
import { ProgramKerja } from '../types/proker';

interface SelectSeksiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSeksi: (seksiName: string, defaultPicName: string) => void;
  selectedYear: 2026 | 2027;
  existingPrograms: ProgramKerja[];
}

export const SelectSeksiModal: React.FC<SelectSeksiModalProps> = ({
  isOpen,
  onClose,
  onSelectSeksi,
  selectedYear,
  existingPrograms,
}) => {
  const [search, setSearch] = useState('');

  const filteredDivisions = useMemo(() => {
    if (!search.trim()) return MASTER_DIVISIONS;
    const q = search.toLowerCase();
    return MASTER_DIVISIONS.filter(
      (d) =>
        d.nama.toLowerCase().includes(q) ||
        d.defaultPic.toLowerCase().includes(q) ||
        d.deskripsi.toLowerCase().includes(q)
    );
  }, [search]);

  // Count programs per division for the current year
  const countMap = useMemo(() => {
    const map: Record<string, number> = {};
    existingPrograms.forEach((p) => {
      if (p.tahun === selectedYear) {
        const div = p.penanggungjawab?.divisi || 'Seksi Umum';
        map[div] = (map[div] || 0) + 1;
      }
    });
    return map;
  }, [existingPrograms, selectedYear]);

  if (!isOpen) return null;

  const getSeksiIcon = (code: string) => {
    switch (code) {
      case 'DPPH':
        return <Building2 className="w-5 h-5 text-indigo-600" />;
      case 'SEK-KEAMANAN':
        return <Shield className="w-5 h-5 text-amber-600" />;
      case 'SEK-UMUM':
        return <Building2 className="w-5 h-5 text-slate-600" />;
      case 'SEK-KOMSOS':
        return <Radio className="w-5 h-5 text-blue-600" />;
      case 'SEK-MUDA':
        return <Users className="w-5 h-5 text-orange-600" />;
      case 'SEK-HAK':
        return <HeartHandshake className="w-5 h-5 text-teal-600" />;
      case 'SEK-PSE':
        return <HeartHandshake className="w-5 h-5 text-rose-600" />;
      case 'SEK-KELUARGA':
        return <Home className="w-5 h-5 text-pink-600" />;
      case 'SEK-KKI':
        return <Sparkles className="w-5 h-5 text-yellow-600" />;
      case 'SEK-EVANGELISASI':
        return <Sparkles className="w-5 h-5 text-purple-600" />;
      case 'SEK-PENDIDIKAN':
        return <GraduationCap className="w-5 h-5 text-cyan-600" />;
      case 'SEK-KKS':
        return <BookOpen className="w-5 h-5 text-emerald-600" />;
      case 'SEK-LITURGI':
        return <Music className="w-5 h-5 text-violet-600" />;
      case 'SEK-KATEKESE':
        return <BookKey className="w-5 h-5 text-amber-700" />;
      case 'SEK-PLBKS':
        return <TreePine className="w-5 h-5 text-emerald-700" />;
      case 'SEK-KERAWAM':
        return <Award className="w-5 h-5 text-red-600" />;
      default:
        return <Users className="w-5 h-5 text-slate-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Pilih Seksi yang Akan Menginput Program Kerja</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tahun Anggaran {selectedYear} · PIC otomatis diset sebagai Koordinator Seksi terpilih
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-slate-100 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari seksi (contoh: Keamanan, Liturgi, Komsos, PSE, Katekese)..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 focus:bg-white text-slate-900 font-medium"
            />
          </div>
        </div>

        {/* Seksi List Grid */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {filteredDivisions.map((div) => {
              const programCount = countMap[div.nama] || 0;
              return (
                <button
                  key={div.id}
                  type="button"
                  onClick={() => {
                    onSelectSeksi(div.nama, div.defaultPic || getDefaultPicForDivisi(div.nama));
                    onClose();
                  }}
                  className="text-left p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50/80 hover:shadow-xs transition-all flex items-start gap-3 group relative cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    {getSeksiIcon(div.code)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h3 className="text-xs font-bold text-slate-900 group-hover:text-slate-950 truncate">
                        {div.nama}
                      </h3>
                      {programCount > 0 && (
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded-full border border-emerald-200 shrink-0">
                          {programCount} Proker
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1 mt-0.5">
                      <span className="text-[10px] text-slate-400">PIC:</span>
                      <span className="truncate">{div.defaultPic}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-1 mt-1">
                      {div.deskripsi}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {filteredDivisions.length === 0 && (
            <div className="text-center py-8 text-xs text-slate-400">
              Tidak ditemukan seksi dengan kata kunci "{search}".
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Tersedia 15 Seksi Resmi + DPPH Paroki Katedral Medan</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
