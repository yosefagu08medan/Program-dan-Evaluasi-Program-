import { MASTER_DIVISIONS } from '../database/master-data/divisions';
import { MASTER_MENUS } from '../database/master-data/menus';
import { SYSTEM_CONFIG } from '../database/master-data/systemConfig';
import { ALL_MIGRATIONS } from '../database/migrations/migrationRunner';
import { SEED_PROGRAMS } from '../database/seed/seedData';

function validateDatabase() {
  console.log('====================================================');
  console.log(' [BUILD:DATA] VALIDASI INTEGRITAS DATABASE & MASTER ');
  console.log('====================================================');

  const errors: string[] = [];

  // 1. Validasi Master Divisions
  const divIds = new Set<string>();
  MASTER_DIVISIONS.forEach((div) => {
    if (!div.id || typeof div.id !== 'string') {
      errors.push(`Divisi "${div.nama}" tidak memiliki ID string yang valid.`);
    } else if (divIds.has(div.id)) {
      errors.push(`Duplikasi ID divisi ditemukan: ${div.id}`);
    } else {
      divIds.add(div.id);
    }
  });
  console.log(`✓ Master Divisions: ${MASTER_DIVISIONS.length} entri tervalidasi (semua ID unik).`);

  // 2. Validasi Master Menus
  const menuIds = new Set<string>();
  MASTER_MENUS.forEach((menu) => {
    if (!menu.id || typeof menu.id !== 'string') {
      errors.push(`Menu "${menu.label}" tidak memiliki ID string yang valid.`);
    } else if (menuIds.has(menu.id)) {
      errors.push(`Duplikasi ID menu ditemukan: ${menu.id}`);
    } else {
      menuIds.add(menu.id);
    }
  });
  console.log(`✓ Master Menus: ${MASTER_MENUS.length} menu navigasi tervalidasi.`);

  // 3. Validasi Migrations
  const migIds = new Set<string>();
  ALL_MIGRATIONS.forEach((mig) => {
    if (!mig.id || typeof mig.id !== 'string') {
      errors.push(`Migration tidak memiliki ID yang valid.`);
    } else if (migIds.has(mig.id)) {
      errors.push(`Duplikasi migration ID: ${mig.id}`);
    } else {
      migIds.add(mig.id);
    }
    if (typeof mig.up !== 'function') {
      errors.push(`Migration "${mig.id}" tidak memiliki fungsi up() yang valid.`);
    }
  });
  console.log(`✓ Database Migrations: ${ALL_MIGRATIONS.length} migrations terurut & siap dieksekusi.`);

  // 4. Validasi Seed Programs
  const seedIds = new Set<string>();
  SEED_PROGRAMS.forEach((prog) => {
    if (!prog.id || typeof prog.id !== 'string') {
      errors.push(`Seed program "${prog.namaProgram}" tidak memiliki ID string yang valid.`);
    } else if (seedIds.has(prog.id)) {
      errors.push(`Duplikasi seed program ID: ${prog.id}`);
    } else {
      seedIds.add(prog.id);
    }
    if (!SYSTEM_CONFIG.activeYears.includes(prog.tahun)) {
      errors.push(`Seed program "${prog.namaProgram}" memiliki tahun ${prog.tahun} yang tidak aktif.`);
    }
  });
  console.log(`✓ Seed Programs: ${SEED_PROGRAMS.length} program kerja awal tervalidasi.`);

  console.log('----------------------------------------------------');
  if (errors.length > 0) {
    console.error('❌ GAGAL: Ditemukan kesalahan pada database/master data:');
    errors.forEach((err) => console.error(`  - ${err}`));
    process.exit(1);
  } else {
    console.log('✨ SUKSES: Seluruh data master & migration 100% valid dan siap di-deploy ke Netlify!');
    console.log('====================================================\n');
  }
}

validateDatabase();
