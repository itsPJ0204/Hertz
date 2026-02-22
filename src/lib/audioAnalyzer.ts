export let audioContext: AudioContext | null = null;
export let analyser: AnalyserNode | null = null;
let source: MediaElementAudioSourceNode | null = null;

export const initAudioAnalyzer = (audioElement: HTMLAudioElement) => {
    if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (!analyser) {
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.7; // Lower smoothing for snappier beat detection
    }

    if (!source) {
        try {
            source = audioContext.createMediaElementSource(audioElement);
            source.connect(analyser);
            analyser.connect(audioContext.destination);
        } catch (e) {
            console.warn("[AudioAnalyzer] Source already connected or error:", e);
        }
    }

    // Safely attempt to resume without brutally interfering with an active play() promise that might throw AbortError
    if (audioContext.state === 'suspended') {
        audioContext.resume().catch(err => console.warn("[AudioAnalyzer] Could not resume context automatically:", err));
    }
};

export const getAnalyser = () => analyser;
export const getAudioContext = () => audioContext;
