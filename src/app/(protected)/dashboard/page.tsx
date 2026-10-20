import { createClient } from '@/lib/supabase/server';
import type { PeranType } from '@/types/database';
import Link from 'next/link';
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

  // Format tanggal Indonesia
  const today = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <div className="space-y-6">
      {/* Header Sambutan */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-7 rounded-2xl bg-gradient-to-r from-amber-900 via-amber-800 to-stone-900 text-white shadow-lg shadow-amber-950/10">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs uppercase tracking-wider text-amber-200/90 font-semibold">
              CV Batik Larasati
            </span>
            <span className="text-amber-400">·</span>
            <span className="text-xs text-amber-100/70">{today}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Selamat datang, {profile?.nama_lengkap}!
          </h1>
          <p className="text-xs sm:text-sm text-amber-100/80 mt-1 max-w-2xl leading-relaxed">
            {isFinance
              ? 'Ringkasan posisi kas, pergerakan laba rugi, dan verifikasi dokumen keuangan UMKM.'
              : 'Pantau status pengajuan pengeluaran dan reimbursement nota operasional Anda di sini.'}
          </p>
        </div>
        <div className="self-start md:self-auto flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-amber-500/20 text-amber-200 border border-amber-400/30">
            Peran: {role}
          </span>
        </div>
      </div>

      {/* Grid Kartu Metrik - Sesuai Peran */}
      {isFinance ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-600">
              Ikhtisar Keuangan Berjalan
            </h2>
            <span className="text-xs text-stone-400">Periode: Oktober 2026</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {/* 1. Saldo Kas & Bank */}
            <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-sm space-y-3 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between text-stone-500">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Total Kas & Bank
                </span>
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-800">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
                Rp 144.382.000
              </div>
              <p className="text-[11px] text-stone-500 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Saldo aktif Kas Kecil & Rekening BCA</span>
              </p>
            </div>

            {/* 2. Pendapatan Berjalan */}
            <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-sm space-y-3 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between text-stone-500">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Pendapatan (Bulan Ini)
                </span>
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-emerald-800 tracking-tight">
                Rp 21.350.000
              </div>
              <p className="text-[11px] text-emerald-600 font-medium">
                Penjualan kain & kelas membatik wisata
              </p>
            </div>

            {/* 3. Beban Berjalan */}
            <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-sm space-y-3 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between text-stone-500">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Beban (Bulan Ini)
                </span>
                <div className="p-2.5 rounded-xl bg-rose-50 text-rose-800">
                  <TrendingDown className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-rose-800 tracking-tight">
                Rp 8.770.000
              </div>
              <p className="text-[11px] text-stone-500">
                Operasional toko, bahan lilin & pewarna
              </p>
            </div>

            {/* 4. Laba / Rugi Berjalan */}
            <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-sm space-y-3 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between text-stone-500">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Laba Bersih Berjalan
                </span>
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-800">
                  <CircleDollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
                Rp 12.580.000
              </div>
              <p className="text-[11px] text-emerald-600 font-medium">
                Surplus operasional bulan berjalan
              </p>
            </div>

            {/* 5. Pengajuan Menunggu */}
            <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-sm space-y-3 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between text-stone-500">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Antrean Persetujuan
                </span>
                <div className="p-2.5 rounded-xl bg-orange-50 text-orange-800">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-orange-800 tracking-tight">
                3 Pengajuan
              </div>
              <Link
                href="/pengajuan"
                className="text-[11px] text-amber-800 font-semibold inline-flex items-center gap-1 hover:underline"
              >
                <span>Buka daftar pengajuan</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* 6. Status Periode */}
            <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-sm space-y-3 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between text-stone-500">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Status Pembukuan
                </span>
                <div className="p-2.5 rounded-xl bg-purple-50 text-purple-800">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
                Oktober 2026
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Periode Terbuka (0 Draf Belum Seimbang)</span>
              </div>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">
              Aksi Cepat
            </h3>
            <div className="flex flex-wrap gap-2.5">
              <Link
                href="/pengajuan"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-amber-900 text-white hover:bg-amber-800 shadow-sm transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Buat Pengajuan Baru</span>
              </Link>
              {role === 'akuntan' && (
                <Link
                  href="/jurnal"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-stone-100 text-stone-800 hover:bg-stone-200 border border-stone-300 transition-all"
                >
                  <FileSpreadsheet className="w-4 h-4 text-stone-600" />
                  <span>Catat Jurnal Umum</span>
                </Link>
              )}
              <Link
                href="/laporan"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-stone-100 text-stone-800 hover:bg-stone-200 border border-stone-300 transition-all"
              >
                <TrendingUp className="w-4 h-4 text-stone-600" />
                <span>Lihat Laba Rugi & Neraca</span>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        /* Metrik Khusus Staf */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-600">
              Ringkasan Pengajuan Pengeluaran Saya
            </h2>
            <Link
              href="/pengajuan"
              className="text-xs text-amber-800 font-semibold inline-flex items-center gap-1 hover:underline"
            >
              <span>Semua Pengajuan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-sm space-y-2 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between text-stone-500">
                <span className="text-xs font-semibold">Total Pengajuan</span>
                <Receipt className="w-4 h-4 text-amber-800" />
              </div>
              <div className="text-2xl font-bold text-stone-900">8 Dokumen</div>
              <p className="text-[11px] text-stone-400">Reimbursement & Nota</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-sm space-y-2 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between text-stone-500">
                <span className="text-xs font-semibold">Menunggu Verifikasi</span>
                <Clock className="w-4 h-4 text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-orange-600">1 Dokumen</div>
              <p className="text-[11px] text-stone-400">Sedang diperiksa Akuntan</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-sm space-y-2 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between text-stone-500">
                <span className="text-xs font-semibold">Perlu Revisi</span>
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-2xl font-bold text-rose-600">0 Dokumen</div>
              <p className="text-[11px] text-stone-400">Semua nota terverifikasi</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-sm space-y-2 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between text-stone-500">
                <span className="text-xs font-semibold">Selesai Dibayar</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-emerald-600">7 Dokumen</div>
              <p className="text-[11px] text-stone-400">Dana sudah dicairkan</p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-stone-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-stone-900 text-sm">
                Perlu mengganti biaya operasional atau bahan batik?
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Unggah foto nota dan ajukan reimbursement secara cepat dan terpantau.
              </p>
            </div>
            <Link
              href="/pengajuan"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-amber-900 text-white hover:bg-amber-800 shadow-sm transition-all shrink-0"
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
