'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { JenisPengajuan } from '@/types/database';

export async function updatePengajuanAction(pengajuanId: number, formData: FormData): Promise<{
  success: boolean;
  message?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: 'Sesi login Anda telah berakhir. Silakan masuk kembali.' };
    }

    const { data: pengajuan } = await supabase
      .from('pengajuan')
      .select('id, pengaju_id, status, bukti_path')
      .eq('id', pengajuanId)
      .single();

    if (!pengajuan || pengajuan.pengaju_id !== user.id) {
      return { success: false, message: 'Anda tidak memiliki hak untuk mengedit pengajuan ini.' };
    }

    if (!['draf', 'perlu_revisi'].includes(pengajuan.status)) {
      return { success: false, message: 'Hanya pengajuan berstatus draf atau perlu revisi yang dapat diedit.' };
    }

    const jenis = (formData.get('jenis') as JenisPengajuan) || 'reimburse';
    const tanggalTransaksi = formData.get('tanggal_transaksi') as string;
    const akunBebanId = parseInt(formData.get('akun_beban_id') as string, 10);
    const jumlah = parseInt(formData.get('jumlah') as string, 10);
    const keterangan = (formData.get('keterangan') as string)?.trim() || '';
    const submitAction = (formData.get('submit_action') as string) || 'draf';
    const buktiFile = formData.get('bukti_file') as File | null;

    if (!tanggalTransaksi) {
      return { success: false, message: 'Tanggal transaksi wajib diisi.' };
    }

    if (isNaN(akunBebanId) || akunBebanId <= 0) {
      return { success: false, message: 'Silakan pilih pos akun beban yang sesuai.' };
    }

    if (isNaN(jumlah) || jumlah < 10000 || jumlah > 25000000) {
      return { success: false, message: 'Nominal pengajuan harus antara Rp 10.000 dan Rp 25.000.000.' };
    }

    if (keterangan.length < 10) {
      return { success: false, message: 'Keterangan pengeluaran minimal 10 karakter.' };
    }

    let buktiPath = pengajuan.bukti_path;
    if (buktiFile && buktiFile.size > 0) {
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const sanitizedName = buktiFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      buktiPath = `pengajuan/${dateStr}_${Date.now()}_${sanitizedName}`;

      try {
        await supabase.storage
          .from('bukti-transaksi')
          .upload(buktiPath, buktiFile, { upsert: true });
      } catch {
        // Fallback simpan referensi nama file
      }
    }

    const updatePayload: Record<string, any> = {
      jenis,
      tanggal_transaksi: tanggalTransaksi,
      akun_beban_id: akunBebanId,
      jumlah,
      keterangan,
      bukti_path: buktiPath,
    };

    if (submitAction === 'ajukan') {
      updatePayload.status = 'diajukan';
      updatePayload.diajukan_pada = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from('pengajuan')
      .update(updatePayload)
      .eq('id', pengajuanId);

    if (updateError) {
      return { success: false, message: 'Gagal memperbarui pengajuan: ' + updateError.message };
    }

    revalidatePath('/pengajuan');
    revalidatePath(`/pengajuan/${pengajuanId}`);
    revalidatePath('/dashboard');

    return { success: true };
  } catch (err: any) {
    return { success: false, message: 'Terjadi kesalahan sistem: ' + (err?.message || '') };
  }
}
