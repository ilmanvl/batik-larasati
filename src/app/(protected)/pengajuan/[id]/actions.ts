'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendNotification } from '@/lib/email';

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

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
      .select('id, pengaju_id, jumlah, status')
      .eq('id', pengajuanId)
      .single();

    if (!pengajuan || pengajuan.status !== 'diajukan') {
      return { success: false, message: 'Status pengajuan tidak valid untuk verifikasi.' };
    }

    if (pengajuan.pengaju_id === user.id) {
      throw new Error('Tidak ada orang yang boleh memverifikasi pengajuannya sendiri.');
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

    // Notifikasi Email ke Direktur jika status menjadi 'menunggu_direktur'
    if (nextStatus === 'menunggu_direktur') {
      try {
        const { data: detail } = await supabaseAdmin
          .from('pengajuan')
          .select('nomor, jumlah, keperluan, pengaju:pengaju_id(nama_lengkap, email)')
          .eq('id', pengajuanId)
          .single();

        const { data: dirProfile } = await supabaseAdmin
          .from('profiles')
          .select('email, nama_lengkap')
          .eq('peran', 'direktur')
          .eq('aktif', true)
          .limit(1)
          .maybeSingle();

        const direkturEmail = dirProfile?.email || 'laras@larasati.test';
        const direkturNama = dirProfile?.nama_lengkap || 'Laras Prameswari';
        const nomorStr = detail?.nomor || `#${pengajuanId}`;
        const pemohonNama = (detail?.pengaju as any)?.nama_lengkap || 'Staf';

        await sendNotification(
          direkturEmail,
          `[Menunggu Persetujuan] Pengajuan ${nomorStr} Membutuhkan Persetujuan Direktur`,
          `
            <p>Yth. Ibu Direktur (<strong>${direkturNama}</strong>),</p>
            <p>Terdapat pengajuan biaya dengan nominal di atas batas wewenang Akuntan (&gt; Rp 1.000.000) yang telah diverifikasi dan saat ini <strong>MEMBUTUHKAN PERSETUJUAN DIREKTUR</strong>:</p>
            <div style="background-color: #1e1e1e; border-left: 4px solid #d4af37; padding: 14px 18px; border-radius: 8px; margin: 16px 0;">
              <p style="margin: 0 0 6px 0;"><strong>Nomor Pengajuan:</strong> ${nomorStr}</p>
              <p style="margin: 0 0 6px 0;"><strong>Pemohon / Staf:</strong> ${pemohonNama}</p>
              <p style="margin: 0 0 6px 0;"><strong>Keperluan:</strong> ${detail?.keperluan || '-'}</p>
              <p style="margin: 0;"><strong>Nominal Pengajuan:</strong> <span style="color: #d4af37; font-weight: 700;">${formatRupiah(detail?.jumlah || pengajuan.jumlah)}</span></p>
            </div>
            <p style="color: #a3a3a3; font-size: 13px;">Silakan masuk ke aplikasi untuk meninjau dokumen dan memberikan persetujuan atau arahan revisi.</p>
          `
        );
      } catch (err) {
        console.warn('[Email Notif] Gagal mengirim notifikasi email ke Direktur:', err);
      }
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

    // Notifikasi Email ke Pengaju saat pengajuan ditolak atau perlu revisi
    try {
      const { data: detail } = await supabaseAdmin
        .from('pengajuan')
        .select('nomor, jumlah, keperluan, pengaju:pengaju_id(nama_lengkap, email)')
        .eq('id', pengajuanId)
        .single();

      const pengajuEmail = (detail?.pengaju as any)?.email;
      const pengajuNama = (detail?.pengaju as any)?.nama_lengkap || 'Rekan';
      const nomorStr = detail?.nomor || `#${pengajuanId}`;

      if (pengajuEmail) {
        if (actionType === 'ditolak') {
          await sendNotification(
            pengajuEmail,
            `[Pengajuan Ditolak] Pengajuan Biaya ${nomorStr}`,
            `
              <p>Yth. <strong>${pengajuNama}</strong>,</p>
              <p>Mohon maaf, pengajuan biaya Anda dengan rincian berikut telah <strong>DITOLAK</strong> oleh peninjau:</p>
              <div style="background-color: #1e1e1e; border-left: 4px solid #ef4444; padding: 14px 18px; border-radius: 8px; margin: 16px 0;">
                <p style="margin: 0 0 6px 0;"><strong>Nomor:</strong> ${nomorStr}</p>
                <p style="margin: 0 0 6px 0;"><strong>Keperluan:</strong> ${detail?.keperluan || '-'}</p>
                <p style="margin: 0 0 6px 0;"><strong>Nominal:</strong> ${formatRupiah(detail?.jumlah || 0)}</p>
                <p style="margin: 0;"><strong>Alasan Penolakan:</strong> "${cleanCatatan}"</p>
              </div>
              <p style="color: #a3a3a3; font-size: 13px;">Silakan login ke aplikasi untuk melihat catatan riwayat dokumen pengajuan Anda.</p>
            `
          );
        } else if (actionType === 'perlu_revisi') {
          await sendNotification(
            pengajuEmail,
            `[Perlu Revisi] Pengajuan Biaya ${nomorStr} Memerlukan Perbaikan`,
            `
              <p>Yth. <strong>${pengajuNama}</strong>,</p>
              <p>Pengajuan biaya Anda dengan rincian berikut memerlukan <strong>PERBAIKAN / REVISI</strong> sebelum dapat diproses lebih lanjut:</p>
              <div style="background-color: #1e1e1e; border-left: 4px solid #f59e0b; padding: 14px 18px; border-radius: 8px; margin: 16px 0;">
                <p style="margin: 0 0 6px 0;"><strong>Nomor:</strong> ${nomorStr}</p>
                <p style="margin: 0 0 6px 0;"><strong>Keperluan:</strong> ${detail?.keperluan || '-'}</p>
                <p style="margin: 0 0 6px 0;"><strong>Nominal:</strong> ${formatRupiah(detail?.jumlah || 0)}</p>
                <p style="margin: 0;"><strong>Catatan Perbaikan:</strong> "${cleanCatatan}"</p>
              </div>
              <p style="color: #a3a3a3; font-size: 13px;">Silakan perbaiki data atau unggah nota yang sesuai melalui aplikasi, kemudian ajukan kembali.</p>
            `
          );
        }
      }
    } catch (err) {
      console.warn('[Email Notif] Gagal mengirim notifikasi email penolakan/revisi ke pengaju:', err);
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

    // Notifikasi Email ke Pengaju saat pengajuan berhasil dicairkan/dibayar
    try {
      const { data: detail } = await supabaseAdmin
        .from('pengajuan')
        .select('nomor, jumlah, keperluan, pengaju:pengaju_id(nama_lengkap, email)')
        .eq('id', pengajuanId)
        .single();

      const pengajuEmail = (detail?.pengaju as any)?.email;
      const pengajuNama = (detail?.pengaju as any)?.nama_lengkap || 'Rekan';
      const nomorStr = detail?.nomor || `#${pengajuanId}`;

      if (pengajuEmail) {
        await sendNotification(
          pengajuEmail,
          `[Dana Dicairkan] Pengajuan Biaya ${nomorStr} Telah Dibayar`,
          `
            <p>Yth. <strong>${pengajuNama}</strong>,</p>
            <p>Kabar baik! Dana pengajuan biaya Anda telah <strong>DICAIRKAN DAN DIBAYARKAN</strong> oleh tim Akuntansi:</p>
            <div style="background-color: #1e1e1e; border-left: 4px solid #10b981; padding: 14px 18px; border-radius: 8px; margin: 16px 0;">
              <p style="margin: 0 0 6px 0;"><strong>Nomor Pengajuan:</strong> ${nomorStr}</p>
              <p style="margin: 0 0 6px 0;"><strong>Keperluan:</strong> ${detail?.keperluan || '-'}</p>
              <p style="margin: 0;"><strong>Total Pencairan:</strong> <span style="color: #34d399; font-weight: 700;">${formatRupiah(detail?.jumlah || 0)}</span></p>
            </div>
            <p style="color: #a3a3a3; font-size: 13px;">Transaksi kas ini telah dicatat dan dibukukan secara resmi dalam jurnal pengeluaran kas.</p>
          `
        );
      }
    } catch (err) {
      console.warn('[Email Notif] Gagal mengirim notifikasi email pencairan ke pengaju:', err);
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

    const { data: profile } = await supabase
      .from('profiles')
      .select('peran, nama_lengkap')
      .eq('id', user.id)
      .single();

    const isAkuntan = profile?.peran === 'akuntan';
    const nextStatus = isAkuntan ? 'menunggu_direktur' : 'diajukan';

    const dbClient = isAkuntan ? supabaseAdmin : supabase;
    const { error } = await dbClient
      .from('pengajuan')
      .update({
        status: nextStatus,
        diajukan_pada: new Date().toISOString(),
      })
      .eq('id', pengajuanId);

    if (error) {
      return { success: false, message: 'Gagal mengajukan dokumen: ' + error.message };
    }

    if (nextStatus === 'menunggu_direktur') {
      try {
        const { data: detail } = await supabaseAdmin
          .from('pengajuan')
          .select('nomor, jumlah, keterangan, keperluan')
          .eq('id', pengajuanId)
          .single();

        const { data: dirProfile } = await supabaseAdmin
          .from('profiles')
          .select('email, nama_lengkap')
          .eq('peran', 'direktur')
          .eq('aktif', true)
          .limit(1)
          .maybeSingle();

        const direkturEmail = dirProfile?.email || 'laras@larasati.test';
        const direkturNama = dirProfile?.nama_lengkap || 'Laras Prameswari';
        const nomorStr = detail?.nomor || `#${pengajuanId}`;
        const pemohonNama = profile?.nama_lengkap || 'Akuntan';

        await sendNotification(
          direkturEmail,
          `[Menunggu Persetujuan] Pengajuan ${nomorStr} Membutuhkan Persetujuan Direktur`,
          `
            <p>Yth. Ibu Direktur (<strong>${direkturNama}</strong>),</p>
            <p>Terdapat pengajuan biaya yang diajukan oleh Akuntan (<strong>${pemohonNama}</strong>) yang saat ini <strong>MEMBUTUHKAN PERSETUJUAN DIREKTUR</strong> (sesuai aturan segregasi wewenang):</p>
            <div style="background-color: #1e1e1e; border-left: 4px solid #d4af37; padding: 14px 18px; border-radius: 8px; margin: 16px 0;">
              <p style="margin: 0 0 6px 0;"><strong>Nomor Pengajuan:</strong> ${nomorStr}</p>
              <p style="margin: 0 0 6px 0;"><strong>Pemohon:</strong> ${pemohonNama} (Akuntan)</p>
              <p style="margin: 0 0 6px 0;"><strong>Keterangan:</strong> ${detail?.keterangan || (detail as any)?.keperluan || '-'}</p>
              <p style="margin: 0;"><strong>Nominal Pengajuan:</strong> <span style="color: #d4af37; font-weight: 700;">${formatRupiah(detail?.jumlah || 0)}</span></p>
            </div>
            <p style="color: #a3a3a3; font-size: 13px;">Silakan masuk ke aplikasi untuk meninjau dokumen dan memberikan persetujuan atau arahan revisi.</p>
          `
        );
      } catch (err) {
        console.warn('[Email Notif] Gagal mengirim notifikasi email ke Direktur:', err);
      }
    }

    revalidatePath('/pengajuan');
    revalidatePath(`/pengajuan/${pengajuanId}`);
    revalidatePath('/dashboard');

    return {
      success: true,
      message: isAkuntan
        ? 'Pengajuan berhasil diajukan dan diteruskan ke Direktur untuk disetujui.'
        : 'Pengajuan berhasil dikirimkan ke Akuntan untuk diverifikasi.',
    };
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
        message: 'Hanya dokumen dengan status draf atau perlu revisi yang dapat dibatalkan.',
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
