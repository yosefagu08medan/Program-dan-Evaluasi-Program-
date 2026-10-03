import React, { useState } from 'react';
import {
  Database,
  CheckCircle2,
  Clock,
  ShieldCheck,
  RefreshCw,
  Layers,
  ArrowRight,
  GitBranch,
  Server,
  FileCode,
  Tag,
  AlertCircle,
  X,
  Download,
  Upload,
} from 'lucide-react';
import { databaseService } from '../../database';
import { MasterMenu, MasterDivisi } from '../../database/types';

interface DatabaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged?: () => void;
}

export const DatabaseSyncModal: React.FC<DatabaseSyncModalProps> = ({
  isOpen,
  onClose,
  onDataChanged,
}) => {
  const [activeTab, setActiveTab] = useState<'migrations' | 'master' | 'transaksi' | 'pipeline'>('migrations');
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const dbStatus = databaseService.getMigrationStatus();
  const masterMenus = databaseService.getMasterMenus();
  const masterDivisi = databaseService.getMasterDivisi();
  const transactionalPrograms = databaseService.getTransactionalPrograms();

  const handleRunSync = () => {
    const { newlyExecutedCount } = databaseService.forceRerunMigrations();
    if (newlyExecutedCount > 0) {
      setSyncFeedback(`Berhasil menjalankan ${newlyExecutedCount} migration baru! Master data telah disinkronkan.`);
    } else {
      setSyncFeedback('Semua migration sudah terbaru (100% Up to Date). Data transaksi Anda tetap aman.');
    }
    if (onDataChanged) onDataChanged();
    setTimeout(() => setSyncFeedback(null), 4000);
  };

  const handleExportFullDB = () => {
    const fullState = databaseService.getState();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(fullState, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `paroki_katedral_full_db_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2">
                Status Database & Sistem Migrasi
                <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Version Controlled
                </span>
              </h3>
              <p className="text-[11px] text-slate-300">
                Arsitektur Sinkronisasi GitHub & Netlify (Anti-Reset & Idempotent UPSERT)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sync Feedback Toast */}
        {syncFeedback && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2.5 flex items-center gap-2 text-xs font-semibold text-emerald-900 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{syncFeedback}</span>
          </div>
        )}

        {/* Quick Health Summary Ribbon */}
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 grid grid-cols-3 gap-2 text-center shrink-0">
          <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] text-slate-500 font-semibold uppercase block">Migration Aktif</span>
            <span className="text-sm font-extrabold text-emerald-600 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {dbStatus.executedMigrations.length} / {dbStatus.totalMigrations}
            </span>
          </div>
          <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] text-slate-500 font-semibold uppercase block">Data Master</span>
            <span className="text-sm font-extrabold text-slate-900">
              {masterMenus.length + masterDivisi.length} Item
            </span>
          </div>
          <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] text-slate-500 font-semibold uppercase block">Data Transaksi</span>
            <span className="text-sm font-extrabold text-blue-600 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
              {transactionalPrograms.length} Proker
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 pt-3 border-b border-slate-200 flex items-center gap-2 shrink-0 bg-white">
          <button
            type="button"
            onClick={() => setActiveTab('migrations')}
            className={`pb-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'migrations'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Daftar Migrasi ({dbStatus.allMigrations.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('master')}
            className={`pb-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'master'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Master Data ({masterDivisi.length} Divisi/DPL)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pipeline')}
            className={`pb-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'pipeline'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Alur GitHub & Netlify</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: MIGRATIONS LIST */}
          {activeTab === 'migrations' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Riwayat Migration Terdaftar</h4>
                  <p className="text-[11px] text-slate-500">
                    Setiap migration memiliki stable versioning dan dijalankan otomatis saat Netlify deploy
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRunSync}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors shrink-0"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Jalankan Sinkronisasi</span>
                </button>
              </div>

              <div className="space-y-2">
                {dbStatus.allMigrations.map((mig) => {
                  const isExecuted = dbStatus.executedMigrations.includes(mig.id);
                  return (
                    <div
                      key={mig.id}
                      className="p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all flex items-start justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            isExecuted
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                              : 'bg-amber-50 text-amber-600 border border-amber-200'
                          }`}
                        >
                          {isExecuted ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                              {mig.id}
                            </span>
                            <span className="text-xs font-bold text-slate-900">{mig.name}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-1">{mig.description}</p>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border ${
                          isExecuted
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {isExecuted ? 'TERAPLIKASI' : 'PENDING'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Data Safety Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-[11px] text-blue-900">
                  <span className="font-bold block">Prinsip Aman Anti-Reset:</span>
                  Sistem migration menggunakan metode <strong>UPSERT</strong> (memperbarui bila berubah, menambah bila belum ada, dan tidak menyentuh data transaksi). Data program kerja buatan Anda tidak akan pernah terhapus saat deployment GitHub ke Netlify.
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MASTER DATA LIST */}
          {activeTab === 'master' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-900">Data Master Divisi, Seksi, & DPL (Version-Controlled)</h4>
                <p className="text-[11px] text-slate-500">
                  Data master ini tersimpan permanen di file repositori GitHub (`/database/master-data/divisions.ts`)
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
                {masterDivisi.map((div) => (
                  <div key={div.id} className="p-2.5 rounded-xl border border-slate-200 bg-white shadow-2xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900">{div.nama}</span>
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        {div.kategori}
                      </span>
                    </div>
                    <span className="font-mono text-[9px] text-slate-400 block truncate">
                      ID: {div.id}
                    </span>
                    {div.deskripsi && (
                      <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">{div.deskripsi}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Master Menus */}
              <div className="pt-3 border-t border-slate-200">
                <h4 className="text-xs font-bold text-slate-900 mb-1">Master Menu Navigasi</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {masterMenus.map((m) => (
                    <div key={m.id} className="p-2 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-800">{m.label}</span>
                        <span className="font-mono text-[9px] text-slate-400 block">ID: {m.id}</span>
                      </div>
                      {m.badge && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          {m.badge}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PIPELINE ALUR KERJA */}
          {activeTab === 'pipeline' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900">Alur Sinkronisasi Data AI Studio $\rightarrow$ GitHub $\rightarrow$ Netlify</h4>
              
              <div className="space-y-2">
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">Google AI Studio (Pengembangan)</h5>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Anda meminta penambahan menu atau data master baru di AI Studio. Kode master data dan file migration baru dibuat di folder <code>/database/migrations</code> dan <code>/database/master-data</code> dengan stable unique ID.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">Sync GitHub</h5>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Seluruh source code beserta file migration dan master data di-push ke repository GitHub Anda secara rapi dan tercatat di commit history.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">Netlify Build & Deployment</h5>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Netlify memicu build script <code>npm run build</code> yang menjalankan verifikasi server-side (<code>tsx scripts/verify-migrations.ts</code>) sebelum mengompilasi Vite.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-emerald-50/70 border-emerald-200 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    4
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-emerald-950">Website Terbuka di Netlify Production</h5>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      Database Service mendeteksi migration baru, melakukan <strong>UPSERT otomatis</strong> terhadap menu dan data master baru, sementara <strong>seluruh data program kerja pengguna yang ada dipertahankan 100% tanpa reset</strong>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleExportFullDB}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Backup Database Snapshot (JSON)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs shrink-0">
          <span className="text-[11px] text-slate-500">
            Terakhir disinkronkan: {new Date(dbStatus.lastSyncTimestamp).toLocaleString('id-ID')}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-2xs"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
