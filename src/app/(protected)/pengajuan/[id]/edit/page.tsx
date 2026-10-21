import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { FormEditPengajuan } from './FormEditPengajuan';
import { ArrowLeft, ShieldAlert } from 'lucide-react';

export default async function EditPengajuanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pengajuanId = parseInt(id, 10);
  if (isNaN(pengajuanId)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/masuk');

  // Ambil pengajuan yang ada
  const { data: pengajuan, error } = await supabase
    .from('pengajuan')
    .select('*')
    .eq('id', pengajuanId)
    .single();

  if (error || !pengajuan) notFound();

  // Validasi: hanya owner yang boleh mengedit
  if (pengajuan.pengaju_id !== user.id) {
    redirect(`/pengajuan/${pengajuanId}`);
  }

  // Validasi: hanya status 'draf' dan 'perlu_revisi' yang boleh diedit
  if (!['draf', 'perlu_revisi'].includes(pengajuan.status)) {
    redirect(`/pengajuan/${pengajuanId}`);
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
      {/* Header Banner */}
      <div className="flex items-center justify-between p-6 rounded-3xl liquid-glass-header text-white">
        <div className="relative z-10">
          <Link
            href={`/pengajuan/${pengajuan.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#d4af37] hover:text-[#f0cb5a] mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Detail Pengajuan</span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Edit Pengajuan: {pengajuan.nomor || `PG-${pengajuan.id}`}
          </h1>
          <p className="text-xs text-neutral-300 mt-1">
            Perbaiki nominal, pos akun beban, atau unggah nota yang lebih jelas.
          </p>
        </div>
      </div>

      {/* Peringatan Catatan Peninjau (jika status perlu_revisi) */}
      {pengajuan.catatan_peninjau && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-white">Catatan dari Peninjau/Akuntan:</span>
            <p className="text-amber-100/90 leading-relaxed">{pengajuan.catatan_peninjau}</p>
          </div>
        </div>
      )}

      {/* Form Edit Client Component */}
      <FormEditPengajuan
        pengajuan={pengajuan}
        akunBebanList={daftarAkunBeban || []}
      />
    </div>
  );
}
