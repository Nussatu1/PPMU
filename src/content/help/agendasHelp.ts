import type { HelpContent } from './types'

export const agendasHelp: Record<string, HelpContent> = {
  'agendas.list': {
    key: 'agendas.list',
    judul: 'Panduan Daftar Agenda & Kegiatan',
    ringkasan:
      'Pusat manajemen jadwal kegiatan organisasi yang memuat agenda rapat, pelatihan, seremonial, dan eksekusi lapangan beserta waktu pelaksanaan serta PIC.',
    langkah: [
      {
        judul: 'Pencarian & Filter Agenda',
        deskripsi:
          'Gunakan kotak filter dan dropdown status untuk menyaring kegiatan berdasarkan kategori jadwal (Terjadwal, Berlangsung, Selesai, atau Dibatalkan).',
      },
      {
        judul: 'Memeriksa Waktu & Lokasi',
        deskripsi:
          'Setiap baris agenda menampilkan tanggal & jam pelaksanaan lengkap, nama program induk, PIC, lokasi tempat acara, dan anggaran yang dialokasikan.',
      },
      {
        judul: 'Menambah Agenda Baru',
        deskripsi:
          'Klik tombol "Jadwalkan Agenda" di pojok kanan atas untuk membuka formulir pembuatan jadwal kegiatan baru.',
      },
      {
        judul: 'Aksi Cepat & Pembaruan Status',
        deskripsi:
          'Gunakan tombol aksi edit untuk mengubah informasi rundown acara atau klik tombol hapus untuk membatalkan agenda yang tidak jadi terlaksana.',
      },
    ],
    tips: [
      'Gunakan status "Berlangsung" saat acara sedang bergulir agar seluruh anggota tim dapat memantau kegiatan aktif dari dashboard.',
    ],
    terkait: ['agendas.create', 'programs.list', 'tasks.list'],
  },

  'agendas.create': {
    key: 'agendas.create',
    judul: 'Cara Menjadwalkan Agenda & Kegiatan',
    ringkasan:
      'Formulir pembuatan agenda kegiatan resmi untuk menetapkan waktu mulai & selesai dengan DateTimePicker, lokasi acara, PIC, serta susunan acara.',
    langkah: [
      {
        judul: 'Tulis Judul Lengkap Kegiatan (title)',
        deskripsi:
          'Masukkan nama acara/kegiatan secara jelas pada kolom utama (contoh: "Rapat Kerja Koordinasi Bulanan Seksi Pengembangan").',
      },
      {
        judul: 'Pilih Program Induk & Lokasi (program_id & location)',
        deskripsi:
          'Hubungkan agenda ini dengan Program Kerja induk yang membawahinya, lalu ketikkan nama tempat/ruangan atau tautan Zoom/Meet pada field Lokasi.',
      },
      {
        judul: 'Atur Waktu Mulai & Waktu Selesai (start_time & end_time)',
        deskripsi:
          'Gunakan kontrol terpadu DateTimePicker. Klik untuk memilih tanggal pada kalender, kemudian pilih jam dan menit acara pada kolom waktu di sampingnya.',
      },
      {
        judul: 'Tentukan PIC Lapangan & Estimasi Anggaran (pic_name & budget)',
        deskripsi:
          'Ketik nama personel penanggung jawab teknis acara dan estimasi biaya operasional yang dibutuhkan untuk pelaksanaan agenda ini.',
      },
      {
        judul: 'Tentukan Status Awal Agenda (status)',
        deskripsi:
          'Pilih status kegiatan dari dropdown: "Terjadwal" (scheduled) untuk acara yang akan datang, atau "Berlangsung" jika acara sudah dimulai.',
      },
      {
        judul: 'Uraikan Susunan Acara & Rundown (description)',
        deskripsi:
          'Tuliskan agenda pembahasan, susunan acara jam demi jam, daftar perlengkapan, atau instruksi kehadiran untuk peserta pada area teks.',
      },
      {
        judul: 'Simpan Agenda',
        deskripsi:
          'Klik tombol "Buat" untuk menjadwalkan kegiatan, atau "Buat & Buat Lainnya" untuk langsung menyusun agenda berikutnya secara efisien.',
      },
    ],
    tips: [
      'DateTimePicker mendukung input waktu format 24 jam (HH:mm). Pastikan jam selesai lebih besar dari jam mulai untuk acara di hari yang sama.',
      'Jika acara berlangsung lintas hari, pastikan memilih tanggal akhir yang sesuai pada pemilih kalender.',
    ],
    terkait: ['agendas.list', 'programs.list', 'finance.create'],
  },

  'agendas.edit': {
    key: 'agendas.edit',
    judul: 'Cara Memperbarui Agenda Kegiatan',
    ringkasan:
      'Halaman ini digunakan untuk memperbarui data agenda yang telah dijadwalkan, seperti penundaan waktu, perubahan lokasi venue, atau perubahan status penyelesaian acara.',
    langkah: [
      {
        judul: 'Perbarui Waktu atau Tempat Acara',
        deskripsi:
          'Jika terjadi pergeseran jadwal, klik kolom tanggal & waktu untuk memilih ulang jam dan tanggal yang baru, serta perbarui nama lokasi.',
      },
      {
        judul: 'Eskalasi Status Kegiatan',
        deskripsi:
          'Ubah status kegiatan dari "Terjadwal" menjadi "Berlangsung", atau menjadi "Selesai" setelah seluruh rangkaian acara tuntas terlaksana.',
      },
      {
        judul: 'Perbarui Catatan Rundown',
        deskripsi:
          'Tambahkan catatan hasil notulensi ringkas atau perubahan susunan pembicara pada kolom deskripsi.',
      },
      {
        judul: 'Simpan Pembaruan',
        deskripsi:
          'Klik tombol "Perbarui" di sudut bawah halaman untuk menyimpan perubahan jadwal ke seluruh sistem.',
      },
    ],
    tips: [
      'Menandai status menjadi "Selesai" mempermudah seksi pelaksana saat menyusun Laporan Evaluasi Kinerja program.',
    ],
    terkait: ['agendas.list', 'agendas.create', 'reports.create'],
  },
}
