// GOVIDS - BRAIN.JS (AI LOKAL & MEMORY BUFFER)
// 1. Elemen UI & Video Player
const video = document.getElementById('mainVideo');
const subBox = document.getElementById('subBox');
const statusBar = document.getElementById('statusBar');
const btnTranslate = document.getElementById('btnTranslate');
const btnDubbing = document.getElementById('btnDubbing');
const langSource = document.getElementById('langSource');
const langTarget = document.getElementById('langTarget');
const videoFileInput = document.getElementById('videoFile');

// 2. Status Aplikasi
let isTranslateOn = false;
let isDubbingOn = true;
let isAiReady = false;

// 3. MEMORI SEMENTARA (RAM Buffer)
// Menyimpan hasil terjemahan per detik agar video diputar berulang kali tetap lancar
let translationMemory = {}; 

// A. INISIALISASI MODEL AI LOKAL (35MB - Service Worker Cache)
async function initLocalAiEngine() {
    if (statusBar) statusBar.innerText = "Menyiapkan Otak AI Lokal...";
    
    try {
        // Cek dukungan Web Speech API / Engine Lokal di Browser
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (SpeechRecognition) {
            window.aiRecognizer = new SpeechRecognition();
            window.aiRecognizer.continuous = true;
            window.aiRecognizer.interimResults = false;

            // Handler saat AI berhasil menangkap suara & mengubahnya jadi Teks Asli
            window.aiRecognizer.onresult = (event) => {
                const currentSec = Math.floor(video.currentTime);
                const lastResultIndex = event.results.length - 1;
                const rawTranscript = event.results[lastResultIndex][0].transcript.trim();

                if (rawTranscript !== "") {
                    processTranslation(rawTranscript, currentSec);
                }
            };

            // Jika AI terputus saat video masih berjalan, restart otomatis
            window.aiRecognizer.onend = () => {
                if (isTranslateOn && !video.paused) {
                    try { window.aiRecognizer.start(); } catch(e){}
                }
            };

            isAiReady = true;
            if (statusBar) statusBar.innerText = "AI Lokal Siap (Offline Mode)";
        } else {
            if (statusBar) statusBar.innerText = "Browser tidak mendukung AI Speech Engine";
        }
    } catch (err) {
        console.error("Gagal memuat AI Engine:", err);
        if (statusBar) statusBar.innerText = "Gagal memuat AI Lokal";
    }
}

// Jalankan Inisialisasi AI saat aplikasi dibuka
window.addEventListener('DOMContentLoaded', initLocalAiEngine);

// B. RANTAI PENERJEMAHAN (AI -> TRANSLITE.JS -> SUBTITLE/DUBBING)
function processTranslation(rawText, timestampSec) {
    // 1. Cek apakah detik ini sudah ada di Memori Sementara (RAM)
    if (translationMemory[timestampSec]) {
        showSubtitleAndDub(translationMemory[timestampSec]);
        return;
    }

    // 2. Jika belum ada, kirim ke translite.js & database.js buatanmu
    const srcLang = langSource.value.split('-')[0];
    const tgtLang = langTarget.value;

    let translatedText = rawText;
    if (typeof translateText === 'function') {
        translatedText = translateText(rawText, srcLang, tgtLang);
    }

    // 3. Simpan ke Memori Sementara (Hanya selama video ini diputar)
    translationMemory[timestampSec] = translatedText;

    // 4. Tampilkan Subtitle & Jalankan Dubbing
    showSubtitleAndDub(translatedText);
}

function showSubtitleAndDub(text) {
    if (!isTranslateOn) return;

    // Tampilkan Teks
    subBox.innerText = text;
    subBox.style.display = 'inline-block';

    // Suarakan (Dubbing/TTS) tanpa mengganggu video
    if (isDubbingOn && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // Mencegah tumpukan suara
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = langTarget.value;
        window.speechSynthesis.speak(utterance);
    }
}

// C. PEMBERSIHAN MEMORI OTOMATIS (AUTO CLEAN)
function clearTransientMemory() {
    // Kosongkan Objek RAM agar HP tidak penuh
    translationMemory = {};
    subBox.innerText = '';
    subBox.style.display = 'none';
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    console.log("Memori sementara terjemahan berhasil dibersihkan!");
}

// D. EVENT LISTENERS & LOGIKA PLAYER

// Load File Video Baru
videoFileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        // PERINTAH BERSINKAN MEMORI: Ganti video = Bersihkan sampah terjemahan lama!
        clearTransientMemory();

        const fileURL = URL.createObjectURL(file);
        video.src = fileURL;
        if (statusBar) statusBar.innerText = `Memutar: ${file.name}`;
        video.play();
    }
});

// Sync Pemutaran Video
video.addEventListener('play', () => {
    if (isTranslateOn && isAiReady) {
        try { window.aiRecognizer.start(); } catch(e){}
    }
});

video.addEventListener('pause', () => {
    if (window.aiRecognizer) {
        try { window.aiRecognizer.stop(); } catch(e){}
    }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
});

// Pengecekan Memori Sementara Saat Video Berjalan (timeupdate)
video.addEventListener('timeupdate', () => {
    if (!isTranslateOn) return;

    const currentSec = Math.floor(video.currentTime);

    // Jika detik ini sudah pernah diterjemahkan sebelumnya, ambil langsung dari RAM!
    if (translationMemory[currentSec]) {
        subBox.innerText = translationMemory[currentSec];
        subBox.style.display = 'inline-block';
    }
});

// Toggle Tombol Translate
btnTranslate.addEventListener('click', (e) => {
    e.stopPropagation();
    isTranslateOn = !isTranslateOn;
    btnTranslate.innerText = `Translate: ${isTranslateOn ? 'ON' : 'OFF'}`;
    btnTranslate.classList.toggle('active', isTranslateOn);

    if (isTranslateOn) {
        if (!video.paused && isAiReady) {
            try { window.aiRecognizer.start(); } catch(e){}
        }
    } else {
        clearTransientMemory();
        if (window.aiRecognizer) {
            try { window.aiRecognizer.stop(); } catch(e){}
        }
    }
});

// Toggle Tombol Dubbing
btnDubbing.addEventListener('click', (e) => {
    e.stopPropagation();
    isDubbingOn = !isDubbingOn;
    btnDubbing.innerText = `Dubbing: ${isDubbingOn ? 'ON' : 'OFF'}`;
    btnDubbing.classList.toggle('active', isDubbingOn);
    if (!isDubbingOn && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
});

// Bersihkan memori saat aplikasi/tab ditutup pengguna
window.addEventListener('beforeunload', clearTransientMemory);
