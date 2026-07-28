// ============================================================
// STT WEB WORKER (OFFLINE ENGINE VIA WASM)
// Berjalan terpisah agar UI/HP RAM 2GB tidak freeze
// ============================================================

importScripts('lib/vosk.js'); // Memuat engine WASM Vosk

let recognizer = null;
let isLoaded = false;

// 1. Inisialisasi Engine & Load Model Bahasa
async function initEngine(modelPath) {
    try {
        const model = await Vosk.createModel(modelPath);
        recognizer = new model.KaldiRecognizer(16000); // Sample rate standard 16kHz
        isLoaded = true;
        postMessage({ status: 'READY' });
    } catch (err) {
        postMessage({ status: 'ERROR', error: err.message });
    }
}

// 2. Menerima Pesan / Potongan Audio dari brain.js
self.onmessage = async function(e) {
    const { action, pcmData, modelPath } = e.data;

    if (action === 'INIT') {
        await initEngine(modelPath);
        return;
    }

    if (action === 'TRANSCRIBE') {
        if (!isLoaded || !recognizer) {
            postMessage({ status: 'RESULT', text: '' });
            return;
        }

        // Olah data PCM Audio 16bit lewat WASM
        recognizer.acceptWaveform(pcmData);
        let result = recognizer.finalResult();
        
        postMessage({
            status: 'RESULT',
            text: result.text || ''
        });
    }
};
