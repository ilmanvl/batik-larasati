'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { postingJurnalAction } from './actions';
import { CheckCircle2, Loader2, AlertCircle, Send } from 'lucide-react';

interface PostingButtonProps {
  jurnalId: number;
  nomorJurnal: string;
  isBalanced: boolean;
  isPeriodeOpen: boolean;
}

export function PostingButton({
  jurnalId,
  nomorJurnal,
  isBalanced,
  isPeriodeOpen,
}: PostingButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handlePosting = async () => {
    setLoading(true);
    setErrorMsg(null);

    const res = await postingJurnalAction(jurnalId);
    if (res.success) {
      setShowConfirm(false);
      router.refresh();
    } else {
      setErrorMsg(res.message || 'Gagal memposting jurnal.');
      setLoading(false);
    }
  };

  const isEligible = isBalanced && isPeriodeOpen && !loading;

  return (
    <div className="flex flex-col items-end gap-2">
      {errorMsg && (
        <span className="text-xs text-rose-400 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" />
          {errorMsg}
        </span>
      )}

      {!isBalanced && (
        <span className="text-[11px] text-rose-400">
          Debit & Kredit belum seimbang. Tidak dapat memposting.
        </span>
      )}

      {!isPeriodeOpen && (
        <span className="text-[11px] text-rose-400">
          Periode akuntansi sudah terkunci/ditutup.
        </span>
      )}

      {!showConfirm ? (
        <button
          type="button"
          disabled={!isEligible}
          onClick={() => setShowConfirm(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-neutral-950 transition-colors shadow-sm active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
          <span>Posting ke Buku Besar</span>
        </button>
      ) : (
        <div className="flex items-center gap-2 p-2 rounded-2xl bg-neutral-900/90 border border-amber-500/30">
          <span className="text-xs text-neutral-300 px-2">
            Posting <strong>{nomorJurnal}</strong> sekarang?
          </span>
          <button
            type="button"
            disabled={loading}
            onClick={() => setShowConfirm(false)}
            className="px-3 py-1.5 rounded-xl text-xs text-neutral-400 hover:text-white bg-white/[0.05] border border-white/[0.08]"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handlePosting}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 text-neutral-950 hover:bg-emerald-400 transition-all"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            <span>Ya, Posting</span>
          </button>
        </div>
      )}
    </div>
  );
}
