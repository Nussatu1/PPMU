import type { HelpContent } from './types'

export const reportsHelp: Record<string, HelpContent> = {
  'reports.list': {
    key: 'reports.list',
    judul: 'Panduan Daftar Laporan & Evaluasi',
    ringkasan:
      'Arsip resmi dokumentasi evaluasi berkala program kerja organisasi yang memuat ringkasan eksekutif, analisis serapan anggaran, hambatan, serta rekomendasi perbaikan.',
    langkah: [
      {
        judul: 'Pencarian & Penelusuran Dokumen Laporan',
        deskripsi:
          'Gunakan kotak filter untuk mencari laporan berdasarkan nama program kerja atau kata kunci judul laporan evaluasi.',
      },
      {
        judul: 'Memeriksa Realisasi Fisik & Anggaran',
        deskripsi:
          'Tinjau perbandingan antara capaian output kegiatan dengan besaran anggaran belanja yang telah terserap pada kolom tabel.',
      },
      {
        judul: 'Menyusun Laporan Evaluasi Baru',
        deskripsi:
          'Klik tombol "Buat Laporan" di pojok kanan atas untuk membuka formulir penyusunan laporan evaluasi program kerja.',
      },
      {
        judul: 'Membaca atau Mengunduh Rincian Laporan',
        deskripsi:
          'Klik tombol ikon dokumen atau aksi baris untuk membaca seluruh analisis kualitatif dan rekomendasi tindak lanjut.',
      },
    ],
    tips: [
      'Laporan evaluasi merupakan dasar pertimbangan utama bagi pimpinan dalam menentukan perpanjangan atau peningkatan anggaran program di periode berikutnya.',
    ],
    terkait: ['reports.create', 'programs.list', 'tasks.list'],
  },

  'reports.create': {
    key: 'reports.create',
    judul: 'Cara Menyusun Laporan Evaluasi Program',
    ringkasan:
      'Formulir komprehensif untuk menyusun laporan evaluasi resmi, memetakan realisasi anggaran belanja, kendala lapangan, serta rekomendasi tindak lanjut organisasi.',
    langkah: [
      {
        judul: 'Tulis Judul Resmi Laporan (title)',
        deskripsi:
          'Masukkan judul laporan yang jelas (contoh: "Laporan Evaluasi Pelaksanaan Bimtek Tata Kelola Administrasi Q1 2026").',
      },
      {
        judul: 'Pilih Program Induk & Periode (program_id & period)',
        deskripsi:
          'Pilih program kerja yang dievaluasi dari daftar dropdown dan tentukan periode pelaporan (misal: "Bulan Maret 2026").',
      },
      {
        judul: 'Verifikasi Anggaran Terealisasi (budget_spent)',
        deskripsi:
          'Masukkan akumulasi total biaya operasional riil yang telah dikeluarkan untuk pelaksanaan program ini dalam nominal Rupiah.',
      },
      {
        judul: 'Tulis Ringkasan Eksekutif Capaian (achievement_summary)',
        deskripsi:
          'Rangkum secara padat poin-poin utama keberhasilan, persentase output fisik, dan jumlah peserta/penerima manfaat yang terlayani.',
      },
      {
        judul: 'Uraikan Laporan Pelaksanaan Lengkap (content)',
        deskripsi:
          'Paparkan kronologi tahapan persiapan, pelaksanaan hari-H, respon peserta, dan hasil capaian pada area teks utama.',
      },
      {
        judul: 'Uraikan Kendala Lapangan (evaluation_constraints)',
        deskripsi:
          'Catat faktor penghambat teknis, logistik, maupun koordinasi internal yang dialami selama kegiatan berlangsung.',
      },
      {
        judul: 'Catat Pembelajaran Berharga (evaluation_lessons)',
        deskripsi:
          'Tuliskan intisari wawasan (lessons learned) yang didapatkan tim pelaksana agar kesalahan serupa tidak terulang di masa mendatang.',
      },
      {
        judul: 'Rumuskan Rekomendasi Tindak Lanjut (evaluation_recommendations)',
        deskripsi:
          'Berikan saran konkrit bagi pimpinan atau seksi pelaksana mengenai langkah mitigasi atau program kelanjutan yang perlu diagendakan.',
      },
      {
        judul: 'Simpan Laporan Evaluasi',
        deskripsi:
          'Klik tombol "Buat" untuk menerbitkan dokumen laporan ke dalam arsip resmi organisasi.',
      },
    ],
    tips: [
      'Rekomendasi yang Anda tulis di bagian akhir dapat langsung dikonversi menjadi penugasan kerja pada modul "Tugas & Tindak Lanjut".',
      'Pastikan nilai anggaran terealisasi selaras dengan mutasi belanja yang telah dibukukan pada modul Keuangan.',
    ],
    terkait: ['reports.list', 'finance.list', 'tasks.create'],
  },
}
