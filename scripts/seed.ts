import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

// 1. Baca konfigurasi dari .env.local
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    throw new Error('.env.local tidak ditemukan!');
  }
  const content = fs.readFileSync(envPath, 'utf8');
  const env: Record<string, string> = {};
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        env[trimmed.substring(0, idx).trim()] = trimmed.substring(idx + 1).trim();
      }
    }
  });
  return env;
}

const env = loadEnv();
const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const serviceRoleKey = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum diatur di .env.local');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Helper untuk membersihkan angka (menghapus koma ribuan dan spasi)
function cleanNumber(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  const cleaned = String(val).replace(/,/g, '').trim();
  const num = Number(cleaned);
  return isNaN(num) ? 0 : num;
}

function cleanNullableNumber(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  const cleaned = String(val).replace(/,/g, '').trim();
  const num = Number(cleaned);
  return isNaN(num) ? null : num;
}

// Helper untuk format timestamp ke ISO bila perlu
function cleanTimestamp(val: any): string | null {
  if (!val) return null;
  const s = String(val).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) {
    return s.replace(' ', 'T') + '+07:00'; // WIB timezone
  }
  return s;
}

function cleanDate(val: any): string {
  if (!val) return '';
  const s = String(val).trim();
  if (s.includes(' ')) {
    return s.split(' ')[0];
  }
  return s;
}

async function main() {
  console.log('🚀 Memulai proses seeding data contoh CV Batik Larasati...');

  // 2. Baca file Excel
  const excelPath = path.resolve(process.cwd(), 'docs', 'Data_Contoh_Finance.xlsx');
  if (!fs.existsSync(excelPath)) {
    throw new Error(`File Excel tidak ditemukan di: ${excelPath}`);
  }
  const workbook = XLSX.readFile(excelPath);

  const getSheetData = <T = any>(sheetName: string): T[] => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return [];
    return XLSX.utils.sheet_to_json<T>(sheet, { raw: false });
  };

  // -------------------------------------------------------------
  // Step 1: Buat User Supabase Auth & Petakan UUID
  // -------------------------------------------------------------
  console.log('\n👤 1. Menyiapkan User & Profiles...');
  const akunUjiList = getSheetData<{
    nama_lengkap: string;
    email: string;
    peran: 'staf' | 'akuntan' | 'direktur';
    jabatan: string;
    aktif: string | number;
  }>('Akun Uji').filter((a) => a.email && a.email.includes('@'));

  const excelProfiles = getSheetData<{
    id: string;
    email: string;
  }>('profiles').filter((p) => p.email && p.id);

  const oldUuidToEmail = new Map<string, string>();
  excelProfiles.forEach((p) => {
    oldUuidToEmail.set(p.id.toLowerCase(), p.email.toLowerCase());
  });

  const emailToRealUuid = new Map<string, string>();

  // Ambil user yang sudah ada di Supabase Auth
  const { data: existingUsersData, error: listError } = await supabase.auth.admin.listUsers({ perPage: 100 });
  if (listError) {
    console.error('   ❌ Gagal mengambil daftar user:', listError.message);
  }
  const existingUsers = existingUsersData?.users || [];
  existingUsers.forEach((u) => {
    if (u.email) emailToRealUuid.set(u.email.toLowerCase(), u.id);
  });

  for (const akun of akunUjiList) {
    const emailNorm = akun.email.toLowerCase();
    let userId = emailToRealUuid.get(emailNorm);
    if (!userId) {
      console.log(`   - Membuat auth user: ${akun.email}`);
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: akun.email,
        password: 'Latihan#2026',
        email_confirm: true,
        user_metadata: {
          nama_lengkap: akun.nama_lengkap,
          jabatan: akun.jabatan,
        },
      });

      if (createError) {
        console.error(`     ❌ Gagal membuat user ${akun.email}:`, createError.message);
      } else if (newUser?.user) {
        userId = newUser.user.id;
        emailToRealUuid.set(emailNorm, userId);
      }
    } else {
      console.log(`   - User ${akun.email} sudah ada di Auth.`);
    }
  }

  // Jeda 1 detik agar trigger profiles selesai
  await new Promise((r) => setTimeout(r, 1000));

  // Update profil agar peran, jabatan, dan status aktif sesuai Excel
  for (const akun of akunUjiList) {
    const userId = emailToRealUuid.get(akun.email.toLowerCase());
    if (!userId) continue;

    const isActive = String(akun.aktif) === '1' || String(akun.aktif).toLowerCase() === 'true';
    const { error: updErr } = await supabase
      .from('profiles')
      .update({
        nama_lengkap: akun.nama_lengkap,
        peran: akun.peran,
        jabatan: akun.jabatan,
        aktif: isActive,
      })
      .eq('id', userId);

    if (updErr) {
      console.error(`     ❌ Gagal update profil ${akun.email}:`, updErr.message);
    }
  }
  console.log('   ✅ Profiles berhasil disinkronkan.');

  // Helper untuk memetakan ID lama dari Excel ke UUID baru
  const mapUserId = (oldId: string | null | undefined): string | null => {
    if (!oldId) return null;
    const email = oldUuidToEmail.get(String(oldId).toLowerCase());
    if (email && emailToRealUuid.has(email)) {
      return emailToRealUuid.get(email)!;
    }
    return oldId;
  };

  // -------------------------------------------------------------
  // Step 2: Seed Tabel Akun
  // -------------------------------------------------------------
  console.log('\n📊 2. Seeding tabel akun...');
  const akunRaw = getSheetData<any>('akun').filter((a) => cleanNumber(a.id) > 0 && a.kode);
  const akunRows = akunRaw.map((a) => ({
    id: cleanNumber(a.id),
    kode: String(a.kode),
    nama: a.nama,
    tipe: a.tipe,
    saldo_normal: a.saldo_normal,
    is_kas_bank: String(a.is_kas_bank) === '1' || String(a.is_kas_bank).toLowerCase() === 'true',
    aktif: String(a.aktif) === '1' || String(a.aktif).toLowerCase() === 'true',
    keterangan: a.keterangan || null,
  }));
  const { error: errAkun } = await supabase.from('akun').upsert(akunRows);
  if (errAkun) throw new Error(`Gagal seed akun: ${errAkun.message}`);
  console.log(`   ✅ ${akunRows.length} akun berhasil di-seed.`);

  // -------------------------------------------------------------
  // Step 3: Seed Tabel Periode
  // -------------------------------------------------------------
  console.log('\n📅 3. Seeding tabel periode...');
  const periodeRaw = getSheetData<any>('periode').filter((p) => cleanNumber(p.id) > 0 && cleanNumber(p.tahun) > 0);
  const periodeRows = periodeRaw.map((p) => {
    const thn = cleanNumber(p.tahun);
    const bln = cleanNumber(p.bulan);
    return {
      id: cleanNumber(p.id),
      tahun: thn,
      bulan: bln,
      tanggal_mulai: `${thn}-${String(bln).padStart(2, '0')}-01`,
      status: p.status,
      ditutup_oleh: mapUserId(p.ditutup_oleh),
      ditutup_pada: cleanTimestamp(p.ditutup_pada),
      alasan_buka_ulang: p.alasan_buka_ulang || null,
    };
  });
  const { error: errPeriode } = await supabase.from('periode').upsert(periodeRows);
  if (errPeriode) throw new Error(`Gagal seed periode: ${errPeriode.message}`);
  console.log(`   ✅ ${periodeRows.length} periode berhasil di-seed.`);

  // -------------------------------------------------------------
  // Step 4: Seed Tabel Pengajuan
  // -------------------------------------------------------------
  console.log('\n📝 4. Seeding tabel pengajuan...');
  const pengajuanRaw = getSheetData<any>('pengajuan').filter((pg) => cleanNumber(pg.id) > 0 && pg.tanggal_transaksi);
  const pengajuanRows = pengajuanRaw.map((pg) => ({
    id: cleanNumber(pg.id),
    nomor: pg.nomor || null,
    pengaju_id: mapUserId(pg.pengaju_id),
    jenis: pg.jenis,
    tanggal_transaksi: cleanDate(pg.tanggal_transaksi),
    akun_beban_id: cleanNumber(pg.akun_beban_id),
    jumlah: cleanNumber(pg.jumlah),
    keterangan: pg.keterangan,
    bukti_path: pg.bukti_path || null,
    status: pg.status,
    catatan_peninjau: pg.catatan_peninjau || null,
    diajukan_pada: cleanTimestamp(pg.diajukan_pada),
    diverifikasi_oleh: mapUserId(pg.diverifikasi_oleh),
    diverifikasi_pada: cleanTimestamp(pg.diverifikasi_pada),
    disetujui_oleh: mapUserId(pg.disetujui_oleh),
    disetujui_pada: cleanTimestamp(pg.disetujui_pada),
    akun_kas_id: cleanNullableNumber(pg.akun_kas_id),
    dibayar_oleh: mapUserId(pg.dibayar_oleh),
    dibayar_pada: cleanTimestamp(pg.dibayar_pada),
    dibuat_pada: cleanTimestamp(pg.dibuat_pada) || new Date().toISOString(),
  }));
  const { error: errPengajuan } = await supabase.from('pengajuan').upsert(pengajuanRows);
  if (errPengajuan) throw new Error(`Gagal seed pengajuan: ${errPengajuan.message}`);
  console.log(`   ✅ ${pengajuanRows.length} pengajuan berhasil di-seed.`);

  // -------------------------------------------------------------
  // Step 5: Seed Tabel Jurnal
  // -------------------------------------------------------------
  console.log('\n📖 5. Seeding tabel jurnal...');
  const jurnalRaw = getSheetData<any>('jurnal').filter((j) => cleanNumber(j.id) > 0 && j.tanggal);
  const jurnalRows = jurnalRaw.map((j) => ({
    id: cleanNumber(j.id),
    nomor: j.nomor || null,
    tanggal: cleanDate(j.tanggal),
    periode_id: cleanNumber(j.periode_id),
    keterangan: j.keterangan,
    sumber: j.sumber,
    status: j.status,
    pengajuan_id: cleanNullableNumber(j.pengajuan_id),
    jurnal_dibalik_id: cleanNullableNumber(j.jurnal_dibalik_id),
    dibuat_oleh: mapUserId(j.dibuat_oleh),
    diposting_oleh: mapUserId(j.diposting_oleh),
    diposting_pada: cleanTimestamp(j.diposting_pada),
    dibuat_pada: cleanTimestamp(j.dibuat_pada) || new Date().toISOString(),
  }));
  const { error: errJurnal } = await supabase.from('jurnal').upsert(jurnalRows);
  if (errJurnal) throw new Error(`Gagal seed jurnal: ${errJurnal.message}`);
  console.log(`   ✅ ${jurnalRows.length} jurnal berhasil di-seed.`);

  // -------------------------------------------------------------
  // Step 6: Seed Tabel Jurnal Baris
  // -------------------------------------------------------------
  console.log('\n📑 6. Seeding tabel jurnal_baris...');
  const jbRaw = getSheetData<any>('jurnal_baris').filter((jb) => cleanNumber(jb.id) > 0 && cleanNumber(jb.jurnal_id) > 0);
  const jbRows = jbRaw.map((jb) => ({
    id: cleanNumber(jb.id),
    jurnal_id: cleanNumber(jb.jurnal_id),
    urutan: cleanNumber(jb.urutan) || 1,
    akun_id: cleanNumber(jb.akun_id),
    debit: cleanNumber(jb.debit),
    kredit: cleanNumber(jb.kredit),
    keterangan: jb.keterangan || null,
  }));
  
  // Batch insert per 100 rows
  for (let i = 0; i < jbRows.length; i += 100) {
    const chunk = jbRows.slice(i, i + 100);
    const { error: errJb } = await supabase.from('jurnal_baris').upsert(chunk);
    if (errJb) throw new Error(`Gagal seed jurnal_baris (chunk ${i}): ${errJb.message}`);
  }
  console.log(`   ✅ ${jbRows.length} baris jurnal berhasil di-seed.`);

  // -------------------------------------------------------------
  // Step 7: Seed Tabel Penomoran
  // -------------------------------------------------------------
  console.log('\n🔢 7. Seeding tabel penomoran...');
  const penomoranRaw = getSheetData<any>('penomoran').filter((pn) => pn.jenis && cleanNumber(pn.tahun) > 0);
  const penomoranRows = penomoranRaw.map((pn) => ({
    jenis: pn.jenis,
    tahun: cleanNumber(pn.tahun),
    bulan: cleanNumber(pn.bulan),
    nomor_terakhir: cleanNumber(pn.nomor_terakhir),
  }));
  const { error: errPenomoran } = await supabase.from('penomoran').upsert(penomoranRows);
  if (errPenomoran) throw new Error(`Gagal seed penomoran: ${errPenomoran.message}`);
  console.log(`   ✅ ${penomoranRows.length} baris penomoran berhasil di-seed.`);

  // -------------------------------------------------------------
  // Step 8: Seed Tabel Audit Log
  // -------------------------------------------------------------
  console.log('\n🛡️ 8. Seeding tabel audit_log...');
  const auditRaw = getSheetData<any>('audit_log').filter((al) => cleanNumber(al.id) > 0 && al.aksi);
  const auditRows = auditRaw.map((al) => {
    let dl = null;
    let db = null;
    try {
      if (al.data_lama) dl = typeof al.data_lama === 'string' ? JSON.parse(al.data_lama) : al.data_lama;
    } catch {}
    try {
      if (al.data_baru) db = typeof al.data_baru === 'string' ? JSON.parse(al.data_baru) : al.data_baru;
    } catch {}

    return {
      id: cleanNumber(al.id),
      waktu: cleanTimestamp(al.waktu) || new Date().toISOString(),
      pelaku_id: mapUserId(al.pelaku_id),
      aksi: al.aksi,
      nama_tabel: al.nama_tabel,
      id_data: String(al.id_data),
      data_lama: dl,
      data_baru: db,
    };
  });

  // Batch insert per 100 rows
  for (let i = 0; i < auditRows.length; i += 100) {
    const chunk = auditRows.slice(i, i + 100);
    const { error: errAudit } = await supabase.from('audit_log').upsert(chunk);
    if (errAudit) throw new Error(`Gagal seed audit_log (chunk ${i}): ${errAudit.message}`);
  }
  console.log(`   ✅ ${auditRows.length} audit log berhasil di-seed.`);

  // -------------------------------------------------------------
  // Step 9: Seed Tabel Mutasi Bank
  // -------------------------------------------------------------
  console.log('\n🏦 9. Seeding tabel mutasi_bank...');
  const mutasiRaw = getSheetData<any>('mutasi_bank').filter((m) => cleanNumber(m.id) > 0 && m.tanggal && m.deskripsi);
  if (mutasiRaw.length > 0) {
    const mutasiRows = mutasiRaw.map((m) => ({
      id: cleanNumber(m.id),
      akun_bank_id: cleanNumber(m.akun_bank_id),
      tanggal: cleanDate(m.tanggal),
      deskripsi: m.deskripsi,
      jumlah: cleanNumber(m.jumlah),
      saldo: cleanNullableNumber(m.saldo),
      nama_file: m.nama_file,
      jurnal_id: cleanNullableNumber(m.jurnal_id),
      diimpor_oleh: mapUserId(m.diimpor_oleh),
      diimpor_pada: cleanTimestamp(m.diimpor_pada),
    }));
    const { error: errMutasi } = await supabase.from('mutasi_bank').upsert(mutasiRows);
    if (errMutasi) throw new Error(`Gagal seed mutasi_bank: ${errMutasi.message}`);
    console.log(`   ✅ ${mutasiRows.length} mutasi bank berhasil di-seed.`);
  }

  console.log('\n🎉 Selesai! Seluruh data contoh berhasil di-seed ke Supabase.');
}

main().catch((err) => {
  console.error('\n❌ Terjadi error pada proses seeding:', err);
  process.exit(1);
});
