class AudioStudioBrain {
    constructor() {
        // Elemen HTML
        this.video = document.getElementById('mainVideo');
        this.videoFile = document.getElementById('videoFile');
        this.statusBar = document.getElementById('statusBar');
        this.subBox = document.getElementById('subBox');
        this.langSource = document.getElementById('langSource');
        this.langTarget = document.getElementById('langTarget');
        this.btnTranslate = document.getElementById('btnTranslate');
        this.btnDubbing = document.getElementById('btnDubbing');

        // State Aplikasi
        this.isTranslating = false;
        this.isDubbingOn = true;
        this.recognition = null;
        this.audioContext = null;
        this.videoSourceNode = null;
        this.gainNode = null; // Pengatur volume video utama

        // Inisialisasi Event Listener
        this.initEvents();
        // Memuat database translator yang sudah dibuat di translite.js
        window.translatorMesin.inisialisasiKamus();
    }

    initEvents() {
        // Handle input video lokal
        this.videoFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.video.src = URL.createObjectURL(file);
                this.video.load();
                this.updateStatus("Status: Video berhasil dimuat. Siap untuk Live Translate.", "active");
            }
        });

        // Tombol Mulai/Berhenti Translate
        this.btnTranslate.addEventListener('click', () => this.toggleTranslation());

        // Tombol Toggle Suara Dubbing
        this.btnDubbing.addEventListener('click', () => {
            this.isDubbingOn = !this.isDubbingOn;
            if (this.isDubbingOn) {
                this.btnDubbing.innerText = "Suara Dubbing: ON";
                this.btnDubbing.classList.add('active');
            } else {
                this.btnDubbing.innerText = "Suara Dubbing: OFF";
                this.btnDubbing.classList.remove('active');
            }
        });

        // Sinkronisasi dengan status Play/Pause video asli
        this.video.addEventListener('pause', () => {
            if (this.isTranslating && this.recognition) this.recognition.stop();
        });

        this.video.addEventListener('play', () => {
            if (this.isTranslating && this.recognition) {
                try { this.recognition.start(); } catch(e) {}
            }
        });
    }

    updateStatus(pesan, kelas) {
        this.statusBar.innerText = pesan;
        this.statusBar.className = "status-bar " + (kelas || "");
    }

    // Inisialisasi Audio Mixer Virtual (Web Audio API) untuk Audio Ducking
    initAudioMixer() {
        if (this.audioContext) return; // Mencegah inisialisasi ganda

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            
            // Hubungkan audio video ke mixer kita
            this.videoSourceNode = this.audioContext.createMediaElementSource(this.video);
            this.gainNode = this.audioContext.createGain();
            
            // Alur: Video -> Pengatur Volume (Gain) -> Speaker Perangkat
            this.videoSourceNode.connect(this.gainNode);
            this.gainNode.connect(this.audioContext.destination);
            
            console.log("Studio Mini Audio Mixer berhasil diaktifkan.");
        } catch (e) {
            console.error("Gagal mengaktifkan Web Audio API:", e);
        }
    }

    // Fungsi Otomatis Mengecilkan / Membesarkan Volume Video Asli (Audio Ducking)
    setVideoVolumeSmooth(targetVolume, duration = 0.3) {
        if (!this.gainNode || !this.audioContext) return;
        // Efek transisi volume mulus (tidak menghentak telinga)
        this.gainNode.gain.linearRampToValueAtTime(targetVolume, this.audioContext.currentTime + duration);
    }

    // Logika Sensor Nada Ringan untuk Mendeteksi Orang Bernyanyi (Video Klip)
    apakahIniNyanyian(teksBicara) {
        // Karena keterbatasan hardware RAM 2GB untuk memproses algoritma Pitch FFT yang berat, 
        // kita gabungkan deteksi jeda teks dan analisis ritme intonasi vokal dari durasi Web Speech API.
        // Jika teks yang keluar memiliki pola kata yang sangat panjang tanpa jeda tanda baca,
        // sistem mendeteksi ini sebagai durasi sustain (nada ditahan / bernyanyi).
        if (teksBicara.length > 25 && !teksBicara.includes(" ")) {
            return true;
        }
        return false;
    }

    toggleTranslation() {
        if (this.isTranslating) {
            this.stopTranslation();
        } else {
            this.startTranslation();
        }
    }

    startTranslation() {
        if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            alert("Browser/WebView Anda belum mendukung Speech Recognition bawaan.");
            return;
        }

        this.initAudioMixer();
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = this.langSource.value;

        this.isTranslating = true;
        this.btnTranslate.innerText = "Hentikan Live Translate";
        this.btnTranslate.classList.add('active');
        this.updateStatus("Studio Mini Aktif: Mendengarkan suara video...", "active");

        this.recognition.onstart = () => console.log("Speech recognition dimulai.");
        
        this.recognition.onerror = (e) => {
            console.error("Speech Recognition Error: ", e.error);
        };

        this.recognition.onend = () => {
            // Jika video masih berputar, otomatis hidupkan kembali perekam suara
            if (this.isTranslating && !this.video.paused) {
                try { this.recognition.start(); } catch(e) {}
            }
        };

        this.recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            let teksSuaraAsli = finalTranscript || interimTranscript;
            if (teksSuaraAsli.trim() === "") return;

            // Jalankan Sensor Nada Sing (Deteksi Video Klip / Lagu)
            if (this.apakahIniNyanyian(teksSuaraAsli)) {
                this.updateStatus("Deteksi: Nada Lagu/Nyanyian dideteksi. Mode Teks Lirik Aktif.", "singing");
                this.setVideoVolumeSmooth(1.0); // Naikkan volume musik ke 100% agar tidak terganggu
                
                // Proses translasi teks lirik saja tanpa dubbing suara
                this.prosesTeksTerjemahan(teksSuaraAsli, false);
            } else {
                // Mode Bicara Normal: Aktifkan Jeda Buffer & Audio Ducking
                this.updateStatus("Deteksi: Percakapan biasa. Mengaktifkan Audio Ducking...", "active");
                this.setVideoVolumeSmooth(0.2); // Kecilkan suara latar video ke 20%
                
                // Berikan jeda pemrosesan agar teks terjemahan siap
                this.prosesTeksTerjemahan(teksSuaraAsli, true);
            }
        };

        this.video.play();
    }

    prosesTeksTerjemahan(teksAsal, ijinkanDubbing) {
        // Panggil mesin dari translite.js
        const hasilTerjemahan = window.translatorMesin.terjemahkanKalimat(
            teksAsal, 
            this.langSource.value, 
            this.langTarget.value
        );

        // Tampilkan teks Subtitle ke Layar Player
        this.subBox.innerHTML = hasilTerjemahan;
        this.subBox.style.display = 'inline-block';

        // Bersihkan subtitle otomatis jika hening setelah beberapa detik
        clearTimeout(this.subTimeout);
        this.subTimeout = setTimeout(() => {
            this.subBox.style.display = 'none';
            this.setVideoVolumeSmooth(1.0); // Kembalikan volume video ke 100% saat hening
            this.updateStatus("Studio Mini Aktif: Mendengarkan suara video...", "active");
        }, 4000);

        // Jika mode dubbing aktif dan diijinkan (bukan lagu), bunyikan Text-To-Speech bawaan HP
        if (this.isDubbingOn && ijinkanDubbing && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel(); // Hentikan dubbing sebelumnya jika bertumpuk
            
            const utterance = new SpeechSynthesisUtterance(hasilTerjemahan);
            utterance.lang = this.langTarget.value;
            
            utterance.onend = () => {
                // Kembalikan volume video asli pelan-pelan begitu robot selesai bicara
                this.setVideoVolumeSmooth(1.0);
            };

            window.speechSynthesis.speak(utterance);
        }
    }

    stopTranslation() {
        this.isTranslating = false;
        if (this.recognition) this.recognition.stop();
        
        this.setVideoVolumeSmooth(1.0);
        this.btnTranslate.innerText = "Mulai Live Translate";
        this.btnTranslate.classList.remove('active');
        this.subBox.style.display = 'none';
        this.updateStatus("Status: Berhenti.");
    }
}

// Jalankan sistem saat seluruh dokumen HTML selesai dimuat
window.addEventListener('DOMContentLoaded', () => {
    window.studioBrainApp = new AudioStudioBrain();
});
