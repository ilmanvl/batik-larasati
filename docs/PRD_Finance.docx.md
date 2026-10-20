**Bootcamp AI Web Programming · Capstone Project**

PRD Aplikasi Finance dan Accounting UMKM

**CV Batik Larasati**

## **1\. Latar Belakang**

CV Batik Larasati adalah usaha produksi dan toko batik tulis dan batik cap di Surakarta dengan 7 karyawan. Selain menjual kain dan seragam batik, usaha ini membuka kelas membatik untuk rombongan wisata. Pembukuan saat ini dicatat di beberapa file *spreadsheet* oleh satu akuntan, sedangkan pengajuan uang dan penggantian biaya (*reimburse*) dikirim karyawan lewat WhatsApp dengan foto nota. Akibatnya sering terjadi:

* nota hilang atau dibayar dua kali karena tidak ada nomor pengajuan;

* pengeluaran besar dibayar tanpa sepengetahuan pemilik;

* jurnal tidak seimbang atau diubah setelah laporan bulan itu dikirim ke pemilik;

* pemilik baru tahu usahanya untung atau rugi beberapa minggu setelah bulan berakhir;

* data gaji dan laporan keuangan pernah terlihat oleh karyawan yang tidak berkepentingan.

Aplikasi ini menggantikan *spreadsheet* dan WhatsApp dengan satu aplikasi web internal untuk pengajuan pengeluaran, jurnal umum, dan laporan keuangan sederhana.

## **2\. Tujuan**

1. Karyawan mengajukan pengeluaran dan *reimburse* lengkap dengan bukti, lalu bisa memantau statusnya sendiri.

2. Setiap pengeluaran melewati persetujuan berjenjang sesuai nilainya sebelum dibayar.

3. Setiap transaksi tercatat sebagai jurnal yang seimbang (debit sama dengan kredit) dengan nomor berurutan.

4. Laporan laba rugi dan neraca bisa dilihat kapan saja tanpa menyusun ulang di *spreadsheet*.

5. Pembukuan bulan yang sudah ditutup tidak bisa diubah diam-diam.

## **3\. Pengguna dan Peran**

| Peran | Siapa | Yang bisa dilakukan |
| :---- | :---- | :---- |
| Staf | Karyawan produksi, pemasaran, dan toko | Membuat, mengubah, mengirim, dan membatalkan pengajuan miliknya; mengunggah bukti; melihat status pengajuan miliknya |
| Akuntan | Bagian akuntansi (2 orang) | Mengelola bagan akun dan periode; membuat, memposting, dan membalik jurnal; memverifikasi dan membayar pengajuan; menutup periode; melihat semua laporan; boleh mengajukan *reimburse* untuk dirinya sendiri |
| Direktur | Pemilik usaha | Menyetujui pengajuan bernilai besar dan pengajuan milik Akuntan; melihat semua jurnal dan laporan; membuka kembali periode; mengelola akun pengguna; melihat *audit log* |

Pengunjung yang belum masuk hanya melihat halaman Masuk. Pendaftaran akun dilakukan oleh Direktur, bukan dibuka untuk umum. Akun baru selalu berperan Staf sampai diubah Direktur.

## **4\. Aturan Bisnis**

| Kode | Aturan |
| :---- | :---- |
| BR-01 | Bagan akun memakai kode 4 digit yang unik. Digit pertama menunjukkan tipe: 1 aset, 2 kewajiban, 3 ekuitas, 4 pendapatan, 5 beban. Aset dan beban bersaldo normal debit; kewajiban, ekuitas, dan pendapatan bersaldo normal kredit. Akun yang sudah dipakai di jurnal atau pengajuan tidak boleh dihapus dan tidak boleh diubah kode atau tipenya; akun itu hanya bisa dinonaktifkan. Akun nonaktif tidak bisa dipilih di jurnal atau pengajuan baru. |
| BR-02 | Jurnal minimal berisi 2 baris. Setiap baris diisi debit saja atau kredit saja dengan nilai rupiah bulat lebih dari 0\. Jurnal boleh disimpan sebagai draf walaupun belum seimbang, tetapi hanya bisa diposting bila total debit sama dengan total kredit. |
| BR-03 | Nomor jurnal diberikan saat posting dengan format JU-TahunBulan-NomorUrut (contoh JU-202610-0007). Nomor berurutan per bulan tanggal jurnal, tidak boleh ada nomor ganda dan tidak boleh ada nomor yang terlewat, termasuk saat dua Akuntan memposting pada detik yang sama atau saat posting gagal. Draf belum memiliki nomor. Pengajuan juga bernomor otomatis PG-TahunBulan-NomorUrut. |
| BR-04 | Jurnal yang sudah diposting tidak bisa diubah atau dihapus oleh siapa pun. Kesalahan dikoreksi dengan jurnal pembalik: baris yang sama dengan debit dan kredit ditukar, lalu diposting di periode yang masih terbuka. Satu jurnal hanya bisa dibalik satu kali. Jurnal pembalik dan jurnal pembayaran pengajuan tidak bisa dibalik. |
| BR-05 | Jurnal hanya bisa dibuat, diubah, dan diposting bila tanggalnya berada di periode yang ada dan berstatus terbuka. Aturan ini juga berlaku untuk jurnal pembalik dan jurnal pembayaran pengajuan. Bila Akuntan menutup periode pada saat Akuntan lain sedang memposting, hasilnya harus salah satu: jurnal masuk sebelum periode tertutup, atau posting ditolak. Tidak boleh ada jurnal yang masuk ke periode setelah periode itu ditutup. |
| BR-06 | Hanya Akuntan yang dapat menutup periode. Periode ditutup berurutan (periode sebelumnya harus sudah ditutup) dan hanya bila tidak ada jurnal draf di periode itu. Hanya Direktur yang dapat membuka kembali periode, hanya periode terakhir yang ditutup, dan wajib menulis alasan minimal 20 karakter. |
| BR-07 | Pengajuan bernilai Rp10.000 sampai Rp25.000.000 (rupiah bulat), memakai akun beban yang aktif, dan berisi keperluan minimal 10 karakter. Tanggal transaksi tidak boleh di masa depan dan paling lama 30 hari sebelum tanggal pengajuan dikirim (termasuk saat dikirim ulang setelah revisi). Bukti (foto JPG, PNG, atau PDF, maksimal 5 MB) wajib diunggah sebelum dikirim. |
| BR-08 | Status pengajuan berpindah sesuai tabel Alur Status. Pengaju hanya bisa mengubah atau membatalkan pengajuan berstatus draf atau perlu revisi. Akuntan memverifikasi pengajuan berstatus diajukan: pengajuan sampai Rp1.000.000 langsung disetujui, pengajuan di atas Rp1.000.000 diteruskan ke Direktur. Meminta revisi atau menolak wajib disertai catatan minimal 10 karakter. |
| BR-09 | Tidak ada orang yang boleh memverifikasi atau menyetujui pengajuannya sendiri. Pengajuan milik Akuntan langsung menunggu persetujuan Direktur berapa pun nilainya. Direktur tidak membuat pengajuan. |
| BR-10 | Hanya Akuntan yang membayar pengajuan berstatus disetujui, dengan memilih akun kas atau bank yang aktif. Pembayaran ditolak bila saldo akun kas atau bank itu kurang dari jumlah pengajuan. Saat dibayar, sistem otomatis membuat dan memposting jurnal (debit akun beban, kredit akun kas atau bank). Satu pengajuan hanya bisa dibayar satu kali walaupun tombol bayar ditekan dua kali atau oleh dua Akuntan bersamaan. |
| BR-11 | Data keuangan bersifat rahasia. Jurnal, buku besar, saldo akun, laporan laba rugi, neraca, dan dashboard keuangan hanya bisa dilihat Akuntan dan Direktur, termasuk bila diakses langsung lewat API. Staf hanya melihat pengajuan miliknya, bukti miliknya, dan daftar akun beban yang aktif (kode dan nama). |
| BR-12 | Hanya Direktur yang dapat mengubah peran dan status aktif pengguna, dan Direktur tidak boleh mengubah peran atau status akunnya sendiri. Akun nonaktif tidak bisa melakukan apa pun. Aksi sensitif tercatat di *audit log*: posting dan pembalikan jurnal, perubahan status pengajuan, pembayaran, tutup dan buka periode, perubahan akun, serta perubahan peran pengguna. *Audit log* hanya bisa dilihat Direktur dan tidak bisa diubah atau dihapus oleh siapa pun. |

## **5\. User Story**

| Kode | User story | Aturan terkait |
| :---- | :---- | :---- |
| US-01 | Sebagai staf, saya ingin membuat pengajuan *reimburse* atau pengeluaran beserta foto nota agar uang saya diganti tanpa harus mengirim WhatsApp. | BR-07, BR-03 |
| US-02 | Sebagai staf, saya ingin melihat status pengajuan saya dan catatan revisi agar tahu apa yang harus diperbaiki. | BR-08, BR-11 |
| US-03 | Sebagai akuntan, saya ingin memverifikasi pengajuan: menyetujui, meminta revisi, atau menolak dengan catatan. | BR-08, BR-09 |
| US-04 | Sebagai direktur, saya ingin menyetujui atau menolak pengajuan di atas Rp1.000.000 dan pengajuan milik akuntan. | BR-08, BR-09 |
| US-05 | Sebagai akuntan, saya ingin membayar pengajuan yang disetujui dan jurnalnya terbentuk otomatis. | BR-10, BR-03, BR-05 |
| US-06 | Sebagai akuntan, saya ingin mencatat jurnal umum sebagai draf lalu mempostingnya bila sudah seimbang. | BR-01, BR-02, BR-03, BR-05 |
| US-07 | Sebagai akuntan, saya ingin membalik jurnal yang salah tanpa menghapus jejaknya. | BR-04, BR-05 |
| US-08 | Sebagai akuntan, saya ingin mengelola bagan akun dan menutup periode bulanan. | BR-01, BR-06 |
| US-09 | Sebagai direktur, saya ingin melihat dashboard, buku besar, laba rugi, dan neraca kapan saja. | BR-11 |
| US-10 | Sebagai direktur, saya ingin membuka kembali periode bila ada koreksi, mengatur peran pengguna, dan melihat *audit log*. | BR-06, BR-12 |

## **6\. Alur Status**

### **6.1 Status pengajuan**

| Status | Arti |
| :---- | :---- |
| draf | Masih disusun pengaju, belum terlihat untuk diproses |
| diajukan | Dikirim pengaju, menunggu verifikasi Akuntan |
| perlu\_revisi | Dikembalikan ke pengaju dengan catatan |
| menunggu\_direktur | Nilai di atas Rp1.000.000 atau milik Akuntan, menunggu Direktur |
| disetujui | Siap dibayar |
| ditolak | Selesai, tidak dibayar |
| dibayar | Selesai, jurnal pembayaran sudah diposting |
| dibatalkan | Selesai, dibatalkan pengaju |

| Dari | Ke | Siapa | Syarat |
| :---- | :---- | :---- | :---- |
| draf, perlu\_revisi | diajukan | Staf pemilik | Bukti ada, data lolos BR-07 |
| draf, perlu\_revisi | menunggu\_direktur | Akuntan pemilik | Bukti ada, data lolos BR-07 |
| draf, perlu\_revisi | dibatalkan | Pemilik | Tidak ada |
| diajukan | disetujui | Akuntan selain pengaju | Jumlah sampai Rp1.000.000 |
| diajukan | menunggu\_direktur | Akuntan selain pengaju | Jumlah di atas Rp1.000.000 |
| diajukan | perlu\_revisi atau ditolak | Akuntan selain pengaju | Catatan minimal 10 karakter |
| menunggu\_direktur | disetujui | Direktur | Tidak ada |
| menunggu\_direktur | perlu\_revisi atau ditolak | Direktur | Catatan minimal 10 karakter |
| disetujui | dibayar | Akuntan | Saldo kas atau bank cukup, periode tanggal bayar terbuka |

Perpindahan lain ditolak, misalnya Staf mengubah status langsung menjadi disetujui, Akuntan menyetujui pengajuan yang menunggu Direktur, atau membayar pengajuan yang belum disetujui.

### **6.2 Status jurnal dan periode**

| Data | Dari | Ke | Siapa | Syarat |
| :---- | :---- | :---- | :---- | :---- |
| Jurnal | (baru) | draf | Akuntan | Tanggal di periode terbuka |
| Jurnal | draf | diposting | Akuntan | Seimbang, minimal 2 baris, akun aktif, periode terbuka |
| Jurnal | draf | (dihapus) | Akuntan | Hanya draf |
| Jurnal | diposting | dibalik | Akuntan | Lewat jurnal pembalik (BR-04) |
| Periode | terbuka | ditutup | Akuntan | Periode sebelumnya ditutup, tidak ada draf |
| Periode | ditutup | terbuka | Direktur | Periode terakhir yang ditutup, alasan minimal 20 karakter |

## **7\. Halaman**

| Halaman | Akses | Isi |
| :---- | :---- | :---- |
| Masuk | Publik | *Login* email dan kata sandi; akun nonaktif ditolak |
| Dashboard | Semua peran (isi berbeda) | Akuntan dan Direktur: saldo kas dan bank, pendapatan, beban, laba bulan berjalan, grafik pendapatan dan beban per bulan, pengajuan yang menunggu, status periode. Staf: ringkasan pengajuan miliknya saja |
| Pengajuan | Semua peran | Daftar dengan filter status dan bulan, formulir baru dan ubah (unggah bukti), detail dengan riwayat status dan tombol aksi sesuai peran dan status |
| Jurnal Umum | Akuntan (tulis), Direktur (baca) | Daftar jurnal per periode, formulir draf dengan total debit, kredit, dan selisih, tombol Posting, detail jurnal dengan tombol Buat Jurnal Pembalik |
| Buku Besar | Akuntan, Direktur | Pilih akun dan rentang tanggal; saldo awal, mutasi debit dan kredit, saldo berjalan |
| Laporan Keuangan | Akuntan, Direktur | Laba rugi per periode atau rentang tanggal, neraca per tanggal, neraca saldo; unduh PDF atau cetak |
| Akun dan Periode | Akuntan (kelola), Direktur (baca dan buka kembali periode) | Bagan akun (tambah, ubah, nonaktifkan), daftar periode dengan tombol Tutup dan Buka Kembali |
| Pengguna dan Audit Log | Direktur | Daftar pengguna, ubah peran dan status aktif, tabel *audit log* dengan filter tanggal, tabel, dan pelaku |

Halaman yang tidak boleh diakses peran tertentu tidak muncul di menu, dan bila dibuka langsung lewat URL, pengguna diarahkan ke Dashboard. Pembatasan yang sama wajib berlaku di database, bukan hanya di tampilan.

## **8\. Data Utama**

Rincian kolom, tipe, dan relasi ada di file ERD\_Finance.pdf. Ringkasannya:

| Data | Isi penting |
| :---- | :---- |
| Profil pengguna | nama, email, peran, jabatan, status aktif |
| Akun | kode, nama, tipe, saldo normal, penanda kas atau bank, status aktif |
| Periode | tahun, bulan, status, ditutup oleh dan kapan, alasan buka kembali |
| Jurnal | nomor, tanggal, periode, keterangan, sumber, status, pengajuan terkait, jurnal yang dibalik |
| Baris jurnal | jurnal, akun, debit, kredit, keterangan |
| Pengajuan | nomor, pengaju, jenis, tanggal transaksi, akun beban, jumlah, bukti, status, catatan, pemverifikasi, penyetuju, akun kas, pembayar |
| Penomoran | nomor terakhir per jenis dokumen per bulan |
| *Audit log* | pelaku, aksi, tabel, data lama, data baru, waktu |

Saldo akun dan laporan tidak disimpan sebagai tabel terpisah, melainkan dihitung dari baris jurnal yang sudah diposting. Bukti pengajuan disimpan di *storage* privat.

## **9\. Dashboard dan Laporan**

1. **Kartu ringkasan**: total saldo kas dan bank, pendapatan bulan berjalan, beban bulan berjalan, laba bulan berjalan, jumlah pengajuan yang menunggu peran yang sedang masuk.

2. **Grafik batang** pendapatan dan beban per bulan untuk paling banyak 6 bulan terakhir.

3. **Tabel pengajuan menunggu** persetujuan, dengan tombol Tinjau.

4. **Status periode**: daftar periode beserta status dan jumlah jurnal draf.

5. **Laporan laba rugi**: pendapatan per akun, beban per akun, total, dan laba (rugi) bersih. Angka negatif ditampilkan dalam kurung.

6. **Neraca**: aset, kewajiban, ekuitas, dan baris "Laba (rugi) berjalan" (total pendapatan dikurangi total beban sejak saldo awal). Total aset harus sama dengan total kewajiban dan ekuitas; bila tidak sama, tampilkan peringatan.

7. **Buku besar**: saldo awal, setiap mutasi, dan saldo berjalan untuk satu akun.

## **10\. Kebutuhan Non-Fungsional**

1. Dashboard tampil dalam 3 detik pada koneksi 4G untuk data 12 bulan (sekitar 3.000 baris jurnal).

2. Aplikasi bersifat internal: semua halaman memakai noindex, nofollow dan tidak ada halaman publik selain Masuk.

3. Semua aturan akses (BR-11, BR-12) dan aturan uang (BR-02 sampai BR-10) dijaga di database, sehingga tetap berlaku walaupun seseorang memanggil API langsung tanpa melewati tampilan.

4. Nilai uang disimpan sebagai bilangan bulat rupiah, bukan bilangan pecahan (*floating point*), agar tidak ada selisih pembulatan.

5. File bukti disimpan di *bucket* privat dan dibuka lewat tautan sementara (*signed URL*).

6. Database dicadangkan otomatis setiap hari dan bisa dipulihkan ke titik waktu tertentu minimal 7 hari ke belakang.

7. Tampilan bisa dipakai di ponsel untuk halaman Pengajuan (Staf biasanya mengunggah foto nota dari ponsel).

## **11\. Fitur Nilai Tambah (opsional)**

Aplikasi ini tidak membutuhkan integrasi pihak ketiga seperti *payment gateway*. Bila waktu tersisa, peserta boleh memilih satu fitur berikut:

1. **Impor CSV mutasi bank**: Akuntan mengunggah file CSV mutasi rekening (tanggal, deskripsi, jumlah, saldo). Sistem menampilkan baris yang belum punya jurnal, mencegah impor ganda untuk baris yang sama, dan Akuntan bisa membuat draf jurnal dari satu baris mutasi. Contoh data ada di sheet mutasi\_bank.

2. **Notifikasi email** ke pengaju saat pengajuan diminta revisi, ditolak, atau dibayar, dan ke Direktur saat ada pengajuan yang menunggu.

## **12\. Akun Uji dan Data Contoh**

Akun uji dan data contoh ada di file Data\_Contoh\_Finance.xlsx (sheet Akun Uji dan satu sheet per tabel). Ringkasan akun uji (kata sandi latihan sama untuk semua):

| Nama | Email | Peran |
| :---- | :---- | :---- |
| Laras Prameswari | laras@larasati.test | Direktur |
| Dimas Arya Nugroho | dimas@larasati.test | Akuntan |
| Wulan Sari Utami | wulan@larasati.test | Akuntan |
| Rina Anggraini | rina@larasati.test | Staf |
| Bagus Saputra | bagus@larasati.test | Staf |
| Sekar Ayu Lestari | sekar@larasati.test | Staf |
| Yoga Pratama | yoga@larasati.test | Staf (nonaktif) |

Data contoh mencakup Juli sampai 15 Oktober 2026: 26 akun, 4 periode (Juli dan Agustus ditutup), 90 jurnal, dan 35 pengajuan dengan semua status. Sheet Petunjuk menjelaskan kasus batas yang sengaja dimuat, misalnya saldo Kas Kecil yang tidak cukup untuk satu pengajuan yang sudah disetujui.

## **13\. Kriteria Selesai**

* ☐ Ketiga peran bisa masuk dan hanya melihat menu serta data sesuai haknya; akun nonaktif ditolak.

* ☐ Staf membuat pengajuan dengan bukti; pengajuan di luar batas BR-07 ditolak dengan pesan yang jelas.

* ☐ Semua perpindahan status pengajuan di tabel 6.1 berjalan, dan perpindahan yang tidak ada di tabel ditolak di database.

* ☐ Pengajuan sampai Rp1.000.000 selesai di Akuntan; di atas Rp1.000.000 dan milik Akuntan wajib lewat Direktur.

* ☐ Pembayaran membuat tepat satu jurnal seimbang dan menolak saldo kas atau bank yang kurang.

* ☐ Jurnal tidak seimbang tidak bisa diposting; jurnal yang sudah diposting tidak bisa diubah atau dihapus walau lewat API.

* ☐ Dua posting bersamaan menghasilkan dua nomor berurutan tanpa ganda dan tanpa lompatan.

* ☐ Jurnal di periode yang ditutup ditolak; tutup dan buka kembali periode mengikuti BR-06.

* ☐ Laba rugi dan neraca sesuai data contoh (laba rugi September 2026 rugi Rp4.625.000; total aset per 30 September 2026 Rp266.951.000) dan neraca seimbang.

* ☐ Staf tidak bisa membaca jurnal, saldo, laporan, atau bukti milik orang lain walau memanggil API langsung.

* ☐ *Audit log* mencatat aksi sensitif BR-12 dan hanya terlihat oleh Direktur.

* ☐ Minimal 10 *test case* dari aturan bisnis dijalankan dan hasilnya dicatat.

* ☐ Aplikasi tayang di Netlify dengan noindex, dan tautan serta akun uji diserahkan ke mentor.

## **14\. Di Luar Lingkup**

Pajak (PPN, PPh, e-Faktur), penggajian, persediaan dan harga pokok penjualan otomatis, aset tetap dan penyusutan otomatis, banyak mata uang, banyak cabang atau perusahaan, anggaran, faktur penjualan dan piutang per pelanggan, rekonsiliasi bank otomatis, tutup buku tahunan ke laba ditahan, serta aplikasi ponsel *native*.