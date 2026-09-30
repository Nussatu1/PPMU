import type { HelpContent } from './types'

export const financeHelp: Record<string, HelpContent> = {
  'finance.list': {
    key: 'finance.list',
    judul: 'Panduan Monitoring Anggaran & Keuangan',
    ringkasan:
      'Halaman ini menampilkan rekapitulasi alokasi pagu anggaran, realisasi belanja operasional, sisa saldo kas program, serta riwayat pembukuan transaksi belanja.',
    langkah: [
      {
        judul: 'Tinjau Metrik Ringkasan Keuangan',
        deskripsi:
          'Periksa empat kartu indikator di bagian atas: Total Pagu Anggaran, Total Realisasi Belanja, Sisa Saldo Anggaran, dan Persentase Penyerapan untuk memantau kesehatan kas organisasi.',
      },
      {
        judul: 'Pilah Transaksi Berdasarkan Mata Anggaran',
        deskripsi:
          'Gunakan tabel daftar transaksi untuk melihat tanggal pembukuan, pos program pembebanan biaya, kategori belanja, serta nominal realisasi pengeluaran.',
      },
      {
        judul: 'Periksa Tautan Bukti Nota',
        deskripsi:
          'Klik tombol "Lihat Nota" pada kolom Nota Bukti untuk membuka file scan kuitansi digital atau invoice transaksi yang telah diunggah.',
      },
      {
        judul: 'Catat Pengeluaran Baru',
        deskripsi:
          'Klik tombol "Catat Pengeluaran" di sudut kanan atas untuk membuka formulir pembukuan mutasi transaksi belanja baru.',
      },
      {
        judul: 'Pembatalan Transaksi',
        deskripsi:
          'Jika terjadi kesalahan pencatatan, klik tombol aksi tempat sampah pada baris transaksi terkait untuk membatalkan dan menghapus transaksi dengan konfirmasi dialog aman.',
      },
    ],
    tips: [
      'Penyerapan anggaran yang optimal berada di rentang target waktu pelaksanaan program kerja tanpa menimbulkan defisit.',
      'Setiap mutasi pengeluaran wajib memiliki bukti fisik dan digital yang dapat dipertanggungjawabkan saat audit internal.',
    ],
    terkait: ['finance.create', 'programs.list', 'reports.list'],
  },

  'finance.create': {
    key: 'finance.create',
    judul: 'Cara Mengisi Catatan Pengeluaran',
    ringkasan:
      'Formulir ini digunakan untuk membukukan transaksi pengeluaran kas belanja program, mengalokasikan beban pagu, serta mengarsipkan bukti nota digital secara resmi.',
    langkah: [
      {
        judul: 'Pilih Pos Sumber Pagu Anggaran (budget_id)',
        deskripsi:
          'Pilih salah satu pos anggaran program kerja yang aktif pada dropdown "Pos Sumber Pagu Anggaran". Pilihan ini menentukan dari pagu program mana dana belanja akan dikurangi.',
      },
      {
        judul: 'Tentukan Klasifikasi Kategori Belanja (category)',
        deskripsi:
          'Pilih jenis belanja yang sesuai: "Honorarium / Operasional", "Konsumsi & Logistik", "Perlengkapan & ATK", "Sewa & Tempat", "Transportasi & Akomodasi", "Publikasi & Dokumentasi", atau "Lain-lain".',
      },
      {
        judul: 'Masukkan Nominal Realisasi Belanja (amount)',
        deskripsi:
          'Input jumlah pengeluaran dalam mata uang Rupiah pada field "Nominal Realisasi Belanja (Rp)". Sistem akan otomatis memformat pemisah ribuan dan memvalidasi nilai angka.',
      },
      {
        judul: 'Tetapkan Tanggal Pembukuan Transaksi (transaction_date)',
        deskripsi:
          'Pilih tanggal dilakukannya pembayaran atau tanggal yang tertera pada kuitansi/faktur fisik menggunakan pemilih kalender tanggal (DatePicker).',
      },
      {
        judul: 'Unggah Berkas Bukti Nota Digital (proof_url)',
        deskripsi:
          'Unggah berkas digital (scan kuitansi, faktur, nota fisik, atau PDF bukti transaksi) untuk arsip pendukung dan verifikasi pembukuan langsung tanpa perlu memasukkan tautan eksternal.',
      },
      {
        judul: 'Tulis Uraian & Keterangan Pengeluaran (description)',
        deskripsi:
          'Jelaskan rincian keperluan belanja secara transparan pada kolom textarea, termasuk nama toko/rekanan vendor, peruntukan barang/jasa, atau nomor faktur.',
      },
      {
        judul: 'Buat Pembukuan Transaksi',
        deskripsi:
          'Klik tombol "Buat" untuk memproses transaksi dan kembali ke daftar transaksi, atau tombol "Buat & Buat Lainnya" untuk membukukan pengeluaran berikutnya secara beruntun.',
      },
    ],
    tips: [
      'Pastikan nominal pengeluaran tidak melebihi sisa alokasi pagu anggaran program terkait untuk menghindari overbudgeting.',
      'Sertakan nomor kuitansi resmi atau nota toko pada uraian agar mempermudah rekonsiliasi saat penyusunan Laporan Pertanggungjawaban (LPJ).',
      'Jika belanja menggunakan dana talangan kas bon, catat tanggal transaksi sesuai tanggal penyelesaian kwitansi riil.',
    ],
    terkait: ['finance.list', 'programs.list', 'reports.create'],
  },
}
