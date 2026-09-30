import type { HelpContent } from './types'

export const tasksHelp: Record<string, HelpContent> = {
  'tasks.list': {
    key: 'tasks.list',
    judul: 'Panduan Tugas & Tindak Lanjut',
    ringkasan:
      'Papan monitoring penugasan kerja, delegasi wewenang personel, dan tindak lanjut rekomendasi audit atau evaluasi program hingga tuntas terverifikasi.',
    langkah: [
      {
        judul: 'Pilah Berdasarkan Tingkat Prioritas',
        deskripsi:
          'Perhatikan badge prioritas (Mendesak, Tinggi, Sedang, Rendah) untuk memprioritaskan tugas-tugas kritis yang mendekati batas tenggat waktu.',
      },
      {
        judul: 'Pantau Batas Tenggat Waktu (Due Date)',
        deskripsi:
          'Kolom tenggat menampilkan sisa hari sebelum batas akhir penyelesaian tugas. Tugas yang terlewat batas waktu akan disorot peringatan.',
      },
      {
        judul: 'Delegasikan Tugas Baru',
        deskripsi:
          'Klik tombol "Tugas Baru" di kanan atas untuk membuat lembar instruksi penugasan kerja baru bagi pengurus atau staf.',
      },
      {
        judul: 'Pembaruan Progres & Hasil',
        deskripsi:
          'Klik baris tugas untuk memperbarui status penyelesaian atau melampirkan hasil akhir pekerjaan yang telah diselesaikan.',
      },
    ],
    tips: [
      'Tugas dengan prioritas "Mendesak" (Urgent) sebaiknya memiliki tenggat waktu di bawah 7 hari kerja.',
    ],
    terkait: ['tasks.create', 'reports.list', 'programs.list'],
  },

  'tasks.create': {
    key: 'tasks.create',
    judul: 'Cara Membuat Tugas & Tindak Lanjut',
    ringkasan:
      'Formulir pendelegasian tugas kerja terstruktur untuk menetapkan personel penanggung jawab, batas waktu pengerjaan, tingkat prioritas, dan instruksi penugasan.',
    langkah: [
      {
        judul: 'Tulis Judul Instruksi Tugas (title)',
        deskripsi:
          'Ketik instruksi kerja yang ringkas dan lugas (contoh: "Penyusunan Format Nota Verifikasi LPJ Madin").',
      },
      {
        judul: 'Hubungkan dengan Program Kerja (program_id)',
        deskripsi:
          'Pilih program kerja yang menjadi payung penugasan ini dari daftar dropdown.',
      },
      {
        judul: 'Tentukan Sumber Penugasan (source)',
        deskripsi:
          'Pilih atau isi asal usul tugas (contoh: "Temuan Evaluasi Internal", "Arahan Rapat Pimpinan", atau "Rekomendasi Audit").',
      },
      {
        judul: 'Tunjuk Personel PIC (pic_personnel_id)',
        deskripsi:
          'Pilih nama staf atau pengurus yang bertanggung jawab langsung atas penyelesaian tugas ini.',
      },
      {
        judul: 'Atur Tingkat Prioritas (priority)',
        deskripsi:
          'Pilih skala kepentingan penugasan: "Rendah" (Low), "Sedang" (Medium), "Tinggi" (High), atau "Mendesak" (Urgent).',
      },
      {
        judul: 'Tetapkan Tenggat Waktu (due_date)',
        deskripsi:
          'Pilih tanggal batas akhir penyerahan hasil tugas menggunakan pemilih tanggal DatePicker.',
      },
      {
        judul: 'Uraikan Rincian Instruksi (description)',
        deskripsi:
          'Jelaskan ruang lingkup pekerjaan, kriteria keberhasilan output yang diharapkan, serta dokumen yang harus dilampirkan.',
      },
      {
        judul: 'Buat Penugasan',
        deskripsi:
          'Klik tombol "Buat" untuk menerbitkan tugas ke sistem dan memunculkannya pada daftar tugas PIC terkait.',
      },
    ],
    tips: [
      'Pastikan PIC yang ditunjuk telah memahami wewenang dan rincian instruksi kerja sebelum tenggat waktu berjalan.',
    ],
    terkait: ['tasks.list', 'reports.create', 'agendas.list'],
  },
}
