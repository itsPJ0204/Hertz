export let audioContext: AudioContext | null = null;
export let analyser: AnalyserNode | null = null;
let source: MediaElementAudioSourceNode | null = null;
let connected = false;

/**
 * Initialize the audio analyzer by tapping into an EXISTING Web Audio pipeline.
 * This avoids creating a second MediaElementSource (which throws), and instead
 * connects an AnalyserNode to the already-created source node.
 *
 * Overload 1: initAudioAnalyzer(ctx, sourceNode) — uses existing pipeline (preferred)
 * Overload 2: initAudioAnalyzer(audioElement) — legacy, creates its own pipeline
 */
export function initAudioAnalyzer(ctx: AudioContext, sourceNode: AudioNode): void;
export function initAudioAnalyzer(audioElement: HTMLAudioElement): void;
export function initAudioAnalyzer(
    ctxOrElement: AudioContext | HTMLAudioElement,
    sourceNode?: AudioNode
): void {
    // --- Overload 1: Existing pipeline (AudioContext + source node) ---
    if (ctxOrElement instanceof AudioContext && sourceNode) {
        audioContext = ctxOrElement;

        if (!analyser) {
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 512;
            analyser.smoothingTimeConstant = 0.7;
        }

        if (!connected) {
            // Insert analyser as a pass-through tap on the source.
            // sourceNode → analyser (tap, doesn't modify audio)
            // The existing gain/destination connections remain intact.
            sourceNode.connect(analyser);
            connected = true;
        }

        if (audioContext.state === 'suspended') {
            audioContext.resume().catch(err =>
                console.warn("[AudioAnalyzer] Could not resume context:", err)
            );
        }
        return;
    }

    // --- Overload 2: Legacy — create own pipeline from HTMLAudioElement ---
    const audioElement = ctxOrElement as HTMLAudioElement;

    if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (!analyser) {
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.7;
    }

    if (!source) {
        try {
            source = audioContext.createMediaElementSource(audioElement);
            source.connect(analyser);
            analyser.connect(audioContext.destination);
            connected = true;
        } catch (e) {
            console.warn("[AudioAnalyzer] Source already connected or error:", e);
        }
    }

    if (audioContext.state === 'suspended') {
        audioContext.resume().catch(err =>
            console.warn("[AudioAnalyzer] Could not resume context automatically:", err)
        );
    }
}

export const getAnalyser = () => analyser;
export const getAudioContext = () => audioContext;
