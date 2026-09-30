import type { HelpContent } from './types'

export const performanceHelp: Record<string, HelpContent> = {
  'performance.list': {
    key: 'performance.list',
    judul: 'Panduan Indikator Kinerja Utama (KPI)',
    ringkasan:
      'Halaman evaluasi capaian kinerja organisasi untuk melacak ketercapaian target kuantitatif program kerja, persentase realisasi sasaran, dan bukti pencapaian.',
    langkah: [
      {
        judul: 'Evaluasi Rasio Ketercapaian Target',
        deskripsi:
          'Periksa bilah persentase capaian pada setiap baris indikator. Warna hijau/amber mengindikasikan tingkat pemenuhan target yang telah dicapai tim.',
      },
      {
        judul: 'Pilah Berdasarkan Periode Evaluasi',
        deskripsi:
          'Gunakan filter periode (misal Q1, Q2, Q3, Q4) untuk membandingkan performa capaian triwulanan antar program kerja.',
      },
      {
        judul: 'Verifikasi Bukti Kinerja',
        deskripsi:
          'Tinjau tautan dokumen pendukung (laporan kegiatan, sertifikat, presensi peserta) untuk membuktikan keabsahan angka realisasi.',
      },
      {
        judul: 'Catat Indikator Baru',
        deskripsi:
          'Klik tombol "Catat Capaian" di kanan atas untuk mendaftarkan indikator kinerja baru atau memasukkan angka realisasi terbaru.',
      },
    ],
    tips: [
      'Indikator yang belum mencapai 70% target menjelang akhir periode perlu segera ditindaklanjuti pada modul Tugas & Tindak Lanjut.',
    ],
    terkait: ['performance.create', 'programs.list', 'reports.create'],
  },

  'performance.create': {
    key: 'performance.create',
    judul: 'Cara Mencatat Capaian Kinerja (KPI)',
    ringkasan:
      'Formulir pendaftaran indikator kinerja utama program kerja untuk mendokumentasikan target capaian angka, realisasi riil di lapangan, serta tautan dokumen bukti.',
    langkah: [
      {
        judul: 'Tentukan Nama Indikator Kinerja (kpi_name)',
        deskripsi:
          'Tuliskan tolok ukur capaian secara terukur (contoh: "Jumlah Guru Madin yang Mengikuti Sertifikasi Standar Kompetensi").',
      },
      {
        judul: 'Pilih Program Kerja Terkait (program_id)',
        deskripsi:
          'Pilih program kerja yang relevan dari dropdown agar indikator kinerja ini teragregasi secara otomatis ke dalam capaian program induk.',
      },
      {
        judul: 'Pilih Periode Evaluasi (period)',
        deskripsi:
          'Tentukan periode kuartal atau semester evaluasi data (contoh: "Q1 2026", "Semester 1 2026").',
      },
      {
        judul: 'Masukkan Target, Realisasi & Satuan (target, realized, unit)',
        deskripsi:
          'Input angka target yang direncanakan, angka capaian aktual yang berhasil diraih, serta pilih satuan ukuran (misal: "Kegiatan", "Orang", "%", "Dokumen").',
      },
      {
        judul: 'Unggah Berkas Bukti Capaian Fisik (evidence_urls)',
        deskripsi:
          'Unggah dokumen berkas bukti verifikasi fisik (foto kegiatan, surat keputusan, atau dokumen PDF laporan) langsung ke sistem untuk memperkuat validitas data tanpa perlu tautan eksternal.',
      },
      {
        judul: 'Tulis Catatan Analisis / Hambatan (notes)',
        deskripsi:
          'Uraikan faktor pendukung, kendala yang dihadapi selama pelaksanaan, atau langkah antisipasi lanjutan jika target belum tercapai.',
      },
      {
        judul: 'Buat Capaian Kinerja',
        deskripsi:
          'Klik tombol "Buat" untuk merekam indikator kinerja, atau "Buat & Buat Lainnya" untuk menambahkan indikator berikutnya secara berurutan.',
      },
    ],
    tips: [
      'Satuan ukuran wajib konsisten antara angka target dan angka realisasi agar perhitungan persentase capaian valid.',
      'Jika realisasi masih 0 di awal program, cukup isi realisasi dengan angka 0 dan perbarui secara berkala saat kegiatan berlangsung.',
    ],
    terkait: ['performance.list', 'programs.list', 'tasks.create'],
  },
}
