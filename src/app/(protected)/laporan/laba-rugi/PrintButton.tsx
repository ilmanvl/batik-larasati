'use client';

import { Printer } from 'lucide-react';

export default function PrintButton() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <button
      type="button"
      onClick={handlePrint}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#d4af37] hover:bg-[#c49f2e] text-neutral-950 transition-all active:scale-95 shadow-sm print:hidden"
      title="Cetak Laporan / Simpan PDF"
    >
      <Printer className="w-3.5 h-3.5" />
      <span>Cetak Laporan</span>
    </button>
  );
}
