/**
 * Pemetaan judul halaman dari pathname.
 * Dipakai bersama oleh Topbar (desktop) dan MobileAppHeader (mobile)
 * sehingga satu rute selalu menampilkan satu judul yang sama.
 */
export const getPageTitle = (pathname: string): string => {
  if (pathname === '/' || pathname === '') return ''
  if (pathname.startsWith('/menu')) return 'Menu'
  if (pathname.startsWith('/programs/create')) return 'Buat Program'
  if (pathname.includes('/programs/') && pathname.endsWith('/edit')) return 'Perbarui Program'
  if (pathname.startsWith('/programs')) return 'Program Kerja'
  if (pathname.startsWith('/agendas/create')) return 'Buat Agenda'
  if (pathname.includes('/agendas/') && pathname.endsWith('/edit')) return 'Perbarui Agenda'
  if (pathname.startsWith('/agendas')) return 'Agenda & Kegiatan'
  if (pathname.startsWith('/performance/create')) return 'Buat Capaian Kinerja'
  if (pathname.startsWith('/performance')) return 'Capaian Kinerja'
  if (pathname.startsWith('/finance/create')) return 'Catat Transaksi'
  if (pathname.startsWith('/finance/') && pathname !== '/finance') return 'Detail Catatan Kas'
  if (pathname.startsWith('/finance')) return 'Anggaran & Keuangan'
  if (pathname.startsWith('/reports/create')) return 'Buat Laporan'
  if (pathname.startsWith('/reports')) return 'Laporan & Evaluasi'
  if (pathname.startsWith('/tasks/create')) return 'Buat Tugas'
  if (pathname.startsWith('/tasks')) return 'Tugas & Tindak Lanjut'
  if (pathname.startsWith('/structures')) return 'Struktur & Seksi'
  if (pathname.startsWith('/organizations')) return 'Organisasi'
  if (pathname.startsWith('/accounts')) return 'Akun Pengguna'
  if (pathname.startsWith('/roles/create')) return 'Buat Peran'
  if (pathname.includes('/roles/') && pathname.endsWith('/edit')) return 'Perbarui Peran'
  if (pathname.startsWith('/roles')) return 'Peran & Izin'
  if (pathname.startsWith('/audit-logs')) return 'Audit Trail'
  if (pathname.startsWith('/settings')) return 'Pengaturan'
  return 'My Tafrih'
}
