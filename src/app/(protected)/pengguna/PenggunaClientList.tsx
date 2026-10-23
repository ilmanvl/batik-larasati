'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Shield,
  CheckCircle2,
  AlertCircle,
  X,
  UserCheck,
  UserX,
  Save,
  Sparkles,
} from 'lucide-react';
import { updatePenggunaAction } from './actions';
import type { PeranType } from '@/types/database';

interface PenggunaClientListProps {
  currentUserId: string;
  users: Array<{
    id: string;
    nama_lengkap: string;
    email: string;
    peran: PeranType;
    jabatan: string | null;
    aktif: boolean;
    dibuat_pada: string;
  }>;
}

export default function PenggunaClientList({
  currentUserId,
  users,
}: PenggunaClientListProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // State lokal peran & aktif per user
  const [userStates, setUserStates] = useState<
    Record<string, { peran: PeranType; aktif: boolean }>
  >(() => {
    const initial: Record<string, { peran: PeranType; aktif: boolean }> = {};
    users.forEach((u) => {
      initial[u.id] = { peran: u.peran, aktif: u.aktif };
    });
    return initial;
  });

  const handleRoleChange = (userId: string, newRole: PeranType) => {
    setUserStates((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], peran: newRole },
    }));
  };

  const handleStatusToggle = (userId: string) => {
    setUserStates((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], aktif: !prev[userId].aktif },
    }));
  };

  const handleSaveUser = async (userId: string) => {
    const state = userStates[userId];
    if (!state) return;

    setLoadingId(userId);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await updatePenggunaAction(userId, state.peran, state.aktif);
    setLoadingId(null);

    if (res.success) {
      setSuccessMsg('Data pengguna berhasil diperbarui.');
      router.refresh();
    } else {
      setErrorMsg(res.error || 'Gagal memperbarui pengguna.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Notifikasi Sukses / Gagal */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center justify-between text-xs sm:text-sm backdrop-blur-md shadow-lg shadow-emerald-500/10">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center justify-between text-xs sm:text-sm backdrop-blur-md shadow-lg shadow-rose-500/10">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Kontainer Liquid Glass Table (Konsisten dengan /pengajuan & /neraca-saldo) */}
      <div className="p-6 sm:p-7 rounded-3xl liquid-glass-table space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2.5">
              <Users className="w-5 h-5 text-[#d4af37]" />
              <span>Daftar Pengguna Sistem & Hak Akses</span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Kelola peran operasional dan otorisasi akses internal CV Batik Larasati
            </p>
          </div>
          <span className="text-xs text-neutral-400 font-mono bg-white/[0.06] px-3 py-1.5 rounded-xl border border-white/[0.10] self-start sm:self-auto">
            {users.length} Akun Terdaftar
          </span>
        </div>

        {/* Tabel Pengguna */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-white/[0.12] bg-white/[0.05] text-[11px] uppercase tracking-wider text-neutral-300">
                <th className="py-4 px-4 font-semibold">Pengguna</th>
                <th className="py-4 px-4 font-semibold">Jabatan</th>
                <th className="py-4 px-4 font-semibold w-44 text-center">Peran (Role)</th>
                <th className="py-4 px-4 font-semibold w-36 text-center">Status Akun</th>
                <th className="py-4 px-4 font-semibold w-32 text-center">Aksi (BR-12)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {users.map((u) => {
                const isSelf = u.id === currentUserId;
                const state = userStates[u.id] || { peran: u.peran, aktif: u.aktif };
                const isDirty = state.peran !== u.peran || state.aktif !== u.aktif;
                const isLoading = loadingId === u.id;

                return (
                  <tr key={u.id} className="hover:bg-white/[0.04] transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#d4af37] via-[#b89328] to-[#6e5210] text-neutral-950 font-bold text-xs flex items-center justify-center shrink-0 shadow-md ring-1 ring-white/20">
                          {u.nama_lengkap.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-white flex items-center gap-2">
                            <span>{u.nama_lengkap}</span>
                            {isSelf && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/40 font-bold shadow-sm">
                                Anda
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-neutral-400 font-mono mt-0.5">{u.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 text-neutral-300">
                      {u.jabatan || <span className="text-neutral-500 italic">-</span>}
                    </td>

                    <td className="py-4 px-4 text-center">
                      {isSelf ? (
                        <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#d4af37]/15 text-[#d4af37] border border-[#d4af37]/30 shadow-sm inline-flex items-center gap-1">
                          <Shield className="w-3 h-3 text-[#d4af37]" />
                          <span>{u.peran}</span>
                        </span>
                      ) : (
                        <select
                          value={state.peran}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as PeranType)}
                          className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.15] text-white text-xs font-semibold focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/40 transition-all cursor-pointer backdrop-blur-md"
                        >
                          <option value="staf" className="bg-neutral-900 text-white">Staf</option>
                          <option value="akuntan" className="bg-neutral-900 text-white">Akuntan</option>
                          <option value="direktur" className="bg-neutral-900 text-white">Direktur</option>
                        </select>
                      )}
                    </td>

                    <td className="py-4 px-4 text-center">
                      {isSelf ? (
                        <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1 shadow-sm">
                          <UserCheck className="w-3 h-3 text-emerald-400" />
                          <span>Aktif (Terkunci)</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleStatusToggle(u.id)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all inline-flex items-center gap-1.5 backdrop-blur-md shadow-sm ${
                            state.aktif
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 hover:border-emerald-500/40'
                              : 'bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 hover:border-rose-500/40'
                          }`}
                        >
                          {state.aktif ? (
                            <>
                              <UserCheck className="w-3 h-3" />
                              <span>Aktif</span>
                            </>
                          ) : (
                            <>
                              <UserX className="w-3 h-3" />
                              <span>Nonaktif</span>
                            </>
                          )}
                        </button>
                      )}
                    </td>

                    <td className="py-4 px-4 text-center">
                      {isSelf ? (
                        <span className="text-[11px] text-neutral-500 italic">Terkunci (BR-12)</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSaveUser(u.id)}
                          disabled={!isDirty || isLoading}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 ${
                            isDirty
                              ? 'bg-gradient-to-r from-[#d4af37] to-[#b89328] text-neutral-950 hover:brightness-110 shadow-lg shadow-[#d4af37]/20 active:scale-95 border border-[#f5d77f]/40'
                              : 'bg-white/[0.03] text-neutral-600 border border-white/[0.06] cursor-not-allowed'
                          }`}
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{isLoading ? 'Menyimpan...' : 'Simpan'}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
