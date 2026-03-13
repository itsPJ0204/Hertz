"use client";

import { useEffect, useRef } from 'react';
import { usePlayer } from './PlayerContext';

export function AudioDuckingEngine() {
    const { isNoiseReductionEnabled, gainNode } = usePlayer();
    
    const micAudioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const requestAnimationFrameRef = useRef<number | null>(null);

    // Volume ducking parameters
    const BASE_GAIN = 1.0;
    const DUCKED_GAIN = 0.15;
    const THRESHOLD = 0.04; // RMS threshold for "loud ambient noise"
    const RECOVERY_TIME_MS = 1500;

    const lastNoiseTimeRef = useRef<number>(0);
    const currentGainTarget = useRef(BASE_GAIN);

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
            return;
        }

        let isMounted = true;

        const initMicAnalysis = async () => {
            try {
                // Request mic with all processing disabled — we only need raw volume levels
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
                
                // Create a SEPARATE AudioContext just for mic analysis (not connected to music)
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                const micCtx = new AudioContextClass({ sampleRate: 16000 }); // Low sample rate for mic only
                micAudioContextRef.current = micCtx;

                const micSource = micCtx.createMediaStreamSource(stream);
                const analyser = micCtx.createAnalyser();
                analyser.fftSize = 256;
                analyser.smoothingTimeConstant = 0.85;
                
                // IMPORTANT: Only connect mic -> analyser. Do NOT connect to destination.
                // This means the mic audio is never played back, only analyzed.
                micSource.connect(analyser);
                analyserRef.current = analyser;

                const dataArray = new Uint8Array(analyser.frequencyBinCount);

                const loop = () => {
                    if (!isMounted || !gainNode) return;

                    analyser.getByteTimeDomainData(dataArray);

                    // Calculate RMS volume
                    let sumSquares = 0;
                    for (let i = 0; i < dataArray.length; i++) {
                        const normalized = (dataArray[i] / 128.0) - 1.0;
                        sumSquares += normalized * normalized;
                    }
                    const rms = Math.sqrt(sumSquares / dataArray.length);

                    const now = Date.now();
                    
                    if (rms > THRESHOLD) {
                        lastNoiseTimeRef.current = now;
                        // Duck the music volume via GainNode (inside Web Audio graph — immune to OS processing)
                        if (currentGainTarget.current !== DUCKED_GAIN) {
                            currentGainTarget.current = DUCKED_GAIN;
                            gainNode.gain.cancelScheduledValues(gainNode.context.currentTime);
                            gainNode.gain.setTargetAtTime(DUCKED_GAIN, gainNode.context.currentTime, 0.08);
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
