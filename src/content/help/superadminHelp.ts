import type { HelpContent } from './types'

export const superadminHelp: Record<string, HelpContent> = {
  'organizations.list': {
    key: 'organizations.list',
    judul: 'Panduan Manajemen Multi-Tenant Organisasi',
    ringkasan:
      'Pusat kendali entitas kelembagaan dalam sistem multi-tenant Filament. Superadmin dapat mendaftarkan cabang/yayasan baru, meninjau status operasional, dan mengalihkan konteks kerja.',
    langkah: [
      {
        judul: 'Pencarian & Status Lembaga',
        deskripsi:
          'Gunakan tabel untuk memeriksa daftar seluruh organisasi yang terdaftar, status keaktifan (Aktif/Nonaktif), jumlah pengurus, serta tanggal pembentukan.',
      },
      {
        judul: 'Beralih Konteks Organisasi Aktif',
        deskripsi:
          'Klik tombol "Pilih" atau "Beralih" pada baris organisasi untuk masuk dan mengelola seluruh program kerja serta keuangan organisasi tersebut.',
      },
      {
        judul: 'Pendaftaran Organisasi Baru',
        deskripsi:
          'Klik tombol "Tambah Organisasi" untuk membuka formulir pendaftaran nama lembaga, kode unik tenant, dan data kontak resmi.',
      },
      {
        judul: 'Pengaturan & Pembaruan Profil Lembaga',
        deskripsi:
          'Gunakan aksi edit untuk memperbarui informasi dasar, logo lembaga, atau status operasional organisasi.',
      },
    ],
    tips: [
      'Setiap data program kerja, anggaran, dan agenda terisolasi secara aman di tingkat tenant masing-masing organisasi (Row Level Security).',
    ],
    terkait: ['admins.list', 'roles.list', 'audit-logs.list'],
  },

  'admins.list': {
    key: 'admins.list',
    judul: 'Panduan Pengelolaan Administrator Lembaga',
    ringkasan:
      'Halaman penugasan dan pengelolaan akun administrator untuk masing-masing cabang organisasi dalam sistem Filament.',
    langkah: [
      {
        judul: 'Meninjau Hak Akses Admin',
        deskripsi:
          'Periksa daftar admin yang terdaftar, lembaga yang dinaungi, tingkat kewenangan, dan waktu sesi login terakhir.',
      },
      {
        judul: 'Pemberian Akses Admin Baru',
        deskripsi:
          'Klik tombol "Tambah Admin" untuk menetapkan personel terpilih menjadi administrator suatu organisasi dengan kredensial aman.',
      },
      {
        judul: 'Penguncian atau Pencabutan Akses',
        deskripsi:
          'Gunakan sakelar status atau tombol tindakan pada baris tabel untuk menonaktifkan akun admin yang sudah purna tugas.',
      },
    ],
    tips: [
      'Gunakan kata sandi berkekuatan tinggi dan pastikan alamat email admin terverifikasi sebelum menyerahkan kredensial akun.',
    ],
    terkait: ['organizations.list', 'roles.list', 'audit-logs.list'],
  },

  'roles.list': {
    key: 'roles.list',
    judul: 'Panduan Matriks Hak Akses & Izin (RBAC)',
    ringkasan:
      'Konfigurasi terpadu Role-Based Access Control (RBAC) yang memetakan perizinan modul (baca, buat, edit, hapus) untuk setiap tingkatan peran pengguna.',
    langkah: [
      {
        judul: 'Pahami Matriks Perizinan',
        deskripsi:
          'Tabel matriks menampilkan daftar sumber daya sistem (Modul Program, Keuangan, Laporan, Pengguna) secara vertikal dan peran pengguna secara horizontal.',
      },
      {
        judul: 'Memeriksa Izin Spesifik Peran',
        deskripsi:
          'Tanda centang atau badge hijau menunjukkan bahwa peran tersebut memiliki wewenang untuk melihat (Read), membuat (Create), mengubah (Update), atau menghapus (Delete).',
      },
      {
        judul: 'Menyesuaikan Kebijakan Keamanan',
        deskripsi:
          'Hanya peran Superadmin yang memiliki wewenang penuh tanpa batas di seluruh tenant organisasi.',
      },
    ],
    tips: [
      'Prinsip "Least Privilege": berikan izin paling minimum yang cukup bagi pengguna untuk menuntaskan tanggung jawab kerja mereka.',
    ],
    terkait: ['admins.list', 'users.list', 'audit-logs.list'],
  },

  'audit-logs.list': {
    key: 'audit-logs.list',
    judul: 'Panduan Audit Log & Jejak Keamanan',
    ringkasan:
      'Catatan riwayat aktivitas sistem yang merekam seluruh aksi krusial (pembuatan data, pengubahan, penghapusan, dan autentikasi) untuk akuntabilitas kepatuhan.',
    langkah: [
      {
        judul: 'Penyaringan Rekaman Berdasarkan Modul & Aktor',
        deskripsi:
          'Gunakan filter pencarian untuk menelusuri aktivitas seorang pengguna tertentu atau membatasi pada modul yang mengalami perubahan (misal: "Keuangan").',
      },
      {
        judul: 'Melihat Jenis Aksi (Action)',
        deskripsi:
          'Perhatikan badge warna aksi: Hijau untuk CREATE (data baru), Biru untuk UPDATE (perubahan), Merah untuk DELETE (penghapusan data).',
      },
      {
        judul: 'Membuka Rincian Perubahan Data (Payload)',
        deskripsi:
          'Klik tombol "Detail" pada baris log audit untuk melihat rekaman JSON selisih data lama versus data baru yang tersimpan di sistem.',
      },
      {
        judul: 'Pembersihan Log Riwayat (Superadmin)',
        deskripsi:
          'Gunakan tombol "Bersihkan Log" dengan memasukkan kata kunci konfirmasi keamanan jika ingin mengarsipkan log lama.',
      },
    ],
    tips: [
      'Data audit log disimpan dengan atribut immutable dan tidak dapat diubah oleh pengguna biasa.',
    ],
    terkait: ['organizations.list', 'admins.list', 'finance.list'],
  },
}
