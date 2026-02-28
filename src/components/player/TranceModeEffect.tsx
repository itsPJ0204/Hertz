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

// Background Shader (radial outward smoke)
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
    for (int i = 0; i < 6; ++i) { v += a * noise(_st); _st = rot * _st * 2.0 + shift; a *= 0.5; }
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
    vec2 dir = normalize(st);
    
    // Smoke radiating OUTWARDS from center and drifting slightly upwards
    float outwardSpread = t * (0.6 + uBass * 0.8);
    vec2 flow_st = st - dir * outwardSpread;
    flow_st.y -= t * 0.5;

    float angle = atan(st.y, st.x);
    flow_st += vec2(sin(r * 3.0 - t + angle), cos(r * 3.0 - t + angle)) * 0.1;

    vec2 q = vec2(fbm(flow_st + 0.0 * t), fbm(flow_st + vec2(1.0)));
    vec2 r_ = vec2(fbm(flow_st + 1.0 * q + vec2(1.7, 9.2) + 0.15 * t), fbm(flow_st + 1.0 * q + vec2(8.3, 2.8) + 0.126 * t));
    float f = fbm(flow_st + r_);

    vec3 baseColor1 = hsl2rgb(vec3(mod(uBeatHue + 0.1, 1.0), 0.8, 0.5));
    vec3 baseColor2 = hsl2rgb(vec3(mod(uBeatHue - 0.2, 1.0), 0.9, 0.4));
    vec3 baseColor3 = hsl2rgb(vec3(mod(uBeatHue + 0.4, 1.0), 0.7, 0.6));

    vec3 color = mix(vec3(0.0), baseColor1, clamp((f*f)*4.0,0.0,1.0));
    color = mix(color, baseColor2, clamp(length(q),0.0,1.0));
    color = mix(color, baseColor3, clamp(length(r_.x),0.0,1.0));
                
    float centerGlow = smoothstep(1.2, 0.1, r);
    float burst = centerGlow * uBass * 2.0;

    color *= (f * f * f + 0.6 * f * f + 0.5 * f) * (1.0 + uBass * 1.5) + burst;

    float fadeEdge = smoothstep(1.8, 0.5, r);
    float wispMask = smoothstep(0.2, 0.8, f) * fadeEdge;
    color *= wispMask;

    gl_FragColor = vec4(color, 1.0);
}
`;

// Foreground Shader (bottom up dense smoke)
const FG_FRAGMENT_SHADER = `
uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uHigh;
uniform vec2 uResolution;
uniform float uBeatHue;

varying vec2 vUv;

// Duplicate noise functions for standalone shader
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
    for (int i = 0; i < 6; ++i) { v += a * noise(_st); _st = rot * _st * 2.0 + shift; a *= 0.5; }
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
    vec2 bottom_st = st * vec2(1.2, 1.0); // stretch horizontally
    bottom_st.y -= t * 0.9; // flow upwards faster
    
    // Add horizontal billowing sway
    bottom_st.x += sin(st.y * 2.0 + t * 1.5) * 0.4;

    vec2 b_q = vec2(0.);
    b_q.x = fbm(bottom_st + vec2(4.2, 1.3) + 0.1 * t);
    b_q.y = fbm(bottom_st + vec2(7.1, 9.2));
    
    vec2 b_r = vec2(0.);
    b_r.x = fbm(bottom_st + 1.0 * b_q + vec2(2.1, 7.3) + 0.15 * t);
    b_r.y = fbm(bottom_st + 1.0 * b_q + vec2(5.4, 1.9) + 0.14 * t);
    
    float b_f = fbm(bottom_st + b_r);

    // Fade mask: heavily present at bottom (st.y = -1), fading out completely past middle (st.y = 0.5)
    // We adjust the smoothstep to let it reach higher and be denser
    float bottomMask = smoothstep(1.0, -1.0, st.y);

    // Vibrant secondary color for bottom smoke
    vec3 bottomBaseColor = hsl2rgb(vec3(mod(uBeatHue + 0.5, 1.0), 0.9, 0.5));
    // Another color layer for depth
    vec3 bottomBaseColor2 = hsl2rgb(vec3(mod(uBeatHue + 0.3, 1.0), 0.9, 0.7));

    vec3 color = mix(vec3(0.0), bottomBaseColor, clamp((b_f*b_f)*4.0, 0.0, 1.0));
    color = mix(color, bottomBaseColor2, clamp(length(b_q), 0.0, 1.0));
    
    // Intensify massively on beat
    color *= (b_f * b_f * 3.0 + b_f) * (1.5 + uBass * 3.0) * bottomMask;

    // Alpha blending: we want the smoke to be semi-transparent so UI shows through
    // The alpha should be proportional to the brightness of the smoke, scaled down slightly
    float alpha = clamp(max(color.r, max(color.g, color.b)) * 0.8, 0.0, 0.9);

    // Softer wisp masking so it doesn't look like blocky polygons
    float wispMask = smoothstep(0.1, 0.7, b_f);
    alpha *= wispMask;

    gl_FragColor = vec4(color, alpha);
}
`;



export function TranceModeEffect() {
    const { audioElement, isPlaying } = usePlayer();
    const requestRef = useRef<number | null>(null);
    const bgCanvasRef = useRef<HTMLCanvasElement>(null);
    const fgCanvasRef = useRef<HTMLCanvasElement>(null);

    // Smooth variables
    const smoothBass = useRef(0);
    const hueRef = useRef(Math.random());

    // UI Floating Coordinates
    const elementsRef = useRef(Array.from({ length: 10 }, () => ({
        currentX: 0, currentY: 0,
        targetX: 0, targetY: 0,
        currentRot: 0, targetRot: 0
    })));

    useEffect(() => {
        if (!audioElement) return;

        initAudioAnalyzer(audioElement);
        const analyser = getAnalyser();
        if (!analyser) return;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const bgCanvas = bgCanvasRef.current;
        const fgCanvas = fgCanvasRef.current;
        if (!bgCanvas || !fgCanvas) return;

        // --- Three.js Setup (Background) ---
        const bgRenderer = new THREE.WebGLRenderer({ canvas: bgCanvas, alpha: true, antialias: false });
        bgRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        bgRenderer.setSize(window.innerWidth, window.innerHeight);

        const bgScene = new THREE.Scene();
        const bgCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
        bgCamera.position.z = 1;

        // --- Three.js Setup (Foreground) ---
        const fgRenderer = new THREE.WebGLRenderer({ canvas: fgCanvas, alpha: true, antialias: false, premultipliedAlpha: false });
        fgRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        fgRenderer.setSize(window.innerWidth, window.innerHeight);
        // Important: clear alpha correctly
        fgRenderer.setClearColor(0x000000, 0);

        const fgScene = new THREE.Scene();

        const uniforms = {
            uTime: { value: 0 },
            uBass: { value: 0.0 },
            uMid: { value: 0.0 },
            uHigh: { value: 0.0 },
            uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
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
            if (bgRenderer && bgCamera) {
                bgRenderer.setSize(window.innerWidth, window.innerHeight);
                fgRenderer.setSize(window.innerWidth, window.innerHeight);
                bgCamera.aspect = window.innerWidth / window.innerHeight;
                bgCamera.updateProjectionMatrix();
                uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
            }
        };
        window.addEventListener('resize', handleResize);

        let timeOffset = 0;

        const animate = () => {
            if (!isPlaying) {
                smoothBass.current *= 0.95;
            } else {
                analyser.getByteFrequencyData(dataArray);

                const getAverage = (start: number, end: number) => {
                    let sum = 0;
                    for (let i = start; i < end; i++) {
                        sum += dataArray[i];
                    }
                    return sum / (end - start);
                };

                const bassAvg = getAverage(0, 10);
                const midAvg = getAverage(10, 80);
                const highAvg = getAverage(80, 200);

                const normBass = bassAvg / 255;
                const normMid = midAvg / 255;
                const normHigh = highAvg / 255;

                smoothBass.current = smoothBass.current * 0.8 + normBass * 0.2;

                const isBeat = normBass > 0.75;

                // Drift the psychedelic base color smoothly, boost heavily on bass
                hueRef.current = (hueRef.current + 0.001 + normBass * 0.01) % 1.0;

                // --- Uniform Updates ---
                uniforms.uBass.value = THREE.MathUtils.lerp(uniforms.uBass.value, normBass, 0.15);
                uniforms.uMid.value = THREE.MathUtils.lerp(uniforms.uMid.value, normMid, 0.1);
                uniforms.uHigh.value = THREE.MathUtils.lerp(uniforms.uHigh.value, normHigh, 0.1);
                uniforms.uBeatHue.value = hueRef.current;

                timeOffset += 0.01 + (normBass * 0.04);
                uniforms.uTime.value = timeOffset;

                // --- UI Floating Animation ---
                const beatPeak = normBass > 0.6 ? normBass : smoothBass.current;
                const intensity = Math.max(0.8, beatPeak * 5.0);
                const spread = Math.max(0.5, beatPeak * 3.5);

                const els = elementsRef.current;

                if (isBeat && Math.random() > 0.5) {
                    els.forEach(el => {
                        // Small bounce on beat
                        el.targetX = (Math.random() - 0.5) * 40;
                        el.targetY = (Math.random() - 0.5) * 40;
                        el.targetRot = (Math.random() - 0.5) * 10;
                    });
                } else if (!isBeat) {
                    els.forEach(el => {
                        // Gentle local drift
                        el.targetX += (Math.random() - 0.5) * 2;
                        el.targetY += (Math.random() - 0.5) * 2;
                        el.targetRot += (Math.random() - 0.5) * 0.5;

                        // Clamp values to keep them near origin
                        el.targetX = Math.max(-20, Math.min(20, el.targetX));
                        el.targetY = Math.max(-20, Math.min(20, el.targetY));
                        el.targetRot = Math.max(-5, Math.min(5, el.targetRot));
                    });
                }

                els.forEach((el, idx) => {
                    const lerpSpeed = 0.05 + normBass * 0.15;
                    el.currentX += (el.targetX - el.currentX) * lerpSpeed;
                    el.currentY += (el.targetY - el.currentY) * lerpSpeed;
                    el.currentRot += (el.targetRot - el.currentRot) * lerpSpeed;

                    document.documentElement.style.setProperty(`--trance-x-${idx}`, `${el.currentX.toFixed(2)}px`);
                    document.documentElement.style.setProperty(`--trance-y-${idx}`, `${el.currentY.toFixed(2)}px`);
                    document.documentElement.style.setProperty(`--trance-r-${idx}`, `${el.currentRot.toFixed(2)}deg`);
                });

                document.documentElement.style.setProperty('--trance-intensity', intensity.toFixed(3));
                document.documentElement.style.setProperty('--trance-spread', spread.toFixed(3));
                document.documentElement.style.setProperty('--trance-hue', (hueRef.current * 360).toFixed(1));
            }

            bgRenderer.render(bgScene, bgCamera);
            fgRenderer.render(fgScene, bgCamera);

            requestRef.current = requestAnimationFrame(animate);
        };

        requestRef.current = requestAnimationFrame(animate);

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            window.removeEventListener('resize', handleResize);

            bgRenderer.dispose();
            fgRenderer.dispose();
            bgScene.clear();
            fgScene.clear();

            document.documentElement.style.setProperty('--trance-intensity', '0');
            document.documentElement.style.setProperty('--trance-spread', '0');

            elementsRef.current.forEach((_, idx) => {
                document.documentElement.style.setProperty(`--trance-x-${idx}`, '0px');
                document.documentElement.style.setProperty(`--trance-y-${idx}`, '0px');
                document.documentElement.style.setProperty(`--trance-r-${idx}`, '0deg');
            });
        };
    }, [audioElement, isPlaying]);

    return (
        <>
            {/* Background Smoke (z-0, below UI) */}
            <canvas
                ref={bgCanvasRef}
                className="fixed inset-0 z-0 pointer-events-none opacity-100"
                aria-hidden="true"
            />
            {/* Foreground Dense Smoke (z-50, ABOVE UI, but pointer-events-none so it doesn't block clicks) */}
            {/* FooterPlayer's UI has z-10 normally, expanded overlay has z-50. We give this z-50 and place it above everything. */}
            <canvas
                ref={fgCanvasRef}
                className="fixed inset-0 z-[60] pointer-events-none opacity-80"
                aria-hidden="true"
            />
        </>
    );
}
