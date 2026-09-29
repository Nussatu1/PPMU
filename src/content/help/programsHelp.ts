import type { HelpContent } from './types'

export const programsHelp: Record<string, HelpContent> = {
  'programs.list': {
    key: 'programs.list',
    judul: 'Panduan Daftar Program Kerja',
    ringkasan:
      'Halaman utama pengelolaan program kerja organisasi yang memuat daftar seluruh rencana program, target waktu, alokasi pagu anggaran, serta status pelaksanaan.',
    langkah: [
      {
        judul: 'Pencarian & Penyaringan Program',
        deskripsi:
          'Gunakan kotak filter di atas tabel untuk mencari program kerja berdasarkan kata kunci judul atau kode program (misal "PRG-2026-001").',
      },
      {
        judul: 'Meninjau Status & Pagu Anggaran',
        deskripsi:
          'Kolom tabel menampilkan kode program, seksi pelaksana, PIC penanggung jawab, rentang tanggal pelaksanaan, pagu dana dialokasikan, dan badge status program.',
      },
      {
        judul: 'Menambah Program Baru',
        deskripsi:
          'Klik tombol "Buat Program" di pojok kanan atas untuk membuka halaman formulir penyusunan program kerja baru.',
      },
      {
        judul: 'Mengedit atau Menghapus Data Program',
        deskripsi:
          'Klik tombol ikon pensil pada baris program untuk mengubah rincian informasi program, atau ikon tempat sampah untuk menghapus program yang dibatalkan.',
      },
    ],
    tips: [
      'Program kerja yang telah disetujui akan otomatis muncul sebagai opsi "Pos Sumber Pagu Anggaran" pada modul Keuangan.',
      'Pastikan rentang tanggal mulai dan selesai program telah disesuaikan dengan siklus kalender kerja tahunan organisasi.',
    ],
    terkait: ['programs.create', 'agendas.list', 'finance.list'],
  },

  'programs.create': {
    key: 'programs.create',
    judul: 'Cara Menyusun Program Kerja Baru',
    ringkasan:
      'Formulir pendaftaran program kerja strategis organisasi untuk mendefinisikan seksi pelaksana, penanggung jawab lapangan, alokasi pagu dana, serta jadwal pelaksanaan.',
    langkah: [
      {
        judul: 'Tetapkan Kode Program (code)',
        deskripsi:
          'Masukkan nomor kode unik identitas program (contoh format: "PRG-2026-001") pada field 4 kolom compact. Kode ini digunakan dalam penelusuran dokumen dan akuntansi.',
      },
      {
        judul: 'Tentukan Alokasi Pagu Anggaran (budget_amount)',
        deskripsi:
          'Masukkan estimasi pagu dana yang disetujui untuk mendanai keseluruhan kegiatan program ini dalam angka Rupiah tanpa tanda baca manual.',
      },
      {
        judul: 'Pilih Seksi Pelaksana & PIC (section_id & pic_name)',
        deskripsi:
          'Pilih seksi kepengurusan yang membidangi program dari dropdown, lalu isi nama lengkap personel penanggung jawab utama (Person In Charge / PIC).',
      },
      {
        judul: 'Tentukan Jadwal Pelaksanaan (start_date & end_date)',
        deskripsi:
          'Pilih tanggal mulai dan batas akhir pelaksanaan program menggunakan DatePicker. Pastikan tanggal selesai tidak mendahului tanggal mulai.',
      },
      {
        judul: 'Tulis Nama Lengkap Program (title)',
        deskripsi:
          'Ketik judul program kerja secara jelas dan spesifik pada kolom full-width (contoh: "Pelatihan Kepemimpinan Kader Tingkat Menengah").',
      },
      {
        judul: 'Uraikan Deskripsi & Indikator Output (description)',
        deskripsi:
          'Jelaskan latar belakang, tujuan sasaran, penerima manfaat, dan tolok ukur keberhasilan program pada area teks ringkas yang dapat memanjang otomatis (autoGrow).',
      },
      {
        judul: 'Simpan Program Kerja',
        deskripsi:
          'Klik tombol "Buat" untuk memproses data dan kembali ke daftar program kerja, atau "Buat & Buat Lainnya" jika ingin mendaftarkan beberapa program kerja sekaligus.',
      },
    ],
    tips: [
      'Gunakan format kode program standar organisasi agar pengurutan dan pencarian data tetap rapi.',
      'Pagu anggaran yang ditentukan di sini akan menjadi batas atas penyerapan anggaran operasional pada modul Keuangan.',
    ],
    terkait: ['programs.list', 'agendas.create', 'finance.create'],
  },

  'programs.edit': {
    key: 'programs.edit',
    judul: 'Cara Memperbarui Program Kerja',
    ringkasan:
      'Halaman ini digunakan untuk memperbarui rincian program kerja yang sedang berjalan, seperti penyesuaian jadwal pelaksanaan, pergantian PIC, atau revisi deskripsi sasaran.',
    langkah: [
      {
        judul: 'Verifikasi Kode & Pagu Anggaran',
        deskripsi:
          'Periksa kembali kode program dan sesuaikan besaran pagu anggaran jika terdapat adendum atau persetujuan revisi anggaran.',
      },
      {
        judul: 'Perbarui PIC atau Seksi Pelaksana',
        deskripsi:
          'Ganti nama PIC jika terjadi mutasi atau pergantian penanggung jawab kegiatan di lapangan.',
      },
      {
        judul: 'Perpanjang atau Sesuaikan Rentang Tanggal',
        deskripsi:
          'Perbarui tanggal mulai dan tanggal selesai sesuai realitas kondisi pelaksanaan di lapangan menggunakan DatePicker.',
      },
      {
        judul: 'Simpan Perubahan',
        deskripsi:
          'Klik tombol "Perbarui" di bagian bawah formulir untuk menyimpan perubahan data ke sistem.',
      },
    ],
    tips: [
      'Jika program sudah memiliki transaksi pengeluaran tercatat, berhati-hatilah saat menurunkan nilai pagu anggaran agar tidak lebih kecil dari realisasi belanja saat ini.',
    ],
    terkait: ['programs.list', 'programs.create', 'performance.create'],
  },
}
