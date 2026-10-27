'use server';

import { revalidatePath } from 'next/cache';
import Papa from 'papaparse';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export interface UploadMutasiResult {
  success: boolean;
  message: string;
  insertedCount: number;
  duplicateCount: number;
}

/**
 * Helper untuk mencari nilai kolom berdasarkan variasi header yang mungkin digunakan
 */
function findValue(row: Record<string, any>, candidates: string[]): any {
  for (const cand of candidates) {
    if (row[cand] !== undefined) return row[cand];
    const key = Object.keys(row).find(
      (k) => k.trim().toLowerCase() === cand.toLowerCase()
    );
    if (key && row[key] !== undefined) return row[key];
  }
  return undefined;
}

/**
 * Helper untuk normalisasi string tanggal menjadi format ISO YYYY-MM-DD
 */
function parseDate(val: any): string | null {
  if (!val) return null;
  const str = String(val).trim();
  if (!str) return null;

  // Format YYYY-MM-DD atau YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Format DD/MM/YYYY atau DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Coba parse native Date
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return null;
}

/**
 * Helper untuk membersihkan angka dari format mata uang, desimal, atau tanda negatif/kurung
 */
function parseAmount(val: any): number {
  if (val === null || val === undefined) return 0;
  let str = String(val).trim();
  if (!str) return 0;

  let isNegative = false;
  // Deteksi format negatif kurung akuntansi: (100.000)
  if (str.startsWith('(') && str.endsWith(')')) {
    isNegative = true;
    str = str.slice(1, -1).trim();
  } else if (str.startsWith('-')) {
    isNegative = true;
    str = str.slice(1).trim();
  }

  // Bersihkan karakter selain angka, minus, koma, titik
  str = str.replace(/[^\d.,]/g, '');
  if (!str) return 0;

  // Tangani pemisah ribuan & desimal
  if (str.includes('.') && str.includes(',')) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      // Contoh: 1.250.000,00 -> buang titik, jadikan koma sebagai titik
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // Contoh: 1,250,000.00 -> buang koma
      str = str.replace(/,/g, '');
    }
  } else if (str.includes('.')) {
    const parts = str.split('.');
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      // Ribuan format Indonesia: 1.000.000 atau 100.000
      str = str.replace(/\./g, '');
    }
  } else if (str.includes(',')) {
    const parts = str.split(',');
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      // Ribuan format US: 1,000,000
      str = str.replace(/,/g, '');
    } else {
      // Desimal format Indonesia: 100,50 -> ganti koma dengan titik
      str = str.replace(',', '.');
    }
  }

  const num = Math.round(Number(str));
  if (isNaN(num)) return 0;
  return isNegative ? -Math.abs(num) : num;
}

function parseNullableAmount(val: any): number | null {
  if (val === null || val === undefined) return null;
  const str = String(val).trim();
  if (!str || str === '-' || str.toLowerCase() === 'null') return null;
  return parseAmount(str);
}

/**
 * Server Action: Mengunggah dan memproses CSV Mutasi Rekening Bank
 */
export async function uploadMutasiCSV(formData: FormData): Promise<UploadMutasiResult> {
  try {
    const supabase = await createClient();

    // 1. Verifikasi Autentikasi Pengguna
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        message: 'Sesi login telah berakhir. Silakan masuk kembali.',
        insertedCount: 0,
        duplicateCount: 0,
      };
    }

    // 2. Verifikasi Otorisasi: Hanya Akuntan yang berhak mengimpor mutasi bank
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('peran, aktif')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.aktif) {
      return {
        success: false,
        message: 'Akun Anda tidak aktif atau profil tidak ditemukan.',
        insertedCount: 0,
        duplicateCount: 0,
      };
    }

    if (profile.peran !== 'akuntan') {
      return {
        success: false,
        message: 'Akses ditolak. Hanya peran Akuntan yang dapat mengimpor mutasi bank.',
        insertedCount: 0,
        duplicateCount: 0,
      };
    }

    // 3. Validasi Form Data
    const file = formData.get('file') as File | null;
    const akunBankIdRaw = formData.get('akun_bank_id');

    if (!file || file.size === 0) {
      return {
        success: false,
        message: 'File CSV mutasi rekening wajib diunggah.',
        insertedCount: 0,
        duplicateCount: 0,
      };
    }

    const akunBankId = Number(akunBankIdRaw);
    if (!akunBankId || isNaN(akunBankId)) {
      return {
        success: false,
        message: 'Pilih akun buku besar bank/kas yang valid.',
        insertedCount: 0,
        duplicateCount: 0,
      };
    }

    // Pastikan akun bank ada di database
    const { data: akunData, error: akunErr } = await supabaseAdmin
      .from('akun')
      .select('id, nama, kode')
      .eq('id', akunBankId)
      .single();

    if (akunErr || !akunData) {
      return {
        success: false,
        message: 'Akun bank yang dipilih tidak ditemukan dalam daftar bagan akun.',
        insertedCount: 0,
        duplicateCount: 0,
      };
    }

    // 4. Ekstrak dan Parse CSV menggunakan Papa.parse
    const csvContent = await file.text();
    const parsed = Papa.parse<Record<string, any>>(csvContent, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.trim(),
    });

    if (!parsed.data || parsed.data.length === 0) {
      return {
        success: false,
        message: 'File CSV kosong atau tidak memiliki baris data yang terbaca.',
        insertedCount: 0,
        duplicateCount: 0,
      };
    }

    // 5. Normalisasi Baris Data
    const rowsToInsert: {
      akun_bank_id: number;
      tanggal: string;
      deskripsi: string;
      jumlah: number;
      saldo: number | null;
      nama_file: string;
      diimpor_oleh: string;
    }[] = [];

    const filename = file.name || 'mutasi.csv';

    for (const rawRow of parsed.data) {
      const tanggalRaw = findValue(rawRow, [
        'tanggal',
        'date',
        'tgl',
        'trans_date',
        'transaction_date',
        'waktu',
      ]);
      const deskripsiRaw = findValue(rawRow, [
        'deskripsi',
        'keterangan',
        'description',
        'uraian',
        'narration',
        'memo',
        'detail',
      ]);
      const jumlahRaw = findValue(rawRow, [
        'jumlah',
        'amount',
        'nominal',
        'mutasi',
        'nilai',
        'net',
      ]);
      const saldoRaw = findValue(rawRow, ['saldo', 'balance', 'sisa']);

      // Cek apakah ada kolom debet / kredit terpisah
      const debetRaw = findValue(rawRow, ['debet', 'debit', 'keluar', 'out']);
      const kreditRaw = findValue(rawRow, ['kredit', 'credit', 'masuk', 'in']);

      const parsedTanggal = parseDate(tanggalRaw);
      const deskripsi = (deskripsiRaw ? String(deskripsiRaw).trim() : '');

      let jumlah = 0;
      if (jumlahRaw !== undefined && jumlahRaw !== null && String(jumlahRaw).trim() !== '') {
        jumlah = parseAmount(jumlahRaw);
      } else if (debetRaw !== undefined || kreditRaw !== undefined) {
        const debet = parseAmount(debetRaw);
        const kredit = parseAmount(kreditRaw);
        if (kredit > 0) {
          jumlah = kredit;
        } else if (debet > 0) {
          jumlah = -Math.abs(debet);
        }
      }

      // Validasi: Abaikan baris jika tanggal tidak valid, deskripsi kosong, atau jumlah 0
      if (!parsedTanggal || !deskripsi || jumlah === 0) {
        continue;
      }

      const saldo = parseNullableAmount(saldoRaw);

      rowsToInsert.push({
        akun_bank_id: akunBankId,
        tanggal: parsedTanggal,
        deskripsi,
        jumlah,
        saldo,
        nama_file: filename,
        diimpor_oleh: user.id,
      });
    }

    if (rowsToInsert.length === 0) {
      return {
        success: false,
        message:
          'Tidak ada baris valid yang ditemukan dalam file CSV (pastikan kolom Tanggal, Deskripsi, dan Jumlah terisi serta bukan 0).',
        insertedCount: 0,
        duplicateCount: 0,
      };
    }

    // 6. Logika Insert dengan Penanganan Anti-Duplikasi (Constraint uq_mutasi_bank)
    let insertedCount = 0;
    let duplicateCount = 0;

    for (const row of rowsToInsert) {
      const { error } = await supabaseAdmin.from('mutasi_bank').insert(row);

      if (!error) {
        insertedCount++;
      } else if (
        error.code === '23505' ||
        error.message?.includes('duplicate key') ||
        error.message?.includes('uq_mutasi_bank')
      ) {
        duplicateCount++;
      } else {
        console.error('Error saat menyimpan baris mutasi bank:', error);
      }
    }

    // 7. Catat ke Audit Log jika ada baris yang berhasil diimpor
    if (insertedCount > 0) {
      await supabaseAdmin.from('audit_log').insert({
        pelaku_id: user.id,
        aksi: 'IMPOR_MUTASI_BANK',
        nama_tabel: 'mutasi_bank',
        id_data: String(akunBankId),
        data_baru: {
          akun_bank: akunData.nama,
          nama_file: filename,
          total_baris_valid: rowsToInsert.length,
          berhasil_diimpor: insertedCount,
          duplikat_diabaikan: duplicateCount,
        },
      });
    }

    // 8. Revalidasi halaman terkait
    revalidatePath('/jurnal');
    revalidatePath('/mutasi-bank');
    revalidatePath('/buku-besar');

    const resultMessage =
      duplicateCount > 0
        ? `Impor selesai: ${insertedCount} baris baru berhasil disimpan, ${duplicateCount} baris duplikat diabaikan.`
        : `Impor berhasil: ${insertedCount} baris mutasi rekening berhasil disimpan.`;

    return {
      success: true,
      message: resultMessage,
      insertedCount,
      duplicateCount,
    };
  } catch (err: any) {
    console.error('Error pada uploadMutasiCSV:', err);
    return {
      success: false,
      message: err?.message || 'Terjadi kesalahan sistem saat memproses file CSV.',
      insertedCount: 0,
      duplicateCount: 0,
    };
  }
}
