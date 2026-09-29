import type { HelpContent } from './types'

export const structureHelp: Record<string, HelpContent> = {
  'structures.view': {
    key: 'structures.view',
    judul: 'Panduan Struktur Organisasi & Tupoksi',
    ringkasan:
      'Halaman ini memvisualisasikan hierarki bagan struktur kepengurusan organisasi, alur koordinasi kepemimpinan, serta rincian Tugas Pokok dan Fungsi (Tupoksi) per seksi.',
    langkah: [
      {
        judul: 'Pilih Orientasi Bagan Visual',
        deskripsi:
          'Gunakan tombol sakelar orientasi di kanan atas untuk beralih antara tampilan bagan horizontal (ke samping) atau vertikal (ke bawah) sesuai preferensi layar.',
      },
      {
        judul: 'Eksplorasi Kotak Jabatan / Seksi',
        deskripsi:
          'Arahkan kursor atau sentuh kotak simpul (node) pengurus untuk melihat nama personel pemegang amanah, jabatan, serta seksi yang dinaungi.',
      },
      {
        judul: 'Buka Rincian Tupoksi Lengkap',
        deskripsi:
          'Klik pada kartu jabatan atau seksi untuk memunculkan modal dialog Tupoksi yang merinci deskripsi wewenang, fungsi koordinasi, dan indikator tanggung jawab jabatan.',
      },
      {
        judul: 'Menghubungkan Program Kerja ke Seksi',
        deskripsi:
          'Struktur seksi yang terdaftar di bagan ini menjadi acuan pemilihan "Seksi Pelaksana" saat membuat Program Kerja baru.',
      },
    ],
    tips: [
      'Klik tombol "Tutup" atau tekan tombol Esc pada keyboard untuk menutup modal detail Tupoksi.',
      'Gunakan scroll mouse atau drag sentuh untuk menggeser kanvas bagan hierarki jika ukuran struktur organisasi melebihi batas layar.',
    ],
    terkait: ['programs.list', 'tasks.list', 'users.list'],
  },
}
