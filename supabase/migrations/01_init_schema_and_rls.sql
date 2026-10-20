-- ====================================================================
-- CV BATIK LARASATI - SKRIP DATABASE & RLS SETUP
-- Berdasarkan: ERD_Finance.pdf & PRD_Finance.docx.md
-- ====================================================================

-- 1. SETUP TIPE ENUM
CREATE TYPE public.peran_type AS ENUM ('staf', 'akuntan', 'direktur');
CREATE TYPE public.tipe_akun AS ENUM ('aset', 'kewajiban', 'ekuitas', 'pendapatan', 'beban');
CREATE TYPE public.saldo_normal_type AS ENUM ('debit', 'kredit');
CREATE TYPE public.status_periode AS ENUM ('terbuka', 'ditutup');
CREATE TYPE public.sumber_jurnal AS ENUM ('saldo_awal', 'manual', 'pengajuan', 'pembalik', 'impor_bank');
CREATE TYPE public.status_jurnal AS ENUM ('draf', 'diposting', 'dibalik');
CREATE TYPE public.jenis_pengajuan AS ENUM ('reimburse', 'pengeluaran');
CREATE TYPE public.status_pengajuan AS ENUM (
  'draf',
  'diajukan',
  'perlu_revisi',
  'menunggu_direktur',
  'disetujui',
  'ditolak',
  'dibayar',
  'dibatalkan'
);

-- ====================================================================
-- 2. PEMBUATAN 9 TABEL
-- ====================================================================

-- Tabel 1: profiles (terhubung ke auth.users)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nama_lengkap text NOT NULL CHECK (char_length(nama_lengkap) >= 3),
  email text NOT NULL UNIQUE,
  peran public.peran_type NOT NULL DEFAULT 'staf',
  jabatan text,
  aktif boolean NOT NULL DEFAULT true,
  dibuat_pada timestamptz NOT NULL DEFAULT now()
);

-- Tabel 2: akun (Chart of Accounts)
CREATE TABLE public.akun (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kode text NOT NULL UNIQUE,
  nama text NOT NULL CHECK (char_length(nama) >= 3),
  tipe public.tipe_akun NOT NULL,
  saldo_normal public.saldo_normal_type NOT NULL,
  is_kas_bank boolean NOT NULL DEFAULT false,
  aktif boolean NOT NULL DEFAULT true,
  keterangan text,
  CONSTRAINT ck_kode_4_digit CHECK (kode ~ '^[1-5][0-9]{3}$')
);

-- Tabel 3: periode
CREATE TABLE public.periode (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tahun int NOT NULL,
  bulan int NOT NULL CHECK (bulan BETWEEN 1 AND 12),
  tanggal_mulai date NOT NULL,
  status public.status_periode NOT NULL DEFAULT 'terbuka',
  ditutup_oleh uuid REFERENCES public.profiles(id),
  ditutup_pada timestamptz,
  alasan_buka_ulang text,
  CONSTRAINT uq_periode_tahun_bulan UNIQUE (tahun, bulan),
  CONSTRAINT ck_alasan_buka_ulang CHECK (alasan_buka_ulang IS NULL OR char_length(alasan_buka_ulang) >= 20)
);

-- Tabel 4: pengajuan
CREATE TABLE public.pengajuan (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nomor text UNIQUE,
  pengaju_id uuid NOT NULL REFERENCES public.profiles(id),
  jenis public.jenis_pengajuan NOT NULL,
  tanggal_transaksi date NOT NULL,
  akun_beban_id bigint NOT NULL REFERENCES public.akun(id),
  jumlah bigint NOT NULL CHECK (jumlah >= 10000 AND jumlah <= 25000000),
  keterangan text NOT NULL CHECK (char_length(keterangan) >= 10),
  bukti_path text,
  status public.status_pengajuan NOT NULL DEFAULT 'draf',
  catatan_peninjau text,
  diajukan_pada timestamptz,
  diverifikasi_oleh uuid REFERENCES public.profiles(id),
  diverifikasi_pada timestamptz,
  disetujui_oleh uuid REFERENCES public.profiles(id),
  disetujui_pada timestamptz,
  akun_kas_id bigint REFERENCES public.akun(id),
  dibayar_oleh uuid REFERENCES public.profiles(id),
  dibayar_pada timestamptz,
  dibuat_pada timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_catatan_peninjau CHECK (catatan_peninjau IS NULL OR char_length(catatan_peninjau) >= 10)
);

-- Tabel 5: jurnal (Header Jurnal Umum)
CREATE TABLE public.jurnal (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nomor text UNIQUE,
  tanggal date NOT NULL,
  periode_id bigint NOT NULL REFERENCES public.periode(id),
  keterangan text NOT NULL CHECK (char_length(keterangan) >= 5),
  sumber public.sumber_jurnal NOT NULL DEFAULT 'manual',
  status public.status_jurnal NOT NULL DEFAULT 'draf',
  pengajuan_id bigint UNIQUE REFERENCES public.pengajuan(id),
  jurnal_dibalik_id bigint UNIQUE REFERENCES public.jurnal(id),
  dibuat_oleh uuid NOT NULL REFERENCES public.profiles(id),
  diposting_oleh uuid REFERENCES public.profiles(id),
  diposting_pada timestamptz,
  dibuat_pada timestamptz NOT NULL DEFAULT now()
);

-- Tabel 6: jurnal_baris (Debit & Kredit)
CREATE TABLE public.jurnal_baris (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  jurnal_id bigint NOT NULL REFERENCES public.jurnal(id) ON DELETE CASCADE,
  urutan smallint NOT NULL DEFAULT 1,
  akun_id bigint NOT NULL REFERENCES public.akun(id),
  debit bigint NOT NULL DEFAULT 0 CHECK (debit >= 0),
  kredit bigint NOT NULL DEFAULT 0 CHECK (kredit >= 0),
  keterangan text,
  CONSTRAINT ck_debit_or_kredit CHECK (
    (debit > 0 AND kredit = 0) OR (kredit > 0 AND debit = 0)
  )
);

-- Tabel 7: penomoran (Atomic sequence generator JU & PG)
CREATE TABLE public.penomoran (
  jenis text NOT NULL CHECK (jenis IN ('JU', 'PG')),
  tahun int NOT NULL,
  bulan int NOT NULL CHECK (bulan BETWEEN 1 AND 12),
  nomor_terakhir int NOT NULL DEFAULT 0 CHECK (nomor_terakhir >= 0),
  PRIMARY KEY (jenis, tahun, bulan)
);

-- Tabel 8: audit_log (Immutable trail)
CREATE TABLE public.audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  waktu timestamptz NOT NULL DEFAULT now(),
  pelaku_id uuid REFERENCES public.profiles(id),
  aksi text NOT NULL,
  nama_tabel text NOT NULL,
  id_data text NOT NULL,
  data_lama jsonb,
  data_baru jsonb
);

-- Tabel 9: mutasi_bank (Opsional / Fitur Nilai Tambah)
CREATE TABLE public.mutasi_bank (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  akun_bank_id bigint NOT NULL REFERENCES public.akun(id),
  tanggal date NOT NULL,
  deskripsi text NOT NULL,
  jumlah bigint NOT NULL CHECK (jumlah <> 0),
  saldo bigint,
  nama_file text NOT NULL,
  jurnal_id bigint REFERENCES public.jurnal(id),
  diimpor_oleh uuid REFERENCES public.profiles(id),
  diimpor_pada timestamptz,
  CONSTRAINT uq_mutasi_bank UNIQUE (akun_bank_id, tanggal, deskripsi, jumlah, saldo)
);

-- ====================================================================
-- 3. HELPER FUNCTIONS UNTUK RLS
-- ====================================================================

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.peran_type
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT peran FROM profiles WHERE id = auth.uid() AND aktif = true;
$$;

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND aktif = true
  );
$$;

-- ====================================================================
-- 4. AKTIFKAN RLS DI SELURUH 9 TABEL
-- ====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.akun ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periode ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pengajuan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jurnal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jurnal_baris ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penomoran ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mutasi_bank ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- 5. ATURAN POLICY RLS
-- ====================================================================

-- --------------------------------------------------------------------
-- A. Policy Tabel profiles
-- --------------------------------------------------------------------
CREATE POLICY "profiles_select_active"
  ON public.profiles FOR SELECT
  USING (public.is_active_user());

CREATE POLICY "profiles_update_direktur"
  ON public.profiles FOR UPDATE
  USING (public.current_user_role() = 'direktur' AND id <> auth.uid())
  WITH CHECK (public.current_user_role() = 'direktur' AND id <> auth.uid());

CREATE POLICY "profiles_update_self"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid() AND public.is_active_user())
  WITH CHECK (
    id = auth.uid() 
    AND peran = (SELECT peran FROM public.profiles WHERE id = auth.uid())
    AND aktif = (SELECT aktif FROM public.profiles WHERE id = auth.uid())
  );

-- --------------------------------------------------------------------
-- B. Policy Tabel akun (BR-11)
-- --------------------------------------------------------------------
CREATE POLICY "akun_select_akuntan_direktur"
  ON public.akun FOR SELECT
  USING (public.current_user_role() IN ('akuntan', 'direktur'));

CREATE POLICY "akun_select_staf"
  ON public.akun FOR SELECT
  USING (public.current_user_role() = 'staf' AND tipe = 'beban' AND aktif = true);

CREATE POLICY "akun_insert_update_akuntan"
  ON public.akun FOR ALL
  USING (public.current_user_role() = 'akuntan')
  WITH CHECK (public.current_user_role() = 'akuntan');

-- --------------------------------------------------------------------
-- C. Policy Tabel periode
-- --------------------------------------------------------------------
CREATE POLICY "periode_select"
  ON public.periode FOR SELECT
  USING (public.is_active_user());

CREATE POLICY "periode_manage_akuntan_direktur"
  ON public.periode FOR ALL
  USING (public.current_user_role() IN ('akuntan', 'direktur'))
  WITH CHECK (public.current_user_role() IN ('akuntan', 'direktur'));

-- --------------------------------------------------------------------
-- D. Policy Tabel pengajuan (BR-08, BR-09, BR-11)
-- --------------------------------------------------------------------
CREATE POLICY "pengajuan_select_staf"
  ON public.pengajuan FOR SELECT
  USING (pengaju_id = auth.uid() AND public.is_active_user());

CREATE POLICY "pengajuan_select_finance"
  ON public.pengajuan FOR SELECT
  USING (public.current_user_role() IN ('akuntan', 'direktur'));

CREATE POLICY "pengajuan_insert"
  ON public.pengajuan FOR INSERT
  WITH CHECK (
    pengaju_id = auth.uid() 
    AND public.current_user_role() IN ('staf', 'akuntan')
    AND status = 'draf'
  );

CREATE POLICY "pengajuan_update_pengaju"
  ON public.pengajuan FOR UPDATE
  USING (
    pengaju_id = auth.uid() 
    AND status IN ('draf', 'perlu_revisi')
    AND public.is_active_user()
  )
  WITH CHECK (
    pengaju_id = auth.uid() 
    AND status IN ('draf', 'diajukan', 'dibatalkan', 'menunggu_direktur')
  );

CREATE POLICY "pengajuan_update_finance"
  ON public.pengajuan FOR UPDATE
  USING (public.current_user_role() IN ('akuntan', 'direktur'))
  WITH CHECK (public.current_user_role() IN ('akuntan', 'direktur'));

-- --------------------------------------------------------------------
-- E. Policy Tabel jurnal & jurnal_baris (BR-11: Staf tidak bisa lihat)
-- --------------------------------------------------------------------
CREATE POLICY "jurnal_select_finance"
  ON public.jurnal FOR SELECT
  USING (public.current_user_role() IN ('akuntan', 'direktur'));

CREATE POLICY "jurnal_modify_akuntan"
  ON public.jurnal FOR ALL
  USING (public.current_user_role() = 'akuntan')
  WITH CHECK (public.current_user_role() = 'akuntan');

CREATE POLICY "jurnal_baris_select_finance"
  ON public.jurnal_baris FOR SELECT
  USING (public.current_user_role() IN ('akuntan', 'direktur'));

CREATE POLICY "jurnal_baris_modify_akuntan"
  ON public.jurnal_baris FOR ALL
  USING (public.current_user_role() = 'akuntan')
  WITH CHECK (public.current_user_role() = 'akuntan');

-- --------------------------------------------------------------------
-- F. Policy Tabel penomoran
-- --------------------------------------------------------------------
CREATE POLICY "penomoran_access_akuntan_direktur"
  ON public.penomoran FOR ALL
  USING (public.current_user_role() IN ('akuntan', 'direktur'))
  WITH CHECK (public.current_user_role() IN ('akuntan', 'direktur'));

-- --------------------------------------------------------------------
-- G. Policy Tabel audit_log (BR-12: Hanya Direktur yang bisa melihat)
-- --------------------------------------------------------------------
CREATE POLICY "audit_log_select_direktur"
  ON public.audit_log FOR SELECT
  USING (public.current_user_role() = 'direktur');

-- --------------------------------------------------------------------
-- H. Policy Tabel mutasi_bank (Opsional)
-- --------------------------------------------------------------------
CREATE POLICY "mutasi_bank_all_finance"
  ON public.mutasi_bank FOR ALL
  USING (public.current_user_role() IN ('akuntan', 'direktur'))
  WITH CHECK (public.current_user_role() IN ('akuntan', 'direktur'));

-- ====================================================================
-- 6. TRIGGER OTOMATIS PROFILES SAAT USER BARU DAFTAR
-- ====================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nama_lengkap, email, peran, jabatan, aktif)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nama_lengkap', split_part(NEW.email, '@', 1)),
    NEW.email,
    'staf', -- Akun baru selalu berperan Staf (PRD Bab 3)
    COALESCE(NEW.raw_user_meta_data->>'jabatan', NULL),
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
