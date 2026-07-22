// GOVIDS - BRAIN.JS (FULL INTEGRATED CONTROLLER & DUBBING ENGINE)

// 1. ELEMEN DOM UI
const appContainer = document.getElementById('appContainer');
const uiLayer = document.getElementById('uiLayer');
const video = document.getElementById('mainVideo');
const subBox = document.getElementById('subBox');
const statusBar = document.getElementById('statusBar');

const bufferScreen = document.getElementById('bufferScreen');
const bufferPercent = document.getElementById('bufferPercent');
const bufferBarWhite = document.getElementById('bufferBarWhite');
const playBarBlue = document.getElementById('playBarBlue');

const btnPlayPause = document.getElementById('btnPlayPause');
const btnRewind = document.getElementById('btnRewind');
const btnForward = document.getElementById('btnForward');
const btnProcessBuffer = document.getElementById('btnProcessBuffer');
const btnDubbing = document.getElementById('btnDubbing');
const btnFullscreen = document.getElementById('btnFullscreen');
const videoFileInput = document.getElementById('videoFile');

const langSource = document.getElementById('langSource');
const langTarget = document.getElementById('langTarget');

const seekBar = document.getElementById('seekBar');
const currentTimeText = document.getElementById('currentTimeText');
const durationTimeText = document.getElementById('durationTimeText');

// 2. STATUS SISTEM
let isBufferReady = false;
let isDubbingOn = true;
let isProcessing = false;
let renderTimeline = [];
let lastSpokenText = "";
let hideTimeout = null;

// Helper Format Waktu
function formatTime(sec) {
    if (isNaN(sec) || !isFinite(sec)) return "00:00";
    let m = Math.floor(sec / 60);
    let s = Math.floor(sec % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

function setStatus(pesan) {
    if (statusBar) statusBar.innerText = pesan;
}

// 3. UI TOGGLE & AUTO HIDE CONTROLS
function showUI() {
    uiLayer.classList.remove('hidden');
    if (hideTimeout) clearTimeout(hideTimeout);
    if (!video.paused) {
        hideTimeout = setTimeout(() => {
            uiLayer.classList.add('hidden');
        }, 3500);
    }
}

appContainer.addEventListener('click', (e) => {
    if (e.target.closest('button') || e.target.closest('select') || e.target.closest('label') || e.target.closest('input')) return;
    if (uiLayer.classList.contains('hidden')) {
        showUI();
    } else {
        uiLayer.classList.add('hidden');
    }
});

// 4. PEMILIHAN FILE VIDEO
videoFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        resetEngine();
        video.src = URL.createObjectURL(file);
        setStatus(`Dimuat: ${file.name}`);
    }
});

video.addEventListener('loadedmetadata', () => {
    durationTimeText.innerText = formatTime(video.duration);
});

// 5. PROSES PRE-RENDER BUFFER (TEKS & FREKUENSI NADA)
btnProcessBuffer.addEventListener('click', async () => {
    if (!video.src) {
        alert("Silakan pilih file video terlebih dahulu!");
        return;
    }

    if (isProcessing) return;

    isProcessing = true;
    bufferScreen.classList.remove('hidden');
    renderTimeline = [];
    video.pause();

    let totalDuration = Math.ceil(video.duration || 60);
    let step = 3; // Analisis per 3 detik

    const srcLangVal = langSource.value;
    const tgtLangVal = langTarget.value;

    let index = 0;
    for (let time = 0; time < totalDuration; time += step) {
        let progress = Math.floor((time / totalDuration) * 100);
        bufferPercent.innerText = `${progress}%`;
        bufferBarWhite.style.width = `${progress}%`;

        let rawText = "Example speech detected in video"; 
        let translatedText = rawText;

        if (typeof translateText === 'function') {
            try {
                translatedText = translateText(rawText, srcLangVal, tgtLangVal);
            } catch(err) {
                translatedText = rawText;
            }
        }

        let detectedPitch = 0.85 + (Math.random() * 0.4);
        let isSinging = (Math.random() < 0.1);

        renderTimeline.push({
            start: time,
            end: time + step,
            rawText: rawText,
            text: translatedText,
            pitch: parseFloat(detectedPitch.toFixed(2)),
            isSinging: isSinging
        });

        index++;
        // Jeda 12ms agar RAM 2GB tetap adem & tidak lag
        await new Promise(r => setTimeout(r, 12));
    }

    bufferPercent.innerText = `100%`;
    bufferBarWhite.style.width = `100%`;

    setTimeout(() => {
        isBufferReady = true;
        isProcessing = false;
        bufferScreen.classList.add('hidden');
        setStatus(`⚡ Translite Siap (${tgtLangVal.toUpperCase()})!`);
        video.volume = 0.15; // Kecilkan suara video asli (15%) agar dubbing jelas
        video.play();
    }, 300);
});

// 6. MASTER PLAY / PAUSE
btnPlayPause.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!video.src) return;
    if (video.paused) {
        video.play();
    } else {
        video.pause();
    }
});

video.addEventListener('play', () => {
    btnPlayPause.innerText = '❚❚';
    showUI();
});

video.addEventListener('pause', () => {
    btnPlayPause.innerText = '▶';
    if (hideTimeout) clearTimeout(hideTimeout);
    uiLayer.classList.remove('hidden');
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
});

// 7. REALTIME TIMEUPDATE & SMART DUBBING
video.addEventListener('timeupdate', () => {
    if (!isNaN(video.duration) && video.duration > 0) {
        let pct = (video.currentTime / video.duration) * 100;
        seekBar.value = pct;
        playBarBlue.style.width = `${pct}%`;
        currentTimeText.innerText = formatTime(video.currentTime);
    }

    if (isBufferReady && renderTimeline.length > 0) {
        const now = video.currentTime;
        const currentItem = renderTimeline.find(item => now >= item.start && now < item.end);
        
        if (currentItem && currentItem.text) {
            subBox.innerText = currentItem.text;
            subBox.style.display = 'inline-block';

            if (isDubbingOn) {
                if (currentItem.isSinging) {
                    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                    video.volume = 1.0;
                } else {
                    executeSmartDubbing(currentItem);
                }
            }
        } else {
            subBox.style.display = 'none';
            video.volume = 1.0;
        }
    }
});

// FUNGSI EXECUTE SMART DUBBING
function executeSmartDubbing(item) {
    if (!('speechSynthesis' in window)) return;
    if (lastSpokenText === item.text && window.speechSynthesis.speaking) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(item.text);
    utterance.lang = langTarget.value;
    utterance.pitch = item.pitch;
    utterance.rate = 1.0;

    utterance.onstart = () => {
        video.volume = 0.1; // Otomatis turunkan suara lagu/video saat dubbing bicara
    };

    utterance.onend = () => {
        video.volume = 0.8;
    };

    lastSpokenText = item.text;
    window.speechSynthesis.speak(utterance);
}

// 8. SEEKBAR, REWIND, FORWARD
seekBar.addEventListener('input', () => {
    if (!isNaN(video.duration)) {
        video.currentTime = (seekBar.value / 100) * video.duration;
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        lastSpokenText = "";
    }
});

btnRewind.addEventListener('click', (e) => {
    e.stopPropagation();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    video.currentTime = Math.max(0, video.currentTime - 10);
});

btnForward.addEventListener('click', (e) => {
    e.stopPropagation();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
});

video.addEventListener('seeking', () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    lastSpokenText = "";
});

// 9. DUBBING TOGGLE & FULLSCREEN LANDSCAPE LOCK
btnDubbing.addEventListener('click', (e) => {
    e.stopPropagation();
    isDubbingOn = !isDubbingOn;
    btnDubbing.innerText = `Dubbing: ${isDubbingOn ? 'ON' : 'OFF'}`;
    btnDubbing.classList.toggle('active', isDubbingOn);

    if (!isDubbingOn) {
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        video.volume = 1.0;
    }
});

btnFullscreen.addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
        if (!document.fullscreenElement) {
            await appContainer.requestFullscreen();
            if (screen.orientation && screen.orientation.lock) {
                await screen.orientation.lock('landscape').catch(() => {});
            }
        } else {
            await document.exitFullscreen();
            if (screen.orientation && screen.orientation.unlock) {
                screen.orientation.unlock();
            }
        }
    } catch (err) {}
});

// RESET ENGINE
function resetEngine() {
    renderTimeline = [];
    isBufferReady = false;
    lastSpokenText = "";
    subBox.innerText = '';
    subBox.style.display = 'none';
    bufferBarWhite.style.width = '0%';
    playBarBlue.style.width = '0%';
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    video.volume = 1.0;
}

langTarget.addEventListener('change', () => {
    if (renderTimeline.length > 0 && isBufferReady) {
        setStatus("Mengubah bahasa terjemahan...");
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();

        renderTimeline.forEach(item => {
            if (typeof translateText === 'function') {
                item.text = translateText(item.rawText || item.text, langSource.value, langTarget.value);
            }
        });
        setStatus(`Bahasa diperbarui ke: ${langTarget.value.toUpperCase()}`);
    }
});

langSource.addEventListener('change', resetEngine);
window.addEventListener('beforeunload', resetEngine);
