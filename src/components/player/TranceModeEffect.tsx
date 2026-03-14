"use client";

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { usePlayer } from './PlayerContext';
import { initAudioAnalyzer, getAnalyser } from '@/lib/audioAnalyzer';

const VERTEX_SHADER = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
}
`;

// Background Shader (radial outward smoke) — optimized: 4 FBM iterations, fewer fbm calls
const BG_FRAGMENT_SHADER = `
uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uHigh;
uniform vec2 uResolution;
uniform float uBeatHue;

varying vec2 vUv;

float random (in vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123); }

float noise (in vec2 st) {
    vec2 i = floor(st); vec2 f = fract(st);
    float a = random(i); float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0)); float d = random(i + vec2(1.0, 1.0));
    vec2 u = f*f*(3.0-2.0*f);
    return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm ( in vec2 _st) {
    float v = 0.0; float a = 0.5; vec2 shift = vec2(100.0);
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.50));
    for (int i = 0; i < 4; ++i) { v += a * noise(_st); _st = rot * _st * 2.0 + shift; a *= 0.5; }
    return v;
}

vec3 hsl2rgb( in vec3 c ) {
    vec3 rgb = clamp( abs(mod(c.x*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0, 0.0, 1.0 );
    return c.z + c.y * (rgb-0.5)*(1.0-abs(2.0*c.z-1.0));
}

void main() {
    vec2 st = gl_FragCoord.xy / uResolution.xy;
    st = st * 2.0 - 1.0;
    st.x *= uResolution.x / uResolution.y;

    float t = uTime * 0.4;
    float r = length(st);
    vec2 dir = normalize(st + vec2(0.0001));
    
    // Smoke radiating OUTWARDS from center and drifting slightly upwards
    float outwardSpread = t * (0.6 + uBass * 0.8);
    vec2 flow_st = st - dir * outwardSpread;
    flow_st.y -= t * 0.5;

    float angle = atan(st.y, st.x);
    flow_st += vec2(sin(r * 3.0 - t + angle), cos(r * 3.0 - t + angle)) * 0.1;

    // Reduced from 5 fbm calls to 3
    float q = fbm(flow_st + 0.0 * t);
    float r2 = fbm(flow_st + q + vec2(1.7, 9.2) + 0.15 * t);
    float f = fbm(flow_st + r2);

    vec3 baseColor1 = hsl2rgb(vec3(mod(uBeatHue + 0.1, 1.0), 0.8, 0.5));
    vec3 baseColor2 = hsl2rgb(vec3(mod(uBeatHue - 0.2, 1.0), 0.9, 0.4));

    vec3 color = mix(vec3(0.0), baseColor1, clamp((f*f)*4.0,0.0,1.0));
    color = mix(color, baseColor2, clamp(q,0.0,1.0));
                
    float centerGlow = smoothstep(1.2, 0.1, r);
    float burst = centerGlow * uBass * 2.0;

    color *= (f * f * f + 0.6 * f * f + 0.5 * f) * (1.0 + uBass * 1.5) + burst;

    float fadeEdge = smoothstep(1.8, 0.5, r);
    float wispMask = smoothstep(0.2, 0.8, f) * fadeEdge;
    color *= wispMask;

    gl_FragColor = vec4(color, 1.0);
}
`;

// Foreground Shader (bottom up dense smoke) — optimized: 4 FBM iterations, fewer fbm calls
const FG_FRAGMENT_SHADER = `
uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uHigh;
uniform vec2 uResolution;
uniform float uBeatHue;

varying vec2 vUv;

float random (in vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123); }

float noise (in vec2 st) {
    vec2 i = floor(st); vec2 f = fract(st);
    float a = random(i); float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0)); float d = random(i + vec2(1.0, 1.0));
    vec2 u = f*f*(3.0-2.0*f);
    return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm ( in vec2 _st) {
    float v = 0.0; float a = 0.5; vec2 shift = vec2(100.0);
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.50));
    for (int i = 0; i < 4; ++i) { v += a * noise(_st); _st = rot * _st * 2.0 + shift; a *= 0.5; }
    return v;
}

vec3 hsl2rgb( in vec3 c ) {
    vec3 rgb = clamp( abs(mod(c.x*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0, 0.0, 1.0 );
    return c.z + c.y * (rgb-0.5)*(1.0-abs(2.0*c.z-1.0));
}

void main() {
    vec2 st = gl_FragCoord.xy / uResolution.xy;
    st = st * 2.0 - 1.0;
    st.x *= uResolution.x / uResolution.y;

    float t = uTime * 0.4;
    
    // --- BOTTOM UP SMOKE GENERATION ---
    vec2 bottom_st = st * vec2(1.2, 1.0);
    bottom_st.y -= t * 0.9;
    
    // Add horizontal billowing sway
    bottom_st.x += sin(st.y * 2.0 + t * 1.5) * 0.4;

    // Reduced from 5 fbm calls to 3
    float b_q = fbm(bottom_st + vec2(4.2, 1.3) + 0.1 * t);
    float b_r = fbm(bottom_st + b_q + vec2(2.1, 7.3) + 0.15 * t);
    float b_f = fbm(bottom_st + b_r);

    // Fade mask
    float bottomMask = smoothstep(1.0, -1.0, st.y);

    // Vibrant secondary color for bottom smoke
    vec3 bottomBaseColor = hsl2rgb(vec3(mod(uBeatHue + 0.5, 1.0), 0.9, 0.5));
    vec3 bottomBaseColor2 = hsl2rgb(vec3(mod(uBeatHue + 0.3, 1.0), 0.9, 0.7));

    vec3 color = mix(vec3(0.0), bottomBaseColor, clamp((b_f*b_f)*4.0, 0.0, 1.0));
    color = mix(color, bottomBaseColor2, clamp(b_q, 0.0, 1.0));
    
    // Intensify massively on beat
    color *= (b_f * b_f * 3.0 + b_f) * (1.5 + uBass * 3.0) * bottomMask;

    float alpha = clamp(max(color.r, max(color.g, color.b)) * 0.8, 0.0, 0.9);

    float wispMask = smoothstep(0.1, 0.7, b_f);
    alpha *= wispMask;

    gl_FragColor = vec4(color, alpha);
}
`;



export function TranceModeEffect() {
    const { audioElement, isPlaying, mediaSourceNode, musicAudioContext } = usePlayer();
    const requestRef = useRef<number | null>(null);
    const bgCanvasRef = useRef<HTMLCanvasElement>(null);
    const fgCanvasRef = useRef<HTMLCanvasElement>(null);

    // Smooth variables
    const smoothBass = useRef(0);
    const hueRef = useRef(Math.random());

    // UI Floating Coordinates — reduced from 10 to 5 elements
    const elementsRef = useRef(Array.from({ length: 5 }, () => ({
        currentX: 0, currentY: 0,
        targetX: 0, targetY: 0,
        currentRot: 0, targetRot: 0
    })));

    useEffect(() => {
        if (!audioElement || !mediaSourceNode || !musicAudioContext) return;

        initAudioAnalyzer(musicAudioContext, mediaSourceNode);
        const analyser = getAnalyser();
        if (!analyser) return;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const bgCanvas = bgCanvasRef.current;
        const fgCanvas = fgCanvasRef.current;
        if (!bgCanvas || !fgCanvas) return;

        // Render at lower effective resolution for performance
        const pixelRatio = Math.min(window.devicePixelRatio, 1.0);

        // --- Three.js Setup: SINGLE renderer with two render passes ---
        const bgRenderer = new THREE.WebGLRenderer({ canvas: bgCanvas, alpha: true, antialias: false, powerPreference: 'low-power' });
        bgRenderer.setPixelRatio(pixelRatio);
        bgRenderer.setSize(window.innerWidth, window.innerHeight);

        const bgScene = new THREE.Scene();
        const bgCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

        // --- Foreground renderer ---
        const fgRenderer = new THREE.WebGLRenderer({ canvas: fgCanvas, alpha: true, antialias: false, premultipliedAlpha: false, powerPreference: 'low-power' });
        fgRenderer.setPixelRatio(pixelRatio);
        fgRenderer.setSize(window.innerWidth, window.innerHeight);
        fgRenderer.setClearColor(0x000000, 0);

        const fgScene = new THREE.Scene();

        const uniforms = {
            uTime: { value: 0 },
            uBass: { value: 0.0 },
            uMid: { value: 0.0 },
            uHigh: { value: 0.0 },
            uResolution: { value: new THREE.Vector2(
                window.innerWidth * pixelRatio,
                window.innerHeight * pixelRatio
            ) },
            uBeatHue: { value: hueRef.current }
        };

        const geometry = new THREE.PlaneGeometry(2, 2);

        const bgMaterial = new THREE.ShaderMaterial({
            vertexShader: VERTEX_SHADER,
            fragmentShader: BG_FRAGMENT_SHADER,
            uniforms: uniforms
        });
        const bgMesh = new THREE.Mesh(geometry, bgMaterial);
        bgScene.add(bgMesh);

        const fgMaterial = new THREE.ShaderMaterial({
            vertexShader: VERTEX_SHADER,
            fragmentShader: FG_FRAGMENT_SHADER,
            uniforms: uniforms,
            transparent: true,
            blending: THREE.AdditiveBlending,
        });
        const fgMesh = new THREE.Mesh(geometry, fgMaterial);
        fgScene.add(fgMesh);

        const handleResize = () => {
            bgRenderer.setSize(window.innerWidth, window.innerHeight);
            fgRenderer.setSize(window.innerWidth, window.innerHeight);
            uniforms.uResolution.value.set(
                window.innerWidth * pixelRatio,
                window.innerHeight * pixelRatio
            );
        };
        window.addEventListener('resize', handleResize);

        let timeOffset = 0;
        let frameCount = 0;

        // Cache root style to avoid repeated lookups
        const rootStyle = document.documentElement.style;

        const animate = () => {
            requestRef.current = requestAnimationFrame(animate);
            frameCount++;

            if (!isPlaying) {
                smoothBass.current *= 0.95;
            } else {
                analyser.getByteFrequencyData(dataArray);

                // Inline averaging — avoid function creation per frame
                let bassSum = 0;
                for (let i = 0; i < 10; i++) bassSum += dataArray[i];
                const normBass = bassSum / 2550; // (sum / 10) / 255

                let midSum = 0;
                for (let i = 10; i < 80; i++) midSum += dataArray[i];
                const normMid = midSum / 17850; // (sum / 70) / 255

                let highSum = 0;
                for (let i = 80; i < 200; i++) highSum += dataArray[i];
                const normHigh = highSum / 30600; // (sum / 120) / 255

                smoothBass.current = smoothBass.current * 0.8 + normBass * 0.2;

                const isBeat = normBass > 0.75;

                hueRef.current = (hueRef.current + 0.001 + normBass * 0.01) % 1.0;

                // --- Uniform Updates ---
                uniforms.uBass.value += (normBass - uniforms.uBass.value) * 0.15;
                uniforms.uMid.value += (normMid - uniforms.uMid.value) * 0.1;
                uniforms.uHigh.value += (normHigh - uniforms.uHigh.value) * 0.1;
                uniforms.uBeatHue.value = hueRef.current;

                timeOffset += 0.01 + (normBass * 0.04);
                uniforms.uTime.value = timeOffset;

                // --- UI Floating Animation (update CSS vars every 2nd frame) ---
                if (frameCount % 2 === 0) {
                    const beatPeak = normBass > 0.6 ? normBass : smoothBass.current;
                    const intensity = Math.max(0.8, beatPeak * 5.0);
                    const spread = Math.max(0.5, beatPeak * 3.5);

                    const els = elementsRef.current;

                    if (isBeat && Math.random() > 0.5) {
                        for (let j = 0; j < els.length; j++) {
                            els[j].targetX = (Math.random() - 0.5) * 40;
                            els[j].targetY = (Math.random() - 0.5) * 40;
                            els[j].targetRot = (Math.random() - 0.5) * 10;
                        }
                    } else if (!isBeat) {
                        for (let j = 0; j < els.length; j++) {
                            const el = els[j];
                            el.targetX += (Math.random() - 0.5) * 2;
                            el.targetY += (Math.random() - 0.5) * 2;
                            el.targetRot += (Math.random() - 0.5) * 0.5;
                            el.targetX = el.targetX < -20 ? -20 : el.targetX > 20 ? 20 : el.targetX;
                            el.targetY = el.targetY < -20 ? -20 : el.targetY > 20 ? 20 : el.targetY;
                            el.targetRot = el.targetRot < -5 ? -5 : el.targetRot > 5 ? 5 : el.targetRot;
                        }
                    }

                    const lerpSpeed = 0.05 + normBass * 0.15;
                    for (let j = 0; j < els.length; j++) {
                        const el = els[j];
                        el.currentX += (el.targetX - el.currentX) * lerpSpeed;
                        el.currentY += (el.targetY - el.currentY) * lerpSpeed;
                        el.currentRot += (el.targetRot - el.currentRot) * lerpSpeed;

                        rootStyle.setProperty(`--trance-x-${j}`, `${el.currentX.toFixed(1)}px`);
                        rootStyle.setProperty(`--trance-y-${j}`, `${el.currentY.toFixed(1)}px`);
                        rootStyle.setProperty(`--trance-r-${j}`, `${el.currentRot.toFixed(1)}deg`);
                    }

                    rootStyle.setProperty('--trance-intensity', intensity.toFixed(2));
                    rootStyle.setProperty('--trance-spread', spread.toFixed(2));
                    rootStyle.setProperty('--trance-hue', (hueRef.current * 360).toFixed(0));
                }
            }

            bgRenderer.render(bgScene, bgCamera);
            fgRenderer.render(fgScene, bgCamera);
        };

        requestRef.current = requestAnimationFrame(animate);

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            window.removeEventListener('resize', handleResize);

            bgRenderer.dispose();
            fgRenderer.dispose();
            bgMaterial.dispose();
            fgMaterial.dispose();
            geometry.dispose();
            bgScene.clear();
            fgScene.clear();

            rootStyle.setProperty('--trance-intensity', '0');
            rootStyle.setProperty('--trance-spread', '0');

            elementsRef.current.forEach((_, idx) => {
                rootStyle.setProperty(`--trance-x-${idx}`, '0px');
                rootStyle.setProperty(`--trance-y-${idx}`, '0px');
                rootStyle.setProperty(`--trance-r-${idx}`, '0deg');
            });
        };
    }, [audioElement, isPlaying, mediaSourceNode, musicAudioContext]);

    return (
        <>
            {/* Background Smoke (z-0, below UI) */}
            <canvas
                ref={bgCanvasRef}
                className="fixed inset-0 z-0 pointer-events-none opacity-100"
                aria-hidden="true"
            />
            {/* Foreground Dense Smoke (z-50, ABOVE UI, but pointer-events-none so it doesn't block clicks) */}
            <canvas
                ref={fgCanvasRef}
                className="fixed inset-0 z-[60] pointer-events-none opacity-80"
                aria-hidden="true"
            />
        </>
    );
}
