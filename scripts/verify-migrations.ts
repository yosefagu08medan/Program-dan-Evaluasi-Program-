/**
 * Netlify / Server-Side Build-Time Migration Verification & Compilation Script
 * Runs during `npm run build` prior to frontend compilation.
 */
import { MIGRATION_REGISTRY } from '../database/migrations/migrationRunner';
import { MASTER_MENUS } from '../database/master-data/menus';
import { MASTER_DIVISI } from '../database/master-data/divisions';
import { SEED_PROGRAMS } from '../database/seed/seedPrograms';

console.log('=====================================================');
console.log('⚡ [Database Migration Engine] Running Server-Side Check...');
console.log('=====================================================');

// 1. Verify Migration Registry
console.log(`📌 Found ${MIGRATION_REGISTRY.length} registered migration(s):`);
const migrationIds = new Set<string>();

MIGRATION_REGISTRY.forEach((m, idx) => {
  if (!m.id) {
    throw new Error(`[Migration Error] Migration at index ${idx} is missing an ID!`);
  }
  if (migrationIds.has(m.id)) {
    throw new Error(`[Migration Error] Duplicate migration ID found: ${m.id}`);
  }
  migrationIds.add(m.id);
  console.log(`  ✓ [${m.id}] ${m.name}`);
});

// 2. Verify Master Menus Unique Stable IDs
console.log(`\n📌 Verifying ${MASTER_MENUS.length} Master Menus:`);
const menuIds = new Set<string>();
MASTER_MENUS.forEach((menu) => {
  if (!menu.id || menu.id.trim() === '') {
    throw new Error(`[Master Menu Error] Menu "${menu.label}" is missing a stable ID!`);
  }
  if (menuIds.has(menu.id)) {
    throw new Error(`[Master Menu Error] Duplicate menu ID found: ${menu.id}`);
  }
  menuIds.add(menu.id);
  console.log(`  ✓ Menu [${menu.id}] -> "${menu.label}" (Order: ${menu.order})`);
});

// 3. Verify Master Divisi Unique Stable IDs
console.log(`\n📌 Verifying ${MASTER_DIVISI.length} Master Divisi / Seksi / DPL:`);
const divisiIds = new Set<string>();
MASTER_DIVISI.forEach((div) => {
  if (!div.id || div.id.trim() === '') {
    throw new Error(`[Master Divisi Error] Divisi "${div.nama}" is missing a stable ID!`);
  }
  if (divisiIds.has(div.id)) {
    throw new Error(`[Master Divisi Error] Duplicate divisi ID found: ${div.id}`);
  }
  divisiIds.add(div.id);
  console.log(`  ✓ Divisi [${div.id}] -> "${div.nama}" (Kategori: ${div.kategori})`);
});

// 4. Verify Seed Programs
console.log(`\n📌 Verifying ${SEED_PROGRAMS.length} Seed Program(s):`);
SEED_PROGRAMS.forEach((prog) => {
  if (!prog.id) {
    throw new Error(`[Seed Program Error] Seed program "${prog.namaProgram}" missing ID!`);
  }
  console.log(`  ✓ Program [${prog.id}] -> "${prog.namaProgram}" (Tahun: ${prog.tahun})`);
});

console.log('\n=====================================================');
console.log('✅ [Database Migration Engine] ALL CHECKS PASSED!');
console.log('✅ Master data & migrations are valid for Netlify deployment.');
console.log('=====================================================\n');
