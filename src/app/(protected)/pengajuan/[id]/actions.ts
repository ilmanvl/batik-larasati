'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// 1. Verifikasi oleh Akuntan (Menyetujui jika <= 1 Jt, atau Meneruskan ke Direktur jika > 1 Jt)
export async function verifikasiPengajuanAction(pengajuanId: number): Promise<{
  success: boolean;
  message?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: 'Sesi Anda telah berakhir.' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('peran')
      .eq('id', user.id)
      .single();

    if (profile?.peran !== 'akuntan') {
      return { success: false, message: 'Hanya Akuntan yang berwenang memverifikasi pengajuan.' };
    }

    const { data: pengajuan } = await supabase
      .from('pengajuan')
      .select('id, jumlah, status')
      .eq('id', pengajuanId)
      .single();

    if (!pengajuan || pengajuan.status !== 'diajukan') {
      return { success: false, message: 'Status pengajuan tidak valid untuk verifikasi.' };
    }

    const nextStatus = pengajuan.jumlah > 1000000 ? 'menunggu_direktur' : 'disetujui';
    const now = new Date().toISOString();

    const updatePayload: Record<string, any> = {
      status: nextStatus,
      diverifikasi_oleh: user.id,
      diverifikasi_pada: now,
    };

    if (nextStatus === 'disetujui') {
      updatePayload.disetujui_oleh = user.id;
      updatePayload.disetujui_pada = now;
    }

    const { error } = await supabase
      .from('pengajuan')
      .update(updatePayload)
      .eq('id', pengajuanId);

    if (error) {
      return { success: false, message: `Gagal memperbarui status: ${error.message}` };
    }

    revalidatePath(`/pengajuan/${pengajuanId}`);
    revalidatePath('/pengajuan');
    revalidatePath('/dashboard');

    return {
      success: true,
      message:
        nextStatus === 'menunggu_direktur'
          ? 'Pengajuan berhasil diverifikasi dan diteruskan ke Direktur.'
          : 'Pengajuan berhasil disetujui langsung oleh Akuntan.',
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Terjadi kesalahan sistem.' };
  }
}

// 2. Persetujuan oleh Direktur (Untuk status 'menunggu_direktur')
export async function setujuiDirekturAction(pengajuanId: number): Promise<{
  success: boolean;
  message?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: 'Sesi Anda telah berakhir.' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('peran')
      .eq('id', user.id)
      .single();

    if (profile?.peran !== 'direktur') {
      return { success: false, message: 'Hanya Direktur yang berwenang menyetujui pengajuan ini.' };
    }

    const { data: pengajuan } = await supabase
      .from('pengajuan')
      .select('id, status')
      .eq('id', pengajuanId)
      .single();

    if (!pengajuan || pengajuan.status !== 'menunggu_direktur') {
      return { success: false, message: 'Status dokumen bukan menunggu persetujuan Direktur.' };
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from('pengajuan')
      .update({
        status: 'disetujui',
        disetujui_oleh: user.id,
        disetujui_pada: now,
      })
      .eq('id', pengajuanId);

    if (error) {
      return { success: false, message: `Gagal menyetujui: ${error.message}` };
    }

    revalidatePath(`/pengajuan/${pengajuanId}`);
    revalidatePath('/pengajuan');
    revalidatePath('/dashboard');

    return { success: true, message: 'Pengeluaran kas berhasil disetujui oleh Direktur.' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Terjadi kesalahan sistem.' };
  }
}

// 3. Tolak atau Minta Revisi (Wajib Catatan Peninjau min. 10 karakter)
export async function tolakAtauRevisiAction(
  pengajuanId: number,
  actionType: 'perlu_revisi' | 'ditolak',
  catatan: string
): Promise<{
  success: boolean;
  message?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: 'Sesi Anda telah berakhir.' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('peran')
      .eq('id', user.id)
      .single();

    if (!['akuntan', 'direktur'].includes(profile?.peran || '')) {
      return { success: false, message: 'Anda tidak memiliki hak akses peninjauan.' };
    }

    const cleanCatatan = catatan.trim();
    if (cleanCatatan.length < 10) {
      return {
        success: false,
        message: 'Catatan peninjau / alasan penolakan wajib minimal 10 karakter.',
      };
    }

    const { error } = await supabase
      .from('pengajuan')
      .update({
        status: actionType,
        catatan_peninjau: cleanCatatan,
      })
      .eq('id', pengajuanId);

    if (error) {
      return { success: false, message: `Gagal memperbarui: ${error.message}` };
    }

    revalidatePath(`/pengajuan/${pengajuanId}`);
    revalidatePath('/pengajuan');
    revalidatePath('/dashboard');

    return {
      success: true,
      message:
        actionType === 'perlu_revisi'
          ? 'Pengajuan dikembalikan ke staf untuk diperbaiki.'
          : 'Pengajuan telah ditolak.',
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Terjadi kesalahan sistem.' };
  }
}

// 4. Catat Pencairan Kas (Bayar) oleh Akuntan
export async function cairkanPengajuanAction(
  pengajuanId: number,
  akunKasId: number
): Promise<{
  success: boolean;
  message?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: 'Sesi Anda telah berakhir.' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('peran')
      .eq('id', user.id)
      .single();

    if (profile?.peran !== 'akuntan') {
      return { success: false, message: 'Hanya Akuntan yang berwenang mencairkan kas pengajuan.' };
    }

    if (!akunKasId || akunKasId <= 0) {
      return { success: false, message: 'Silakan pilih rekening kas/bank pengeluaran.' };
    }

    const { data: pengajuan } = await supabase
      .from('pengajuan')
      .select('id, status')
      .eq('id', pengajuanId)
      .single();

    if (!pengajuan || pengajuan.status !== 'disetujui') {
      return { success: false, message: 'Dokumen harus berstatus disetujui sebelum dapat dicairkan.' };
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from('pengajuan')
      .update({
        status: 'dibayar',
        akun_kas_id: akunKasId,
        dibayar_oleh: user.id,
        dibayar_pada: now,
      })
      .eq('id', pengajuanId);

    if (error) {
      return { success: false, message: `Gagal mencatat pencairan: ${error.message}` };
    }

    revalidatePath(`/pengajuan/${pengajuanId}`);
    revalidatePath('/pengajuan');
    revalidatePath('/dashboard');

    return { success: true, message: 'Pencairan dana kas berhasil dicatat dalam pembukuan.' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Terjadi kesalahan sistem.' };
  }
}

// 5. Ajukan Dokumen (Owner mengajukan draf atau dokumen yang telah direvisi)
export async function ajukanDokumenAction(pengajuanId: number): Promise<{
  success: boolean;
  message?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: 'Sesi login Anda telah berakhir.' };
    }

    const { data: pengajuan } = await supabase
      .from('pengajuan')
      .select('id, pengaju_id, status, bukti_path, jenis')
      .eq('id', pengajuanId)
      .single();

    if (!pengajuan || pengajuan.pengaju_id !== user.id) {
      return { success: false, message: 'Anda tidak memiliki hak akses untuk mengajukan dokumen ini.' };
    }

    if (!['draf', 'perlu_revisi'].includes(pengajuan.status)) {
      return { success: false, message: `Dokumen dengan status '${pengajuan.status}' tidak dapat diajukan.` };
    }

    // Pastikan berkas nota sudah terunggah untuk reimbursement
    if (pengajuan.jenis === 'reimburse' && !pengajuan.bukti_path) {
      return { success: false, message: 'Bukti nota fisik pengeluaran wajib diunggah sebelum pengajuan.' };
    }

    const { error } = await supabase
      .from('pengajuan')
      .update({
        status: 'diajukan',
        diajukan_pada: new Date().toISOString(),
      })
      .eq('id', pengajuanId);

    if (error) {
      return { success: false, message: 'Gagal mengajukan dokumen: ' + error.message };
    }

    revalidatePath('/pengajuan');
    revalidatePath(`/pengajuan/${pengajuanId}`);
    revalidatePath('/dashboard');

    return { success: true, message: 'Pengajuan berhasil dikirimkan ke Akuntan untuk diverifikasi.' };
  } catch (err: any) {
    return { success: false, message: 'Terjadi kesalahan sistem: ' + (err?.message || '') };
  }
}

// 6. Batalkan Pengajuan (Owner membatalkan dokumen, strictly 'draf' atau 'perlu_revisi' sesuai BR-08)
export async function batalkanDokumenAction(pengajuanId: number): Promise<{
  success: boolean;
  message?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: 'Sesi login Anda telah berakhir.' };
    }

    const { data: pengajuan } = await supabase
      .from('pengajuan')
      .select('id, pengaju_id, status')
      .eq('id', pengajuanId)
      .single();

    if (!pengajuan || pengajuan.pengaju_id !== user.id) {
      return { success: false, message: 'Anda tidak memiliki wewenang membatalkan dokumen ini.' };
    }

    if (!['draf', 'perlu_revisi'].includes(pengajuan.status)) {
      return {
        success: false,
        message: 'Hanya dokumen dengan status draf atau perlu revisi yang dapat dibatalkan (sesuai BR-08).',
      };
    }

    const { error } = await supabase
      .from('pengajuan')
      .update({ status: 'dibatalkan' })
      .eq('id', pengajuanId);

    if (error) {
      return { success: false, message: 'Gagal membatalkan pengajuan: ' + error.message };
    }

    revalidatePath('/pengajuan');
    revalidatePath(`/pengajuan/${pengajuanId}`);
    revalidatePath('/dashboard');

    return { success: true, message: 'Pengajuan berhasil dibatalkan.' };
  } catch (err: any) {
    return { success: false, message: 'Terjadi kesalahan sistem: ' + (err?.message || '') };
  }
}
