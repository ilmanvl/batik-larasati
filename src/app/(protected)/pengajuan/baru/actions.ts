'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import type { JenisPengajuan } from '@/types/database';

export async function submitPengajuanAction(formData: FormData): Promise<{
  success: boolean;
  message?: string;
}> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: 'Sesi Anda telah berakhir. Silakan masuk kembali.' };
    }

    // 1. Ekstrak dan validasi input
    const jenis = (formData.get('jenis') as JenisPengajuan) || 'reimburse';
    const tanggalTransaksi = formData.get('tanggal_transaksi') as string;
    const akunBebanIdRaw = formData.get('akun_beban_id') as string;
    const jumlahRaw = formData.get('jumlah') as string;
    const keterangan = (formData.get('keterangan') as string)?.trim() || '';
    const submitAction = (formData.get('submit_action') as string) || 'ajukan';
    const buktiFile = formData.get('bukti_file') as File | null;

    if (!tanggalTransaksi) {
      return { success: false, message: 'Tanggal transaksi wajib diisi.' };
    }

    const akunBebanId = parseInt(akunBebanIdRaw, 10);
    if (isNaN(akunBebanId) || akunBebanId <= 0) {
      return { success: false, message: 'Silakan pilih pos akun beban yang sesuai.' };
    }

    const jumlah = parseInt(jumlahRaw, 10);
    if (isNaN(jumlah) || jumlah < 10000 || jumlah > 25000000) {
      return {
        success: false,
        message: 'Nominal pengajuan harus antara Rp 10.000 dan Rp 25.000.000.',
      };
    }

    if (keterangan.length < 10) {
      return {
        success: false,
        message: 'Keterangan pengeluaran minimal 10 karakter.',
      };
    }

    // 2. Instansiasi admin client untuk menembus RLS khusus pencarian global MAX(id)
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: maxIdData } = await supabaseAdmin
      .from('pengajuan')
      .select('id')
      .order('id', { ascending: false })
      .limit(1);

    const newId = maxIdData && maxIdData.length > 0 ? maxIdData[0].id + 1 : 1;
    const nomor =
      'PG-' +
      new Date().toISOString().slice(0, 10).replace(/-/g, '') +
      '-' +
      newId.toString().padStart(4, '0');

    // 3. Simpan referensi bukti nota jika diunggah
    let buktiPath: string | null = null;
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    if (buktiFile && buktiFile.size > 0) {
      const sanitizedName = buktiFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      buktiPath = `pengajuan/${dateStr}_${Date.now()}_${sanitizedName}`;

      try {
        await supabase.storage
          .from('bukti-transaksi')
          .upload(buktiPath, buktiFile, { upsert: true });
      } catch {
        // Fallback: simpan nama file referensi
      }
    } else if (jenis === 'reimburse') {
      buktiPath = `nota_manual_${dateStr}_${newId}`;
    }

    // 4. Insert ke tabel pengajuan tetap menggunakan client user (memvalidasi RLS & auth)
    const { data: newPengajuan, error: insertError } = await supabase
      .from('pengajuan')
      .insert({
        id: newId,
        nomor,
        pengaju_id: user.id,
        jenis,
        tanggal_transaksi: tanggalTransaksi,
        akun_beban_id: akunBebanId,
        jumlah,
        keterangan,
        bukti_path: buktiPath,
        status: 'draf',
      })
      .select('id')
      .single();

    if (insertError || !newPengajuan) {
      return {
        success: false,
        message: `Gagal menyimpan pengajuan: ${insertError?.message || 'Database error'}`,
      };
    }

    // 5. Jika user memilih "Ajukan Sekarang", update status ke 'diajukan'
    if (submitAction === 'ajukan') {
      const { error: updateError } = await supabase
        .from('pengajuan')
        .update({
          status: 'diajukan',
          diajukan_pada: new Date().toISOString(),
        })
        .eq('id', newPengajuan.id);

      if (updateError) {
        return {
          success: false,
          message: `Pengajuan tersimpan sebagai draf, namun gagal diajukan: ${updateError.message}`,
        };
      }
    }

    // 6. Revalidate cache halaman pengajuan & dashboard
    revalidatePath('/pengajuan');
    revalidatePath('/dashboard');

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Terjadi kesalahan sistem yang tidak terduga.',
    };
  }
}
