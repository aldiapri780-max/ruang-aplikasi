# Ruang Aplikasi — Website dengan Supabase

Website responsif untuk HP dan desktop. Fitur:
- Daftar akun dan login email/password.
- Profil pengguna dan role `user` / `admin`.
- Dashboard admin.
- Tambah dan hapus produk.
- Daftar produk untuk pengguna yang login.
- Penyimpanan data otomatis ke Supabase.
- Row Level Security (RLS) di database.

## 1. Buat database Supabase
1. Buka https://supabase.com/ lalu daftar/login.
2. Buat project baru dan simpan password database di tempat aman.
3. Buka **SQL Editor** di dashboard Supabase.
4. Buka file `supabase/schema.sql` dari proyek ini, salin seluruh isinya, lalu jalankan di SQL Editor.
5. Buka **Project Settings > API** (atau Connect/API Keys pada dashboard baru).
6. Salin Project URL dan **publishable key** (atau anon/public key lama). Jangan gunakan `service_role` / secret key di frontend.

## 2. Jalankan di komputer
Perlu Node.js versi 20 atau lebih baru.
1. Ekstrak ZIP.
2. Di folder proyek, buat file `.env` dengan isi:
   ```
   VITE_SUPABASE_URL=https://PROJECT_ID.supabase.co
   VITE_SUPABASE_ANON_KEY=ISI_PUBLISHABLE_ATAU_ANON_KEY
   ```
3. Jalankan:
   ```
   npm install
   npm run dev
   ```
4. Buka alamat lokal yang ditampilkan Vite.

## 3. Jadikan akun pertama sebagai admin
1. Buka website dan daftar akun memakai email milikmu.
2. Jika konfirmasi email aktif, buka email dan konfirmasi akun.
3. Di Supabase, buka **SQL Editor** dan jalankan (ganti email):
   ```
   update public.profiles
   set role = 'admin'
   where id = (select id from auth.users where email = 'emailkamu@example.com');
   ```
4. Keluar lalu masuk kembali. Dashboard admin akan menampilkan form tambah/hapus produk.
5. Akun yang mendaftar berikutnya otomatis memiliki role `user`.

## 4. Publikasikan online gratis (Vercel)
1. Buat akun https://github.com dan https://vercel.com.
2. Upload seluruh isi folder proyek ke repository GitHub baru.
3. Di Vercel pilih **Add New > Project**, lalu impor repository tadi.
4. Framework preset: **Vite**. Build command `npm run build`; output directory `dist`.
5. Di **Environment Variables**, masukkan:
   - `VITE_SUPABASE_URL` = Project URL Supabase
   - `VITE_SUPABASE_ANON_KEY` = publishable/anon key Supabase
6. Tekan Deploy. Vercel akan memberi alamat `https://....vercel.app`.
7. Di Supabase buka **Authentication > URL Configuration**. Isi **Site URL** dengan alamat Vercel. Tambahkan juga alamat itu ke **Redirect URLs**.
8. Tes daftar akun, login, dan fitur admin melalui link online.

## 5. Publikasi alternatif: Netlify
- Build command: `npm run build`
- Publish directory: `dist`
- Tambahkan dua environment variables yang sama sebelum deploy.
- Setelah deploy, masukkan URL Netlify ke Supabase Authentication > URL Configuration.

## Keamanan penting
- Publishable/anon key memang dipakai di browser; keamanan data ditegakkan oleh RLS di `schema.sql`.
- Jangan pernah menaruh `service_role` key, password database, atau secret key dalam file frontend, GitHub, maupun Vercel environment yang berawalan `VITE_`.
- Role admin hanya boleh diubah dari dashboard Supabase oleh pemilik project.
- Website ini adalah starter aplikasi generik. Domain, akun Supabase, dan hosting harus dibuat/diaktifkan oleh pemilik; file proyek saja belum membuat website live.
- Untuk menerima gambar produk, gunakan URL gambar publik yang tepercaya. Upload file gambar langsung memerlukan konfigurasi Supabase Storage tambahan.

## Isi proyek
- `src/main.js` — login, pendaftaran, dashboard, CRUD produk.
- `src/style.css` — tampilan responsif.
- `supabase/schema.sql` — tabel, trigger profil, dan kebijakan RLS.
- `.env.example` — contoh konfigurasi.
