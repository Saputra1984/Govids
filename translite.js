// GOVIDS - TRANSLITE.JS (TRANSLATOR ENGINE - OPTIMIZED FOR LOCAL DICTIONARY)

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

    // 2. Normalisasi Kode Bahasa (Flexible Lookup)
    // Mendukung 'id', 'id-ID', 'en', 'en-US' tanpa error undefined
    normalisasiLang(langStr) {
        if (!langStr) return 'id';
        return langStr.split('-')[0].toLowerCase();
    }

    // 3. Cari Kata / Frasa di Kamus (Aman dari Undefined & Pemotongan Kata Rusak)
    cariDiKamus(kataRaw, srcLang, tgtLang) {
        if (!kataRaw) return "";

        const src = this.normalisasiLang(srcLang);
        const tgt = this.normalisasiLang(tgtLang);
        const kataClean = kataRaw.toLowerCase().trim();

        if (!this.kamusData) return kataRaw;

        // A. Cek Langsung Berdasarkan Key Utama Kamus
        if (this.kamusData[kataClean]) {
            const entri = this.kamusData[kataClean];
            if (typeof entri === 'object' && entri !== null) {
                let hasil = entri[tgt] || entri[tgtLang] || entri['id'] || entri['en'];
                if (hasil) return hasil;
            } else if (typeof entri === 'string') {
                return entri;
            }
        }

        // B. Dukungan Aturan Jamak Khusus (_s)
        // Jika kata berakhiran 's' dan tidak ketemu langsung (misal: "cats")
        // Coba cari bentuk "cat_s" atau "cat" di kamus
        if (kataClean.length > 3 && kataClean.endsWith('s') && !kataClean.endsWith('ss')) {
            let kataDasar = kataClean.slice(0, -1);
            let keyPluralS = kataDasar + "_s"; // Misal: cat_s

            if (this.kamusData[keyPluralS]) {
                const entri = this.kamusData[keyPluralS];
                if (typeof entri === 'object' && entri !== null) {
                    let hasil = entri[tgt] || entri['id'] || entri['en'];
                    if (hasil) return hasil;
                }
            } else if (this.kamusData[kataDasar]) {
                // Fallback jika hanya ada kata dasar (misal: "cat")
                const entri = this.kamusData[kataDasar];
                if (typeof entri === 'object' && entri !== null) {
                    let hasil = entri[tgt] || entri['id'] || entri['en'];
                    if (hasil) {
                        // Tambahkan penanda jamak sederhana jika dalam bahasa ID
                        return (tgt === 'id') ? (hasil + " " + hasil) : hasil; 
                    }
                }
            }
        }

        // C. Cek Pencocokan Nilai Bahasa Asal (Reverse Lookup)
        for (const key in this.kamusData) {
            const item = this.kamusData[key];
            if (typeof item === 'object' && item !== null) {
                let valSrc = item[src] || item[srcLang];
                if (valSrc && String(valSrc).toLowerCase() === kataClean) {
                    let hasil = item[tgt] || item[tgtLang] || item['id'] || item['en'];
                    if (hasil) return hasil;
                }
            }
        }

        // D. FALLBACK UTAMA: Kembalikan kata asli (Bebas Potongan Rusak)
        return kataRaw;
    }

    // 4. Pengolah Utama Kalimat & Tata Bahasa
    terjemahkanKalimat(kalimatFull, bahasaAsalLengkap, kodeBahasaTujuan) {
        if (!this.isLoaded) {
            this.inisialisasiKamus();
        }
        
        if (!kalimatFull || typeof kalimatFull !== 'string' || !kalimatFull.trim()) {
            return "";
        }

        const srcLang = this.normalisasiLang(bahasaAsalLengkap);
        const tgtLang = this.normalisasiLang(kodeBahasaTujuan);

        // Amankan tanda baca & pisahkan kata tanpa merusak format
        let teksSiap = kalimatFull
            .replace(/([.?!,])/g, " $1 ")
            .replace(/\s+/g, " ")
            .trim();

        let kataArray = teksSiap.split(" ");
        let hasilArray = [];
        let i = 0;

        while (i < kataArray.length) {
            let kataSekarang = kataArray[i];

            if (!kataSekarang) {
                i++;
                continue;
            }

            // Jika berupa tanda baca tunggal, langsung lewati
            if (/^[.?!,]$/.test(kataSekarang)) {
                hasilArray.push(kataSekarang);
                i++;
                continue;
            }

            // A. CEK FRASA 2 KATA DENGAN GARIS BEWAH (Contoh: "thank you" -> "thank_you")
            if (i < kataArray.length - 1 && !/^[.?!,]$/.test(kataArray[i + 1])) {
                let frasaDuaKata = (kataSekarang + "_" + kataArray[i + 1]).toLowerCase();
                let hasilFrasa = this.cariDiKamus(frasaDuaKata, srcLang, tgtLang);

                if (hasilFrasa && hasilFrasa.toLowerCase() !== frasaDuaKata) {
                    hasilArray.push(hasilFrasa);
                    i += 2;
                    continue;
                }
            }

            // B. KATA TUNGGAL
            let terjemahanTunggal = this.cariDiKamus(kataSekarang, srcLang, tgtLang);
            
            if (terjemahanTunggal) {
                // Pertahankan Huruf Kapital di Awal Kata jika ada
                if (kataSekarang.charAt(0) === kataSekarang.charAt(0).toUpperCase()) {
                    terjemahanTunggal = terjemahanTunggal.charAt(0).toUpperCase() + terjemahanTunggal.slice(1);
                }
                hasilArray.push(terjemahanTunggal);
            } else {
                hasilArray.push(kataSekarang);
            }

            i++;
        }

        // Gabungkan kembali kata dan rapikan spasi sebelum tanda baca
        let hasilTeks = hasilArray.join(" ")
            .replace(/\s+([.?!,])/g, "$1")
            .replace(/\s+/g, " ")
            .trim();

        return hasilTeks ? (hasilTeks.charAt(0).toUpperCase() + hasilTeks.slice(1)) : "";
    }
}

// Inisialisasi Instance Global
window.translatorMesin = new AntiMainstreamTranslator();
window.translatorMesin.inisialisasiKamus();

// Jembatan Antarmuka ke Brain.js dengan Safety Guard
function translateText(text, srcLang, tgtLang) {
    if (!window.translatorMesin) {
        window.translatorMesin = new AntiMainstreamTranslator();
    }
    
    if (!window.translatorMesin.isLoaded) {
        window.translatorMesin.inisialisasiKamus();
    }

    const hasil = window.translatorMesin.terjemahkanKalimat(text, srcLang, tgtLang);
    return (hasil !== undefined && hasil !== null && hasil !== "") ? hasil : String(text || "");
}
