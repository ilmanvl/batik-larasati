import { createClient } from '@/lib/supabase/server';
import type { PeranType } from '@/types/database';

export function formatRupiah(amount: number): string {
  const isNegative = amount < 0;
  const absFormatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));

  return isNegative ? `(${absFormatted})` : absFormatted;
}

export interface FinanceDashboardData {
  totalKasBank: number;
  pendapatanBulanIni: number;
  bebanBulanIni: number;
  labaRugiBulanIni: number;
  antreanPersetujuan: number;
  antreanLabel: string;
  periodeAktif: {
    nama: string;
    status: string;
    draftCount: number;
  };
  antreanPengajuan: Array<{
    id: number;
    nomor: string | null;
    tanggal_transaksi: string;
    keterangan: string;
    jumlah: number;
    status: string;
    pengaju: {
      nama_lengkap: string;
    } | null;
  }>;
}

export interface StafDashboardData {
  totalPengajuan: number;
  menungguVerifikasi: number;
  perluRevisi: number;
  selesaiDibayar: number;
  pengajuanTerbaru: Array<{
    id: number;
    nomor: string | null;
    tanggal_transaksi: string;
    keterangan: string;
    jumlah: number;
    status: string;
  }>;
}

// -------------------------------------------------------------
// Data Dashboard untuk Tim Finance (Akuntan & Direktur)
// -------------------------------------------------------------
export async function getFinanceDashboardData(role: PeranType): Promise<FinanceDashboardData> {
  const supabase = await createClient();

  // 1. Hitung Total Kas & Bank dari baris jurnal yang diposting
  const { data: kasAccounts } = await supabase
    .from('akun')
    .select('id')
    .eq('is_kas_bank', true);

  let totalKasBank = 0;
  if (kasAccounts && kasAccounts.length > 0) {
    const kasIds = kasAccounts.map((a) => a.id);
    const { data: kasLines } = await supabase
      .from('jurnal_baris')
      .select('debit, kredit, jurnal!inner(status)')
      .in('akun_id', kasIds)
      .eq('jurnal.status', 'diposting');

    if (kasLines) {
      for (const line of kasLines) {
        totalKasBank += Number(line.debit) - Number(line.kredit);
      }
    }
  }

  // 2. Ambil Periode Berjalan (Periode Terakhir)
  const { data: periodes } = await supabase
    .from('periode')
    .select('*')
    .order('id', { ascending: false })
    .limit(1);

  const periode = periodes?.[0];
  let pendapatanBulanIni = 0;
  let bebanBulanIni = 0;
  let draftCount = 0;

  if (periode) {
    // Hitung pendapatan dan beban di periode tersebut
    const { data: lines } = await supabase
      .from('jurnal_baris')
      .select('debit, kredit, akun!inner(tipe), jurnal!inner(status, periode_id)')
      .eq('jurnal.periode_id', periode.id)
      .eq('jurnal.status', 'diposting');

    if (lines) {
      for (const l of lines as any[]) {
        if (l.akun?.tipe === 'pendapatan') {
          pendapatanBulanIni += Number(l.kredit) - Number(l.debit);
        } else if (l.akun?.tipe === 'beban') {
          bebanBulanIni += Number(l.debit) - Number(l.kredit);
        }
      }
    }

    // Hitung jumlah draf jurnal di periode aktif (BR-06)
    const { count } = await supabase
      .from('jurnal')
      .select('*', { count: 'exact', head: true })
      .eq('periode_id', periode.id)
      .eq('status', 'draf');

    draftCount = count || 0;
  }

  // 3. Antrean Persetujuan Sesuai Peran (Akuntan vs Direktur)
  const statusFilter = role === 'direktur' ? 'menunggu_direktur' : 'diajukan';
  const antreanLabel =
    role === 'direktur' ? 'Menunggu Direktur (> Rp 1 Jt / Akuntan)' : 'Menunggu Verifikasi Akuntan';

  const { count: antreanCount } = await supabase
    .from('pengajuan')
    .select('*', { count: 'exact', head: true })
    .eq('status', statusFilter);

  // Ambil 5 pengajuan teratas yang sedang menunggu
  const { data: antreanPengajuan } = await supabase
    .from('pengajuan')
    .select('id, nomor, tanggal_transaksi, keterangan, jumlah, status, profiles!pengajuan_pengaju_id_fkey(nama_lengkap)')
    .eq('status', statusFilter)
    .order('id', { ascending: false })
    .limit(5);

  const monthNames = [
    '',
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];

  return {
    totalKasBank,
    pendapatanBulanIni,
    bebanBulanIni,
    labaRugiBulanIni: pendapatanBulanIni - bebanBulanIni,
    antreanPersetujuan: antreanCount || 0,
    antreanLabel,
    periodeAktif: {
      nama: periode ? `${monthNames[periode.bulan]} ${periode.tahun}` : 'Tidak Ada',
      status: periode?.status || 'terbuka',
      draftCount,
    },
    antreanPengajuan:
      antreanPengajuan?.map((p: any) => ({
        id: p.id,
        nomor: p.nomor,
        tanggal_transaksi: p.tanggal_transaksi,
        keterangan: p.keterangan,
        jumlah: p.jumlah,
        status: p.status,
        pengaju: p.profiles,
      })) || [],
  };
}

// -------------------------------------------------------------
// Data Dashboard untuk Staf
// -------------------------------------------------------------
export async function getStafDashboardData(userId: string): Promise<StafDashboardData> {
  const supabase = await createClient();

  const { data: pengajuanList } = await supabase
    .from('pengajuan')
    .select('id, nomor, tanggal_transaksi, keterangan, jumlah, status')
    .eq('pengaju_id', userId)
    .order('id', { ascending: false });

  const list = pengajuanList || [];
  let menungguVerifikasi = 0;
  let perluRevisi = 0;
  let selesaiDibayar = 0;

  for (const item of list) {
    if (['diajukan', 'menunggu_direktur'].includes(item.status)) {
      menungguVerifikasi++;
    } else if (item.status === 'perlu_revisi') {
      perluRevisi++;
    } else if (item.status === 'dibayar') {
      selesaiDibayar++;
    }
  }

  return {
    totalPengajuan: list.length,
    menungguVerifikasi,
    perluRevisi,
    selesaiDibayar,
    pengajuanTerbaru: list.slice(0, 5),
  };
}
