# Program Kerja Paroki Katedral Medan 2026-2027

Aplikasi Manajemen & Evaluasi Program Kerja Paroki berbasis Web (React 19 + TypeScript + Vite + Tailwind CSS + Firebase Firestore).

---

## Panduan Menghubungkan ke Repositori GitHub Baru (Terpisah)

Jika Anda ingin meng-upload kode proyek ini ke repositori GitHub baru milik Anda sendiri dan mengembangkannya secara terpisah dari Google AI Studio:

### Langkah 1: Buat Repositori Baru di GitHub
1. Buka [github.com](https://github.com) dan login ke akun Anda.
2. Klik tombol **New** (Buat Repository Baru).
3. Beri nama repositori (contoh: `proker-katedral-medan`).
4. Pilih **Public** atau **Private**.
5. **Jangan centang** "Add a README file" atau "Add .gitignore" (karena file-file ini sudah ada di proyek).
6. Klik **Create repository**.
7. Salin URL repositori yang baru dibuat, misalnya:
   `https://github.com/<username-anda>/<nama-repo>.git`

---

### Langkah 2: Inisialisasi Git dan Push ke GitHub Baru
Jalankan perintah berikut di terminal komputer lokal Anda (atau di root folder proyek ini):

```bash
# 1. Inisialisasi repository git lokal
git init

# 2. Tambahkan semua file proyek
git add .

# 3. Buat commit pertama
git commit -m "feat: initial commit program kerja paroki katedral medan"

# 4. Ubah branch utama menjadi main
git branch -M main

# 5. Hubungkan ke repository GitHub baru Anda
git remote add origin https://github.com/<username-anda>/<nama-repo>.git

# 6. Push kode ke GitHub
git push -u origin main
```

---

### Langkah 3: Menjalankan & Mengedit di Komputer Lokal

Setelah repository berada di GitHub, Anda atau rekan Anda dapat mengeditnya secara independen:

1. **Clone repository ke komputer lokal**:
   ```bash
   git clone https://github.com/<username-anda>/<nama-repo>.git
   cd <nama-repo>
   ```

2. **Install dependency**:
   ```bash
   npm install
   ```

3. **Jalankan development server**:
   ```bash
   npm run dev
   ```
   Aplikasi akan terbuka di browser pada `http://localhost:3000`.

4. **Build untuk production (deploy Netlify / Vercel / Cloudflare Pages)**:
   ```bash
   npm run build
   ```
   Hasil build siap saji akan berada di folder `dist/`.

---

## Catatan Penting Mengenai Edit Terpisah:
- **Kode Terpisah**: Semua perubahan kode (fitur baru, styling, halaman baru) yang Anda `push` ke repositori GitHub baru tersebut bersifat mandiri dan **tidak akan mengganggu atau mengubah kode di AI Studio**.
- **Database Firebase**: Konfigurasi koneksi Firestore berada di `firebase-applet-config.json`. Jika Anda ingin database yang benar-benar terpisah untuk lingkungan pengujian/staging, Anda cukup mengganti konfigurasi Firebase tersebut dengan project Firebase baru Anda di [Firebase Console](https://console.firebase.google.com).
