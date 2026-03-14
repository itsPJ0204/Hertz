"use client";

import { useEffect, useRef } from 'react';
import { usePlayer } from './PlayerContext';

/**
 * AudioDuckingEngine — Adaptive Noise Reduction
 * 
 * Ducks music volume ONLY when it detects:
 *   1. Speech (sustained energy in 300–3000 Hz band)
 *   2. Impulse sounds like car honks, claps, or loud bangs (sudden RMS spikes)
 * 
 * Ignores:
 *   - Constant low-level ambient noise (fan, AC, keyboard, mouse clicks)
 *   - Quiet rustling or distant sounds
 */
export function AudioDuckingEngine() {
    const { isNoiseReductionEnabled, gainNode } = usePlayer();
    
    const micAudioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const requestAnimationFrameRef = useRef<number | null>(null);

    // Volume ducking parameters
    const BASE_GAIN = 1.0;
    const DUCKED_GAIN = 0.15;

    // ---- Detection thresholds ----
    // Overall RMS must exceed this to even consider ducking (filters out quiet ambient noise)
    const RMS_FLOOR = 0.08;
    // Speech band energy must be this fraction of total energy to count as "speech-like"
    const SPEECH_BAND_RATIO = 0.40;
    // For impulse detection: RMS must spike by this factor above the running average
    const IMPULSE_SPIKE_FACTOR = 3.5;
    // Minimum RMS for an impulse to trigger (prevents micro-clicks from triggering)
    const IMPULSE_MIN_RMS = 0.12;
    // How many consecutive "speech-detected" frames needed before ducking (debounce)
    const SPEECH_CONFIRM_FRAMES = 8; // ~8 frames at 60fps ≈ 130ms
    // Time to wait after last detection before restoring volume
    const RECOVERY_TIME_MS = 1800;

    const lastNoiseTimeRef = useRef<number>(0);
    const currentGainTarget = useRef(BASE_GAIN);
    const rmsHistoryRef = useRef<number[]>([]);
    const speechFrameCount = useRef(0);

    useEffect(() => {
        if (!isNoiseReductionEnabled || !gainNode) {
            // Cleanup mic resources
            if (requestAnimationFrameRef.current) {
                cancelAnimationFrame(requestAnimationFrameRef.current);
                requestAnimationFrameRef.current = null;
            }
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach(track => track.stop());
                mediaStreamRef.current = null;
            }
            if (micAudioContextRef.current) {
                micAudioContextRef.current.close().catch(console.error);
                micAudioContextRef.current = null;
            }
            analyserRef.current = null;

            // Restore gain to full volume
            if (gainNode) {
                gainNode.gain.cancelScheduledValues(gainNode.context.currentTime);
                gainNode.gain.setTargetAtTime(BASE_GAIN, gainNode.context.currentTime, 0.1);
            }
            currentGainTarget.current = BASE_GAIN;
            speechFrameCount.current = 0;
            rmsHistoryRef.current = [];
            return;
        }

        let isMounted = true;

        const initMicAnalysis = async () => {
            try {
                // Request mic with all processing disabled — we need raw signal for our own analysis
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    audio: {
                        echoCancellation: { exact: false },
                        noiseSuppression: { exact: false },
                        autoGainControl: { exact: false },
                    }, 
                    video: false 
                });

                if (!isMounted) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }
                
                mediaStreamRef.current = stream;
                
                // Create a SEPARATE AudioContext just for mic analysis (not connected to music output)
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                const micCtx = new AudioContextClass({ sampleRate: 16000 });
                micAudioContextRef.current = micCtx;

                const micSource = micCtx.createMediaStreamSource(stream);
                const analyser = micCtx.createAnalyser();
                analyser.fftSize = 512; // Increased for better frequency resolution
                analyser.smoothingTimeConstant = 0.75;
                
                // Only connect mic -> analyser. Mic audio is never played back.
                micSource.connect(analyser);
                analyserRef.current = analyser;

                const timeDomainData = new Uint8Array(analyser.fftSize);
                const frequencyData = new Uint8Array(analyser.frequencyBinCount);

                // Pre-calculate speech band indices
                // At 16kHz sample rate with fftSize 512: each bin = 16000/512 = 31.25 Hz
                const binResolution = micCtx.sampleRate / analyser.fftSize;
                const speechLowBin = Math.floor(300 / binResolution);   // ~300 Hz
                const speechHighBin = Math.ceil(3000 / binResolution);  // ~3000 Hz

                const loop = () => {
                    if (!isMounted || !gainNode) return;

                    // --- 1. RMS Calculation (time domain) ---
                    analyser.getByteTimeDomainData(timeDomainData);
                    let sumSquares = 0;
                    for (let i = 0; i < timeDomainData.length; i++) {
                        const normalized = (timeDomainData[i] / 128.0) - 1.0;
                        sumSquares += normalized * normalized;
                    }
                    const rms = Math.sqrt(sumSquares / timeDomainData.length);

                    // --- 2. Running average RMS (for impulse detection) ---
                    const history = rmsHistoryRef.current;
                    history.push(rms);
                    if (history.length > 30) history.shift(); // ~0.5s window at 60fps

                    let avgRms = 0;
                    for (let i = 0; i < history.length; i++) avgRms += history[i];
                    avgRms /= history.length;

                    // --- 3. Impulse detection (sudden loud spike) ---
                    const isImpulse = rms > IMPULSE_MIN_RMS && rms > avgRms * IMPULSE_SPIKE_FACTOR;

                    // --- 4. Speech detection (spectral analysis) ---
                    let isSpeech = false;
                    if (rms > RMS_FLOOR) {
                        analyser.getByteFrequencyData(frequencyData);

                        // Calculate energy in speech band (300-3000 Hz) vs total
                        let speechEnergy = 0;
                        let totalEnergy = 0;
                        for (let i = 0; i < frequencyData.length; i++) {
                            const energy = frequencyData[i];
                            totalEnergy += energy;
                            if (i >= speechLowBin && i <= speechHighBin) {
                                speechEnergy += energy;
                            }
                        }

                        // Speech has concentrated energy in 300–3000Hz range
                        const speechRatio = totalEnergy > 0 ? speechEnergy / totalEnergy : 0;
                        
                        if (speechRatio > SPEECH_BAND_RATIO) {
                            speechFrameCount.current++;
                        } else {
                            speechFrameCount.current = Math.max(0, speechFrameCount.current - 1);
                        }

                        // Only confirm speech after sustained detection (debounce)
                        isSpeech = speechFrameCount.current >= SPEECH_CONFIRM_FRAMES;
                    } else {
                        // Below RMS floor — decay speech counter
                        speechFrameCount.current = Math.max(0, speechFrameCount.current - 2);
                    }

                    // --- 5. Duck or recover ---
                    const now = Date.now();
                    const shouldDuck = isSpeech || isImpulse;

                    if (shouldDuck) {
                        lastNoiseTimeRef.current = now;
                        if (currentGainTarget.current !== DUCKED_GAIN) {
                            currentGainTarget.current = DUCKED_GAIN;
                            gainNode.gain.cancelScheduledValues(gainNode.context.currentTime);
                            // Fast duck for impulses, slightly slower for speech
                            const duckSpeed = isImpulse ? 0.03 : 0.08;
                            gainNode.gain.setTargetAtTime(DUCKED_GAIN, gainNode.context.currentTime, duckSpeed);
                        }
                    } else {
                        // Recover volume if noise has stopped for long enough
                        if (now - lastNoiseTimeRef.current > RECOVERY_TIME_MS) {
                            if (currentGainTarget.current !== BASE_GAIN) {
                                currentGainTarget.current = BASE_GAIN;
                                gainNode.gain.cancelScheduledValues(gainNode.context.currentTime);
                                gainNode.gain.setTargetAtTime(BASE_GAIN, gainNode.context.currentTime, 0.3);
                            }
                        }
                    }

                    requestAnimationFrameRef.current = requestAnimationFrame(loop);
                };

                loop();

            } catch (err) {
                console.error("[AudioDuckingEngine] Failed to initialize microphone:", err);
            }
        };

        initMicAnalysis();

        return () => {
            isMounted = false;
            if (requestAnimationFrameRef.current) {
                cancelAnimationFrame(requestAnimationFrameRef.current);
            }
        };
    }, [isNoiseReductionEnabled, gainNode]);

    return null;
}
