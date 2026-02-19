import * as THREE from 'three';

let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let source: MediaElementAudioSourceNode | null = null;
let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let uniforms: any = null;
let animationFrameId: number | null = null;

const VERTEX_SHADER = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
}
`;

const FRAGMENT_SHADER = `
uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uHigh;
uniform float uRotation;
varying vec2 vUv;

// Palette generation
vec3 palette( in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d ) {
    return a + b*cos( 6.28318*(c*t+d) );
}

void main() {
    vec2 uv = (vUv - 0.5) * 2.0;
    vec2 uv0 = uv;
    vec3 finalColor = vec3(0.0);

    // Dynamic rotation controlled by JS
    float rot = uRotation;
    mat2 m = mat2(cos(rot), -sin(rot), sin(rot), cos(rot));
    uv = m * uv;

    for (float i = 0.0; i < 4.0; i++) {
        // Fractal warping
        uv = fract(uv * 1.5) - 0.5;

        float d = length(uv) * exp(-length(uv0));

        // Color palette parameters (Cyberpunk/Neon)
        vec3 col = palette(length(uv0) + i*.4 + uTime*.4, 
            vec3(0.5, 0.5, 0.5),
            vec3(0.5, 0.5, 0.5),
            vec3(1.0, 1.0, 1.0),
            vec3(0.263,0.416,0.557)
        );

        // Ring/Tunnel effect modified by audio
        d = sin(d*8. + uTime)/8.;
        d = abs(d);

        // Intensity reaction to audio
        // Reduced brightness for eye comfort (0.01 -> 0.005)
        float intensity = 0.005 / d; 
        intensity *= (1.0 + uBass * 1.5 + uMid * 1.0); // Reduced multipliers slightly
        
        // High freq adds sharpness/sparkle
        // Increased power base (1.2 -> 1.5) to make thin lines cleaner and less "bloomy"
        intensity = pow(intensity, 1.5 - uHigh * 0.5);

        finalColor += col * intensity;
    }

    // Vignette
    float len = length(uv0);
    finalColor *= 1.0 - smoothstep(0.5, 1.5, len);

    gl_FragColor = vec4(finalColor, 1.0);
}
`;

export const initVideoMode = (audioElement: HTMLAudioElement, canvas: HTMLCanvasElement, genres: string[] = []) => {
    // 1. Audio Context Setup
    if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    // Resume if suspended (browser policy)
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }

    if (!analyser) {
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 512; // Balance between res and perf
        analyser.smoothingTimeConstant = 0.7; // Lower smoothing for snappier beat detection
    }

    if (!source) {
        try {
            source = audioContext.createMediaElementSource(audioElement);
            source.connect(analyser);
            analyser.connect(audioContext.destination);
        } catch (e) {
            console.warn("[VideoMode] Source already connected or error:", e);
        }
    }

    // 2. Three.js Setup
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap pixel ratio for perf

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 1;

    // 3. Shader Mesh
    uniforms = {
        uTime: { value: 0 },
        uBass: { value: 0.0 },
        uMid: { value: 0.0 },
        uHigh: { value: 0.0 },
        uRotation: { value: 0.0 }
    };

    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        uniforms: uniforms
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // 4. Animation Loop
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    // Rotation Logic State
    let currentRotation = 0;
    let rotationDirection = 1; // 1 for clockwise, -1 for anticlockwise
    let rotationSpeed = 0.002; // Base speed

    // Beat Detection State
    let lastBeatTime = 0;
    const beatCooldown = 250; // ms (allow faster beats, more sensitive)
    const beatThreshold = 0.45; // Lower threshold = more sensitive (0.0 - 1.0)

    // Dynamic Thresholding for "Really Sensitive"
    let avgBassEnergy = 0;

    // Genre Check for "Party" / High Energy
    // user said: "Party" genre or similar and not under romantic or sad genres
    const highEnergyKeywords = ['party', 'techno', 'house', 'edm', 'dance', 'electronic', 'trance', 'dubstep', 'rock', 'pop', 'hip hop', 'rap', 'trap', 'club', 'upbeat', 'bollywood', 'punjabi', 'remix', 'bass'];

    // Normalize genres for comparison
    const normalizedGenres = genres.map(g => g.toLowerCase().trim());
    const isHighEnergy = normalizedGenres.some(g => highEnergyKeywords.some(k => g.includes(k)));

    console.log(`[TranceMode] Input Genres:`, genres);
    console.log(`[TranceMode] Normalized:`, normalizedGenres);
    console.log(`[TranceMode] High Energy Detected: ${isHighEnergy}`);

    const animate = () => {
        if (!renderer || !analyser || !uniforms) return;

        animationFrameId = requestAnimationFrame(animate);

        // Audio Analysis
        analyser.getByteFrequencyData(dataArray);

        const bassAvg = getAverage(dataArray, 0, 10);     // Deep Bass
        const midAvg = getAverage(dataArray, 10, 80);     // Mids
        const highAvg = getAverage(dataArray, 80, 200);   // Highs

        // Normalize 0-1
        const normBass = bassAvg / 255;
        const normMid = midAvg / 255;
        const normHigh = highAvg / 255;

        // Smooth Uniform Updates
        uniforms.uBass.value = THREE.MathUtils.lerp(uniforms.uBass.value, normBass, 0.15); // Snappier
        uniforms.uMid.value = THREE.MathUtils.lerp(uniforms.uMid.value, normMid, 0.1);
        uniforms.uHigh.value = THREE.MathUtils.lerp(uniforms.uHigh.value, normHigh, 0.1);

        // Time moves forward
        uniforms.uTime.value += 0.01 + (uniforms.uBass.value * 0.03);

        // --- Beat Detection & Rotation Logic ---

        if (isHighEnergy) {
            // SENSITIVE BEAT DETECTION (Flipping Direction)
            const now = Date.now();
            avgBassEnergy = THREE.MathUtils.lerp(avgBassEnergy, normBass, 0.05); // Slow moving average

            const isBeat = (normBass > 0.1) &&
                (normBass > avgBassEnergy * 1.3 || normBass > beatThreshold) &&
                (now - lastBeatTime > beatCooldown);

            if (isBeat) {
                rotationDirection *= -1; // Flip direction
                lastBeatTime = now;
                // Boost rotation speed temporarily on beat
                currentRotation += rotationDirection * 0.05;
            }

            // Speed increases with bass intensity
            const currentSpeed = rotationSpeed + (normBass * 0.005);
            currentRotation += currentSpeed * rotationDirection;
        } else {
            // RELAXED / LOW ENERGY (Continuous, Smooth Rotation)
            // Just rotate slowly, maybe slightly faster on bass, but NO flipping
            const smoothSpeed = 0.001 + (normBass * 0.002);
            currentRotation += smoothSpeed;
        }

        uniforms.uRotation.value = currentRotation;

        renderer.render(scene!, camera!);
    };

    animate();

    // Handle Resize
    const handleResize = () => {
        if (renderer && camera) {
            renderer.setSize(window.innerWidth, window.innerHeight);
        }
    };
    window.addEventListener('resize', handleResize);
};

export const destroyVideoMode = () => {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    if (renderer) {
        renderer.dispose();
        renderer = null;
    }

    if (scene) {
        scene.clear();
        scene = null;
    }
};

function getAverage(data: Uint8Array, start: number, end: number) {
    let sum = 0;
    for (let i = start; i < end; i++) {
        sum += data[i];
    }
    return sum / (end - start);
}
