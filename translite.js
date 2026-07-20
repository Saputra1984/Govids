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
        let kataBersih = kata.toLowerCase().trim();
        kataBersih = kataBersih.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,"");

        if (kataBersih.length > 4) {
            if (kataBersih.endsWith('ing')) return kataBersih.slice(0, -3); 
            if (kataBersih.endsWith('ed')) return kataBersih.slice(0, -2);  
            if (kataBersih.endsWith('s') && !kataBersih.endsWith('ss')) return kataBersih.slice(0, -1); 
        }
        return kataBersih;
    }

    // 3. Logika Pencarian Kata dengan Toleransi Spasi & Huruf Besar/Kecil
    cariTerjemahanKata(kataAsal, kodeBahasaAsal, kodeBahasaTujuan) {
        const kataKunci = this.bersihkanKataInggris(kataAsal);

        for (const [key, opsiBahasa] of Object.entries(this.kamusData)) {
            const kunciNormal = key.replace(/_/g, " ");
            const teksAsalDiKamus = opsiBahasa[kodeBahasaAsal] ? opsiBahasa[kodeBahasaAsal].toLowerCase().trim() : "";

            if (kunciNormal === kataKunci || teksAsalDiKamus === kataKunci || key === kataKunci) {
                return opsiBahasa[kodeBahasaTujuan] || kataAsal;
            }
        }
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
        if (!this.isLoaded) this.inisialisasiKamus(); // Auto reload jika belum termuat

        const kodeBahasaAsal = bahasaAsalLengkap.split('-')[0];
        let kalimatProses = kalimatFull.toLowerCase().trim();
        const kumpulanKata = kalimatProses.split(/\s+/);
        
        let kumpulanKataTerjemahan = kumpulanKata.map(kata => {
            return this.cariTerjemahanKata(kata, kodeBahasaAsal, kodeBahasaTujuan);
        });

        kumpulanKataTerjemahan = this.sesuaikanStrukturKalimat(kumpulanKataTerjemahan, kodeBahasaAsal, kodeBahasaTujuan);

        let hasilAkhir = kumpulanKataTerjemahan.join(' ');
        return hasilAkhir.charAt(0).toUpperCase() + hasilAkhir.slice(1);
    }
}

// Inisialisasi Instance
window.translatorMesin = new AntiMainstreamTranslator();
window.translatorMesin.inisialisasiKamus();

// JEMBATAN KE BRAIN.JS (SINKRONISASI FUNGSI)
function translateText(text, srcLang, tgtLang) {
    if (window.translatorMesin) {
        return window.translatorMesin.terjemahkanKalimat(text, srcLang, tgtLang);
    }
    return text;
}
