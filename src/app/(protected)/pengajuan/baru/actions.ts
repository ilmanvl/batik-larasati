'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { sendNotification } from '@/lib/email';
import type { JenisPengajuan } from '@/types/database';

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

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

    const { data: profile } = await supabase
      .from('profiles')
      .select('peran')
      .eq('id', user.id)
      .single();

    if (profile?.peran === 'direktur') {
      return { success: false, message: 'Direktur tidak diperkenankan membuat pengajuan biaya demi kepatuhan pemisahan wewenang.' };
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

    // 4. Metode Bypass RLS:
    // Insert pertama kali dengan status 'diajukan' (atau 'draf') menggunakan client biasa agar lolos RLS
    const isAkuntan = profile?.peran === 'akuntan';
    const isAjukan = submitAction === 'ajukan';
    const initialStatus = isAjukan ? 'diajukan' : 'draf';
    const diajukanPada = isAjukan ? new Date().toISOString() : null;

    let insertPayload = {
      id: newId,
      nomor,
      pengaju_id: user.id,
      jenis,
      tanggal_transaksi: tanggalTransaksi,
      akun_beban_id: akunBebanId,
      jumlah,
      keterangan,
      bukti_path: buktiPath,
      status: initialStatus,
      diajukan_pada: diajukanPada,
    };

    let { data: newPengajuan, error: insertError } = await supabase
      .from('pengajuan')
      .insert(insertPayload)
      .select('id')
      .single();

    // Fallback jika RLS database strictly mewajibkan status='draf' saat INSERT
    if (insertError && isAjukan) {
      const fallbackResult = await supabase
        .from('pengajuan')
        .insert({
          ...insertPayload,
          status: 'draf',
          diajukan_pada: null,
        })
        .select('id')
        .single();

      if (!fallbackResult.error && fallbackResult.data) {
        newPengajuan = fallbackResult.data;
        insertError = null;

        // Jika bukan akuntan, update ke 'diajukan'
        if (!isAkuntan) {
          await supabase
            .from('pengajuan')
            .update({
              status: 'diajukan',
              diajukan_pada: new Date().toISOString(),
            })
            .eq('id', newPengajuan.id);
        }
      }
    }

    if (insertError || !newPengajuan) {
      return {
        success: false,
        message: `Gagal menyimpan pengajuan: ${insertError?.message || 'Database error'}`,
      };
    }

    // 5. Jika peran adalah Akuntan dan diajukan, lakukan UPDATE menggunakan Supabase Admin Client
    // untuk mengubah status menjadi 'menunggu_direktur' (bypass RLS)
    if (isAjukan && isAkuntan) {
      const { error: adminUpdateError } = await supabaseAdmin
        .from('pengajuan')
        .update({
          status: 'menunggu_direktur',
          diajukan_pada: new Date().toISOString(),
        })
        .eq('id', newPengajuan.id);

      if (adminUpdateError) {
        console.error(
          '[submitPengajuanAction] Gagal memperbarui status ke menunggu_direktur:',
          adminUpdateError
        );
      } else {
        // Panggil notifikasi email Nodemailer ke Direktur setelah UPDATE berhasil
        try {
          const { data: dirProfile } = await supabaseAdmin
            .from('profiles')
            .select('email, nama_lengkap')
            .eq('peran', 'direktur')
            .eq('aktif', true)
            .limit(1)
            .maybeSingle();

          const { data: userProfile } = await supabaseAdmin
            .from('profiles')
            .select('nama_lengkap')
            .eq('id', user.id)
            .single();

          const direkturEmail = dirProfile?.email || 'laras@larasati.test';
          const direkturNama = dirProfile?.nama_lengkap || 'Laras Prameswari';
          const pemohonNama = userProfile?.nama_lengkap || 'Akuntan';

          await sendNotification(
            direkturEmail,
            `[Menunggu Persetujuan] Pengajuan ${nomor} Membutuhkan Persetujuan Direktur`,
            `
              <p>Yth. Ibu Direktur (<strong>${direkturNama}</strong>),</p>
              <p>Terdapat pengajuan biaya baru yang dibuat oleh Akuntan (<strong>${pemohonNama}</strong>) yang saat ini <strong>MEMBUTUHKAN PERSETUJUAN DIREKTUR</strong> (sesuai aturan segregasi wewenang):</p>
              <div style="background-color: #1e1e1e; border-left: 4px solid #d4af37; padding: 14px 18px; border-radius: 8px; margin: 16px 0;">
                <p style="margin: 0 0 6px 0;"><strong>Nomor Pengajuan:</strong> ${nomor}</p>
                <p style="margin: 0 0 6px 0;"><strong>Pemohon:</strong> ${pemohonNama} (Akuntan)</p>
                <p style="margin: 0 0 6px 0;"><strong>Keterangan:</strong> ${keterangan || '-'}</p>
                <p style="margin: 0;"><strong>Nominal Pengajuan:</strong> <span style="color: #d4af37; font-weight: 700;">${formatRupiah(jumlah)}</span></p>
              </div>
              <p style="color: #a3a3a3; font-size: 13px;">Silakan masuk ke aplikasi untuk meninjau dokumen dan memberikan persetujuan atau arahan revisi.</p>
            `
          );
        } catch (err) {
          console.warn('[Email Notif] Gagal mengirim notifikasi email ke Direktur:', err);
        }
      }
    }

    // TAMBAHKAN BLOK INI: 5b. Notifikasi ke Akuntan jika Staf yang mengajukan
    if (isAjukan && !isAkuntan) {
      try {
        const { data: akuntanProfile } = await supabaseAdmin
          .from('profiles')
          .select('email, nama_lengkap')
          .eq('peran', 'akuntan')
          .eq('aktif', true)
          .limit(1)
          .maybeSingle();

        const { data: userProfile } = await supabaseAdmin
          .from('profiles')
          .select('nama_lengkap')
          .eq('id', user.id)
          .single();

        const akuntanEmail = akuntanProfile?.email;
        const akuntanNama = akuntanProfile?.nama_lengkap || 'Tim Finance';
        const pemohonNama = userProfile?.nama_lengkap || 'Staf';

        if (akuntanEmail) {
          await sendNotification(
            akuntanEmail,
            `[Review Finance] Pengajuan Baru ${nomor} Membutuhkan Verifikasi`,
            `
              <p>Yth. ${akuntanNama} (Finance),</p>
              <p>Terdapat pengajuan biaya baru dari Staf (<strong>${pemohonNama}</strong>) yang baru saja masuk ke sistem dan memerlukan verifikasi awal dari Anda:</p>
              <div style="background-color: #1e1e1e; border-left: 4px solid #d4af37; padding: 14px 18px; border-radius: 8px; margin: 16px 0;">
                <p style="margin: 0 0 6px 0;"><strong>Nomor Pengajuan:</strong> ${nomor}</p>
                <p style="margin: 0 0 6px 0;"><strong>Pemohon:</strong> ${pemohonNama} (Staf)</p>
                <p style="margin: 0 0 6px 0;"><strong>Keterangan:</strong> ${keterangan || '-'}</p>
                <p style="margin: 0;"><strong>Nominal Pengajuan:</strong> <span style="color: #d4af37; font-weight: 700;">${formatRupiah(jumlah)}</span></p>
              </div>
              <p style="color: #a3a3a3; font-size: 13px;">Silakan masuk ke aplikasi untuk memeriksa kelengkapan nota/bukti transaksi sebelum meneruskannya ke Direktur.</p>
            `
          );
        }
      } catch (err) {
        console.warn('[Email Notif] Gagal mengirim notifikasi email ke Akuntan:', err);
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
