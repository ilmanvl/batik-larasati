import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { FormPengajuan } from './FormPengajuan';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export default async function BuatPengajuanBaruPage() {
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

  const role = profile?.peran || 'staf';
  if (!['staf', 'akuntan'].includes(role)) {
    redirect('/pengajuan');
  }

  // Ambil daftar akun beban aktif untuk dropdown
  const { data: daftarAkunBeban } = await supabase
    .from('akun')
    .select('id, kode, nama')
    .eq('tipe', 'beban')
    .eq('aktif', true)
    .order('kode', { ascending: true });

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* 1. Header Banner & Navigasi Kembali */}
      <div className="flex items-center justify-between p-6 rounded-3xl liquid-glass-header text-white">
        <div className="relative z-10">
          <Link
            href="/pengajuan"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#d4af37] hover:text-[#f0cb5a] mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Daftar Pengajuan</span>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Formulir Pengajuan Biaya Baru
          </h1>
          <p className="text-xs text-neutral-300 mt-0.5">
            Ajukan permohonan dana kas operasional atau reimbursement nota pengeluaran batik.
          </p>
        </div>
      </div>

      {/* 2. Catatan Panduan & Kebijakan Kas */}
      <div className="p-4 rounded-2xl liquid-glass text-xs text-neutral-400 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-[#d4af37] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-neutral-200">Panduan Pengajuan Dana UMKM:</p>
          <p>
            • Batas nominal pengajuan adalah <strong>Rp 10.000</strong> s/d <strong>Rp 25.000.000</strong>.
          </p>
          <p>
            • Pengajuan hingga <strong>Rp 1.000.000</strong> dapat disetujui langsung oleh Akuntan.
          </p>
          <p>
            • Pengajuan di atas <strong>Rp 1.000.000</strong> memerlukan verifikasi Akuntan dan persetujuan akhir Direktur.
          </p>
        </div>
      </div>

      {/* 3. Wadah Form Apple iOS Liquid Glass */}
      <div className="p-6 sm:p-8 rounded-3xl liquid-glass-table text-white relative">
        <FormPengajuan akunBebanList={daftarAkunBeban || []} />
      </div>
    </div>
  );
}
