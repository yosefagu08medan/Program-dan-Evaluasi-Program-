import React from 'react';
import { ListFilter, Calendar, BarChart3, FileSpreadsheet, Plus } from 'lucide-react';

export type ActiveTab = 'list' | 'timeline' | 'analytics' | 'report';

interface BottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenCreateModal: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenCreateModal,
}) => {
  return (
    <nav
      aria-label="Navigasi Bawah"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 pb-safe no-print shadow-lg shadow-slate-900/5"
    >
      <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between relative">
        {/* Tab 1: Daftar Proker */}
        <button
          type="button"
          onClick={() => setActiveTab('list')}
          className={`flex-1 min-h-[44px] flex flex-col items-center justify-center transition-colors ${
            activeTab === 'list'
              ? 'text-slate-900 font-bold'
              : 'text-slate-400 hover:text-slate-600 font-medium'
          }`}
        >
          <ListFilter className="w-5 h-5" />
          <span className="text-[10px] mt-1 tracking-tight">Proker</span>
        </button>

        {/* Tab 2: Kalender & Timeline */}
        <button
          type="button"
          onClick={() => setActiveTab('timeline')}
          className={`flex-1 min-h-[44px] flex flex-col items-center justify-center transition-colors ${
            activeTab === 'timeline'
              ? 'text-slate-900 font-bold'
              : 'text-slate-400 hover:text-slate-600 font-medium'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[10px] mt-1 tracking-tight">Jadwal</span>
        </button>

        {/* Center Floating Action Button (+) */}
        <div className="flex-1 flex justify-center -mt-6">
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="w-13 h-13 rounded-full bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center shadow-lg shadow-slate-900/25 active:scale-95 transition-all ring-4 ring-white"
            title="Tambah Program Kerja Baru"
            aria-label="Tambah Program Kerja"
          >
            <Plus className="w-6 h-6 text-emerald-400 stroke-[2.5]" />
          </button>
        </div>

        {/* Tab 3: Anggaran & Analitik */}
        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`flex-1 min-h-[44px] flex flex-col items-center justify-center transition-colors ${
            activeTab === 'analytics'
              ? 'text-slate-900 font-bold'
              : 'text-slate-400 hover:text-slate-600 font-medium'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px] mt-1 tracking-tight">Anggaran</span>
        </button>

        {/* Tab 4: Laporan & Ekspor */}
        <button
          type="button"
          onClick={() => setActiveTab('report')}
          className={`flex-1 min-h-[44px] flex flex-col items-center justify-center transition-colors ${
            activeTab === 'report'
              ? 'text-slate-900 font-bold'
              : 'text-slate-400 hover:text-slate-600 font-medium'
          }`}
        >
          <FileSpreadsheet className="w-5 h-5" />
          <span className="text-[10px] mt-1 tracking-tight">Laporan</span>
        </button>
      </div>
    </nav>
  );
};
