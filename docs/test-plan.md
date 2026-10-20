# Test Plan: Sistem Keuangan & Akuntansi CV Batik Larasati

Dokumen ini memuat rencana pengujian awal untuk memvalidasi implementasi aturan bisnis (BR-01 s/d BR-12), keamanan data (RLS & RBAC), serta integritas transaksi akuntansi.

## Matriks Kasus Uji (Test Cases)

| Kode | Rujukan | Akun | Langkah | Hasil Diharapkan | Hasil Sebenarnya | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-01 | BR-01 | Akuntan | Mengubah tipe akun yang sudah dipakai di jurnal | Ditolak oleh sistem | - | Belum |
| TC-02 | BR-02 | Akuntan | Memposting jurnal draf yang total debit dan kreditnya belum sama (tidak seimbang) | Ditolak oleh sistem, jurnal tetap draf | - | Belum |
| TC-03 | BR-03 | Akuntan | Memposting 2 jurnal secara berurutan pada bulan yang sama | Mendapat 2 nomor urut (JU-YYYYMM-NNNN) tanpa ganda/terlewat | - | Belum |
| TC-04 | BR-04 | Akuntan | Mengubah/menghapus jurnal yang sudah berstatus 'diposting' | Ditolak, tombol ubah/hapus tidak tersedia | - | Belum |
| TC-05 | BR-05 | Akuntan | Memposting jurnal pada tanggal di periode yang sudah 'ditutup' | Ditolak, muncul pesan error periode tertutup | - | Belum |
| TC-06 | BR-06 | Akuntan | Menutup periode yang di dalamnya masih ada jurnal berstatus 'draf' | Ditolak, harus posting/hapus draf terlebih dahulu | - | Belum |
| TC-07 | BR-07 | Staf | Mengirim pengajuan senilai Rp 5.000 (di bawah batas minimal Rp 10.000) | Ditolak oleh sistem | - | Belum |
| TC-08 | BR-08 | Staf | Mengubah status pengajuan langsung dari 'draf' menjadi 'disetujui' melalui API/URL | Ditolak (Database RLS/Function menolak) | - | Belum |
| TC-09 | BR-08 | Akuntan | Menyetujui pengajuan Staf senilai Rp 2.000.000 | Status berubah menjadi 'menunggu_direktur' | - | Belum |
| TC-10 | BR-09 | Akuntan | Akuntan A mencoba memverifikasi/menyetujui pengajuan miliknya sendiri | Ditolak oleh sistem | - | Belum |
| TC-11 | BR-10 | Akuntan | Membayar pengajuan disetujui menggunakan akun bank yang saldonya kurang dari nilai pengajuan | Ditolak, saldo tidak cukup | - | Belum |
| TC-12 | BR-10 | Akuntan | Menekan tombol 'Bayar' dua kali berturut-turut dengan cepat (Uji Concurrency) | Hanya terbuat 1 jurnal pembayaran, tidak ganda | - | Belum |
| TC-13 | BR-11 | Staf | Mencoba membuka URL halaman /buku-besar atau /laporan secara langsung | Dialihkan (Redirect) ke halaman Dashboard | - | Belum |
| TC-14 | BR-12 | Direktur | Mengubah peran milik dirinya sendiri menjadi 'staf' | Ditolak, tidak bisa ubah peran sendiri | - | Belum |
| TC-15 | BR-12 | Akuntan | Mencoba mengakses/mengubah tabel audit_log melalui URL atau API | Ditolak (RLS hanya mengizinkan Direktur) | - | Belum |
