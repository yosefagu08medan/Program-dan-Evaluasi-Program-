export interface SystemConfig {
  appTitle: string;
  parokiName: string;
  dioceseName: string;
  activeYears: (2026 | 2027)[];
  defaultYear: 2026 | 2027;
  schemaVersion: number;
  lastUpdated: string;
  storageKey: string;
  features: {
    enableCsvExport: boolean;
    enableJsonBackup: boolean;
    enableMobileFramePreview: boolean;
    enableAutoRecurringJadwal: boolean;
  };
}

export const SYSTEM_CONFIG: SystemConfig = {
  appTitle: 'Program Kerja Paroki St Perawan Maria Yang Dikandung Tanpa Noda Katedral Medan',
  parokiName: 'Paroki St Perawan Maria Yang Dikandung Tanpa Noda Katedral',
  dioceseName: 'Keuskupan Agung Medan',
  activeYears: [2026, 2027],
  defaultYear: 2026,
  schemaVersion: 2,
  lastUpdated: '2026-10-03',
  storageKey: 'proker_katedral_medan_2026_2027_v12',
  features: {
    enableCsvExport: true,
    enableJsonBackup: true,
    enableMobileFramePreview: true,
    enableAutoRecurringJadwal: true,
  },
};
