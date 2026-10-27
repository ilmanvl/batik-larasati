'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { uploadMutasiCSV } from '@/app/actions/mutasi';
import type { PeranType } from '@/types/database';
import {
  UploadCloud,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Filter,
  ArrowLeftRight,
  FileText,
  HelpCircle,
  BookOpen,
} from 'lucide-react';

export interface BankAccountOption {
  id: number;
  kode: string;
  nama: string;
  is_kas_bank?: boolean;
}

export interface MutasiItem {
  id: number;
  akun_bank_id: number;
  tanggal: string;
  deskripsi: string;
  jumlah: number;
  saldo: number | null;
  nama_file: string;
  jurnal_id: number | null;
  diimpor_pada: string | null;
  akun?: {
    id: number;
    kode: string;
    nama: string;
  } | null;
}

interface MutasiClientProps {
  userRole: PeranType;
  bankAccounts: BankAccountOption[];
  unreconciledMutasi: MutasiItem[];
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatTanggalIndo(tgl: string): string {
  if (!tgl) return '-';
  const parts = tgl.split('-');
  if (parts.length === 3) {
    const bulan = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'Mei',
      'Jun',
      'Jul',
      'Agu',
      'Sep',
      'Okt',
      'Nov',
      'Des',
    ];
    return `${parts[2]} ${bulan[parseInt(parts[1], 10) - 1]} ${parts[0]}`;
  }
  return tgl;
}

export function MutasiClient({
  userRole,
  bankAccounts,
  unreconciledMutasi,
}: MutasiClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form State
  const [selectedAkunId, setSelectedAkunId] = useState<string>(
    bankAccounts[0]?.id ? String(bankAccounts[0].id) : ''
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBank, setFilterBank] = useState<string>('all');
  const [showGuide, setShowGuide] = useState(false);

  // Kalkulasi Metrik Ringkasan
  const totalDanaMasuk = unreconciledMutasi
    .filter((m) => m.jumlah > 0)
    .reduce((sum, m) => sum + m.jumlah, 0);

  const totalDanaKeluar = unreconciledMutasi
    .filter((m) => m.jumlah < 0)
    .reduce((sum, m) => sum + Math.abs(m.jumlah), 0);

  // Filter Data
  const filteredMutasi = unreconciledMutasi.filter((item) => {
    const matchSearch =
      item.deskripsi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tanggal.includes(searchQuery) ||
      String(item.jumlah).includes(searchQuery);

    const matchBank =
      filterBank === 'all' || String(item.akun_bank_id) === filterBank;

    return matchSearch && matchBank;
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.toLowerCase().endsWith('.csv')) {
        setUploadResult({
          success: false,
          message: 'Format file tidak didukung. Mohon gunakan file berekstensi .csv',
        });
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setUploadResult(null);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadResult({
        success: false,
        message: 'Pilih file CSV mutasi rekening terlebih dahulu.',
      });
      return;
    }
    if (!selectedAkunId) {
      setUploadResult({
        success: false,
        message: 'Pilih akun bank tujuan mutasi.',
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('akun_bank_id', selectedAkunId);

    startTransition(async () => {
      const res = await uploadMutasiCSV(formData);
      setUploadResult(res);

      if (res.success) {
        setSelectedFile(null);
        // Reset file input
        const fileInput = document.getElementById('csv-file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Header Banner Minimalist Heritage */}
      <div className="p-6 sm:p-7 rounded-3xl liquid-glass-header text-white">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase tracking-wider text-[#d4af37] font-bold">
                Rekonsiliasi Kas & Bank
              </span>
              <span className="text-neutral-600">·</span>
              <span className="text-xs text-neutral-400">Impor Mutasi Rekening</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <span>Mutasi Bank</span>
              <ArrowLeftRight className="w-6 h-6 text-[#d4af37]" />
            </h1>
            <p className="text-xs sm:text-sm text-neutral-300 mt-1 max-w-2xl leading-relaxed">
              Unggah laporan CSV mutasi rekening koran untuk diverifikasi dan dicatat ke dalam
              jurnal umum secara akurat tanpa risiko pencatatan ganda.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="self-start md:self-center inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.12] text-neutral-300 hover:text-white transition-colors cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-[#d4af37]" />
            <span>Format Kolom CSV</span>
          </button>
        </div>
      </div>

      {/* Panduan Format CSV (Bisa di-toggle) */}
      {showGuide && (
        <div className="p-4 sm:p-5 rounded-2xl bg-[#141414] border border-[#2e2e2e] text-xs text-neutral-300 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[#d4af37]" />
              <span>Ketentuan Format Berkas CSV</span>
            </h3>
            <button
              onClick={() => setShowGuide(false)}
              className="text-neutral-400 hover:text-white text-xs"
            >
              Tutup
            </button>
          </div>
          <p className="text-neutral-400 leading-relaxed">
            Sistem secara fleksibel mendeteksi header tabel mutasi bank Indonesia (BCA, Mandiri, BNI, BRI, dsb). Pastikan file CSV memuat kolom berikut:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <span className="font-semibold text-[#d4af37] block mb-1">Tanggal (Wajib)</span>
              <p className="text-[11px] text-neutral-400">
                Format: <code>YYYY-MM-DD</code> atau <code>DD/MM/YYYY</code> (Contoh: 2026-10-02)
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <span className="font-semibold text-[#d4af37] block mb-1">Deskripsi (Wajib)</span>
              <p className="text-[11px] text-neutral-400">
                Uraian transaksi atau keterangan transfer / pembayaran
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <span className="font-semibold text-[#d4af37] block mb-1">Jumlah / Mutasi (Wajib)</span>
              <p className="text-[11px] text-neutral-400">
                Positif untuk dana masuk, negatif untuk dana keluar (atau kolom Debet/Kredit terpisah)
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <span className="font-semibold text-[#d4af37] block mb-1">Saldo (Opsional)</span>
              <p className="text-[11px] text-neutral-400">
                Saldo akhir rekening koran setelah transaksi selesai
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. Kartu Ringkasan Metrik Rekonsiliasi */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-[#141414] border border-[#2e2e2e] shadow-sm">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
            <span>Transaksi Mengambang</span>
            <FileText className="w-4 h-4 text-[#d4af37]" />
          </div>
          <p className="text-2xl font-bold text-white tracking-tight">
            {unreconciledMutasi.length}
          </p>
          <p className="text-[11px] text-neutral-500 mt-1">Belum direkonsiliasi ke jurnal</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#141414] border border-[#2e2e2e] shadow-sm">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
            <span>Penerimaan Belum Dijurnal</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 tracking-tight">
            {formatRupiah(totalDanaMasuk)}
          </p>
          <p className="text-[11px] text-neutral-500 mt-1">Dana masuk ke rekening</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#141414] border border-[#2e2e2e] shadow-sm">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
            <span>Pengeluaran Belum Dijurnal</span>
            <ArrowUpRight className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold text-rose-400 tracking-tight">
            {formatRupiah(totalDanaKeluar)}
          </p>
          <p className="text-[11px] text-neutral-500 mt-1">Dana keluar dari rekening</p>
        </div>
      </div>

      {/* 3. Panel Formulir Unggah CSV */}
      {userRole === 'akuntan' && (
        <div className="p-5 sm:p-6 rounded-2xl bg-[#141414] border border-[#2e2e2e] shadow-sm">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-[#d4af37]" />
              <span>Unggah File CSV Mutasi Bank</span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Pilih akun kas/bank yang sesuai dan unggah berkas CSV dari perbankan Anda.
            </p>
          </div>

          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Dropdown Akun Bank */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Akun Kas / Bank Tujuan
                </label>
                <select
                  value={selectedAkunId}
                  onChange={(e) => setSelectedAkunId(e.target.value)}
                  disabled={isPending}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-[#383838] focus:border-[#d4af37] text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#d4af37] transition-colors"
                >
                  {bankAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id} className="bg-[#181818] text-white">
                      {acc.kode} - {acc.nama}
                    </option>
                  ))}
                </select>
              </div>

              {/* Input File CSV */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Berkas Mutasi (.csv)
                </label>
                <input
                  id="csv-file-input"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  disabled={isPending}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-[#383838] focus:border-[#d4af37] text-xs text-neutral-300 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#d4af37]/20 file:text-[#d4af37] hover:file:bg-[#d4af37]/30 cursor-pointer focus:outline-none"
                />
              </div>
            </div>

            {/* Status Alert */}
            {uploadResult && (
              <div
                className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                  uploadResult.success
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
                }`}
              >
                {uploadResult.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                )}
                <div className="flex-1">
                  <p className="font-semibold">{uploadResult.message}</p>
                </div>
              </div>
            )}

            {/* Tombol Submit */}
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isPending || !selectedFile}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#d4af37] hover:bg-[#b89528] text-black transition-all cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sedang Memproses CSV...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>Unggah CSV Mutasi</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. Tabel Daftar Mutasi Mengambang (Belum Direkonsiliasi) */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#141414] border border-[#2e2e2e] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[#d4af37]" />
              <span>Daftar Mutasi Belum Direkonsiliasi</span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Baris mutasi rekening koran yang belum dipasangkan dengan bukti jurnal umum.
            </p>
          </div>

          {/* Baris Filter & Pencarian */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter Akun Bank */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-neutral-400" />
              <select
                value={filterBank}
                onChange={(e) => setFilterBank(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-black/40 border border-[#383838] text-xs text-neutral-300 focus:outline-none focus:border-[#d4af37]"
              >
                <option value="all" className="bg-[#181818] text-white">
                  Semua Bank
                </option>
                {bankAccounts.map((b) => (
                  <option key={b.id} value={b.id} className="bg-[#181818] text-white">
                    {b.nama}
                  </option>
                ))}
              </select>
            </div>

            {/* Input Pencarian */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                placeholder="Cari deskripsi / tanggal..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg bg-black/40 border border-[#383838] focus:border-[#d4af37] text-xs text-white placeholder-neutral-500 focus:outline-none w-48 sm:w-56"
              />
            </div>
          </div>
        </div>

        {/* Tabel Data Mutasi */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-neutral-300 border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] text-neutral-400">
                <th className="py-3 px-3 font-semibold">Tanggal</th>
                <th className="py-3 px-3 font-semibold">Akun Bank</th>
                <th className="py-3 px-3 font-semibold">Deskripsi Rekening</th>
                <th className="py-3 px-3 font-semibold text-right">Nominal Mutasi</th>
                <th className="py-3 px-3 font-semibold text-right">Saldo</th>
                <th className="py-3 px-3 font-semibold">Nama File</th>
                <th className="py-3 px-3 font-semibold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredMutasi.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-neutral-500">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500/50 mx-auto mb-2" />
                    <p className="font-medium text-neutral-400">
                      Tidak ada mutasi mengambang.
                    </p>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      Semua mutasi rekening bank telah berhasil direkonsiliasi ke jurnal umum.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredMutasi.map((item) => {
                  const isMasuk = item.jumlah > 0;
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-white/[0.02] transition-colors group"
                    >
                      <td className="py-3 px-3 font-mono text-[11px] text-neutral-300 whitespace-nowrap">
                        {formatTanggalIndo(item.tanggal)}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-medium text-white">
                          {item.akun?.nama || `Akun #${item.akun_bank_id}`}
                        </span>
                        <span className="block text-[11px] text-neutral-500 font-mono">
                          {item.akun?.kode || ''}
                        </span>
                      </td>
                      <td className="py-3 px-3 max-w-xs sm:max-w-md">
                        <span className="text-white block truncate" title={item.deskripsi}>
                          {item.deskripsi}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 font-mono font-semibold ${
                            isMasuk ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isMasuk ? (
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          )}
                          {isMasuk ? '+' : '-'}
                          {formatRupiah(Math.abs(item.jumlah))}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-neutral-400 whitespace-nowrap">
                        {item.saldo !== null ? formatRupiah(item.saldo) : '-'}
                      </td>
                      <td className="py-3 px-3 text-neutral-400 text-[11px] whitespace-nowrap truncate max-w-[120px]" title={item.nama_file}>
                        {item.nama_file}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {userRole === 'akuntan' ? (
                          <Link
                            href={`/jurnal/baru?mutasi_id=${item.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#d4af37]/15 hover:bg-[#d4af37]/25 text-[#d4af37] border border-[#d4af37]/30 transition-all cursor-pointer shadow-sm active:scale-95"
                          >
                            <BookOpen className="w-3 h-3" />
                            <span>Jurnalkan</span>
                          </Link>
                        ) : (
                          <span className="text-[11px] text-neutral-500 italic">
                            Khusus Akuntan
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
