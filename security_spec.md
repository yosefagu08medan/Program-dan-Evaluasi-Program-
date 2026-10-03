# Security Specification & Test Plan

## 1. Data Invariants
- Each document in `/programs/{programId}` must have an `id` that matches the document path ID.
- The `tahun` field must be strictly either 2026 or 2027.
- `namaProgram` must be a non-empty string under 300 characters.
- `status` must be one of `['direncanakan', 'berjalan', 'selesai', 'ditunda']`.
- `estimasiAnggaran` must be a non-negative number.
- `penanggungjawab` must be a valid map containing at least `divisi`.
- Unknown or ghost fields are blocked on write.

## 2. Dirty Dozen Payloads (Security Edge Cases)
1. Missing `namaProgram`: Payload without `namaProgram` -> Expected: PERMISSION_DENIED.
2. Invalid `tahun` (e.g. 2019 or 2030) -> Expected: PERMISSION_DENIED.
3. Negative `estimasiAnggaran` (-5000000) -> Expected: PERMISSION_DENIED.
4. Oversized `namaProgram` (>300 chars) -> Expected: PERMISSION_DENIED.
5. Invalid status string ("deleted" or "hacked") -> Expected: PERMISSION_DENIED.
6. Shadow Ghost Field (injection of `__isAdmin: true`) -> Expected: PERMISSION_DENIED.
7. ID Mismatch (`docId: 'proker-01'` with payload `id: 'proker-99'`) -> Expected: PERMISSION_DENIED.
8. Injection attack on document path ID with special symbols or path traversal.
9. Array explosion (>12 months in `bulanPelaksanaan`).
10. Attempting to write unauthenticated when auth is required.
11. Attempting to tamper with system collections.
12. Attempting to delete non-existent or foreign records without valid ID.
