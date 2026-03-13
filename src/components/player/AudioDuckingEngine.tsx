"use client";

import { useEffect, useRef } from 'react';
import { usePlayer } from './PlayerContext';

export function AudioDuckingEngine() {
    const { isNoiseReductionEnabled, audioElement } = usePlayer();
    
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const rafRef = useRef<number | null>(null);

    // Volume settings
    const BASE_VOLUME = 1.0;
    const DUCKED_VOLUME = 0.15;
    const RECOVERY_DELAY_MS = 2000; // Wait 2s of silence before restoring volume

    // Adaptive calibration state
    const noiseFloorRef = useRef<number>(0);
    const isCalibrating = useRef<boolean>(true);
    const calibrationSamples = useRef<number[]>([]);
    const CALIBRATION_DURATION_MS = 3000; // 3 seconds of calibration
    const calibrationStartRef = useRef<number>(0);

    // Threshold multiplier: noise must be this many times ABOVE the noise floor to trigger ducking
    const THRESHOLD_MULTIPLIER = 3.0;
    // Minimum absolute threshold to avoid ducking on tiny fluctuations in a silent room
    const MIN_ABSOLUTE_THRESHOLD = 0.015;

    const lastNoiseTimeRef = useRef<number>(0);
    const currentVolumeRef = useRef<number>(1.0);

    useEffect(() => {
        if (!isNoiseReductionEnabled || !audioElement) {
            // Cleanup
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach(track => track.stop());
                mediaStreamRef.current = null;
            }
            if (audioContextRef.current) {
                audioContextRef.current.close().catch(console.error);
                audioContextRef.current = null;
            }
            analyserRef.current = null;
            // Restore volume
            if (audioElement) {
                audioElement.volume = BASE_VOLUME;
            }
            currentVolumeRef.current = BASE_VOLUME;
            // Reset calibration for next activation
            isCalibrating.current = true;
            calibrationSamples.current = [];
            noiseFloorRef.current = 0;
            return;
        }

        let isMounted = true;

        const initAudio = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    audio: {
                        echoCancellation: false,
                        noiseSuppression: false,
                        autoGainControl: false,
                    }, 
                    video: false 
                });

                if (!isMounted) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }
                
                mediaStreamRef.current = stream;
                
                const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
                const audioCtx = new AudioCtx({ latencyHint: 'playback' });
                audioContextRef.current = audioCtx;

                const source = audioCtx.createMediaStreamSource(stream);
                const analyser = audioCtx.createAnalyser();
                analyser.fftSize = 2048; // Higher resolution for better accuracy
                analyser.smoothingTimeConstant = 0.85;
                
                source.connect(analyser);
                // DO NOT connect analyser to audioCtx.destination — we only read data, never output
                analyserRef.current = analyser;

                const dataArray = new Uint8Array(analyser.frequencyBinCount);

                // Start calibration
                isCalibrating.current = true;
                calibrationSamples.current = [];
                calibrationStartRef.current = Date.now();
                console.log("[AudioDucking] Calibrating noise floor for 3 seconds...");

                const calculateRMS = (): number => {
                    analyser.getByteTimeDomainData(dataArray);
                    let sumSquares = 0;
                    for (let i = 0; i < dataArray.length; i++) {
                        const normalized = (dataArray[i] / 128.0) - 1.0;
                        sumSquares += normalized * normalized;
                    }
                    return Math.sqrt(sumSquares / dataArray.length);
                };

                const smoothVolume = (target: number) => {
                    const current = currentVolumeRef.current;
                    const step = target < current ? 0.08 : 0.015; // Fast duck, slow recover
                    const next = target < current 
                        ? Math.max(target, current - step)
                        : Math.min(target, current + step);
                    currentVolumeRef.current = next;
                    audioElement.volume = next;
                };

                const loop = () => {
                    if (!isMounted) return;

                    const rms = calculateRMS();
                    const now = Date.now();

                    // === CALIBRATION PHASE ===
                    if (isCalibrating.current) {
                        calibrationSamples.current.push(rms);

                        if (now - calibrationStartRef.current >= CALIBRATION_DURATION_MS) {
                            // Calibration complete — compute noise floor as the average RMS during calibration
                            const samples = calibrationSamples.current;
                            const avgRMS = samples.reduce((a, b) => a + b, 0) / samples.length;
                            // Use a slightly higher value than average to account for natural fluctuation
                            noiseFloorRef.current = avgRMS * 1.3;
                            isCalibrating.current = false;
                            console.log(`[AudioDucking] Calibration complete. Noise floor: ${noiseFloorRef.current.toFixed(4)}, Trigger threshold: ${Math.max(MIN_ABSOLUTE_THRESHOLD, noiseFloorRef.current * THRESHOLD_MULTIPLIER).toFixed(4)}`);
                        }

                        rafRef.current = requestAnimationFrame(loop);
                        return;
                    }

                    // === ACTIVE DUCKING PHASE ===
                    const dynamicThreshold = Math.max(
                        MIN_ABSOLUTE_THRESHOLD, 
                        noiseFloorRef.current * THRESHOLD_MULTIPLIER
                    );

                    // Also continuously update noise floor slowly (adapts to changing environments)
                    // Only update when NOT in a noise spike (to avoid the spike raising the floor)
                    if (rms < dynamicThreshold) {
                        noiseFloorRef.current = noiseFloorRef.current * 0.998 + rms * 0.002;
                    }

                    if (rms > dynamicThreshold) {
                        lastNoiseTimeRef.current = now;
                        // Duck!
                        smoothVolume(DUCKED_VOLUME);
                    } else {
                        // Recover after delay
                        if (now - lastNoiseTimeRef.current > RECOVERY_DELAY_MS) {
                            smoothVolume(BASE_VOLUME);
                        }
                        // While waiting for recovery delay, hold volume steady
                    }

                    rafRef.current = requestAnimationFrame(loop);
                };

                loop();

            } catch (err) {
                console.error("[AudioDucking] Failed to initialize microphone:", err);
            }
        };

        initAudio();

        return () => {
            isMounted = false;
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
        };
    }, [isNoiseReductionEnabled, audioElement]);

    return null;
}
