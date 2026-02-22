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

const FRAGMENT_SHADER = `
uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uHigh;
uniform vec2 uResolution;
uniform float uBeatHue;

varying vec2 vUv;

// --- Simplex/Value Noise ---
float random (in vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

// 2D Noise based on Morgan McGuire @morgan3d
float noise (in vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);

    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    vec2 u = f*f*(3.0-2.0*f);

    return mix(a, b, u.x) +
            (c - a)* u.y * (1.0 - u.x) +
            (d - b) * u.x * u.y;
}

float fbm ( in vec2 _st) {
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    mat2 rot = mat2(cos(0.5), sin(0.5),
                    -sin(0.5), cos(0.50));
    for (int i = 0; i < 6; ++i) {
        v += a * noise(_st);
        _st = rot * _st * 2.0 + shift;
        a *= 0.5;
    }
    return v;
}

// HSL to RGB conversion
vec3 hsl2rgb( in vec3 c ) {
    vec3 rgb = clamp( abs(mod(c.x*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0, 0.0, 1.0 );
    return c.z + c.y * (rgb-0.5)*(1.0-abs(2.0*c.z-1.0));
}

void main() {
    vec2 st = gl_FragCoord.xy / uResolution.xy;
    st = st * 2.0 - 1.0;
    st.x *= uResolution.x / uResolution.y;

    float t = uTime * 0.4;
    
    // Distort coordinates for hypnotic swirling
    float r = length(st);
    float a = atan(st.y, st.x);
    
    // Audio-reactive swirling based on bass
    a -= uBass * 0.8 * sin(r * 4.0 - t * 3.0);
    vec2 swirled_st = r * vec2(cos(a), sin(a));

    // --- REALISTIC SMOKE GENERATION ---
    vec2 q = vec2(0.);
    q.x = fbm( swirled_st + 0.0*t);
    q.y = fbm( swirled_st + vec2(1.0));

    vec2 r_ = vec2(0.);
    r_.x = fbm( swirled_st + 1.0*q + vec2(1.7,9.2)+ 0.15*t );
    r_.y = fbm( swirled_st + 1.0*q + vec2(8.3,2.8)+ 0.126*t);

    float f = fbm(swirled_st + r_);

    // Base smoke colors combining neon blues, purples, and audio-reactive hues
    vec3 baseColor1 = hsl2rgb(vec3(mod(uBeatHue + 0.1, 1.0), 0.8, 0.5));
    vec3 baseColor2 = hsl2rgb(vec3(mod(uBeatHue - 0.2, 1.0), 0.9, 0.4));
    vec3 baseColor3 = hsl2rgb(vec3(mod(uBeatHue + 0.4, 1.0), 0.7, 0.6));

    vec3 color = mix(vec3(0.0), baseColor1, clamp((f*f)*4.0,0.0,1.0));
    color = mix(color, baseColor2, clamp(length(q),0.0,1.0));
    color = mix(color, baseColor3, clamp(length(r_.x),0.0,1.0));
                
    // Increase brightness of smoke based on audio
    color *= (f * f * f + 0.6 * f * f + 0.5 * f) * (1.0 + uBass * 2.5);

    // --- LASER LIGHTS ---
    // Make them sweep erratically out from the center or sides
    float laserIntensity = 0.0;
    
    // Laser 1: Fast sweeping beams
    float beamAng1 = a * 8.0 + t * 5.0 + uMid * 2.0;
    float l1 = pow(abs(cos(beamAng1)), 40.0 - uHigh * 30.0);
    
    // Laser 2: Counter-sweeping
    float beamAng2 = a * 5.0 - t * 3.0 * (1.0 + uBass);
    float l2 = pow(abs(sin(beamAng2)), 50.0 - uMid * 40.0);
    
    laserIntensity += (l1 + l2) * (uBass + uMid * 0.5) * 1.5;

    // A neon laser color
    vec3 laserCol = hsl2rgb(vec3(mod(uBeatHue + 0.5, 1.0), 1.0, 0.6));
    
    // Add lasers over smoke
    // Lasers look cool when they originate from edge or center. We fade them out at center so it looks like they shoot FROM outside IN or vice versa
    float laserMask = smoothstep(0.1, 0.5, r) * (1.0 - smoothstep(1.0, 2.0, r));
    color += laserCol * laserIntensity * laserMask;

    // Vignette
    color *= 1.2 - smoothstep(0.5, 1.5, r);

    gl_FragColor = vec4(color, 1.0);
}
`;


export function TranceModeEffect() {
    const { audioElement, isPlaying } = usePlayer();
    const requestRef = useRef<number | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

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
        const canvas = canvasRef.current;
        if (!canvas) return;

        // --- Three.js Setup ---
        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
        // Use lower pixel ratio for intense fragment shaders to keep fps high
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        renderer.setSize(window.innerWidth, window.innerHeight);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.z = 1;

        const uniforms = {
            uTime: { value: 0 },
            uBass: { value: 0.0 },
            uMid: { value: 0.0 },
            uHigh: { value: 0.0 },
            uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
            uBeatHue: { value: hueRef.current }
        };

        const geometry = new THREE.PlaneGeometry(2, 2);
        const material = new THREE.ShaderMaterial({
            vertexShader: VERTEX_SHADER,
            fragmentShader: FRAGMENT_SHADER,
            uniforms: uniforms
        });

        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        const handleResize = () => {
            if (renderer && camera) {
                renderer.setSize(window.innerWidth, window.innerHeight);
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
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
                        el.targetX = (Math.random() - 0.5) * 600;
                        el.targetY = (Math.random() - 0.5) * 600;
                        el.targetRot = (Math.random() - 0.5) * 90;
                    });
                } else if (!isBeat) {
                    els.forEach(el => {
                        el.targetX += (Math.random() - 0.5) * 4;
                        el.targetY += (Math.random() - 0.5) * 4;
                        el.targetRot += (Math.random() - 0.5) * 0.5;
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

            renderer.render(scene, camera);

            requestRef.current = requestAnimationFrame(animate);
        };

        requestRef.current = requestAnimationFrame(animate);

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            window.removeEventListener('resize', handleResize);

            renderer.dispose();
            scene.clear();

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
        <canvas
            ref={canvasRef}
            className="fixed inset-0 z-0 pointer-events-none opacity-100"
            aria-hidden="true"
        />
    );
}
