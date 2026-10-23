import { createClient } from '@/lib/supabase/server';
import type { PeranType } from '@/types/database';
import Link from 'next/link';
import {
  getFinanceDashboardData,
  getStafDashboardData,
  formatRupiah,
} from '@/lib/services/dashboard';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  CircleDollarSign,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Calendar,
  ArrowRight,
  PlusCircle,
  FileSpreadsheet,
  CheckCircle,
} from 'lucide-react';

export const metadata = {
  title: 'Dashboard | CV Batik Larasati',
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('nama_lengkap, peran')
    .eq('id', user!.id)
    .single();

  const role = (profile?.peran || 'staf') as PeranType;
  const isFinance = ['akuntan', 'direktur'].includes(role);

  const today = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const financeData = isFinance ? await getFinanceDashboardData(role) : null;
  const stafData = !isFinance ? await getStafDashboardData(user!.id) : null;

  return (
    <div className="space-y-6">
      {/* Header Sambutan: Apple iOS Liquid Glass */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-7 rounded-3xl liquid-glass-header text-white">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs uppercase tracking-wider text-[#d4af37] font-bold">
              CV Batik Larasati
            </span>
            <span className="text-neutral-600">·</span>
            <span className="text-xs text-neutral-400">{today}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Selamat datang, <span className="text-white">{profile?.nama_lengkap}</span>!
          </h1>
          <p className="text-xs sm:text-sm text-neutral-300 mt-1 max-w-2xl leading-relaxed">
            {isFinance
              ? 'Ringkasan posisi kas, pergerakan laba rugi, dan antrean verifikasi dokumen akuntansi.'
              : 'Pantau status pengajuan pengeluaran dan reimbursement nota operasional Anda.'}
          </p>
        </div>
        <div className="self-start md:self-auto relative z-10">
          <span className="px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/50 shadow-lg shadow-[#d4af37]/10 backdrop-blur-xl">
            Peran: {role}
          </span>
        </div>
      </div>

      {/* DASHBOARD UNTUK TIM FINANCE (AKUNTAN & DIREKTUR) */}
      {isFinance && financeData && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
              Ikhtisar Keuangan Berjalan
            </h2>
            <span className="text-xs font-medium text-neutral-300 bg-white/[0.06] px-2.5 py-1 rounded-lg border border-white/[0.10]">
              Periode: {financeData.periodeAktif.nama}
            </span>
          </div>

          {/* 6 Kartu Metrik Keuangan Apple iOS Liquid Glass */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {/* 1. Total Kas & Bank */}
            <div className="p-6 rounded-3xl liquid-glass liquid-glass-hover space-y-3">
              <div className="flex items-center justify-between text-neutral-400">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Total Kas & Bank
                </span>
                <div className="p-2.5 rounded-2xl bg-white/[0.08] text-white border border-white/[0.12]">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {formatRupiah(financeData.totalKasBank)}
              </div>
              <p className="text-[11px] text-neutral-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Kas Kecil & Rekening Bank Aktif</span>
              </p>
            </div>

            {/* 2. Pendapatan Bulan Ini */}
            <div className="p-6 rounded-3xl liquid-glass liquid-glass-hover space-y-3">
              <div className="flex items-center justify-between text-neutral-400">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Pendapatan (Bulan Ini)
                </span>
                <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-emerald-400 tracking-tight">
                {formatRupiah(financeData.pendapatanBulanIni)}
              </div>
              <p className="text-[11px] text-emerald-300/80 font-medium">
                Penjualan kain & kelas batik wisata
              </p>
            </div>

            {/* 3. Beban Bulan Ini */}
            <div className="p-6 rounded-3xl liquid-glass liquid-glass-hover space-y-3">
              <div className="flex items-center justify-between text-neutral-400">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Beban (Bulan Ini)
                </span>
                <div className="p-2.5 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <TrendingDown className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-rose-400 tracking-tight">
                {formatRupiah(financeData.bebanBulanIni)}
              </div>
              <p className="text-[11px] text-neutral-400">
                Bahan baku, malam, operasional & toko
              </p>
            </div>

            {/* 4. Laba Bersih Bulan Ini (Highlight Emas Pertahankan) */}
            <div className="p-6 rounded-3xl liquid-glass liquid-glass-hover space-y-3">
              <div className="flex items-center justify-between text-neutral-400">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Laba Bersih Berjalan
                </span>
                <div className="p-2.5 rounded-2xl bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/30">
                  <CircleDollarSign className="w-4 h-4" />
                </div>
              </div>
              <div
                className={`text-2xl sm:text-3xl font-bold tracking-tight ${
                  financeData.labaRugiBulanIni >= 0 ? 'text-[#d4af37]' : 'text-rose-400'
                }`}
              >
                {formatRupiah(financeData.labaRugiBulanIni)}
              </div>
              <p className="text-[11px] text-neutral-300 font-medium">
                {financeData.labaRugiBulanIni >= 0 ? 'Surplus operasional' : 'Defisit operasional'}
              </p>
            </div>

            {/* 5. Antrean Persetujuan */}
            <div className="p-6 rounded-3xl liquid-glass liquid-glass-hover space-y-3">
              <div className="flex items-center justify-between text-neutral-400">
                <span className="text-xs font-semibold uppercase tracking-wider truncate">
                  Antrean Persetujuan
                </span>
                <div className="p-2.5 rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-orange-400 tracking-tight">
                {financeData.antreanPersetujuan} Dokumen
              </div>
              <p className="text-[11px] text-neutral-400 truncate">{financeData.antreanLabel}</p>
            </div>

            {/* 6. Status Periode */}
            <div className="p-6 rounded-3xl liquid-glass liquid-glass-hover space-y-3">
              <div className="flex items-center justify-between text-neutral-400">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Status Pembukuan
                </span>
                <div className="p-2.5 rounded-2xl bg-white/[0.08] text-white border border-white/[0.12]">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {financeData.periodeAktif.nama}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>
                  Status {financeData.periodeAktif.status} ({financeData.periodeAktif.draftCount} draf)
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions Bar (Apple iOS Liquid Glass) */}
          <div className="p-6 rounded-3xl liquid-glass space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Aksi Cepat
            </h3>
            <div className="flex flex-wrap gap-2.5">
              <Link
                href="/pengajuan"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-[#d4af37] to-[#aa8022] text-neutral-950 hover:brightness-110 shadow-lg shadow-[#d4af37]/20 transition-all active:scale-[0.98]"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Buat Pengajuan Baru</span>
              </Link>
              {role === 'akuntan' && (
                <Link
                  href="/jurnal"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold liquid-glass liquid-glass-hover text-neutral-200 hover:text-white transition-all shadow-sm"
                >
                  <FileSpreadsheet className="w-4 h-4 text-neutral-300" />
                  <span>Catat Jurnal Umum</span>
                </Link>
              )}
              <Link
                href="/laporan"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold liquid-glass liquid-glass-hover text-neutral-200 hover:text-white transition-all shadow-sm"
              >
                <TrendingUp className="w-4 h-4 text-neutral-300" />
                <span>Lihat Laba Rugi & Neraca</span>
              </Link>
            </div>
          </div>

          {/* Antrean Pengajuan Menunggu (Wadah Tabel Apple iOS Liquid Glass) */}
          <div className="p-6 sm:p-7 rounded-3xl liquid-glass-table space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Pengajuan Memerlukan Tindakan ({financeData.antreanPersetujuan})
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Daftar nota pengeluaran yang menunggu verifikasi atau persetujuan Anda
                </p>
              </div>
              <Link
                href="/pengajuan"
                className="text-xs font-medium text-neutral-300 hover:text-white inline-flex items-center gap-1 transition-colors"
              >
                <span>Kelola Semua</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {financeData.antreanPengajuan.length === 0 ? (
              <div className="text-center py-8 text-neutral-400 text-xs flex flex-col items-center gap-2">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
                <span>Tidak ada pengajuan yang sedang menunggu persetujuan Anda.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-[11px] uppercase tracking-wider text-neutral-400 bg-white/[0.04] border-b border-white/[0.10]">
                    <tr>
                      <th className="py-3 px-3.5 font-semibold">Nomor</th>
                      <th className="py-3 px-3.5 font-semibold">Tanggal</th>
                      <th className="py-3 px-3.5 font-semibold">Pengaju</th>
                      <th className="py-3 px-3.5 font-semibold">Keperluan</th>
                      <th className="py-3 px-3.5 font-semibold text-right">Jumlah</th>
                      <th className="py-3 px-3.5 font-semibold text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.08]">
                    {financeData.antreanPengajuan.map((pg) => (
                      <tr key={pg.id} className="hover:bg-white/[0.05] transition-colors">
                        <td className="py-3 px-3.5 font-mono font-bold text-[#d4af37]">
                          {pg.nomor || `#${pg.id}`}
                        </td>
                        <td className="py-3 px-3.5 text-neutral-300">{pg.tanggal_transaksi}</td>
                        <td className="py-3 px-3.5 font-medium text-white">
                          {pg.pengaju?.nama_lengkap || '-'}
                        </td>
                        <td className="py-3 px-3.5 text-neutral-300 max-w-xs truncate">
                          {pg.keterangan}
                        </td>
                        <td className="py-3 px-3.5 font-bold text-white text-right">
                          {formatRupiah(pg.jumlah)}
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          <Link
                            href={`/pengajuan?id=${pg.id}`}
                            className="px-3.5 py-1.5 rounded-xl text-[11px] font-bold bg-[#d4af37] text-neutral-950 hover:bg-[#e6c148] shadow-md transition-all active:scale-[0.98]"
                          >
                            Tinjau
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DASHBOARD UNTUK STAF (Apple iOS Liquid Glass) */}
      {!isFinance && stafData && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
              Ringkasan Pengajuan Pengeluaran Saya
            </h2>
            <Link
              href="/pengajuan"
              className="text-xs text-neutral-300 font-medium inline-flex items-center gap-1 hover:text-white transition-colors"
            >
              <span>Lihat Semua</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* 4 Kartu Metrik Staf Apple iOS Liquid Glass */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-6 rounded-3xl liquid-glass liquid-glass-hover space-y-2">
              <div className="flex items-center justify-between text-neutral-400">
                <span className="text-xs font-semibold">Total Pengajuan</span>
                <Receipt className="w-4 h-4 text-white" />
              </div>
              <div className="text-2xl font-bold text-white">
                {stafData.totalPengajuan} Dokumen
              </div>
              <p className="text-[11px] text-neutral-400">Total riwayat pengajuan Anda</p>
            </div>

            <div className="p-6 rounded-3xl liquid-glass liquid-glass-hover space-y-2">
              <div className="flex items-center justify-between text-neutral-400">
                <span className="text-xs font-semibold">Menunggu Verifikasi</span>
                <Clock className="w-4 h-4 text-orange-400" />
              </div>
              <div className="text-2xl font-bold text-orange-400">
                {stafData.menungguVerifikasi} Dokumen
              </div>
              <p className="text-[11px] text-neutral-400">Sedang ditinjau Akuntan/Direktur</p>
            </div>

            <div className="p-6 rounded-3xl liquid-glass liquid-glass-hover space-y-2">
              <div className="flex items-center justify-between text-neutral-400">
                <span className="text-xs font-semibold">Perlu Revisi</span>
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl font-bold text-rose-400">
                {stafData.perluRevisi} Dokumen
              </div>
              <p className="text-[11px] text-neutral-400">Memerlukan koreksi nota dari Anda</p>
            </div>

            <div className="p-6 rounded-3xl liquid-glass liquid-glass-hover space-y-2">
              <div className="flex items-center justify-between text-neutral-400">
                <span className="text-xs font-semibold">Selesai Dibayar</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-emerald-400">
                {stafData.selesaiDibayar} Dokumen
              </div>
              <p className="text-[11px] text-neutral-400">Dana telah dicairkan</p>
            </div>
          </div>

          {/* Quick Create Card (Apple iOS Liquid Glass) */}
          <div className="p-6 sm:p-7 rounded-3xl liquid-glass flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-white text-sm">
                Perlu mengajukan biaya operasional atau bahan batik?
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Unggah foto nota pembelian malam, pewarna, atau kain mori untuk reimbursement cepat.
              </p>
            </div>
            <Link
              href="/pengajuan"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-[#d4af37] to-[#aa8022] text-neutral-950 hover:brightness-110 shadow-lg shadow-[#d4af37]/20 transition-all shrink-0 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Buat Pengajuan Baru</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
