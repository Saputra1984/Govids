class AntiMainstreamTranslator {
    constructor() {
        this.kamusData = {};
        this.isLoaded = false;
    }

    // 1. Memuat database JS Lokal
    async inisialisasiKamus() {
        if (window.kamusMultiBahasaData) {
            this.kamusData = window.kamusMultiBahasaData;
            this.isLoaded = true;
            console.log("Database Kamus 6 Bahasa (Lokal) berhasil dimuat.");
            return true;
        } else {
            console.error("Gagal memuat database.js lokal.");
            return false;
        }
    }

    // 2. Rumus Pembersihan Kata Dasar (Stemming + Normalisasi Huruf Kecil)
    bersihkanKataInggris(kata) {
        // UBAH KE HURUF KECIL DAN BUANG SPASI KIRI-KANAN
        let kataBersih = kata.toLowerCase().trim();
        
        // Hilangkan tanda baca yang menempel di ujung kata
        kataBersih = kataBersih.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,"");

        // Rumus memotong imbuhan umum bahasa Inggris
        if (kataBersih.length > 4) {
            if (kataBersih.endsWith('ing')) return kataBersih.slice(0, -3); 
            if (kataBersih.endsWith('ed')) return kataBersih.slice(0, -2);  
            if (kataBersih.endsWith('s') && !kataBersih.endsWith('ss')) return kataBersih.slice(0, -1); 
        }
        return kataBersih;
    }

    // 3. Logika Pencarian Kata dengan Toleransi Spasi & Huruf Besar/Kecil
    cariTerjemahanKata(kataAsal, kodeBahasaAsal, kodeBahasaTujuan) {
        // Bersihkan kata asal (misal "Eating," -> "eat")
        const kataKunci = this.bersihkanKataInggris(kataAsal);

        // Loop gudang kata di database.js
        for (const [key, opsiBahasa] of Object.entries(this.kamusData)) {
            // Normalisasi kunci database (misal "thank_you" diubah jadi "thank you" agar cocok dengan spasi)
            const kunciNormal = key.replace(/_/g, " ");
            
            // Ambil teks bahasa asal di kamus lalu buat huruf kecil
            const teksAsalDiKamus = opsiBahasa[kodeBahasaAsal] ? opsiBahasa[kodeBahasaAsal].toLowerCase().trim() : "";

            // Lakukan pencocokan multi-arah (cek Kunci Utama atau Teks Bahasa Asal)
            if (kunciNormal === kataKunci || teksAsalDiKamus === kataKunci || key === kataKunci) {
                return opsiBahasa[kodeBahasaTujuan] || kataAsal;
            }
        }
        
        // Jika tidak ada di database, kembalikan kata asli
        return kataAsal;
    }

    // 4. Rumus Pola Tata Bahasa Sederhana (Grammar Adjuster)
    sesuaikanStrukturKalimat(arrayKata, bahasaAsal, bahasaTujuan) {
        if (bahasaAsal === 'en' && bahasaTujuan === 'id') {
            const kataSifatContoh = ['blue', 'red', 'big', 'small', 'hot', 'cold', 'good', 'bad', 'happy', 'sad'];
            const kataBendaContoh = ['house', 'car', 'water', 'book', 'apple', 'time', 'money'];

            for (let i = 0; i < arrayKata.length - 1; i++) {
                let kataSekarang = arrayKata[i].toString().toLowerCase();
                let kataBerikutnya = arrayKata[i+1].toString().toLowerCase();

                if (kataSifatContoh.includes(kataSekarang) && kataBendaContoh.includes(kataBerikutnya)) {
                    let temp = arrayKata[i];
                    arrayKata[i] = arrayKata[i+1];
                    arrayKata[i+1] = temp;
                    i++; 
                }
            }
        }
        return arrayKata;
    }

    // 5. Fungsi Eksekusi Terjemahan Kalimat Utuh
    terjemahkanKalimat(kalimatFull, bahasaAsalLengkap, kodeBahasaTujuan) {
        if (!this.isLoaded) return kalimatFull;

        const kodeBahasaAsal = bahasaAsalLengkap.split('-')[0]; // 'en-US' -> 'en'
        
        // --- TRIK UNTUK GABUNGAN KATA SEPERTI "THANK YOU" ---
        // Sebelum memecah per kata, kita cek dulu apakah ada frasa gabungan di kalimat tersebut
        let kalimatProses = kalimatFull.toLowerCase().trim();
        
        // Pecah kalimat menjadi array kata-per-kata
        const kumpulanKata = kalimatProses.split(/\s+/); // pecah berdasarkan spasi
        
        // Terjemahkan kata satu per satu
        let kumpulanKataTerjemahan = kumpulanKata.map(kata => {
            return this.cariTerjemahanKata(kata, kodeBahasaAsal, kodeBahasaTujuan);
        });

        // Terapkan penyesuaian susunan kata (misal: big house -> rumah besar)
        kumpulanKataTerjemahan = this.sesuaikanStrukturKalimat(kumpulanKataTerjemahan, kodeBahasaAsal, kodeBahasaTujuan);

        // Gabungkan kembali jadi kalimat utuh dan rapikan huruf kapital di awal kalimat
        let hasilAkhir = kumpulanKataTerjemahan.join(' ');
        return hasilAkhir.charAt(0).toUpperCase() + hasilAkhir.slice(1);
    }
}

window.translatorMesin = new AntiMainstreamTranslator();
