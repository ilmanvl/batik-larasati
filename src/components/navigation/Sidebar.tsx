'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/app/actions/auth';
import type { PeranType } from '@/types/database';
import LogoBatik from './LogoBatik';
import {
  LayoutDashboard,
  Receipt,
  BookOpen,
  ArrowLeftRight,
  Scale,
  FileSpreadsheet,
  TrendingUp,
  FolderTree,
  Users,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
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
  const [isCollapsed, setIsCollapsed] = useState(false);

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
              { href: '/mutasi-bank', label: 'Mutasi Bank', icon: ArrowLeftRight },
              { href: '/buku-besar', label: 'Buku Besar', icon: Scale },
              { href: '/neraca-saldo', label: 'Neraca Saldo', icon: FileSpreadsheet },
              { href: '/laporan/laba-rugi', label: 'Laporan Keuangan', icon: TrendingUp },
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
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/[0.12] px-4 flex items-center justify-between z-40 print:hidden">
        <div className="flex items-center gap-2.5 font-bold text-white">
          <LogoBatik className="w-8 h-8 text-[#d4af37] shrink-0" />
          <span className="text-sm tracking-tight text-white font-bold">CV Batik Larasati</span>
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
          className="lg:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-40 print:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar: iOS Liquid Glass Putih Bening dengan Efek Collapse */}
      <aside
        className={`fixed lg:static top-0 left-0 bottom-0 ${
          isCollapsed ? 'lg:w-20 w-64' : 'w-64'
        } liquid-glass-sidebar text-neutral-200 z-50 flex flex-col transition-all duration-300 ease-in-out shrink-0 print:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header & Toggle Button */}
        <div
          className={`p-4 border-b border-white/[0.10] flex items-center ${
            isCollapsed ? 'justify-center flex-col gap-2.5' : 'justify-between gap-3'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <LogoBatik className="w-10 h-10 text-[#d4af37] shrink-0" />
            {!isCollapsed && (
              <div className="min-w-0">
                <h1 className="font-bold text-sm tracking-tight text-white truncate">
                  Batik Larasati
                </h1>
                <p className="text-[11px] text-neutral-400 font-normal tracking-wide truncate">
                  Finance & Accounting
                </p>
              </div>
            )}
          </div>

          {/* Tombol Toggle Collapse (Desktop) */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar'}
            className="hidden lg:flex p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.10] border border-white/[0.08] text-neutral-400 hover:text-white transition-all cursor-pointer shrink-0"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-[#d4af37]" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* User Profile Card */}
        <div
          className={`mx-3 my-3 rounded-2xl liquid-glass ${
            isCollapsed ? 'p-2 flex flex-col items-center gap-2' : 'p-3.5'
          }`}
        >
          <div className={`flex items-center ${isCollapsed ? 'flex-col gap-2' : 'gap-3 mb-2.5'}`}>
            <div
              title={user.nama_lengkap}
              className="w-9 h-9 rounded-full bg-amber-600 text-neutral-950 font-bold text-xs flex items-center justify-center shrink-0 cursor-default"
            >
              {user.nama_lengkap.slice(0, 2).toUpperCase()}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user.nama_lengkap}</p>
                <p className="text-[11px] text-neutral-400 truncate" title={user.email}>{user.email}</p>
              </div>
            )}
            <form action={logoutAction} className="shrink-0">
              <button
                type="submit"
                title="Keluar dari Aplikasi"
                className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-rose-500/15 border border-white/[0.08] hover:border-rose-500/30 text-neutral-400 hover:text-rose-300 transition-all cursor-pointer shadow-sm active:scale-90"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
          {!isCollapsed && (
            <div className="flex items-center justify-between pt-2 border-t border-white/[0.08]">
              <span
                className={`px-2 py-0.5 text-[10px] font-bold rounded border uppercase tracking-wider ${getRoleBadge(
                  user.peran
                )}`}
              >
                {user.peran}
              </span>
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Sesi Aktif</span>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-2 space-y-4">
          {navItems.map((group, idx) => (
            <div key={idx} className="space-y-1">
              {!isCollapsed ? (
                <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  {group.title}
                </div>
              ) : (
                idx > 0 && <div className="h-px bg-white/[0.08] my-2 mx-1" />
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href)) ||
                  (item.href === '/laporan/laba-rugi' && pathname.startsWith('/laporan'));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    title={isCollapsed ? item.label : undefined}
                    className={`flex items-center ${
                      isCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'
                    } rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-[#d4af37]/15 text-[#d4af37] border border-[#d4af37]/35 shadow-sm font-semibold backdrop-blur-sm'
                        : 'text-neutral-300 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-[#d4af37]' : 'text-neutral-400'
                      }`}
                    />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
