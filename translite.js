// GOVIDS - TRANSLITE.JS (ENGINE TRANSLATOR OFFLINE)

class AntiMainstreamTranslator {
    constructor() {
        this.kamusData = {};
        this.isLoaded = false;
    }

    // 1. Memuat database JS Lokal dengan Safety Guard
    inisialisasiKamus() {
        if (window.kamusMultiBahasaData) {
            this.kamusData = window.kamusMultiBahasaData;
            this.isLoaded = true;
            return true;
        }
        return false;
    }

    // 2. Stemming Ringan Inggris
    bersihkanKataInggris(kata) {
        if (!kata) return "";
        let k = kata.toLowerCase();
        if (k.length > 4) {
            if (k.endsWith('ing')) return k.slice(0, -3);
            if (k.endsWith('ed')) return k.slice(0, -2);
            if (k.endsWith('s') && !k.endsWith('ss')) return k.slice(0, -1);
        }
        return k;
    }

    // 3. Cari Kata / Fallback ke Kata Asli
    cariDiKamus(kata, srcLang, tgtLang) {
        if (!kata) return "";
        
        const kataClean = this.bersihkanKataInggris(kata);

        // A. Cek berdasarkan Key Utama Kamus
        if (this.kamusData[kataClean]) {
            const entri = this.kamusData[kataClean];
            if (typeof entri === 'object' && entri[tgtLang]) {
                return entri[tgtLang];
            } else if (typeof entri === 'string') {
                return entri;
            }
        }

        // B. Cek Pencocokan Nilai Bahasa Asal
        for (const key in this.kamusData) {
            const item = this.kamusData[key];
            if (typeof item === 'object' && item[srcLang]) {
                if (item[srcLang].toLowerCase() === kataClean) {
                    return item[tgtLang] || kata;
                }
            }
        }

        // C. FALLBACK: Kembalikan kata asli
        return kata;
    }

    // 4. Pengolah Utama Kalimat & Tata Bahasa
    terjemahkanKalimat(kalimatFull, bahasaAsalLengkap, kodeBahasaTujuan) {
        if (!this.isLoaded) {
            this.inisialisasiKamus();
        }
        
        if (!kalimatFull || !kalimatFull.trim()) return "";

        const srcLang = bahasaAsalLengkap ? bahasaAsalLengkap.split('-')[0].toLowerCase() : 'en';
        const tgtLang = kodeBahasaTujuan ? kodeBahasaTujuan.split('-')[0].toLowerCase() : 'id';

        let teksSiap = kalimatFull
            .replace(/([.?!,])/g, " $1 ")
            .replace(/\s+/g, " ")
            .trim();

        let kataArray = teksSiap.split(" ");
        let hasilArray = [];
        let i = 0;

        while (i < kataArray.length) {
            let kataSekarang = kataArray[i];

            if (/^[.?!,]$/.test(kataSekarang)) {
                hasilArray.push(kataSekarang);
                i++;
                continue;
            }

            // Cek Frasa 2 Kata
            if (i < kataArray.length - 1 && !/^[.?!,]$/.test(kataArray[i + 1])) {
                let frasaDuaKata = (kataSekarang + "_" + kataArray[i + 1]).toLowerCase();
                let hasilFrasa = this.cariDiKamus(frasaDuaKata, srcLang, tgtLang);

                if (hasilFrasa !== frasaDuaKata) {
                    hasilArray.push(hasilFrasa);
                    i += 2;
                    continue;
                }
            }

            // Aturan Tata Bahasa Sederhana (EN <-> ID)
            if (srcLang === 'en' && tgtLang === 'id' && i < kataArray.length - 1) {
                let kataBerikutnya = kataArray[i + 1];

                if (!/^[.?!,]$/.test(kataBerikutnya)) {
                    let terjemahan1 = this.cariDiKamus(kataSekarang, srcLang, tgtLang);
                    let terjemahan2 = this.cariDiKamus(kataBerikutnya, srcLang, tgtLang);

                    if (this.isKataSifat(kataSekarang) && this.isKataBenda(kataBerikutnya)) {
                        hasilArray.push(terjemahan2);
                        hasilArray.push(terjemahan1);
                        i += 2;
                        continue;
                    }
                }
            }

            // Kata Tunggal
            let terjemahanTunggal = this.cariDiKamus(kataSekarang, srcLang, tgtLang);
            
            if (kataSekarang.charAt(0) === kataSekarang.charAt(0).toUpperCase() && terjemahanTunggal === kataSekarang) {
                hasilArray.push(kataSekarang);
            } else {
                hasilArray.push(terjemahanTunggal);
            }

            i++;
        }

        let hasilTeks = hasilArray.join(" ")
            .replace(/\s+([.?!,])/g, "$1")
            .replace(/\s+/g, " ")
            .trim();

        return hasilTeks ? (hasilTeks.charAt(0).toUpperCase() + hasilTeks.slice(1)) : "";
    }

    isKataSifat(kata) {
        const listSifat = ['blue', 'red', 'big', 'small', 'hot', 'cold', 'good', 'bad', 'happy', 'sad', 'fast', 'slow'];
        return listSifat.includes(kata.toLowerCase());
    }

    isKataBenda(kata) {
        const listBenda = ['house', 'car', 'water', 'book', 'apple', 'time', 'money', 'man', 'woman', 'dog', 'cat'];
        return listBenda.includes(kata.toLowerCase());
    }
}

// Inisialisasi Instance Global
window.translatorMesin = new AntiMainstreamTranslator();
window.translatorMesin.inisialisasiKamus();

// Jembatan Antarmuka ke Brain.js dengan Safety Re-check
function translateText(text, srcLang, tgtLang) {
    if (!window.translatorMesin) {
        window.translatorMesin = new AntiMainstreamTranslator();
    }
    
    if (!window.translatorMesin.isLoaded) {
        window.translatorMesin.inisialisasiKamus();
    }

    return window.translatorMesin.terjemahkanKalimat(text, srcLang, tgtLang);
}
