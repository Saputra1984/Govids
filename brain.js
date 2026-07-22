// GOVIDS - BRAIN.JS (RELIABLE OFFLINE PLAYER & DUBBING ENGINE)

// 1. ELEMEN UI & VIDEO PLAYER (Gunakan window agar tidak tabrakan dengan HTML)
window.videoEl = document.getElementById('mainVideo');
window.subBoxEl = document.getElementById('subBox');
window.statusBarEl = document.getElementById('statusBar');
window.btnTranslateEl = document.getElementById('btnTranslate');
window.btnDubbingEl = document.getElementById('btnDubbing');
window.langSourceEl = document.getElementById('langSource');
window.langTargetEl = document.getElementById('langTarget');
window.videoFileInputEl = document.getElementById('videoFile');

// 2. STATUS APLIKASI
let isTranslateOn = false;
let isDubbingOn = true;
let isProcessing = false;
let processedData = []; 
let lastSpokenText = "";

// Helper untuk update status UI
function setStatus(pesan) {
    if (window.statusBarEl) window.statusBarEl.innerText = pesan;
}

// 3. PEMILIHAN FILE VIDEO
if (window.videoFileInputEl) {
    window.videoFileInputEl.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            resetEngine();
            const fileURL = URL.createObjectURL(file);
            window.videoEl.src = fileURL;
            window.videoEl.pause();
            setStatus(`Video dimuat: ${file.name}. Siap diputar atau ditekan Translate.`);
        }
    });
}

// 4. PEMINDAIAN TIMELINE AMAN
async function startAudioPreProcessing() {
    if (!window.videoEl || !window.videoEl.src || isProcessing) return;

    isProcessing = true;
    setStatus("Memproses terjemahan & nada suara...");
    
    const currentPos = window.videoEl.currentTime;
    window.videoEl.pause();

    try {
        processedData = await generateTimelineData(window.videoEl.duration || 60);

        setStatus("Proses selesai! Memutar video...");
        isProcessing = false;
        
        isTranslateOn = true;
        if (window.btnTranslateEl) {
            window.btnTranslateEl.innerText = "Translate: ON";
            window.btnTranslateEl.classList.add('active');
        }

        window.videoEl.currentTime = currentPos;
        window.videoEl.volume = 0.15; // Suara video asli 15%
        
        window.videoEl.play().catch(err => {
            console.log("Play dipicu manual:", err);
            setStatus("Proses Selesai. Tekan ▶ untuk memutar.");
        });

    } catch (err) {
        console.error("Gagal memproses timeline:", err);
        setStatus("Terjadi kesalahan pemrosesan.");
        isProcessing = false;
    }
}

// SIMULASI PEMINDAIAN TIMELINE & SINKRONISASI KE TRANSLITE.JS
async function generateTimelineData(duration) {
    let timeline = [];
    let totalSec = Math.ceil(duration);
    let step = 3;

    const srcLang = window.langSourceEl ? window.langSourceEl.value : 'en-US';
    const tgtLang = window.langTargetEl ? window.langTargetEl.value : 'id';

    for (let time = 0; time < totalSec; time += step) {
        let percentage = Math.floor((time / totalSec) * 100);
        setStatus(`Memproses Terjemahan & Frekuensi: ${percentage}%...`);

        let detectedPitch = 0.85 + (Math.random() * 0.4);
        let isSingingDetected = (Math.random() < 0.12);
        
        let rawText = "Example speech detected in video"; 

        // Panggilan Aman ke translite.js
        let translatedText = rawText;
        if (typeof translateText === 'function') {
            try {
                translatedText = translateText(rawText, srcLang, tgtLang);
            } catch(err) {
                console.log("Translite Error Fallback:", err);
                translatedText = rawText;
            }
        }

        timeline.push({
            start: time,
            end: time + step,
            rawText: rawText,
            text: translatedText,
            pitch: parseFloat(detectedPitch.toFixed(2)),
            isSinging: isSingingDetected
        });

        // Jeda 15ms agar RAM HP 2GB tidak freeze
        await new Promise(r => setTimeout(r, 15));
    }

    return timeline;
}

// 5. EKSEKUSI PEMUTARAN REAL-TIME
if (window.videoEl) {
    window.videoEl.addEventListener('timeupdate', () => {
        if (!isTranslateOn) {
            window.videoEl.volume = 1.0;
            return;
        }

        if (processedData.length === 0) return;

        const currentTime = window.videoEl.currentTime;
        const currentItem = processedData.find(item => currentTime >= item.start && currentTime < item.end);

        if (currentItem) {
            if (window.subBoxEl) {
                window.subBoxEl.innerText = currentItem.text;
                window.subBoxEl.style.display = 'inline-block';
            }

            if (isDubbingOn) {
                if (currentItem.isSinging) {
                    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                    window.videoEl.volume = 1.0;
                } else {
                    executeSmartDubbing(currentItem);
                }
            }
        } else {
            if (window.subBoxEl) window.subBoxEl.style.display = 'none';
            window.videoEl.volume = 1.0; 
        }
    });

    // Hentikan dubbing instan saat loncat detik (Seeking)
    window.videoEl.addEventListener('seeking', () => {
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        lastSpokenText = "";
    });
}

// FUNGSI EXECUTE DUBBING
function executeSmartDubbing(item) {
    if (!('speechSynthesis' in window)) return;
    if (lastSpokenText === item.text && window.speechSynthesis.speaking) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(item.text);
    utterance.lang = window.langTargetEl ? window.langTargetEl.value : 'id';
    utterance.pitch = item.pitch;
    utterance.rate = 1.0;

    utterance.onstart = () => {
        if (window.videoEl) window.videoEl.volume = 0.1;
    };

    utterance.onend = () => {
        if (window.videoEl) window.videoEl.volume = 0.8;
    };

    lastSpokenText = item.text;
    window.speechSynthesis.speak(utterance);
}

// 6. GANTI BAHASA INSTAN TANPA RE-SCAN VIDEO
function switchLanguageOnTheFly() {
    if (processedData.length === 0) return;

    setStatus("Mengubah bahasa terjemahan...");
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();

    const srcLang = window.langSourceEl ? window.langSourceEl.value : 'en-US';
    const tgtLang = window.langTargetEl ? window.langTargetEl.value : 'id';

    processedData.forEach(item => {
        if (typeof translateText === 'function') {
            item.text = translateText(item.rawText || item.text, srcLang, tgtLang);
        }
    });

    setStatus(`Bahasa diperbarui ke: ${tgtLang.toUpperCase()}`);
}

// RESET MEMORI & KONTROL
function resetEngine() {
    processedData = [];
    isTranslateOn = false;
    lastSpokenText = "";
    if (window.subBoxEl) {
        window.subBoxEl.innerText = '';
        window.subBoxEl.style.display = 'none';
    }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (window.videoEl) window.videoEl.volume = 1.0;
    
    if (window.btnTranslateEl) {
        window.btnTranslateEl.innerText = "Translate: OFF";
        window.btnTranslateEl.classList.remove('active');
    }
}

// 7. EVENT LISTENERS KONTROL
if (window.btnTranslateEl) {
    window.btnTranslateEl.addEventListener('click', (e) => {
        e.stopPropagation();

        if (!isTranslateOn) {
            if (processedData.length === 0) {
                startAudioPreProcessing();
            } else {
                isTranslateOn = true;
                window.btnTranslateEl.innerText = "Translate: ON";
                window.btnTranslateEl.classList.add('active');
                if (window.videoEl) {
                    window.videoEl.volume = 0.15;
                    window.videoEl.play();
                }
            }
        } else {
            isTranslateOn = false;
            window.btnTranslateEl.innerText = "Translate: OFF";
            window.btnTranslateEl.classList.remove('active');
            if ('speechSynthesis' in window) window.speechSynthesis.cancel();
            if (window.videoEl) window.videoEl.volume = 1.0;
        }
    });
}

if (window.btnDubbingEl) {
    window.btnDubbingEl.addEventListener('click', (e) => {
        e.stopPropagation();
        isDubbingOn = !isDubbingOn;
        window.btnDubbingEl.innerText = `Dubbing: ${isDubbingOn ? 'ON' : 'OFF'}`;
        window.btnDubbingEl.classList.toggle('active', isDubbingOn);

        if (!isDubbingOn) {
            if ('speechSynthesis' in window) window.speechSynthesis.cancel();
            if (window.videoEl) window.videoEl.volume = 1.0;
        }
    });
}

if (window.langTargetEl) {
    window.langTargetEl.addEventListener('change', () => {
        if (processedData.length > 0) {
            switchLanguageOnTheFly();
        }
    });
}

if (window.langSourceEl) {
    window.langSourceEl.addEventListener('change', resetEngine);
}

window.addEventListener('beforeunload', resetEngine);
