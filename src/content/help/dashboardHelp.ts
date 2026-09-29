import type { HelpContent } from './types'

export const dashboardHelp: Record<string, HelpContent> = {
  dashboard: {
    key: 'dashboard',
    judul: 'Panduan Navigasi Dashboard Utama',
    ringkasan:
      'Pusat kendali ekosistem organisasi yang menyajikan rangkuman performa program kerja, jadwal kegiatan mendatang, realisasi serapan anggaran, dan aktivitas terkini.',
    langkah: [
      {
        judul: 'Pahami Kartu Metrik Kunci',
        deskripsi:
          'Lihat ringkasan program aktif, agenda mendatang, penyerapan anggaran, dan rasio ketercapaian KPI organisasi pada kartu statistik teratas.',
      },
      {
        judul: 'Pantau Grafik Realisasi & Penyerapan',
        deskripsi:
          'Amati kurva perbandingan alokasi pagu terhadap realisasi pengeluaran kas per bulan untuk mendeteksi deviasi anggaran sejak dini.',
      },
      {
        judul: 'Periksa Jadwal Agenda Terdekat',
        deskripsi:
          'Telusuri daftar rundown kegiatan yang dijadwalkan dalam waktu dekat beserta PIC dan lokasi pelaksanaannya.',
      },
      {
        judul: 'Akses Cepat Modul Kerja',
        deskripsi:
          'Gunakan bilah navigasi samping (Sidebar) atau shortcut pencarian global (⌘K) untuk berpindah langsung ke formulir kerja yang dibutuhkan.',
      },
    ],
    tips: [
      'Data dashboard terhubung secara real-time dengan transaksi belanja, agenda, dan capaian KPI yang baru saja dibukukan.',
      'Gunakan switch organisasi di bagian atas sidebar jika Anda mengelola lebih dari satu tenant lembaga.',
    ],
    terkait: ['programs.list', 'agendas.list', 'finance.list'],
  },
}
