"use client";

import { useEffect, useRef } from 'react';
import { usePlayer } from './PlayerContext';

/**
 * AudioDuckingEngine v4 — Uses getUserMedia + AnalyserNode with adaptive
 * noise floor calibration. Optimized for high sensitivity to detect
 * conversations and ambient noise at normal volumes.
 * 
 * Works great on:
 *   ✅ Phone + Bluetooth headphones
 *   ✅ Laptop + Wired headphones / Speakers
 *   ❌ Laptop + Bluetooth (Windows forces HFP mode — OS limitation)
 */
export function AudioDuckingEngine() {
    const { isNoiseReductionEnabled, audioElement } = usePlayer();

    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const rafRef = useRef<number | null>(null);

    // Volume settings
    const BASE_VOLUME = 1.0;
    const DUCKED_VOLUME = 0.15;
    const RECOVERY_DELAY_MS = 2000;

    // Adaptive calibration
    const noiseFloorRef = useRef<number>(0);
    const isCalibrating = useRef<boolean>(true);
    const calibrationSamples = useRef<number[]>([]);
    const CALIBRATION_DURATION_MS = 2000; // 2 seconds calibration
    const calibrationStartRef = useRef<number>(0);

    // Sensitivity: noise must exceed floor by this multiplier to trigger
    // Lower = more sensitive. 1.8 means 80% above floor triggers ducking.
    const THRESHOLD_MULTIPLIER = 1.8;
    // Very low absolute minimum so quiet rooms still detect conversation
    const MIN_ABSOLUTE_THRESHOLD = 0.008;

    const lastNoiseTimeRef = useRef<number>(0);
    const currentVolumeRef = useRef<number>(1.0);
    const volumeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (!isNoiseReductionEnabled || !audioElement) {
            // Full cleanup
            if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
            if (volumeIntervalRef.current) { clearInterval(volumeIntervalRef.current); volumeIntervalRef.current = null; }
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach(track => track.stop());
                mediaStreamRef.current = null;
            }
            if (audioContextRef.current) {
                audioContextRef.current.close().catch(() => {});
                audioContextRef.current = null;
            }
            analyserRef.current = null;
            if (audioElement) audioElement.volume = BASE_VOLUME;
            currentVolumeRef.current = BASE_VOLUME;
            isCalibrating.current = true;
            calibrationSamples.current = [];
            noiseFloorRef.current = 0;
            return;
        }

        let isMounted = true;

        const init = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: false,
                        noiseSuppression: false,
                        autoGainControl: false,
                    },
                    video: false,
                });

                if (!isMounted) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }

                mediaStreamRef.current = stream;

                const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
                const ctx = new AudioCtx({ latencyHint: 'playback' });
                audioContextRef.current = ctx;

                const source = ctx.createMediaStreamSource(stream);
                const analyser = ctx.createAnalyser();
                analyser.fftSize = 2048;
                analyser.smoothingTimeConstant = 0.75; // Slightly less smooth = more responsive
                source.connect(analyser);
                analyserRef.current = analyser;

                const dataArray = new Uint8Array(analyser.frequencyBinCount);

                // Start calibration
                isCalibrating.current = true;
                calibrationSamples.current = [];
                calibrationStartRef.current = Date.now();
                console.log("[AudioDucking] 🎙️ Calibrating ambient noise floor (2s)...");

                const getRMS = (): number => {
                    analyser.getByteTimeDomainData(dataArray);
                    let sum = 0;
                    for (let i = 0; i < dataArray.length; i++) {
                        const v = (dataArray[i] / 128.0) - 1.0;
                        sum += v * v;
                    }
                    return Math.sqrt(sum / dataArray.length);
                };

                // Smooth volume transitions via setInterval (independent of rAF rate)
                const smoothTo = (target: number) => {
                    if (volumeIntervalRef.current) clearInterval(volumeIntervalRef.current);

                    volumeIntervalRef.current = setInterval(() => {
                        const cur = currentVolumeRef.current;
                        const diff = target - cur;

                        if (Math.abs(diff) < 0.01) {
                            currentVolumeRef.current = target;
                            if (audioElement) audioElement.volume = target;
                            if (volumeIntervalRef.current) clearInterval(volumeIntervalRef.current);
                            return;
                        }

                        // Fast duck (step 0.12), slow restore (step 0.02)
                        const step = diff < 0 ? 0.12 : 0.02;
                        const next = diff < 0
                            ? Math.max(target, cur - step)
                            : Math.min(target, cur + step);

                        currentVolumeRef.current = next;
                        if (audioElement) audioElement.volume = next;
                    }, 50);
                };

                const loop = () => {
                    if (!isMounted) return;

                    const rms = getRMS();
                    const now = Date.now();

                    // === CALIBRATION ===
                    if (isCalibrating.current) {
                        calibrationSamples.current.push(rms);
                        if (now - calibrationStartRef.current >= CALIBRATION_DURATION_MS) {
                            const samples = calibrationSamples.current;
                            const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
                            noiseFloorRef.current = avg * 1.2; // Small buffer above average
                            isCalibrating.current = false;
                            const threshold = Math.max(MIN_ABSOLUTE_THRESHOLD, noiseFloorRef.current * THRESHOLD_MULTIPLIER);
                            console.log(`[AudioDucking] ✅ Calibrated! Floor: ${noiseFloorRef.current.toFixed(4)}, Trigger: ${threshold.toFixed(4)}`);
                        }
                        rafRef.current = requestAnimationFrame(loop);
                        return;
                    }

                    // === DUCKING LOGIC ===
                    const threshold = Math.max(MIN_ABSOLUTE_THRESHOLD, noiseFloorRef.current * THRESHOLD_MULTIPLIER);

                    // Slowly adapt noise floor during quiet periods
                    if (rms < threshold) {
                        noiseFloorRef.current = noiseFloorRef.current * 0.995 + rms * 0.005;
                    }

                    if (rms > threshold) {
                        lastNoiseTimeRef.current = now;
                        if (currentVolumeRef.current > DUCKED_VOLUME + 0.05) {
                            smoothTo(DUCKED_VOLUME);
                        }
                    } else if (now - lastNoiseTimeRef.current > RECOVERY_DELAY_MS) {
                        if (currentVolumeRef.current < BASE_VOLUME - 0.05) {
                            smoothTo(BASE_VOLUME);
                        }
                    }

                    rafRef.current = requestAnimationFrame(loop);
                };

                loop();
            } catch (err) {
                console.error("[AudioDucking] Mic init failed:", err);
            }
        };

        init();

        return () => {
            isMounted = false;
            if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
            if (volumeIntervalRef.current) { clearInterval(volumeIntervalRef.current); volumeIntervalRef.current = null; }
        };
    }, [isNoiseReductionEnabled, audioElement]);

    return null;
}
