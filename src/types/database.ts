export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type PeranType = 'staf' | 'akuntan' | 'direktur';
export type TipeAkun = 'aset' | 'kewajiban' | 'ekuitas' | 'pendapatan' | 'beban';
export type SaldoNormalType = 'debit' | 'kredit';
export type StatusPeriode = 'terbuka' | 'ditutup';
export type SumberJurnal = 'saldo_awal' | 'manual' | 'pengajuan' | 'pembalik' | 'impor_bank';
export type StatusJurnal = 'draf' | 'diposting' | 'dibalik';
export type JenisPengajuan = 'reimburse' | 'pengeluaran';
export type StatusPengajuan =
  | 'draf'
  | 'diajukan'
  | 'perlu_revisi'
  | 'menunggu_direktur'
  | 'disetujui'
  | 'ditolak'
  | 'dibayar'
  | 'dibatalkan';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          nama_lengkap: string;
          email: string;
          peran: PeranType;
          jabatan: string | null;
          aktif: boolean;
          dibuat_pada: string;
        };
        Insert: {
          id: string;
          nama_lengkap: string;
          email: string;
          peran?: PeranType;
          jabatan?: string | null;
          aktif?: boolean;
          dibuat_pada?: string;
        };
        Update: {
          id?: string;
          nama_lengkap?: string;
          email?: string;
          peran?: PeranType;
          jabatan?: string | null;
          aktif?: boolean;
          dibuat_pada?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey';
            columns: ['id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedSchema: 'auth';
          }
        ];
      };
      akun: {
        Row: {
          id: number;
          kode: string;
          nama: string;
          tipe: TipeAkun;
          saldo_normal: SaldoNormalType;
          is_kas_bank: boolean;
          aktif: boolean;
          keterangan: string | null;
        };
        Insert: {
          id?: never;
          kode: string;
          nama: string;
          tipe: TipeAkun;
          saldo_normal: SaldoNormalType;
          is_kas_bank?: boolean;
          aktif?: boolean;
          keterangan?: string | null;
        };
        Update: {
          id?: never;
          kode?: string;
          nama?: string;
          tipe?: TipeAkun;
          saldo_normal?: SaldoNormalType;
          is_kas_bank?: boolean;
          aktif?: boolean;
          keterangan?: string | null;
        };
        Relationships: [];
      };
      periode: {
        Row: {
          id: number;
          tahun: number;
          bulan: number;
          tanggal_mulai: string;
          status: StatusPeriode;
          ditutup_oleh: string | null;
          ditutup_pada: string | null;
          alasan_buka_ulang: string | null;
        };
        Insert: {
          id?: never;
          tahun: number;
          bulan: number;
          tanggal_mulai: string;
          status?: StatusPeriode;
          ditutup_oleh?: string | null;
          ditutup_pada?: string | null;
          alasan_buka_ulang?: string | null;
        };
        Update: {
          id?: never;
          tahun?: number;
          bulan?: number;
          tanggal_mulai?: string;
          status?: StatusPeriode;
          ditutup_oleh?: string | null;
          ditutup_pada?: string | null;
          alasan_buka_ulang?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'periode_ditutup_oleh_fkey';
            columns: ['ditutup_oleh'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedSchema: 'public';
          }
        ];
      };
      pengajuan: {
        Row: {
          id: number;
          nomor: string | null;
          pengaju_id: string;
          jenis: JenisPengajuan;
          tanggal_transaksi: string;
          akun_beban_id: number;
          jumlah: number;
          keterangan: string;
          bukti_path: string | null;
          status: StatusPengajuan;
          catatan_peninjau: string | null;
          diajukan_pada: string | null;
          diverifikasi_oleh: string | null;
          diverifikasi_pada: string | null;
          disetujui_oleh: string | null;
          disetujui_pada: string | null;
          akun_kas_id: number | null;
          dibayar_oleh: string | null;
          dibayar_pada: string | null;
          dibuat_pada: string;
        };
        Insert: {
          id?: never;
          nomor?: string | null;
          pengaju_id: string;
          jenis: JenisPengajuan;
          tanggal_transaksi: string;
          akun_beban_id: number;
          jumlah: number;
          keterangan: string;
          bukti_path?: string | null;
          status?: StatusPengajuan;
          catatan_peninjau?: string | null;
          diajukan_pada?: string | null;
          diverifikasi_oleh?: string | null;
          diverifikasi_pada?: string | null;
          disetujui_oleh?: string | null;
          disetujui_pada?: string | null;
          akun_kas_id?: number | null;
          dibayar_oleh?: string | null;
          dibayar_pada?: string | null;
          dibuat_pada?: string;
        };
        Update: {
          id?: never;
          nomor?: string | null;
          pengaju_id?: string;
          jenis?: JenisPengajuan;
          tanggal_transaksi?: string;
          akun_beban_id?: number;
          jumlah?: number;
          keterangan?: string;
          bukti_path?: string | null;
          status?: StatusPengajuan;
          catatan_peninjau?: string | null;
          diajukan_pada?: string | null;
          diverifikasi_oleh?: string | null;
          diverifikasi_pada?: string | null;
          disetujui_oleh?: string | null;
          disetujui_pada?: string | null;
          akun_kas_id?: number | null;
          dibayar_oleh?: string | null;
          dibayar_pada?: string | null;
          dibuat_pada?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'pengajuan_pengaju_id_fkey';
            columns: ['pengaju_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedSchema: 'public';
          },
          {
            foreignKeyName: 'pengajuan_akun_beban_id_fkey';
            columns: ['akun_beban_id'];
            isOneToOne: false;
            referencedRelation: 'akun';
            referencedSchema: 'public';
          },
          {
            foreignKeyName: 'pengajuan_diverifikasi_oleh_fkey';
            columns: ['diverifikasi_oleh'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedSchema: 'public';
          },
          {
            foreignKeyName: 'pengajuan_disetujui_oleh_fkey';
            columns: ['disetujui_oleh'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedSchema: 'public';
          },
          {
            foreignKeyName: 'pengajuan_akun_kas_id_fkey';
            columns: ['akun_kas_id'];
            isOneToOne: false;
            referencedRelation: 'akun';
            referencedSchema: 'public';
          },
          {
            foreignKeyName: 'pengajuan_dibayar_oleh_fkey';
            columns: ['dibayar_oleh'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedSchema: 'public';
          }
        ];
      };
      jurnal: {
        Row: {
          id: number;
          nomor: string | null;
          tanggal: string;
          periode_id: number;
          keterangan: string;
          sumber: SumberJurnal;
          status: StatusJurnal;
          pengajuan_id: number | null;
          jurnal_dibalik_id: number | null;
          dibuat_oleh: string;
          diposting_oleh: string | null;
          diposting_pada: string | null;
          dibuat_pada: string;
        };
        Insert: {
          id?: never;
          nomor?: string | null;
          tanggal: string;
          periode_id: number;
          keterangan: string;
          sumber?: SumberJurnal;
          status?: StatusJurnal;
          pengajuan_id?: number | null;
          jurnal_dibalik_id?: number | null;
          dibuat_oleh: string;
          diposting_oleh?: string | null;
          diposting_pada?: string | null;
          dibuat_pada?: string;
        };
        Update: {
          id?: never;
          nomor?: string | null;
          tanggal?: string;
          periode_id?: number;
          keterangan?: string;
          sumber?: SumberJurnal;
          status?: StatusJurnal;
          pengajuan_id?: number | null;
          jurnal_dibalik_id?: number | null;
          dibuat_oleh?: string;
          diposting_oleh?: string | null;
          diposting_pada?: string | null;
          dibuat_pada?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'jurnal_periode_id_fkey';
            columns: ['periode_id'];
            isOneToOne: false;
            referencedRelation: 'periode';
            referencedSchema: 'public';
          },
          {
            foreignKeyName: 'jurnal_pengajuan_id_fkey';
            columns: ['pengajuan_id'];
            isOneToOne: true;
            referencedRelation: 'pengajuan';
            referencedSchema: 'public';
          },
          {
            foreignKeyName: 'jurnal_jurnal_dibalik_id_fkey';
            columns: ['jurnal_dibalik_id'];
            isOneToOne: true;
            referencedRelation: 'jurnal';
            referencedSchema: 'public';
          },
          {
            foreignKeyName: 'jurnal_dibuat_oleh_fkey';
            columns: ['dibuat_oleh'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedSchema: 'public';
          },
          {
            foreignKeyName: 'jurnal_diposting_oleh_fkey';
            columns: ['diposting_oleh'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedSchema: 'public';
          }
        ];
      };
      jurnal_baris: {
        Row: {
          id: number;
          jurnal_id: number;
          urutan: number;
          akun_id: number;
          debit: number;
          kredit: number;
          keterangan: string | null;
        };
        Insert: {
          id?: never;
          jurnal_id: number;
          urutan?: number;
          akun_id: number;
          debit?: number;
          kredit?: number;
          keterangan?: string | null;
        };
        Update: {
          id?: never;
          jurnal_id?: number;
          urutan?: number;
          akun_id?: number;
          debit?: number;
          kredit?: number;
          keterangan?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'jurnal_baris_jurnal_id_fkey';
            columns: ['jurnal_id'];
            isOneToOne: false;
            referencedRelation: 'jurnal';
            referencedSchema: 'public';
          },
          {
            foreignKeyName: 'jurnal_baris_akun_id_fkey';
            columns: ['akun_id'];
            isOneToOne: false;
            referencedRelation: 'akun';
            referencedSchema: 'public';
          }
        ];
      };
      penomoran: {
        Row: {
          jenis: 'JU' | 'PG';
          tahun: number;
          bulan: number;
          nomor_terakhir: number;
        };
        Insert: {
          jenis: 'JU' | 'PG';
          tahun: number;
          bulan: number;
          nomor_terakhir?: number;
        };
        Update: {
          jenis?: 'JU' | 'PG';
          tahun?: number;
          bulan?: number;
          nomor_terakhir?: number;
        };
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: number;
          waktu: string;
          pelaku_id: string | null;
          aksi: string;
          nama_tabel: string;
          id_data: string;
          data_lama: Json | null;
          data_baru: Json | null;
        };
        Insert: {
          id?: never;
          waktu?: string;
          pelaku_id?: string | null;
          aksi: string;
          nama_tabel: string;
          id_data: string;
          data_lama?: Json | null;
          data_baru?: Json | null;
        };
        Update: {
          id?: never;
          waktu?: string;
          pelaku_id?: string | null;
          aksi?: string;
          nama_tabel?: string;
          id_data?: string;
          data_lama?: Json | null;
          data_baru?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: 'audit_log_pelaku_id_fkey';
            columns: ['pelaku_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedSchema: 'public';
          }
        ];
      };
      mutasi_bank: {
        Row: {
          id: number;
          akun_bank_id: number;
          tanggal: string;
          deskripsi: string;
          jumlah: number;
          saldo: number | null;
          nama_file: string;
          jurnal_id: number | null;
          diimpor_oleh: string | null;
          diimpor_pada: string | null;
        };
        Insert: {
          id?: never;
          akun_bank_id: number;
          tanggal: string;
          deskripsi: string;
          jumlah: number;
          saldo?: number | null;
          nama_file: string;
          jurnal_id?: number | null;
          diimpor_oleh?: string | null;
          diimpor_pada?: string | null;
        };
        Update: {
          id?: never;
          akun_bank_id?: number;
          tanggal?: string;
          deskripsi?: string;
          jumlah?: number;
          saldo?: number | null;
          nama_file?: string;
          jurnal_id?: number | null;
          diimpor_oleh?: string | null;
          diimpor_pada?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'mutasi_bank_akun_bank_id_fkey';
            columns: ['akun_bank_id'];
            isOneToOne: false;
            referencedRelation: 'akun';
            referencedSchema: 'public';
          },
          {
            foreignKeyName: 'mutasi_bank_jurnal_id_fkey';
            columns: ['jurnal_id'];
            isOneToOne: false;
            referencedRelation: 'jurnal';
            referencedSchema: 'public';
          },
          {
            foreignKeyName: 'mutasi_bank_diimpor_oleh_fkey';
            columns: ['diimpor_oleh'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedSchema: 'public';
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      current_user_role: {
        Args: Record<PropertyKey, never>;
        Returns: PeranType;
      };
      is_active_user: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
    };
    Enums: {
      peran_type: PeranType;
      tipe_akun: TipeAkun;
      saldo_normal_type: SaldoNormalType;
      status_periode: StatusPeriode;
      sumber_jurnal: SumberJurnal;
      status_jurnal: StatusJurnal;
      jenis_pengajuan: JenisPengajuan;
      status_pengajuan: StatusPengajuan;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
