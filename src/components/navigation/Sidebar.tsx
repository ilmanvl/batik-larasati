'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/app/actions/auth';
import type { PeranType } from '@/types/database';
import {
  LayoutDashboard,
  Receipt,
  BookOpen,
  Scale,
  FileSpreadsheet,
  TrendingUp,
  FolderTree,
  Users,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';

interface SidebarProps {
  user: {
    nama_lengkap: string;
    email: string;
    peran: PeranType;
    jabatan: string | null;
  };
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    {
      title: 'Utama',
      items: [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/pengajuan', label: 'Pengajuan Biaya', icon: Receipt },
      ],
    },
    ...(['akuntan', 'direktur'].includes(user.peran)
      ? [
          {
            title: 'Akuntansi & Keuangan',
            items: [
              { href: '/jurnal', label: 'Jurnal Umum', icon: BookOpen },
              { href: '/buku-besar', label: 'Buku Besar', icon: Scale },
              { href: '/neraca-saldo', label: 'Neraca Saldo', icon: FileSpreadsheet },
              { href: '/laporan', label: 'Laporan Keuangan', icon: TrendingUp },
              { href: '/akun', label: 'Bagan Akun & Periode', icon: FolderTree },
            ],
          },
        ]
      : []),
    ...(user.peran === 'direktur'
      ? [
          {
            title: 'Administrasi',
            items: [
              { href: '/pengguna', label: 'Manajemen Pengguna', icon: Users },
              { href: '/audit-log', label: 'Audit Log', icon: ShieldCheck },
            ],
          },
        ]
      : []),
  ];

  const getRoleBadge = (role: PeranType) => {
    switch (role) {
      case 'direktur':
        return 'bg-[#d4af37]/20 text-[#d4af37] border-[#d4af37]/40';
      case 'akuntan':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-neutral-800 text-neutral-300 border-neutral-700';
    }
  };

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/[0.12] px-4 flex items-center justify-between z-40">
        <div className="flex items-center gap-2.5 font-bold text-white">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#d4af37] to-[#aa8022] text-neutral-950 flex items-center justify-center text-xs font-black shadow-sm">
            BL
          </div>
          <span className="text-sm tracking-tight text-[#d4af37]">CV Batik Larasati</span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg text-neutral-300 hover:bg-white/[0.08]"
          aria-label="Toggle Menu"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar: iOS Liquid Glass Putih Bening */}
      <aside
        className={`fixed lg:static top-0 left-0 bottom-0 w-64 liquid-glass-sidebar text-neutral-200 z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-white/[0.10] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#d4af37] via-[#c59e31] to-[#996f1b] text-neutral-950 flex items-center justify-center font-black text-base shadow-lg shadow-[#d4af37]/10">
            BL
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
              <span>Batik Larasati</span>
              <Sparkles className="w-3.5 h-3.5 text-[#d4af37]" />
            </h1>
            <p className="text-[11px] text-[#d4af37]/80 font-medium tracking-wide">
              Finance & Accounting
            </p>
          </div>
        </div>

        {/* User Profile Card */}
        <div className="p-3.5 mx-3.5 my-3.5 rounded-2xl liquid-glass">
          <div className="flex items-center gap-3 mb-2.5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#d4af37] to-[#8f6d19] text-neutral-950 font-bold text-xs flex items-center justify-center shadow-inner">
              {user.nama_lengkap.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user.nama_lengkap}</p>
              <p className="text-[11px] text-neutral-400 truncate">{user.jabatan || user.email}</p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-white/[0.08]">
            <span
              className={`px-2 py-0.5 text-[10px] font-bold rounded border uppercase tracking-wider ${getRoleBadge(
                user.peran
              )}`}
            >
              {user.peran}
            </span>
            <div className="flex items-center gap-1 text-[10px] text-[#d4af37]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] animate-pulse" />
              <span>Sesi Aktif</span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-5">
          {navItems.map((group, idx) => (
            <div key={idx} className="space-y-1">
              <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#d4af37]/60">
                {group.title}
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-[#d4af37]/15 text-[#d4af37] border border-[#d4af37]/35 shadow-sm font-semibold backdrop-blur-sm'
                        : 'text-neutral-300 hover:bg-white/[0.07] hover:text-[#d4af37]'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-[#d4af37]' : 'text-neutral-400'
                      }`}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="p-3 border-t border-white/[0.10]">
          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-rose-300/80 hover:bg-rose-500/10 hover:text-rose-200 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4 shrink-0 text-rose-400" />
              <span>Keluar dari Aplikasi</span>
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
