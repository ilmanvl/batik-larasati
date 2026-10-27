import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { PeranType } from '@/types/database';
import {
  ShieldCheck,
  Calendar,
  User,
  Database,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import AuditLogDetailModal from './AuditLogDetailModal';

// Format Tanggal & Jam Lokal
function formatWaktu(dateString: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(dateString));
}

// Badge Aksi Bersinar (Glow Glass Pill)
function getActionBadge(aksi: string) {
  const upper = aksi.toUpperCase();
  if (upper.includes('INSERT') || upper.includes('BUAT') || upper.includes('BAYAR')) {
    return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]';
  }
  if (upper.includes('UPDATE') || upper.includes('UBAH') || upper.includes('POSTING')) {
    return 'bg-sky-500/15 text-sky-300 border-sky-500/30 shadow-[0_0_12px_rgba(14,165,233,0.15)]';
  }
  if (upper.includes('DELETE') || upper.includes('HAPUS') || upper.includes('BALIK') || upper.includes('TUTUP')) {
    return 'bg-rose-500/15 text-rose-300 border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.15)]';
  }
  return 'bg-amber-500/15 text-amber-300 border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.15)]';
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{
    tabel?: string;
    pelaku_id?: string;
    start_date?: string;
    end_date?: string;
    page?: string;
  }>;
}) {
  const { tabel, pelaku_id, start_date, end_date, page } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/masuk');

  const { data: profile } = await supabase
    .from('profiles')
    .select('nama_lengkap, peran')
    .eq('id', user.id)
    .single();

  const role = (profile?.peran || 'staf') as PeranType;

  // Proteksi: Hanya Direktur yang dapat melihat Audit Log
  if (role !== 'direktur') {
    redirect('/dashboard');
  }

  // 1. Konfigurasi Paginasi
  const pageSize = 10;
  const currentPage = Math.max(1, parseInt(page || '1', 10) || 1);
  const from = (currentPage - 1) * pageSize;
  const to = from + pageSize - 1;

  // 2. Ambil daftar pelaku untuk filter
  const { data: users } = await supabase
    .from('profiles')
    .select('id, nama_lengkap, email')
    .order('nama_lengkap', { ascending: true });

  // 3. Query data audit_log dengan paginasi
  let query = supabase
    .from('audit_log')
    .select(
      `
      id,
      waktu,
      aksi,
      nama_tabel,
      id_data,
      data_lama,
      data_baru,
      pelaku:profiles!audit_log_pelaku_id_fkey(
        nama_lengkap,
        email
      )
    `,
      { count: 'exact' }
    )
    .order('waktu', { ascending: false });

  if (tabel && tabel !== 'semua') {
    query = query.eq('nama_tabel', tabel);
  }

  if (pelaku_id && pelaku_id !== 'semua') {
    query = query.eq('pelaku_id', pelaku_id);
  }

  if (start_date) {
    query = query.gte('waktu', `${start_date}T00:00:00Z`);
  }

  if (end_date) {
    query = query.lte('waktu', `${end_date}T23:59:59Z`);
  }

  query = query.range(from, to);

  const { data: logsData, count } = await query;
  const logs = logsData || [];
  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  // Helper pembuat URL paginasi mempertahankan filter aktif
  const buildPageUrl = (targetPage: number) => {
    const params = new URLSearchParams();
    if (tabel && tabel !== 'semua') params.set('tabel', tabel);
    if (pelaku_id && pelaku_id !== 'semua') params.set('pelaku_id', pelaku_id);
    if (start_date) params.set('start_date', start_date);
    if (end_date) params.set('end_date', end_date);
    params.set('page', targetPage.toString());
    return `/audit-log?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Header Banner Liquid Glass */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-7 rounded-3xl liquid-glass-header text-white">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs uppercase tracking-wider text-[#d4af37] font-bold">
              Kepatuhan & Keamanan Data
            </span>
            <span className="text-neutral-600">·</span>
            <span className="text-xs text-neutral-400">CV Batik Larasati</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <ShieldCheck className="w-7 h-7 text-[#d4af37]" />
            <span>Audit Log Sistem</span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-300 mt-1 max-w-2xl leading-relaxed">
            Rekam jejak tidak dapat diubah (<em>immutable audit trail</em>) untuk memantau seluruh aktivitas mutasi finansial, perubahan status, dan wewenang pengguna.
          </p>
        </div>
      </div>

      {/* Filter Bar Liquid Glass */}
      <div className="p-6 rounded-3xl liquid-glass space-y-4">
        <form method="GET" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          {/* Filter Tabel */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>Target Tabel</span>
            </label>
            <select
              name="tabel"
              defaultValue={tabel || 'semua'}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.14] text-white text-xs sm:text-sm focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/40 transition-all cursor-pointer backdrop-blur-md"
            >
              <option value="semua" className="bg-neutral-900 text-white">Semua Tabel</option>
              <option value="pengajuan" className="bg-neutral-900 text-white">pengajuan</option>
              <option value="jurnal" className="bg-neutral-900 text-white">jurnal</option>
              <option value="periode" className="bg-neutral-900 text-white">periode</option>
              <option value="akun" className="bg-neutral-900 text-white">akun</option>
              <option value="profiles" className="bg-neutral-900 text-white">profiles</option>
            </select>
          </div>

          {/* Filter Pelaku */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>Pelaku (User)</span>
            </label>
            <select
              name="pelaku_id"
              defaultValue={pelaku_id || 'semua'}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.14] text-white text-xs sm:text-sm focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/40 transition-all cursor-pointer backdrop-blur-md"
            >
              <option value="semua" className="bg-neutral-900 text-white">Semua Pelaku</option>
              {users?.map((u) => (
                <option key={u.id} value={u.id} className="bg-neutral-900 text-white">
                  {u.nama_lengkap} ({u.email})
                </option>
              ))}
            </select>
          </div>

          {/* Filter Tanggal Mulai */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>Dari Tanggal</span>
            </label>
            <input
              type="date"
              name="start_date"
              defaultValue={start_date || ''}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.14] text-white text-xs sm:text-sm focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/40 transition-all backdrop-blur-md"
            />
          </div>

          {/* Filter Tanggal Selesai & Tombol Submit */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>Sampai Tanggal</span>
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                name="end_date"
                defaultValue={end_date || ''}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.14] text-white text-xs sm:text-sm focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/40 transition-all backdrop-blur-md"
              />
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-neutral-950 transition-colors shadow-sm active:scale-95 shrink-0"
              >
                Filter
              </button>
            </div>
          </div>
        </form>

        {(tabel || pelaku_id || start_date || end_date) && (
          <div className="pt-3 border-t border-white/[0.06] flex justify-end">
            <Link
              href="/audit-log"
              className="text-xs text-[#d4af37] hover:underline transition-colors"
            >
              Reset Filter
            </Link>
          </div>
        )}
      </div>

      {/* Tabel Audit Log Liquid Glass */}
      <div className="p-6 sm:p-7 rounded-3xl liquid-glass-table space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
              Aktivitas dan Rekam Jejak Sistem
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Log kronologis mutasi data, posting jurnal, dan perubahan status sistem
            </p>
          </div>
          <span className="text-xs text-neutral-400 font-mono bg-white/[0.06] px-3 py-1.5 rounded-xl border border-white/[0.10] self-start sm:self-auto">
            {totalCount} Total Rekaman (Halaman {currentPage}/{totalPages})
          </span>
        </div>

        {/* Tabel Audit Log */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-white/[0.12] bg-white/[0.05] text-[11px] uppercase tracking-wider text-neutral-300">
                <th className="py-4 px-4 font-semibold w-48">Waktu (WIB)</th>
                <th className="py-4 px-4 font-semibold w-52">Pelaku</th>
                <th className="py-4 px-4 font-semibold w-36 text-center">Aksi</th>
                <th className="py-4 px-4 font-semibold w-28 text-center">Tabel</th>
                <th className="py-4 px-4 font-semibold w-28 text-center">Record ID</th>
                <th className="py-4 px-4 font-semibold w-28 text-center">Rincian Mutasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-neutral-400">
                    Tidak ada rekam jejak audit yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                logs.map((log: any) => {
                  const pelaku = Array.isArray(log.pelaku) ? log.pelaku[0] : log.pelaku;
                  return (
                    <tr key={log.id} className="hover:bg-white/[0.04] transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs text-neutral-300">
                        {formatWaktu(log.waktu)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">
                          {pelaku?.nama_lengkap || 'Sistem Otomatis'}
                        </div>
                        {pelaku?.email && (
                          <div className="text-[11px] text-neutral-400 font-mono mt-0.5">{pelaku.email}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider inline-block ${getActionBadge(
                            log.aksi
                          )}`}
                        >
                          {log.aksi}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-mono text-xs text-neutral-200 bg-white/[0.06] px-2.5 py-1 rounded-lg border border-white/[0.12] backdrop-blur-sm shadow-sm">
                          {log.nama_tabel}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-mono text-xs font-semibold text-[#d4af37] bg-[#d4af37]/10 px-2 py-0.5 rounded-md border border-[#d4af37]/25">
                          #{log.id_data}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <AuditLogDetailModal log={{ ...log, pelaku }} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Navigasi Paginasi */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-white/[0.08] text-xs text-neutral-400">
          <div>
            Menampilkan <span className="font-semibold text-white">{totalCount > 0 ? from + 1 : 0}</span> -{' '}
            <span className="font-semibold text-white">{Math.min(to + 1, totalCount)}</span> dari{' '}
            <span className="font-semibold text-[#d4af37]">{totalCount}</span> log audit (Halaman{' '}
            <span className="font-semibold text-white">{currentPage}</span> dari{' '}
            <span className="font-semibold text-white">{totalPages}</span>)
          </div>

          <div className="flex items-center gap-2">
            {hasPrev ? (
              <Link
                href={buildPageUrl(currentPage - 1)}
                className="px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-neutral-200 hover:text-white border border-white/[0.10] transition-all flex items-center gap-1.5 font-medium"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Sebelumnya</span>
              </Link>
            ) : (
              <span className="px-3.5 py-1.5 rounded-xl bg-white/[0.02] text-neutral-600 border border-white/[0.04] cursor-not-allowed flex items-center gap-1.5 font-medium">
                <ChevronLeft className="w-4 h-4" />
                <span>Sebelumnya</span>
              </span>
            )}

            {hasNext ? (
              <Link
                href={buildPageUrl(currentPage + 1)}
                className="px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-neutral-200 hover:text-white border border-white/[0.10] transition-all flex items-center gap-1.5 font-medium"
              >
                <span>Selanjutnya</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            ) : (
              <span className="px-3.5 py-1.5 rounded-xl bg-white/[0.02] text-neutral-600 border border-white/[0.04] cursor-not-allowed flex items-center gap-1.5 font-medium">
                <span>Selanjutnya</span>
                <ChevronRight className="w-4 h-4" />
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
